-- SQLLite Schema
-- Students table
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    emergency_contact TEXT,
    emergency_contact_relationship TEXT,
    emergency_contact_phone TEXT,
    skill_level TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indices for quick lookups by student_code, email, and phone number
CREATE INDEX idx_students_code ON students(student_code);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_phone ON students(phone);
