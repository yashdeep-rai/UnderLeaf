import { useState, useEffect } from 'react';
import { Compile } from '../../bindings/Underleaf/backend/engine/compilerservice.js';

export function useCompiler(debouncedSource: string, projectPath: string) {
  const [pdfData, setPdfData] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");

  const compileAction = async (src: string) => {
    const trimmed = src.trim();
    if (!trimmed || !projectPath) return;

    // Safety checks for minimum LaTeX structure
    if (!trimmed.includes('\\documentclass')) {
      return;
    }

    setIsCompiling(true);
    setCompileError("");
    try {
      // Note the order: projectPath first, then content
      const result = await Compile(projectPath, src);
      
      if (result) {
        if (result.success && result.pdfData) {
          // Convert binary PDF data to Base64 for the viewer
          setPdfData(result.pdfData);
          setCompileError("");
        } else if (result.errors && result.errors.length > 0) {
          setCompileError(result.errors.join("\n"));
        }
      }
    } catch (err: any) {
      setCompileError(err.toString());
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (debouncedSource) {
      compileAction(debouncedSource);
    }
  }, [debouncedSource, projectPath]);

  return { 
    pdfData, 
    isCompiling, 
    compileError, 
    manualCompile: () => compileAction(debouncedSource) 
  };
}
