import { useEffect } from 'react';
// Small message bar: msg = { type: 'ok' | 'error', text }
export default function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg]);
  return msg ? <div className={`toast ${msg.type}`} onClick={onClose}>{msg.text}</div> : null;
}
