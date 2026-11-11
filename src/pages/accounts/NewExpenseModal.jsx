import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { useCreateExpense, useUpdateExpense } from '../../hooks/useExpenses'
import { useCases } from '../../hooks/useCases'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const EXPENSE_TYPES = [
  { value: 'case_expense', label: 'Case Expense' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
]
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

export default function NewExpenseModal({ onClose, expense = null }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: createExpense, isPending: creating } = useCreateExpense()
  const { mutateAsync: updateExpense, isPending: updating } = useUpdateExpense()
  const isEditing = !!expense
  const isPending = creating || updating

  const [title, setTitle] = useState(expense?.title || '')
  const [expenseType, setExpenseType] = useState(expense?.expense_type || 'case_expense')
  const [caseSearch, setCaseSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState(expense?.case || null)
  const [showCaseDrop, setShowCaseDrop] = useState(false)
  const [date, setDate] = useState(expense?.expense_date || new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method || 'cash')
  const [category, setCategory] = useState(expense?.category || '')
  const [description, setDescription] = useState(expense?.description || '')
  const [notes, setNotes] = useState(expense?.notes || '')
  const [isReimbursable, setIsReimbursable] = useState(expense?.is_reimbursable || false)

  const { data: caseResults = [] } = useCases(caseSearch.trim() ? { search: caseSearch } : {})

  async function handleSubmit() {
    if (!title.trim()) { toast('Title is required', 'error'); return }
    if (!amount || Number(amount) <= 0) { toast('Enter a valid amount', 'error'); return }
    if (expenseType === 'case_expense' && !selectedCase) { toast('Select a case', 'error'); return }

    const isCase = expenseType === 'case_expense'
    const payload = {
      title: title.trim(),
      expense_type: expenseType,
      case_id: isCase ? selectedCase?.id || null : null,
      client_id: isCase ? selectedCase?.client_id || null : null,
      expense_date: date,
      amount: Number(amount),
      currency: 'QAR',
      payment_method: paymentMethod,
      category: category.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      is_reimbursable: isReimbursable,
    }

    try {
      if (isEditing) {
        await updateExpense({ id: expense.id, ...payload })
        toast('Expense updated', 'success')
      } else {
        await createExpense({ ...payload, created_by: profile?.id, status: 'recorded' })
        toast('Expense recorded', 'success')
      }
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save expense', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</label>
            <input className="input-base" placeholder="e.g. Trade license fee" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expense Type</label>
              <select
                className="input-base"
                value={expenseType}
                onChange={e => { setExpenseType(e.target.value); if (e.target.value !== 'case_expense') setSelectedCase(null) }}
              >
                {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
              <input className="input-base" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {expenseType === 'case_expense' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Case *</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-base"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search case by title or number..."
                  value={selectedCase ? `${selectedCase.title} (${selectedCase.case_number})` : caseSearch}
                  onChange={e => { setCaseSearch(e.target.value); setSelectedCase(null); setShowCaseDrop(true) }}
                  onFocus={() => setShowCaseDrop(true)}
                />
              </div>
              {showCaseDrop && !selectedCase && caseResults.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                  {caseResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCase(c); setShowCaseDrop(false) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bg-border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {c.case_number} · {c.client?.company_name || c.client?.contact_person}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (QAR) *</label>
              <input className="input-base" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Method</label>
              <select className="input-base" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
            <input className="input-base" placeholder="e.g. Government Fees, Transportation" value={category} onChange={e => setCategory(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
            <textarea className="input-base" rows={2} value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
            <textarea className="input-base" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Is Reimbursable</label>
            <button
              type="button"
              onClick={() => setIsReimbursable(v => !v)}
              style={{
                width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flexShrink: 0,
                background: isReimbursable ? '#2563eb' : 'var(--bg-elevated)', transition: 'background 0.15s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: isReimbursable ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
                background: '#ffffff', transition: 'left 0.15s',
              }} />
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
