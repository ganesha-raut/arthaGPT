exports.handler = async (event, context) => {
  const videoId = event.queryStringParameters.v || (event.body ? JSON.parse(event.body).v : "");
  if (!videoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Video ID 'v' is required" })
    };
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube watch page returned status ${response.status}`);
    }

    const html = await response.text();
    
    // Find player response JSON block
    const jsonMatch = /ytInitialPlayerResponse\s*=\s*({[\s\S]+?});\s*var/g.exec(html) || /ytInitialPlayerResponse\s*=\s*({[\s\S]+?});/g.exec(html);
    if (!jsonMatch) {
      throw new Error("Could not extract player metadata. Captions might be disabled.");
    }

    const playerResponse = JSON.parse(jsonMatch[1]);
    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No caption tracks found. This video may not have subtitles.");
    }

    // Load base url for primary subtitles track
    const trackUrl = captionTracks[0].baseUrl;
    const trackRes = await fetch(trackUrl);

    if (!trackRes.ok) {
      throw new Error("Failed to download caption tracks XML.");
    }

    const xml = await trackRes.text();
    const textMatches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
    
    const transcript = textMatches
      .map(m => m[1]
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '')
        .trim()
      )
      .filter(Boolean)
      .join(' ');

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "success",
        videoId,
        transcript: transcript.slice(0, 12000) // cap to 12k characters
      })
    };

  } catch (e) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: e.message, transcript: "" })
    };
  }
};
