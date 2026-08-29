const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendTeamInvite } = require('../email');

// Helper to generate unique IDs
function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function workspaceIdFrom(req) {
  return (req.query.workspace_id || req.body?.workspaceId || '').trim();
}

function workspaceMembers(workspaceId) {
  return db.data.members.filter((member) => member.workspace_id === workspaceId);
}

// ----------------------------------------------------
// WORKSPACES
// ----------------------------------------------------
router.post('/workspaces', (req, res) => {
  const ownerEmail = (req.body.ownerEmail || '').trim();
  if (!ownerEmail) return res.status(400).json({ error: 'Owner email is required' });

  const workspaceId = generateId('workspace');
  const createdAt = new Date().toISOString();
  const workspace = { id: workspaceId, name: 'My Sprint Board', owner_email: ownerEmail, created_at: createdAt };
  const sprint = {
    id: generateId('sprint'), workspace_id: workspaceId, name: 'Sprint 1 - Retrospective', status: 'active',
    created_by: ownerEmail, start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], created_at: createdAt,
  };
  const owner = { id: generateId('member'), workspace_id: workspaceId, email: ownerEmail, name: ownerEmail.split('@')[0], role: 'Admin', joined_at: createdAt };
  db.data.workspaces.push(workspace);
  db.data.sprints.unshift(sprint);
  db.data.members.push(owner);
  db.save();
  res.status(201).json({ workspace, owner, sprint });
});

