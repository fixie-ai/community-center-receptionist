import 'dotenv/config';

const toolsBaseUrl = process.env.TOOLS_BASE_URL; // set the ngrok URL in the .env file

const SYSTEM_PROMPT = `
Your name is Steve. You are a virtual, AI receptionist at CCC, a local community center.

Your job is as follows:
1. Answer all calls with a friendly, conversational approach.
2. Provide helpful answers to customer inquiries. Use the Q&A section below for basic questions.
3. Important: you must use the events section below to answer questions about upcoming events at the center.
4. For more complex questions you MUST use the "infoLookup" tool. Do not make answers up!
5. If a caller is angry or has a topic that you cannot answer, you can use the "transferCall" tool to hand-off the call to the right department.

#Q&A
## CCC location and hours
The center is located at 123 Any Street, Seattle, WA 98105. The center is open seven days a week from 6am - 10pm.

## What types of programs are available?
The center provides full programs (lessons, leagues) for all ages in basketball, swimming, and soccer. Additionally, the center can be rented out for private events.

## What type of space is available for events?
The center has a large (2000 sq ft) outdoor area that can be used for weddings. Indoor space includes four breakout rooms that hold eight people each for private meetings. There is a large (4000 sq ft) ballroom for banquets, dances, etc.

#EVENTS
* Monday, January 27, 2025 - Karaoke fest from 7-9pm. All ages.
* Thursday, January 30, 2025 - Shin Limm magic show. Cost is $50 per person. Two shows 5pm and 8pm.
`;

const selectedTools = [
  {
    "temporaryTool": {
      "modelToolName": "transferCall",
      "description": "Transfers call to a human. Use this if a caller is upset or if there are questions you cannot answer.",
      "automaticParameters": [
        {
          "name": "callId",
          "location": "PARAMETER_LOCATION_BODY",
          "knownValue": "KNOWN_PARAM_CALL_ID"
        }
      ],
      "dynamicParameters": [
        {
          "name": "firstName",
          "location": "PARAMETER_LOCATION_BODY",
          "schema": {
            "description": "The caller's first name",
            "type": "string",
          },
          "required": true,
        },
        {
            "name": "lastName",
            "location": "PARAMETER_LOCATION_BODY",
            "schema": {
              "description": "The caller's last name",
              "type": "string",
            },
            "required": true,
        },
        {
            "name": "transferReason",
            "location": "PARAMETER_LOCATION_BODY",
            "schema": {
              "description": "The reason the call is being transferred.",
              "type": "string",
            },
            "required": true,
        },
      ],
      "http": {
          "baseUrlPattern": `${toolsBaseUrl}/twilio/transferCall`,
          "httpMethod": "POST",
        },
    },
  },
  {
    "temporaryTool": {
      "modelToolName": "infoLookup",
      "description": "Used to lookup information about the community center's soccer and swimming programs. This will search a vector database and return back chunks that are semantically similar to the query.",
      "staticParameters": [
        {
          "name": "corpusId",
          "location": "PARAMETER_LOCATION_BODY",
          "value": "679f9a85-36a0-42a6-9519-435431749fc3"
        },
        {
          "name": "maxChunks",
          "location": "PARAMETER_LOCATION_BODY",
          "value": 5
        }
      ],
      "dynamicParameters": [
        {
          "name": "query",
          "location": "PARAMETER_LOCATION_BODY",
          "schema": {
            "description": "The query to lookup.",
            "type": "string"
          },
          "required": true
        }
      ],
      "http": {
        "baseUrlPattern": "https://corpus-proxy.vercel.app/api/alpha/corpus/query",
        "httpMethod": "POST"
      }
    }
  }
];

export const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: SYSTEM_PROMPT,
    model: 'fixie-ai/ultravox',
    voice: 'Mark',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    selectedTools: selectedTools,
    medium: { "twilio": {} }
};
