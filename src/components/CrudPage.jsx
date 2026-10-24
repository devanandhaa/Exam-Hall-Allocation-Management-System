import { useEffect, useState } from 'react';
import { api, qs } from '../services/api';
import Table from './Table';
import Toast from './Toast';

/**
 * One reusable page for Create / Read / Update / Delete + search.
 * res = API name, fields = form inputs, columns = table columns, actions = allowed buttons.
 * filter = extra query (e.g. department_id for a coordinator).
 */
export default function CrudPage({ title, res, pk, columns, fields, actions = ['add', 'edit', 'delete'], filter = {} }) {
  const [rows, setRows] = useState([]);
  const [opts, setOpts] = useState({});      // dropdown options loaded from MySQL
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);    // null = modal closed
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = (text, type = 'ok') => setMsg({ text, type });

  const load = () => {
    setLoading(true);
    api.get(`/${res}` + qs(filter)).then(setRows).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    fields.filter((f) => f.from).forEach((f) =>
      api.get(`/${f.from}` + qs(filter)).then((d) =>
        setOpts((o) => ({ ...o, [f.name]: d.map((r) => ({ value: r[f.value], label: f.opt(r) })) }))));
  }, []);

  const openForm = (row) => setForm(row
    ? { ...row, _id: row[pk], start_time: row.start_time?.slice(0, 5), end_time: row.end_time?.slice(0, 5) }
    : { _id: null });

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(fields.map((f) => [f.name, form[f.name] ?? '']));
    try {
      if (form._id) await api.put(`/${res}/${form._id}`, body); else await api.post(`/${res}`, body);
      toast(form._id ? 'Updated successfully.' : 'Added successfully.');
      setForm(null); load();
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async (row) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.del(`/${res}/${row[pk]}`); toast('Deleted successfully.'); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  const shown = rows.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(search.toLowerCase()));
  const canRow = actions.includes('edit') || actions.includes('delete');

  return (
    <div>
      <div className="page-head">
        <h2>{title}</h2>
        <div className="tools no-print">
          <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {actions.includes('add') && <button className="btn" onClick={() => openForm(null)}>Add new</button>}
        </div>
      </div>
      <Toast msg={msg} onClose={() => setMsg(null)} />
      {loading ? <p className="empty">Loading...</p> : (
        <Table cols={columns} rows={shown} extra={canRow && ((r) => (<>
          {actions.includes('edit') && <button className="btn sm ghost" onClick={() => openForm(r)}>Edit</button>}
          {actions.includes('delete') && <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>}
        </>))} />
      )}

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{form._id ? 'Edit' : 'Add'} {title.toLowerCase()}</h3>
            {fields.map((f) => (
              <label key={f.name}>{f.label}
                {f.type === 'select' ? (
                  <select value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">-- Select --</option>
                    {(f.options ? f.options.map((o) => ({ value: o, label: o })) : opts[f.name] || [])
                      .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} value={form[f.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </label>
            ))}
            <div className="modal-btns">
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
