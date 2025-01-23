const toolsBaseUrl = "https://247e-88-16-973-488.ngrok-free.app"; // TODO ngrok URL here

// Ultravox configuration

// Basic prompt for receptionist
// include information about the center
// tools for lookupInfo() and transferCall()

const SYSTEM_PROMPT = `
Your name is Steve. You are a virtual, AI receptionist at CCC, a local community center.

Your job is as follows:
1. Answer all calls with a friendly, conversational approach.
2. Provide helpful answers to customer inquiries. Use the Q&A section below for basic questions. For more complex questions you MUST use the "infoLookup" tool. Do not make answers up!
3. If a caller is angry or has a topic that you cannot answer, you can use the "transferCall" tool to hand-off the call to the right department.

#Q&A
## CCC location and hours
The center is located at 123 Any Street, Seattle, WA 98105. The center is open seven days a week from 6am - 10pm.

## What types of programs are available?
The center provides full programs (lessons, leagues) for all ages in basketball, swimming, and soccer. Additionally, the center can be rented out for private events.

## What type of space is available for events?
The center has a large (2000 sq ft) outdoor area that can be used for weddings. Indoor space includes four breakout rooms that hold eight people each for private meetings. There is a large (4000 sq ft) ballroom for banquets, dances, etc.

`;

const selectedTools = [
    {
      "temporaryTool": {
        "modelToolName": "checkAvailability",
        "description": "Looks up available appointments on the calendar. Returns a list of available slots.",
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
                "name": "phoneNumber",
                "location": "PARAMETER_LOCATION_BODY",
                "schema": {
                  "description": "The caller's phone number",
                  "type": "string",
                },
                "required": true,
            },
          ],
        "http": {
            "baseUrlPattern": `${toolsBaseUrl}/cal/checkAvailability`,
            "httpMethod": "POST",
          },
      },
  },
  {
    "temporaryTool": {
      "modelToolName": "transferCall",
      "description": "Transfers call to a human. Use this to finalize booking an appointment or if there are questions you cannot answer.",
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
            "name": "phoneNumber",
            "location": "PARAMETER_LOCATION_BODY",
            "schema": {
              "description": "The caller's phone number",
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
      "modelToolName": "knowledgeLookup",
      "description": "Used to lookup information about HVAC terms, products, and how-tos. This will search a vector database and return back chunks that are semantically similar to the query.",
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
        "baseUrlPattern": `${toolsBaseUrl}/rag/kblookup`,
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
    // selectedTools: selectedTools,
    medium: { "twilio": {} }
};
