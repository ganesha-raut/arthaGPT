import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from '../message/CodeBlock';
import { MermaidRenderer } from './MermaidRenderer';
import { ChevronRight, ExternalLink, Play } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
}

function extractTextContent(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextContent).join('');
  if (children?.props?.children) return extractTextContent(children.props.children);
  return '';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const setSandboxCode = useChatStore(state => state.setSandboxCode);
  const components = {
    // Code blocks
    pre({ children }: any) {
      return <>{children}</>;
    },

    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const rawCode = extractTextContent(children);

      if (!inline && (match || className)) {
        const language = match ? match[1] : 'plaintext';
        if (language.trim().toLowerCase() === 'mermaid') {
          return <MermaidRenderer chart={rawCode} />;
        }
        return (
          <CodeBlock language={language} rawCode={rawCode}>
            {children}
          </CodeBlock>
        );
      }

      return (
        <code
          className="bg-zinc-900 border border-zinc-800/80 px-1.5 py-0.5 rounded text-rose-400 font-mono text-xs font-semibold"
          {...props}
        >
          {children}
        </code>
      );
    },

    // Tables
    table({ children, ...props }: any) {
      return (
        <div className="overflow-x-auto my-5 border border-violet-500/20 rounded-xl bg-violet-950/10 shadow-lg">
          <table className="w-full text-sm text-left text-zinc-300 border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }: any) {
      return <thead className="text-xs text-violet-300 uppercase bg-violet-900/30 border-b border-violet-700/30" {...props}>{children}</thead>;
    },
    tbody({ children, ...props }: any) {
      return <tbody className="divide-y divide-zinc-800/50" {...props}>{children}</tbody>;
    },
    tr({ children, ...props }: any) {
      return <tr className="hover:bg-violet-900/10 transition-colors" {...props}>{children}</tr>;
    },
    th({ children, ...props }: any) {
      return <th className="px-5 py-3 font-semibold text-violet-200" {...props}>{children}</th>;
    },
    td({ children, ...props }: any) {
      return <td className="px-5 py-3 text-zinc-300" {...props}>{children}</td>;
    },

    // Lists — styled as colorful cards
    ul({ children, ...props }: any) {
      const hasTask = React.Children.toArray(children).some((child: any) => {
        const itemChildren = child?.props?.children;
        if (!itemChildren) return false;
        return React.Children.toArray(itemChildren).some((c: any) => c?.props?.type === 'checkbox');
      });

      if (hasTask) {
        return <ul className="space-y-2.5 my-3" {...props}>{children}</ul>;
      }

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          {children}
        </div>
      );
    },
    ol({ children, ...props }: any) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 font-sans" {...props}>
          {React.Children.map(children, (child: any, idx: number) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child, { 'data-index': idx + 1 } as any);
          })}
        </div>
      );
    },
    li({ children, ...props }: any) {
      const hasCheckbox = React.Children.toArray(children).some((c: any) => c?.props?.type === 'checkbox');
      if (hasCheckbox) {
        return <li className="flex items-center gap-1 my-1.5" {...props}>{children}</li>;
      }

      const indexLabel = props['data-index'] || null;
      // Cycle through colorful accents
      const colors = [
        'border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-950/20 hover:bg-emerald-950/40',
        'border-violet-500/30 hover:border-violet-400/60 bg-violet-950/20 hover:bg-violet-950/40',
        'border-sky-500/30 hover:border-sky-400/60 bg-sky-950/20 hover:bg-sky-950/40',
        'border-amber-500/30 hover:border-amber-400/60 bg-amber-950/20 hover:bg-amber-950/40',
        'border-pink-500/30 hover:border-pink-400/60 bg-pink-950/20 hover:bg-pink-950/40',
        'border-teal-500/30 hover:border-teal-400/60 bg-teal-950/20 hover:bg-teal-950/40',
      ];
      const iconColors = [
        'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black',
        'bg-violet-500/15 border-violet-500/30 text-violet-400 group-hover:bg-violet-500 group-hover:text-white',
        'bg-sky-500/15 border-sky-500/30 text-sky-400 group-hover:bg-sky-500 group-hover:text-black',
        'bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-black',
        'bg-pink-500/15 border-pink-500/30 text-pink-400 group-hover:bg-pink-500 group-hover:text-white',
        'bg-teal-500/15 border-teal-500/30 text-teal-400 group-hover:bg-teal-500 group-hover:text-black',
      ];
      const idx = ((indexLabel || 1) - 1) % colors.length;

      return (
        <div
          className={`p-4 border rounded-xl flex items-start gap-3 transition-all hover:scale-[1.01] hover:shadow-lg group cursor-pointer duration-200 ${colors[idx]}`}
          {...props}
        >
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${iconColors[idx]}`}>
            {indexLabel
              ? <span className="text-[10px] font-mono font-bold">{indexLabel}</span>
              : <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            }
          </div>
          <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors text-xs sm:text-sm font-medium select-text">
            {children}
          </span>
        </div>
      );
    },

    // Blockquote
    blockquote({ children, ...props }: any) {
      return (
        <blockquote
          className="border-l-4 border-sky-500 bg-sky-950/20 px-4 py-2.5 my-4 rounded-r-xl text-sky-200 italic font-medium"
          {...props}
        >
          {children}
        </blockquote>
      );
    },

    // Headings
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mt-7 mb-3.5 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-tight">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mt-6 mb-3 text-zinc-100 border-b border-violet-800/40 pb-1 tracking-tight">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-semibold mt-5 mb-2.5 text-emerald-300 tracking-tight">{children}</h3>;
    },
    h4({ children }: any) {
      return <h4 className="text-base font-semibold mt-4 mb-2 text-sky-300">{children}</h4>;
    },

    // Paragraph with horizontal scroll container for images
    p({ children }: any) {
      const reactChildren = React.Children.toArray(children);
      const isImageGroup = reactChildren.length > 0 && reactChildren.every((child: any) => {
        if (!child) return true;
        return (
          (child.type && child.type === 'img') || 
          (child.props && child.props.src) ||
          (child.props && child.props.node && child.props.node.tagName === 'img')
        );
      });

      if (isImageGroup) {
        return (
          <div className="flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-thin py-2 select-none scroll-smooth">
            {reactChildren}
          </div>
        );
      }

      return <p className="leading-relaxed mb-4 text-zinc-300 whitespace-pre-wrap">{children}</p>;
    },

    // Custom Image component with inline grid wrapper
    img({ src, alt }: any) {
      return (
        <div className="inline-block flex-shrink-0 w-[260px] sm:w-[320px] rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900/20 shadow-md mr-2 my-2 select-none">
          <img 
            src={src} 
            alt={alt || 'Image'} 
            className="w-full h-[180px] sm:h-[220px] object-cover hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
            loading="lazy"
            onClick={() => {
              window.open(src, '_blank');
            }}
          />
          {alt && alt !== 'Image' && alt !== 'Web Image' && (
            <div className="px-3.5 py-2 border-t border-zinc-900 text-[10px] text-zinc-400 font-medium truncate bg-zinc-950">
              {alt}
            </div>
          )}
        </div>
      );
    },

    // Links
    a({ href, children, ...props }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-900/30 border border-sky-700/40 hover:border-sky-500/60 hover:bg-sky-900/50 text-sky-300 hover:text-sky-100 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-105 my-0.5"
          {...props}
        >
          <span>{children}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      );
    },

    // Horizontal rule
    hr() {
      return <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-violet-600/50 to-transparent" />;
    },

    // Strong / em
    strong({ children }: any) {
      return <strong className="font-bold text-zinc-100">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-violet-300">{children}</em>;
    },

    // Checkboxes
    input({ type, checked, ...props }: any) {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 mr-2 accent-emerald-500 inline-block align-middle cursor-default"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    }
  };

  // Extract all code blocks from content to enable combined sandbox preview
  const codeBlocks: { lang: string; code: string }[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const lang = (codeMatch[1] || 'plaintext').toLowerCase();
    const code = codeMatch[2].trim();
    if (code) codeBlocks.push({ lang, code });
  }

  // Check if there are runnable web code blocks
  const runnableLangs = ['html', 'css', 'javascript', 'js', 'jsx', 'tsx', 'typescript', 'ts', 'svg', 'xml'];
  const hasRunnableCode = codeBlocks.some(b => runnableLangs.includes(b.lang));

  const handlePreviewProject = () => {
    // Merge all code blocks into a single combined HTML document
    const htmlBlocks = codeBlocks.filter(b => b.lang === 'html');
    const cssBlocks = codeBlocks.filter(b => b.lang === 'css');
    const jsBlocks = codeBlocks.filter(b => ['javascript', 'js'].includes(b.lang));
    const reactBlocks = codeBlocks.filter(b => ['jsx', 'tsx', 'typescript', 'ts'].includes(b.lang));
    const svgBlocks = codeBlocks.filter(b => ['svg', 'xml'].includes(b.lang));

    let combined = '';

    if (reactBlocks.length > 0) {
      // Merge all React/TSX blocks
      const allReactCode = reactBlocks.map(b => b.code).join('\n\n');
      // Strip imports & exports
      const cleanCode = allReactCode
        .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s+class\s+/g, 'class ')
        .replace(/export\s+function\s+/g, 'function ')
        .replace(/export\s+interface\s+[\s\S]*?\{[\s\S]*?\}/g, '')
        .replace(/export\s+type\s+[\s\S]*?;/g, '')
        .trim();

      const cssContent = cssBlocks.map(b => b.code).join('\n');

      combined = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>
body { margin:0; background:#0b0b0f; color:#f4f4f5; font-family:system-ui,sans-serif; }
${cssContent}
</style>
</head><body>
<div id="root" class="min-h-screen"></div>
<script type="text/babel">
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;
try {
${cleanCode}

// Auto-mount: find the main component
const _names = [];
${cleanCode.match(/(?:const|function|class)\s+([A-Z][a-zA-Z0-9_]*)/g)?.map(m => {
        const name = m.replace(/(?:const|function|class)\s+/, '').trim();
        return `try { if (typeof ${name} !== 'undefined') _names.push('${name}'); } catch(e) {}`;
      }).join('\n') || ''}
const _target = _names.find(n => n === 'App' || n === 'Login' || n === 'LoginPage' || n === 'Home' || n === 'Main') || _names[0];
if (_target) {
  const _C = eval(_target);
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(_C));
} else {
  document.getElementById('root').innerHTML = '<p style="color:#f87171;padding:20px;">No React component found to render.</p>';
}
} catch(err) {
  document.getElementById('root').innerHTML = '<div style="color:#f87171;background:#1c0a0a;border:1px solid #991b1b;padding:20px;border-radius:12px;margin:20px;font-family:monospace;font-size:13px;"><b>❌ Error:</b> ' + err.message + '</div>';
}
</script></body></html>`;
    } else if (htmlBlocks.length > 0) {
      // Pure HTML project — inject CSS and JS
      let htmlContent = htmlBlocks.map(b => b.code).join('\n');
      const cssContent = cssBlocks.map(b => `<style>${b.code}</style>`).join('\n');
      const jsContent = jsBlocks.map(b => `<script>${b.code}<\/script>`).join('\n');
      
      if (htmlContent.includes('<html') || htmlContent.includes('<!DOCTYPE')) {
        // Full HTML document — inject CSS before </head> and JS before </body>
        if (cssContent) htmlContent = htmlContent.replace('</head>', cssContent + '\n</head>');
        if (jsContent) htmlContent = htmlContent.replace('</body>', jsContent + '\n</body>');
        combined = htmlContent;
      } else {
        // Fragment — wrap in full document
        combined = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
${cssContent}
<style>body{margin:0;background:#0b0b0f;color:#f4f4f5;font-family:system-ui,sans-serif;}</style>
</head><body class="p-6">
${htmlContent}
${jsContent}
</body></html>`;
      }
    } else if (jsBlocks.length > 0) {
      // Pure JS — console sandbox
      combined = jsBlocks.map(b => b.code).join('\n\n');
    } else if (svgBlocks.length > 0) {
      combined = svgBlocks.map(b => b.code).join('\n');
    } else {
      // Fallback: merge all runnable blocks
      combined = codeBlocks.filter(b => runnableLangs.includes(b.lang)).map(b => b.code).join('\n\n');
    }

    if (combined) {
      setSandboxCode(combined);
    }
  };

  return (
    <div className="prose prose-invert prose-zinc max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>

      {/* Combined Preview Project button at bottom of AI response */}
      {hasRunnableCode && (
        <button
          onClick={handlePreviewProject}
          className="mt-4 mb-2 flex items-center gap-2 px-4 py-2.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] select-none shadow-lg shadow-emerald-900/10"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>▶ Preview Project in Sandbox</span>
        </button>
      )}
    </div>
  );
};
