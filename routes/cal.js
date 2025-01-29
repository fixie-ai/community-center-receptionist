// Original versions of getAvailability and createBooking courtesy of John George
// https://github.com/askjohngeorge/ai-dialer/blob/13a0c206a69ddafd0a3a4db06a9c483d20b16cc8/src/lib/cal.ts#L4

import express from 'express';
import 'dotenv/config';
import { makeOutboundCall } from './twilio.js';

const router = express.Router();

if (!process.env.CALCOM_API_KEY) throw new Error('CALCOM_API_KEY is required');
if (!process.env.CALCOM_EVENT_TYPE_ID) throw new Error('CALCOM_EVENT_TYPE_ID is required');

const BASE_URL = 'https://api.cal.com/v2';

const config = {
  apiKey: process.env.CALCOM_API_KEY,
  eventTypeId: parseInt(process.env.CALCOM_EVENT_TYPE_ID, 10),
};

async function getAvailability(days = 5) {
  try {
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    const params = new URLSearchParams({
      startTime,
      endTime,
      eventTypeId: config.eventTypeId.toString(),
    });
    
    const url = `${BASE_URL}/slots/available?${params}`;

    console.log('Fetching availability from:', url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch availability:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch availability: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Availability response:', JSON.stringify(data, null, 2));
    
    // Basic validation of response structure
    if (data.status !== 'success' || !data.data?.slots) {
      throw new Error('Invalid response format');
    }
    
    // Convert the date-grouped slots into a flat array
    const slots = Object.values(data.data.slots).flat();
    
    return {
      success: true,
      availability: { slots }
    };
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return {
      success: false,
      error: 'Failed to fetch availability'
    };
  }
}

async function createBooking(details) {
  try {
    const response = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
      },
      body: JSON.stringify({
        eventTypeId: config.eventTypeId,
        start: details.startTime,
        attendee: {
          name: details.name,
          email: details.email,
          timeZone: details.timezone
        },
        bookingFieldsResponses: {
          company: details.company,
          phone: details.phone,
          notes: details.notes
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create booking:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to create booking: ${response.statusText}`);
    }

    const booking = await response.json();
    return {
      success: true,
      booking
    };
  } catch (error) {
    console.error('Failed to create booking:', error);
    return {
      success: false,
      error: 'Failed to create booking'
    };
  }
}

async function getUpcomingBookings(daysAhead = 3) {
  try {
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
    
    const params = new URLSearchParams({
      startTime,
      endTime,
      eventTypeId: config.eventTypeId.toString(),
    });
    
    const url = `${BASE_URL}/bookings?${params}`;

    console.log('Fetching upcoming bookings from:', url);
    console.log(`using key ${config.apiKey}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'cal-api-version': '2024-08-13',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch bookings:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch bookings: ${response.statusText}`);
    }

    const data = await response.json();
    // console.log('Bookings response:', JSON.stringify(data, null, 2));
    
    if (!Array.isArray(data.data)) {
      throw new Error('Invalid response format');
    }
    
    return {
      success: true,
      bookings: data.data
    };
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return {
      success: false,
      error: 'Failed to fetch bookings'
    };
  }
}

async function mergeBookingsWithStudentInfo(bookings, db) {
  if (!bookings || !Array.isArray(bookings)) {
    throw new Error('Invalid bookings data format');
  }

  const processedBookings = [];

  for (const booking of bookings) {
      const studentEmail = booking.bookingFieldsResponses?.email;
      
      if (!studentEmail) {
          console.warn(`No email found for booking ${booking.id}`);
          continue;
      }

      const studentInfo = db.stmt.getStudentByEmail.get(studentEmail);

      if (!studentInfo) {
          console.warn(`No student found in database for email: ${studentEmail}`);
          continue;
      }

      processedBookings.push({
          booking: booking,
          student: {
              fullName: `${studentInfo.first_name} ${studentInfo.last_name}`,
              phoneNumber: studentInfo.phone,
              emergencyContact: studentInfo.emergency_contact,
              emergencyContactPhone: studentInfo.emergency_contact_phone
          }
      });
  }

  return processedBookings;
}

function createLessonReminderConfig(lesson) {
  const systemPrompt = `Your name is Steve. You are a virtual, AI receptionist at CCC, a local community center.
    
  You are calling ${lesson.student.fullName} on the phone to remind them of their upcoming ${lesson.booking.eventType.slug}.

  Your job is as follows:
  1. Introduce yourself and say why you are calling
  2. Confirm you are talking to ${lesson.student.fullName} or their alternative contact ${lesson.student.emergencyContact}
  3. If you are talking to ${lesson.student.fullName} or ${lesson.student.emergencyContact} then call the tool "confirmLessonTime"
  4. If ${lesson.student.fullName} or ${lesson.student.emergencyContact} are not available, say you will call back later
  5. If you get the voicemail for ${lesson.student.fullName} or ${lesson.student.emergencyContact} leave a simple message that reminds them of the lesson and ask them to call the center if they need to change or cancel`;

  const selectedTools = [
    {
      "temporaryTool": {
        "modelToolName": "confirmLessonTime",
        "description": "Use this tool to confirm the lesson.",
        "staticParameters": [
          {
            "name": "lesson",
            "location": "PARAMETER_LOCATION_BODY",
            "value": lesson
          }
        ],
        "dynamicParameters": [
          {
            "name": "contactName",
            "location": "PARAMETER_LOCATION_BODY",
            "schema": {
              "type": "string",
              "description": "The name of the person on the phone"
            },
            "required": true
          }
        ],
        "http": {
          "baseUrlPattern": `${process.env.TOOLS_BASE_URL}/cal/confirmLessonTime`,
          "httpMethod": "POST"
        }
      }
    }
  ];

  return { systemPrompt, selectedTools };
}

// Note: all of these should be secured in a production application
// Handle requests for looking up spots on the calendar
router.post('/checkAvailability', async (req, res) => {
  console.log('Got a request for checkAvailability');
  const availableSlots = await getAvailability();
  res.json(availableSlots.data)
});

// Handle requests for creating a booking
router.post('/createBooking', async (req, res) => {
  console.log('Got a request for createBooking:', req.body);
  
  // Validate required fields
  const requiredFields = ['name', 'email', 'company', 'phone', 'timezone', 'startTime'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  const booking = await createBooking(req.body);
  res.json(booking);
});

// Expose upcoming bookings
router.get('/upcomingBookings', async (req, res) => {
  console.log('Got a request for upcomingBookings');
  
  const bookings = await getUpcomingBookings();
  res.json(bookings);
});

// Route for daily job to hit to check for upcoming bookings and to send reminder calls
// NOTE: in production you want to secure this endpoint
router.post('/sendLessonReminders', async (req, res) => {
  try {
    console.log('Got a request to process daily reminders');
    const db = req.app.locals.db;
    const days = parseInt(req.query.days, 10) || 3;
    
    if (days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        error: 'Days parameter must be between 1 and 30'
      });
    }

    const result = await getUpcomingBookings();
    const mergedData = await mergeBookingsWithStudentInfo(result.bookings, db);

    // Process each lesson
    // For local testing you may want to not loop and simply send a single call with something like:
    // await makeReminderCall(mergedData[0]);
    // otherwise if you are using your own phone things can fail with too many calls coming in at once
    const reminderResults = [];
    for (const lesson of mergedData) {
      try {
        const { systemPrompt, selectedTools } = createLessonReminderConfig(lesson);
        const callResult = await makeOutboundCall({
          phoneNumber: lesson.student.phoneNumber,
          systemPrompt,
          selectedTools
        });
        reminderResults.push({
          lesson: lesson.booking.id,
          status: 'initiated',
          callDetails: callResult
        });
      } catch (error) {
        console.error(`Error processing reminder for lesson ${lesson.booking.id}:`, error);
        reminderResults.push({
          lesson: lesson.booking.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: reminderResults
    });
  } catch (error) {
    console.error('Error processing daily lesson reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route for Call Stage: Confirm Lesson
router.post('/confirmLessonTime', async (req, res) => {
  console.log(`Starting Stage:  Confirm Lesson`);

  // Get our parameters
  const { lesson, contactName } = req.body;

  // Create the prompt for this stage
  const systemPrompt = `Continue the call. Your job now is to confirm the lesson:
    1. If ${lesson.student.fullName} can make the lesson at ${lesson.booking.start} then you MUST thank them, say goodbye and then call the 'hangUp' tool
    2. If they cannot make the lesson, you must call the 'rescheduleLesson' tool
  `;
  
  const selectedTools = [
    { "toolName": "hangUp" },
    {
      "temporaryTool": {
        "modelToolName": "rescheduleLesson",
        "description": "Use this tool to reschedule the lesson.",
        "staticParameters": [
          {
            "name": "lesson",
            "location": "PARAMETER_LOCATION_BODY",
            "value": lesson
          }
        ],
        "dynamicParameters": [
          {
            "name": "contactName",
            "location": "PARAMETER_LOCATION_BODY",
            "schema": {
              "type": "string",
              "description": "The name of the person on the phone"
            },
            "required": true
          }
        ],
        "http": {
          "baseUrlPattern": `${process.env.TOOLS_BASE_URL}/cal/rescheduleLesson`,
          "httpMethod": "POST"
        }
      }
    }

  ];

  const responseBody = {
    systemPrompt: systemPrompt,
    selectedTools: selectedTools
  };

  // Set the header to change the stage and send response
  res.set('X-Ultravox-Response-Type', 'new-stage');
  res.json(responseBody);
});

// Route for Call Stage: Confirm Lesson
router.post('/rescheduleLesson', async (req, res) => {
  console.log(`Starting Stage:  Reschedule Lesson`);

  // Get our parameters that the prior stage passed in
  const { lesson, contactName } = req.body;

  // Create the prompt for this stage
  const systemPrompt = `Continue the call. Your job now is to reschedule the lesson:
    1. Say this is where code needs to be added to implement the rescheduling
    2. Then you MUST thank them, say goodbye, and then call the 'hangUp' tool
  `;
  
  const responseBody = {
    systemPrompt: systemPrompt,
    selectedTools: [{ "toolName": "hangUp" }]
  };

  // Set the header to change the stage and send response
  res.set('X-Ultravox-Response-Type', 'new-stage');
  res.json(responseBody);
});

export { router };