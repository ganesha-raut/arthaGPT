import { db } from '../database/db';
import { Artifact, ArtifactVersion } from '../types';

export interface AgentTask {
  id: string;
  agentName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message: string;
}

/**
 * Classifies a user prompt into a specific artifact category.
 */
export function classifyArtifactType(prompt: string): 'website' | 'presentation' | 'roadmap' | 'mindmap' | 'spreadsheet' | 'checklist' | 'document' {
  const text = prompt.toLowerCase();
  
  if (
    text.includes('website') || 
    text.includes('landing page') || 
    text.includes('calculator') || 
    text.includes('dashboard') || 
    text.includes('react') || 
    text.includes('app') || 
    text.includes('portfolio') ||
    text.includes('ui')
  ) {
    return 'website';
  }
  
  if (text.includes('presentation') || text.includes('slide') || text.includes('deck') || text.includes('ppt')) {
    return 'presentation';
  }
  
  if (text.includes('roadmap') || text.includes('milestones') || text.includes('gantt') || text.includes('timeline')) {
    return 'roadmap';
  }

  if (text.includes('mindmap') || text.includes('brainstorm') || text.includes('mind map')) {
    return 'mindmap';
  }
  
  if (
    text.includes('spreadsheet') || 
    text.includes('excel') || 
    text.includes('sheet') || 
    text.includes('table') || 
    text.includes('csv') || 
    text.includes('database')
  ) {
    return 'spreadsheet';
  }
  
  if (text.includes('checklist') || text.includes('todo') || text.includes('to-do') || text.includes('tasks') || text.includes('checklist')) {
    return 'checklist';
  }
  
  return 'document';
}

/**
 * Scaffolds the specialist agent tasks sequence based on the target artifact type.
 */
export function scaffoldAgentTasks(artifactType: string): AgentTask[] {
  return [
    {
      id: 'task-plan',
      agentName: 'Planner Agent',
      status: 'pending',
      message: 'Analyzing user request and estimating scope'
    },
    {
      id: 'task-design',
      agentName: 'UI Designer Agent',
      status: 'pending',
      message: 'Defining design systems, themes, and layout parameters'
    },
    {
      id: 'task-code',
      agentName: 'Frontend Agent',
      status: 'pending',
      message: `Compiling ${artifactType} components and structuring code`
    },
    {
      id: 'task-seo',
      agentName: 'SEO & Performance Agent',
      status: 'pending',
      message: 'Running accessibility, performance audits and cleanups'
    },
    {
      id: 'task-merge',
      agentName: 'Merge Agent',
      status: 'pending',
      message: 'Combining specialist outputs into final Canvas workspace'
    }
  ];
}

/**
 * Creates or updates an artifact in IndexedDB.
 */
export async function saveArtifact(
  chatId: string,
  type: Artifact['type'],
  title: string,
  content: string
): Promise<Artifact> {
  const now = Date.now();
  
  // Search for an existing artifact of the same type in this conversation
  const existing = await db.artifacts
    .where({ chatId, type })
    .first();

  if (existing) {
    const nextVersion = existing.currentVersion + 1;
    const versionEntry: ArtifactVersion = {
      version: nextVersion,
      content,
      timestamp: now
    };
    
    const updatedArtifact: Artifact = {
      ...existing,
      currentContent: content,
      currentVersion: nextVersion,
      history: [...existing.history, versionEntry],
      updatedAt: now
    };
    
    await db.artifacts.put(updatedArtifact);
    return updatedArtifact;
  } else {
    // Create new artifact
    const newId = `art-${Math.random().toString(36).substring(2, 11)}`;
    const versionEntry: ArtifactVersion = {
      version: 1,
      content,
      timestamp: now
    };
    
    const newArtifact: Artifact = {
      id: newId,
      chatId,
      type,
      title,
      currentContent: content,
      currentVersion: 1,
      history: [versionEntry],
      createdAt: now,
      updatedAt: now
    };
    
    await db.artifacts.add(newArtifact);
    return newArtifact;
  }
}

/**
 * Extracts clean code block content from Markdown blocks (e.g. ```html ... ```)
 * for direct rendering in iframe preview mode. Prioritizes html tagged blocks.
 */
export function extractCodeBlock(text: string, type: string): string {
  if (type === 'website') {
    // 1. Try to find a code block explicitly tagged as html, xml, svg, or xhtml
    const taggedMatch = text.match(/```(?:html|xml|svg|xhtml)\s*([\s\S]*?)(?:```|$)/i);
    if (taggedMatch) {
      return taggedMatch[1].trim();
    }

    // 2. Try to find a code block tagged as javascript/typescript (useful for jsx/tsx) containing layout code
    const jsMatch = text.match(/```(?:javascript|typescript|js|jsx|tsx)\s*([\s\S]*?)(?:```|$)/i);
    if (jsMatch && (jsMatch[1].includes('<') || jsMatch[1].includes('return'))) {
      return jsMatch[1].trim();
    }

    // 3. Fallback: find any code block (e.g., untagged ``` ... ```)
    const anyBlockMatch = text.match(/```\s*([\s\S]*?)(?:```|$)/i);
    if (anyBlockMatch) {
      return anyBlockMatch[1].trim();
    }

    // 4. Native html structure check fallback
    const tagMatch = text.match(/(<html[\s\S]*?<\/html>)/i);
    if (tagMatch) {
      return tagMatch[1].trim();
    }
  }
  return text;
}

