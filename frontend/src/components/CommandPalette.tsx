import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ListFiles } from '../../bindings/Underleaf/backend/project/service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category: 'action' | 'section' | 'snippet' | 'file';
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCompile: () => void;
  onFileSelect: (path: string) => void;
  currentSource: string;
  projectPath: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  compile: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  section: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg>,
  snippet: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  file: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
};

const SNIPPETS = [
  { label: 'Itemize', description: 'Bullet list', text: '\\begin{itemize}\n  \\item \n\\end{itemize}' },
  { label: 'Enumerate', description: 'Numbered list', text: '\\begin{enumerate}\n  \\item \n\\end{enumerate}' },
  { label: 'Equation', description: 'Math equation', text: '\\begin{equation}\n  \n\\end{equation}' },
  { label: 'Figure', description: 'Image with caption', text: '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{}\n  \\caption{}\n  \\label{fig:}\n\\end{figure}' },
  { label: 'Table', description: 'Table environment', text: '\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{cc}\n    \n  \\end{tabular}\n  \\caption{}\n\\end{table}' },
];

// ─── Palette Component ────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onClose, onCompile, onFileSelect, currentSource, projectPath }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [projectFiles, setProjectFiles] = useState<{name: string, path: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load files when project changes or palette opens
  useEffect(() => {
    if (isOpen && projectPath) {
      ListFiles(projectPath).then(root => {
        const files: {name: string, path: string}[] = [];
        const scan = (node: any) => {
          if (!node.isDir) files.push({name: node.name, path: node.path});
          node.children?.forEach(scan);
        };
        scan(root);
        setProjectFiles(files);
      }).catch(console.error);
    }
  }, [isOpen, projectPath]);

  // ── Build dynamic action list ──────────────────────────────────────────────

  const actions: PaletteAction[] = [];

  // 1. Actions
  actions.push({
    id: 'compile',
    label: 'Compile PDF',
    description: 'Run Tectonic compiler',
    icon: Icon.compile,
    category: 'action',
    run: () => { onCompile(); onClose(); },
  });

  // 2. Sections
  const sectionRe = /\\(section|subsection|chapter)\{([^}]+)\}/g;
  let m;
  while ((m = sectionRe.exec(currentSource)) !== null) {
    const title = m[2];
    actions.push({
      id: `sec-${m.index}`,
      label: title,
      description: `Jump to ${m[1]}`,
      icon: Icon.section,
      category: 'section',
      run: () => { onClose(); }, // Jumping to line logic would go here
    });
  }

  // 3. Files
  projectFiles.forEach(f => {
    actions.push({
      id: `file-${f.path}`,
      label: f.name,
      description: f.path,
      icon: Icon.file,
      category: 'file',
      run: () => { onFileSelect(f.path); onClose(); },
    });
  });

  // 4. Snippets
  SNIPPETS.forEach(s => {
    actions.push({
      id: `snip-${s.label}`,
      label: s.label,
      description: s.description,
      icon: Icon.snippet,
      category: 'snippet',
      run: () => {
        navigator.clipboard.writeText(s.text);
        onClose();
      },
    });
  });

  const filtered = query.trim()
    ? actions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 15) // Limit results for speed
    : actions.slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => (i + 1) % filtered.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => (i - 1 + filtered.length) % filtered.length); }
    if (e.key === 'Enter') { e.preventDefault(); filtered[selectedIdx]?.run(); }
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  let lastCat = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-slate-900/10 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-[600px] max-h-[60vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-5 border-b border-slate-100">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, files, or sections..."
            className="flex-1 py-4 text-base outline-none bg-transparent"
          />
          <kbd className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Esc</kbd>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map((a, i) => {
            const showCat = a.category !== lastCat;
            if (showCat) lastCat = a.category;
            return (
              <React.Fragment key={a.id}>
                {showCat && (
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.category}s</div>
                )}
                <div
                  className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${i === selectedIdx ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'hover:bg-slate-50'}`}
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={a.run}
                >
                  <span className={`mr-4 ${i === selectedIdx ? 'text-white' : 'text-slate-400'}`}>{a.icon}</span>
                  <div className="flex-1 truncate">
                    <p className={`text-sm font-semibold ${i === selectedIdx ? 'text-white' : 'text-slate-800'}`}>{a.label}</p>
                    <p className={`text-[10px] truncate ${i === selectedIdx ? 'text-blue-100' : 'text-slate-400'}`}>{a.description}</p>
                  </div>
                  {i === selectedIdx && <kbd className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded ml-2">↵</kbd>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
