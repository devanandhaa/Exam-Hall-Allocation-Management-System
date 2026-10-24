import { Fragment, useContext, useEffect, useState } from 'react';
import { Auth } from '../AuthContext';
import { api, qs, fd, t5 } from '../services/api';
import Table from '../components/Table';

const useMine = (path) => {
  const { user } = useContext(Auth);
  const [data, setData] = useState(null);
  useEffect(() => { api.get(path + qs({ user_id: user.user_id })).then(setData); }, []);
  return data;
};

// STUDENT: all exams for the student's department + semester
export function MyExams() {
  const rows = useMine('/my/exams') || [];
  return (
    <div><h2>My Exams</h2>
      <Table rows={rows} cols={[{ k: 'subject_code', l: 'Code' }, { k: 'subject_name', l: 'Subject' },
        { k: 'exam_date', l: 'Date', f: fd }, { k: 'start_time', l: 'Time', f: (v, r) => `${t5(r.start_time)} - ${t5(r.end_time)}` },
        { k: 'hall_number', l: 'Hall', f: (v) => v || 'Not allocated' }, { k: 'seat_number', l: 'Seat', f: (v) => v || '-' }]} />
    </div>
  );
}

// STUDENT: printable hall allocation slips (Print -> Save as PDF to download)
export function MyHall() {
  const rows = (useMine('/my/exams') || []).filter((r) => r.hall_number);
  const me = useMine('/my/profile') || {};
  return (
    <div>
      <div className="page-head"><h2>My Hall &amp; Seat</h2>
        {rows.length > 0 && <button className="btn no-print" onClick={() => window.print()}>Download / Print</button>}</div>
      {!rows.length && <p className="empty">Your hall has not been allocated yet.</p>}
      {rows.map((r) => (
        <div className="slip" key={r.subject_code}>
          <h3>EXAM HALL ALLOCATION</h3>
          <dl>
            <dt>Student Name</dt><dd>{me.name}</dd>
            <dt>Register Number</dt><dd>{me.register_number}</dd>
            <dt>Subject</dt><dd>{r.subject_name}</dd>
            <dt>Date</dt><dd>{fd(r.exam_date)}</dd>
            <dt>Time</dt><dd>{t5(r.start_time)} - {t5(r.end_time)}</dd>
            <dt>Hall</dt><dd>{r.hall_number}</dd>
            <dt>Seat Number</dt><dd>{r.seat_number}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}

// STUDENT / INVIGILATOR: profile
export function Profile() {
  const p = useMine('/my/profile') || {};
  return (
    <div><h2>Profile</h2>
      <div className="slip"><dl>{Object.entries(p).map(([k, v]) =>
        <Fragment key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></Fragment>)}</dl></div>
    </div>
  );
}
