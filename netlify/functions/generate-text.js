/**
 * Netlify Function: Generate Text
 *
 * Uses Groq API with llama-3.1-8b-instant model (fast + smart)
 * All secrets are hidden - never exposed to browser
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { prompt, history = '', dataset = '', personalData = '', previousImagePrompt = '' } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // ─── COMPACT SYSTEM PROMPT (TOKEN OPTIMIZED) ────────────────────────────────
    let SYSTEM_PROMPT = `You are Artha GPT, created by Ganesha Raut. Warm, smart, helpful AI assistant.

CRITICAL RULES:
1. 🎨 IMAGE GENERATION:
   - When user says: "generate/create/draw/make image/photo" (Eng) or "photo/picture/image/बनव/दाखव/काढ" (Marathi)
   - ALWAYS respond with: "Here you go! 🎨\nGENERATE_IMAGE: [detailed visual description]"
   - Example: User: "create a cat" → Response: "Here you go! 🎨\nGENERATE_IMAGE: A cute fluffy orange and white cat sitting on a sunny windowsill"
   - DO NOT decline image requests, always output GENERATE_IMAGE marker

2. CODING: Show folder tree first, then full code per file, setup steps

3. SAVE DATA: When user shares info (name/email/company), add "SAVE: category.key=value"

4. Keep responses SHORT unless asked for details

5. Use [RETRIEVED MEMORY] for context about user`;

    // Add personal data context (compact)
    if (personalData && personalData.trim()) {
      SYSTEM_PROMPT += `\n\nUSER PROFILE: ${personalData}`;
    }

    // Add memories if available
    if (dataset) {
      const cappedDataset = dataset.length > 800 ? dataset.slice(-800) : dataset;
      SYSTEM_PROMPT += `\n[RETRIEVED MEMORY]\n${cappedDataset}`;
    }

    // Previous image context
    if (previousImagePrompt) {
      SYSTEM_PROMPT += `\n[PREV_IMAGE: ${previousImagePrompt}]`;
    }

    // ─── BUILD MESSAGES ARRAY (History Summarized for Token Budget) ───────────
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        // Prevent huge token usage by trimming extremely long history messages
        if (msg.content && msg.content.length > 1500) {
          msg.content = msg.content.slice(0, 1500) + '...';
        }
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Add current user prompt
    messages.push({ role: "user", content: prompt });

    // ─── GROQ API CALL ────────────────────────────────────────────────────────
    const API_KEY = process.env.GROQ_API_KEY || "";

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",  // Changed from llama-3.3-70b - more stable
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `API error: ${response.status}`
        })
      };
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content;

    if (!text) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Empty response from Groq API' })
      };
    }

    // Remove [RETRIEVED MEMORY] sections from response
    text = text.replace(/\[RETRIEVED MEMORY\][\s\S]*?(?=\n\n|$)/g, '').trim();

    // Return in same format as before — frontend needs no changes
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        text: text
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
