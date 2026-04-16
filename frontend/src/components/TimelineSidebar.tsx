import React, { useState, useEffect } from 'react';
import { CreateSnapshot, GetSnapshots, RestoreSnapshot } from '../../bindings/Underleaf/backend/project/snapshotservice.js';
import { project } from '../../bindings/Underleaf/backend/models.js';

interface TimelineProps {
  isOpen: boolean;
  projectPath: string;
  activeFilePath: string;
  pdfData: string;
  onClose: () => void;
  onPreviewSnapshot: (id: string | null) => void;
  previewSnapshotId: string | null;
  onRestored: () => void;
}

export function TimelineSidebar({ isOpen, projectPath, activeFilePath, pdfData, onClose, onPreviewSnapshot, previewSnapshotId, onRestored }: TimelineProps) {
  const [snapshots, setSnapshots] = useState<project.SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [labelInput, setLabelInput] = useState("");

  const loadSnapshots = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const result = await GetSnapshots(projectPath);
      setSnapshots(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, projectPath]);

  const handleCreate = async () => {
    if (!projectPath || !activeFilePath) return;
    setIsSaving(true);
    try {
      await CreateSnapshot(projectPath, activeFilePath, labelInput || "Manual Save", pdfData || "");
      setLabelInput("");
      await loadSnapshots();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!projectPath || !activeFilePath) return;
    try {
      await RestoreSnapshot(projectPath, activeFilePath, id);
      onRestored();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      width: '300px', flexShrink: 0,
      background: '#f8fafc', borderLeft: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Time Travel
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px 0' }}>Save a snapshot of your current document state to safely experiment or revert changes later.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Commit message (optional)" 
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            style={{ padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
          />
          <button 
            onClick={handleCreate} 
            disabled={isSaving || !activeFilePath}
            style={{ 
              padding: '8px', background: 'var(--underleaf-green)', color: 'white', 
              border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, 
              cursor: isSaving || !activeFilePath ? 'not-allowed' : 'pointer', opacity: isSaving || !activeFilePath ? 0.6 : 1 
            }}
          >
            {isSaving ? 'Saving...' : 'Create Save Point'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading && <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Loading snapshots...</p>}
        {!loading && snapshots.length === 0 && (
          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>No snapshots created yet. Create one above!</p>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {snapshots.map(snap => {
            const isActive = previewSnapshotId === snap.id;
            const date = new Date(snap.timestamp);
            return (
              <div 
                key={snap.id} 
                style={{ 
                  background: 'white', border: `1px solid ${isActive ? 'var(--underleaf-green)' : '#e2e8f0'}`,
                  borderRadius: '6px', padding: '12px', cursor: 'pointer',
                  boxShadow: isActive ? '0 0 0 1px var(--underleaf-green)' : 'none',
                  transition: '0.2s all'
                }}
                onClick={() => onPreviewSnapshot(isActive ? null : snap.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '12px', color: '#0f172a' }}>{snap.label || 'Manual Save'}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                </div>
                
                {isActive && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestore(snap.id); }}
                      style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Restore This
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
