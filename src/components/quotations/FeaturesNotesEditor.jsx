import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

// Controlled click-to-edit Field/Value table, shared between the formation
// quotation creation modal and the admin preset-editing settings section.
export default function FeaturesNotesEditor({ rows, onChange }) {
  const [editingCell, setEditingCell] = useState(null) // { rowIndex, col }

  function updateRow(idx, col, value) {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [col]: value }
    onChange(updated)
  }

  function addRow() {
    onChange([...rows, { field: '', value: '' }])
    setEditingCell({ rowIndex: rows.length, col: 'field' })
  }

  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 28px', gap: 8, background: 'var(--bg-elevated)', padding: '10px 14px', borderBottom: '1px solid var(--bg-border)' }}>
          {['Field', 'Value', ''].map(h => (
            <div key={h} style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>

        {rows.map((row, idx) => {
          const fieldActive = editingCell?.rowIndex === idx && editingCell?.col === 'field'
          const valueActive = editingCell?.rowIndex === idx && editingCell?.col === 'value'
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '260px 1fr 28px', gap: 8, padding: '10px 14px', borderBottom: idx < rows.length - 1 ? '1px solid var(--bg-border)' : 'none', alignItems: 'start' }}>
              {fieldActive ? (
                <input
                  className="input-base"
                  style={{ fontSize: 12, fontWeight: 600 }}
                  autoFocus
                  value={row.field}
                  onChange={e => updateRow(idx, 'field', e.target.value)}
                  onBlur={() => setEditingCell(null)}
                />
              ) : (
                <div
                  onClick={() => setEditingCell({ rowIndex: idx, col: 'field' })}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'text', padding: '8px 0', whiteSpace: 'pre-wrap' }}
                >
                  {row.field || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Click to add field name...</span>}
                </div>
              )}

              {valueActive ? (
                <textarea
                  className="input-base"
                  style={{ fontSize: 12, resize: 'vertical' }}
                  rows={3}
                  autoFocus
                  value={row.value}
                  onChange={e => updateRow(idx, 'value', e.target.value)}
                  onBlur={() => setEditingCell(null)}
                />
              ) : (
                <div
                  onClick={() => setEditingCell({ rowIndex: idx, col: 'value' })}
                  style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'text', padding: '8px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                >
                  {row.value || <span style={{ color: 'var(--text-muted)' }}>Click to add value...</span>}
                </div>
              )}

              <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', paddingTop: 8 }}>
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      <button onClick={addRow} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--bg-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, width: '100%', justifyContent: 'center' }}>
        <Plus size={14} /> Add row
      </button>
    </div>
  )
}
