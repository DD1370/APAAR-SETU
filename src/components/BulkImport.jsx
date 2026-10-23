import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase, logAudit } from '../lib/supabase.js'
import { Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react'

/* ---------------- config ---------------- */
const MODES = {
  students: {
    label: 'Student Records',
    required: ['apaar_id', 'full_name', 'dob', 'program', 'enrollment_year', 'institution_code'],
    preview: ['apaar_id', 'full_name', 'program', 'institution_code'],
    sample: '/samples/students_sample.csv',
  },
  credits: {
    label: 'ABC Credit Sheet',
    required: ['apaar_id', 'student_name', 'course_code', 'course_name', 'credits', 'academic_year'],
    preview: ['apaar_id', 'student_name', 'course_code', 'credits'],
    sample: '/samples/credits_sample.csv',
  },
}

const CATEGORIES = ['major', 'minor', 'skill']
const STATUSES = ['earned', 'in_progress', 'transferred', 'expired']
const CHUNK = 200

/* ---------------- validation (pure JS, instant) ---------------- */
const normName = (s = '') => s.toLowerCase().replace(/[^\p{L}]/gu, '')
const isInt = (v) => /^-?\d+$/.test(v)

function checkApaar(v, issues) {
  if (!v) issues.push('Missing APAAR ID')
  else if (/e\+/i.test(v)) issues.push('APAAR ID corrupted by spreadsheet (scientific notation)')
  else if (!/^\d{12}$/.test(v)) issues.push(`APAAR ID must be exactly 12 digits (got ${v.length})`)
}

function validateStudent(r, ctx, seen, line) {
  const issues = []
  checkApaar(r.apaar_id, issues)

  if (!r.full_name) issues.push('Missing name')
  else if (!/^[\p{L} .'-]{2,}$/u.test(r.full_name)) issues.push('Name contains invalid characters')

  const d = new Date(r.dob)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.dob || '') || isNaN(d)) issues.push('DOB must be a valid YYYY-MM-DD date')
  else if (d > new Date()) issues.push('DOB is in the future')

  if (r.gender && !['male', 'female', 'other'].includes(r.gender.toLowerCase())) issues.push('Gender must be Male/Female/Other')
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) issues.push('Invalid email format')
  if (r.phone && !/^\d{10}$/.test(r.phone)) issues.push('Phone must be 10 digits')
  if (!r.program) issues.push('Missing programme')

  const y = Number(r.enrollment_year)
  if (!isInt(r.enrollment_year || '') || y < 1990 || y > 2100) issues.push('Enrollment year invalid')
  if (!ctx.institutions.has(r.institution_code)) issues.push(`Unknown institution code "${r.institution_code || ''}"`)

  if (/^\d{12}$/.test(r.apaar_id || '')) {
    const prev = seen.get(r.apaar_id)
    if (prev) {
      issues.push(normName(prev.name) === normName(r.full_name)
        ? `Duplicate APAAR ID in file (line ${prev.line})`
        : `Same APAAR ID with a different name (line ${prev.line})`)
    } else seen.set(r.apaar_id, { name: r.full_name, line })

    const db = ctx.students.get(r.apaar_id)
    if (db) issues.push(normName(db.full_name) === normName(r.full_name)
      ? 'Already registered in database'
      : `APAAR ID already registered to "${db.full_name}" (name mismatch)`)
  }
  return issues
}

