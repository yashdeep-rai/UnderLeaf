import React, { useState, useEffect } from 'react';
import { ValidateProject, CreateBlankProject, SetCurrentProject, PickDirectory, GetProjects, SaveProject, DeleteProject, ImportProjectFromZip } from '../../bindings/Underleaf/backend/project/service.js';
import { ProjectRecord } from '../../bindings/Underleaf/backend/project/models.js';

interface WelcomeScreenProps {
  onProjectSet: (path: string) => void;
}

// ─── Shared Dialog Styles ──────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 1000,
};
const dialogStyle: React.CSSProperties = {
  background: 'white', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  border: '1px solid #e5e7eb', width: '480px', padding: '32px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px',
  padding: '10px 12px', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s', outline: 'none',
  boxSizing: 'border-box',
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#64748b',
  background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px',
  transition: 'color 0.2s', fontFamily: 'inherit',
};

// ─── Create New Project Dialog ─────────────────────────────────────────────
function CreateProjectDialog({ onConfirm, onCancel }: { onConfirm: (name: string, path: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [isPickingDir, setIsPickingDir] = useState(false);

  const handlePick = async () => {
    setIsPickingDir(true);
    try {
      const picked = await PickDirectory("Choose folder for project");
      if (picked) setPath(picked);
    } finally { setIsPickingDir(false); }
  };

  const handleCreate = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!path.trim()) { setError("Choose a location."); return; }
    onConfirm(name.trim(), path.trim());
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--underleaf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>New Project</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0' }}>LaTeX project from scratch</p>
          </div>
        </div>

        <label style={labelStyle}>Project Name</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="My Thesis" style={{ ...inputStyle, marginBottom: '16px' }}
          onFocus={e => { e.target.style.borderColor = 'var(--underleaf-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,156,69,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        <label style={labelStyle}>Location</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="text" value={path} onChange={e => setPath(e.target.value)}
            placeholder="Choose a folder..." style={{ ...inputStyle, flex: 1 }}
            onFocus={e => { e.target.style.borderColor = 'var(--underleaf-green)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,156,69,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
          <button onClick={handlePick} disabled={isPickingDir} style={{ padding: '10px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', fontFamily: 'inherit' }}>
            Browse
          </button>
        </div>

        {error && <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleCreate} style={{ padding: '9px 24px', background: 'var(--underleaf-green)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'filter 0.2s' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import from Zip Dialog ────────────────────────────────────────────────
function ImportZipDialog({ onConfirm, onCancel }: { onConfirm: (name: string, baseDir: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [baseDir, setBaseDir] = useState("");
  const [error, setError] = useState("");
  const [isPickingDir, setIsPickingDir] = useState(false);

  const handlePick = async () => {
    setIsPickingDir(true);
    try {
      const picked = await PickDirectory("Choose extraction folder");
      if (picked) setBaseDir(picked);
    } finally { setIsPickingDir(false); }
  };

  const handleConfirm = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!baseDir.trim()) { setError("Choose an extraction folder."); return; }
    onConfirm(name.trim(), baseDir.trim());
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Import from ZIP</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0' }}>Extract a .zip project archive</p>
          </div>
        </div>

        <label style={labelStyle}>Project Name</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Imported Project" style={{ ...inputStyle, marginBottom: '16px' }}
          onFocus={e => { e.target.style.borderColor = '#d97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        />

        <label style={labelStyle}>Extract to Folder</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="text" value={baseDir} onChange={e => setBaseDir(e.target.value)}
            placeholder="Choose destination folder..." style={{ ...inputStyle, flex: 1 }}
            onFocus={e => { e.target.style.borderColor = '#d97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
          <button onClick={handlePick} disabled={isPickingDir} style={{ padding: '10px 16px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s', fontFamily: 'inherit' }}>
            Browse
          </button>
        </div>

        {error && <p style={{ fontSize: '11px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleConfirm} style={{ padding: '9px 24px', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'filter 0.2s' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
            Import Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Welcome Screen ───────────────────────────────────────────────────
export function WelcomeScreen({ onProjectSet }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportZipDialog, setShowImportZipDialog] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const p = await GetProjects();
      setProjects(p || []);
    } catch (e) { console.error(e); }
  };

  const openProject = async (path: string) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const isValid = await ValidateProject(path);
      if (isValid) {
        await SetCurrentProject(path);
        onProjectSet(path);
      } else {
        setErrorMsg(`Path not found: ${path}`);
      }
    } catch (e: any) {
      setErrorMsg(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenExisting = async () => {
    try {
      const path = await PickDirectory("Select LaTeX Project Folder");
      if (!path) return;
      const name = path.split(/[\\/]/).filter(Boolean).pop() || "Project";
      await SaveProject(name, path);
      await loadProjects();
      openProject(path);
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
  };

  const handleCreateConfirm = async (name: string, path: string) => {
    setShowCreateDialog(false);
    setIsLoading(true);
    try {
      await CreateBlankProject(path);
      await SaveProject(name, path);
      await SetCurrentProject(path);
      await loadProjects();
      onProjectSet(path);
    } catch (e: any) {
      setErrorMsg(`Failed to create: ${e.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportZipConfirm = async (name: string, baseDir: string) => {
    setShowImportZipDialog(false);
    setIsLoading(true);
    try {
      const project = await ImportProjectFromZip(name, baseDir);
      if (project) {
        await loadProjects();
        openProject(project.path);
      }
    } catch (e: any) {
      setErrorMsg(`Failed to import zip: ${e.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    await DeleteProject(path);
    await loadProjects();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {showCreateDialog && (
        <CreateProjectDialog onConfirm={handleCreateConfirm} onCancel={() => setShowCreateDialog(false)} />
      )}
      {showImportZipDialog && (
        <ImportZipDialog onConfirm={handleImportZipConfirm} onCancel={() => setShowImportZipDialog(false)} />
      )}

      {/* Left sidebar */}
      <div style={{ width: '300px', flexShrink: 0, backgroundColor: 'var(--header-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--underleaf-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 8px 24px rgba(79,156,69,0.35)' }}>
          <svg width="30" height="30" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '6px', letterSpacing: '-0.02em' }}>Underleaf</h1>
        <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: 1.6, marginBottom: '36px' }}>Professional LaTeX IDE with live preview and smart compilation</p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setShowCreateDialog(true)} disabled={isLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '11px 16px', backgroundColor: 'var(--underleaf-green)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', gap: '10px', transition: 'filter 0.2s', fontFamily: 'inherit' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            New Project
          </button>

          <button onClick={handleOpenExisting} disabled={isLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '11px 16px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', gap: '10px', transition: '0.2s', fontFamily: 'inherit' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            Open Folder
          </button>

          <button onClick={() => setShowImportZipDialog(true)} disabled={isLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '11px 16px', backgroundColor: 'rgba(217,119,6,0.15)', color: '#fbbf24', border: '1.5px solid rgba(251,191,36,0.25)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', gap: '10px', transition: '0.2s', fontFamily: 'inherit' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.25)'; (e.currentTarget as HTMLElement).style.color = '#fde68a'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.15)'; (e.currentTarget as HTMLElement).style.color = '#fbbf24'; }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
            Open from ZIP
          </button>
        </div>
      </div>

      {/* Right: project list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 56px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Recent Projects</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '28px' }}>Click a project to open it in the editor.</p>

        {errorMsg && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', borderRadius: '8px' }}>
            {errorMsg}
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
            <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>No projects yet</p>
            <p style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', maxWidth: '260px', lineHeight: 1.6 }}>Create a new project or open an existing folder to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxWidth: '680px' }}>
            {projects.map((proj, idx) => (
              <button key={idx} onClick={() => openProject(proj.path)} disabled={isLoading}
                style={{ textAlign: 'left', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', fontFamily: 'inherit' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.border = '1.5px solid #4f9c45'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(79,156,69,0.12)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.border = '1.5px solid #e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(79,156,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="var(--underleaf-green)" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</p>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.path}</p>
                  </div>
                </div>
                <button onClick={(e) => handleDelete(e, proj.path)}
                  style={{ marginLeft: '12px', padding: '6px', borderRadius: '6px', color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, transition: '0.2s', opacity: 0, display: 'flex' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                  title="Remove from list"
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
