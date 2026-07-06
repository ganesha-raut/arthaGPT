import React, { useState, useEffect } from 'react';
import { X, Play, RefreshCw, Code, Eye, Copy, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const CodeSandboxModal: React.FC = () => {
  const { activeSandboxCode, setSandboxCode } = useChatStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (activeSandboxCode) {
      setActiveTab('preview');
    }
  }, [activeSandboxCode]);

  if (!activeSandboxCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSandboxCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReload = () => {
    setIframeKey(k => k + 1);
  };

  // Build sandboxed srcDoc
  // If the code is just pure JavaScript, wrap it in a clean script tag and render logs on page
  // If the code is SVG, render it centered
  let srcDoc = activeSandboxCode;
  const trimmed = activeSandboxCode.trim();
  
  // CRITICAL: If the code is already a complete HTML document, use it directly — do NOT double-wrap!
  const isCompleteHTML = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
  
  const isSvg = !isCompleteHTML && (trimmed.startsWith('<svg') || trimmed.includes('xmlns="http://www.w3.org/2000/svg"'));
  const isReact = !isCompleteHTML && (activeSandboxCode.includes('React') || activeSandboxCode.includes('import ') || activeSandboxCode.includes('export default') || activeSandboxCode.includes('useState') || activeSandboxCode.includes('className='));
  const isJs = !isCompleteHTML && !isReact && !activeSandboxCode.includes('<html') && !activeSandboxCode.includes('<body>') && !activeSandboxCode.includes('<div>') && (activeSandboxCode.includes('console.log') || activeSandboxCode.includes('function ') || activeSandboxCode.includes('const ') || activeSandboxCode.includes('let '));

  if (isCompleteHTML) {
    // Already a full HTML page (e.g. from combined project merger) — use as-is
    srcDoc = activeSandboxCode;
  } else if (isSvg) {
    srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #0e0e11;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              overflow: hidden;
            }
            svg {
              max-width: 90%;
              max-height: 90vh;
              filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
            }
          </style>
        </head>
        <body>
          ${activeSandboxCode}
        </body>
      </html>
    `;
  } else if (isReact) {
    // Clean up code to run inside UMD script
    let cleanCode = activeSandboxCode
      // Remove ESM imports
      .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
      // Remove exports
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+const\s+/g, 'const ')
      .replace(/export\s+class\s+/g, 'class ')
      .replace(/export\s+interface\s+[\s\S]*?\{[\s\S]*?\}/g, '')
      .replace(/export\s+type\s+[\s\S]*?;/g, '')
      .trim();

    // Setup React ReactDOM render target
    const mountScript = `
      const components = [];
      const matches = cleanCode.match(/(?:const|function|class)\\s+([A-Z][a-zA-Z0-9_]*)/g);
      let targetComponent = null;
      if (matches) {
        const names = matches.map(m => m.replace(/(?:const|function|class)\\s+/, '').trim());
        targetComponent = names.find(n => n === 'App' || n === 'Login' || n === 'LoginPage') || names[0];
      }
      
      if (targetComponent) {
        const Target = window[targetComponent] || eval(targetComponent);
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Target));
      } else {
        document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;">Could not identify React component to mount. Ensure you declare at least one Component (e.g. const App = () => ...).</div>';
      }
    `;

    srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/lucide@latest"></script>
          <style>
            body {
              margin: 0;
              background-color: #0b0b0f;
              color: #f4f4f5;
              font-family: system-ui, -apple-system, sans-serif;
            }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
          </style>
        </head>
        <body>
          <div id="root" class="min-h-screen"></div>
          
          <script type="text/babel">
            const { useState, useEffect, useRef, useMemo, useCallback } = React;
            
            try {
              ${cleanCode}
              
              ${mountScript}
            } catch (err) {
              document.getElementById('root').innerHTML = \`
                <div style="color:#f87171; background:#7f1d1d/20; border:1px solid #991b1b; padding:20px; border-radius:12px; font-family:monospace; margin:20px; font-size:13px; line-height:1.6;">
                  <b style="font-size:14px; display:block; margin-bottom:8px;">❌ React Sandbox Compile Error:</b>
                  \${err.message}
                </div>
              \`;
            }
          </script>
        </body>
      </html>
    `;
  } else if (isJs && !activeSandboxCode.includes('<script')) {
    srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background-color: #0e0e11;
              color: #a7f3d0;
              font-family: monospace;
              font-size: 14px;
              line-height: 1.6;
            }
            #console {
              background: #09090b;
              border: 1px border #1f2937;
              border-radius: 8px;
              padding: 15px;
              box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
            }
            .log-line {
              border-bottom: 1px solid #1f2937;
              padding: 4px 0;
            }
            .log-error { color: #f87171; }
            .header { color: #60a5fa; margin-bottom: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">Console Sandbox Output:</div>
          <div id="console"></div>
          <script>
            const consoleDiv = document.getElementById('console');
            const originalLog = console.log;
            const originalError = console.error;

            const appendLog = (msg, isError = false) => {
              const el = document.createElement('div');
              el.className = 'log-line ' + (isError ? 'log-error' : '');
              el.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
              consoleDiv.appendChild(el);
            };

            console.log = (...args) => {
              args.forEach(arg => appendLog(arg));
              originalLog.apply(console, args);
            };

            console.error = (...args) => {
              args.forEach(arg => appendLog(arg, true));
              originalError.apply(console, args);
            };

            window.onerror = (message, source, lineno, colno, error) => {
              appendLog(message + " (line " + lineno + ")", true);
              return false;
            };
          </script>
          <script>
            try {
              ${activeSandboxCode}
            } catch(e) {
              console.error(e.message);
            }
          </script>
        </body>
      </html>
    `;
  } else if (!activeSandboxCode.includes('<html')) {
    // Wrap plain CSS or components in simple structure
    srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body {
              margin: 0;
              background-color: #0e0e11;
              color: #f4f4f5;
              font-family: system-ui, sans-serif;
            }
          </style>
        </head>
        <body class="p-6">
          ${activeSandboxCode}
        </body>
      </html>
    `;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-text">
      <div className="w-full h-full max-w-6xl max-h-[85vh] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-zinc-900 select-none bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="w-5.5 h-5.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Play className="w-3 h-3 text-emerald-450 fill-current" />
            </div>
            <span className="text-xs font-bold text-zinc-200">Astra Sandbox Code Runner</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Tabs */}
            <div className="hidden md:flex bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-850">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  activeTab === 'preview' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
              <button 
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                  activeTab === 'code' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Source Code</span>
              </button>
            </div>

            <button 
              onClick={handleReload}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
              title="Reload sandbox preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setSandboxCode(null)} 
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex border-b border-zinc-900 select-none bg-zinc-900/20">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'preview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-550'
            }`}
          >
            Preview
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 cursor-pointer transition-colors ${
              activeTab === 'code' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-550'
            }`}
          >
            Source Code
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Split View (Desktop default is split side-by-side, but switchable) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 h-full">
            
            {/* Code Panel */}
            <div className={`h-full flex flex-col border-r border-zinc-900/60 bg-zinc-950 ${
              activeTab === 'code' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-900/40 bg-zinc-900/10 select-none">
                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Source File</span>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-450 hover:text-zinc-200 font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <textarea 
                readOnly
                value={activeSandboxCode}
                className="flex-1 p-4 bg-zinc-950 text-zinc-300 font-mono text-xs leading-relaxed outline-none resize-none border-0 overflow-y-auto scrollbar-thin select-all"
              />
            </div>

            {/* Preview Frame Panel */}
            <div className={`h-full flex flex-col bg-zinc-900/10 ${
              activeTab === 'preview' ? 'flex' : 'hidden md:flex'
            }`}>
              <div className="px-4 py-2 border-b border-zinc-900/40 bg-zinc-900/10 select-none">
                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">Render Output</span>
              </div>
              <div className="flex-1 bg-[#0e0e11] relative">
                <iframe 
                  key={iframeKey}
                  title="Astra Code Preview Sandbox"
                  srcDoc={srcDoc}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0 bg-transparent"
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
