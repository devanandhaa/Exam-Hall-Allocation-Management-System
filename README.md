# Exam Hall Allocation Management System

**React (Vite) + MySQL RDBMS** – MCA Software Engineering / RDBMS microproject.

## Description
A web system for a college to manage students, exams, schedules, halls and invigilators, and to
**automatically allocate halls and seat numbers** without duplicate seats or capacity overflow.

## Objectives
- Remove manual seating work; prevent duplicate seats, overflowing halls and clashing exams.
- Demonstrate relational design and SQL (keys, constraints, JOIN, GROUP BY, aggregates).

## Features
- **Admin:** dashboard, CRUD for students/departments/exams/schedules/halls/invigilators, automatic allocation, invigilator assignment, seating view, 4 printable reports.
- **Student:** profile, exam schedule, hall and seat, printable allocation slip.
- **Invigilator:** assigned halls, hall capacity, seating arrangement, profile.
- **Coordinator:** department students, exams, create/view schedules (own department only).

## Technology used
React 18, Vite, React Router, plain CSS, MySQL 8.0.16+ (CHECK constraints need 8.0.16+).
**Connection layer:** browsers cannot talk to MySQL directly, so `server/index.js` (one small Express file with `mysql2`)
receives requests from React and runs the SQL. It stores nothing itself; all data lives in MySQL.

## Database design (exam_hall_management)
`departments` -> `students`, `exams`, `invigilators` · `exams` -> `exam_schedules` -> `hall_allocations` (also -> `exam_halls`)
-> `seat_allocations` (also -> `students`) · `hall_allocations` -> `invigilator_assignments` (also -> `invigilators`) · `users` for login.

Two small additions to your table list (both explained by comments in schema.sql):
- `users.department_id` (nullable) – links a coordinator to a department.
- `seat_allocations.schedule_id` – lets MySQL enforce *one seat per student per exam* with `UNIQUE (schedule_id, student_id)`.

## Installation
1. Install Node.js 18+ and MySQL 8 (with MySQL Workbench).
2. In the project folder run `npm install`.

### Create the database and sample data
1. Open MySQL Workbench, connect to your server.
2. `File > Open SQL Script` -> `database/schema.sql` -> click the lightning icon (Execute).
   This creates `exam_hall_management`, all tables and the sample data (the INSERTs are at the bottom of the file).
3. Open `database/queries.sql` to try the demo queries.

### Set your MySQL password
Edit `password:` in `server/index.js`, or run with `DB_PASSWORD=yourpassword`.

### Run (two terminals)
```
npm run server     # API on http://localhost:5000
npm run dev        # React on http://localhost:5173
```

## Demo login credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@college.com | Admin@123 |
| Student | student@college.com | Student@123 |
| Invigilator | invigilator@college.com | Invigilator@123 |
| Coordinator | coordinator@college.com | Coordinator@123 |

Passwords are stored as SHA2-256 hashes and compared inside MySQL. (Demo-level login: no tokens/sessions.)

## Demo flow
Admin: Add students (MCA, semester 3) -> Halls -> Exams -> Exam Schedule -> **Hall Allocation** (select schedule, click *Allocate*) -> Seating Arrangement -> assign invigilator (Hall Allocation page) -> Reports.
Then log in as student / invigilator (`invigilator@college.com` is Dr. Suresh Kumar – assign him to a hall first) / coordinator.
Tip: sample halls hold 30+ seats, so add 30+ MCA semester-3 students to see students spill into a second hall.
New students have no login account; the demo student is INMCA24001.

## Allocation rules (server/index.js, `/api/allocate`)
Eligible students = exam's department + semester. Halls must be `Available` and free at that date/time. Fails with a message if
seats are insufficient. Halls are filled in order (A101, A102 ...) with seats 1..n. Saved in one transaction.

## RDBMS concepts demonstrated
PRIMARY KEY, FOREIGN KEY (with ON DELETE CASCADE), UNIQUE (single + composite), NOT NULL, CHECK, DEFAULT, 1-to-many
relationships, INNER/LEFT JOIN, multi-table JOIN, COUNT/SUM/AVG/MAX, GROUP BY, ORDER BY, WHERE/LIKE, subqueries (NOT EXISTS),
INSERT/UPDATE/DELETE, transactions (COMMIT/ROLLBACK), SHA2 hashing.

## Project modules
Login · Admin (students, departments, exams, schedules, halls, invigilators, allocation, seating, reports) · Student · Invigilator · Coordinator.

## Future enhancements
JWT login and role checks on the API, student bulk import (CSV), PDF export, side-by-side seating layout, email notifications, invigilator auto-assignment.
