import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Plus, Search, Pin, PinOff, Trash2, 
  Edit3, PanelLeftClose, PanelLeftOpen, Settings, Library, Image, ChevronDown, ChevronUp
} from 'lucide-react';
import { useChatStore, PERSONAS } from '../../store/chatStore';
import { db } from '../../database/db';
import { Chat } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import arthaLogo from '../../assets/arthagpt.png';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  currentView?: 'home' | 'chat';
  onViewChange?: (view: 'home' | 'chat') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onOpenSettings, 
  onOpenTemplates,
  onViewChange
}) => {
  const handleLogoFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/favicon-32x32.png';
  };

  const {
    activeChatId,
    setActiveChatId,
    isSidebarOpen,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    searchQuery,
    setSearchQuery,
    activePersonaId,
    updateSetting,
    isImageStudioOpen,
    setImageStudioOpen,
  } = useChatStore();

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  // Fetch chats sorted by updatedAt descending
  const chats = useLiveQuery(() => 
    db.chats.orderBy('updatedAt').reverse().toArray()
  ) || [];

  // Focus editing field on activation
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Handle sidebar resize mouse events
  const startResizing = (e: React.MouseEvent) => {
    if (isMobileViewport) return;
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = e.clientX;
    if (newWidth > 180 && newWidth < 420) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleCreateChat = async () => {
    const newChat: Chat = {
      id: `chat-${Math.random().toString(36).substring(2, 11)}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: 0
    };
    await db.chats.add(newChat);
    setActiveChatId(newChat.id);
    onViewChange?.('chat');
    setSearchQuery('');
    if (isMobileViewport) setSidebarOpen(false);
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation and its messages?')) {
      await db.chats.delete(id);
      // Delete associated messages too
      const msgIds = await db.messages.where('chatId').equals(id).primaryKeys();
      await db.messages.bulkDelete(msgIds);
      
      if (activeChatId === id) {
        // Fallback to latest chat or null
        const remainingChats = await db.chats.orderBy('updatedAt').reverse().toArray();
        if (remainingChats.length > 0) {
          setActiveChatId(remainingChats[0].id);
        } else {
          setActiveChatId(null);
        }
      }
    }
  };

  const handleTogglePin = async (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.chats.update(chat.id, { 
      pinned: chat.pinned === 1 ? 0 : 1,
      updatedAt: Date.now() // push to top
    });
  };

  const handleStartRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleFinishRename = async (id: string) => {
    if (editTitle.trim()) {
      await db.chats.update(id, { 
        title: editTitle.trim(),
        updatedAt: Date.now() 
      });
    }
    setEditingChatId(null);
  };

  // Group chats by date
  const getTimelineGroup = (timestamp: number): 'Today' | 'Yesterday' | 'Last 7 Days' | 'Older' => {
    const now = new Date();
    
    // Normalize times to midnight for date-only comparison
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
    const sevenDaysAgoMidnight = todayMidnight - 6 * 24 * 60 * 60 * 1000;

    if (timestamp >= todayMidnight) return 'Today';
    if (timestamp >= yesterdayMidnight) return 'Yesterday';
    if (timestamp >= sevenDaysAgoMidnight) return 'Last 7 Days';
    return 'Older';
  };

  // Filter chats by search, excluding 'New Chat' items unless they are currently active
  const filteredChats = chats.filter(c => 
    (c.title !== 'New Chat' || c.id === activeChatId) &&
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter(c => c.pinned === 1);
  const unpinnedChats = filteredChats.filter(c => c.pinned !== 1);

  const groupedChats: Record<'Today' | 'Yesterday' | 'Last 7 Days' | 'Older', Chat[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Older': []
  };

  unpinnedChats.forEach(chat => {
    const group = getTimelineGroup(chat.updatedAt);
    groupedChats[group].push(chat);
  });

  const renderChatItem = (chat: Chat) => {
    const isActive = activeChatId === chat.id;
    const isEditing = editingChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => {
          if (!isEditing) {
            setActiveChatId(chat.id);
            onViewChange?.('chat');
            if (isMobileViewport) setSidebarOpen(false);
          }
        }}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
          isActive 
            ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/30' 
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
        }`}
      >
        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-550'}`} />
        
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => handleFinishRename(chat.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishRename(chat.id);
              if (e.key === 'Escape') setEditingChatId(null);
            }}
            className="flex-1 bg-zinc-950 border border-zinc-750 px-1.5 py-0.5 rounded text-zinc-200 text-xs focus:outline-none focus:border-zinc-550"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            onDoubleClick={(e) => handleStartRename(chat, e)}
            className="flex-1 truncate pr-8 select-text"
          >
            {chat.title}
          </span>
        )}

        {/* Hover action bar */}
        {!isEditing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleTogglePin(chat, e)}
              className="p-1 rounded text-zinc-550 hover:text-zinc-200 hover:bg-zinc-850 cursor-pointer"
              title={chat.pinned === 1 ? 'Unpin chat' : 'Pin chat'}
            >
              {chat.pinned === 1 ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => handleStartRename(chat, e)}
              className="p-1 rounded text-zinc-550 hover:text-zinc-200 hover:bg-zinc-850 cursor-pointer"
              title="Rename Chat"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDeleteChat(chat.id, e)}
              className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-850 cursor-pointer"
              title="Delete Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isSidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl hover:shadow shadow-md cursor-pointer transition-all hover:scale-105"
        title="Open Sidebar"
      >
        <PanelLeftOpen className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div 
      ref={sidebarRef}
      style={{ width: isMobileViewport ? 'min(86vw, 340px)' : `${sidebarWidth}px` }}
      className="h-full flex-shrink-0 flex bg-zinc-950 border-r border-zinc-900/60 relative max-md:fixed max-md:left-0 max-md:top-0 max-md:z-40 max-md:shadow-2xl"
    >
      <div className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-thin p-3.5">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 px-1.5">
          <div 
            onClick={() => onViewChange?.('home')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 select-none"
            title="Go to Home Page"
          >
            <img src={arthaLogo} onError={handleLogoFallback} className="w-6 h-6 rounded-full object-cover border border-[#17C7C9]/35" alt="Artha GPT Logo" />
            <span className="font-bold text-sm tracking-tight text-white">Artha GPT</span>
          </div>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors border-0"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        {/* New Chat Button */}
        <button
          onClick={handleCreateChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-3 bg-zinc-900 hover:bg-zinc-850 hover:shadow-lg border border-zinc-800 hover:border-zinc-700/60 text-zinc-100 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-emerald-450" />
          <span>New Chat</span>
        </button>

        {/* Gallery / Art Studio Toggle Button */}
        <button
          onClick={() => setImageStudioOpen(!isImageStudioOpen)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] ${
            isImageStudioOpen
              ? 'bg-violet-600/10 border-violet-500/30 text-violet-400'
              : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-850 hover:border-zinc-800 text-zinc-300'
          }`}
        >
          <Image className="w-4 h-4 text-violet-400" />
          <span>Image Gallery & Art</span>
        </button>

        {/* Workspace Menu (Persona + Settings) */}
        <div className="mb-4 bg-zinc-900/20 border border-zinc-905 rounded-2xl p-2 select-none">
          <button
            onClick={() => setIsWorkspaceMenuOpen(v => !v)}
            className="w-full flex items-center justify-between px-2 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-900/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              <span>Workspace Menu</span>
            </span>
            {isWorkspaceMenuOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {isWorkspaceMenuOpen && (
            <div className="pt-2 space-y-2 animate-fade-in">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1.5">
                AI Persona
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 px-0.5 scrollbar-thin select-none">
                {PERSONAS.map((p) => {
                  const isActive = activePersonaId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => updateSetting('activePersonaId', p.id)}
                      className={`flex flex-col items-center justify-center min-w-[54px] h-[54px] rounded-xl border text-center transition-all cursor-pointer select-none px-1 py-1 hover:scale-105 active:scale-95 flex-shrink-0 ${
                        isActive
                          ? `${p.borderColor} ${p.bgColor} shadow-sm shadow-black/40`
                          : 'border-zinc-850 hover:border-zinc-800 bg-zinc-900/30'
                      }`}
                      title={`${p.name}: ${p.description}`}
                    >
                      <span className="text-sm mb-0.5 select-none">{p.emoji}</span>
                      <span className={`text-[8px] font-semibold truncate max-w-full ${isActive ? p.color : 'text-zinc-500'}`}>
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-350 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-zinc-500" />
                <span>Settings Configuration</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-4 flex items-center select-text">
          <Search className="w-3.5 h-3.5 text-zinc-550 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/40 hover:bg-zinc-900/80 focus:bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none placeholder-zinc-550 transition-all"
          />
        </div>

        {/* Scrollable Conversation List */}
        <div className="space-y-4 pr-1 select-none">
          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2.5 flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-zinc-500" />
                <span>Pinned</span>
              </div>
              {pinnedChats.map(renderChatItem)}
            </div>
          )}

          {/* Chronological Chat Groups */}
          {(['Today', 'Yesterday', 'Last 7 Days', 'Older'] as const).map(group => {
            const list = groupedChats[group];
            if (list.length === 0) return null;

            return (
              <div key={group} className="space-y-1">
                <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider px-2.5">
                  {group}
                </div>
                {list.map(renderChatItem)}
              </div>
            );
          })}

          {chats.length === 0 && (
            <div className="text-center py-8 text-zinc-650 text-xs">
              No conversations.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-900/80 pt-3 mt-2 flex flex-col gap-1 select-none">
          <button
            onClick={onOpenTemplates}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all cursor-pointer"
          >
            <Library className="w-4 h-4 text-zinc-500" />
            <span>Templates Library</span>
          </button>
        </div>

      </div>

      {/* Resize Handle */}
      {!isMobileViewport && (
        <div 
          onMouseDown={startResizing}
          className="w-[3px] hover:w-[6px] absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-emerald-500/50 bg-transparent transition-all select-none"
        />
      )}
    </div>
  );
};
