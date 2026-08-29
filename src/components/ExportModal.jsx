import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, sprint, wentWellItems, didntGoItems, actionItems }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    const sprintTitle = sprint?.name || 'Sprint Retrospective';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalRetroCards = wentWellItems.length + didntGoItems.length;
    const completedActions = actionItems.filter((a) => a.status === 'done').length;
    const completionRate = actionItems.length > 0 ? Math.round((completedActions / actionItems.length) * 100) : 0;

    let md = `================================================================================\n`;
    md += `🎯 AGILE SPRINT RETROSPECTIVE & ACTION ITEM REPORT\n`;
    md += `================================================================================\n\n`;

    md += `### 📌 Executive Summary\n`;
    md += `- **Sprint Name**: ${sprintTitle}\n`;
    md += `- **Report Date**: ${dateStr}\n`;
    md += `- **Total Retrospective Cards**: ${totalRetroCards} (${wentWellItems.length} Went Well | ${didntGoItems.length} Key Impediments)\n`;
    md += `- **Action Item Progress**: ${completedActions} of ${actionItems.length} Completed (${completionRate}% Completion Rate)\n\n`;

    md += `--------------------------------------------------------------------------------\n`;
    md += `💚 SECTION 1: WHAT WENT WELL (Wins & Success Highlights)\n`;
    md += `--------------------------------------------------------------------------------\n`;
    if (wentWellItems.length === 0) {
      md += `*No items logged under What Went Well.*\n`;
    } else {
      const sortedWentWell = [...wentWellItems].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      sortedWentWell.forEach((item, idx) => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [Category: ${item.tags.join(', ')}]` : '';
        md += `${idx + 1}. **${item.content}**\n`;
        md += `   └─ Upvotes: +${item.upvotes || 0} | Contributor: ${item.author || 'Team Member'}${tagStr}\n`;
      });
    }
    md += `\n`;

    md += `--------------------------------------------------------------------------------\n`;
    md += `🔴 SECTION 2: WHAT DIDN'T GO WELL (Blockers & Process Impediments)\n`;
    md += `--------------------------------------------------------------------------------\n`;
    if (didntGoItems.length === 0) {
      md += `*No items logged under What Didn't Go Well.*\n`;
    } else {
      const sortedDidntGo = [...didntGoItems].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
      sortedDidntGo.forEach((item, idx) => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [Category: ${item.tags.join(', ')}]` : '';
        md += `${idx + 1}. **${item.content}**\n`;
        md += `   └─ Upvotes: +${item.upvotes || 0} | Contributor: ${item.author || 'Team Member'}${tagStr}\n`;
      });
    }
    md += `\n`;

    md += `--------------------------------------------------------------------------------\n`;
    md += `🚀 SECTION 3: ACTION ITEM TRACKER MATRIX\n`;
    md += `--------------------------------------------------------------------------------\n\n`;
    if (actionItems.length === 0) {
      md += `*No actionable tasks recorded for this sprint.*\n`;
    } else {
      md += `| Status      | Priority | Task Title & Description | Assignee |\n`;
      md += `| :---        | :---     | :---                     | :---     |\n`;
      actionItems.forEach((item) => {
        const statusText = item.status === 'done' ? '✓ DONE' : item.status === 'in_progress' ? '⚡ IN PROGRESS' : '⏳ TO DO';
        const priorityText = (item.priority || 'medium').toUpperCase();
        const descText = item.description ? ` (${item.description})` : '';
        md += `| ${statusText.padEnd(11)} | ${priorityText.padEnd(8)} | ${item.title}${descText} | ${item.assignee || 'Unassigned'} |\n`;
      });
    }

    md += `\n================================================================================\n`;
    md += `Report generated via SprintSync Agile Retrospective Platform\n`;
    md += `================================================================================\n`;

    return md;
  };

  const mdContent = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(mdContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([mdContent], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${sprint?.name || 'sprint'}-retrospective-report.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={22} style={{ color: '#6366f1' }} />
            <h3>Export Executive Summary Report</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Formatted professional Agile Retrospective report for Slack, Notion, Jira, or Confluence documentation.
        </p>

        <textarea
          rows={14}
          readOnly
          value={mdContent}
          style={{
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            width: '100%',
            background: 'var(--bg-primary)',
            lineHeight: 1.45,
            whiteSpace: 'pre',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={handleDownload}>
            <Download size={16} />
            <span>Download Report (.MD)</span>
          </button>

          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
