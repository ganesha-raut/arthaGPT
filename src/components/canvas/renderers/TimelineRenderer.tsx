import React, { useState, useEffect } from 'react';
import { GitCommit, Calendar, Activity, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from '../../markdown/MarkdownRenderer';

interface TimelineNode {
  title: string;
  detail: string;
  tag?: string;
}

interface TimelineRendererProps {
  content: string;
}

export const TimelineRenderer: React.FC<TimelineRendererProps> = ({ content }) => {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);

  // Parse lines to construct timeline milestones
  useEffect(() => {
    const lines = content.split('\n');
    const parsedNodes: TimelineNode[] = [];

    lines.forEach((line) => {
      // Matches standard bullet items like: - Phase 1: Research or * Milestone: Scaffolding
      const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
      if (bulletMatch) {
        const itemText = bulletMatch[1].trim();
        const splitIdx = itemText.indexOf(':');

        if (splitIdx > 0) {
          const title = itemText.substring(0, splitIdx).trim();
          const detail = itemText.substring(splitIdx + 1).trim();
          parsedNodes.push({ title, detail });
        } else {
          parsedNodes.push({ title: itemText, detail: '' });
        }
      }
    });

    if (parsedNodes.length === 0 && content.trim()) {
      // Fallback: split by double newline or use general paragraphs
      const blocks = content.split(/\n\n+/g);
      blocks.forEach((block, idx) => {
        const linesOfBlock = block.trim().split('\n');
        if (linesOfBlock.length > 0) {
          const title = linesOfBlock[0].replace(/^#+\s*/, '').trim();
          const detail = linesOfBlock.slice(1).join('\n').trim();
          parsedNodes.push({ title, detail });
        }
      });
    }

    setNodes(parsedNodes.length > 0 ? parsedNodes : [
      { title: 'Phase 1: Project Initiation', detail: 'Gather requirements, outline system specifications and initialize git repositories.' },
      { title: 'Phase 2: Database Scaffolding', detail: 'Setup local Dexie tables, seed settings, and define typings.' },
      { title: 'Phase 3: Front-End Core', detail: 'Write Zustand store hooks and connect sidebar layout resize actions.' }
    ]);
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-6 overflow-hidden select-none">
      
      {/* Title Header */}
      <div className="pb-3 border-b border-zinc-900 mb-6 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
          <Activity className="w-4.5 h-4.5 text-emerald-450" />
          <span>Visual Timeline Roadmap</span>
        </span>
      </div>

      {/* Nodes Timeline list */}
      <div className="flex-1 overflow-y-auto pr-1.5 scrollbar-thin select-text">
        <div className="relative border-l border-zinc-800 ml-4 py-2 space-y-6">
          
          {nodes.map((node, idx) => (
            <div key={idx} className="relative pl-7 group">
              {/* Vertical connecting line indicator node */}
              <div className="absolute left-[-9.5px] top-1.5 w-[18px] h-[18px] rounded-full border-2 border-zinc-900 bg-zinc-950 flex items-center justify-center transition-all group-hover:border-emerald-500 group-hover:bg-emerald-555 shadow">
                <GitCommit className="w-2.5 h-2.5 text-zinc-650 group-hover:text-black transition-colors" />
              </div>

              {/* Node Card */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all hover:shadow hover:bg-zinc-900/70">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-zinc-550 select-none">STEP {idx + 1}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-650" />
                  <h4 className="font-bold text-sm text-zinc-200 group-hover:text-zinc-100 transition-colors">
                    {node.title}
                  </h4>
                </div>
                
                {node.detail ? (
                  <p className="text-xs text-zinc-450 leading-relaxed pl-0.5">
                    {node.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}

        </div>
      </div>

    </div>
  );
};
