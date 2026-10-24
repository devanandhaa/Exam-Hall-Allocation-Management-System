// Minimal Express layer: React cannot talk to MySQL directly, so this file only
// receives requests from React and runs SQL. All business rules live in SQL + a few checks.
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1211',      // <-- set your MySQL password (or use DB_PASSWORD env var)
  database: 'exam_hall_management',
  dateStrings: true,                            // return DATE/TIME as plain strings
});
const app = express();
app.use(cors(), express.json());

const q = (sql, p = []) => pool.query(sql, p).then(([r]) => r);
const fail = (m, status = 400) => { throw Object.assign(new Error(m), { status }); };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Wrap every route: send result as JSON, or a friendly error message
const h = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) {
    const map = {
      ER_DUP_ENTRY: 'Duplicate value: register number, hall number, email or code already exists.',
      ER_ROW_IS_REFERENCED_2: 'Cannot delete: this record is used by other data.',
      ER_NO_REFERENCED_ROW_2: 'Invalid department or exam selected.',
      ER_CHECK_CONSTRAINT_VIOLATED: 'A value breaks a rule (check capacity, semester, status or time).',
    };
    res.status(e.status || 500).json({ error: map[e.code] || e.message });
  }
};

// Time-overlap test used for halls, invigilators and schedules:  date = ? AND start < newEnd AND end > newStart
const OVERLAP = 'x.exam_date = ? AND x.start_time < ? AND x.end_time > ?';

// ---------- Login ----------
app.post('/api/login', h(async (req) => {
  const { email, password } = req.body;
  const [u] = await q(
    'SELECT user_id, name, email, role, department_id FROM users WHERE email = ? AND password = SHA2(?,256)',
    [email, password]);
  return u || fail('Invalid email or password.', 401);
}));

// ---------- Dashboard ----------
app.get('/api/stats', h(() => q(`SELECT
  (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(*) FROM exams) AS exams,
  (SELECT COUNT(*) FROM exam_halls) AS halls, (SELECT COUNT(*) FROM invigilators) AS invigilators,
  (SELECT COUNT(*) FROM exam_schedules WHERE exam_date >= CURDATE()) AS upcoming,
  (SELECT COUNT(*) FROM seat_allocations) AS allocated`).then((r) => r[0])));

// ---------- Generic CRUD configuration ----------
const R = {
  departments: { t: 'departments', pk: 'department_id', cols: ['department_name'],
    list: `SELECT d.*, COUNT(s.student_id) AS students FROM departments d
           LEFT JOIN students s ON s.department_id = d.department_id GROUP BY d.department_id`,
    order: 'department_name' },
  students: { t: 'students', pk: 'student_id', cols: ['register_number', 'name', 'email', 'semester', 'department_id'],
    list: `SELECT s.*, d.department_name FROM students s INNER JOIN departments d ON d.department_id = s.department_id`,
    order: 'register_number' },
  halls: { t: 'exam_halls', pk: 'hall_id', cols: ['hall_number', 'building', 'floor_number', 'capacity', 'status'],
    opt: ['building', 'floor_number'], list: 'SELECT * FROM exam_halls', order: 'hall_number',
    check: async (b) => { if (+b.capacity <= 0) fail('Capacity must be greater than 0.'); } },
  exams: { t: 'exams', pk: 'exam_id', cols: ['subject_code', 'subject_name', 'semester', 'department_id'],
    list: `SELECT e.*, d.department_name FROM exams e INNER JOIN departments d ON d.department_id = e.department_id`,
    order: 'subject_code' },
  invigilators: { t: 'invigilators', pk: 'invigilator_id', cols: ['employee_id', 'name', 'email', 'department_id'],
    list: `SELECT i.*, d.department_name FROM invigilators i INNER JOIN departments d ON d.department_id = i.department_id`,
    order: 'employee_id' },
  schedules: { t: 'exam_schedules', pk: 'schedule_id', cols: ['exam_id', 'exam_date', 'start_time', 'end_time'],
    list: `SELECT es.*, e.subject_code, e.subject_name, e.semester, e.department_id, d.department_name
           FROM exam_schedules es INNER JOIN exams e ON e.exam_id = es.exam_id
           INNER JOIN departments d ON d.department_id = e.department_id`,
    order: 'exam_date, start_time',
    // End > start, and no other exam for the same department + semester at the same time
    check: async (b, id) => {
      if (b.end_time <= b.start_time) fail('End time must be later than start time.');
      const [e] = await q('SELECT department_id, semester FROM exams WHERE exam_id = ?', [b.exam_id]);
      if (!e) fail('Select a subject.');
      const clash = await q(`SELECT x.schedule_id FROM exam_schedules x JOIN exams ex ON ex.exam_id = x.exam_id
        WHERE ex.department_id = ? AND ex.semester = ? AND ${OVERLAP} AND x.schedule_id <> ?`,
        [e.department_id, e.semester, b.exam_date, b.end_time, b.start_time, id || 0]);
      if (clash.length) fail('Conflict: this department and semester already has an exam at that time.');
    } },
};
const cfg = (n) => R[n] || fail('Unknown resource.', 404);
const validate = (c, b) => {
  for (const k of c.cols) {
    if ((c.opt || []).includes(k)) continue;
    if (b[k] === undefined || b[k] === null || String(b[k]).trim() === '') fail(`${k.replace(/_/g, ' ')} is required.`);
  }
  if (b.email && !EMAIL.test(b.email)) fail('Invalid email format.');
};
const pick = (c, b) => Object.fromEntries(c.cols.map((k) => [k, b[k] === '' ? null : b[k]]));

