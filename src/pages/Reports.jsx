import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Table from '../components/Table';

const TABS = [['students', 'Student Allocation'], ['halls', 'Hall-wise Seating'],
  ['schedules', 'Examination Schedule'], ['invigilators', 'Invigilator Assignment']];

// Each report is a JOIN query on the server; columns are taken from the query result
export default function Reports() {
  const [tab, setTab] = useState('students');
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get(`/reports/${tab}`).then(setRows).catch(() => setRows([])); }, [tab]);
  const cols = Object.keys(rows[0] || {}).map((k) => ({ k, l: k.replace(/_/g, ' ') }));
  return (
    <div>
      <div className="page-head"><h2>Reports</h2><button className="btn no-print" onClick={() => window.print()}>Print</button></div>
      <div className="tabs no-print">{TABS.map(([k, l]) =>
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <h3 className="print-title">{TABS.find((t) => t[0] === tab)[1]} Report</h3>
      <Table rows={rows} cols={cols} />
    </div>
  );
}
