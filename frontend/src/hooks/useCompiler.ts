import { useState, useEffect } from 'react';
import { Compile } from '../../bindings/Underleaf/backend/engine/compilerservice.js';

export function useCompiler(debouncedSource: string, projectPath: string) {
  const [pdfData, setPdfData] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");

  const compileAction = async (src: string) => {
    const trimmed = src.trim();
    if (!trimmed) {
      setPdfData("");
      return;
    }
    // Don't try to compile if \begin{document} block is empty — Tectonic crashes on empty docs
    const bodyMatch = trimmed.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (bodyMatch && !bodyMatch[1].trim()) {
      setPdfData("");
      return;
    }
    // Also skip if source doesn't even contain \documentclass (plain text file, etc.)
    if (!trimmed.includes('\\documentclass') && !trimmed.includes('\\begin{document}')) {
      setPdfData("");
      return;
    }
    setIsCompiling(true);
    setCompileError("");
    try {
      const result = await Compile(src, projectPath);
      setPdfData(result);
    } catch (err: any) {
      setCompileError(err.toString());
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    compileAction(debouncedSource);
  }, [debouncedSource]);

  return { pdfData, isCompiling, compileError, manualCompile: () => compileAction(debouncedSource) };
}
