import React, { useState } from 'react';
import { ThumbsUp, Plus, Trash2, Tag, User, ArrowRight, Smile, AlertTriangle } from 'lucide-react';

export default function RetroColumn({
  title,
  category,
  icon: Icon,
  items,
  onAddItem,
  onUpvoteItem,
  onDeleteItem,
  onConvertToActionItem,
  currentUser,
}) {
  const [newContent, setNewContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWentWell = category === 'went_well';
  const accentClass = isWentWell ? 'went-well' : 'didnt-go';

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    const tags = selectedTag ? [selectedTag] : [isWentWell ? 'Praise' : 'Improvement'];

    onAddItem({
      category,
      content: newContent.trim(),
      author: currentUser.email || 'Team Member',
      tags,
    });

    setNewContent('');
    setSelectedTag('');
    setIsSubmitting(false);
  };

  return (
    <div className="glass-panel board-column">
      <div className={`column-header ${accentClass}`}>
        <div className="column-title">
          <Icon size={22} style={{ color: isWentWell ? '#10b981' : '#f43f5e' }} />
          <span>{title}</span>
        </div>
        <span className={`badge ${isWentWell ? 'badge-green' : 'badge-rose'}`}>
          {items.length} {items.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <textarea
          rows={3}
          placeholder={
            isWentWell
              ? 'Log what went well this sprint... (e.g. Great teamwork, clean release)'
              : 'Log what didn\'t go well... (e.g. Flaky tests, unclear requirements)'
          }
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleAdd(e);
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
          >
            <option value="">+ Add Category Tag</option>
            <option value="Teamwork">Teamwork</option>
            <option value="Process">Process</option>
            <option value="DevOps">DevOps</option>
            <option value="Code Quality">Code Quality</option>
            <option value="Requirements">Requirements</option>
            <option value="Infrastructure">Infrastructure</option>
          </select>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!newContent.trim() || isSubmitting}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Add Card</span>
          </button>
        </div>
      </form>

      {/* Items List */}
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
            {isWentWell ? <Smile size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} /> : <AlertTriangle size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />}
            <p>No cards added yet.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Share your feedback to begin collaboration!</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="retro-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div className="retro-card-content">{item.content}</div>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                  }}
                  title="Delete card"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="retro-card-footer">
                <span className="author-tag">
                  <User size={12} />
                  {item.author || 'Team Member'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!isWentWell && (
                    <button
                      onClick={() => onConvertToActionItem(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontWeight: 600,
                      }}
                      title="Convert card to actionable task"
                    >
                      <span>Action Item</span>
                      <ArrowRight size={12} />
                    </button>
                  )}

                  <button
                    className="upvote-btn"
                    onClick={() => onUpvoteItem(item.id)}
                    title="Upvote card"
                  >
                    <ThumbsUp size={13} />
                    <span>{item.upvotes || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
