import React, { useEffect, useRef, useState } from 'react';
  import mermaid from 'mermaid';
  
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Outfit, system-ui, sans-serif',
    themeVariables: {
      background: '#18181b', // zinc-900
      primaryColor: '#3f3f46',
      primaryTextColor: '#f4f4f5',
      lineColor: '#52525b',
    }
  });
  
  interface MermaidProps {
    chart: string;
  }
  
  export const MermaidRenderer: React.FC<MermaidProps> = ({ chart }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  
    useEffect(() => {
      const renderChart = async () => {
        try {
          setError(null);
          setSvg('');
  
          // Use mermaid.render to generate the SVG
          const { svg: svgCode } = await mermaid.render(idRef.current, chart);
          setSvg(svgCode);
        } catch (err: any) {
          console.error('Mermaid render error:', err);
          setError(err.message || 'Failed to render Mermaid diagram');
          
          // Clean up bad mermaid nodes
          const badElement = document.getElementById(idRef.current);
          if (badElement) {
            badElement.remove();
          }
        }
      };
  
      if (chart) {
        renderChart();
      }
    }, [chart]);
  
    if (error) {
      return (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-sm font-mono my-3 overflow-auto">
          <div className="font-semibold mb-1 text-red-300">Mermaid Syntax Error:</div>
          <pre className="whitespace-pre-wrap">{chart}</pre>
        </div>
      );
    }
  
    if (!svg) {
      return (
        <div className="flex items-center justify-center p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-xl my-3 animate-pulse text-zinc-400 text-sm">
          Rendering chart...
        </div>
      );
    }
  
    return (
      <div 
        className="flex items-center justify-center p-6 bg-zinc-900/20 border border-zinc-800/40 rounded-xl my-4 overflow-auto shadow-inner"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    );
  };
