import { useState, useRef, useEffect } from 'react'
import { X, Search, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Pencil, AlertTriangle } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useClients } from '../../hooks/useClients'
import { useLeadsSearch } from '../../hooks/useLeads'
import { useServices } from '../../hooks/useServices'
import { useCreateQuotation, useSaveQuotationEdit } from '../../hooks/useQuotations'
import { useCompanySettings } from '../../hooks/useCompanySettings'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const EMPTY_ITEM = {
  service_id: '', service_name: '', category: '', description: '',
  quantity: 1, unit_type: 'unit', unit_price: 0,
  tax_rate: '', discount_amount: '', notes: '', estimated_delivery: '',
}

const DEFAULT_CLOSING_MESSAGE = 'Thank you for considering DocLink Global Services. We look forward to the opportunity to work with you.'
const DEFAULT_TERMS = 'Payment is due within 7 days of invoice date. This quotation is valid for the period specified above. Delivery timelines are estimates and exclude government processing delays.'

// Small "Client" / "Lead" badge shown next to a picker row or the selected
// entity summary, so it's always obvious which table a match came from.
function EntityTypeBadge({ type }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 10, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
      {type === 'client' ? 'Client' : 'Lead'}
    </span>
  )
}

function entityDisplayName(entity) {
  return entity.data.company_name || entity.data.contact_person
}

function entityCode(entity) {
  return entity.type === 'client' ? entity.data.client_code : entity.data.lead_number
}

function entityPhone(entity) {
  return entity.type === 'client'
    ? entity.data.phone
    : `${entity.data.phone_country_code || '+974'} ${entity.data.phone_number || ''}`.trim()
}

function lineCalc(item) {
  const qty = Number(item.quantity) || 0
  const unitPrice = Number(item.unit_price) || 0
  const gross = qty * unitPrice
  const discount = Number(item.discount_amount) || 0
  const taxable = Math.max(0, gross - discount)
  const taxRate = Number(item.tax_rate) || 0
  const tax = taxable * (taxRate / 100)
  return { gross, discount, tax, total: taxable + tax }
}

function itemsFromQuotation(quotation) {
  if (!quotation?.quotation_items?.length) return [{ ...EMPTY_ITEM }]
  return quotation.quotation_items.map(item => ({
    service_id: item.service_id || '',
    service_name: item.service_name || '',
    category: item.category || '',
    description: item.description || '',
    quantity: item.quantity || 1,
    unit_type: item.unit_type || 'unit',
    unit_price: item.unit_price || 0,
    tax_rate: item.tax_rate ?? '',
    discount_amount: item.discount_amount || '',
    notes: item.notes || '',
    estimated_delivery: item.estimated_delivery || '',
  }))
}

const reorderBtnStyle = (disabled) => ({
  background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? 'var(--bg-border-hover)' : 'var(--text-muted)',
  padding: 3, lineHeight: 1, display: 'block',
})

