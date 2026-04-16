import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-gray-900 border-r border-gray-700">
      <CodeMirror
        value={value}
        height="100%"
        className="h-full text-lg"
        theme="dark"
        extensions={[markdown({ base: markdownLanguage })]}
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
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightSelectionMatches: true,
        }}
      />
    </div>
  );
}