// ---------- Allocation helpers ----------
const allocSQL = (where = '') => `
  SELECT ha.allocation_id, ha.schedule_id, e.subject_name, es.exam_date, es.start_time, es.end_time,
         h.hall_number, h.capacity, COUNT(DISTINCT sa.seat_id) AS students,
         GROUP_CONCAT(DISTINCT i.name SEPARATOR ', ') AS invigilators
  FROM hall_allocations ha
  INNER JOIN exam_schedules es ON es.schedule_id = ha.schedule_id
  INNER JOIN exams e ON e.exam_id = es.exam_id
  INNER JOIN exam_halls h ON h.hall_id = ha.hall_id
  LEFT JOIN seat_allocations sa ON sa.allocation_id = ha.allocation_id
  LEFT JOIN invigilator_assignments ia ON ia.allocation_id = ha.allocation_id
  LEFT JOIN invigilators i ON i.invigilator_id = ia.invigilator_id
  ${where} GROUP BY ha.allocation_id ORDER BY es.exam_date, h.hall_number`;

app.get('/api/allocations', h((req) => req.query.user_id
  ? q(allocSQL(`WHERE ha.allocation_id IN (SELECT ia2.allocation_id FROM invigilator_assignments ia2
       JOIN invigilators i2 ON i2.invigilator_id = ia2.invigilator_id WHERE i2.user_id = ?)`), [req.query.user_id])
  : q(allocSQL())));

app.get('/api/seating', h((req) => q(`
  SELECT sa.seat_number, st.register_number, st.name, d.department_name
  FROM seat_allocations sa INNER JOIN students st ON st.student_id = sa.student_id
  INNER JOIN departments d ON d.department_id = st.department_id
  WHERE sa.allocation_id = ? ORDER BY CAST(sa.seat_number AS UNSIGNED)`, [req.query.allocation_id])));

/**
 * AUTOMATIC HALL + SEAT ALLOCATION  (main feature)
 * 1. Load the schedule and reject if it is already allocated.
 * 2. Eligible students = same department + semester as the exam.
 * 3. Usable halls = status 'Available' AND not booked by an overlapping exam.
 * 4. If total capacity < students -> error (never exceed capacity).
 * 5. Fill halls in order (A101, A102, ...), giving seats 1..n in each hall.
 * 6. Everything is saved in ONE transaction: all succeed or nothing is saved.
 */
