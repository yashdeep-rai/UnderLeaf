import React, { useState, useEffect, useRef } from 'react';
import { GetCurrentProject, ListFiles, SetCurrentProject, CreateEmptyFile } from '../../bindings/Underleaf/backend/project/service.js';
import { FileNode } from '../../bindings/Underleaf/backend/project/models.js';

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  activeFilePath?: string;
  onCloseProject: () => void;
  onImportFile?: () => void;
  onImportZip?: () => void;
  refreshTrigger?: number;
}

const RELEVANT_EXTENSIONS = [
    '.tex', '.bib', '.sty', '.cls', '.txt', '.md',
    '.png', '.jpg', '.jpeg', '.eps', '.pdf'
];

function NewFileDialog({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Filename is required.'); return; }
    onConfirm(trimmed);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        border: '1px solid #e5e7eb', width: '400px', padding: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--underleaf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>New File</h2>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Add a file to this project</p>
          </div>
        </div>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Filename</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="chapter1.tex"
          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={e => { e.target.style.borderColor = 'var(--underleaf-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,156,69,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
        />
        {error && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleConfirm} style={{ padding: '8px 18px', background: 'var(--underleaf-green)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'filter 0.2s' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export function FileExplorer({ onFileSelect, activeFilePath, onCloseProject, onImportFile, onImportZip, refreshTrigger }: FileExplorerProps) {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [projectPath, setProjectPath] = useState("");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);

  const refreshTree = async () => {
    try {
      const path = await GetCurrentProject();
      if (path !== projectPath) {
        setProjectPath(path);
      }
      const files = await ListFiles(path);
      setRootNode(files);
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  };

  useEffect(() => {
    refreshTree();
  }, [activeFilePath, refreshTrigger]);

  const handleCreateFile = async (filename: string) => {
    try {
      await CreateEmptyFile(projectPath, filename);
      await refreshTree();
    } catch (e) {
      alert("Failed to create file: " + e);
    }
  };

  const handleClose = async () => {
    await SetCurrentProject("");
    onCloseProject();
  };

  // Helper to check if a node or its children contain any relevant files
  const hasRelevantContent = (node: FileNode): boolean => {
    if (!node.isDir) {
        const ext = node.name.toLowerCase().substring(node.name.lastIndexOf('.'));
        return RELEVANT_EXTENSIONS.includes(ext);
    }
    return node.children?.some(hasRelevantContent) ?? false;
  };

  const renderTree = (node: FileNode, level = 0) => {
    // Skip if it is a directory with no relevant content
    if (node.isDir && !hasRelevantContent(node)) return null;
    
    // If it's a file, check if it's relevant
    if (!node.isDir) {
        const ext = node.name.toLowerCase().substring(node.name.lastIndexOf('.'));
        if (!RELEVANT_EXTENSIONS.includes(ext)) return null;
    }

    if (node.isDir) {
      return (
        <div key={node.path} className="flex flex-col">
          <div className="file-item" style={{ paddingLeft: `${15 + level * 10}px`, fontSize: '13px', opacity: 0.8 }}>
            📁 {node.name}
          </div>
          <div>
            {node.children?.map(child => renderTree(child, level + 1))}
          </div>
        </div>
      );
    }

    const isTex = node.name.toLowerCase().endsWith('.tex');
    const isActive = node.path === activeFilePath;
    const icon = isTex ? '📄' : (node.name.toLowerCase().match(/\.(png|jpg|jpeg|eps)$/) ? '🖼️' : '📄');

    return (
      <div 
        key={node.path} 
        className={`file-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isTex) onFileSelect(node.path);
        }}
        title={node.path}
        style={{ paddingLeft: `${15 + level * 10}px` }}
      >
        {icon} {node.name}
      </div>
    );
  };

  return (
    <>
      {showNewFileDialog && (
        <NewFileDialog
          onConfirm={async (name) => { setShowNewFileDialog(false); await handleCreateFile(name); }}
          onCancel={() => setShowNewFileDialog(false)}
        />
      )}
      <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              onClick={handleClose}
              title="Back to Welcome Menu"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6, transition: 'opacity 0.2s' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '0.6'}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </div>
            <span className="sidebar-header-title">PROJECT</span>
          </div>
          <div className="file-actions">
              <div data-tooltip="New File" onClick={() => setShowNewFileDialog(true)}>
                  <svg className="action-svg" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
              </div>
              <div data-tooltip="Import File" onClick={onImportFile}>
                  <svg className="action-svg" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
              </div>
              <div data-tooltip="Import Zip" onClick={onImportZip}>
                  <svg className="action-svg" viewBox="0 0 24 24">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      <line x1="12" y1="11" x2="12" y2="17"></line>
                      <line x1="9" y1="14" x2="15" y2="14"></line>
                  </svg>
              </div>
          </div>
      </div>
      <div className="overflow-y-auto flex-1 pb-4">
        {rootNode && rootNode.children ? (
          rootNode.children.map(child => renderTree(child))
        ) : (
          <div className="text-slate-400 text-xs text-center mt-8 px-4 leading-relaxed">
            No relevant files found.
          </div>
        )}
      </div>
    </>
  );
}
