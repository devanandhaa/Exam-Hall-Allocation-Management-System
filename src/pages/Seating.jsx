import { useContext, useEffect, useState } from 'react';
import { Auth } from '../AuthContext';
import { api, qs, fd, range } from '../services/api';
import Table from '../components/Table';

// Seating arrangement. Admin sees every allocation; invigilator (mine) sees only own halls.
export default function Seating({ mine }) {
  const { user } = useContext(Auth);
  const [allocs, setAllocs] = useState([]);
  const [sid, setSid] = useState('');
  const [aid, setAid] = useState('');
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');

  useEffect(() => { api.get('/allocations' + qs(mine ? { user_id: user.user_id } : {})).then(setAllocs); }, []);
  useEffect(() => { setRows([]); if (aid) api.get('/seating' + qs({ allocation_id: aid })).then(setRows); }, [aid]);

  const exams = [...new Map(allocs.map((a) => [a.schedule_id, a])).values()];       // one entry per exam
  const halls = allocs.filter((a) => String(a.schedule_id) === sid);
  const cur = allocs.find((a) => String(a.allocation_id) === aid);
  const depts = [...new Set(rows.map((r) => r.department_name))];
  const shown = rows.filter((r) => (!dept || r.department_name === dept) &&
    JSON.stringify(Object.values(r)).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-head"><h2>Seating Arrangement</h2>
        {aid && <button className="btn no-print" onClick={() => window.print()}>Print</button>}</div>
      <div className="panel no-print">
        <select value={sid} onChange={(e) => { setSid(e.target.value); setAid(''); }}>
          <option value="">-- Select exam --</option>
          {exams.map((a) => <option key={a.schedule_id} value={a.schedule_id}>{a.subject_name} ({fd(a.exam_date)})</option>)}
        </select>
        <select value={aid} onChange={(e) => setAid(e.target.value)} disabled={!sid}>
          <option value="">-- Select hall --</option>
          {halls.map((a) => <option key={a.allocation_id} value={a.allocation_id}>{a.hall_number}</option>)}
        </select>
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {depts.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      {cur && <p className="info">{cur.subject_name} | Hall {cur.hall_number} | {fd(cur.exam_date)} | {range(cur)} | {cur.students} of {cur.capacity} seats used</p>}
      {aid ? <Table rows={shown} cols={[{ k: 'seat_number', l: 'Seat No.' }, { k: 'register_number', l: 'Register No.' },
        { k: 'name', l: 'Student Name' }, { k: 'department_name', l: 'Department' }]} />
        : <p className="empty">Select an exam and a hall to view the seating arrangement.</p>}
    </div>
  );
}
