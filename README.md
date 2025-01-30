# community-center-receptionist
This Node.js application demonstrates how to build a voice AI receptionist for a fictional community center.

The application uses Ultravox Realtime and Twilio. It handles both incoming and outgoing calls, with a specific focus on managing student lesson reminders and appointments. There are accompanying videos that go into detail about building the application:

## Videos
This code was developed during a series of livestreams. The records are available:
1. Session 1 (Thursday, January 23, 2025) [Recording](https://www.youtube.com/live/DocZRHNeAy4?si=utqrDuqHHlywxsIp&t=377)
2. Session 2 (Friday, January 24, 2025) [Recording](https://www.youtube.com/watch?v=qwFOzo2-dMs&t=1435s)
3. Session 3 (Thursday, January 30, 2025) [Recording](https://www.youtube.com/watch?v=S2xeZv4mSXk)

## Highlights
The application includes:

1. Automated lesson reminder calls using voice AI
2. Calendar management integration with Cal.com
3. Student information database integration
4. Dynamic call routing and transfer capabilities
5. Multi-stage conversation management

## Prerequisites

- Node.js (v20 or higher)
- An Ultravox API key
- A Twilio account with:
  - Account SID
  - Auth Token
  - A phone number
- A Cal.com account with:
  - API key
  - Existing event type
- SQLite database (for student information)
- A way to expose your local server to the internet (e.g., ngrok)

## Setup

1. Clone this repository
2. Install dependencies:
```bash
pnpm install
```

3. Configure your environment variables:
   Create a file named `.env` and add the following:

```bash
ULTRAVOX_API_KEY='your_ultravox_api_key_here'
CALCOM_API_KEY='your_cal_api_key_here'
CALCOM_EVENT_TYPE_ID='your_event_type_id'
TWILIO_ACCOUNT_SID='your_twilio_account_sid'
TWILIO_AUTH_TOKEN='your_twilio_auth_token'
TWILIO_PHONE_NUMBER='your_twilio_phone_number'
DESTINATION_PHONE_NUMBER='your_transfer_destination_number'
TOOLS_BASE_URL='your_ngrok_url'
```


4. Set up your database:
   - Place your students.csv file in the `data/` directory
   - The CSV should contain columns for: first_name, last_name, email, phone, emergency_contact, emergency_contact_phone

5. Start your server:
```bash
pnpm start
```

This application uses nodemon to provide automatic reloading if files are updated.

6. Expose your local server:
```bash
ngrok http 3000
```

7. Update your Twilio webhook:
   - Go to your Twilio phone number settings
   - Set the webhook URL for incoming calls to:
     `https://your-ngrok-url/twilio/incoming`
   - Set HTTP method to POST

## Key Features

### Incoming Call Handling
- Automatic connection to AI agent
- Natural language understanding
- Dynamic tool selection based on conversation context
- Call transfer capabilities to human agents

### Automated Reminder System
- Scheduled lesson reminders
- Integration with Cal.com calendar
- Student database lookup
- Emergency contact management
- Rescheduling capabilities
- Provides a GitHub Action (dailyreminders.yml) that will run daily to send reminders

### Call Management Tools
- Call transfer functionality
- Calendar availability checking
- Appointment booking/rescheduling
- Active call tracking

## Project Structure

```
├── index.js               # Main application entry point
├── db.js                  # Database configuration and operations
├── ultravox-config.js     # AI configuration and system prompts
├── ultravox-utils.js      # Utility functions for Ultravox API
├── .github/
│   ├── dailyreminders.yml # Daily job to send reminders
├── routes/
│   ├── twilio.js          # Call handling and Twilio integration
│   ├── cal.js             # Calendar operations and reminders
│   └── rag.js             # Knowledge base integration
└── data/
    └── students.csv       # Student information database
```

## API Endpoints

### Twilio Routes (/twilio)
- POST `/incoming` - Handle incoming calls
- POST `/transferCall` - Transfer active call
- GET `/active-calls` - List current active calls
- POST `/makeOutboundCall` - Initiate outbound call

### Calendar Routes (/cal)
- POST `/checkAvailability` - Check calendar availability
- POST `/createBooking` - Create new appointment
- GET `/upcomingBookings` - List upcoming appointments
- POST `/sendLessonReminders` - Process and send reminder calls

## Testing

### Manual Testing
1. Start the server and expose it via ngrok
2. Call your Twilio number to test incoming call handling
3. Use the `/cal/sendLessonReminders` endpoint to test reminder calls

### Expected Console Output
```
Server running on port 3000
Successfully imported X students
Incoming call received
Creating Ultravox call...
Got joinUrl: [URL]
Call initiated: [CallSID]
```

## Troubleshooting

Common issues and solutions:

1. Calls not connecting:
   - Verify Ultravox API key
   - Check ngrok URL in Twilio settings
   - Verify server is running and accessible
   - Check server logs for errors

2. Reminder calls failing:
   - Verify student phone numbers are in E.164 format
   - Check database connection
   - Verify Cal.com API key and event type ID
   - Monitor call logs in Twilio console

3. Calendar integration issues:
   - Verify Cal.com API key permissions
   - Check event type ID exists
   - Verify timezone settings

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the Apache 2.0 - see the LICENSE file for details.