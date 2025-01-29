import Database from 'better-sqlite3';
import Papa from 'papaparse';
import { readFileSync } from 'fs';

// Create an in-memory DB just for the demo. For production, use a more durable database.
export class DB {
    constructor() {
        this.db = new Database(':memory:', { verbose: console.log });
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');

            // Read and execute schema file
            const schemaSQL = readFileSync('data/schema.sql', 'utf8');
            this.db.exec(schemaSQL);

            // Prepare common statements
            this.prepareStatements();
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    prepareStatements() {
        this.stmt = {
            getStudentByEmail: this.db.prepare('SELECT * FROM students WHERE email = ?'),
            insertStudent: this.db.prepare(`
                INSERT INTO students (
                    student_code, first_name, last_name, email, phone,
                    emergency_contact, emergency_contact_relationship,
                    emergency_contact_phone, skill_level, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),

            getStudentByCode: this.db.prepare('SELECT * FROM students WHERE student_code = ?'),
            getAllStudents: this.db.prepare('SELECT * FROM students ORDER BY created_at DESC')
        };
    }

    async importStudentsFromCSV(csvFilePath) {
        try {
            const csvContent = readFileSync(csvFilePath, 'utf8');
            
            return new Promise((resolve, reject) => {
                Papa.parse(csvContent, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: (results) => {
                        try {
                            const insertMany = this.db.transaction((students) => {
                                for (const student of students) {
                                    this.stmt.insertStudent.run(
                                        student.student_code,
                                        student.first_name,
                                        student.last_name,
                                        student.email || null,
                                        student.phone || null,
                                        student.emergency_contact || null,
                                        student.emergency_contact_relationship || null,
                                        student.emergency_contact_phone || null,
                                        student.skill_level || null,
                                        student.notes || null
                                    );
                                }
                            });

                            insertMany(results.data);
                            resolve({
                                success: true,
                                count: results.data.length,
                                errors: results.errors
                            });
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            throw new Error(`Error reading CSV file: ${error.message}`);
        }
    }

    addStudent(studentData) {
        try {
            return this.stmt.insertStudent.run(
                studentData.student_code,
                studentData.first_name,
                studentData.last_name,
                studentData.email || null,
                studentData.phone || null,
                studentData.emergency_contact || null,
                studentData.emergency_contact_relationship || null,
                studentData.emergency_contact_phone || null,
                studentData.skill_level || null,
                studentData.notes || null
            );
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('Student code already exists');
            }
            throw error;
        }
    }

    getStudent(studentCode) {
        return this.stmt.getStudentByCode.get(studentCode);
    }

    getAllStudents() {
        return this.stmt.getAllStudents.all();
    }
}