// Health check endpoint for Render.com monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ----------------------------------------------------
// MEMBERS & ROLES MANAGEMENT
// ----------------------------------------------------
router.get('/members', (req, res) => {
  try {
    const workspaceId = workspaceIdFrom(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id is required' });
    const memberMap = new Map();

    // Add registered members
    workspaceMembers(workspaceId).forEach((m) => {
      memberMap.set(m.email.toLowerCase(), {
        email: m.email,
        name: m.name || m.email.split('@')[0],
        role: m.role || 'Member',
        status: 'active',
      });
    });

    // Add pending invitations
    db.data.invitations.filter((inv) => inv.workspace_id === workspaceId).forEach((inv) => {
      const emailLower = inv.email.toLowerCase();
      if (!memberMap.has(emailLower)) {
        memberMap.set(emailLower, {
          email: inv.email,
          name: inv.email.split('@')[0],
          role: inv.role || 'Member',
          status: 'invited',
        });
      }
    });

    const list = Array.from(memberMap.values());
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/members/join', (req, res) => {
  const { email, name, role } = req.body;
  const workspaceId = workspaceIdFrom(req);
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  const emailLower = email.toLowerCase().trim();
  let existing = workspaceMembers(workspaceId).find((m) => m.email.toLowerCase() === emailLower);

  if (existing) {
    if (name) existing.name = name;
  } else {
    // Bootstrap the first board owner as Admin. Afterwards, roles are assigned
    // only through invitations or the Admin-only role management flow.
    const hasAdmin = workspaceMembers(workspaceId).some((member) => member.role === 'Admin');
    existing = {
      id: generateId('member'),
      workspace_id: workspaceId,
      email: email.trim(),
      name: name || email.split('@')[0],
      role: !hasAdmin ? 'Admin' : 'Member',
      joined_at: new Date().toISOString(),
    };
    db.data.members.push(existing);
  }

  db.save();

  if (req.app.get('io')) {
    req.app.get('io').emit('member_joined', { ...existing, workspace_id: workspaceId });
  }

  res.json(existing);
});

router.patch('/members/role', (req, res) => {
  const { email, role } = req.body;
  const workspaceId = workspaceIdFrom(req);
  if (!email || !role) return res.status(400).json({ error: 'Email and role are required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  const emailLower = email.toLowerCase().trim();

  let member = workspaceMembers(workspaceId).find((m) => m.email.toLowerCase() === emailLower);
  if (member) {
    member.role = role;
  } else {
    member = {
      id: generateId('member'),
      workspace_id: workspaceId,
      email: email.trim(),
      name: email.split('@')[0],
      role,
      joined_at: new Date().toISOString(),
    };
    db.data.members.push(member);
  }

  const invitation = db.data.invitations.find((inv) => inv.workspace_id === workspaceId && inv.email.toLowerCase() === emailLower);
  if (invitation) {
    invitation.role = role;
  }

  db.save();

  if (req.app.get('io')) {
    req.app.get('io').emit('member_role_updated', { email: member.email, role: member.role, workspace_id: workspaceId });
  }

  res.json({ success: true, email: member.email, role: member.role });
});

// Admin Remove Member Endpoint
router.delete('/members/:email', (req, res) => {
  const { email } = req.params;
  const workspaceId = workspaceIdFrom(req);
  if (!email) return res.status(400).json({ error: 'Email parameter required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspace_id is required' });

  const emailLower = email.toLowerCase().trim();

  try {
    db.data.members = db.data.members.filter((m) => m.workspace_id !== workspaceId || m.email.toLowerCase() !== emailLower);
    db.data.invitations = db.data.invitations.filter((inv) => inv.workspace_id !== workspaceId || inv.email.toLowerCase() !== emailLower);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('member_removed', { email: emailLower, workspace_id: workspaceId });
    }

    res.json({ success: true, email: emailLower });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invitations/verify', (req, res) => {
  const { token, email } = req.query;
  const workspaceId = workspaceIdFrom(req);
  if (!email) return res.status(400).json({ error: 'Email parameter required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspace_id is required' });

  const emailLower = email.toLowerCase().trim();
  const invitation = db.data.invitations.find(
    (inv) => inv.workspace_id === workspaceId && (inv.email.toLowerCase() === emailLower || (token && inv.token === token))
  );

  if (invitation) {
    res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role || 'Member',
      invitedBy: invitation.invited_by,
    });
  } else {
    res.json({
      valid: true,
      email: email.trim(),
      role: 'Member',
      invitedBy: 'Team Admin',
    });
  }
});

// ----------------------------------------------------
// SPRINTS
// ----------------------------------------------------
router.get('/sprints', (req, res) => {
  try {
    const workspaceId = workspaceIdFrom(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id is required' });
    const sprints = db.data.sprints.filter((sprint) => sprint.workspace_id === workspaceId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(sprints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sprints', (req, res) => {
  const { name, start_date, end_date, createdBy } = req.body;
  const workspaceId = workspaceIdFrom(req);
  if (!name) return res.status(400).json({ error: 'Sprint name is required' });
  if (!createdBy || !createdBy.trim()) return res.status(400).json({ error: 'Creator email is required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  const newSprint = {
    id: generateId('sprint'),
    workspace_id: workspaceId,
    name,
    status: 'active',
    created_by: createdBy.trim(),
    start_date: start_date || new Date().toISOString().split('T')[0],
    end_date: end_date || '',
    created_at: new Date().toISOString(),
  };

  try {
    db.data.sprints.unshift(newSprint);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('sprint_created', newSprint);
    }

    res.status(201).json(newSprint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sprints/:id', (req, res) => {
  const { id } = req.params;
  const workspaceId = workspaceIdFrom(req);
  const requesterEmail = (req.body?.requesterEmail || '').trim().toLowerCase();
  try {
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    const sprint = db.data.sprints.find((item) => item.id === id && item.workspace_id === workspaceId);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const requester = workspaceMembers(workspaceId).find((member) => member.email.toLowerCase() === requesterEmail);
    const isAdmin = requester?.role === 'Admin';
    const isCreator = sprint.created_by?.toLowerCase() === requesterEmail;
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only the sprint creator or an Admin can delete this sprint.' });
    }

    db.data.sprints = db.data.sprints.filter((s) => s.id !== id);
    db.data.retro_items = db.data.retro_items.filter((item) => item.sprint_id !== id);
    db.data.action_items = db.data.action_items.filter((item) => item.sprint_id !== id);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('sprint_deleted', { id, workspace_id: workspaceId });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// RETRO ITEMS (What Went Well / What Didn't)
// ----------------------------------------------------
router.get('/retro-items', (req, res) => {
  const { sprint_id } = req.query;
  try {
    let items = db.data.retro_items;
    if (sprint_id) {
      items = items.filter((i) => i.sprint_id === sprint_id);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/retro-items', (req, res) => {
  const { sprint_id, category, content, author, tags } = req.body;
  if (!sprint_id || !category || !content) {
    return res.status(400).json({ error: 'sprint_id, category, and content are required' });
  }

  const sprint = db.data.sprints.find((item) => item.id === sprint_id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  const newItem = {
    id: generateId('item'),
    sprint_id,
    workspace_id: sprint.workspace_id,
    category,
    content,
    author: author || 'Anonymous',
    upvotes: 0,
    tags: tags || [],
    created_at: new Date().toISOString(),
  };

  try {
    db.data.retro_items.push(newItem);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('retro_item_added', newItem);
    }

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/retro-items/:id/upvote', (req, res) => {
  const { id } = req.params;
  try {
    const item = db.data.retro_items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.upvotes = (item.upvotes || 0) + 1;
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('retro_item_upvoted', item);
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/retro-items/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.data.retro_items = db.data.retro_items.filter((i) => i.id !== id);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('retro_item_deleted', { id });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ACTION ITEMS
// ----------------------------------------------------
router.get('/action-items', (req, res) => {
  const { sprint_id } = req.query;
  try {
    let items = db.data.action_items;
    if (sprint_id) {
      items = items.filter((i) => i.sprint_id === sprint_id);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/action-items', (req, res) => {
  const { sprint_id, title, description, assignee, priority } = req.body;
  if (!sprint_id || !title) {
    return res.status(400).json({ error: 'sprint_id and title are required' });
  }

  const sprint = db.data.sprints.find((item) => item.id === sprint_id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  const newItem = {
    id: generateId('action'),
    sprint_id,
    workspace_id: sprint.workspace_id,
    title,
    description: description || '',
    assignee: assignee || 'Unassigned',
    status: 'todo',
    priority: priority || 'medium',
    created_at: new Date().toISOString(),
  };

  try {
    db.data.action_items.unshift(newItem);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('action_item_added', newItem);
    }

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/action-items/:id', (req, res) => {
  const { id } = req.params;
  const { status, assignee, priority, title, description } = req.body;

  try {
    const item = db.data.action_items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: 'Action item not found' });

    if (status !== undefined) item.status = status;
    if (assignee !== undefined) item.assignee = assignee;
    if (priority !== undefined) item.priority = priority;
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;

    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('action_item_updated', item);
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/action-items/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.data.action_items = db.data.action_items.filter((i) => i.id !== id);
    db.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('action_item_deleted', { id });
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// EMAIL INVITATIONS
// ----------------------------------------------------
router.post('/invite', async (req, res) => {
  const { email, role, invitedBy, inviterEmail } = req.body;
  const workspaceId = workspaceIdFrom(req);
  if (!email) return res.status(400).json({ error: 'Email address is required' });
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  const recipientEmail = email.trim();
  const normalizedInviterEmail = (inviterEmail || invitedBy || '').trim().toLowerCase();
  const inviter = workspaceMembers(workspaceId).find((member) => member.email.toLowerCase() === normalizedInviterEmail);
  const isAdminInviter = inviter?.role === 'Admin';
  const requestedRole = role === 'Admin' ? 'Admin' : 'Member';

  // Also enforce the role on the server so a Member cannot alter the browser request.
  if (requestedRole === 'Admin' && !isAdminInviter) {
    return res.status(403).json({ error: 'Only Admins can send Admin invitations. Members can invite Members only.' });
  }

  const inviteRole = isAdminInviter ? requestedRole : 'Member';
  const token = generateId('token');
  const inviteId = generateId('invite');

  const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const inviteUrl = `${siteUrl}/?invite=${token}&email=${encodeURIComponent(recipientEmail)}&workspace=${encodeURIComponent(workspaceId)}`;

  const newInvite = {
    id: inviteId,
    workspace_id: workspaceId,
    email: recipientEmail,
    role: inviteRole,
    token,
    status: 'pending',
    invited_by: invitedBy || 'Team Admin',
    created_at: new Date().toISOString(),
  };

  try {
    // Add to invitations list
    db.data.invitations.unshift(newInvite);

    // Also register in members list so recipient immediately appears in Assignee dropdown list as invited
    const existingMem = workspaceMembers(workspaceId).find((m) => m.email.toLowerCase() === recipientEmail.toLowerCase());
    if (!existingMem) {
      db.data.members.push({
        id: generateId('member'),
        workspace_id: workspaceId,
        email: recipientEmail,
        name: recipientEmail.split('@')[0],
        role: inviteRole,
        joined_at: new Date().toISOString(),
      });
    }

    db.save();

    const result = await sendTeamInvite({
      email: recipientEmail,
      role: inviteRole,
      inviteUrl,
      invitedBy: invitedBy || 'Team Admin',
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('member_joined', { email: recipientEmail, role: inviteRole, workspace_id: workspaceId });
    }

    res.status(201).json({
      success: true,
      inviteId,
      email: recipientEmail,
      role: inviteRole,
      token,
      inviteUrl,
      emailSent: result.sent,
      message: result.message,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invitations', (req, res) => {
  try {
    const workspaceId = workspaceIdFrom(req);
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id is required' });
    res.json(db.data.invitations.filter((invitation) => invitation.workspace_id === workspaceId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
