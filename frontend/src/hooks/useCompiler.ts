import { useState, useEffect, useRef } from 'react';
import { Compile } from '../../bindings/Underleaf/backend/engine/compilerservice.js';

export function useCompiler(activeFilePath: string, debouncedSource: string, isAutoCompile: boolean) {
  const [pdfData, setPdfData] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");
  const [compileWarnings, setCompileWarnings] = useState<string>("");
  const [fullLog, setFullLog] = useState<string>("");
  const [missingPackage, setMissingPackage] = useState<string>("");

  // Keep a ref to the last fullLog so we can show it while the next compile runs
  const prevLogRef = useRef<string>("");

  // Clear all state when active file changes
  useEffect(() => {
    setPdfData("");
    setCompileError("");
    setCompileWarnings("");
    setFullLog("");
    setMissingPackage("");
    prevLogRef.current = "";
  }, [activeFilePath]);

  const compileAction = async (filePath: string) => {
    if (!filePath) return;

    setIsCompiling(true);
    setCompileError("");
    setCompileWarnings("");
    setMissingPackage("");

    try {
      const result = await Compile(filePath);
      
      if (result) {
        const log = result.fullLog || "";
        setFullLog(log);
        prevLogRef.current = log;

        setMissingPackage(result.missingPackage || "");
        
        const warnings = (result.warnings || []).join("\n\n");
        setCompileWarnings(warnings);

        if (result.pdfData) {
          setPdfData(result.pdfData);
        }

        if (result.errors && result.errors.length > 0) {
          setCompileError(result.errors.join("\n\n"));
        } else {
          setCompileError("");
        }
      }
    } catch (err: any) {
      setCompileError(err.toString());
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (isAutoCompile && debouncedSource && activeFilePath) {
      const timer = setTimeout(() => {
        compileAction(activeFilePath);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [debouncedSource, activeFilePath, isAutoCompile]);

  return { 
    pdfData, 
    isCompiling, 
    compileError,
    compileWarnings,
    fullLog,
    prevLog: prevLogRef.current,
    missingPackage,
    manualCompile: () => compileAction(activeFilePath),
  };
}
