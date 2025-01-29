import express from 'express';
import 'dotenv/config';
import { DB } from './db.js';

const port = 3000;
const app = express();

// Initialize our database & add to the app so we can use in our routes
const db = new DB();
db.importStudentsFromCSV('data/students.csv')
    .then(result => {
        console.log(`Successfully imported ${result.count} students`);
    })
    .catch(error => {
        console.error('Error importing students:', error);
    });
app.locals.db = db;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Import our routes and mount them
import { router as twilioRoutes } from './routes/twilio.js';
import { router as calRoutes } from './routes/cal.js';

app.use('/twilio/', twilioRoutes);
app.use('/cal/', calRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});