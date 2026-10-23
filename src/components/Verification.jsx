import { useState } from 'react'
import { supabase, logAudit } from '../lib/supabase.js'
import { CheckCircle2, XCircle, Clock, Search } from 'lucide-react'

const STATUS = {
  verified: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  pending:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: Clock },
  rejected: { cls: 'bg-red-50 text-red-700 border-red-200',             Icon: XCircle },
}

export default function Verification({ onVerified, onOpenPassport }) {
  const [id, setId] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const valid = /^\d{12}$/.test(id)

  async function lookup(e) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    setLoading(true); setError(''); setResult(null)
    const { data, error: err } = await supabase
      .from('students')
      .select('*, institutions(name)')
      .eq('apaar_id', id)
      .maybeSingle()
    setLoading(false)
    if (err) return setError(err.message)
    if (!data) return setError('No student found for this APAAR ID.')
    setResult(data)
    onVerified(data)
    logAudit({ action: 'APAAR_LOOKUP', entityType: 'student', entityId: data.id, details: { apaar_id: id } })
  }

  const st = result && STATUS[result.verification_status]

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={lookup} className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700">APAAR ID (12 digits)</label>
        <div className="mt-2 flex gap-3">
          <input
            value={id}
            inputMode="numeric"
            maxLength={12}
            placeholder="100000000001"
            onChange={(e) => setId(e.target.value.replace(/\D/g, ''))}
            onBlur={() => setTouched(true)}
            className={`flex-1 rounded-lg border px-4 py-2.5 font-mono tracking-widest outline-none focus:ring-2 ${
              touched && !valid ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-200'
            }`}
          />
          <button disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            <Search size={16} /> {loading ? 'Checking…' : 'Verify'}
          </button>
        </div>
        <p className={`mt-2 text-xs ${touched && !valid ? 'text-red-600' : 'text-slate-500'}`}>
          {touched && !valid ? 'Enter exactly 12 digits.' : `${id.length}/12 digits · try 100000000001`}
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{result.full_name}</h2>
              <p className="text-sm text-slate-500">{result.institutions?.name}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium capitalize ${st.cls}`}>
              <st.Icon size={14} /> {result.verification_status}
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            {[
              ['APAAR ID', result.apaar_id],
              ['Programme', result.program],
              ['Enrolled', result.enrollment_year],
              ['Lifecycle', result.lifecycle_status.replace('_', ' ')],
              ['Date of birth', result.dob],
              ['Email', result.email],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          <button onClick={onOpenPassport} className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Open Academic Passport →
          </button>
        </div>
      )}
    </div>
  )
}