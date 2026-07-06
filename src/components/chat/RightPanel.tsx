import React from 'react';
import { 
  X, BarChart3, Database, Shield, FileCode2,
  Cpu, Thermometer, Hash, MessagesSquare
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';
import { estimateTokens } from '../../utils/tokenizer';

interface RightPanelProps {
  onClose: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onClose }) => {
  const { 
    activeChatId, 
    activeModel, 
    systemPrompt, 
    temperature, 
    pinnedInstructions,
    userBio 
  } = useChatStore();

  // Load message count and estimated tokens for current conversation
  const messages = useLiveQuery(async () => {
    if (!activeChatId) return [];
    return await db.messages.where('chatId').equals(activeChatId).toArray();
  }, [activeChatId]) || [];

  const memories = useLiveQuery(() => db.memory.toArray()) || [];

  const totalTokens = messages.reduce((acc, msg) => {
    return acc + (msg.tokenCount || estimateTokens(msg.content));
  }, 0);

  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  const assistantMessagesCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <div className="w-80 h-full flex-shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-900/60 p-4 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-emerald-450" />
          <span className="font-bold text-sm tracking-tight text-white">Conversation Panel</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-0.5 scrollbar-thin select-text">
        {/* Model Specs */}
        <div className="space-y-2 bg-zinc-900/20 border border-zinc-900/60 p-3 rounded-xl">
          <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
            <Cpu className="w-3 h-3 text-zinc-650" />
            <span>Active Model Configurations</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Model Name:</span>
            <span className="font-mono text-zinc-300 font-semibold">{activeModel}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Temperature:</span>
            <span className="font-mono text-zinc-300 flex items-center gap-0.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              {temperature}
            </span>
          </div>
        </div>

        {/* Conversation Statistics */}
        <div className="space-y-2 bg-zinc-900/20 border border-zinc-900/60 p-3 rounded-xl">
          <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
            <MessagesSquare className="w-3.5 h-3.5 text-zinc-650" />
            <span>Workspace Statistics</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Total Messages:</span>
            <span className="font-mono text-zinc-300 font-semibold">{messages.length}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">User / AI Messages:</span>
            <span className="font-mono text-zinc-300 font-semibold">{userMessagesCount} / {assistantMessagesCount}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500">Estimated Tokens:</span>
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-0.5">
              <Hash className="w-3.5 h-3.5 text-emerald-500/80" />
              {totalTokens.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Custom Persona Context */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Shield className="w-3 h-3 text-zinc-650" />
            <span>Persona (User Bio)</span>
          </div>
          {userBio ? (
            <p className="text-xs text-zinc-400 bg-zinc-900/25 border border-zinc-900/60 p-2.5 rounded-xl leading-relaxed italic max-h-[85px] overflow-y-auto">
              "{userBio}"
            </p>
          ) : (
            <p className="text-xs text-zinc-600 bg-zinc-900/10 border border-zinc-900/20 p-2 rounded-xl italic">
              No user bio specified. Set in settings.
            </p>
          )}
        </div>

        {/* Pinned System overrides */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <FileCode2 className="w-3 h-3 text-zinc-650" />
            <span>Pinned Instructions</span>
          </div>
          {pinnedInstructions ? (
            <p className="text-xs text-zinc-400 bg-zinc-900/25 border border-zinc-900/60 p-2.5 rounded-xl leading-relaxed font-mono max-h-[90px] overflow-y-auto">
              {pinnedInstructions}
            </p>
          ) : (
            <p className="text-xs text-zinc-600 bg-zinc-900/10 border border-zinc-900/20 p-2 rounded-xl italic">
              No custom pinned instructions.
            </p>
          )}
        </div>

        {/* Database memory count */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Database className="w-3.5 h-3.5 text-zinc-650" />
            <span>Agentic Local Memory ({memories.length})</span>
          </div>
          {memories.length > 0 ? (
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 border border-zinc-900/80 p-2 rounded-xl bg-zinc-950/40">
              {memories.slice(0, 5).map((m) => (
                <div key={m.id} className="text-[10.5px] border-b border-zinc-900/60 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-mono text-zinc-500 uppercase text-[8px] bg-zinc-900 px-1 py-0.5 rounded mr-1">
                    {m.category}
                  </span>
                  <span className="font-semibold text-zinc-350">{m.key}</span>
                  <p className="text-zinc-450 truncate text-[10px] mt-0.5">{m.value}</p>
                </div>
              ))}
              {memories.length > 5 && (
                <p className="text-[9.5px] text-zinc-550 text-center font-semibold pt-1 uppercase tracking-wider">
                  + {memories.length - 5} more stored facts
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 bg-zinc-900/10 border border-zinc-900/20 p-2 rounded-xl italic">
              No facts remembered yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
