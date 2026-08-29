import React from 'react';
import { X, ShieldCheck, ArrowLeftRight, Trash2, Crown } from 'lucide-react';

export default function ManageRolesModal({ isOpen, onClose, members, onUpdateRole, onRemoveMember, currentUserEmail }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} style={{ color: '#6366f1' }} />
            <h3>Manage Team Members & Roles</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          As an <strong>Admin</strong>, you can manage team member roles and permissions. The board owner remains a permanent Admin.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
          {members.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No other team members registered yet.</p>
          ) : (
            members.map((member) => {
              const isAdmin = member.role === 'Admin';
              const isSelf = member.email.toLowerCase() === (currentUserEmail || '').toLowerCase();

              return (
                <div
                  key={member.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{member.email}</span>
                      {isSelf && (
                        <span className="badge badge-rose" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Crown size={10} /> Owner (Permanent Admin)
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Role: <strong style={{ color: isAdmin ? '#6366f1' : '#34d399' }}>{member.role}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Requirement 3: Disable role demotion for Owner (isSelf) */}
                    {!isSelf ? (
                      <>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => onUpdateRole(member.email, isAdmin ? 'Member' : 'Admin')}
                        >
                          <ArrowLeftRight size={13} />
                          <span>{isAdmin ? 'Make Member' : 'Make Admin'}</span>
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${member.email} from the team?`)) {
                              onRemoveMember(member.email);
                            }
                          }}
                          title="Remove member from team"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Board Owner
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
