import React from 'react';
import { X, Server, ExternalLink, CheckCircle2, Terminal, ShieldAlert } from 'lucide-react';

export default function RenderGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server size={22} style={{ color: '#6366f1' }} />
            <h3>Deploying Live on Render.com</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.9rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            This application is pre-configured for seamless deployment to <strong>Render.com</strong> using Web Services or Render Blueprint (`render.yaml`).
          </p>

          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={16} />
              Step 1: Push Code to GitHub / GitLab
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Push your workspace directory containing `package.json`, `render.yaml`, and server files to your repository.
            </p>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#34d399', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} />
              Step 2: Create Web Service on Render
            </h4>
            <ol style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              <li>Log in to <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>dashboard.render.com</a>.</li>
              <li>Click <strong>New +</strong> &rarr; Select <strong>Web Service</strong>.</li>
              <li>Connect your repository.</li>
              <li>Set <strong>Environment</strong> to <code>Node</code>.</li>
              <li>Set <strong>Build Command</strong> to: <code>npm run build</code></li>
              <li>Set <strong>Start Command</strong> to: <code>npm start</code></li>
              <li>Set <strong>Health Check Path</strong> to: <code>/api/health</code></li>
            </ol>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#fb7185', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} />
              Step 3: Add Environment Variables (Optional for SMTP)
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Under <strong>Environment Variables</strong> in Render dashboard:
            </p>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              <li><code>PORT</code> = <code>10000</code> (or left default)</li>
              <li><code>SITE_URL</code> = <code>https://your-app-name.onrender.com</code></li>
              <li><code>SMTP_HOST</code> = <code>smtp.gmail.com</code> (or Resend/SendGrid)</li>
              <li><code>SMTP_USER</code> = <code>your-email@gmail.com</code></li>
              <li><code>SMTP_PASS</code> = <code>your-app-password</code></li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <a
              href="https://dashboard.render.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex' }}
            >
              <span>Open Render Dashboard</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
