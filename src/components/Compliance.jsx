import { branchSeats } from '../data/mock.js'

function status(b) {
  const u = b.filled / b.sanctioned
  if (u > 1)    return { label: 'Ceiling breached', cls: 'bg-red-50 text-red-700 border-red-200' }
  if (u >= 0.95) return { label: 'Near ceiling',     cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  if (u < 0.7)   return { label: 'Under-utilised',   cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  return { label: 'Compliant', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

export default function Compliance() {
  return (
    <section className="bg-white rounded-xl border border-slate-200">
      <div className="p-5 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">AICTE Seat Ceilings</h2>
        <p className="text-xs text-slate-500">Admissions must not exceed sanctioned intake per branch</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>{['Branch', 'Sanctioned', 'Filled', 'Utilisation', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {branchSeats.map((b) => {
            const s = status(b)
            const pct = Math.round((b.filled / b.sanctioned) * 100)
            return (
              <tr key={b.branch}>
                <td className="px-4 py-3 font-medium">{b.branch}</td>
                <td className="px-4 py-3">{b.sanctioned}</td>
                <td className="px-4 py-3">{b.filled}</td>
                <td className="px-4 py-3 w-56">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${pct > 100 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{pct}%</span>
                </td>
                <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}