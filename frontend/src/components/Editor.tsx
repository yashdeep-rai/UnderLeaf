import React, { useRef, useEffect, useState, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { mathDecorationsPlugin } from '../extensions/mathPreview';
import { latexAutocomplete } from '../extensions/latexAutocomplete';
import { SaveImageAsset } from '../../bindings/Underleaf/backend/project/service.js';

// ─── Professional Underleaf Light Theme ────────────────────────────────────────

const underleafTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "15px",
    backgroundColor: "#ffffff",
  },
  ".cm-content": {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    padding: "15px 0",
    minHeight: "100%",
    lineHeight: "1.6",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
    borderRight: "1px solid #e2e8f0",
    minWidth: "40px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#eff6ff",
    color: "#3b82f6",
  },
  ".cm-activeLine": {
    backgroundColor: "#f1f5f966",
  },
  ".cm-selectionMatch": {
    backgroundColor: "#e2e8f0",
  },
}, { dark: false });

const underleafHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#2563eb", fontWeight: "bold" },      // \begin, \end, \section
  { tag: t.meta, color: "#7c3aed", fontWeight: "600" },         // \usepackage, \documentclass
  { tag: t.atom, color: "#d946ef" },                             // arguments in {}
  { tag: t.string, color: "#10b981" },                           // strings/content
  { tag: t.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: t.number, color: "#f59e0b" },
  { tag: t.bracket, color: "#64748b" },
  { tag: t.heading, color: "#1e293b", fontWeight: "700" },
  { tag: t.punctuation, color: "#94a3b8" },
  { tag: t.list, color: "#ec4899" },
]);

const latexLanguage = StreamLanguage.define(stex);

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'eps', 'pdf', 'svg'];

// ─── Component ────────────────────────────────────────────────────────────────

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  projectPath: string;
  activeFilePath: string;
  onAssetSaved?: () => void;
}

export function Editor({ value, onChange, projectPath, activeFilePath, onAssetSaved }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const lastPath = useRef(activeFilePath);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dropStatus, setDropStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [dropMsg, setDropMsg] = useState('');

  useEffect(() => {
    // Only force sync content when switching files
    if (activeFilePath !== lastPath.current && editorRef.current?.view) {
      const view = editorRef.current.view;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      });
      lastPath.current = activeFilePath;
    }
  }, [activeFilePath, value]);

  // Insert text at current cursor position
  const insertAtCursor = useCallback((text: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length },
    });
    view.focus();
  }, []);

  // Build \begin{figure} block from asset path
  const buildFigureBlock = (relPath: string, filename: string): string => {
    const stem = filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return (
      `\n\\begin{figure}[h]\n` +
      `  \\centering\n` +
      `  \\includegraphics[width=0.8\\textwidth]{${relPath}}\n` +
      `  \\caption{Caption for ${filename}}\n` +
      `  \\label{fig:${stem}}\n` +
      `\\end{figure}\n`
    );
  };

  // Ensure \usepackage{graphicx} is in the preamble.
  // If missing, inserts it on the line after \documentclass{...}.
  const ensureGraphicx = useCallback(() => {
    const view = editorRef.current?.view;
    if (!view) return;
    const docText = view.state.doc.toString();

    // Already present — nothing to do
    if (/\\usepackage(\[.*?\])?\{[^}]*graphicx[^}]*\}/.test(docText)) return;

    // Find the end of the \documentclass line to insert after it
    const dcMatch = docText.match(/\\documentclass(?:\[.*?\])?\{[^}]+\}[^\n]*\n/);
    let insertPos: number;
    let insertText: string;

    if (dcMatch && dcMatch.index !== undefined) {
      insertPos = dcMatch.index + dcMatch[0].length;
      insertText = '\\usepackage{graphicx}\n';
    } else {
      // Fallback: insert at very top
      insertPos = 0;
      insertText = '\\usepackage{graphicx}\n';
    }

    view.dispatch({
      changes: { from: insertPos, insert: insertText },
    });
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingImage(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingImage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if leaving the whole editor area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingImage(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);

    const file = Array.from(e.dataTransfer.files).find(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return IMAGE_EXTENSIONS.includes(ext);
    });

    if (!file || !projectPath) return;

    setDropStatus('uploading');
    setDropMsg(`Importing ${file.name}…`);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
          const result = ev.target?.result as string;
          // Strip the data URL prefix ("data:image/png;base64,")
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to backend — saves to <project>/assets/<filename>
      const relPath = await SaveImageAsset(projectPath, file.name, base64);

      // Notify parent to refresh file tree
      onAssetSaved?.();

      // Auto-inject \usepackage{graphicx} if missing
      ensureGraphicx();

      // Insert \begin{figure} block at cursor
      insertAtCursor(buildFigureBlock(relPath, file.name));

      setDropStatus('done');
      setDropMsg(`Saved to ${relPath}`);
      setTimeout(() => { setDropStatus('idle'); setDropMsg(''); }, 2500);
    } catch (err: any) {
      setDropStatus('error');
      setDropMsg(`Failed: ${err?.toString() || 'Unknown error'}`);
      setTimeout(() => { setDropStatus('idle'); setDropMsg(''); }, 3000);
    }
  };

  return (
    <div
      className="flex-1 w-full h-full bg-white relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        className="h-full w-full absolute inset-0"
        theme="light"
        extensions={[
          latexLanguage,
          syntaxHighlighting(underleafHighlight),
          underleafTheme,
          EditorView.lineWrapping,
          mathDecorationsPlugin,
          latexAutocomplete(() => projectPath),
        ]}
        onChange={(val) => {
          onChange(val);
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: false,
          autocompletion: false,
          highlightSelectionMatches: true,
        }}
      />

      {/* ─── Drag Overlay ──────────────────────────────────────── */}
      {isDraggingImage && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', pointerEvents: 'none',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', border: '2px dashed #4f9c45',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 1.5s ease infinite',
          }}>
            <svg width="32" height="32" fill="none" stroke="#4f9c45" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '0.01em' }}>Drop image to insert figure</p>
          <p style={{ color: '#64748b', fontSize: '12px' }}>Saved to assets/ — a \\begin&#123;figure&#125; block will be inserted</p>
        </div>
      )}

      {/* ─── Upload Status Toast ────────────────────────────────── */}
      {dropStatus !== 'idle' && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', alignItems: 'center', gap: '10px',
          background: dropStatus === 'error' ? '#7f1d1d' : '#0f172a',
          color: 'white', padding: '10px 18px', borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
          border: `1px solid ${dropStatus === 'done' ? '#4f9c45' : dropStatus === 'error' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
        }}>
          {dropStatus === 'uploading' && (
            <svg width="14" height="14" fill="none" stroke="#4f9c45" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          )}
          {dropStatus === 'done' && (
            <svg width="14" height="14" fill="none" stroke="#4f9c45" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
          {dropStatus === 'error' && (
            <svg width="14" height="14" fill="none" stroke="#ef4444" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          )}
          {dropMsg}
        </div>
      )}
    </div>
  );
}
