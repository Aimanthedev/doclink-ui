import { useState, useEffect, useRef } from 'react'
import { X, Search, Pencil, AlertTriangle } from 'lucide-react'
import { useClients } from '../../hooks/useClients'
import { useLeadsSearch } from '../../hooks/useLeads'
import { useCreateQuotation, useSaveQuotationEdit } from '../../hooks/useQuotations'
import { useQuotationPreset } from '../../hooks/useQuotationPresets'
import { useCompanySettings } from '../../hooks/useCompanySettings'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import FeaturesNotesEditor from '../../components/quotations/FeaturesNotesEditor'
import FeesEditor from '../../components/quotations/FeesEditor'

const EXPAT_DEFAULT_FEATURES = [
  { field: 'Legal form of business', value: 'Limited Liability Company with 100% Expat Ownership' },
  { field: 'Shareholders', value: '01 nos.' },
  { field: 'Tax Liability', value: '10% Tax from annual net profits earned for Expat shareholders (Zero liability for Personal income tax) 0% Tax for Qatari shareholders (if any)' },
  { field: 'Capital Declaration', value: 'QAR 200,000.00 (physical deposit not required)' },
  { field: 'Statutory Requirements', value: 'Annual audit reports submission mandatory for WLL/LLC as per the articles of association' },
  { field: 'Employee Visas', value: 'Initial 10 nos. allocation with additional subject to labor law compliance' },
  { field: 'Regulatory Body', value: 'Ministry of Commerce and Industry (MoCI)' },
  { field: 'Nature of Business', value: '' },
  { field: 'Business Activities', value: '' },
  { field: 'Disclaimer', value: 'Final outcome of application is solely at the discretion of the relevant ministries, hence, we will not be held liable for any delays, rejections or restrictions imposed by the governing authorities including changes to the incorporation related laws implemented at any stage of the application process. All stated government related fees subject to actual at the time of payment.' },
  { field: 'Payment Terms', value: 'Full advance payment of our service charges upon signing agreement, being non-refundable in case of withdrawal from the application process at any stage and does not include government related fees. Other fees payable in full upon maturity of the application stage as applicable.' },
  { field: 'Quotation Validity', value: '7 Days' },
]

const EXPAT_DEFAULT_FEES = [
  { description: 'Business Plan Preparation (can use from client side if available, or can proceed without, but recommended)', price: 2500 },
  { description: 'Company Name Reservation', price: 0 },
  { description: 'Commercial Registration & Establishment Card Fees (fee will be directly paid from the clients card and ministry invoice will be provided)', price: 2200 },
  { description: 'Tax Card Registration', price: 500 },
  { description: 'Visa Quota Application*', price: 0 },
  { description: 'Trade License Application Processing', price: 500 },
  { description: 'Comprehensive Civil Defense Approval (Valid for 2 years/ Not required if you will take small office)', price: 500 },
  { description: 'Trade License / Commercial Permit with updated Establishment Card Fees', price: 700 },
  { description: 'Company National Address Registration & Labor Registration (Bayanat)', price: 300 },
  { description: 'Bank account opening support', price: 1500 },
  { description: 'Consultation, Documentation & Application Processing Service Charges', price: 999 },
]

const DEFAULT_CLOSING_MESSAGE = "We are pleased to have this opportunity to be of service to you. Should there be further inquiries, kindly don't hesitate to contact us."

function getDefaultFeatures(quotationType) {
  return quotationType === 'company_formation_qatari'
    ? EXPAT_DEFAULT_FEATURES.map(f => ({ ...f }))
    : EXPAT_DEFAULT_FEATURES.map(f => ({ ...f }))
}

function getDefaultFees() {
  return EXPAT_DEFAULT_FEES.map(f => ({ ...f }))
}

function feesFromQuotation(quotation) {
  if (!quotation?.quotation_items?.length) return []
  return quotation.quotation_items.map(item => ({
    description: item.service_name || '',
    price: item.unit_price || 0,
  }))
}

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

