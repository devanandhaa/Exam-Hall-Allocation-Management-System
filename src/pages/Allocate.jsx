import { useEffect, useState } from 'react';
import { api, fd, range } from '../services/api';
import Table from '../components/Table';
import Toast from '../components/Toast';

// ADMIN: pick a schedule -> automatic hall + seat allocation -> assign invigilators
export default function Allocate() {
  const [schedules, setSchedules] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [invs, setInvs] = useState([]);
  const [sid, setSid] = useState('');
  const [pick, setPick] = useState({});        // allocation_id -> chosen invigilator
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/allocations').then(setAllocs);
  useEffect(() => { api.get('/schedules').then(setSchedules); api.get('/invigilators').then(setInvs); load(); }, []);

  const run = async (fn) => {
    setBusy(true);
    try { const r = await fn(); setMsg({ type: 'ok', text: r.message }); await load(); }
    catch (e) { setMsg({ type: 'error', text: e.message }); }
    setBusy(false);
  };

  return (
    <div>
      <h2>Allocate Examination Hall</h2>
      <Toast msg={msg} onClose={() => setMsg(null)} />
      <div className="panel no-print">
        <select value={sid} onChange={(e) => setSid(e.target.value)}>
          <option value="">-- Select exam schedule --</option>
          {schedules.map((s) => <option key={s.schedule_id} value={s.schedule_id}>
            {s.subject_name} | {fd(s.exam_date)} | {range(s)}</option>)}
        </select>
        <button className="btn" disabled={!sid || busy} onClick={() => run(() => api.post('/allocate', { schedule_id: sid }))}>
          Allocate halls and seats</button>
        <button className="btn ghost" disabled={!sid || busy} onClick={() => run(() => api.del(`/allocations/${sid}`))}>
          Clear allocation</button>
      </div>
      <h3>Current allocations</h3>
      <Table rows={allocs} cols={[{ k: 'subject_name', l: 'Exam' }, { k: 'exam_date', l: 'Date', f: fd },
        { k: 'start_time', l: 'Time', f: (v, r) => range(r) }, { k: 'hall_number', l: 'Hall' },
        { k: 'capacity', l: 'Capacity' }, { k: 'students', l: 'Students' },
        { k: 'invigilators', l: 'Invigilators', f: (v) => v || '-' }]}
        extra={(r) => (<>
          <select value={pick[r.allocation_id] || ''} onChange={(e) => setPick({ ...pick, [r.allocation_id]: e.target.value })}>
            <option value="">Invigilator</option>
            {invs.map((i) => <option key={i.invigilator_id} value={i.invigilator_id}>{i.name}</option>)}
          </select>
          <button className="btn sm" disabled={busy}
            onClick={() => run(() => api.post('/assign', { allocation_id: r.allocation_id, invigilator_id: pick[r.allocation_id] }))}>
            Assign</button>
        </>)} />
    </div>
  );
}
