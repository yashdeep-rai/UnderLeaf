import { useState, useEffect } from 'react';
import { Compile } from '../../bindings/Underleaf/backend/engine/compilerservice.js';

export function useCompiler(debouncedSource: string) {
  const [pdfData, setPdfData] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");

  const compileAction = async (src: string) => {
    if (!src.trim()) {
      setPdfData("");
      return;
    }
    setIsCompiling(true);
    setCompileError("");
    try {
      const result = await Compile(src);
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
