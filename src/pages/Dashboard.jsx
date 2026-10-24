import { useContext, useEffect, useState } from 'react';
import { Auth } from '../AuthContext';
import { api, qs, fd } from '../services/api';

// Cards for each role, loaded from MySQL
export default function Dashboard() {
  const { user } = useContext(Auth);
  const [cards, setCards] = useState(null);
  useEffect(() => {
    const dep = { department_id: user.department_id };
    const load = {
      ADMIN: async () => { const s = await api.get('/stats');
        return [['Total Students', s.students], ['Total Exams', s.exams], ['Total Halls', s.halls],
          ['Total Invigilators', s.invigilators], ['Upcoming Exams', s.upcoming], ['Allocated Students', s.allocated]]; },
      STUDENT: async () => { const e = await api.get('/my/exams' + qs({ user_id: user.user_id }));
        return [['My Exams', e.length], ['Halls Allocated', e.filter((x) => x.hall_number).length],
          ['Next Exam', e[0] ? fd(e[0].exam_date) : 'None']]; },
      INVIGILATOR: async () => { const a = await api.get('/allocations' + qs({ user_id: user.user_id }));
        return [['Assigned Halls', a.length], ['Students to Supervise', a.reduce((n, x) => n + x.students, 0)]]; },
      COORDINATOR: async () => { const [s, e, c] = await Promise.all(['students', 'exams', 'schedules'].map((r) => api.get(`/${r}` + qs(dep))));
        return [['Department Students', s.length], ['Examinations', e.length], ['Scheduled Exams', c.length]]; },
    };
    load[user.role]().then(setCards).catch(() => setCards([]));
  }, []);
  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      {!cards ? <p className="empty">Loading...</p> : (
        <div className="cards">{cards.map(([l, v]) => <div className="card" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      )}
    </div>
  );
}
