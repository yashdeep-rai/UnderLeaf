import React, { useState, useEffect } from 'react';
import { ValidateProject, CreateBlankProject, SetCurrentProject, PickDirectory, GetProjects, SaveProject, DeleteProject } from '../../bindings/Underleaf/backend/project/service.js';
import { ProjectRecord } from '../../bindings/Underleaf/backend/project/models.js';

interface WelcomeScreenProps {
  onProjectSet: (path: string) => void;
}

interface CreateDialogProps {
  onConfirm: (name: string, path: string) => void;
  onCancel: () => void;
}

function CreateProjectDialog({ onConfirm, onCancel }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [isPickingDir, setIsPickingDir] = useState(false);

  const handlePick = async () => {
    setIsPickingDir(true);
    try {
      const picked = await PickDirectory("Choose folder for project");
      if (picked) setPath(picked);
    } finally {
      setIsPickingDir(false);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!path.trim()) { setError("Project location is required."); return; }
    onConfirm(name.trim(), path.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[460px] p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">New Project</h2>
        <p className="text-sm text-slate-500 mb-6">Give your project a name and choose where to save it.</p>

        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Project Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Thesis"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Location</label>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="C:\Users\You\Documents"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handlePick}
            disabled={isPickingDir}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-medium transition"
          >
            Browse...
          </button>
        </div>

        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

        <div className="flex justify-end space-x-3 mt-2">
          <button onClick={onCancel} className="px-5 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Cancel</button>
          <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-sm">
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreen({ onProjectSet }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
      // Ask for a name for this project
      const name = (window.prompt("Project name (for display):") || "").trim() || path.split(/[\\/]/).pop() || "Project";
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

  const handleDelete = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    await DeleteProject(path);
    await loadProjects();
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50">
      {showCreateDialog && (
        <CreateProjectDialog
          onConfirm={handleCreateConfirm}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}

      {/* Left branding panel */}
      <div className="w-64 bg-slate-900 flex flex-col items-center justify-center p-8 flex-shrink-0">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Underleaf</h1>
        <p className="text-slate-400 text-xs text-center leading-relaxed">LaTeX IDE with Ghost Previews and live AST parsing</p>

        <div className="mt-10 w-full space-y-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={isLoading}
            className="w-full flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Project
          </button>
          <button
            onClick={handleOpenExisting}
            disabled={isLoading}
            className="w-full flex items-center px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            Open Folder
          </button>
        </div>
      </div>

      {/* Right: Projects list */}
      <div className="flex-1 flex flex-col p-10 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Your Projects</h2>
        <p className="text-sm text-slate-400 mb-6">Click a project to open it.</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-xs mt-1">Create a new project or open an existing folder to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {projects.map((proj, idx) => (
              <button
                key={idx}
                onClick={() => openProject(proj.path)}
                disabled={isLoading}
                className="text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition group flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">{proj.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{proj.path}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, proj.path)}
                  className="ml-4 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0 opacity-0 group-hover:opacity-100"
                  title="Remove from list"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
