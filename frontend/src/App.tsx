import React, { useState, useEffect, useRef } from 'react';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { FileExplorer } from './components/FileExplorer';
import { CommandPalette } from './components/CommandPalette';
import { useDebounce } from './hooks/useDebounce';
import { useCompiler } from './hooks/useCompiler';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReadFile, SaveFile } from '../bindings/Underleaf/backend/project/service.js';

export default function App() {
  const [activeFilePath, setActiveFilePath] = useState<string>("");
  const [loadedFilePath, setLoadedFilePath] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  
  const debouncedSource = useDebounce(source, 500);
  const isFirstLoad = useRef(true);

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
    if (!activeFilePath) return;
    
    ReadFile(activeFilePath)
      .then((content) => {
        setSource(content);
        setLoadedFilePath(activeFilePath);
      })
      .catch(console.error);
  }, [activeFilePath]);

  // When source changes (and it's the currently loaded file), save it
  useEffect(() => {
    if (!loadedFilePath || loadedFilePath !== activeFilePath) return;
    
    // Prevent saving empty string accidentally if something unmounts
    if (debouncedSource !== undefined) {
      SaveFile(loadedFilePath, debouncedSource).catch(console.error);
    }
  }, [debouncedSource, loadedFilePath, activeFilePath]);
  
  const { pdfData, isCompiling, compileError, manualCompile } = useCompiler(debouncedSource, projectPath);

  if (!projectPath) {
    return <WelcomeScreen onProjectSet={setProjectPath} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onCompile={manualCompile}
        onFileSelect={setActiveFilePath}
        currentSource={source}
      />
      {/* Left Pane: Explorer */}
      <FileExplorer onFileSelect={setActiveFilePath} activeFilePath={activeFilePath} onCloseProject={() => setProjectPath("")} />

      {/* Middle Pane: Editor */}
      <div className="w-[40%] h-full flex flex-col border-r border-slate-200 bg-white">
        <div className="p-2 bg-slate-100 text-xs text-slate-600 font-semibold uppercase tracking-wider flex items-center justify-between border-b border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <span>Editor {activeFilePath ? `- ${activeFilePath.split('/').pop()?.split('\\').pop()}` : ''}</span>
            <button 
              onClick={manualCompile} 
              disabled={isCompiling || !activeFilePath}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition disabled:opacity-50"
            >
              Compile Now
            </button>
          </div>
          {isCompiling && <span className="text-blue-500 animate-pulse">Compiling...</span>}
        </div>
        {activeFilePath ? (
          <Editor value={source} onChange={setSource} projectPath={projectPath} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a .tex file from the explorer to edit.
          </div>
        )}
      </div>

      {/* Right Pane: Viewer */}
      <div className="w-[40%] flex-1 h-full flex flex-col relative bg-slate-50">
        <div className="p-2 bg-slate-100 text-xs text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
          PDF Preview
        </div>
        <Viewer pdfData={pdfData} />
        
        {/* Error Overlay */}
        {compileError && (
          <div className="absolute bottom-0 left-0 w-full p-4 bg-red-50 text-red-700 border-t border-red-200 backdrop-blur-sm max-h-48 overflow-auto shadow-lg">
            <h3 className="font-bold mb-1">Compilation Error</h3>
            <pre className="text-xs whitespace-pre-wrap font-mono">{compileError}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
