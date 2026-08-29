import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { ThumbsUp, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

import Navbar from './components/Navbar';
import SprintBar from './components/SprintBar';
import RetroColumn from './components/RetroColumn';
import ActionItemColumn from './components/ActionItemColumn';
import InviteModal from './components/InviteModal';
import NewSprintModal from './components/NewSprintModal';
import ExportModal from './components/ExportModal';
import ManageRolesModal from './components/ManageRolesModal';

const socket = io('/', { autoConnect: true });

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState(() => {
    const savedEmail = localStorage.getItem('sprintsync_user_email');
    return {
      email: savedEmail || '',
      role: 'Member',
    };
  });

  const [members, setMembers] = useState([]);
  const [activeUsers, setActiveUsers] = useState(1);
  const [inviteNotification, setInviteNotification] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('');

  // Sprints state
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');

  // Items state
  const [retroItems, setRetroItems] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNewSprintOpen, setIsNewSprintOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);

  const createWorkspace = async (ownerEmail) => {
    setLoading(true);
    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail }),
    });
    if (!response.ok) throw new Error('Failed to create a new workspace');
    const data = await response.json();
    setWorkspaceId(data.workspace.id);
    setCurrentUser({ email: data.owner.email, role: 'Admin' });
    setSelectedSprintId(data.sprint.id);
    localStorage.setItem('sprintsync_user_email', data.owner.email);
  };

  // Save current user email and join the active workspace.
  const handleUserChange = async (newEmail, forcedRole = null, targetWorkspaceId = workspaceId) => {
    if (!newEmail || !newEmail.trim()) return;
    const cleanEmail = newEmail.trim();
    if (!targetWorkspaceId) {
      try {
        await createWorkspace(cleanEmail);
      } catch (err) {
        console.error('Failed to create workspace:', err);
      }
      return;
    }
    const roleToUse = forcedRole || currentUser.role || 'Member';
    const updatedUser = { email: cleanEmail, role: roleToUse };

    setCurrentUser(updatedUser);
    localStorage.setItem('sprintsync_user_email', cleanEmail);

    try {
      const response = await fetch('/api/members/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, role: roleToUse, workspaceId: targetWorkspaceId }),
      });
      if (!response.ok) throw new Error('Failed to sync member');
      const savedMember = await response.json();
      setCurrentUser({ email: savedMember.email, role: savedMember.role });
      fetchMembers(targetWorkspaceId);
    } catch (err) {
      console.error('Failed to sync member:', err);
    }
  };

  // URL invite token resolution and saved-member role restoration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    const invitedEmail = urlParams.get('email');
    const invitedWorkspaceId = urlParams.get('workspace');

    if (inviteToken && invitedEmail && invitedWorkspaceId) {
      setWorkspaceId(invitedWorkspaceId);
      fetch(`/api/invitations/verify?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(invitedEmail)}&workspace_id=${encodeURIComponent(invitedWorkspaceId)}`)
        .then((res) => res.json())
        .then((data) => {
          const role = data.role || 'Member';
          handleUserChange(invitedEmail, role, invitedWorkspaceId);
          setInviteNotification(`Joined via email invitation as ${invitedEmail} (${role})`);
        })
        .catch(() => {
          handleUserChange(invitedEmail, 'Member', invitedWorkspaceId);
        });
    } else {
      const storedEmail = localStorage.getItem('sprintsync_user_email');
      if (storedEmail) {
        createWorkspace(storedEmail).catch((err) => console.error('Failed to create workspace:', err));
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!workspaceId) return;
    setSelectedSprintId('');
    fetchSprints(workspaceId);
    fetchMembers(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchRetroItems(selectedSprintId);
      fetchActionItems(selectedSprintId);
    }
  }, [selectedSprintId]);

  // Socket.io Real-time Event Listeners
  useEffect(() => {
    socket.on('users_count_updated', (count) => {
      setActiveUsers(count);
    });

    socket.on('member_joined', ({ workspace_id: eventWorkspaceId }) => {
      if (eventWorkspaceId === workspaceId) fetchMembers(workspaceId);
    });

    socket.on('member_role_updated', ({ email, role, workspace_id: eventWorkspaceId }) => {
      if (eventWorkspaceId !== workspaceId) return;
      setMembers((prev) =>
        prev.map((m) => (m.email.toLowerCase() === email.toLowerCase() ? { ...m, role } : m))
      );

      if (currentUser.email && email.toLowerCase() === currentUser.email.toLowerCase()) {
        setCurrentUser((prev) => ({ ...prev, role }));
      }
    });

    socket.on('member_removed', ({ email, workspace_id: eventWorkspaceId }) => {
      if (eventWorkspaceId !== workspaceId) return;
      setMembers((prev) => prev.filter((m) => m.email.toLowerCase() !== email.toLowerCase()));
    });

    socket.on('retro_item_added', (newItem) => {
      if (newItem.workspace_id !== workspaceId) return;
      setRetroItems((prev) => {
        if (prev.some((i) => i.id === newItem.id)) return prev;
        return [...prev, newItem];
      });
    });

    socket.on('retro_item_upvoted', (updatedItem) => {
      setRetroItems((prev) =>
        prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
      );
    });

    socket.on('retro_item_deleted', ({ id }) => {
      setRetroItems((prev) => prev.filter((i) => i.id !== id));
    });

    socket.on('action_item_added', (newItem) => {
      if (newItem.workspace_id !== workspaceId) return;
      setActionItems((prev) => {
        if (prev.some((i) => i.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
    });

    socket.on('action_item_updated', (updatedItem) => {
      if (updatedItem.workspace_id !== workspaceId) return;
      setActionItems((prev) =>
        prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
      );

      if (updatedItem.status === 'done') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    });

    socket.on('action_item_deleted', ({ id }) => {
      setActionItems((prev) => prev.filter((i) => i.id !== id));
    });

    socket.on('sprint_created', (newSprint) => {
      if (newSprint.workspace_id !== workspaceId) return;
      setSprints((prev) => {
        if (prev.some((s) => s.id === newSprint.id)) return prev;
        return [newSprint, ...prev];
      });
      setSelectedSprintId(newSprint.id);
    });

    socket.on('sprint_deleted', ({ id, workspace_id: eventWorkspaceId }) => {
      if (eventWorkspaceId !== workspaceId) return;
      setSprints((prev) => prev.filter((s) => s.id !== id));
    });

    return () => {
      socket.off('users_count_updated');
      socket.off('member_joined');
      socket.off('member_role_updated');
      socket.off('member_removed');
      socket.off('retro_item_added');
      socket.off('retro_item_upvoted');
      socket.off('retro_item_deleted');
      socket.off('action_item_added');
      socket.off('action_item_updated');
      socket.off('action_item_deleted');
      socket.off('sprint_created');
      socket.off('sprint_deleted');
    };
  }, [currentUser.email, workspaceId]);

  const fetchMembers = async (targetWorkspaceId = workspaceId) => {
    if (!targetWorkspaceId) return;
    try {
      const res = await fetch(`/api/members?workspace_id=${encodeURIComponent(targetWorkspaceId)}`);
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchSprints = async (targetWorkspaceId = workspaceId) => {
    if (!targetWorkspaceId) return;
    try {
      const res = await fetch(`/api/sprints?workspace_id=${encodeURIComponent(targetWorkspaceId)}`);
      const data = await res.json();
      setSprints(data);
      if (data.length > 0) {
        setSelectedSprintId((prev) => prev || data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetroItems = async (sprintId) => {
    try {
      const res = await fetch(`/api/retro-items?sprint_id=${sprintId}`);
      const data = await res.json();
      setRetroItems(data);
    } catch (err) {
      console.error('Failed to fetch retro items:', err);
    }
  };

  const fetchActionItems = async (sprintId) => {
    try {
      const res = await fetch(`/api/action-items?sprint_id=${sprintId}`);
      const data = await res.json();
      setActionItems(data);
    } catch (err) {
      console.error('Failed to fetch action items:', err);
    }
  };

  // Role Update Handler
  const handleUpdateRole = async (targetEmail, newRole) => {
    try {
      const res = await fetch('/api/members/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, role: newRole, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMembers();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  // Member Remove Handler (Admin Power)
  const handleRemoveMember = async (targetEmail) => {
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(targetEmail)}?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.email.toLowerCase() !== targetEmail.toLowerCase()));
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Item Action Handlers
  const handleAddRetroItem = async ({ category, content, author, tags }) => {
    try {
      const res = await fetch('/api/retro-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprint_id: selectedSprintId,
          category,
          content,
          author: currentUser.email || 'Team Member',
          tags,
        }),
      });
      const data = await res.json();
      setRetroItems((prev) => {
        if (prev.some((i) => i.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (err) {
      console.error('Failed to add retro item:', err);
    }
  };

  const handleUpvoteItem = async (id) => {
    try {
      const res = await fetch(`/api/retro-items/${id}/upvote`, { method: 'POST' });
      const data = await res.json();
      setRetroItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    } catch (err) {
      console.error('Failed to upvote item:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await fetch(`/api/retro-items/${id}`, { method: 'DELETE' });
      setRetroItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleAddActionItem = async ({ title, description, assignee, priority }) => {
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprint_id: selectedSprintId,
          title,
          description,
          assignee,
          priority,
        }),
      });
      const data = await res.json();
      setActionItems((prev) => {
        if (prev.some((i) => i.id === data.id)) return prev;
        return [data, ...prev];
      });
    } catch (err) {
      console.error('Failed to add action item:', err);
    }
  };

  const handleUpdateActionStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      setActionItems((prev) => prev.map((i) => (i.id === id ? data : i)));

      if (status === 'done') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Failed to update action status:', err);
    }
  };

  const handleDeleteActionItem = async (id) => {
    try {
      await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
      setActionItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete action item:', err);
    }
  };

  const handleConvertToActionItem = async (retroItem) => {
    await handleAddActionItem({
      title: `Fix: ${retroItem.content}`,
      description: `Actionable item derived from sprint feedback card (by ${retroItem.author})`,
      assignee: currentUser.email || 'Unassigned',
      priority: 'high',
    });
  };

  const handleCreateSprint = async ({ name, start_date, end_date }) => {
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date, end_date, createdBy: currentUser.email, workspaceId }),
      });
      const data = await res.json();
      setSprints((prev) => {
        if (prev.some((s) => s.id === data.id)) return prev;
        return [data, ...prev];
      });
      setSelectedSprintId(data.id);
    } catch (err) {
      console.error('Failed to create sprint:', err);
    }
  };

  const handleDeleteSprint = async (sprintId) => {
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterEmail: currentUser.email, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete sprint');
      const remainingSprints = sprints.filter((s) => s.id !== sprintId);
      setSprints(remainingSprints);
      if (remainingSprints.length > 0) {
        setSelectedSprintId(remainingSprints[0].id);
      } else {
        handleCreateSprint({
          name: 'Sprint 1 - Retrospective',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
        });
      }
    } catch (err) {
      console.error('Failed to delete sprint:', err);
      window.alert(err.message);
    }
  };

  const wentWellItems = retroItems.filter((i) => i.category === 'went_well');
  const didntGoItems = retroItems.filter((i) => i.category === 'didnt_go_well');

  const currentSprint = sprints.find((s) => s.id === selectedSprintId);

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        activeUsers={activeUsers}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenManageRoles={() => setIsManageRolesOpen(true)}
        currentUser={currentUser}
        userRole={currentUser.role}
        onChangeUser={handleUserChange}
      />

      {/* Main Board Workspace */}
      <main className="main-content">
        {/* Email Invitation Joined Notification Banner */}
        {inviteNotification && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🎉 {inviteNotification}</span>
            <button
              onClick={() => setInviteNotification(null)}
              style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Sprint Header & Stats */}
      <SprintBar
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSelectSprint={setSelectedSprintId}
          onOpenNewSprint={() => setIsNewSprintOpen(true)}
        onDeleteSprint={handleDeleteSprint}
        canDeleteSprint={(sprint) => currentUser.role === 'Admin' || sprint.created_by?.toLowerCase() === currentUser.email.toLowerCase()}
          stats={{
            wentWellCount: wentWellItems.length,
            didntGoCount: didntGoItems.length,
            actionCount: actionItems.length,
            actionDoneCount: actionItems.filter((a) => a.status === 'done').length,
          }}
        />

        {/* Board Columns Grid */}
        <div className="board-grid">
          {/* Column 1: What Went Well */}
          <RetroColumn
            title="What Went Well"
            category="went_well"
            icon={ThumbsUp}
            items={wentWellItems}
            onAddItem={handleAddRetroItem}
            onUpvoteItem={handleUpvoteItem}
            onDeleteItem={handleDeleteItem}
            onConvertToActionItem={handleConvertToActionItem}
            currentUser={currentUser}
          />

          {/* Column 2: What Didn't Go Well */}
          <RetroColumn
            title="What Didn't Go Well"
            category="didnt_go_well"
            icon={AlertCircle}
            items={didntGoItems}
            onAddItem={handleAddRetroItem}
            onUpvoteItem={handleUpvoteItem}
            onDeleteItem={handleDeleteItem}
            onConvertToActionItem={handleConvertToActionItem}
            currentUser={currentUser}
          />

          {/* Column 3: Action Items */}
          <ActionItemColumn
            items={actionItems}
            members={members}
            onAddActionItem={handleAddActionItem}
            onUpdateActionStatus={handleUpdateActionStatus}
            onDeleteActionItem={handleDeleteActionItem}
            sprintId={selectedSprintId}
            currentUser={currentUser}
          />
        </div>
      </main>

      {/* Modals */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        currentUser={currentUser}
        workspaceId={workspaceId}
      />

      <NewSprintModal
        isOpen={isNewSprintOpen}
        onClose={() => setIsNewSprintOpen(false)}
        onCreateSprint={handleCreateSprint}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sprint={currentSprint}
        wentWellItems={wentWellItems}
        didntGoItems={didntGoItems}
        actionItems={actionItems}
      />

      <ManageRolesModal
        isOpen={isManageRolesOpen}
        onClose={() => setIsManageRolesOpen(false)}
        members={members}
        onUpdateRole={handleUpdateRole}
        onRemoveMember={handleRemoveMember}
        currentUserEmail={currentUser.email}
      />
    </div>
  );
}
