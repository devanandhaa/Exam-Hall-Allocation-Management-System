// Reusable table. cols: [{ k: key, l: heading, f?: (value,row)=>display }]; extra(row) renders an Actions cell
export default function Table({ cols, rows, extra }) {
  if (!rows.length) return <p className="empty">No records found.</p>;
  return (
    <div className="tbl">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.l}>{c.l}</th>)}{extra && <th className="no-print">Actions</th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => <td key={c.l}>{c.f ? c.f(r[c.k], r) : r[c.k]}</td>)}
              {extra && <td className="no-print actions">{extra(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
