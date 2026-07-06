/**
 * Netlify Function: Generate Title
 * 
 * This function:
 * 1. Receives user message from frontend
 * 2. Calls API to generate short title (4-5 words)
 * 3. Returns clean title (no system prompt interference)
 * 
 * API key is hidden - never exposed to browser
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
        // Parse request body
        const { message } = JSON.parse(event.body);

        if (!message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Message is required' })
            };
        }

        // API configuration (hidden from browser)
        const TITLE_API = "https://backend.buildpicoapps.com/aero/run/llm-api?pk=v1-Z0FBQUFBQnBVX2E1dmFoZXY0eFJQU1NZdnpQOUNKUmttQ1JfQ1J4SjRwS0dzQUE2UmwtSUdZS3lzdUlXSkxaTVRabUNhbEgwemF2TWJUVTV0enJjRG9NS2dVbFE2ekgtQ2c9PQ==";

        // Simple title generation prompt (no system prompt)
        const prompt = `System: You are a title generator. Summarize the user's message into a very short, concise title (max 4-5 words). Do not use quotes.\nUser Message: ${message}\nTitle:`;

        // Call the API
        const response = await fetch(TITLE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API error: ${response.status}` })
            };
        }

        const data = await response.json();

        if (data.status === 'success') {
            // Clean the title (remove quotes if any)
            const title = data.text.trim().replace(/^["']|["']$/g, '');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'success',
                    title: title
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: data.error || 'Title generation failed' })
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
