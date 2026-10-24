import { useContext, useState } from 'react';
import { Auth } from '../AuthContext';
import { api } from '../services/api';

export default function Login() {
  const { login } = useContext(Auth);
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.email || !f.password) return setErr('Enter your email and password.');
    setBusy(true);
    try { login(await api.post('/login', f)); }        // checked against the users table in MySQL
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <h2>Exam Hall Allocation Management System</h2>
        <p>Sign in to continue</p>
        {err && <div className="toast error">{err}</div>}
        <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
