import React from 'react';

interface ViewerProps {
  pdfData: string; // Base64 encoded PDF or empty string
}

export function Viewer({ pdfData }: ViewerProps) {
  return (
    <div className="flex-1 w-full h-full bg-gray-800 flex items-center justify-center">
      {pdfData ? (
        <iframe
          src={`data:application/pdf;base64,${pdfData}`}
          className="w-full h-full border-0"
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
