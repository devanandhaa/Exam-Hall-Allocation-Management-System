-- EXAM HALL ALLOCATION MANAGEMENT SYSTEM  (MySQL 8.0.16+ / MySQL Workbench)
DROP DATABASE IF EXISTS exam_hall_management;
CREATE DATABASE exam_hall_management;
USE exam_hall_management;

CREATE TABLE departments (
  department_id   INT PRIMARY KEY AUTO_INCREMENT,
  department_name VARCHAR(100) UNIQUE NOT NULL
);

-- department_id is an extra nullable column: it links a COORDINATOR to a department
CREATE TABLE users (
  user_id       INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,          -- stored as SHA2-256 hash
  role          VARCHAR(30)  NOT NULL,
  department_id INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_role CHECK (role IN ('ADMIN','STUDENT','INVIGILATOR','COORDINATOR')),
  FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE students (
  student_id      INT PRIMARY KEY AUTO_INCREMENT,
  register_number VARCHAR(30) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(100) UNIQUE,
  semester        INT,
  department_id   INT,
  user_id         INT,
  CONSTRAINT chk_semester CHECK (semester BETWEEN 1 AND 10),
  FOREIGN KEY (department_id) REFERENCES departments(department_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE invigilators (
  invigilator_id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id    VARCHAR(30) UNIQUE NOT NULL,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(100) UNIQUE,
  department_id  INT,
  user_id        INT,
  FOREIGN KEY (department_id) REFERENCES departments(department_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE exam_halls (
  hall_id      INT PRIMARY KEY AUTO_INCREMENT,
  hall_number  VARCHAR(30) UNIQUE NOT NULL,
  building     VARCHAR(100),
  floor_number INT,
  capacity     INT NOT NULL,
  status       VARCHAR(30) DEFAULT 'Available',
  CONSTRAINT chk_capacity CHECK (capacity > 0),
  CONSTRAINT chk_status CHECK (status IN ('Available','Under Maintenance'))
);

CREATE TABLE exams (
  exam_id       INT PRIMARY KEY AUTO_INCREMENT,
  subject_code  VARCHAR(30)  NOT NULL,
  subject_name  VARCHAR(100) NOT NULL,
  semester      INT,
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE exam_schedules (
  schedule_id INT PRIMARY KEY AUTO_INCREMENT,
  exam_id     INT,
  exam_date   DATE,
  start_time  TIME,
  end_time    TIME,
  CONSTRAINT chk_time CHECK (end_time > start_time),
  FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

-- One row per (schedule, hall). A hall cannot be booked twice for the same schedule.
CREATE TABLE hall_allocations (
  allocation_id      INT PRIMARY KEY AUTO_INCREMENT,
  schedule_id        INT,
  hall_id            INT,
  allocated_students INT DEFAULT 0,
  UNIQUE (schedule_id, hall_id),
  FOREIGN KEY (schedule_id) REFERENCES exam_schedules(schedule_id) ON DELETE CASCADE,
  FOREIGN KEY (hall_id) REFERENCES exam_halls(hall_id)
);

-- schedule_id is repeated here so the database itself can guarantee
-- "one seat per student per examination" with UNIQUE (schedule_id, student_id)
CREATE TABLE seat_allocations (
  seat_id       INT PRIMARY KEY AUTO_INCREMENT,
  allocation_id INT,
  schedule_id   INT NOT NULL,
  student_id    INT,
  seat_number   VARCHAR(20),
  UNIQUE (allocation_id, seat_number),          -- same seat never twice in a hall
  UNIQUE (schedule_id, student_id),             -- student never seated twice for an exam
  FOREIGN KEY (allocation_id) REFERENCES hall_allocations(allocation_id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES exam_schedules(schedule_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE TABLE invigilator_assignments (
  assignment_id  INT PRIMARY KEY AUTO_INCREMENT,
  allocation_id  INT,
  invigilator_id INT,
  UNIQUE (allocation_id, invigilator_id),
  FOREIGN KEY (allocation_id) REFERENCES hall_allocations(allocation_id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES invigilators(invigilator_id)
);

-- ===================== SAMPLE DATA =====================
INSERT INTO departments (department_name) VALUES
 ('Computer Applications'),('Computer Science'),('Commerce'),('Electronics');

INSERT INTO users (name,email,password,role,department_id) VALUES
 ('Exam Administrator','admin@college.com',SHA2('Admin@123',256),'ADMIN',NULL),
 ('Devanandha','student@college.com',SHA2('Student@123',256),'STUDENT',NULL),
 ('Dr. Suresh Kumar','invigilator@college.com',SHA2('Invigilator@123',256),'INVIGILATOR',NULL),
 ('Prof. Anitha Varma','coordinator@college.com',SHA2('Coordinator@123',256),'COORDINATOR',1);

INSERT INTO students (register_number,name,email,semester,department_id,user_id) VALUES
 ('INMCA24001','Devanandha','student@college.com',3,1,2),
 ('INMCA24002','Anjali Menon','anjali.menon@college.com',3,1,NULL),
 ('INMCA24003','Arjun Nair','arjun.nair@college.com',3,1,NULL),
 ('INMCA24004','Fathima Rahman','fathima.rahman@college.com',3,1,NULL),
 ('INMCA24005','Rahul Krishnan','rahul.krishnan@college.com',3,1,NULL),
 ('INMCA24006','Sneha Thomas','sneha.thomas@college.com',3,1,NULL),
 ('INCS24001','Kiran Das','kiran.das@college.com',3,2,NULL),
 ('INCS24002','Meera Pillai','meera.pillai@college.com',3,2,NULL),
 ('INCOM25001','Joseph Mathew','joseph.mathew@college.com',1,3,NULL),
 ('INEC24001','Nikhil Varghese','nikhil.varghese@college.com',3,4,NULL);

INSERT INTO invigilators (employee_id,name,email,department_id,user_id) VALUES
 ('EMP001','Dr. Suresh Kumar','invigilator@college.com',1,3),
 ('EMP002','Prof. Latha Nair','latha.nair@college.com',2,NULL),
 ('EMP003','Prof. Biju Thomas','biju.thomas@college.com',4,NULL);

INSERT INTO exam_halls (hall_number,building,floor_number,capacity,status) VALUES
 ('A101','Block A',1,30,'Available'),
 ('A102','Block A',1,30,'Available'),
 ('A103','Block A',1,40,'Available'),
 ('B201','Block B',2,50,'Available');

INSERT INTO exams (subject_code,subject_name,semester,department_id) VALUES
 ('MCA301','Database Management Systems',3,1),
 ('MCA302','Software Engineering',3,1),
 ('CS301','Data Structures',3,2),
 ('COM101','Financial Accounting',1,3),
 ('EC301','Digital Electronics',3,4);

INSERT INTO exam_schedules (exam_id,exam_date,start_time,end_time) VALUES
 (1,'2026-10-15','10:00:00','13:00:00'),
 (2,'2026-10-16','10:00:00','13:00:00'),
 (3,'2026-10-15','10:00:00','13:00:00');
