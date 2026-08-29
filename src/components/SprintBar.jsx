import React from 'react';
import { Calendar, PlusCircle, CheckCircle2, TrendingUp, Trash2 } from 'lucide-react';

export default function SprintBar({
  sprints,
  selectedSprintId,
  onSelectSprint,
  onOpenNewSprint,
  onDeleteSprint,
  stats,
}) {
  const currentSprint = sprints.find((s) => s.id === selectedSprintId) || sprints[0];

  const handleDelete = () => {
    if (!currentSprint) return;
    if (window.confirm(`Are you sure you want to delete "${currentSprint.name}" and all its retrospective cards?`)) {
      onDeleteSprint(currentSprint.id);
    }
  };

  return (
    <div className="glass-panel sprint-bar">
      <div className="sprint-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h2>{currentSprint?.name || 'Sprint Retrospective'}</h2>
          <span className="badge badge-green">Active Sprint</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} />
            {currentSprint?.start_date ? `${currentSprint.start_date} to ${currentSprint.end_date || 'Ongoing'}` : 'Current Sprint'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            {stats.wentWellCount} Went Well
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} style={{ color: '#3b82f6' }} />
            {stats.actionCount} Action Items ({stats.actionDoneCount} Done)
          </span>
        </div>
      </div>

      <div className="sprint-select-wrapper">
        <select
          value={selectedSprintId}
          onChange={(e) => onSelectSprint(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name}
            </option>
          ))}
        </select>

        {/* Create New Sprint */}
        <button className="btn btn-secondary" onClick={onOpenNewSprint}>
          <PlusCircle size={16} />
          <span>New Sprint</span>
        </button>

        {/* Delete Active Sprint Button */}
        {sprints.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={handleDelete}
            style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}
            title="Delete this sprint"
          >
            <Trash2 size={16} />
            <span>Delete Sprint</span>
          </button>
        )}
      </div>
    </div>
  );
}
