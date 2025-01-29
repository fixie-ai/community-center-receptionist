import 'dotenv/config';
import https from 'node:https';

// Configuration
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api';

// Create Ultravox call and get join URL
export async function createUltravoxCall(callConfig) {
    const request = https.request(`${ULTRAVOX_API_URL}/calls`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ULTRAVOX_API_KEY
        }
    });

    return new Promise((resolve, reject) => {
        let data = '';

        request.on('response', (response) => {
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(JSON.parse(data)));
        });

        request.on('error', reject);
        request.write(JSON.stringify(callConfig));
        request.end();
    });
}

export async function getCallTranscript(callId) {
  let allMessages = [];
  let nextCursor = null;

  try {
    // Keep fetching until we have all messages
    do {
      const url = `${ULTRAVOX_API_URL}/calls/${callId}/messages${nextCursor ? `?cursor=${nextCursor}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': ULTRAVOX_API_KEY,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add the current page of results to our collection
      allMessages = allMessages.concat(data.results);

      // Update the cursor for the next iteration
      nextCursor = data.next ? new URL(data.next).searchParams.get('cursor') : null;

    } while (nextCursor);

    return allMessages;

  } catch (error) {
    console.error('Error fetching Ultravox messages:', error.message);
    throw error;
  }
}
