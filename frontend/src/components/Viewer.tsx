import React, { useEffect, useState } from 'react';

interface ViewerProps {
  pdfData: string; // Base64 encoded PDF or empty string
  isCompiling?: boolean;
}

export function Viewer({ pdfData, isCompiling }: ViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    if (!pdfData) {
      setBlobUrl("");
      return;
    }
    
    try {
      // Decode base64 to Blob to avoid WebView2 iframe data: URI size limits entirely
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to create PDF blob:", e);
    }
  }, [pdfData]);

  return (
    <div className="flex-1 w-full h-full bg-gray-800 flex items-center justify-center">
      {blobUrl ? (
        <iframe
          src={blobUrl}
          className={`w-full h-full border-0 transition-opacity duration-300 ${isCompiling ? 'opacity-50' : 'opacity-100'}`}
          title="PDF Viewer"
        />
      ) : (
        <div className="text-gray-500 flex flex-col items-center">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p>LaTeX document renders here</p>
        </div>
      )}
    </div>
  );
}
