import express from 'express';
import twilio from 'twilio';
import 'dotenv/config';
import { createUltravoxCall } from '../ultravox-utils.js';
import { ULTRAVOX_CALL_CONFIG } from '../ultravox-config.js';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const destinationNumber = process.env.DESTINATION_PHONE_NUMBER;
const router = express.Router();

// Hack: Dictionary to store Twilio CallSid and Ultravox Call ID mapping
// In production you will want to replace this with something more durable
const activeCalls = new Map();

async function transferActiveCall(ultravoxCallId) {
    try {
        const callData = activeCalls.get(ultravoxCallId);
        if (!callData || !callData.twilioCallSid) {
            throw new Error('Call not found or invalid CallSid');
        }

        // First create a new TwiML to handle the transfer
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.dial().number(destinationNumber);

        // Update the active call with the new TwiML
        const updatedCall = await client.calls(callData.twilioCallSid)
            .update({
                twiml: twiml.toString()
            });

        return {
            status: 'success',
            message: 'Call transfer initiated',
            callDetails: updatedCall
        };

    } catch (error) {
        console.error('Error transferring call:', error);
        throw {
            status: 'error',
            message: 'Failed to transfer call',
            error: error.message
        };
    }
}

async function makeOutboundCall({ phoneNumber, systemPrompt, selectedTools }) {
    try {
      console.log('Creating outbound call...');
      
      const uvCallConfig = {
        systemPrompt,
        voice: 'Mark',
        selectedTools,
        temperature: 0.3,
        firstSpeaker: 'FIRST_SPEAKER_USER',
        medium: { "twilio": {} }
      };
  
      const { joinUrl, callId } = await createUltravoxCall(uvCallConfig);
      console.log('Got joinUrl:', joinUrl);
  
      const call = await client.calls.create({
        twiml: `<Response><Connect><Stream url="${joinUrl}"/></Connect></Response>`,
        to: phoneNumber,  // Consider hardcoding your own number here for local testing
        from: twilioNumber
      });
  
      // Store the mapping
      activeCalls.set(callId, {
        twilioCallSid: call.sid,
        type: 'outbound'
      });
  
      return { callId, twilioCallSid: call.sid };
    } catch (error) {
      console.error('Error making outbound call:', error);
      throw error;
    }
}

// Handle incoming calls from Twilio
router.post('/incoming', async (req, res) => {
    try {
      console.log('Incoming call received');
      const twilioCallSid = req.body.CallSid;
      
      const response = await createUltravoxCall(ULTRAVOX_CALL_CONFIG);
      
      activeCalls.set(response.callId, {
        twilioCallSid,
        type: 'inbound'
      });
  
      const twiml = new twilio.twiml.VoiceResponse();
      const connect = twiml.connect();
      connect.stream({
        url: response.joinUrl,
        name: 'ultravox'
      });
  
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error('Error handling incoming call:', error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, there was an error connecting your call.');
      res.type('text/xml');
      res.send(twiml.toString());
    }
});
  
router.post('/transferCall', async (req, res) => {
    const { callId } = req.body;
    console.log(`Request to transfer call with callId: ${callId}`);

    try {
        const result = await transferActiveCall(callId);
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});
  
  router.get('/active-calls', (req, res) => {
    const calls = Array.from(activeCalls.entries()).map(([ultravoxCallId, data]) => ({
      ultravoxCallId,
      ...data
    }));
    res.json(calls);
  });

// Note: not used for the agent...for testing purposes
router.post('/makeOutboundCall', async (req, res) => {
    try {
        const { phoneNumber, systemPrompt, selectedTools } = req.body;
        const result = await makeOutboundCall({ phoneNumber, systemPrompt, selectedTools });
        res.json(result);
    } catch (error) {
        console.error('Error initiating outbound call:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router, makeOutboundCall };

