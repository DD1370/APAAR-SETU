import { useEffect, useState } from 'react'
import { ghostPool } from '../data/mock.js'

const RISK = {
  High:   'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-slate-100 text-slate-600 border-slate-200',
}
const stamp = () => new Date().toLocaleTimeString()

export default function FraudCheck() {
  // Simulated live feed: swap this interval for a Supabase realtime subscription later.
  const [flags, setFlags] = useState(() => ghostPool.slice(0, 3).map((g, i) => ({ ...g, id: i, at: stamp() })))

  useEffect(() => {
    let n = 3
    const t = setInterval(() => {
      const g = ghostPool[n % ghostPool.length]
      setFlags((f) => [{ ...g, id: Date.now(), at: stamp(), fresh: true }, ...f].slice(0, 12))
      n++
    }, 12000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between p-5 border-b border-slate-200">
        <div>
          <h2 className="font-semibold text-slate-900">Flagged Duplicate Enrollments</h2>
          <p className="text-xs text-slate-500">Same APAAR ID enrolled at more than one institution</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live scan
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>{['Detected', 'APAAR ID', 'Student', 'Institution A', 'Institution B', 'Risk'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flags.map((f) => (
              <tr key={f.id} className={f.risk === 'High' ? 'bg-red-50/40' : ''}>
                <td className="px-4 py-3 text-slate-500">{f.at}</td>
                <td className="px-4 py-3 font-mono">{f.apaar}</td>
                <td className="px-4 py-3 font-medium">{f.name}</td>
                <td className="px-4 py-3">{f.a}</td>
                <td className="px-4 py-3">{f.b}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${RISK[f.risk]}`}>{f.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}