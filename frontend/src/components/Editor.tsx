import React, { useRef, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { mathDecorationsPlugin } from '../extensions/mathPreview';
import { latexAutocomplete } from '../extensions/latexAutocomplete';

// ─── Professional Underleaf Light Theme ────────────────────────────────────────

const underleafTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "15px",
    backgroundColor: "#ffffff",
  },
  ".cm-content": {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    padding: "10px 0",
    minHeight: "100%",
    whiteSpace: "pre-wrap !important", // Force pre-wrap to prevent collapsing
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
    borderRight: "1px solid #e2e8f0",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#eff6ff",
    color: "#3b82f6",
  },
  ".cm-activeLine": {
    backgroundColor: "#f1f5f933",
  },
}, { dark: false });

const underleafHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#2563eb", fontWeight: "bold" },
  { tag: t.atom, color: "#7c3aed" },
  { tag: t.string, color: "#059669" },
  { tag: t.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: t.heading, color: "#1e293b", fontWeight: "700" },
]);

const latexLanguage = StreamLanguage.define(stex);

// ─── Robust Paste Extension ────────────────────────────────────────────────────

/**
 * Transaction filter that ensures any paste operation preserves newlines 
 * and normalizes carriage returns.
 */
const robustPasteFilter = EditorState.transactionFilter.of(tr => {
  if (tr.isUserEvent('input.paste')) {
    // If the transaction is introducing multiple lines but they are being collapsed
    // or if we just want to ensure normalization.
    let changed = false;
    const newChanges = tr.changes.map((fromA, toA, fromB, toB, text) => {
      // Normalize each chunk of text being inserted
      const joined = text.toString();
      const normalized = joined.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (normalized !== joined) {
        changed = true;
        return normalized.split('\n');
      }
      return text;
    });

    if (changed) {
      return { 
        changes: newChanges,
        sequential: true 
      };
    }
  }
  return tr;
});

/**
 * DOM Event Handler to force plain-text paste.
 * Prevents "collapsing" that happens when pasting HTML from markdown previews.
 */
const plainTextPasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      event.preventDefault();
      // Normalize newlines before insertion
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const transaction = view.state.update({
        changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: normalized },
        userEvent: 'input.paste'
      });
      view.dispatch(transaction);
      return true;
    }
    return false;
  }
});

// ─── Component ────────────────────────────────────────────────────────────────

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  projectPath: string;
  activeFilePath: string;
}

export function Editor({ value, onChange, projectPath, activeFilePath }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const lastPath = useRef(activeFilePath);

  useEffect(() => {
    if (activeFilePath !== lastPath.current && editorRef.current?.view) {
      const view = editorRef.current.view;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      });
      lastPath.current = activeFilePath;
    }
  }, [activeFilePath, value]);

  return (
    <div className="flex-1 w-full h-full bg-white relative">
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
          robustPasteFilter,
          plainTextPasteHandler,
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
    </div>
  );
}
