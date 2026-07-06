/**
 * Simple offline token estimation
 * Standard heuristic: ~4 characters per token in English
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Handle basic word structures and whitespace variations
  return Math.ceil(text.trim().length / 4.0);
}
