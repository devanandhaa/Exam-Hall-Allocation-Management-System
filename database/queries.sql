USE exam_hall_management;

-- 1. SELECT with WHERE + ORDER BY
SELECT * FROM students WHERE semester = 3 ORDER BY register_number;

-- 2. INNER JOIN: students with department name
SELECT s.register_number, s.name, d.department_name
FROM students s INNER JOIN departments d ON d.department_id = s.department_id;

-- 3. LEFT JOIN + COUNT + GROUP BY: students per department (includes empty ones)
SELECT d.department_name, COUNT(s.student_id) AS total_students
FROM departments d LEFT JOIN students s ON s.department_id = d.department_id
GROUP BY d.department_id ORDER BY total_students DESC;

-- 4. JOIN: exam schedules with subject names
SELECT e.subject_code, e.subject_name, es.exam_date, es.start_time, es.end_time
FROM exam_schedules es INNER JOIN exams e ON e.exam_id = es.exam_id
ORDER BY es.exam_date;

-- 5. JOIN + COUNT: halls and their allocated student count
SELECT h.hall_number, h.capacity, COUNT(sa.seat_id) AS students_seated
FROM exam_halls h
LEFT JOIN hall_allocations ha ON ha.hall_id = h.hall_id
LEFT JOIN seat_allocations sa ON sa.allocation_id = ha.allocation_id
GROUP BY h.hall_id;

-- 6. Multiple JOINs: each student with hall and seat
SELECT st.register_number, st.name, e.subject_name, es.exam_date, h.hall_number, sa.seat_number
FROM seat_allocations sa
JOIN students st        ON st.student_id    = sa.student_id
JOIN hall_allocations ha ON ha.allocation_id = sa.allocation_id
JOIN exam_halls h       ON h.hall_id        = ha.hall_id
JOIN exam_schedules es  ON es.schedule_id   = ha.schedule_id
JOIN exams e            ON e.exam_id        = es.exam_id
ORDER BY es.exam_date, h.hall_number, CAST(sa.seat_number AS UNSIGNED);

-- 7. Available halls for a time slot (excludes maintenance + clashes)
SELECT hall_number, capacity FROM exam_halls h
WHERE status = 'Available' AND NOT EXISTS (
  SELECT 1 FROM hall_allocations ha JOIN exam_schedules x ON x.schedule_id = ha.schedule_id
  WHERE ha.hall_id = h.hall_id AND x.exam_date = '2026-10-15'
    AND x.start_time < '13:00:00' AND x.end_time > '10:00:00');

-- 8. Aggregates
SELECT SUM(capacity) AS total_seats, MAX(capacity) AS largest_hall, AVG(capacity) AS avg_capacity FROM exam_halls;

-- 9. Search (LIKE)
SELECT * FROM students WHERE name LIKE '%an%' OR register_number LIKE 'INMCA%';

-- 10. INSERT / UPDATE / DELETE
INSERT INTO exam_halls (hall_number,building,floor_number,capacity) VALUES ('C301','Block C',3,60);
UPDATE exam_halls SET status = 'Under Maintenance' WHERE hall_number = 'C301';
DELETE FROM exam_halls WHERE hall_number = 'C301';

-- 11. Invigilator assignments
SELECT i.name AS invigilator, h.hall_number, e.subject_name, es.exam_date
FROM invigilator_assignments ia
JOIN invigilators i ON i.invigilator_id = ia.invigilator_id
JOIN hall_allocations ha ON ha.allocation_id = ia.allocation_id
JOIN exam_halls h ON h.hall_id = ha.hall_id
JOIN exam_schedules es ON es.schedule_id = ha.schedule_id
JOIN exams e ON e.exam_id = es.exam_id;

-- 12. Constraint demo (each of these FAILS by design)
-- INSERT INTO students (register_number,name) VALUES ('INMCA24001','Duplicate');      -- UNIQUE
-- INSERT INTO exam_halls (hall_number,capacity) VALUES ('Z1',-5);                      -- CHECK
-- DELETE FROM departments WHERE department_id = 1;                                     -- FOREIGN KEY
