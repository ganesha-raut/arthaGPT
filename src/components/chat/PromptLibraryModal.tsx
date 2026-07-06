import React, { useState } from 'react';
import { X, Search, Plus, Trash2, Check } from 'lucide-react';
import { db } from '../../database/db';
import { Template } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (content: string) => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');

  // Fetch templates from Dexie DB
  const templates = useLiveQuery(() => db.templates.toArray());

  if (!isOpen) return null;

  const filteredTemplates = templates?.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;

    const newTemplate: Template = {
      id: `template-${Math.random().toString(36).substring(2, 11)}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom user template',
      content: newContent.trim(),
      createdAt: Date.now(),
    };

    await db.templates.add(newTemplate);
    
    // Clear form
    setNewName('');
    setNewDesc('');
    setNewContent('');
    setShowAddForm(false);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the template
    if (confirm('Are you sure you want to delete this template?')) {
      await db.templates.delete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-2xl h-[560px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100">Prompt & Template Library</h3>
            <p className="text-xs text-zinc-450 mt-0.5">Quickly start conversations with engineered templates.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-850 bg-zinc-900/30">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder-zinc-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-555 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'View Library' : 'Create Template'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/10">
          {showAddForm ? (
            /* Add Template Form */
            <form onSubmit={handleCreateTemplate} className="space-y-4 max-w-lg mx-auto">
              <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-850 pb-2 mb-2">Create Custom Template</h4>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-450 uppercase mb-1.5 tracking-wider">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deno Code Writer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-750"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-450 uppercase mb-1.5 tracking-wider">Short Description</label>
                <input
                  type="text"
                  placeholder="e.g. Generate strict TypeScript files for Deno compile specs."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-750"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-450 uppercase mb-1.5 tracking-wider">Template Prompt Content</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Instructions for the AI assistant. Use [INSERT HERE] to denote where your input will be."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-750 resize-none font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-555 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Add to Library
                </button>
              </div>
            </form>
          ) : (
            /* Templates Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates && filteredTemplates.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-550 text-xs bg-zinc-950/20 rounded-2xl border border-zinc-850/80">
                  No templates match your search query.
                </div>
              ) : (
                filteredTemplates?.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTemplate(t.content);
                      onClose();
                    }}
                    className="flex flex-col justify-between p-4 bg-zinc-950/40 hover:bg-zinc-950/90 border border-zinc-850 hover:border-zinc-700/60 rounded-xl cursor-pointer group transition-all hover:shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm text-zinc-250 group-hover:text-zinc-100 transition-colors">
                          {t.name}
                        </span>
                        {t.id.startsWith('template-code') || t.id.startsWith('template-study') || t.id.startsWith('template-creative') || t.id.startsWith('template-sql') ? (
                          <span className="text-[9px] text-zinc-500 border border-zinc-850 bg-zinc-900 px-1 py-0.5 rounded uppercase select-none">
                            System
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleDeleteTemplate(t.id, e)}
                            className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-900/60 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-450 leading-relaxed line-clamp-2">
                        {t.description}
                      </p>
                    </div>

                    <div className="mt-3.5 flex items-center justify-end text-[10px] text-emerald-400 font-semibold gap-1 opacity-0 group-hover:opacity-100 transition-all select-none">
                      <span>Use Template</span>
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
