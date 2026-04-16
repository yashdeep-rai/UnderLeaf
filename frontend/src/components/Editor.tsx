import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
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
    paddingTop: "10px",
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
  ".cm-selectionMatch": {
    backgroundColor: "#e2e8f0",
  },
}, { dark: false });

const underleafHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#2563eb", fontWeight: "bold" }, // \commands
  { tag: t.atom, color: "#7c3aed" },                         // arguments
  { tag: t.string, color: "#059669" },                        // environment names
  { tag: t.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: t.bracket, color: "#64748b" },
  { tag: t.number, color: "#d97706" },
  { tag: t.meta, color: "#475569" },
  { tag: t.heading, color: "#1e293b", fontWeight: "700" },
]);

// LaTeX (stex) language mode
const latexLanguage = StreamLanguage.define(stex);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  projectPath: string;
}

export function Editor({ value, onChange, projectPath }: EditorProps) {
  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-white">
      <CodeMirror
        value={value}
        height="100%"
        className="h-full"
        theme="light"
        extensions={[
          latexLanguage,
          syntaxHighlighting(underleafHighlight),
          underleafTheme,
          EditorView.lineWrapping,
          mathDecorationsPlugin,
          latexAutocomplete(() => projectPath),
        ]}
        onChange={(val) => onChange(val)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: false,    // Fix for pasting interference
          autocompletion: false,   // Handled by our extension
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true,
        }}
      />
    </div>
  );
}