function validateCredit(r, ctx, seen, line) {
  const issues = []
  checkApaar(r.apaar_id, issues)

  if (/^\d{12}$/.test(r.apaar_id || '')) {
    const s = ctx.students.get(r.apaar_id)
    if (!s) issues.push('APAAR ID not found in students')
    else if (!r.student_name) issues.push('Missing student name')
    else if (normName(s.full_name) !== normName(r.student_name)) issues.push(`Name mismatch: record says "${s.full_name}"`)
  }
  if (!r.course_code) issues.push('Missing course code')
  if (!r.course_name) issues.push('Missing course name')

  const c = Number(r.credits)
  if (r.credits === '' || isNaN(c) || c <= 0 || c > 20) issues.push('Credits must be a number between 0 and 20')
  if (r.semester && (!isInt(r.semester) || r.semester < 1 || r.semester > 12)) issues.push('Semester must be 1-12')
  if (!/^\d{4}-\d{2}$/.test(r.academic_year || '')) issues.push('Academic year must look like 2024-25')
  if (r.category && !CATEGORIES.includes(r.category.toLowerCase())) issues.push('Category must be major/minor/skill')
  if (r.credit_status && !STATUSES.includes(r.credit_status.toLowerCase())) issues.push('Invalid credit status')

  const key = `${r.apaar_id}|${r.course_code}|${r.academic_year}`
  if (seen.has(key)) issues.push(`Duplicate course entry in file (line ${seen.get(key)})`)
  else seen.set(key, line)
  return issues
}

function validateAll(rows, mode, ctx) {
  const seen = new Map()
  const fn = mode === 'students' ? validateStudent : validateCredit
  return rows.map((data, i) => ({ line: i + 2, data, issues: fn(data, ctx, seen, i + 2) }))
}

/* ---------------- payload builders ---------------- */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

const toStudent = ({ data: r }, ctx) => ({
  apaar_id: r.apaar_id,
  institution_id: ctx.institutions.get(r.institution_code),
  full_name: r.full_name,
  dob: r.dob,
  gender: r.gender ? cap(r.gender) : null,
  email: r.email || null,
  phone: r.phone || null,
  program: r.program,
  enrollment_year: Number(r.enrollment_year),
})

const toCredit = ({ data: r }, ctx) => {
  const s = ctx.students.get(r.apaar_id)
  return {
    student_id: s.id,
    institution_id: s.institution_id,
    course_code: r.course_code,
    course_name: r.course_name,
    credits: Number(r.credits),
    grade: r.grade || null,
    semester: r.semester ? Number(r.semester) : null,
    academic_year: r.academic_year,
    category: (r.category || 'major').toLowerCase(),
    credit_status: (r.credit_status || 'earned').toLowerCase(),
  }
}

