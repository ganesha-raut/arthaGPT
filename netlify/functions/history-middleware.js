/**
 * History Summarization Middleware
 * Reduces token usage by summarizing old chat history
 */

exports.summarizeHistory = (history, maxLength = 1500) => {
  if (!history || history.length <= maxLength) return history;
  
  const lines = history.split('\n').filter(l => l.trim());
  
  // Keep ONLY last 5-6 user messages to stay within token budget
  const userLines = lines.filter(l => l.startsWith('User: '));
  
  if (userLines.length > 6) {
    // Take only the last 6 messages
    const recentLines = userLines.slice(-6);
    return recentLines.join('\n');
  }
  
  // Fallback: keep last N characters
  if (history.length > maxLength) {
    return history.slice(-maxLength);
  }
  
  return history;
};

/**
 * Build chat context for API call
 * Keeps token usage under 6000 (Groq limit)
 */
exports.buildChatContext = (history, dataset, personalData, prompt) => {
  // Count approximate tokens (rough estimate: 1 token ≈ 4 chars)
  const promptTokens = Math.ceil(prompt.length / 4);
  const datasetTokens = Math.ceil((dataset || '').length / 4);
  const personalDataTokens = Math.ceil(JSON.stringify(personalData).length / 4);
  
  let totalTokens = promptTokens + datasetTokens + personalDataTokens;
  
  // If already over budget, trim history
  if (totalTokens > 5500) {
    // Only use last 2-3 user messages
    const userLines = history.split('\n')
      .filter(l => l.startsWith('User: '))
      .slice(-3);
    return userLines.join('\n');
  }
  
  // Otherwise return summarized history
  return exports.summarizeHistory(history, 3000);
};

/**
 * Clear all user data including localStorage
 */
exports.clearAllData = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('astra_chats_v2');
    localStorage.removeItem('astra_liked_messages');
    localStorage.removeItem('astra_dataset');
    localStorage.removeItem('astra_personal_data');
    localStorage.removeItem('astra_theme');
    localStorage.removeItem('astra_last_chat');
  }
  return { cleared: true };
};
