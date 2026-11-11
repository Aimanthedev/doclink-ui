import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const reorderBtnStyle = (disabled) => ({
  background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--bg-border-hover)' : 'var(--text-muted)',
  padding: 2, lineHeight: 1, display: 'block',
})

function FeeRow({ id, fee, idx, rowCount, priceActive, onEditPrice, onStopEditPrice, updateRow, removeRow, moveRowUp, moveRowDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const priceNum = Number(fee.price) || 0

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, display: 'grid', gridTemplateColumns: '64px 1fr 140px 28px', gap: 8, padding: '10px 14px', borderBottom: idx < rowCount - 1 ? '1px solid var(--bg-border)' : 'none', alignItems: 'center' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button {...attributes} {...listeners} aria-label="Drag to reorder" style={{ background: 'none', border: 'none', cursor: 'grab', color: 'var(--text-muted)', padding: 2, display: 'flex', touchAction: 'none' }}>
          <GripVertical size={14} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <button onClick={() => moveRowUp(idx)} disabled={idx === 0} style={reorderBtnStyle(idx === 0)}>
            <ChevronUp size={14} />
          </button>
          <button onClick={() => moveRowDown(idx)} disabled={idx === rowCount - 1} style={reorderBtnStyle(idx === rowCount - 1)}>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <input
        className="input-base"
        style={{ fontSize: 12 }}
        value={fee.description}
        onChange={e => updateRow(idx, 'description', e.target.value)}
      />
      {priceActive ? (
        <input
          className="input-base"
          style={{ fontSize: 12, textAlign: 'right' }}
          type="number"
          min="0"
          step="0.01"
          autoFocus
          value={fee.price}
          onChange={e => updateRow(idx, 'price', e.target.value)}
          onBlur={onStopEditPrice}
        />
      ) : (
        <div
          onClick={onEditPrice}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', cursor: 'text', padding: '8px 0' }}
        >
          {priceNum === 0 ? '-' : priceNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      )}
      <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// Controlled click-to-edit Description/Price table, shared between the formation
// quotation creation modal and the admin preset-editing settings section.
export default function FeesEditor({ rows, onChange }) {
  const [editingPriceRow, setEditingPriceRow] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function updateRow(idx, field, value) {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  function addRow() {
    onChange([...rows, { description: '', price: 0 }])
  }

  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx))
  }

  function moveRowUp(idx) {
    if (idx === 0) return
    const updated = [...rows]
    ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
    onChange(updated)
  }

  function moveRowDown(idx) {
    if (idx >= rows.length - 1) return
    const updated = [...rows]
    ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
    onChange(updated)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onChange(arrayMove(rows, Number(active.id), Number(over.id)))
  }

  const ids = rows.map((_, idx) => String(idx))

  return (
    <div>
      <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 140px 28px', gap: 8, background: 'var(--bg-elevated)', padding: '10px 14px', borderBottom: '1px solid var(--bg-border)' }}>
          {['', 'Description', 'Price (QAR)', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {rows.map((fee, idx) => (
              <FeeRow
                key={idx}
                id={String(idx)}
                fee={fee}
                idx={idx}
                rowCount={rows.length}
                priceActive={editingPriceRow === idx}
                onEditPrice={() => setEditingPriceRow(idx)}
                onStopEditPrice={() => setEditingPriceRow(null)}
                updateRow={updateRow}
                removeRow={removeRow}
                moveRowUp={moveRowUp}
                moveRowDown={moveRowDown}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <button onClick={addRow} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--bg-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, width: '100%', justifyContent: 'center' }}>
        <Plus size={14} /> Add row
      </button>
    </div>
  )
}
