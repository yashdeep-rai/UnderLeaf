import React, { useState, useEffect, useRef, useCallback } from 'react';

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
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  compile: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  section: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg>,
  snippet: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
};

// ─── Snippets ─────────────────────────────────────────────────────────────────

const SNIPPETS: { label: string; description: string; text: string }[] = [
  { label: 'Itemize list', description: 'Insert \\begin{itemize}...\\end{itemize}', text: '\\begin{itemize}\n  \\item First item\n  \\item Second item\n\\end{itemize}' },
  { label: 'Enumerate list', description: 'Numbered list environment', text: '\\begin{enumerate}\n  \\item First\n  \\item Second\n\\end{enumerate}' },
  { label: 'Equation block', description: '\\begin{equation}...\\end{equation}', text: '\\begin{equation}\n  \n\\end{equation}' },
  { label: 'Aligned equations', description: '\\begin{align}...\\end{align}', text: '\\begin{align}\n  a &= b + c \\\\\n  d &= e + f\n\\end{align}' },
  { label: 'Figure environment', description: 'Float figure with caption', text: '\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{image.png}\n  \\caption{Caption here.}\n  \\label{fig:label}\n\\end{figure}' },
  { label: 'Table environment', description: 'Float table with tabular', text: '\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    Col1 & Col2 \\\\\n    \\hline\n    A & B \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Table caption.}\n  \\label{tab:label}\n\\end{table}' },
  { label: 'Abstract', description: 'Abstract environment', text: '\\begin{abstract}\n  \n\\end{abstract}' },
  { label: 'Inline math', description: '$...$  inline math', text: '$x = y$' },
  { label: 'Display math', description: '\\[...\\] display math block', text: '\\[\n  \n\\]' },
  { label: 'Bold text', description: '\\textbf{}', text: '\\textbf{text}' },
  { label: 'Italic text', description: '\\textit{}', text: '\\textit{text}' },
  { label: 'Label + Ref pair', description: 'Define a label and its reference', text: '\\label{sec:label}\n% Reference it with: \\ref{sec:label}' },
];

// ─── Palette Component ────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onClose, onCompile, onFileSelect, currentSource }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedSnippet, setCopiedSnippet] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Build dynamic action list ──────────────────────────────────────────────

  const buildActions = useCallback((): PaletteAction[] => {
    const actions: PaletteAction[] = [];

    // Core actions
    actions.push({
      id: 'compile',
      label: 'Compile PDF',
      description: 'Run Tectonic compiler on current file',
      icon: Icon.compile,
      category: 'action',
      run: () => { onCompile(); onClose(); },
    });

    // Sections from current document
    const sectionRe = /\\(section|subsection|subsubsection|chapter)\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = sectionRe.exec(currentSource)) !== null) {
      const kind = m[1];
      const title = m[2];
      const lineOffset = currentSource.substring(0, m.index).split('\n').length;
      actions.push({
        id: `section-${m.index}`,
        label: title,
        description: `Jump to \\${kind} on line ${lineOffset}`,
        icon: Icon.section,
        category: 'section',
        run: () => {
          // We can't directly move cursor from here; copy line for now, future: emit event
          onClose();
        },
      });
    }

    // Snippets
    SNIPPETS.forEach((s) => {
      actions.push({
        id: `snippet-${s.label}`,
        label: s.label,
        description: s.description,
        icon: Icon.snippet,
        category: 'snippet',
        run: () => {
          navigator.clipboard.writeText(s.text);
          setCopiedSnippet(s.label);
          setTimeout(() => onClose(), 600);
        },
      });
    });

    return actions;
  }, [currentSource, onCompile, onClose]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const allActions = buildActions();
  const filtered = query.trim()
    ? allActions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allActions;

  // ── Focus/reset on open ────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setCopiedSnippet('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); filtered[selectedIdx]?.run(); }
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const categoryLabel: Record<string, string> = {
    action: 'Actions',
    section: 'Jump to Section',
    snippet: 'Insert Snippet',
    file: 'Files',
  };

  let lastCategory = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white w-[580px] max-h-[70vh] rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-slate-100">
          <svg className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, section name, or snippet..."
            className="flex-1 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-2">Esc</kbd>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No results for "{query}"</div>
          ) : (
            filtered.map((action, idx) => {
              const showHeader = action.category !== lastCategory;
              if (showHeader) lastCategory = action.category;
              return (
                <React.Fragment key={action.id}>
                  {showHeader && (
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {categoryLabel[action.category] || action.category}
                    </div>
                  )}
                  <div
                    className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={action.run}
                  >
                    <span className={`mr-3 flex-shrink-0 ${idx === selectedIdx ? 'text-blue-600' : 'text-slate-400'}`}>
                      {action.icon || Icon.snippet}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {action.label}
                        {copiedSnippet === action.label && (
                          <span className="ml-2 text-xs text-green-600 font-normal">✓ Copied to clipboard</span>
                        )}
                      </p>
                      {action.description && (
                        <p className="text-xs text-slate-400 truncate">{action.description}</p>
                      )}
                    </div>
                    {idx === selectedIdx && (
                      <kbd className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">↵</kbd>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center space-x-4 text-[10px] text-slate-400">
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↑↓</kbd> Navigate</span>
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↵</kbd> Select</span>
          <span><kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Esc</kbd> Close</span>
          <span className="ml-auto">Snippets are copied to clipboard</span>
        </div>
      </div>
    </div>
  );
}
