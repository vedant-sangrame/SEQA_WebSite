import React, { useState } from 'react';
import { X, Mail, Send, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';

export default function InviteModal({ isOpen, onClose, currentUser }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'Admin';

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setInviteResult(null);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role: isAdmin ? role : 'Member',
          invitedBy: currentUser?.email,
          inviterEmail: currentUser?.email,
        }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(
          `Server returned non-JSON response (${res.status}): ${responseText.substring(0, 100) || 'Check Render Web Service deployment'}`
        );
      }

      if (!res.ok) throw new Error(data.error || 'Failed to send invite');

      setInviteResult(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Mail size={22} style={{ color: '#6366f1' }} />
            <h3>Invite Team Members</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!inviteResult ? (
          <form onSubmit={handleSendInvite}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Send an email invitation to your teammate so they can join this sprint retrospective board in real time.
            </p>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="colleague@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              {isAdmin ? (
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Member">Member (Add cards, vote, comment)</option>
                  <option value="Admin">Admin (Full board & sprint control)</option>
                </select>
              ) : (
                <>
                  <input value="Member" readOnly aria-label="Invite role" />
                  <small className="form-hint">Members can invite teammates as Members only.</small>
                </>
              )}
            </div>

            {errorMessage && (
              <div style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                {errorMessage}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !email.trim()}>
                <Send size={16} />
                <span>{loading ? 'Sending Email Invite...' : 'Send Invitation Email'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: inviteResult.emailSent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${inviteResult.emailSent ? '#10b981' : '#f59e0b'}`,
                padding: '1.2rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {inviteResult.emailSent ? (
                <ShieldCheck size={28} style={{ color: '#10b981' }} />
              ) : (
                <AlertCircle size={28} style={{ color: '#f59e0b' }} />
              )}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {inviteResult.emailSent ? '✅ Real Email Sent to Inbox!' : '⚠️ Invite Token & Link Created'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {inviteResult.message}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Direct Invitation Link</label>
              <div className="invite-link-row">
                <input type="text" readOnly value={inviteResult.inviteUrl} style={{ fontSize: '0.85rem' }} />
                <button type="button" className="btn btn-primary" onClick={handleCopyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setInviteResult(null);
                  setEmail('');
                }}
              >
                Invite Another Member
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
