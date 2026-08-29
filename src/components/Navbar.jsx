import React, { useState } from 'react';
import { Rocket, UserPlus, Download, Moon, Sun, Users, ShieldCheck, Mail } from 'lucide-react';

export default function Navbar({
  theme,
  onToggleTheme,
  activeUsers,
  onOpenInvite,
  onOpenExport,
  onOpenManageRoles,
  currentUser,
  userRole,
  onChangeUser,
}) {
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [inputEmail, setInputEmail] = useState(currentUser.email || '');

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (inputEmail.trim()) {
      onChangeUser(inputEmail.trim());
    }
    setIsEditingUser(false);
  };

  const isAdmin = userRole === 'Admin';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Rocket size={26} style={{ color: '#6366f1' }} />
        <span>SprintSync</span>
      </div>

      <div className="nav-controls">
        {/* Active Users Badge */}
        <div className="badge badge-green" title="Live team members connected">
          <Users size={14} />
          <span>{activeUsers} Live</span>
        </div>

        {/* User Identity & Role Badge */}
        <div className="nav-user-identity">
          {isEditingUser ? (
            <form onSubmit={handleUserSubmit} style={{ display: 'flex', gap: '0.3rem' }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', width: '200px' }}
                autoFocus
                onBlur={handleUserSubmit}
              />
            </form>
          ) : (
            <button
              onClick={() => {
                setInputEmail(currentUser.email || '');
                setIsEditingUser(true);
              }}
              className="btn btn-secondary nav-user-button"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem', fontWeight: 600 }}
              title="Click to edit your email identity"
            >
              <Mail size={14} style={{ color: isAdmin ? '#6366f1' : '#34d399' }} />
              <span className="nav-user-email">{currentUser.email || 'Set Your Email'}</span>
              <span className={`badge ${isAdmin ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>
                {userRole}
              </span>
            </button>
          )}
        </div>

        {/* Manage Roles Button (For Admins) */}
        {isAdmin && (
          <button className="btn btn-secondary" onClick={onOpenManageRoles} title="Manage Team Members & Roles">
            <ShieldCheck size={16} style={{ color: '#6366f1' }} />
            <span>Manage Team</span>
          </button>
        )}

        {/* Invite Team Button */}
        <button className="btn btn-primary" onClick={onOpenInvite}>
          <UserPlus size={16} />
          <span>Invite Team</span>
        </button>

        {/* Export Retrospective */}
        <button className="btn btn-secondary" onClick={onOpenExport} title="Export Retrospective Summary">
          <Download size={16} />
          <span>Export</span>
        </button>

        {/* Theme Toggle */}
        <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
