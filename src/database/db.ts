import Dexie, { type Table } from 'dexie';
import { Chat, Message, Template, Setting, Memory, CacheEntry, Artifact } from '../types';

export class AstraGPTDatabase extends Dexie {
  chats!: Table<Chat, string>;
  messages!: Table<Message, string>;
  templates!: Table<Template, string>;
  settings!: Table<Setting, string>;
  memory!: Table<Memory, string>;
  cache!: Table<CacheEntry, string>;
  artifacts!: Table<Artifact, string>;

  constructor() {
    super('AstraGPT');
    this.version(1).stores({
      chats: 'id, title, createdAt, updatedAt, pinned',
      messages: 'id, chatId, role, createdAt',
      templates: 'id, name, createdAt',
      settings: 'key',
      memory: 'id, category, key, createdAt',
      cache: 'key, expiresAt',
      artifacts: 'id, chatId, type, updatedAt',
    });
  }
}

export const db = new AstraGPTDatabase();

// Seed initial data
db.on('populate', () => {
  // Seed settings
  db.settings.bulkAdd([
    { key: 'activeModel', value: 'llama-3.1-8b-instant' },
    { key: 'systemPrompt', value: 'You are Astra GPT, created by Ganesh Raut. Warm, smart, helpful AI assistant.' },
    { key: 'userBio', value: '' },
    { key: 'temperature', value: 0.7 },
    { key: 'maxTokens', value: 2048 },
    { key: 'pinnedInstructions', value: '' }
  ]);

  // Seed default templates
  const now = Date.now();
  db.templates.bulkAdd([
    {
      id: 'template-code-review',
      name: 'Code Reviewer',
      description: 'Act as a Senior Engineer and review code for bugs and improvements.',
      content: 'Act as a senior software engineer. Review my code for potential bugs, security vulnerabilities, and style issues. Suggest refactoring improvements with clean code blocks: \n\n[INSERT CODE HERE]',
      createdAt: now
    },
    {
      id: 'template-study-helper',
      name: 'Study Assistant',
      description: 'Break down complex concepts into simple explanations.',
      content: 'Act as an expert tutor. Explain the following concept in clear, simple terms. Break it down step-by-step, use real-world analogies, and provide a short interactive 3-question quiz at the end to check my understanding:\n\n[INSERT TOPIC HERE]',
      createdAt: now - 1000
    },
    {
      id: 'template-creative-writing',
      name: 'Creative Writer',
      description: 'Refine and polish writing, or help write a story.',
      content: 'Act as a professional creative writer. Help me expand, refine, and polish my draft, maintaining an engaging tone, improving flow, and enhancing vocabulary. Keep the original intent intact:\n\n[INSERT TEXT HERE]',
      createdAt: now - 2000
    },
    {
      id: 'template-sql-optimizer',
      name: 'SQL Optimizer',
      description: 'Analyze and optimize SQL queries.',
      content: 'Act as a Senior Database Administrator. Analyze the following SQL query, identify performance bottlenecks, explain the queries shortcomings, and provide an optimized query along with recommended indexes:\n\n[INSERT SQL QUERY HERE]',
      createdAt: now - 3000
    }
  ]);
});
