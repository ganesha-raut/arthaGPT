import { create } from 'zustand';

interface CanvasState {
  activeArtifactId: string | null;
  isCanvasOpen: boolean;
  canvasWidth: number;
  activeTab: 'preview' | 'code' | 'diff' | 'history';
  selectedVersion: number | null; // null represents the latest version

  // Actions
  setActiveArtifactId: (id: string | null) => void;
  setCanvasOpen: (open: boolean) => void;
  setCanvasWidth: (width: number) => void;
  setActiveTab: (tab: 'preview' | 'code' | 'diff' | 'history') => void;
  setSelectedVersion: (version: number | null) => void;
  closeCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeArtifactId: null,
  isCanvasOpen: false,
  canvasWidth: 600,
  activeTab: 'preview',
  selectedVersion: null,

  setActiveArtifactId: (id) => set({ 
    activeArtifactId: id, 
    isCanvasOpen: id !== null,
    selectedVersion: null,
    activeTab: 'preview' 
  }),
  setCanvasOpen: (open) => set({ isCanvasOpen: open }),
  setCanvasWidth: (width) => set({ canvasWidth: width }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  closeCanvas: () => set({ activeArtifactId: null, isCanvasOpen: false, selectedVersion: null })
}));
