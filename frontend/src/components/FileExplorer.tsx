import React, { useState, useEffect } from 'react';
import { GetCurrentProject, ListFiles, SetCurrentProject, CreateEmptyFile } from '../../bindings/Underleaf/backend/project/service.js';
import { FileNode } from '../../bindings/Underleaf/backend/project/models.js';

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  activeFilePath?: string;
  onCloseProject: () => void;
}

export function FileExplorer({ onFileSelect, activeFilePath, onCloseProject }: FileExplorerProps) {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [projectPath, setProjectPath] = useState("");

  const refreshTree = async () => {
    try {
      const path = await GetCurrentProject();
      setProjectPath(path);
      const files = await ListFiles(path);
      setRootNode(files);
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  };

  useEffect(() => {
    refreshTree();
  }, []);

  const handleCreateFile = async () => {
    const filename = prompt("Enter new filename (e.g., chapter1.tex):");
    if (!filename || !filename.trim()) return;
    try {
      await CreateEmptyFile(projectPath, filename);
      await refreshTree();
    } catch (e) {
      alert("Failed to create file: " + e);
    }
  };

  const renderTree = (node: FileNode) => {
    if (node.isDir) {
      return (
        <div key={node.path} className="ml-2">
          <div className="text-slate-800 font-bold py-1 text-xs flex items-center">
            <svg className="w-3 h-3 mr-1 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>
            {node.name}
          </div>
          <div className="ml-2 border-l border-slate-200 pl-1">
            {node.children?.map(renderTree)}
          </div>
        </div>
      );
    }

    const isTex = node.name.endsWith('.tex');
    const isActive = node.path === activeFilePath;

    return (
      <div 
        key={node.path} 
        className={`ml-1 py-1 px-2 text-xs truncate cursor-pointer rounded flex items-center transition ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
        onClick={() => {
          if (isTex) onFileSelect(node.path);
        }}
      >
        <svg className={`w-3 h-3 mr-1 flex-shrink-0 ${isTex ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        {node.name}
      </div>
    );
  };

  const handleClose = async () => {
    await SetCurrentProject("");
    onCloseProject();
  };

  return (
    <div className="w-[20%] h-full flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">
      <div className="p-2 bg-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-sm flex items-center justify-between">
        <span className="flex items-center cursor-pointer hover:text-slate-800 transition" onClick={handleClose} title="Back to Welcome Menu">
           <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
           Explorer
        </span>
        <button onClick={handleCreateFile} className="hover:text-blue-600 transition" title="Create New File">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </div>
      <div className="p-2 whitespace-nowrap">
        {rootNode ? renderTree(rootNode) : <div className="text-slate-400 text-xs text-center mt-4">Loading...</div>}
      </div>
    </div>
  );
}
