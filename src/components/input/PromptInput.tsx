import React, { useRef, useEffect, useState } from 'react';
import { Mic, Send, Square, FileText, X, Sparkles, Hash, Wand2, Loader2, Globe } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { Attachment } from '../../types';

interface PromptInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  onStop: () => void;
  onOpenTemplates: () => void;
}

// Quick prompt suggestions shown below input when empty
const QUICK_PROMPTS = [
  { label: '✍️ Write', text: 'Write a ' },
  { label: '📝 Summarize', text: 'Summarize this: ' },
  { label: '🔍 Explain', text: 'Explain ' },
  { label: '🐛 Debug', text: 'Debug this code:\n' },
  { label: '💡 Brainstorm', text: 'Brainstorm ideas for ' },
  { label: '📊 Compare', text: 'Compare ' },
];

export const PromptInput: React.FC<PromptInputProps> = ({
  onSend,
  onStop,
  onOpenTemplates,
}) => {
  const { 
    currentInput, 
    setCurrentInput, 
    isStreaming, 
    selectedTemplate, 
    setSelectedTemplate,
    isWebSearchActive,
    setWebSearchActive
  } = useChatStore();
  const [isRecording, setIsRecording] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEnhance = async () => {
    if (!currentInput.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a prompt engineering expert. Rewrite the user prompt to make it highly detailed, clear, and optimized for an AI assistant. Keep it concise but add rich context, clear steps, and target output structure. Return ONLY the rewritten prompt, with no introductory text, no side comments, and no surrounding quotation marks.'
            },
            {
              role: 'user',
              content: currentInput
            }
          ],
          temperature: 0.6,
          max_tokens: 600,
          stream: false
        })
      });
      if (response.ok) {
        const data = await response.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        if (enhanced) {
          setCurrentInput(enhanced);
        }
      }
    } catch (err) {
      console.warn('Enhance prompt failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Auto-grow height of textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
    }
  }, [currentInput]);

  // Show quick suggestions when input is focused and empty
  useEffect(() => {
    setShowSuggestions(!currentInput.trim() && !isStreaming);
  }, [currentInput, isStreaming]);

  // Insert template when selected
  useEffect(() => {
    if (selectedTemplate) {
      setCurrentInput(selectedTemplate.content);
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [selectedTemplate, setCurrentInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!currentInput.trim() || isStreaming) return;
    onSend(currentInput, []);
    setCurrentInput('');
    setSelectedTemplate(null);
    setShowSuggestions(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // Voice input
  const handleSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in your browser. Try Chrome.');
      return;
    }
    if (isRecording) { setIsRecording(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const existing = useChatStore.getState().currentInput;
      setCurrentInput(existing ? `${existing} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const charCount = currentInput.length;
  const isNearLimit = charCount > 3500;

  return (
    <div className="w-full space-y-2">
      
      {/* Quick Prompt Suggestions */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5 px-1 select-none animate-fade-in">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setCurrentInput(p.text);
                textareaRef.current?.focus();
              }}
              className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer hover:border-zinc-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-2 sm:p-2.5 focus-within:border-violet-600/50 focus-within:shadow-lg focus-within:shadow-violet-900/20 transition-all shadow-xl backdrop-blur-md">
        
        {/* Active Template Notice */}
        {selectedTemplate && (
          <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl mb-2 text-xs text-violet-300 select-none">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-violet-400" />
              <span>Template: <b className="text-violet-200">{selectedTemplate.name}</b></span>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-0.5 rounded hover:bg-zinc-800 text-violet-400 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-1 relative">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(!currentInput.trim())}
            placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
            className="flex-1 min-w-0 w-full bg-transparent border-0 resize-none max-h-[220px] min-h-[36px] py-2 px-2.5 sm:px-3 text-sm text-zinc-200 focus:outline-none focus:ring-0 placeholder-zinc-600 leading-relaxed font-sans scrollbar-thin select-text"
          />

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 self-end sm:self-auto overflow-x-auto max-w-full scrollbar-thin pb-0.5 sm:pb-0">

            {/* Enhance Prompt */}
            {currentInput.trim() && (
              <button
                onClick={handleEnhance}
                disabled={isEnhancing}
                className={`p-1.5 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                  isEnhancing
                    ? 'text-violet-400 bg-violet-900/10 animate-pulse'
                    : 'text-violet-400 hover:text-violet-200 hover:bg-violet-900/20'
                }`}
                title="✨ Enhance Prompt"
              >
                {isEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 animate-pulse" />
                )}
              </button>
            )}

            {/* Web Search (Globe) Toggle */}
            <button
              type="button"
              onClick={() => setWebSearchActive(!isWebSearchActive)}
              className={`p-1.5 sm:p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 border ${
                isWebSearchActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450'
                  : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
              title={isWebSearchActive ? 'Web Search Active (Free)' : 'Enable Web Search (Free)'}
            >
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline">Search</span>
            </button>

            {/* Templates */}
            <button
              onClick={onOpenTemplates}
              className="p-1.5 sm:p-2.5 rounded-xl text-zinc-500 hover:text-violet-300 hover:bg-violet-900/20 cursor-pointer transition-all"
              title="Prompt Templates"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Voice */}
            <button
              onClick={handleSpeech}
              className={`p-1.5 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                isRecording
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse'
                  : 'text-zinc-500 hover:text-sky-300 hover:bg-sky-900/20'
              }`}
              title={isRecording ? 'Listening… (click to stop)' : 'Voice Input (Hindi/English)'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send / Stop */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className="p-1.5 sm:p-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 rounded-xl cursor-pointer transition-all"
                title="Stop Generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!currentInput.trim()}
                className={`p-1.5 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                  currentInput.trim()
                    ? 'bg-gradient-to-br from-violet-600 to-emerald-500 text-white hover:shadow-lg hover:shadow-violet-600/30 hover:scale-105 active:scale-95'
                    : 'text-zinc-600 bg-zinc-800/40 border border-zinc-800'
                }`}
                title="Send Message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="hidden sm:flex items-center justify-between px-3 pt-1.5 select-none">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <Hash className="w-2.5 h-2.5" />
              <span>Enter = Send • Shift+Enter = New line</span>
            </span>
            {isRecording && (
              <span className="text-red-400 font-semibold animate-pulse">🔴 Listening…</span>
            )}
          </div>
          {charCount > 100 && (
            <span className={`text-[10px] font-mono tabular-nums ${isNearLimit ? 'text-amber-400' : 'text-zinc-600'}`}>
              {charCount.toLocaleString()} chars
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