export default function NewFormationQuotationModal({ quotationType, onClose, initialData }) {
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

  // Quotation date
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

  // Defaults preset — falls back to hardcoded constants if none found (skipped in edit mode)
  const { data: preset, isLoading: presetLoading } = useQuotationPreset(isEditMode ? null : quotationType)
  const [seededFor, setSeededFor] = useState(isEditMode ? 'edit' : undefined)

  // Features & Notes
  const [features, setFeatures] = useState(
    isEditMode ? (initialData.features_notes || []).map(f => ({ ...f })) : []
  )

  // Fees & Timelines
  const [fees, setFees] = useState(
    isEditMode ? feesFromQuotation(initialData) : []
  )

  // Totals
  const [discountAmount, setDiscountAmount] = useState(isEditMode ? (initialData.discount_amount || 0) : 0)
  const [additionalCharges, setAdditionalCharges] = useState(isEditMode ? (initialData.additional_charges || 0) : 0)

  // Closing
  const [signatoryName, setSignatoryName] = useState(isEditMode ? (initialData.signatory_name || companySettings?.signatory_name || '') : companySettings?.signatory_name || '')
  const [signatoryPosition, setSignatoryPosition] = useState(isEditMode ? (initialData.signatory_position || '') : '')
  const [closingMessage, setClosingMessage] = useState(isEditMode ? (initialData.closing_message || DEFAULT_CLOSING_MESSAGE) : DEFAULT_CLOSING_MESSAGE)

  useEffect(() => {
    if (!isEditMode && !signatoryName && companySettings?.signatory_name) {
      setSignatoryName(companySettings.signatory_name)
    }
  }, [companySettings?.signatory_name])

  // Seed defaults from the fetched preset once it resolves (only in create mode)
  if (!isEditMode && !presetLoading && seededFor === undefined) {
    setSeededFor(preset ?? null)
    if (preset) {
      setFeatures((preset.features_notes || []).map(f => ({ ...f })))
      setFees((preset.default_fees || []).map(f => ({ ...f })))
      if (preset.closing_message) setClosingMessage(preset.closing_message)
      if (preset.signatory_position) setSignatoryPosition(preset.signatory_position)
    } else {
      setFeatures(getDefaultFeatures(quotationType))
      setFees(getDefaultFees())
    }
  }

  const subtotal = fees.reduce((sum, f) => sum + (Number(f.price) || 0), 0)
  const discountNum = Number(discountAmount) || 0
  const additionalChargesNum = Number(additionalCharges) || 0
  const grandTotal = subtotal - discountNum + additionalChargesNum

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
    if (!selectedEntity && !isNewLead) { toast('Please select or enter a client or lead', 'error'); return }
    if (isNewLead && !newClientData.contact_person) { toast('Contact person is required', 'error'); return }

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

      const validItems = fees
        .filter(f => f.description.trim())
        .map(f => ({
          service_id: null,
          service_name: f.description,
          category: null,
          description: null,
          quantity: 1,
          unit_type: null,
          unit_price: Number(f.price) || 0,
          tax_rate: null,
          discount_amount: 0,
          notes: null,
          estimated_delivery: null,
          total_price: Number(f.price) || 0,
        }))

      const quotationData = {
        client_id: clientId,
        lead_id: leadId,
        client_name_snapshot: snapshot.name || null,
        client_contact_snapshot: snapshot.contact || null,
        client_phone_snapshot: snapshot.phone || null,
        client_email_snapshot: snapshot.email || null,
        status: action === 'submit' ? 'pending_approval' : 'draft',
        quotation_type: quotationType,
        issue_date: quotationDate || new Date().toISOString().split('T')[0],
        features_notes: features,
        subtotal,
        discount_type: 'flat',
        discount_value: discountNum,
        discount_amount: discountNum,
        tax_rate: null,
        tax_amount: 0,
        additional_charges: additionalChargesNum,
        total_amount: grandTotal,
        currency: 'QAR',
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

  const showLoading = !isEditMode && presetLoading

  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 1040, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isEditMode
                ? 'Edit Quotation'
                : `New Company Formation Quotation${quotationType === 'company_formation_expat' ? ' — Expat Ownership' : ' — Qatari Ownership'}`}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEditMode ? 'Edit and update this company formation quotation' : 'Create a company formation quotation for a client'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {wasPreviouslyRejected && (
          <div style={{ margin: '16px 24px 0', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Previously rejected: {initialData.rejection_reason}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {showLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading defaults...
          </div>
        ) : (
          <>

          {/* QUOTATION DATE */}
          <div style={{ marginBottom: 28, maxWidth: 220 }}>
            <label style={labelStyle}>Date</label>
            <input className="input-base" type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} />
          </div>

          {/* SECTION 1 — CLIENT */}
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

          {/* SECTION 2 — FEATURES & NOTES */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Features & Notes</h3>
            <FeaturesNotesEditor rows={features} onChange={setFeatures} />
          </div>

          {/* SECTION 3 — FEES & TIMELINES */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Fees & Timelines</h3>
            <FeesEditor rows={fees} onChange={setFees} />
          </div>

          {/* SECTION 4 — TOTALS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>QAR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Discount (QAR)</span>
                <input
                  className="input-base"
                  type="number" inputMode="decimal" min="0" step="0.01"
                  style={{ width: 110, fontSize: 12, textAlign: 'right' }}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Additional Charges (QAR)</span>
                <input
                  className="input-base"
                  type="number" inputMode="decimal" min="0" step="0.01"
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

          {/* SECTION 5 — CLOSING */}
          <div style={{ marginBottom: 8 }}>
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

          </>
        )}
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
