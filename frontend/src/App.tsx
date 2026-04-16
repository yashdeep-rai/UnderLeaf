import React, { useState, useEffect, useRef } from 'react';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { FileExplorer } from './components/FileExplorer';
import { CommandPalette } from './components/CommandPalette';
import { useDebounce } from './hooks/useDebounce';
import { useCompiler } from './hooks/useCompiler';
import { useContextMenu } from './components/ContextMenu';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReadFile, SaveFile, ImportFile, ImportZip } from '../bindings/Underleaf/backend/project/service.js';
import { ClearCache } from '../bindings/Underleaf/backend/engine/compilerservice.js';

export default function App() {
  const [activeFilePath, setActiveFilePath] = useState<string>("");
  const [loadedFilePath, setLoadedFilePath] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isAutoCompile, setIsAutoCompile] = useState(true);
  const [showFullLog, setShowFullLog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isLogDismissed, setIsLogDismissed] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [previewWidth, setPreviewWidth] = useState(window.innerWidth * 0.4);

  const sidebarResizerRef = useRef<boolean>(false);
  const previewResizerRef = useRef<boolean>(false);
  
  const debouncedSource = useDebounce(source, 500);
  const projectName = projectPath ? projectPath.split(/[\\/]/).filter(Boolean).pop() || projectPath : '';

  // Close menus on click outside
  useEffect(() => {
    const handler = () => { if (showSettings) setShowSettings(false); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showSettings]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarResizerRef.current) {
        let w = e.clientX;
        if (w > 180 && w < 450) setSidebarWidth(w);
      } else if (previewResizerRef.current) {
        let w = window.innerWidth - e.clientX;
        if (w > 250 && w < (window.innerWidth * 0.7)) setPreviewWidth(w);
      }
    };
    const handleMouseUp = () => {
      sidebarResizerRef.current = false;
      previewResizerRef.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Ctrl+K or Ctrl+P → open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // When active file changes, load it from disk
  useEffect(() => {
    if (!activeFilePath) {
        setSource("");
        setLoadedFilePath("");
        return;
    }
    ReadFile(activeFilePath).then((content) => {
        setSource(content);
        setLoadedFilePath(activeFilePath);
    }).catch(console.error);
  }, [activeFilePath]);

  // When source changes, save it to disk. 
  useEffect(() => {
    if (!loadedFilePath || loadedFilePath !== activeFilePath) return;
    if (debouncedSource !== undefined) {
      SaveFile(loadedFilePath, debouncedSource).catch(console.error);
    }
  }, [debouncedSource, loadedFilePath, activeFilePath]);
  
  const { pdfData, isCompiling, compileError, compileWarnings, manualCompile, fullLog, prevLog, missingPackage } = useCompiler(activeFilePath, debouncedSource, isAutoCompile);

  // Reset dismissed log state whenever we start compiling
  useEffect(() => {
    if (isCompiling) {
      setIsLogDismissed(false);
    }
  }, [isCompiling]);

  const handleImportFile = async () => {
    try { await ImportFile(projectPath); } catch (e) { console.error("Import file failed:", e); }
  };

  const handleImportZip = async () => {
    try { await ImportZip(projectPath); } catch (e) { console.error("Import zip failed:", e); }
  };

  const handleDownloadPdf = () => {
    if (!pdfData) return;
    const filename = activeFilePath ? activeFilePath.split(/[\\/]/).pop()?.replace('.tex', '.pdf') || 'document.pdf' : 'document.pdf';
    const byteChars = atob(pdfData);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    setRepairMsg("Clearing Tectonic cache...");
    try {
      await ClearCache();
      setRepairMsg("Cache cleared! Restarting compiler...");
      await manualCompile();
      setRepairMsg("");
    } catch (e: any) {
      setRepairMsg("Repair failed: " + e.toString());
      setTimeout(() => setRepairMsg(""), 3000);
    } finally {
      setIsRepairing(false);
    }
  };

  // Right-click context menu
  const editorCtxItems = [
    {
      label: 'Compile Document',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      action: () => manualCompile(),
    },
    { separator: true },
    {
      label: 'Download PDF',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
      action: handleDownloadPdf,
      disabled: !pdfData,
    },
    { separator: true },
    {
      label: 'Toggle Live Compile',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
      action: () => setIsAutoCompile(a => !a),
    },
    {
      label: 'View Compile Logs',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
      action: () => setShowFullLog(l => !l),
    },
    { separator: true },
    {
      label: 'Repair Compiler',
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
      action: handleRepair,
      danger: true,
    },
  ];

  const { open: openEditorCtx, Menu: EditorContextMenu } = useContextMenu(editorCtxItems);

  if (!projectPath) {
    return <WelcomeScreen onProjectSet={setProjectPath} />;
  }

  return (
    <>
      <EditorContextMenu />
      <nav>
          <div className="nav-left">
              <div className="logo">underleaf</div>
              {projectName && (
                <span style={{
                  fontSize: '12px', fontWeight: 600, color: '#64748b',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                  paddingLeft: '16px', marginLeft: '4px',
                  maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {projectName}
                </span>
              )}
          </div>
          <div className="nav-right">
              <div className="relative">
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                      className="nav-btn"
                      data-tooltip="Settings & Repair"
                  >
                      SETTINGS
                  </button>
                  {showSettings && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        width: '200px', background: 'white', border: '1px solid #e2e8f0',
                        borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 9000, padding: '4px'
                      }}>
                          <button 
                            onClick={handleRepair}
                            disabled={isRepairing}
                            style={{
                              width: '100%', textAlign: 'left', padding: '8px 12px',
                              fontSize: '11px', fontWeight: 600, color: '#b91c1c',
                              background: 'transparent', border: 'none', borderRadius: '6px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s'
                            }}
                            onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                            onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                              <svg style={{width:'14px',height:'14px',marginRight:'8px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              Repair Compiler
                          </button>
                      </div>
                  )}
              </div>
              <button onClick={manualCompile} disabled={isCompiling || !activeFilePath} className="nav-btn nav-btn-primary disabled:opacity-50" data-tooltip="Generate PDF (Ctrl+Enter)">
                  {isCompiling ? 'COMPILING...' : 'COMPILE'}
              </button>
          </div>
      </nav>

      <main className="workspace">
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onCompile={manualCompile}
          onFileSelect={setActiveFilePath}
          currentSource={source}
        />
        
        {/* Left Pane: Explorer */}
        <aside className="card" id="sidebar" style={{ width: sidebarWidth }}>
          <FileExplorer 
            key={projectPath} 
            onFileSelect={setActiveFilePath} 
            activeFilePath={activeFilePath} 
            onImportFile={handleImportFile}
            onImportZip={handleImportZip}
            onCloseProject={() => setProjectPath("")} 
            refreshTrigger={refreshCounter}
          />
        </aside>

        <div className="resizer" id="resizer-1" onMouseDown={() => sidebarResizerRef.current = true}></div>

        {/* Middle Pane: Editor */}
        <section className="card" id="editor-panel">
            <header className="panel-header">
                <div className="header-group">
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      {activeFilePath ? activeFilePath.split(/[\\/]/).pop() : 'No file selected'}
                    </span>
                </div>
                <div className="view-toggle">
                    <div className="toggle-btn active">SOURCE</div>
                    <div
                      className={`toggle-btn ${isAutoCompile ? 'active' : ''}`}
                      onClick={() => setIsAutoCompile(!isAutoCompile)}
                      data-tooltip="Toggle Auto-Compile"
                      style={{ opacity: isAutoCompile ? 1 : 0.6 }}
                    >
                      LIVE
                    </div>
                </div>
            </header>
            <div className="editor-body relative" onContextMenu={openEditorCtx}>
              {activeFilePath ? (
                <Editor value={source} onChange={setSource} projectPath={projectPath} activeFilePath={activeFilePath} onAssetSaved={() => setRefreshCounter(c => c+1)} />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', flexDirection: 'column', gap: '8px' }}>
                  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Select a .tex file from the explorer to edit.
                </div>
              )}
            </div>
        </section>

        <div className="resizer" id="resizer-2" onMouseDown={() => previewResizerRef.current = true}></div>

        {/* Right Pane: Viewer */}
        <section className="card relative" id="preview-panel" style={{ width: previewWidth }}>
            <header className="panel-header">
                <div className="header-group">
                    <button className="tool-btn" data-tooltip="View Compile Logs" onClick={() => setShowFullLog(!showFullLog)}
                      style={showFullLog ? { color: 'white', background: 'rgba(255,255,255,0.15)' } : {}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Logs
                    </button>
                    <div className="divider"></div>
                    <button
                      className="tool-btn"
                      data-tooltip="Download PDF"
                      onClick={handleDownloadPdf}
                      disabled={!pdfData}
                      style={{ opacity: pdfData ? 1 : 0.4 }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        PDF
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  {isAutoCompile && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--underleaf-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {isCompiling ? 'Compiling...' : 'Live'}
                    </span>
                  )}
                </div>
            </header>
            
            <div className="pdf-content relative" style={{ padding: 0, overflow: 'hidden', height: '100%', background: 'var(--preview-bg)' }}>
              <Viewer pdfData={pdfData} isCompiling={isCompiling} />
            </div>
            
            {/* Repair Overlay Info */}
            {repairMsg && (
              <div style={{ position: 'absolute', top: '60px', left: '16px', right: '16px', background: '#0f172a', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 40, display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                 <svg style={{ width: '16px', height: '16px', marginRight: '12px', animation: 'spin 1s linear infinite', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                 <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{repairMsg}</p>
              </div>
            )}

            {/* Missing Package Alert */}
            {missingPackage && !repairMsg && (
              <div style={{ position: 'absolute', top: '60px', left: '16px', right: '16px', background: '#d97706', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                   <svg style={{ width: '18px', height: '18px', marginRight: '12px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                   <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Missing: {missingPackage}</p>
                      <p style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>Tectonic failed to download this package.</p>
                   </div>
                </div>
                <button onClick={handleRepair} style={{ padding: '6px 12px', background: 'white', color: '#b45309', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', marginLeft: '16px', whiteSpace: 'nowrap', transition: '0.2s' }}>
                    Repair & Retry
                </button>
              </div>
            )}

            {/* ── Centered compile loader overlay ─────────────── */}
            {isCompiling && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(3px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '16px', padding: '24px',
              }}>
                <svg width="36" height="36" fill="none" stroke="var(--underleaf-green)" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>COMPILING DOCUMENT…</p>
                {prevLog && (
                  <div style={{
                    width: '100%', maxWidth: '600px', maxHeight: '220px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                    padding: '12px', overflow: 'auto',
                  }}>
                    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#64748b', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {prevLog.split('\n').slice(-30).join('\n')}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Error/Warning Overlay */}
            {!isLogDismissed && (compileError || compileWarnings || showFullLog) && (
              <div className={`error-overlay ${compileError ? 'error' : 'warning'}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {compileError
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      }
                    </svg>
                    {showFullLog ? 'Raw Compiler Output' : (compileError ? 'Compilation Failed' : 'Warnings')}
                  </h3>
                  {!isCompiling && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setShowFullLog(!showFullLog)} className="log-toggle-btn">
                        {showFullLog ? 'Summary' : 'Raw Log'}
                      </button>
                      <button onClick={() => { setIsLogDismissed(true); setShowFullLog(false); }} className="log-close-btn">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="log-content">
                    <pre className="log-pre">
                        {showFullLog
                          ? (fullLog || "No output.")
                          : (compileError || compileWarnings || "No details.")}
                    </pre>
                </div>
              </div>
            )}
        </section>
      </main>
      <footer>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeFilePath && <span>{activeFilePath.split(/[\\/]/).pop()}</span>}
            <span>Engine: Tectonic</span>
          </div>
      </footer>
    </>
  );
}
