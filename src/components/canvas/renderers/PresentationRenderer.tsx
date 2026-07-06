import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '../../markdown/MarkdownRenderer';

interface PresentationRendererProps {
  content: string;
}

export const PresentationRenderer: React.FC<PresentationRendererProps> = ({ content }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse slides separated by '---' dividers
  const slides = content
    .split(/\n---\n/g)
    .map((slide) => slide.trim())
    .filter((slide) => slide.length > 0);

  useEffect(() => {
    // Reset to first slide if content changes
    setCurrentSlide(0);
    setIsPlaying(false);
  }, [content]);

  // Slideshow Auto-play loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm italic select-none">
        No slides detected. Split slide items using "---" on empty lines.
      </div>
    );
  }

  const activeSlideText = slides[currentSlide];

  return (
    <div className="h-full flex flex-col justify-between bg-zinc-950 p-6 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-6">
        <span className="text-xs font-semibold text-zinc-450 tracking-wider uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-450" />
          <span>Interactive Slideshow</span>
        </span>
        <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
          Slide {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* 16:9 Slide Viewport */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl aspect-[16/9] bg-gradient-to-tr from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-850 rounded-2xl p-8 sm:p-12 shadow-2xl relative flex flex-col justify-center overflow-y-auto select-text select-none">
          {/* Subtle gradient light flare */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Slide Text Content */}
          <div className="relative z-10 slide-content">
            <MarkdownRenderer content={activeSlideText} />
          </div>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center justify-center gap-4 pt-6 border-t border-zinc-900 mt-6">
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 flex items-center gap-2 border border-zinc-850 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700/60 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Pause Autoplay</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-450 fill-current" />
              <span>Autoplay Slides</span>
            </>
          )}
        </button>

        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
          className="p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
