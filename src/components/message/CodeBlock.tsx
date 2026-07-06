import React, { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  children: React.ReactNode;
  rawCode: string;
}

// Global cache to preserve collapsed/expanded state of code blocks across renders and scrolls
const collapsedStateCache = new Map<string, boolean>();

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'plaintext', children, rawCode }) => {

  const [copied, setCopied] = useState(false);

  const lines = rawCode.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const showCollapse = lines.length > 25;
  const cacheKey = `${rawCode.substring(0, 150)}_${lines.length}`;

  const [collapsed, setCollapsed] = useState(() => {
    // If we already have a cached collapse state for this code block, restore it
    if (collapsedStateCache.has(cacheKey)) {
      return collapsedStateCache.get(cacheKey)!;
    }
    // Default: auto-collapse if code is longer than 25 lines
    return showCollapse;
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleToggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    collapsedStateCache.set(cacheKey, nextState);
  };

  return (
    <div className="my-4 border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-950/90 shadow-xl max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800/50 text-xs font-mono text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-450 lowercase text-[11px] bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-800/40 tracking-wider">{language}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-zinc-800 font-sans"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          {showCollapse && (
            <button
              onClick={handleToggleCollapse}
              className="flex items-center gap-1 hover:text-zinc-200 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-zinc-800 border-l border-zinc-800 pl-3 font-sans"
            >
              {collapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expand ({lines.length} lines)</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Area */}
      <div className={`overflow-x-auto relative ${collapsed && showCollapse ? 'max-h-40 overflow-hidden' : ''}`}>
        <div className="flex font-mono leading-relaxed p-2 sm:p-4 bg-zinc-950/50">
          {/* Line Numbers */}
          <div className="text-zinc-650 select-none text-right pr-2 sm:pr-4 border-r border-zinc-900/60 mr-2 sm:mr-4 min-w-[1.8rem] sm:min-w-[2.2rem] text-[10px] sm:text-xs pt-[3px]">
            {lines.map((_, i) => (
              <div key={i} className="h-6">{i + 1}</div>
            ))}
          </div>
          {/* Highlighted Code */}
          <div className="flex-1 overflow-x-auto text-zinc-200 pt-[2px] text-[11px] sm:text-sm font-mono whitespace-pre scrollbar-thin">
            {children}
          </div>
        </div>
        
        {collapsed && showCollapse && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none flex items-end justify-center pb-2">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Code Collapsed
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
