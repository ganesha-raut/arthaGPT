import { db } from '../database/db';
import { estimateTokens } from './tokenizer';

export interface ContextPayload {
  systemPrompt: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  memoriesStr: string;
}

export function stripBase64Images(text: string): string {
  if (typeof text !== 'string') return text;
  if (!text.includes('data:image/')) return text;

  let result = '';
  let currentIndex = 0;

  while (true) {
    const startIndex = text.indexOf('data:image/', currentIndex);
    if (startIndex === -1) {
      result += text.slice(currentIndex);
      break;
    }

    result += text.slice(currentIndex, startIndex);

    // Find the end of the base64 URI (closing parenthesis in markdown, quotes, or space)
    let endIndex = text.indexOf(')', startIndex);
    if (endIndex === -1) {
      endIndex = text.indexOf('"', startIndex);
    }
    if (endIndex === -1) {
      endIndex = text.indexOf(' ', startIndex);
    }
    if (endIndex === -1) {
      endIndex = text.length;
    }

    result += '[base64_image_data]';
    currentIndex = endIndex;
  }

  return result;
}

export async function buildContext(
  chatId: string,
  userPrompt: string,
  systemPromptTemplate: string,
  userBio: string,
  pinnedInstructions: string
): Promise<ContextPayload> {
  // 1. Fetch memories from IndexedDB
  const memories = await db.memory.toArray();
  let memoriesStr = '';
  if (memories.length > 0) {
    memoriesStr = memories
      .map((m: any) => `[Category: ${m.category}] ${m.key} = ${m.value}`)
      .join('\n');
  }

  // 2. Build the System Prompt
  let systemPrompt = `${systemPromptTemplate}

CRITICAL RULES:
1. 🎨 IMAGE GENERATION:
   - When the user asks to generate, create, draw, or make an image/photo (e.g. "generate/create/draw/make image/photo")
   - ALWAYS respond with exactly this marker on a new line: "Here you go! 🎨\nGENERATE_IMAGE: [detailed visual description]"
   - DO NOT decline image requests, always output the GENERATE_IMAGE marker.

2. RESPONSE FORMAT (IMPORTANT):
   - ALWAYS respond in rich, well-structured Markdown.
   - Use headings (# ## ###), paragraphs, **bold**, *italic*, bullet lists (- item), numbered lists (1. item), tables, blockquotes (>), and inline code.
   - For code: use fenced code blocks with language tags e.g. python, javascript, html, bash etc. Always write the FULL code in ONE single code block per file, prepending the file name as a comment on the very first line inside the code block. Do NOT split a single file's code into multiple blocks.
   - Keep responses clear, detailed, and beautifully structured.
   - NEVER send raw unformatted walls of text.

3. AUTO-SAVE PERSONALIZATION (CRITICAL):
   - Actively analyze the user's messages for personal information, demographic details, hobbies, relationships, current projects, plans, and explicitly stated preferences/instructions.
   - Automatically decide when to extract, edit, or append keypoints to make the user's experience personalized.
   - To save or update any memory, include "SAVE: category.key=value" on a new line at the absolute end of your response.
   - Standard categories:
     - "demographics" (e.g. name, age, job, location) -> SAVE: demographics.name=Ganesh
     - "interests" (hobbies, active engagements) -> SAVE: interests.topic=UI development
     - "relationships" (family, key connections) -> SAVE: relationships.brother=Rohan
     - "plans" (active projects, dated events) -> SAVE: plans.project=Artha Chatbot
     - "instructions" (custom system behaviors, rules, corrections) -> SAVE: instructions.codeStyle=clean Tailwind first
   - When updating or refining existing keypoints, reuse the same category and key (it will overwrite the old value with the new one).

4. Be helpful, extremely conversational, friendly, polite, and detailed. Explain things clearly with structured headings and practical examples.
`;

  if (userBio && userBio.trim()) {
    systemPrompt += `\n\n[USER PROFILE BIO]:\n${userBio}`;
  }

  if (pinnedInstructions && pinnedInstructions.trim()) {
    systemPrompt += `\n\n[USER PINNED INSTRUCTIONS]:\n${pinnedInstructions}`;
  }

  if (memoriesStr) {
    systemPrompt += `\n\n[RETRIEVED LOCAL MEMORIES]:\n${memoriesStr}`;
  }

  // 3. Fetch past messages for this chat
  const rawMessages = await db.messages
    .where('chatId')
    .equals(chatId)
    .sortBy('createdAt');

  // Filter messages up to token budget
  const historyTokenBudget = 3000;
  let currentHistoryTokens = 0;

  const historyMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (let i = rawMessages.length - 1; i >= 0; i--) {
    const msg = rawMessages[i];
    if (msg.status === 'failed') continue;

    // Strip huge base64 strings so we don't blow up token count or HTTP payload sizes (413 Payload Too Large)
    const cleanContent = stripBase64Images(msg.content);
    const msgTokens = estimateTokens(cleanContent);
    if (currentHistoryTokens + msgTokens > historyTokenBudget) {
      break; // History budget exceeded
    }

    currentHistoryTokens += msgTokens;
    historyMessages.unshift({ role: msg.role as 'user' | 'assistant', content: cleanContent });
  }

  // Build final messages array
  const finalMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userPrompt }
  ];

  return {
    systemPrompt,
    messages: finalMessages,
    memoriesStr
  };
}

/**
 * Parses assistant message content for memory markers and saves them in IndexedDB.
 * Returns the cleaned assistant message (without SAVE markers).
 */
export async function processMemoryMarkers(text: string): Promise<string> {
  if (typeof text !== 'string') return text;

  // Capture SAVE: category.key=value lines
  const saveRegex = /SAVE:\s*([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_\-]+)\s*=\s*([^\n\r]+)/gi;
  let match;
  const matches: { category: string; key: string; value: string }[] = [];

  const execRegex = new RegExp(saveRegex);
  while ((match = execRegex.exec(text)) !== null) {
    matches.push({
      category: match[1].trim(),
      key: match[2].trim(),
      value: match[3].trim()
    });
  }

  if (matches.length > 0) {
    const now = Date.now();
    for (const item of matches) {
      const existing = await db.memory
        .where({ category: item.category, key: item.key })
        .first();

      if (existing) {
        await db.memory.update(existing.id, { value: item.value, createdAt: now });
      } else {
        await db.memory.add({
          id: `mem-${Math.random().toString(36).substring(2, 11)}`,
          category: item.category,
          key: item.key,
          value: item.value,
          createdAt: now
        });
      }
    }
  }

  // Strip all SAVE: statements globally
  let cleaned = text.replace(/SAVE:\s*[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\s*=\s*[^\n\r]*/gi, '');
  
  // Clean up any residual empty lines or lines starting with SAVE:
  cleaned = cleaned.split('\n')
    .filter(line => !line.trim().toUpperCase().startsWith('SAVE:'))
    .join('\n')
    .trim();

  return cleaned;
}
