import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { db } from '../../../database/db';
import { useCanvasStore } from '../../../store/canvasStore';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistRendererProps {
  content: string;
}

export const ChecklistRenderer: React.FC<ChecklistRendererProps> = ({ content }) => {
  const { activeArtifactId } = useCanvasStore();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newVal, setNewVal] = useState('');

  // Parse markdown checkbox list lines into local items state
  useEffect(() => {
    const lines = content.split('\n');
    const parsedItems: ChecklistItem[] = [];

    lines.forEach((line, idx) => {
      const match = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
      if (match) {
        parsedItems.push({
          id: `item-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          checked: match[1].toLowerCase() === 'x',
          label: match[2].trim()
        });
      }
    });

    if (parsedItems.length === 0 && content.trim()) {
      // If there is general text, try parsing bullet points as unchecked items
      const bulletLines = content.split('\n');
      bulletLines.forEach((line, idx) => {
        const bulletMatch = line.match(/^-\s+(.+)$/);
        if (bulletMatch && !line.includes('[ ]') && !line.includes('[x]')) {
          parsedItems.push({
            id: `item-${idx}`,
            checked: false,
            label: bulletMatch[1].trim()
          });
        }
      });
    }

    setItems(parsedItems.length > 0 ? parsedItems : [
      { id: 'item-default-1', label: 'Define project parameters', checked: true },
      { id: 'item-default-2', label: 'Write workspace modules', checked: false }
    ]);
  }, [content]);

  // Synchronizes the item updates back to IndexedDB
  const syncToDatabase = async (updatedItems: ChecklistItem[]) => {
    if (!activeArtifactId) return;

    // Convert items list back to markdown checklist syntax
    const markdownText = updatedItems
      .map((item) => `- [${item.checked ? 'x' : ' '}] ${item.label}`)
      .join('\n');

    try {
      const artifact = await db.artifacts.get(activeArtifactId);
      if (artifact) {
        await db.artifacts.update(activeArtifactId, {
          currentContent: markdownText,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.error('Failed to sync checklist edits to database', err);
    }
  };

  const handleToggle = (id: string) => {
    const nextItems = items.map((item) => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(nextItems);
    syncToDatabase(nextItems);
  };

  const handleDelete = (id: string) => {
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    syncToDatabase(nextItems);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVal.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      label: newVal.trim(),
      checked: false
    };

    const nextItems = [...items, newItem];
    setItems(nextItems);
    setNewVal('');
    syncToDatabase(nextItems);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const percentage = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-6 overflow-hidden select-none">
      
      {/* Header Info */}
      <div className="pb-4 border-b border-zinc-900 mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
            <ClipboardList className="w-4.5 h-4.5 text-emerald-450" />
            <span>Interactive Roadmap Checklist</span>
          </span>
          <span className="text-xs font-mono font-bold text-emerald-450 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
            {checkedCount} / {items.length} Completed ({percentage}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-900 border border-zinc-850 h-1.5 rounded-full mt-4 overflow-hidden">
          <div 
            className="bg-emerald-555 h-full rounded-full transition-all duration-550 ease-out" 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Task List items container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin select-text">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${
              item.checked
                ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-400 hover:bg-emerald-500/10'
                : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-850 hover:border-zinc-800 text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div 
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  item.checked 
                    ? 'border-emerald-500 bg-emerald-500 text-black' 
                    : 'border-zinc-750 hover:border-zinc-600'
                }`}
              >
                {item.checked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3.5] text-zinc-950" />}
              </div>
              <span className={`text-sm font-medium transition-all ${item.checked ? 'line-through opacity-75' : ''}`}>
                {item.label}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent toggling
                handleDelete(item.id);
              }}
              className="p-1 rounded-md text-zinc-550 hover:text-red-400 hover:bg-zinc-950/60 cursor-pointer transition-colors"
              title="Delete item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Input bar to add item */}
      <form onSubmit={handleAddItem} className="pt-4 border-t border-zinc-900 mt-4 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          placeholder="Add a new checklist task..."
          className="flex-1 bg-zinc-900/50 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder-zinc-550 select-text"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-4 py-2.5 bg-emerald-555 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </form>

    </div>
  );
};
