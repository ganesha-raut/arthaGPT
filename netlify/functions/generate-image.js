/**
 * Netlify Function: Generate Image
 * 
 * This function:
 * 1. Receives image prompt from frontend
 * 2. Calls the image API with secure API key
 * 3. Returns image URL to frontend
 * 
 * All secrets are hidden - never exposed to browser
 */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const toDataUriFromRemote = async (url) => {
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) return null;

      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    };

    // Parse request body
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Get API endpoint from Netlify environment variables
    const IMG_API = "https://backend.buildpicoapps.com/aero/run/image-generation-api?pk=v1-Z0FBQUFBQnBVX2E1dmFoZXY0eFJQU1NZdnpQOUNKUmttQ1JfQ1J4SjRwS0dzQUE2UmwtSUdZS3lzdUlXSkxaTVRabUNhbEgwemF2TWJUVTV0enJjRG9NS2dVbFE2ekgtQ2c9PQ==";

    if (!IMG_API) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Call the image generation API from the server
    const response = await fetch(IMG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      timeout: 60000 // 60 second timeout for image generation
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Image API error: ${response.status} - ${errorText.slice(0, 100)}` })
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Invalid response from image API' })
      };
    }

    
    if (data.status === 'success' && data.imageUrl) {
      const imageDataUri = await toDataUriFromRemote(data.imageUrl);
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          imageUrl: data.imageUrl,
          imageDataUri
        })
      };
    } else if (data.imageUrl) {
      // Some APIs return imageUrl without status field
      const imageDataUri = await toDataUriFromRemote(data.imageUrl);
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          imageUrl: data.imageUrl,
          imageDataUri
        })
      };
    } else if (data.url) {
      // Some APIs return url instead of imageUrl
      const imageDataUri = await toDataUriFromRemote(data.url);
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'success',
          imageUrl: data.url,
          imageDataUri
        })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error || data.message || 'Image generation failed - No image URL returned' })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Server error: ${error.message}` })
    };
  }
};
