import { useCallback, useEffect, useState } from 'react'
import { supabase, logAudit } from '../lib/supabase.js'
import { RefreshCw } from 'lucide-react'

const TOTAL = 160
const CATS = [
  { key: 'major', label: 'Major', bar: 'bg-indigo-600', text: 'text-indigo-600' },
  { key: 'minor', label: 'Minor', bar: 'bg-emerald-500', text: 'text-emerald-600' },
  { key: 'skill', label: 'Skill', bar: 'bg-amber-500',  text: 'text-amber-600' },
]

export default function CreditSync({ student, goVerify }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const sync = useCallback(async () => {
    if (!student) return
    setLoading(true); setErr('')
    const { data, error } = await supabase
      .from('abc_credits').select('*').eq('student_id', student.id)
      .order('academic_year').order('semester')
    setLoading(false)
    if (error) return setErr(error.message + ' (did you run 002_credit_category.sql?)')
    setRows(data)
    logAudit({ action: 'ABC_SYNC', entityType: 'student', entityId: student.id })
  }, [student])

  useEffect(() => { sync() }, [sync])

  if (!student) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Verify a student's APAAR ID first to load their Academic Passport.</p>
        <button onClick={goVerify} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Go to One ID Verification</button>
      </div>
    )
  }

  const earned = rows.filter((r) => ['earned', 'transferred'].includes(r.credit_status))
  const sum = (k) => earned.filter((r) => r.category === k).reduce((s, r) => s + Number(r.credits), 0)
  const totals = Object.fromEntries(CATS.map((c) => [c.key, sum(c.key)]))
  const all = Object.values(totals).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Academic Passport card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-700 text-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">Academic Passport · ABC</p>
            <h2 className="mt-1 text-xl font-semibold">{student.full_name}</h2>
            <p className="font-mono text-sm tracking-widest text-indigo-200">{student.apaar_id}</p>
            <p className="text-sm text-indigo-200">{student.program}</p>
          </div>
          <button onClick={sync} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <p className="text-4xl font-bold">{all}<span className="text-lg font-normal text-indigo-200"> / {TOTAL} credits</span></p>
          <p className="text-sm text-emerald-300">{Math.round((all / TOTAL) * 100)}% complete</p>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-white/15 overflow-hidden flex">
          {CATS.map((c) => (
            <div key={c.key} className={c.bar} style={{ width: `${(totals[c.key] / TOTAL) * 100}%` }} title={c.label} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {CATS.map((c) => (
            <div key={c.key} className="rounded-lg bg-white/10 p-3">
              <div className="flex items-center gap-2 text-xs text-indigo-100">
                <span className={`h-2 w-2 rounded-full ${c.bar}`} /> {c.label}
              </div>
              <p className="mt-1 text-xl font-semibold">{totals[c.key]}</p>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{['Code', 'Course', 'Type', 'Credits', 'Year', 'Status', 'Verified'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-mono">{r.course_code}</td>
                <td className="px-4 py-2.5">{r.course_name}</td>
                <td className="px-4 py-2.5 capitalize">{r.category}</td>
                <td className="px-4 py-2.5">{r.credits}</td>
                <td className="px-4 py-2.5">{r.academic_year}</td>
                <td className="px-4 py-2.5 capitalize">{r.credit_status.replace('_', ' ')}</td>
                <td className="px-4 py-2.5">{r.is_verified ? '✔' : '—'}</td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No credits on record.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}