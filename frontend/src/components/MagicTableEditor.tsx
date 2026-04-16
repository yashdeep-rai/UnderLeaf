import React, { useState, useEffect } from 'react';

interface TableData {
  alignments: string;       // e.g., "|c|c|c|"
  rows: string[][];         // 2D grid
  hlines: boolean[];        // hlines[i] = true means an \hline comes AFTER row i. hlines[-1] (index 0 for internal) could mean before row 0.
}

interface MagicTableEditorProps {
  initialSource: string;
  onSave: (newSource: string) => void;
  onCancel: () => void;
}

export function MagicTableEditor({ initialSource, onSave, onCancel }: MagicTableEditorProps) {
  const [alignments, setAlignments] = useState<string>("c");
  const [rows, setRows] = useState<string[][]>([[""]]);

  useEffect(() => {
    // Parse the LaTeX table
    try {
      const beginMatch = initialSource.match(/\\begin\{tabular\}\{(.*?)\}/);
      if (beginMatch) setAlignments(beginMatch[1]);
      else setAlignments("c");

      // Extract body
      let body = initialSource.replace(/\\begin\{tabular\}\{.*?\}/, '');
      body = body.replace(/\\end\{tabular\}/, '');

      // Quick parsing
      const hlinesRemoved = body.replace(/\\hline/g, ''); // For MVP, we strip hlines and just manage grid
      
      const rawRows = hlinesRemoved.split('\\\\')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      if (rawRows.length > 0) {
        const grid = rawRows.map(row => row.split('&').map(cell => cell.trim()));
        setRows(grid);
      } else {
        setRows([[""]]);
      }
    } catch(err) {
      console.error("Failed to parse table", err);
    }
  }, [initialSource]);

  const handleCellChange = (r: number, c: number, val: string) => {
    const newRows = [...rows];
    // Ensure row exists
    if (!newRows[r]) newRows[r] = [];
    newRows[r][c] = val;
    setRows(newRows);
  };

  const addRow = () => {
    const colCount = rows.length > 0 ? rows[0].length : 1;
    setRows([...rows, Array(colCount).fill("")]);
  };

  const addCol = () => {
    const newRows = rows.map(r => [...r, ""]);
    setRows(newRows);
    setAlignments(alignments + "c");
  };

  const deleteRow = (rIndex: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rIndex));
  };

  const deleteCol = (cIndex: number) => {
    if (rows[0].length <= 1) return;
    setRows(rows.map(r => r.filter((_, i) => i !== cIndex)));
    // Approximating alignment update
    let cleanAlign = alignments.replace(/[^clr]/g, '');
    if (cleanAlign.length > cIndex) {
        const arr = cleanAlign.split('');
        arr.splice(cIndex, 1);
        setAlignments(arr.join('|'));
    }
  };

  const handleSave = () => {
    // Determine max physical widths for padding
    const colWidths: number[] = [];
    const colCount = rows[0]?.length || 0;
    
    for (let c = 0; c < colCount; c++) {
      let maxW = 0;
      for (let r = 0; r < rows.length; r++) {
        const w = (rows[r][c] || "").length;
        if (w > maxW) maxW = w;
      }
      colWidths[c] = maxW;
    }

    // Build latex string
    let out = `\\begin{tabular}{${alignments}}\n`;
    out += `\\hline\n`;

    for (let r = 0; r < rows.length; r++) {
      const paddedCells = rows[r].map((cell, c) => {
        const val = cell || "";
        return val.padEnd(colWidths[c], ' ');
      });
      out += `  ${paddedCells.join(' & ')} \\\\\n`;
      // For MVP, add hline after header row and bottom row
      if (r === 0 || r === rows.length - 1) {
        out += `\\hline\n`;
      }
    }
    
    out += `\\end{tabular}`;
    onSave(out);
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '24px', borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', width: '80%', maxWidth: '900px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🪄</span> Magic Table Editor
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Alignments:</span>
            <input 
              value={alignments} 
              onChange={e => setAlignments(e.target.value)}
              style={{ padding: '6px', width: '100px', fontSize: '14px', fontFamily: 'monospace', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
            <tbody>
              {rows.map((row, rIndex) => (
                <tr key={rIndex}>
                  {row.map((cell, cIndex) => (
                    <td key={cIndex} style={{ padding: '4px', border: '1px solid #cbd5e1', background: 'white' }}>
                      <input 
                        type="text"
                        value={cell}
                        onChange={e => handleCellChange(rIndex, cIndex, e.target.value)}
                        style={{ 
                          width: '120px', minWidth: '80px', padding: '8px', 
                          border: 'none', outline: 'none', background: 'transparent',
                          fontFamily: 'monospace', fontSize: '13px'
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ paddingLeft: '8px', border: 'none' }}>
                    <button onClick={() => deleteRow(rIndex)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>x</button>
                  </td>
                </tr>
              ))}
              <tr>
                {rows[0]?.map((_, cIndex) => (
                  <td key={cIndex} style={{ textAlign: 'center', paddingTop: '8px', border: 'none' }}>
                     <button onClick={() => deleteCol(cIndex)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Del Col</button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={addRow} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>+ Add Row</button>
          <button onClick={addCol} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>+ Add Column</button>
          
          <div style={{ flex: 1 }}></div>
          
          <button onClick={onCancel} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 24px', background: 'var(--underleaf-green)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Save to Document</button>
        </div>

      </div>
    </div>
  );
}
