import React, { useState, useEffect } from 'react';
import { 
  X, MonitorPlay, Code2, History, GitPullRequest, 
  Maximize2, Minimize2, Download, Copy, Check
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';
import { Artifact } from '../../types';
import { WebsiteRenderer } from './renderers/WebsiteRenderer';
import { PresentationRenderer } from './renderers/PresentationRenderer';
import { SpreadsheetRenderer } from './renderers/SpreadsheetRenderer';
import { ChecklistRenderer } from './renderers/ChecklistRenderer';
import { TimelineRenderer } from './renderers/TimelineRenderer';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';

export const Canvas: React.FC = () => {
  const {
    activeArtifactId,
    canvasWidth,
    setCanvasWidth,
    activeTab,
    setActiveTab,
    selectedVersion,
    setSelectedVersion,
    closeCanvas
  } = useCanvasStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load the active artifact from Dexie DB
  const artifact = useLiveQuery<Artifact | undefined>(() => 
    activeArtifactId ? db.artifacts.get(activeArtifactId) : Promise.resolve(undefined),
    [activeArtifactId]
  );

  // Get active text content based on whether a historical version is selected
  const getActiveContent = () => {
    if (!artifact) return '';
    if (selectedVersion !== null) {
      const versionEntry = artifact.history.find((h) => h.version === selectedVersion);
      return versionEntry?.content || artifact.currentContent;
    }
    return artifact.currentContent;
  };

  const activeContent = getActiveContent();

  // Reset selected version if artifact changes
  useEffect(() => {
    setSelectedVersion(null);
  }, [activeArtifactId, setSelectedVersion]);

  if (!activeArtifactId || !artifact) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    let extension = 'txt';
    let fileContent = activeContent;

    if (artifact.type === 'website') {
      extension = 'html';
    } else if (artifact.type === 'spreadsheet') {
      extension = 'csv';
      // If spreadsheet, CSV is better than markdown
      if (activeContent.startsWith('|')) {
        const rows = activeContent
          .split('\n')
          .filter(l => l.startsWith('|') && !l.match(/^[|\s\-:]+$/))
          .map(l => l.split('|').map(c => c.trim()).slice(1, -1).map(c => `"${c.replace(/"/g, '""')}"`).join(','));
        fileContent = rows.join('\n');
      }
    } else if (artifact.type === 'checklist' || artifact.type === 'document' || artifact.type === 'roadmap' || artifact.type === 'mindmap') {
      extension = 'md';
    }

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/\s+/g, '_').toLowerCase()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreVersion = async (version: number) => {
    const versionEntry = artifact.history.find((h) => h.version === version);
    if (versionEntry && confirm(`Restore conversation workspace to version ${version}?`)) {
      await db.artifacts.update(artifact.id, {
        currentContent: versionEntry.content,
        currentVersion: version,
        updatedAt: Date.now()
      });
      setSelectedVersion(null);
      setActiveTab('preview');
    }
  };

  // Generate visual code line differences
  const renderDiff = () => {
    const activeVersionNum = selectedVersion !== null ? selectedVersion : artifact.currentVersion;
    const prevVersionNum = activeVersionNum - 1;
    
    if (prevVersionNum < 1) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm select-none">
          No previous version to compare. This is Version 1.
        </div>
      );
    }

    const prevContent = artifact.history.find((h) => h.version === prevVersionNum)?.content || '';
    
    // Quick diff calculator: split lines and render side-by-side
    const currentLines = activeContent.split('\n');
    const prevLines = prevContent.split('\n');

    return (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-900 bg-zinc-950 font-mono text-xs p-4 select-text">
        {/* Left: Previous Version */}
        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
          <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-2 select-none border-b border-zinc-900 pb-1">
            Version {prevVersionNum} (Before)
          </div>
          <pre className="text-red-400 bg-red-950/5 p-3 rounded-lg border border-red-950/20 whitespace-pre">
            {prevLines.map((line, i) => (
              <div key={i} className="line-item hover:bg-red-950/20 px-2 py-0.5 rounded">
                <span className="text-red-650 mr-3 select-none">{i + 1}</span>
                - {line}
              </div>
            ))}
          </pre>
        </div>

        {/* Right: Current/Selected Version */}
        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
          <div className="text-[10px] text-zinc-500 uppercase font-semibold mb-2 select-none border-b border-zinc-900 pb-1">
            Version {activeVersionNum} (After)
          </div>
          <pre className="text-emerald-450 bg-emerald-950/5 p-3 rounded-lg border border-emerald-950/20 whitespace-pre">
            {currentLines.map((line, i) => (
              <div key={i} className="line-item hover:bg-emerald-950/20 px-2 py-0.5 rounded">
                <span className="text-emerald-700 mr-3 select-none">{i + 1}</span>
                + {line}
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  const activeVersionDisplay = selectedVersion !== null ? selectedVersion : artifact.currentVersion;

  return (
    <div 
      className={`h-full flex-shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-900/60 relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 w-full' : ''
      }`}
      style={{ width: isFullscreen ? '100%' : `${canvasWidth}px` }}
    >
      
      {/* Header Bar */}
      <div className="h-14 px-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0 select-none">
        
        {/* Left title info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-200 truncate max-w-[150px] sm:max-w-xs">{artifact.title}</span>
            <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Type: <b className="capitalize text-zinc-400">{artifact.type}</b> • v{activeVersionDisplay}
            </span>
          </div>
        </div>

        {/* Middle View Tabs Selector */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-850 p-0.5 rounded-xl">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'preview' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'code' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>
          
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'diff' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diff</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'history' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>

        {/* Right window actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Copy artifact content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-450" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={closeCanvas}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-red-400 cursor-pointer border border-zinc-900 bg-zinc-950/20"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Tab Views Body */}
      <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
        
        {/* Preview Tab View */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-hidden h-full">
            {artifact.type === 'website' && <WebsiteRenderer code={activeContent} />}
            {artifact.type === 'presentation' && <PresentationRenderer content={activeContent} />}
            {artifact.type === 'spreadsheet' && <SpreadsheetRenderer content={activeContent} />}
            {artifact.type === 'checklist' && <ChecklistRenderer content={activeContent} />}
            {(artifact.type === 'roadmap' || artifact.type === 'mindmap') && <TimelineRenderer content={activeContent} />}
            {artifact.type === 'document' && (
              <div className="p-6 overflow-y-auto h-full scrollbar-thin select-text bg-zinc-950/20">
                <MarkdownRenderer content={activeContent} />
              </div>
            )}
            {artifact.type === 'code_project' && (
              <div className="p-6 overflow-y-auto h-full scrollbar-thin select-text bg-zinc-950/20 font-mono text-sm leading-relaxed whitespace-pre">
                {activeContent}
              </div>
            )}
          </div>
        )}

        {/* Code Tab View */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-auto p-4 select-text font-mono text-sm leading-relaxed scrollbar-thin bg-zinc-950/30">
            <pre className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl max-w-full text-zinc-300">
              <code>{activeContent}</code>
            </pre>
          </div>
        )}

        {/* Diff Comparison Tab View */}
        {activeTab === 'diff' && renderDiff()}

        {/* Versions Timeline Tab View */}
        {activeTab === 'history' && (
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
            <h4 className="text-sm font-bold text-zinc-200 mb-4 border-b border-zinc-900 pb-2">Version Timeline</h4>
            <div className="space-y-4 max-w-md">
              {artifact.history.map((h) => {
                const isActive = (selectedVersion === null && h.version === artifact.currentVersion) || selectedVersion === h.version;
                return (
                  <div
                    key={h.version}
                    className={`flex items-start justify-between p-4 border rounded-xl transition-all ${
                      isActive 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-200' 
                        : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">Version {h.version}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">
                        {new Date(h.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedVersion(selectedVersion === h.version ? null : h.version)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
                          selectedVersion === h.version 
                            ? 'bg-zinc-800 border-zinc-700 text-white' 
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {selectedVersion === h.version ? 'Deselect' : 'View'}
                      </button>
                      <button
                        onClick={() => handleRestoreVersion(h.version)}
                        disabled={h.version === artifact.currentVersion}
                        className="px-2.5 py-1 bg-emerald-555 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-md text-xs font-semibold cursor-pointer disabled:pointer-events-none transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Resize handle (only shows when not fullscreen) */}
      {!isFullscreen && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = canvasWidth;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = startX - moveEvent.clientX;
              const nextWidth = startWidth + deltaX;
              if (nextWidth > 320 && nextWidth < window.innerWidth - 320) {
                setCanvasWidth(nextWidth);
              }
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          className="w-[3px] hover:w-[6px] absolute left-0 top-0 bottom-0 cursor-col-resize hover:bg-emerald-500/50 bg-transparent transition-all select-none"
        />
      )}

    </div>
  );
};
