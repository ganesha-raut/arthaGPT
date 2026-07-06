import React, { useState, useEffect } from 'react';
import { X, Trash2, ShieldAlert, Cpu, User, Database, Settings } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { db } from '../../database/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    activeModel,
    systemPrompt,
    userBio,
    temperature,
    pinnedInstructions,
    updateSetting,
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<'model' | 'profile' | 'system'>('model');
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localUserBio, setLocalUserBio] = useState(userBio);
  const [localPinnedInstructions, setLocalPinnedInstructions] = useState(pinnedInstructions);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localModel, setLocalModel] = useState(activeModel);

  // Read memories dynamically
  const memories = useLiveQuery(() => db.memory.toArray());

  useEffect(() => {
    if (isOpen) {
      setLocalSystemPrompt(systemPrompt);
      setLocalUserBio(userBio);
      setLocalPinnedInstructions(pinnedInstructions);
      setLocalTemp(temperature);
      setLocalModel(activeModel);
    }
  }, [isOpen, systemPrompt, userBio, pinnedInstructions, temperature, activeModel]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateSetting('systemPrompt', localSystemPrompt);
    await updateSetting('userBio', localUserBio);
    await updateSetting('pinnedInstructions', localPinnedInstructions);
    await updateSetting('temperature', localTemp);
    await updateSetting('activeModel', localModel);
    onClose();
  };

  const handleDeleteMemory = async (id: string) => {
    await db.memory.delete(id);
  };

  const handleClearDatabase = async () => {
    if (confirm('Are you absolutely sure you want to clear all data? This deletes all chats, messages, memory, and custom settings permanently.')) {
      await db.chats.clear();
      await db.messages.clear();
      await db.memory.clear();
      await db.settings.clear();
      // Reload page to re-initialize
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-3xl h-[560px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Sidebar Tabs */}
        <div className="w-full md:w-56 bg-zinc-950 border-r border-zinc-800/80 p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <div className="hidden md:block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Settings</div>
          
          <button
            onClick={() => setActiveTab('model')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'model' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Model & Parameters</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>User Persona (Bio)</span>
          </button>
          

          <button
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'system' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Reset</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden bg-zinc-900">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-zinc-100 capitalize">
              {activeTab === 'model' && 'AI Model Configurations'}
              {activeTab === 'profile' && 'User Biography & Custom Persona'}
              {activeTab === 'memory' && 'Agentic Local Memory Engine'}
              {activeTab === 'system' && 'Developer & System Configs'}
            </h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-zinc-350">
            {activeTab === 'model' && (
              <div className="space-y-4">
                
                {/* Temperature Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Temperature ({localTemp})</label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {localTemp <= 0.3 ? 'Deterministic' : localTemp >= 0.8 ? 'Creative' : 'Balanced'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.1"
                    value={localTemp}
                    onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-950 rounded-lg cursor-pointer appearance-none border border-zinc-800"
                  />
                </div>

                {/* System Prompt override */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Custom System Prompt Override</label>
                  <textarea
                    rows={4}
                    value={localSystemPrompt}
                    onChange={(e) => setLocalSystemPrompt(e.target.value)}
                    placeholder="Provide default rules for the AI chatbot..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 font-mono focus:outline-none focus:border-zinc-700 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Information specified here is injected into the AI context to tailor responses to your specific career, skill level, or coding guidelines.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">About Yourself (User Bio)</label>
                  <textarea
                    rows={4}
                    value={localUserBio}
                    onChange={(e) => setLocalUserBio(e.target.value)}
                    placeholder="Example: I am a senior front-end engineer specializing in React, Next.js, and TypeScript. I prefer clean code using Tailwind CSS and utility functions."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Pinned System Instructions</label>
                  <textarea
                    rows={3}
                    value={localPinnedInstructions}
                    onChange={(e) => setLocalPinnedInstructions(e.target.value)}
                    placeholder="Global guidelines (e.g. 'Never write comments in code', 'Always output bulleted lists')"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

{activeTab === 'system' && (
              <div className="space-y-6">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Artha GPT runs 100% locally. The messages, chats, folders, memory, and configurations are stored in your browser's IndexedDB. No server database is used.
                </p>

                <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-300">Wipe All Application Data</h4>
                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                      This action will delete all IndexedDB collections. Your chat history, pinned parameters, templates, and profile context cannot be recovered.
                    </p>
                    <button
                      onClick={handleClearDatabase}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-550 border border-red-500/30 hover:border-red-500/80 text-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Erase Local Database</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button */}
          <div className="border-t border-zinc-800 pt-3 mt-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-555 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-555/10 text-white rounded-xl text-sm font-semibold cursor-pointer transition-all"
            >
              Save Changes
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
