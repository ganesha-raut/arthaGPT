import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Table2 } from 'lucide-react';
import { db } from '../../../database/db';
import { useCanvasStore } from '../../../store/canvasStore';

interface SpreadsheetRendererProps {
  content: string;
}

export const SpreadsheetRenderer: React.FC<SpreadsheetRendererProps> = ({ content }) => {
  const { activeArtifactId } = useCanvasStore();
  const [grid, setGrid] = useState<string[][]>([]);

  // Parse markdown table into 2D grid array
  useEffect(() => {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|'));

    if (lines.length === 0) {
      // Fallback: Scaffold empty grid
      setGrid([
        ['Header 1', 'Header 2', 'Header 3'],
        ['Row 1 Cell 1', 'Row 1 Cell 2', 'Row 1 Cell 3'],
        ['Row 2 Cell 1', 'Row 2 Cell 2', 'Row 2 Cell 3']
      ]);
      return;
    }

    const parsedRows: string[][] = [];
    lines.forEach((line) => {
      // Exclude markdown separator line (e.g. |---|---|)
      if (line.match(/^[|\s\-:]+$/)) return;

      const cells = line
        .split('|')
        .map((c) => c.trim())
        .slice(1, -1); // remove first and last empty cells from splitting | cell |
      
      parsedRows.push(cells);
    });

    setGrid(parsedRows.length > 0 ? parsedRows : [['Column 1'], ['Value 1']]);
  }, [content]);

  // Synchronize local edits back to Dexie database in markdown format
  const syncToDatabase = async (updatedGrid: string[][]) => {
    if (!activeArtifactId) return;

    // Convert grid back to markdown table string
    const headers = updatedGrid[0] || [];
    const rows = updatedGrid.slice(1);

    const mdHeader = `| ${headers.join(' | ')} |`;
    const mdSeparator = `| ${headers.map(() => '---').join(' | ')} |`;
    const mdRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
    
    const markdownTable = `${mdHeader}\n${mdSeparator}\n${mdRows}`;

    try {
      const artifact = await db.artifacts.get(activeArtifactId);
      if (artifact) {
        // Overwrite active content
        await db.artifacts.update(activeArtifactId, {
          currentContent: markdownTable,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to sync spreadsheet edits', err);
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const nextGrid = grid.map((row, r) => 
      row.map((cell, c) => (r === rowIndex && c === colIndex ? val : cell))
    );
    setGrid(nextGrid);
    syncToDatabase(nextGrid);
  };

  const addRow = () => {
    const columnsCount = grid[0]?.length || 3;
    const newRow = Array(columnsCount).fill('');
    const nextGrid = [...grid, newRow];
    setGrid(nextGrid);
    syncToDatabase(nextGrid);
  };

  const deleteRow = (rowIndex: number) => {
    if (grid.length <= 2) return; // keep header + 1 row
    const nextGrid = grid.filter((_, idx) => idx !== rowIndex);
    setGrid(nextGrid);
    syncToDatabase(nextGrid);
  };

  const addColumn = () => {
    const nextGrid = grid.map((row, idx) => [...row, idx === 0 ? `New Column` : '']);
    setGrid(nextGrid);
    syncToDatabase(nextGrid);
  };

  const deleteColumn = (colIndex: number) => {
    if (grid[0]?.length <= 1) return;
    const nextGrid = grid.map((row) => row.filter((_, idx) => idx !== colIndex));
    setGrid(nextGrid);
    syncToDatabase(nextGrid);
  };

  const handleExportCSV = () => {
    const csvContent = grid.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `astra_spreadsheet.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getColLabel = (index: number) => {
    return String.fromCharCode(65 + (index % 26)); // A, B, C...
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-5 overflow-hidden select-none">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
          <Table2 className="w-4 h-4 text-emerald-450" />
          <span>Interactive Spreadsheet Grid</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={addColumn}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-850 hover:border-zinc-700/60 bg-zinc-900/60 text-zinc-350 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-850 hover:border-zinc-700/60 bg-zinc-900/60 text-zinc-350 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-850 hover:border-zinc-700/60 bg-emerald-555 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto border border-zinc-900 rounded-xl bg-zinc-950/20 scrollbar-thin">
        <table className="w-full text-xs text-zinc-300 border-collapse table-fixed min-w-[600px]">
          
          {/* Table Column Index Header */}
          <thead>
            <tr className="bg-zinc-900/40 border-b border-zinc-850/80">
              <th className="w-10 px-2 py-1.5 border-r border-zinc-900 text-zinc-650 font-mono text-center select-none bg-zinc-900/10">#</th>
              {grid[0]?.map((_, colIndex) => (
                <th key={colIndex} className="px-2 py-1.5 border-r border-zinc-900 text-zinc-500 font-mono text-left relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>{getColLabel(colIndex)}</span>
                    <button
                      onClick={() => deleteColumn(colIndex)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded cursor-pointer transition-opacity"
                      title="Delete Column"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Cells */}
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition-colors group">
                {/* Index col */}
                <td className="px-2 py-1 text-center font-mono text-zinc-600 border-r border-zinc-900 bg-zinc-900/5 select-none relative">
                  {rowIndex === 0 ? 'Header' : rowIndex}
                  {rowIndex > 0 && (
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
                
                {/* Editable Data Inputs */}
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-0 border-r border-zinc-900">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className={`w-full bg-transparent px-3 py-2 text-zinc-300 focus:outline-none focus:bg-zinc-900/60 focus:text-white transition-all select-text ${
                        rowIndex === 0 ? 'font-bold text-zinc-100 bg-zinc-900/20' : ''
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  );
};