app.post('/api/allocate', h(async (req) => {
  const id = req.body.schedule_id;
  const [s] = await q(`SELECT es.*, e.department_id, e.semester FROM exam_schedules es
                       JOIN exams e ON e.exam_id = es.exam_id WHERE es.schedule_id = ?`, [id]);
  if (!s) fail('Select an exam schedule.');
  if ((await q('SELECT 1 FROM hall_allocations WHERE schedule_id = ?', [id])).length)
    fail('Students are already allocated for this schedule. Clear the allocation first.');

  const students = await q('SELECT student_id FROM students WHERE department_id = ? AND semester = ? ORDER BY register_number',
    [s.department_id, s.semester]);
  if (!students.length) fail('No eligible students found for this exam.');

  const halls = await q(`SELECT hall_id, hall_number, capacity FROM exam_halls h WHERE status = 'Available'
    AND NOT EXISTS (SELECT 1 FROM hall_allocations ha JOIN exam_schedules x ON x.schedule_id = ha.schedule_id
                    WHERE ha.hall_id = h.hall_id AND ${OVERLAP}) ORDER BY hall_number`,
    [s.exam_date, s.end_time, s.start_time]);
  if (!halls.length) fail('No available hall for this date and time (halls are busy or under maintenance).');

  const seats = halls.reduce((sum, x) => sum + x.capacity, 0);
  if (seats < students.length) fail(`Insufficient seats: ${students.length} students but only ${seats} seats available.`);

  const conn = await pool.getConnection();
  const summary = [];
  try {
    await conn.beginTransaction();
    let next = 0;
    for (const hall of halls) {
      if (next >= students.length) break;
      const group = students.slice(next, next + hall.capacity);   // never more than capacity
      next += group.length;
      const [r] = await conn.query('INSERT INTO hall_allocations (schedule_id, hall_id, allocated_students) VALUES (?,?,?)',
        [id, hall.hall_id, group.length]);
      // seat numbers 1..n; UNIQUE keys in MySQL block duplicate seats/students
      await conn.query('INSERT INTO seat_allocations (allocation_id, schedule_id, student_id, seat_number) VALUES ?',
        [group.map((st, n) => [r.insertId, id, st.student_id, String(n + 1)])]);
      summary.push(`${hall.hall_number}: ${group.length}`);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return { message: `Allocation saved (${students.length} students) - ${summary.join(', ')}` };
}));

app.delete('/api/allocations/:scheduleId', h(async (req) => {
  await q('DELETE FROM hall_allocations WHERE schedule_id = ?', [req.params.scheduleId]);
  return { message: 'Allocation cleared.' };
}));

// Assign invigilator to a hall allocation; blocks the same person at overlapping times
app.post('/api/assign', h(async (req) => {
  const { allocation_id, invigilator_id } = req.body;
  if (!allocation_id || !invigilator_id) fail('Select an invigilator.');
  const [a] = await q(`SELECT es.exam_date, es.start_time, es.end_time FROM hall_allocations ha
                       JOIN exam_schedules es ON es.schedule_id = ha.schedule_id WHERE ha.allocation_id = ?`, [allocation_id]);
  const clash = await q(`SELECT 1 FROM invigilator_assignments ia JOIN hall_allocations ha ON ha.allocation_id = ia.allocation_id
    JOIN exam_schedules x ON x.schedule_id = ha.schedule_id WHERE ia.invigilator_id = ? AND ${OVERLAP}`,
    [invigilator_id, a.exam_date, a.end_time, a.start_time]);
  if (clash.length) fail('Conflict: this invigilator is already assigned at that time.');
  await q('INSERT INTO invigilator_assignments (allocation_id, invigilator_id) VALUES (?,?)', [allocation_id, invigilator_id]);
  return { message: 'Invigilator assigned.' };
}));

// ---------- Student / profile ----------
app.get('/api/my/exams', h((req) => q(`
  SELECT e.subject_code, e.subject_name, es.exam_date, es.start_time, es.end_time, h.hall_number, sa.seat_number
  FROM students st
  INNER JOIN exams e ON e.department_id = st.department_id AND e.semester = st.semester
  INNER JOIN exam_schedules es ON es.exam_id = e.exam_id
  LEFT JOIN seat_allocations sa ON sa.schedule_id = es.schedule_id AND sa.student_id = st.student_id
  LEFT JOIN hall_allocations ha ON ha.allocation_id = sa.allocation_id
  LEFT JOIN exam_halls h ON h.hall_id = ha.hall_id
  WHERE st.user_id = ? ORDER BY es.exam_date`, [req.query.user_id])));

app.get('/api/my/profile', h(async (req) => {
  const id = req.query.user_id;
  const [u] = await q('SELECT role FROM users WHERE user_id = ?', [id]);
  const sql = {
    STUDENT: `SELECT st.register_number, st.name, st.email, st.semester, d.department_name FROM students st
              JOIN departments d ON d.department_id = st.department_id WHERE st.user_id = ?`,
    INVIGILATOR: `SELECT i.employee_id, i.name, i.email, d.department_name FROM invigilators i
              JOIN departments d ON d.department_id = i.department_id WHERE i.user_id = ?`,
  }[u?.role] || `SELECT u.name, u.email, u.role, d.department_name FROM users u
              LEFT JOIN departments d ON d.department_id = u.department_id WHERE u.user_id = ?`;
  return (await q(sql, [id]))[0] || {};
}));

// ---------- Reports (real JOIN queries) ----------
const REPORTS = {
  students: `SELECT st.register_number, st.name AS student, d.department_name AS department, e.subject_name AS subject,
      es.exam_date, h.hall_number AS hall, sa.seat_number AS seat
    FROM seat_allocations sa JOIN students st ON st.student_id = sa.student_id
    JOIN departments d ON d.department_id = st.department_id
    JOIN hall_allocations ha ON ha.allocation_id = sa.allocation_id JOIN exam_halls h ON h.hall_id = ha.hall_id
    JOIN exam_schedules es ON es.schedule_id = ha.schedule_id JOIN exams e ON e.exam_id = es.exam_id
    ORDER BY es.exam_date, h.hall_number, CAST(sa.seat_number AS UNSIGNED)`,
  halls: `SELECT h.hall_number AS hall, h.capacity, h.status, COUNT(sa.seat_id) AS students_allocated,
      COUNT(DISTINCT ha.allocation_id) AS exams_hosted
    FROM exam_halls h LEFT JOIN hall_allocations ha ON ha.hall_id = h.hall_id
    LEFT JOIN seat_allocations sa ON sa.allocation_id = ha.allocation_id
    GROUP BY h.hall_id ORDER BY h.hall_number`,
  schedules: `SELECT e.subject_code, e.subject_name AS subject, d.department_name AS department, e.semester,
      es.exam_date, es.start_time, es.end_time
    FROM exam_schedules es JOIN exams e ON e.exam_id = es.exam_id
    JOIN departments d ON d.department_id = e.department_id ORDER BY es.exam_date, es.start_time`,
  invigilators: `SELECT i.employee_id, i.name AS invigilator, h.hall_number AS hall, e.subject_name AS subject,
      es.exam_date, es.start_time, es.end_time
    FROM invigilator_assignments ia JOIN invigilators i ON i.invigilator_id = ia.invigilator_id
    JOIN hall_allocations ha ON ha.allocation_id = ia.allocation_id JOIN exam_halls h ON h.hall_id = ha.hall_id
    JOIN exam_schedules es ON es.schedule_id = ha.schedule_id JOIN exams e ON e.exam_id = es.exam_id
    ORDER BY es.exam_date, i.name`,
};
app.get('/api/reports/:name', h((req) => q(REPORTS[req.params.name] || fail('Unknown report.', 404))));

// ---------- Generic CRUD routes (kept last so specific routes match first) ----------
app.get('/api/:r', h((req) => {
  const c = cfg(req.params.r);
  const dep = req.query.department_id;   // used to limit a coordinator to their department
  return q(`SELECT * FROM (${c.list}) x ${dep ? 'WHERE x.department_id = ?' : ''} ORDER BY ${c.order}`, dep ? [dep] : []);
}));
app.post('/api/:r', h(async (req) => {
  const c = cfg(req.params.r); validate(c, req.body);
  await c.check?.(req.body);
  await q(`INSERT INTO ${c.t} SET ?`, [pick(c, req.body)]);
  return { message: 'Saved.' };
}));
app.put('/api/:r/:id', h(async (req) => {
  const c = cfg(req.params.r); validate(c, req.body);
  await c.check?.(req.body, +req.params.id);
  await q(`UPDATE ${c.t} SET ? WHERE ${c.pk} = ?`, [pick(c, req.body), req.params.id]);
  return { message: 'Updated.' };
}));
app.delete('/api/:r/:id', h(async (req) => {
  const c = cfg(req.params.r);
  await q(`DELETE FROM ${c.t} WHERE ${c.pk} = ?`, [req.params.id]);
  return { message: 'Deleted.' };
}));

app.listen(5000, () => console.log('API running on http://localhost:5000'));
