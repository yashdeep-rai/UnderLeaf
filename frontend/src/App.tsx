import React, { useState } from 'react';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { useDebounce } from './hooks/useDebounce';
import { useCompiler } from './hooks/useCompiler';

const initialMarkdown = `\\documentclass{article}
\\begin{document}
  Hello Underleaf!
\\end{document}`;

export default function App() {
  const [source, setSource] = useState(initialMarkdown);
  const debouncedSource = useDebounce(source, 500);
  
  const { pdfData, isCompiling, compileError, manualCompile } = useCompiler(debouncedSource);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      {/* Left Pane: Editor */}
      <div className="w-1/2 h-full flex flex-col border-r border-gray-700">
        <div className="p-2 bg-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Editor</span>
            <button 
              onClick={manualCompile} 
              disabled={isCompiling}
              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs transition disabled:opacity-50"
            >
              Compile Now
            </button>
          </div>
          {isCompiling && <span className="text-blue-400 animate-pulse">Compiling...</span>}
        </div>
        <Editor value={source} onChange={setSource} />
      </div>

      {/* Right Pane: Viewer */}
      <div className="w-1/2 h-full flex flex-col relative">
        <div className="p-2 bg-gray-800 text-xs text-gray-400 font-semibold uppercase tracking-wider">
          PDF Preview
        </div>
        <Viewer pdfData={pdfData} />
        
        {/* Error Overlay */}
        {compileError && (
          <div className="absolute bottom-0 left-0 w-full p-4 bg-red-900/90 text-red-200 border-t border-red-700 backdrop-blur-sm max-h-48 overflow-auto">
            <h3 className="font-bold mb-1">Compilation Error</h3>
            <pre className="text-xs whitespace-pre-wrap font-mono">{compileError}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
