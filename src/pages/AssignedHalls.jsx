import { useContext, useEffect, useState } from 'react';
import { Auth } from '../AuthContext';
import { api, qs, fd, range } from '../services/api';
import Table from '../components/Table';

// INVIGILATOR: halls assigned to the logged-in invigilator
export default function AssignedHalls() {
  const { user } = useContext(Auth);
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/allocations' + qs({ user_id: user.user_id })).then(setRows); }, []);
  return (
    <div><h2>Assigned Halls</h2>
      <Table rows={rows} cols={[{ k: 'hall_number', l: 'Hall' }, { k: 'subject_name', l: 'Exam' },
        { k: 'exam_date', l: 'Date', f: fd }, { k: 'start_time', l: 'Time', f: (v, r) => range(r) },
        { k: 'capacity', l: 'Capacity' }, { k: 'students', l: 'Students' }]} />
    </div>
  );
}