/* ---------------- component ---------------- */
export default function BulkImport() {
  const [mode, setMode] = useState('students')
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [filter, setFilter] = useState('all')
  const [ctx, setCtx] = useState({ institutions: new Map(), students: new Map() })
  const [pushing, setPushing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const loadCtx = useCallback(async () => {
    const [inst, stu] = await Promise.all([
      supabase.from('institutions').select('id, aishe_code'),
      supabase.from('students').select('id, apaar_id, full_name, institution_id'),
    ])
    setCtx({
      institutions: new Map((inst.data || []).map((i) => [i.aishe_code, i.id])),
      students: new Map((stu.data || []).map((s) => [s.apaar_id, s])),
    })
  }, [])
  useEffect(() => { loadCtx() }, [loadCtx])

  const checked = useMemo(() => (rows ? validateAll(rows, mode, ctx) : []), [rows, mode, ctx])
  const valid = checked.filter((r) => !r.issues.length)
  const flagged = checked.filter((r) => r.issues.length)
  const shown = (filter === 'valid' ? valid : filter === 'flagged' ? flagged : checked).slice(0, 300)
  const cfg = MODES[mode]

  function reset(nextMode = mode) {
    setMode(nextMode); setRows(null); setFileName(''); setParseError(''); setResult(null); setFilter('all')
    if (fileRef.current) fileRef.current.value = ''
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null); setParseError(''); setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase(),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
      complete: ({ data, meta }) => {
        const missing = cfg.required.filter((c) => !meta.fields?.includes(c))
        if (missing.length) { setRows(null); return setParseError(`Missing required column(s): ${missing.join(', ')}`) }
        if (!data.length) { setRows(null); return setParseError('The file has no data rows.') }
        setRows(data)
      },
      error: (err) => setParseError(err.message),
    })
  }

  async function push() {
    setPushing(true); setProgress(0); setResult(null)
    const payload = valid.map((r) => (mode === 'students' ? toStudent(r, ctx) : toCredit(r, ctx)))
    let done = 0
    for (let i = 0; i < payload.length; i += CHUNK) {
      const chunk = payload.slice(i, i + CHUNK)
      const q = mode === 'students'
        ? supabase.from('students').insert(chunk)
        : supabase.from('abc_credits').upsert(chunk, { onConflict: 'student_id,course_code,academic_year' })
      const { error } = await q
      if (error) {
        setPushing(false)
        return setResult({ ok: false, msg: `Stopped after ${done} rows: ${error.message}` })
      }
      done += chunk.length
      setProgress(Math.round((done / payload.length) * 100))
    }
    await logAudit({ action: 'BULK_IMPORT', entityType: mode === 'students' ? 'student' : 'abc_credit',
      details: { file: fileName, committed: done, flagged: flagged.length } })
    await loadCtx() // so the pushed rows now show up as "already registered"
    setPushing(false)
    setResult({ ok: true, msg: `${done} clean record(s) committed. ${flagged.length} flagged row(s) were skipped.` })
  }

  function downloadErrors() {
    const csv = Papa.unparse(flagged.map((r) => ({ line: r.line, ...r.data, issues: r.issues.join(' | ') })))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `flagged_${mode}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} onClick={() => reset(k)}
              className={`rounded-lg px-4 py-2 text-sm font-medium border ${mode === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              {m.label}
            </button>
          ))}
          <a href={cfg.sample} download className="ml-auto inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
            <Download size={15} /> Sample CSV
          </a>
        </div>

        <label className="mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40">
          <Upload className="text-indigo-500" />
          <span className="mt-2 text-sm font-medium text-slate-700">{fileName || 'Choose a CSV file'}</span>
          <span className="text-xs text-slate-500 mt-1">Required columns: {cfg.required.join(', ')}</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
      </section>

      {rows && (
        <section className="bg-white rounded-xl border border-slate-200">
          {/* Summary + actions */}
          <div className="flex flex-wrap items-center gap-3 p-5 border-b border-slate-200">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{checked.length} rows</span>
            <button onClick={() => setFilter(filter === 'valid' ? 'all' : 'valid')} className={`rounded-full px-3 py-1 text-xs font-medium border ${filter === 'valid' ? 'ring-2 ring-emerald-300' : ''} bg-emerald-50 text-emerald-700 border-emerald-200`}>
              {valid.length} valid
            </button>
            <button onClick={() => setFilter(filter === 'flagged' ? 'all' : 'flagged')} className={`rounded-full px-3 py-1 text-xs font-medium border ${filter === 'flagged' ? 'ring-2 ring-red-300' : ''} bg-red-50 text-red-700 border-red-200`}>
              {flagged.length} flagged
            </button>
            <div className="ml-auto flex gap-3">
              {!!flagged.length && (
                <button onClick={downloadErrors} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Download flagged</button>
              )}
              <button onClick={push} disabled={!valid.length || pushing}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {pushing ? `Pushing… ${progress}%` : `Push ${valid.length} clean record(s)`}
              </button>
            </div>
          </div>

          {result && (
            <div className={`mx-5 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {result.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {result.msg}
            </div>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Line</th><th className="px-4 py-3">Status</th>
                  {cfg.preview.map((c) => <th key={c} className="px-4 py-3">{c.replace('_', ' ')}</th>)}
                  <th className="px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.line} className={r.issues.length ? 'bg-red-50/50' : ''}>
                    <td className="px-4 py-2.5 text-slate-500">{r.line}</td>
                    <td className="px-4 py-2.5">
                      {r.issues.length
                        ? <span className="text-xs font-medium text-red-700">Flagged</span>
                        : <span className="text-xs font-medium text-emerald-700">Valid</span>}
                    </td>
                    {cfg.preview.map((c) => <td key={c} className="px-4 py-2.5 font-mono text-xs">{r.data[c]}</td>)}
                    <td className="px-4 py-2.5 text-xs text-red-700">{r.issues.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {checked.length > shown.length && filter === 'all' && (
            <p className="p-3 text-center text-xs text-slate-500">Showing first {shown.length} rows. All {checked.length} are validated.</p>
          )}
        </section>
      )}
    </div>
  )
}