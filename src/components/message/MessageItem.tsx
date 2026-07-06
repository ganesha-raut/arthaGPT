import React, { useState } from 'react';
import { 
  Check, Copy, ThumbsUp, ThumbsDown,
  Trash2, Edit3, Eye, EyeOff, Clock, Star, RefreshCw, Globe
} from 'lucide-react';
import { Message, Attachment } from '../../types';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { AgentProgress } from '../chat/AgentProgress';
import { useChatStore, PERSONAS } from '../../store/chatStore';
import { db } from '../../database/db';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
  onRetry: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLast,
  isStreaming,
  onDelete,
  onEdit,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [liked, setLiked] = useState(message.metadata?.liked === true);
  const [disliked, setDisliked] = useState(message.metadata?.disliked === true);
  const [showRaw, setShowRaw] = useState(false);
  const [starred, setStarred] = useState(message.metadata?.starred === true);

  const handleStar = async () => {
    const nextVal = !starred;
    setStarred(nextVal);
    const updatedMetadata = { ...message.metadata, starred: nextVal };
    message.metadata = updatedMetadata;
    await db.messages.update(message.id, { metadata: updatedMetadata });
  };

  const isUser = message.role === 'user';

  // Get active persona for AI messages
  const { activePersonaId } = useChatStore();
  const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleLike = () => {
    const nextVal = !liked;
    setLiked(nextVal);
    if (nextVal) setDisliked(false);
    // Persist status
    message.metadata = { ...message.metadata, liked: nextVal, disliked: false };
  };

  const handleDislike = () => {
    const nextVal = !disliked;
    setDisliked(nextVal);
    if (nextVal) setLiked(false);
    // Persist status
    message.metadata = { ...message.metadata, disliked: nextVal, liked: false };
  };

  const renderAttachments = (attachmentsList: Attachment[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-3 select-none">
        {attachmentsList.map((file, idx) => {
          const isImage = file.type.startsWith('image/');
          return (
            <div 
              key={idx} 
              className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-850 p-2 rounded-xl text-xs max-w-[280px]"
            >
              {isImage && file.content ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0">
                  <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-850 flex-shrink-0 text-indigo-400">
                  <span className="font-mono text-[9px] uppercase font-bold">{file.name.split('.').pop() || 'file'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 pr-1.5">
                <p className="font-semibold text-zinc-305 truncate text-xs">{file.name}</p>
                <p className="text-[10px] text-zinc-550 mt-0.5">{Math.ceil(file.size / 1024)} KB</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className={`group w-full py-4 sm:py-6 select-text ${
        isUser 
          ? 'bg-transparent' 
          : 'bg-zinc-900/35 border-y border-zinc-900/40'
      }`}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 flex items-start gap-2.5 sm:gap-6">
        
        {/* Avatar */}
        <div className={`hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 shadow-md text-base select-none ${
          isUser 
            ? 'bg-zinc-800 text-zinc-300 font-bold text-xs' 
            : `${activePersona.bgColor} border ${activePersona.borderColor}`
        }`}>
          {isUser ? '👤' : activePersona.emoji}
        </div>

        {/* Message Container */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between select-none">
            <span className={`text-xs font-bold tracking-tight capitalize flex items-center gap-1.5 ${
              isUser ? 'text-zinc-400' : activePersona.color
            }`}>
              <span className={`sm:hidden inline-flex w-4 h-4 rounded-full items-center justify-center text-[9px] font-bold ${
                isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/15 text-emerald-350 border border-emerald-500/30'
              }`}>
                {isUser ? 'U' : 'A'}
              </span>
              {isUser ? 'You' : activePersona.name}
            </span>
            
            {/* Stats display for Assistant — hidden from user */}
            {!isUser && message.status !== 'streaming' && message.generationTime && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                <Clock className="w-2.5 h-2.5" />
                <span>{(message.generationTime / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="text-[13px] sm:text-sm leading-relaxed text-zinc-200">
            {message.metadata?.agentTasks && (
              <AgentProgress 
                tasks={message.metadata.agentTasks} 
                activeArtifactType={message.metadata.artifactType} 
              />
            )}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700/80 rounded-xl p-3 text-sm focus:outline-none text-zinc-200 font-sans leading-relaxed resize-none min-h-[80px]"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 border border-zinc-800 text-zinc-450 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-3 py-1.5 bg-emerald-555 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save & Submit
                  </button>
                </div>
              </div>
            ) : showRaw ? (
              <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-300 bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 select-text overflow-auto max-h-[300px]">
                {message.content}
              </pre>
            ) : isUser ? (
              <p className="whitespace-pre-wrap select-text">{message.content}</p>
            ) : (
              <div className="space-y-3.5">
                {/* Search Sources Section */}
                {message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div data-html2canvas-ignore="true" className="mb-3.5 select-none animate-fade-in bg-zinc-900/10 border border-zinc-900/40 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-550 uppercase tracking-wider mb-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Search Sources ({message.metadata.sources.length})</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 scroll-smooth">
                      {message.metadata.sources.map((src: any, i: number) => {
                        const domain = src.url ? new URL(src.url).hostname.replace('www.', '') : 'link';
                        return (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-col min-w-[120px] max-w-[150px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-lg p-2 transition-all flex-shrink-0 cursor-pointer"
                          >
                            <span className="text-[10px] text-zinc-250 truncate font-semibold leading-snug">{src.title}</span>
                            <span className="text-[9px] text-zinc-550 truncate mt-1">{domain}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                <MarkdownRenderer content={message.content} />
              </div>
            )}

            {/* Rendering attachments */}
            {message.attachments && message.attachments.length > 0 && renderAttachments(message.attachments)}

            {/* Streaming Typing Indicator — animated dots */}
            {message.status === 'streaming' && message.content === '' && (
              <div className="flex items-center gap-1.5 py-3 select-none">
                <div className={`w-2 h-2 rounded-full animate-bounce ${activePersona.color.replace('text-', 'bg-')}`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${activePersona.color.replace('text-', 'bg-')}`} style={{ animationDelay: '160ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${activePersona.color.replace('text-', 'bg-')}`} style={{ animationDelay: '320ms' }} />
                <span className={`text-xs ml-1 ${activePersona.color} opacity-60`}>{activePersona.name} is thinking…</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          {message.status !== 'sending' && message.status !== 'streaming' && (
            <div data-html2canvas-ignore="true" className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between pt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity select-none">
              
              {/* Left Actions */}
              <div className="flex items-center gap-1.5 -ml-1">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {!isUser && (
                  <>
                    <button
                      onClick={handleLike}
                      className={`p-1.5 rounded-lg hover:bg-zinc-850 transition-colors cursor-pointer ${
                        liked ? 'text-emerald-400' : 'text-zinc-550 hover:text-zinc-300'
                      }`}
                      title="Like response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDislike}
                      className={`p-1.5 rounded-lg hover:bg-zinc-850 transition-colors cursor-pointer ${
                        disliked ? 'text-red-400' : 'text-zinc-550 hover:text-zinc-300'
                      }`}
                      title="Dislike response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowRaw(!showRaw)}
                      className={`p-1.5 rounded-lg hover:bg-zinc-850 transition-colors cursor-pointer ${
                        showRaw ? 'text-indigo-400' : 'text-zinc-550 hover:text-zinc-300'
                      }`}
                      title={showRaw ? 'Render markdown' : 'Show raw markdown'}
                    >
                      {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}

                {isUser && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg hover:bg-zinc-850 text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer"
                    title="Edit message"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-850 text-zinc-555 hover:text-red-450 transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleStar}
                  className={`p-1.5 rounded-lg hover:bg-zinc-850 transition-colors cursor-pointer ${
                    starred ? 'text-amber-400' : 'text-zinc-550 hover:text-zinc-300'
                  }`}
                  title={starred ? 'Unstar message' : 'Star message'}
                >
                  <Star className={`w-3.5 h-3.5 ${starred ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Right Action button (Retry on failed generation) */}
              {!isUser && isLast && message.status === 'failed' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onRetry(message.id)}
                    disabled={isStreaming}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