function SortableServiceRow({
  id, item, idx, itemCount, calc, matches, dropdownPos, setInputRef,
  setActiveServiceRow, updateDropdownPos,
  handleServiceNameChange, selectLibraryService, updateItem,
  moveItemUp, moveItemDown, removeItem,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={{ ...style, padding: '12px 14px', borderBottom: idx < itemCount - 1 ? '1px solid var(--bg-border)' : 'none' }}>
      {/* Row A: core fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '64px 2.4fr 1fr 64px 80px 120px 120px 28px', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button {...attributes} {...listeners} aria-label="Drag to reorder" style={{ background: 'none', border: 'none', cursor: 'grab', color: 'var(--text-muted)', padding: 2, display: 'flex', touchAction: 'none' }}>
            <GripVertical size={14} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <button onClick={() => moveItemUp(idx)} disabled={idx === 0} style={reorderBtnStyle(idx === 0)}>
              <ChevronUp size={14} />
            </button>
            <button onClick={() => moveItemDown(idx)} disabled={idx === itemCount - 1} style={reorderBtnStyle(idx === itemCount - 1)}>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            ref={el => setInputRef(idx, el)}
            className="input-base"
            style={{ fontSize: 12 }}
            placeholder="Search service library or type custom..."
            value={item.service_name}
            onChange={e => { handleServiceNameChange(idx, e.target.value); updateDropdownPos(idx) }}
            onFocus={() => { setActiveServiceRow(idx); updateDropdownPos(idx) }}
            onBlur={() => setTimeout(() => setActiveServiceRow(prev => (prev === idx ? null : prev)), 150)}
          />
          {matches.length > 0 && dropdownPos && (
            <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, zIndex: 9999, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {matches.map(svc => (
                <div
                  key={svc.id}
                  onClick={() => selectLibraryService(idx, svc)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{svc.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{svc.category} · QAR {Number(svc.base_price ?? 0).toLocaleString('en-US')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <input className="input-base" style={{ fontSize: 12 }} placeholder="Category" value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12, textAlign: 'center' }} type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12, textAlign: 'center' }} placeholder="unit" value={item.unit_type} onChange={e => updateItem(idx, 'unit_type', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12, textAlign: 'right' }} type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
          {calc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div>
          {itemCount > 1 && (
            <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Row B: optional fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '64px 2.4fr 110px 130px 1fr 150px', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <div />
        <input className="input-base" style={{ fontSize: 12 }} placeholder="Description (optional)" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12, textAlign: 'right' }} type="number" min="0" step="0.01" placeholder="Tax %" value={item.tax_rate} onChange={e => updateItem(idx, 'tax_rate', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12, textAlign: 'right' }} type="number" min="0" step="0.01" placeholder="Discount (QAR)" value={item.discount_amount} onChange={e => updateItem(idx, 'discount_amount', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12 }} placeholder="Notes (optional)" value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} />
        <input className="input-base" style={{ fontSize: 12 }} placeholder="Est. delivery (optional)" value={item.estimated_delivery} onChange={e => updateItem(idx, 'estimated_delivery', e.target.value)} />
      </div>
    </div>
  )
}

export default function NewQuotationModal({ onClose, initialData }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { data: companySettings } = useCompanySettings()
  const isEditMode = !!initialData
  // initialData is the full quotation row — if it's a draft still carrying an old
  // rejection_reason (moved back to draft rather than cleared), surface it here so
  // whoever's editing sees why it was rejected without going back to the drawer.
  const wasPreviouslyRejected = isEditMode && initialData?.status === 'draft' && !!initialData?.rejection_reason

  const { mutateAsync: createQuotation, isPending: isCreating } = useCreateQuotation()
  const { mutateAsync: saveEdit, isPending: isEditing } = useSaveQuotationEdit()
  const isPending = isEditMode ? isEditing : isCreating
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const isLocked = submitting || isPending

  // Quotation details
  const [subject, setSubject] = useState(initialData?.subject || '')
  const [preparedBy, setPreparedBy] = useState(initialData?.prepared_by_override || '')
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until ? initialData.valid_until.split('T')[0] : ''
  )
  const [quotationDate, setQuotationDate] = useState(
    initialData?.issue_date ? initialData.issue_date.split('T')[0] : new Date().toISOString().split('T')[0]
  )

  // Client/lead selection — a quotation references exactly one of the two.
  // selectedEntity is { type: 'client' | 'lead', data } or null.
  const [clientSearch, setClientSearch] = useState('')
  const [selectedEntity, setSelectedEntity] = useState(() => {
    if (!isEditMode) return null
    if (initialData.lead_id && initialData.lead) return { type: 'lead', data: initialData.lead }
    if (initialData.client_id && initialData.client) return { type: 'client', data: initialData.client }
    return null
  })
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [isNewLead, setIsNewLead] = useState(false)
  const [newClientData, setNewClientData] = useState({ company_name: '', contact_person: '', phone_country_code: '+974', phone_number: '', email: '' })

  // Per-quotation client detail override — frozen at selection time, editable via the
  // pencil affordance without ever touching the clients/leads table.
  const [clientSnapshot, setClientSnapshot] = useState(() => {
    if (isEditMode) {
      const c = initialData.client
      const l = initialData.lead
      return {
        name: initialData.client_name_snapshot ?? c?.company_name ?? l?.company_name ?? '',
        contact: initialData.client_contact_snapshot ?? c?.contact_person ?? l?.contact_person ?? '',
        phone: initialData.client_phone_snapshot ?? c?.phone ?? (l ? `${l.phone_country_code || '+974'} ${l.phone_number || ''}`.trim() : '') ?? '',
        email: initialData.client_email_snapshot ?? c?.email ?? l?.email ?? '',
      }
    }
    return { name: '', contact: '', phone: '', email: '' }
  })
  const [showSnapshotEditor, setShowSnapshotEditor] = useState(false)

  function seedClientSnapshot(entity) {
    setClientSnapshot({
      name: entityDisplayName(entity) || '',
      contact: entity.data.contact_person || '',
      phone: entityPhone(entity) || '',
      email: entity.data.email || '',
    })
    setShowSnapshotEditor(false)
  }

  function selectEntity(entity) {
    setSelectedEntity(entity)
    seedClientSnapshot(entity)
    setShowClientDropdown(false)
    setClientSearch('')
  }

  const { data: clientResults = [] } = useClients(clientSearch)
  const { data: leadResults = [] } = useLeadsSearch(clientSearch)
  const pickerResults = [
    ...clientResults.map(c => ({ type: 'client', data: c })),
    ...leadResults.map(l => ({ type: 'lead', data: l })),
  ]

  // Line items
  const [items, setItems] = useState(() => itemsFromQuotation(initialData))
  const { data: libraryServices = [] } = useServices({ appliesTo: 'standard' })
  const [activeServiceRow, setActiveServiceRow] = useState(null)
  const inputRefs = useRef([])
  const [dropdownPositions, setDropdownPositions] = useState({})

  function updateDropdownPos(idx) {
    const el = inputRefs.current[idx]
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownPositions(prev => ({ ...prev, [idx]: { top: rect.bottom, left: rect.left, width: rect.width } }))
  }

  function setInputRef(idx, el) {
    inputRefs.current[idx] = el
  }

  // Additional charges + closing
  const [additionalCharges, setAdditionalCharges] = useState(initialData?.additional_charges || 0)
  const [closingMessage, setClosingMessage] = useState(initialData?.closing_message || DEFAULT_CLOSING_MESSAGE)
  const [signatoryName, setSignatoryName] = useState(initialData?.signatory_name || companySettings?.signatory_name || '')
  const [signatoryPosition, setSignatoryPosition] = useState(initialData?.signatory_position || '')

  useEffect(() => {
    if (!isEditMode && !signatoryName && companySettings?.signatory_name) {
      setSignatoryName(companySettings.signatory_name)
    }
  }, [companySettings?.signatory_name])

  // Notes + terms
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [terms, setTerms] = useState(initialData?.terms || DEFAULT_TERMS)

  // Computed totals
  const lineCalcs = items.map(lineCalc)
  const subtotal = lineCalcs.reduce((s, c) => s + c.gross, 0)
  const totalDiscount = lineCalcs.reduce((s, c) => s + c.discount, 0)
  const totalTax = lineCalcs.reduce((s, c) => s + c.tax, 0)
  const additionalChargesNum = Number(additionalCharges) || 0
  const grandTotal = subtotal - totalDiscount + totalTax + additionalChargesNum

  function updateItem(idx, field, value) {
    setItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  function moveItemUp(idx) {
    if (idx === 0) return
    setItems(prev => {
      const updated = [...prev]
      ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
      return updated
    })
  }

  function moveItemDown(idx) {
    setItems(prev => {
      if (idx >= prev.length - 1) return prev
      const updated = [...prev]
      ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
      return updated
    })
  }

  function handleServiceNameChange(idx, value) {
    setItems(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], service_name: value, service_id: '' }
      return updated
    })
    setActiveServiceRow(idx)
  }

  function selectLibraryService(idx, svc) {
    setItems(prev => {
      const updated = [...prev]
      const current = updated[idx]
      updated[idx] = {
        ...current,
        service_id: svc.id,
        service_name: svc.name,
        category: svc.category || current.category,
        unit_price: svc.base_price ?? current.unit_price,
        description: current.description || svc.description || '',
        estimated_delivery: current.estimated_delivery || svc.default_timeline || '',
      }
      return updated
    })
    setActiveServiceRow(null)
  }

  function filteredServices(query) {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return libraryServices.filter(s => s.name.toLowerCase().includes(q)).slice(0, 8)
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  function handleItemDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems(prev => arrayMove(prev, Number(active.id), Number(over.id)))
  }

  // Synchronous in-flight lock. A ref (not just isPending) so a second call in the
  // same tick, or during the pre-mutation leads insert, is rejected immediately;
  // the state mirror exists only so the buttons re-render disabled.
  async function handleSubmit(action) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await submitQuotation(action)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function submitQuotation(action) {
    if (!subject.trim()) { toast('Subject is required', 'error'); return }
    if (!selectedEntity && !isNewLead) { toast('Please select or enter a client or lead', 'error'); return }
    if (isNewLead && !newClientData.contact_person) { toast('Contact person is required', 'error'); return }
    if (items.length === 0 || items.every(i => !i.service_name)) { toast('Add at least one service', 'error'); return }

    try {
      let clientId = selectedEntity?.type === 'client' ? selectedEntity.data.id : null
      let leadId = selectedEntity?.type === 'lead' ? selectedEntity.data.id : null
      let snapshot = clientSnapshot

      if (isNewLead) {
        const { supabase } = await import('../../lib/supabase')
        const phoneCountryCode = newClientData.phone_country_code || '+974'
        const phoneNumber = newClientData.phone_number || ''
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([{
            company_name: newClientData.company_name || null,
            contact_person: newClientData.contact_person,
            phone_country_code: phoneCountryCode,
            phone_number: phoneNumber,
            phone: `${phoneCountryCode} ${phoneNumber}`.trim(),
            email: newClientData.email || null,
            stage: 'new_lead',
            assigned_to: profile?.id,
            created_by: profile?.id,
            source: 'Quotation',
          }])
          .select()
          .single()
        if (error) throw error
        leadId = newLead.id
        snapshot = {
          name: newLead.company_name || '',
          contact: newLead.contact_person || '',
          phone: `${newLead.phone_country_code || '+974'} ${newLead.phone_number || ''}`.trim(),
          email: newLead.email || '',
        }
      }

      const validItems = items
        .filter(i => i.service_name && i.unit_price !== '' && i.unit_price !== null && Number.isFinite(Number(i.unit_price)))
        .map(item => ({
          service_id: item.service_id || null,
          service_name: item.service_name,
          category: item.category || null,
          description: item.description || null,
          quantity: item.quantity,
          unit_type: item.unit_type || null,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate !== '' ? Number(item.tax_rate) : null,
          discount_amount: Number(item.discount_amount) || 0,
          notes: item.notes || null,
          estimated_delivery: item.estimated_delivery || null,
          total_price: lineCalc(item).total,
        }))

      const quotationData = {
        client_id: clientId,
        lead_id: leadId,
        client_name_snapshot: snapshot.name || null,
        client_contact_snapshot: snapshot.contact || null,
        client_phone_snapshot: snapshot.phone || null,
        client_email_snapshot: snapshot.email || null,
        status: action === 'submit' ? 'pending_approval' : 'draft',
        quotation_type: 'standard',
        subject,
        issue_date: quotationDate || new Date().toISOString().split('T')[0],
        prepared_by_override: preparedBy.trim() || profile?.full_name || null,
        subtotal,
        discount_type: 'flat',
        discount_value: totalDiscount,
        discount_amount: totalDiscount,
        tax_rate: null,
        tax_amount: totalTax,
        additional_charges: additionalChargesNum,
        total_amount: grandTotal,
        currency: 'QAR',
        valid_until: validUntil || null,
        notes: notes || null,
        terms: terms || null,
        closing_message: closingMessage || null,
        signatory_name: signatoryName || null,
        signatory_position: signatoryPosition || null,
      }

      if (isEditMode) {
        await saveEdit({
          id: initialData.id,
          quotation: {
            ...quotationData,
            submitted_for_approval_at: action === 'submit' ? new Date().toISOString() : null,
          },
          items: validItems,
          userId: profile?.id,
        })
        toast(action === 'submit' ? 'Quotation updated and submitted for approval' : 'Quotation saved', 'success')
      } else {
        await createQuotation({
          quotation: {
            ...quotationData,
            submitted_for_approval_at: action === 'submit' ? new Date().toISOString() : null,
          },
          items: validItems,
        })
        toast(action === 'submit' ? 'Quotation submitted for approval' : 'Quotation saved as draft', 'success')
      }

      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save quotation', 'error')
    }
  }

  const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 1040, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isEditMode ? 'Edit Quotation' : 'New Standard Service Quotation'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEditMode ? 'Edit and update this standard service quotation' : 'Create a standard service quotation for a client'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {wasPreviouslyRejected && (
            <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Previously rejected: {initialData.rejection_reason}</span>
            </div>
          )}

          {/* QUOTATION DETAILS */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Subject *</label>
              <input className="input-base" placeholder="e.g. Trade License Renewal & PRO Services" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input className="input-base" type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Prepared By</label>
              <input className="input-base" placeholder={profile?.full_name || 'Your name'} value={preparedBy} onChange={e => setPreparedBy(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Valid Until</label>
              <input className="input-base" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          {/* CLIENT SECTION */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Client or Lead</h3>
              <button
                onClick={() => { setIsNewLead(!isNewLead); setSelectedEntity(null) }}
                style={{ fontSize: 12, color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {isNewLead ? '← Select existing' : '+ New lead'}
              </button>
            </div>

            {!isNewLead ? (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-base"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search by company name, contact, or client/lead code..."
                    value={selectedEntity ? entityDisplayName(selectedEntity) : clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setSelectedEntity(null); setShowClientDropdown(true) }}
                    onFocus={() => setShowClientDropdown(true)}
                  />
                </div>
                {showClientDropdown && !selectedEntity && pickerResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                    {pickerResults.map(entity => (
                      <div
                        key={`${entity.type}-${entity.data.id}`}
                        onClick={() => selectEntity(entity)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bg-border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{entityDisplayName(entity)}</span>
                          <EntityTypeBadge type={entity.type} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entityCode(entity)} · {entity.data.contact_person} · {entityPhone(entity)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEntity && (
                  <div style={{ marginTop: 10, background: 'var(--accent-gold-dim)', border: '1px solid var(--accent-gold)44', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{clientSnapshot.name || clientSnapshot.contact || entityDisplayName(selectedEntity)}</span>
                          <EntityTypeBadge type={selectedEntity.type} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{entityCode(selectedEntity)} · {clientSnapshot.email || selectedEntity.data.email} · {clientSnapshot.phone || entityPhone(selectedEntity)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button onClick={() => setShowSnapshotEditor(v => !v)} title="Edit for this quotation only" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showSnapshotEditor ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setSelectedEntity(null); setShowSnapshotEditor(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {showSnapshotEditor && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--accent-gold)44' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                          These fields override the {selectedEntity.type}'s details on this quotation only — the {selectedEntity.type} record is not changed.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Name</label>
                            <input className="input-base" style={{ fontSize: 12 }} value={clientSnapshot.name} onChange={e => setClientSnapshot(p => ({ ...p, name: e.target.value }))} />
                          </div>
                          <div>
                            <label style={labelStyle}>Contact Person</label>
                            <input className="input-base" style={{ fontSize: 12 }} value={clientSnapshot.contact} onChange={e => setClientSnapshot(p => ({ ...p, contact: e.target.value }))} />
                          </div>
                          <div>
                            <label style={labelStyle}>Phone</label>
                            <input className="input-base" style={{ fontSize: 12 }} value={clientSnapshot.phone} onChange={e => setClientSnapshot(p => ({ ...p, phone: e.target.value }))} />
                          </div>
                          <div>
                            <label style={labelStyle}>Email</label>
                            <input className="input-base" style={{ fontSize: 12 }} value={clientSnapshot.email} onChange={e => setClientSnapshot(p => ({ ...p, email: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input className="input-base" placeholder="Company name" value={newClientData.company_name} onChange={e => setNewClientData(p => ({ ...p, company_name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Person *</label>
                  <input className="input-base" placeholder="Full name" value={newClientData.contact_person} onChange={e => setNewClientData(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-base" style={{ width: 70, flexShrink: 0 }} value={newClientData.phone_country_code} onChange={e => setNewClientData(p => ({ ...p, phone_country_code: e.target.value }))} />
                    <input className="input-base" style={{ flex: 1 }} placeholder="5533 9987" value={newClientData.phone_number} onChange={e => setNewClientData(p => ({ ...p, phone_number: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input className="input-base" type="email" placeholder="email@company.com" value={newClientData.email} onChange={e => setNewClientData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* SERVICES / LINE ITEMS */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Services</h3>

            <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '64px 2.4fr 1fr 64px 80px 120px 120px 28px', gap: 8, background: 'var(--bg-elevated)', padding: '10px 14px', borderBottom: '1px solid var(--bg-border)' }}>
                {['', 'Service', 'Category', 'Qty', 'Unit', 'Unit Price (QAR)', 'Total (QAR)', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>

              {/* Items */}
              <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={items.map((_, idx) => String(idx))} strategy={verticalListSortingStrategy}>
                  {items.map((item, idx) => {
                    const calc = lineCalc(item)
                    const matches = activeServiceRow === idx && !item.service_id ? filteredServices(item.service_name) : []
                    return (
                      <SortableServiceRow
                        key={idx}
                        id={String(idx)}
                        item={item}
                        idx={idx}
                        itemCount={items.length}
                        calc={calc}
                        matches={matches}
                        dropdownPos={dropdownPositions[idx]}
                        setInputRef={setInputRef}
                        setActiveServiceRow={setActiveServiceRow}
                        updateDropdownPos={updateDropdownPos}
                        handleServiceNameChange={handleServiceNameChange}
                        selectLibraryService={selectLibraryService}
                        updateItem={updateItem}
                        moveItemUp={moveItemUp}
                        moveItemDown={moveItemDown}
                        removeItem={removeItem}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>
            </div>

            <button onClick={addItem} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--bg-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Add line item
            </button>
          </div>

          {/* PRICE SUMMARY */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>QAR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--status-overdue)' }}>
                  <span>Discount</span>
                  <span>- QAR {totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Tax</span>
                  <span>+ QAR {totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Additional Charges (QAR)</span>
                <input
                  className="input-base"
                  type="number" min="0" step="0.01"
                  style={{ width: 110, fontSize: 12, textAlign: 'right' }}
                  value={additionalCharges}
                  onChange={e => setAdditionalCharges(e.target.value)}
                />
              </div>
              <div className="gold-line" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                <span>Grand Total</span>
                <span style={{ color: 'var(--accent-gold)' }}>QAR {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CLOSING */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Closing</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Closing Message</label>
              <textarea className="input-base" rows={2} style={{ resize: 'vertical' }} value={closingMessage} onChange={e => setClosingMessage(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Signatory Name</label>
                <input className="input-base" value={signatoryName} onChange={e => setSignatoryName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Signatory Position</label>
                <input className="input-base" placeholder="e.g. Managing Director" value={signatoryPosition} onChange={e => setSignatoryPosition(e.target.value)} />
              </div>
            </div>
          </div>

          {/* NOTES + TERMS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Internal Notes</label>
              <textarea className="input-base" rows={3} style={{ resize: 'vertical' }} placeholder="Notes visible to staff only..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Terms & Conditions (payment, delivery, exclusions)</label>
              <textarea className="input-base" rows={3} style={{ resize: 'vertical' }} value={terms} onChange={e => setTerms(e.target.value)} />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-ghost" onClick={() => handleSubmit('draft')} disabled={isLocked}>
            {isEditMode ? 'Save Changes' : 'Save as Draft'}
          </button>
          <button className="btn-gold" onClick={() => handleSubmit('submit')} disabled={isLocked}>
            {isLocked ? 'Saving...' : isEditMode ? 'Save & Submit for Approval →' : 'Submit for Approval →'}
          </button>
        </div>
      </div>
    </div>
  )
}
