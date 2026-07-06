// Netlify Serverless Function: Web Search
// Uses direct website scraping, DuckDuckGo Lite (POST), and Yahoo Search fallback

// Helper to scrape any URL directly and extract visible text
async function scrapeDirectUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      return `[ERROR]: Failed to fetch URL directly (Status: ${response.status})`;
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleMatch ? titleMatch[1].trim() : 'No Title';
    
    // Strip scripts and styles
    let bodyText = html;
    bodyText = bodyText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    bodyText = bodyText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    bodyText = bodyText.replace(/<\/div>|<\/p>|<\/h[1-6]>|<\/li>/gi, '\n');
    bodyText = bodyText.replace(/<[^>]+>/g, '');
    bodyText = bodyText.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
    
    const textCapped = bodyText.slice(0, 8000);
    return `[DIRECT URL CONTENT]\n**URL**: ${url}\n**Title**: ${title}\n**Scraped Page Content**:\n${textCapped}`;
  } catch (err) {
    return `[ERROR]: Failed to scrape website "${url}": ${err.message}`;
  }
}

// Scrape DuckDuckGo Lite (POST endpoint) - extremely robust against cloud blockings
async function scrapeDuckDuckGoLite(query) {
  try {
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      body: `q=${encodeURIComponent(query)}`
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    
    // DDG Lite matches results in tables
    // We capture result title block and snippet block
    const reg = /<td[^>]+class="result-title"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    let count = 0;
    while ((match = reg.exec(html)) !== null && count < 5) {
      const link = match[1].replace(/&amp;/g, '&');
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();
      if (link && title && snippet) {
        results.push(`- **Title**: ${title}\n  **Link**: ${link}\n  **Snippet**: ${snippet}`);
        count++;
      }
    }
    return results;
  } catch (err) {
    console.warn('DDG Lite scraping failed:', err);
    return [];
  }
}

// Scrape Yahoo Search for general text query fallback
async function scrapeYahooSearch(query) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    
    // broad regex to match title, link, and snippet elements within search results
    const reg = /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?:<\/li>|<h3|$)/gi;
    let match;
    let count = 0;

    while ((match = reg.exec(html)) !== null && count < 5) {
      const link = match[1].replace(/&amp;/g, '&');
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const remainingBlock = match[3] || '';
      
      // Try to find the snippet within this block (usually in a div or p tag)
      const snippetMatch = /<p[^>]*>([\s\S]*?)<\/p>|<div[^>]+class="compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(remainingBlock);
      const snippet = snippetMatch ? (snippetMatch[1] || snippetMatch[2]).replace(/<[^>]+>/g, '').trim() : '';

      if (link && title && !link.includes('yahoo.com')) {
        results.push(`- **Title**: ${title}\n  **Link**: ${link}\n  **Snippet**: ${snippet}`);
        count++;
      }
    }

    // Fallback if no snippets/structures matched
    if (results.length === 0) {
      const regFallback = /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let countF = 0;
      while ((match = regFallback.exec(html)) !== null && countF < 5) {
        const link = match[1].replace(/&amp;/g, '&');
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        if (link && title && !link.includes('yahoo.com')) {
          results.push(`- **Title**: ${title}\n  **Link**: ${link}`);
          countF++;
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('Yahoo Search failed:', err);
    return [];
  }
}

// Scrape Yahoo Images
async function scrapeYahooImages(query) {
  try {
    const cleanQuery = query.replace(/\b(image|photo|pic|picture|draw|illustration|show me|find|search for)\b/gi, '').trim();
    const url = `https://images.search.yahoo.com/search/images?p=${encodeURIComponent(cleanQuery)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results = [];
    
    const murlRegex = /"murl":"(https?:\/\/[^"]+?\.(?:jpg|jpeg|png|webp|gif))"/gi;
    let match;
    let count = 0;

    while ((match = murlRegex.exec(html)) !== null && count < 3) {
      results.push(match[1]);
      count++;
    }

    return results;
  } catch (err) {
    console.warn('Yahoo images failed:', err);
    return [];
  }
}

exports.handler = async (event, context) => {
  const query = event.queryStringParameters.q || (event.body ? JSON.parse(event.body).q : "");

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Query parameter 'q' is required" })
    };
  }

  try {
    // Detect if user is searching for or sharing a direct URL/domain name
    const urlMatch = query.match(/(https?:\/\/[^\s\)\*\#]+)/i) || 
                     query.match(/\b([a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s\)\*\#]*)?)\b/i);
    
    let resultsText = "";

    if (urlMatch && !query.toLowerCase().includes('google.com') && !query.toLowerCase().includes('yahoo.com') && !query.toLowerCase().includes('duckduckgo.com')) {
      let directUrl = urlMatch[1];
      if (!directUrl.startsWith('http://') && !directUrl.startsWith('https://')) {
        directUrl = 'https://' + directUrl;
      }
      // Direct website scraping
      resultsText = await scrapeDirectUrl(directUrl);
    } else {
      // 1. Primary Text Search: DuckDuckGo Lite (Highly resilient)
      const ddgResults = await scrapeDuckDuckGoLite(query);
      if (ddgResults && ddgResults.length > 0) {
        resultsText = ddgResults.join("\n\n");
      }

      // 2. Fallback: Yahoo Search
      if (!resultsText || resultsText.length < 50) {
        const yahooResults = await scrapeYahooSearch(query);
        if (yahooResults.length > 0) {
          resultsText = yahooResults.join("\n\n");
        }
      }
    }

    // 2. Image Search if user asks for visual assets
    let imageMarkdown = "";
    const isImageQuery = /\b(image|photo|pic|picture|drawing|wallpaper|logo|jpeg|png|gif|avatar|banner|background)\b/i.test(query);

    if (isImageQuery) {
      const images = await scrapeYahooImages(query);
      if (images.length > 0) {
        imageMarkdown = "\n\n[WEB SEARCH IMAGES]:\n" + images.map((img, i) => `![Web Image ${i + 1}](${img})`).join('\n') + `\n\nCRITICAL: Display the markdown images above directly in your response!`;
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "success",
        query: query,
        results: resultsText + imageMarkdown
      })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: e.message, results: "" })
    };
  }
};
