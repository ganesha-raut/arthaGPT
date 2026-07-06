import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Netlify function emulator middleware for local development (Vite dev server)
const netlifyFunctionEmulator = () => ({
  name: 'netlify-function-emulator',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/.netlify/functions/')) {
        const url = new URL(req.url, 'http://localhost');
        const functionName = url.pathname.replace('/.netlify/functions/', '');

        // Collect body data for POST requests
        let body = '';
        if (req.method === 'POST') {
          await new Promise<void>((resolve) => {
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => resolve());
          });
        }

        try {
          // ──────────────────── WEB SEARCH (GET) ────────────────────
          if (functionName === 'web-search' || functionName.startsWith('web-search?')) {
            const query = url.searchParams.get('q') || '';
            if (!query) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing q parameter' }));
              return;
            }

            // Detect if user is searching for or sharing a direct URL/domain name
            const urlMatch = query.match(/(https?:\/\/[^\s\)\*\#]+)/i) || 
                             query.match(/\b([a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s\)\*\#]*)?)\b/i);
            
            let resultsText = "";

            if (urlMatch && !query.toLowerCase().includes('google.com') && !query.toLowerCase().includes('yahoo.com')) {
              let directUrl = urlMatch[1];
              if (!directUrl.startsWith('http://') && !directUrl.startsWith('https://')) {
                directUrl = 'https://' + directUrl;
              }
              
              // Direct URL scraping
              try {
                const scrapeRes = await fetch(directUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                  }
                });
                if (scrapeRes.ok) {
                  const html = await scrapeRes.text();
                  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
                  const title = titleMatch ? titleMatch[1].trim() : 'No Title';
                  let bodyText = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<\/div>|<\/p>|<\/h[1-6]>|<\/li>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\n+/g, '\n')
                    .trim();
                  resultsText = `[DIRECT URL CONTENT]\n**URL**: ${directUrl}\n**Title**: ${title}\n**Scraped Page Content**:\n${bodyText.slice(0, 8000)}`;
                } else {
                  resultsText = `[ERROR]: Failed to fetch URL directly (Status: ${scrapeRes.status})`;
                }
              } catch (e: any) {
                resultsText = `[ERROR]: Failed to scrape website "${directUrl}": ${e.message}`;
              }
            } else {
              // DuckDuckGo Lite (Highly resilient)
              try {
                const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
                  },
                  body: `q=${encodeURIComponent(query)}`
                });

                if (ddgRes.ok) {
                  const html = await ddgRes.text();
                  const results: string[] = [];
                  let match;
                  let count = 0;
                  const reg = /<td[^>]+class="result-title"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
                  
                  while ((match = reg.exec(html)) !== null && count < 5) {
                    const link = match[1].replace(/&amp;/g, '&');
                    const title = match[2].replace(/<[^>]+>/g, '').trim();
                    const snippet = match[3].replace(/<[^>]+>/g, '').trim();
                    if (link && title && snippet) {
                      results.push(`- **Title**: ${title}\n  **Link**: ${link}\n  **Snippet**: ${snippet}`);
                      count++;
                    }
                  }
                  if (results.length > 0) {
                    resultsText = results.join('\n\n');
                  }
                }
              } catch (ddgErr) {
                console.warn('DDG Lite emulator failed:', ddgErr);
              }

              // Fallback to Yahoo Search scraping with snippets
              if (!resultsText || resultsText.length < 50) {
                try {
                  const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
                  const yahooRes = await fetch(yahooUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                  });
                  if (yahooRes.ok) {
                    const html = await yahooRes.text();
                    const results: string[] = [];
                    let match;
                    const reg = /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?:<\/li>|<h3|$)/gi;
                    let count = 0;
                    while ((match = reg.exec(html)) !== null && count < 5) {
                      const link = match[1].replace(/&amp;/g, '&');
                      const title = match[2].replace(/<[^>]+>/g, '').trim();
                      const remainingBlock = match[3] || '';
                      
                      const snippetMatch = /<p[^>]*>([\s\S]*?)<\/p>|<div[^>]+class="compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(remainingBlock);
                      const snippet = snippetMatch ? (snippetMatch[1] || snippetMatch[2]).replace(/<[^>]+>/g, '').trim() : '';

                      if (link && title && !link.includes('yahoo.com')) {
                        results.push(`- **Title**: ${title}\n  **Link**: ${link}\n  **Snippet**: ${snippet}`);
                        count++;
                      }
                    }
                    if (results.length > 0) {
                      resultsText = results.join('\n\n');
                    }
                  }
                } catch (err) {
                  console.warn('Yahoo Search fallback failed:', err);
                }
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ status: 'success', query, results: resultsText }));
            return;
          }

          // ──────────────────── YOUTUBE TRANSCRIPT (GET) ────────────────────
          if (functionName === 'youtube-transcript' || functionName.startsWith('youtube-transcript?')) {
            const videoId = url.searchParams.get('v') || '';
            if (!videoId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing v parameter' }));
              return;
            }

            try {
              const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
              });
              const html = await watchRes.text();
              const jsonMatch = /ytInitialPlayerResponse\s*=\s*({[\s\S]+?});\s*var/g.exec(html) || /ytInitialPlayerResponse\s*=\s*({[\s\S]+?});/g.exec(html);
              
              if (jsonMatch) {
                const player = JSON.parse(jsonMatch[1]);
                const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (tracks && tracks.length > 0) {
                  const xmlRes = await fetch(tracks[0].baseUrl);
                  const xml = await xmlRes.text();
                  const textMatches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
                  const transcript = textMatches.map(m => m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ status: 'success', transcript: transcript.slice(0, 12000) }));
                  return;
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No captions found', transcript: '' }));
            } catch (ytErr: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: ytErr.message, transcript: '' }));
            }
            return;
          }

          // ──────────────────── POST-only functions below ────────────────────
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          const parsedBody = JSON.parse(body);

          if (functionName === 'generate-text') {
            const { prompt, history = [], dataset = '', personalData = '' } = parsedBody;
            
            let systemPromptContent = `You are Artha GPT, a warm, smart, and helpful AI assistant. Respond in well-structured markdown.`;
            if (personalData) systemPromptContent += `\n\nUser Biography: ${personalData}`;
            if (dataset) systemPromptContent += `\n\nRetrieved Context/Memories:\n${dataset}`;

            const messages = [{ role: 'system', content: systemPromptContent }];
            
            if (Array.isArray(history)) {
              history.forEach((msg: any) => {
                messages.push({ role: msg.role, content: msg.content });
              });
            }
            messages.push({ role: 'user', content: prompt });

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`
              },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 4096
              })
            });

            if (!response.ok) {
              const text = await response.text();
              res.statusCode = response.status;
              res.end(JSON.stringify({ error: `Groq error: ${text}` }));
              return;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'success', text }));
          } 
          
          else if (functionName === 'generate-title') {
            const { prompt } = parsedBody;
            const titlePrompt = `System: You are a title generator. Summarize the user's message into a very short, concise title (max 4-5 words). Do not use quotes.\nUser Message: ${prompt}\nTitle:`;
            
            const response = await fetch('https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBVX2E1dmFoZXY0eFJQU1NZdnpQOUNKUmttQ1JfQ1J4SjRwS0dzQUE2UmwtSUdZS3lzdUlXSkxaTVRabUNhbEgwemF2TWJUVTV0enJjRG9NS2dVbFE2ekgtQ2c9PQ==', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: titlePrompt })
            });

            if (!response.ok) {
              res.statusCode = response.status;
              res.end(JSON.stringify({ error: 'Title API error' }));
              return;
            }

            const data = await response.json();
            const title = data.text?.trim().replace(/^["']|["']$/g, '') || 'Conversation';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'success', title }));
          } 
          
          else if (functionName === 'generate-image') {
            const { prompt } = parsedBody;
            const response = await fetch('https://backend.buildpicoapps.com/aero/run/image-generation-api?pk=v1-Z0FBQUFBQnBVX2E1dmFoZXY0eFJQU1NZdnpQOUNKUmttQ1JfQ1J4SjRwS0dzQUE2UmwtSUdZS3lzdUlXSkxaTVRabUNhbEgwemF2TWJUVTV0enJjRG9NS2dVbFE2ekgtQ2c9PQ==', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
              res.statusCode = response.status;
              res.end(JSON.stringify({ error: 'Image API error' }));
              return;
            }

            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'success', imageUrl: data.imageUrl || data.url }));
          }
          
          else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Function not found' }));
          }
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else {
        next();
      }
    });
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), netlifyFunctionEmulator()],
})
