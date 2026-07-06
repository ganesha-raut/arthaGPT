import { create } from 'zustand';
import { db } from '../database/db';
import { Template } from '../types';

export type PersonaId = 'default' | 'coder' | 'writer' | 'teacher' | 'analyst' | 'researcher';

export interface Persona {
  id: PersonaId;
  name: string;
  emoji: string;
  description: string;
  color: string;         // Tailwind text color
  bgColor: string;       // Tailwind bg color
  borderColor: string;   // Tailwind border color
  systemPrompt: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'default',
    name: 'Artha GPT',
    emoji: '✨',
    description: 'General-purpose AI',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    systemPrompt: 'You are Artha GPT, a warm, extremely friendly, and highly intelligent AI assistant created by Ganesh Raut. Speak in a user-friendly, conversational, and natural tone, just like ChatGPT and Gemini. Match the user\'s language naturally (Hinglish, Marathi, or English). Be supportive, polite, and explain things clearly with structured formatting.'
  },
  {
    id: 'coder',
    name: 'Coder',
    emoji: '🧑‍💻',
    description: 'Code & debugging expert',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    systemPrompt: 'You are an expert software engineer. Focus on writing clean, efficient, well-documented code. Always explain your code choices. Prefer practical examples over theory. Use code blocks with proper language tags.'
  },
  {
    id: 'writer',
    name: 'Writer',
    emoji: '✍️',
    description: 'Creative writing & blogs',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    systemPrompt: 'You are a professional writer and content creator. Craft engaging, well-structured content with vivid language. Use varied sentence lengths, strong verbs, and compelling narratives. Always write with clarity and elegance.'
  },
  {
    id: 'teacher',
    name: 'Teacher',
    emoji: '🎓',
    description: 'Step-by-step explanations',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    systemPrompt: 'You are a patient, encouraging teacher. Break down complex topics into simple steps. Use analogies, real-world examples, and check for understanding. Always explain "why" not just "what". Structure answers with clear headings and examples.'
  },
  {
    id: 'analyst',
    name: 'Analyst',
    emoji: '💼',
    description: 'Business & data analysis',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    systemPrompt: 'You are a senior business analyst. Provide structured, data-driven insights. Use frameworks like SWOT, PESTLE, or cost-benefit analysis. Present findings with tables, bullet points, and clear recommendations. Be concise and professional.'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    emoji: '🔬',
    description: 'Deep research & analysis',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    systemPrompt: 'You are a thorough academic researcher. Provide well-researched, nuanced answers. Acknowledge multiple perspectives, note limitations, and cite reasoning. Use structured arguments with evidence. Be thorough and intellectually rigorous.'
  }
];

interface ChatState {
  activeChatId: string | null;
  isSidebarOpen: boolean;
  sidebarWidth: number;
  isRightPanelOpen: boolean;
  isImageStudioOpen: boolean;
  isStreaming: boolean;
  abortController: AbortController | null;
  searchQuery: string;
  currentInput: string;
  selectedTemplate: Template | null;
  activeModel: string;
  systemPrompt: string;
  userBio: string;
  temperature: number;
  pinnedInstructions: string;
  activePersonaId: PersonaId;
  isWebSearchActive: boolean;
  activeSandboxCode: string | null;

  // Actions
  setActiveChatId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelOpen: (open: boolean) => void;
  setImageStudioOpen: (open: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  setSearchQuery: (query: string) => void;
  setCurrentInput: (input: string) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setActivePersonaId: (id: PersonaId) => void;
  setWebSearchActive: (active: boolean) => void;
  setSandboxCode: (code: string | null) => void;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  isSidebarOpen: true,
  sidebarWidth: 280,
  isRightPanelOpen: false,
  isImageStudioOpen: false,
  isStreaming: false,
  abortController: null,
  searchQuery: '',
  currentInput: '',
  selectedTemplate: null,
  activeModel: 'llama-3.1-8b-instant',
  systemPrompt: 'You are Artha GPT, a warm, extremely friendly, and conversational AI assistant. Speak like ChatGPT and Gemini.',
  userBio: '',
  temperature: 0.7,
  pinnedInstructions: '',
  activePersonaId: 'default',
  isWebSearchActive: false,
  activeSandboxCode: null,

  setActiveChatId: (id) => set({ activeChatId: id, selectedTemplate: null }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
  setImageStudioOpen: (open) => set({ isImageStudioOpen: open }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setAbortController: (controller) => set({ abortController: controller }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentInput: (input) => set({ currentInput: input }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setActivePersonaId: (id) => set({ activePersonaId: id }),
  setWebSearchActive: (active) => set({ isWebSearchActive: active }),
  setSandboxCode: (code) => set({ activeSandboxCode: code }),

  loadSettings: async () => {
    try {
      const activeModelSet = await db.settings.get('activeModel');
      const systemPromptSet = await db.settings.get('systemPrompt');
      const userBioSet = await db.settings.get('userBio');
      const temperatureSet = await db.settings.get('temperature');
      const pinnedInstructionsSet = await db.settings.get('pinnedInstructions');
      const personaSet = await db.settings.get('activePersonaId');

      set({
        activeModel: activeModelSet?.value ?? 'llama-3.1-8b-instant',
        systemPrompt: systemPromptSet?.value ?? 'You are Artha GPT, a warm, smart, helpful AI assistant.',
        userBio: userBioSet?.value ?? '',
        temperature: temperatureSet?.value ?? 0.7,
        pinnedInstructions: pinnedInstructionsSet?.value ?? '',
        activePersonaId: personaSet?.value ?? 'default',
      });
    } catch (error) {
      console.error('Failed to load settings from DB', error);
    }
  },

  updateSetting: async (key, value) => {
    try {
      await db.settings.put({ key, value });
      set({ [key]: value } as unknown as Partial<ChatState>);
    } catch (error) {
      console.error(`Failed to save setting ${key} to DB`, error);
    }
  },
}));
