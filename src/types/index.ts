export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: number; // 0 or 1 for indexing
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  content?: string; // Base64 or text representation of file content
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  updatedAt: number;
  status: 'sending' | 'streaming' | 'success' | 'failed';
  model?: string;
  generationTime?: number; // in ms
  tokenCount?: number;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  description: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: any;
}

export interface Memory {
  id: string;
  category: string;
  key: string;
  value: string;
  createdAt: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
}

export interface ArtifactVersion {
  version: number;
  content: string; // The artifact payload (HTML code, slides JSON, spreadsheets grid, etc.)
  timestamp: number;
}

export interface Artifact {
  id: string;
  chatId: string;
  type: 'website' | 'presentation' | 'roadmap' | 'mindmap' | 'spreadsheet' | 'checklist' | 'code_project' | 'document';
  title: string;
  currentContent: string;
  currentVersion: number;
  history: ArtifactVersion[];
  createdAt: number;
  updatedAt: number;
}
