import React, { useState } from 'react';
import { Target, Plus, User, Trash2 } from 'lucide-react';

export default function ActionItemColumn({
  items,
  members,
  onAddActionItem,
  onUpdateActionStatus,
  onDeleteActionItem,
  sprintId,
  currentUser,
}) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(currentUser.email || 'Unassigned');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddActionItem({
      sprint_id: sprintId,
      title: title.trim(),
      description: description.trim(),
      assignee: assignee || currentUser.email || 'Unassigned',
      priority,
    });

    setTitle('');
    setDescription('');
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'high':
        return <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>High Priority</span>;
      case 'low':
        return <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Low Priority</span>;
      default:
        return <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Med Priority</span>;
    }
  };

  // Compile unique list of ONLY actual active team members (including Admin & invited users)
  const memberEmails = Array.from(
    new Set(
      [
        currentUser.email,
        ...members.map((m) => m.email),
      ].filter((e) => Boolean(e) && typeof e === 'string' && e.includes('@'))
    )
  );

  return (
    <div className="glass-panel board-column">
      <div className="column-header action-items">
        <div className="column-title">
          <Target size={22} style={{ color: '#3b82f6' }} />
          <span>Action Items</span>
        </div>
        <span className="badge badge-blue">
          {items.length} {items.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Action Item Input Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <input
          type="text"
          placeholder="New action item title... (e.g. Implement connection retry logic)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {/* Team Members Dropdown Menu - Lists only current active team members */}
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="Unassigned">Unassigned</option>
            {memberEmails.map((email) => {
              const memObj = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
              const roleTag = memObj ? ` (${memObj.role})` : '';
              return (
                <option key={email} value={email}>
                  {email}{roleTag}
                </option>
              );
            })}
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">🔥 High Priority</option>
            <option value="medium">⚡ Medium Priority</option>
            <option value="low">🌱 Low Priority</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!title.trim()}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Create Action Item</span>
          </button>
        </div>
      </form>

      {/* Action Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
            }}
          >
            <Target size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <p>No action items recorded for this sprint.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Log actionable goals to drive team progress!</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="retro-card" style={{ borderLeft: `4px solid ${item.status === 'done' ? '#10b981' : item.status === 'in_progress' ? '#f59e0b' : '#3b82f6'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: item.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>
                  {item.title}
                </div>
                <button
                  onClick={() => onDeleteActionItem(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                  title="Delete action item"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {item.description && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {item.description}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="author-tag" style={{ fontSize: '0.8rem' }}>
                    <User size={12} />
                    {item.assignee || 'Unassigned'}
                  </span>
                  {getPriorityBadge(item.priority)}
                </div>

                {/* Status Switcher Button */}
                <button
                  className={`status-pill status-${item.status}`}
                  onClick={() => {
                    const nextStatus =
                      item.status === 'todo'
                        ? 'in_progress'
                        : item.status === 'in_progress'
                        ? 'done'
                        : 'todo';
                    onUpdateActionStatus(item.id, nextStatus);
                  }}
                  title="Click to advance status"
                >
                  {item.status === 'todo' && 'To Do'}
                  {item.status === 'in_progress' && 'In Progress'}
                  {item.status === 'done' && '✓ Done'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
