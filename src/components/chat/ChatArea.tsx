import React, { useEffect, useRef, useState } from 'react';
import { 
  Trash2, Menu, Sparkles, 
  MessageSquarePlus, AlertCircle, ArrowDown, Star, FileText, Image, Loader2
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { db } from '../../database/db';
import { Chat, Attachment } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageItem } from '../message/MessageItem';
import { PromptInput } from '../input/PromptInput';

interface ChatAreaProps {
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  onStopGeneration: () => void;
  onRetryFailed: (failedMessageId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onOpenSettings,
  onOpenTemplates,
  onSendMessage,
  onStopGeneration,
  onRetryFailed,
}) => {
  const { 
    activeChatId, 
    setActiveChatId,
    isSidebarOpen, 
    setSidebarOpen,
    isStreaming,
    isImageStudioOpen,
    setImageStudioOpen,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Load chat detail
  const chat = useLiveQuery<Chat | undefined>(() => 
    activeChatId ? db.chats.get(activeChatId) : Promise.resolve(undefined),
    [activeChatId]
  );

  // Load messages
  const messages = (useLiveQuery<any[]>(() => 
    activeChatId 
      ? db.messages.where('chatId').equals(activeChatId).sortBy('createdAt')
      : Promise.resolve([]),
    [activeChatId]
  ) ?? []);

  // Filter starred messages when filtered toggle is active
  const displayMessages = showStarredOnly 
    ? messages.filter(m => m.metadata?.starred === true) 
    : messages;

  // Manage scrolling positions
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setUserScrolledUp(false);
  };

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom('smooth');
    }
  }, [messages, userScrolledUp]);

  // Monitor scroll height changes to show/hide bottom anchor button
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollButton(!isAtBottom);
    if (!isAtBottom && isStreaming) {
      setUserScrolledUp(true);
    } else if (isAtBottom) {
      setUserScrolledUp(false);
    }
  };

  const handleClearConversation = async () => {
    if (!activeChatId) return;
    if (confirm('Clear all messages in this conversation?')) {
      const msgIds = await db.messages.where('chatId').equals(activeChatId).primaryKeys();
      await db.messages.bulkDelete(msgIds);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    await db.messages.delete(id);
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    // Standard AI flow: delete all messages following the edited message,
    // update this message, and trigger a new message submission.
    const msg = await db.messages.get(id);
    if (!msg) return;

    // Delete all subsequent messages
    const subsequent = await db.messages
      .where('chatId')
      .equals(msg.chatId)
      .filter(m => m.createdAt > msg.createdAt)
      .primaryKeys();
    
    await db.messages.bulkDelete(subsequent);

    // Update message content
    await db.messages.update(id, {
      content: newContent,
      updatedAt: Date.now()
    });

    // Re-trigger generation
    onSendMessage(newContent, msg.attachments || []);
  };

  const handleExportPDF = () => {
    if (!messages.length) return;
    setIsPdfExporting(true);

    const runJsPdfExport = () => {
      // Run inside setTimeout so browser thread can paint the loading spinner first!
      setTimeout(() => {
        try {
          const { jsPDF } = (window as any).jspdf;
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          // Document title
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(124, 58, 237); // Purple (#7c3aed)
          doc.text("Artha GPT Chat Export", 15, 20);

          // Subheader metadata
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(113, 113, 122); // Gray (#71717a)
          doc.text(`Title: ${chat?.title || 'Conversation'}`, 15, 27);
          doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 32);

          // Divider Line
          doc.setDrawColor(228, 228, 231); 
          doc.line(15, 36, 195, 36);

          let y = 45;
          const pageHeight = 275;
          const marginX = 15;
          const contentWidth = 180;

          messages.forEach((m) => {
            const isUser = m.role === 'user';
            
            // Draw Sender Label
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            if (isUser) {
              doc.setTextColor(75, 85, 99); 
              doc.text("● USER", marginX, y);
            } else {
              doc.setTextColor(124, 58, 237); 
              doc.text("● ARTHA GPT ASSISTANT", marginX, y);
            }
            y += 6;

            // Split content by lines to process code blocks
            const contentLines = m.content.split('\n');
            let inCodeBlock = false;

            contentLines.forEach((rawLine: string) => {
              if (rawLine.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                return; 
              }

              // Wrap the line text to fit page width
              const wrappedLines = doc.splitTextToSize(rawLine, inCodeBlock ? contentWidth - 10 : contentWidth);
              
              wrappedLines.forEach((line: string) => {
                if (y > pageHeight) {
                  doc.addPage();
                  y = 20;
                }

                if (inCodeBlock) {
                  doc.setFont("courier", "normal");
                  doc.setFontSize(9);
                  doc.setTextColor(9, 121, 105); 
                  
                  doc.setDrawColor(167, 139, 250); 
                  doc.setLineWidth(0.3);
                  doc.line(15, y - 3, 15, y + 2);
                  
                  doc.text(line, marginX + 4, y);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(10);
                  doc.setTextColor(39, 39, 42); 
                  doc.text(line, marginX, y);
                }
                y += 5.5; 
              });
            });

            y += 8;
            
            if (y < pageHeight) {
              doc.setDrawColor(244, 244, 245); 
              doc.line(15, y - 4, 195, y - 4);
            }
          });

          // Save the PDF locally
          doc.save(`${chat?.title || 'conversation'}.pdf`);
          setIsPdfExporting(false);
        } catch (err) {
          console.error('jsPDF generation failed:', err);
          alert('Export failed. Let us try rendering via print instead.');
          setIsPdfExporting(false);
        }
      }, 150);
    };

    // Load jsPDF dynamically from CDN if it's not present
    if (!(window as any).jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        runJsPdfExport();
      };
      script.onerror = () => {
        alert('Failed to load PDF library. Please check your internet connection.');
        setIsPdfExporting(false);
      };
      document.body.appendChild(script);
    } else {
      runJsPdfExport();
    }
  };

  const handleStartNewChat = async () => {
    const newChat: Chat = {
      id: `chat-${Math.random().toString(36).substring(2, 11)}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: 0
    };
    await db.chats.add(newChat);
    setActiveChatId(newChat.id);
  };

  const handleQuickStarter = (prompt: string) => {
    onSendMessage(prompt, []);
  };

  return (
    <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden bg-zinc-950">
      
      {/* Top Toolbar */}
      <div className="h-14 px-3 sm:px-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
              title="Open Sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-zinc-200 truncate max-w-[140px] sm:max-w-sm">
              {chat?.title || 'Artha GPT Workspace'}
            </span>
          </div>
        </div>

        {/* Toolbar Actions - horizontally scrollable slider on mobile */}
        {activeChatId && (
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-[60%] sm:max-w-none select-none py-1 scroll-smooth">
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleExportPDF}
                  className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Export PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => setShowStarredOnly(!showStarredOnly)}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    showStarredOnly
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                  title={showStarredOnly ? 'Showing starred messages only' : 'Filter starred messages'}
                >
                  <Star className={`w-3.5 h-3.5 \${showStarredOnly ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">Starred</span>
                </button>
                <button
                  onClick={() => setImageStudioOpen(!isImageStudioOpen)}
                  className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    isImageStudioOpen
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                  title="AI Art Studio & Gallery"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Art Studio</span>
                </button>
                <button
                  onClick={handleClearConversation}
                  className="p-1.5 rounded-lg hover:bg-zinc-900/50 text-zinc-550 hover:text-red-400 cursor-pointer transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </>
            )}

          </div>
        )}
      </div>

      {/* Main Conversation Stream */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin select-text"
      >
        {!activeChatId ? (
          /* Landing page when no chat is active */
          <div className="max-w-xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center space-y-6 select-none animate-fade-in">
            <img src="/arthagpt.png" className="w-16 h-16 rounded-full object-cover border-2 border-[#17C7C9]/40 shadow-lg shadow-[#17C7C9]/10" alt="Artha GPT logo" />
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">Welcome to Artha GPT Workspace</h2>
              <p className="text-sm text-zinc-450 leading-relaxed max-w-sm mx-auto">
                An advanced, local-first artificial intelligence assistant that runs directly in your browser.
              </p>
            </div>
            
            <button
              onClick={handleStartNewChat}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-555 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-emerald-555/20 transition-all hover:scale-102 active:scale-98"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Create New Conversation</span>
            </button>
          </div>
        ) : messages.length === 0 ? (
          /* Empty Chat state suggestions */
          <div className="max-w-2xl mx-auto px-4 pt-10 sm:pt-16 pb-8 h-full flex flex-col justify-between">
            <div className="flex flex-col items-center text-center space-y-4 my-auto select-none">
              <img src="/arthagpt.png" className="w-12 h-12 rounded-full object-cover border border-[#17C7C9]/40 shadow-md shadow-[#17C7C9]/10" alt="Artha GPT logo" />
              <div>
                <h3 className="text-base font-bold text-zinc-150">Artha GPT Sandbox</h3>
                <p className="text-xs text-zinc-450 mt-1">Start by typing below, or use one of our templates.</p>
              </div>

              {/* Grid suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-6">
                <div 
                  onClick={() => handleQuickStarter('Generate a futuristic neon city skyline image with cinematic lighting and ultra detail.')}
                  className="p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 rounded-xl cursor-pointer text-left transition-all group"
                >
                  <span className="font-semibold text-xs text-zinc-250 group-hover:text-zinc-100 block mb-1">Image Generation Test</span>
                  <span className="text-[11px] text-zinc-500 leading-relaxed block">Try a visual prompt and generate art directly in this chat.</span>
                </div>
                <div 
                  onClick={() => handleQuickStarter('Build a responsive login page in React + TypeScript with full code and folder structure.')}
                  className="p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 rounded-xl cursor-pointer text-left transition-all group"
                >
                  <span className="font-semibold text-xs text-zinc-250 group-hover:text-zinc-100 block mb-1">Coding Assistant Test</span>
                  <span className="text-[11px] text-zinc-500 leading-relaxed block">Quickly test coding output quality with a starter coding prompt.</span>
                </div>
                <div 
                  onClick={onOpenTemplates}
                  className="p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 rounded-xl cursor-pointer text-left transition-all group"
                >
                  <span className="font-semibold text-xs text-zinc-250 group-hover:text-zinc-100 block mb-1">Browse Templates</span>
                  <span className="text-[11px] text-zinc-500 leading-relaxed block">Use predefined setups for code review, study help, and writing.</span>
                </div>
                <div 
                  onClick={onOpenSettings}
                  className="p-4 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 rounded-xl cursor-pointer text-left transition-all group"
                >
                  <span className="font-semibold text-xs text-zinc-250 group-hover:text-zinc-100 block mb-1">Tune Workspace</span>
                  <span className="text-[11px] text-zinc-500 leading-relaxed block">Adjust persona and system settings for your preferred style.</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-550 border border-zinc-900 bg-zinc-950/20 px-3 py-1.5 rounded-lg select-none max-w-xs mx-auto">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>All chats are encrypted and stored locally.</span>
            </div>
          </div>
        ) : (
          /* Messages List */
          <div id="chat-messages-container" className="divide-y divide-zinc-900/20 pb-28 sm:pb-32 select-text">
            {showStarredOnly && (
              <div data-html2canvas-ignore="true" className="p-4 mx-4 my-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between text-xs text-amber-400 select-none">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-current text-amber-400" />
                  <span>Viewing Starred Messages</span>
                </div>
                <button 
                  onClick={() => setShowStarredOnly(false)} 
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  &larr; Back to Chat
                </button>
              </div>
            )}
            {displayMessages.map((msg, index) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                onRetry={onRetryFailed}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Anchor scroll lock button */}
      {showScrollButton && activeChatId && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-22 right-4 sm:right-8 z-30 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-full hover:shadow shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 animate-bounce select-none"
          title="Scroll to Bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Input Area */}
      {activeChatId && (
        <div className="p-3 sm:p-4 pb-4 sm:pb-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent border-t border-zinc-900/10 flex-shrink-0 select-none">
          <div className="max-w-3xl mx-auto">
            <PromptInput
              onSend={(c, att) => onSendMessage(c, att)}
              onStop={onStopGeneration}
              onOpenTemplates={onOpenTemplates}
            />
            <p className="text-[10px] text-center text-zinc-655 mt-2 select-none tracking-wide uppercase">
              Artha GPT v1.0 • Built on LLAMA-3.1
            </p>
          </div>
        </div>
      )}

      {/* PDF Generation Loader Backdrop Overlay */}
      {isPdfExporting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-3.5 select-none animate-fade-in">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
          <p className="text-sm font-semibold text-zinc-200">Generating custom PDF...</p>
          <p className="text-[10px] text-zinc-500">Preparing exact dark-theme chat copy.</p>
        </div>
      )}

    </div>
  );
};
