import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { branchSeats, quotaData, totalFilled, totalSanctioned } from '../data/mock.js'

const QUOTA_COLORS = { General: '#4f46e5', OBC: '#10b981', SC: '#f59e0b', ST: '#64748b' }

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const breaches = branchSeats.filter((b) => b.filled > b.sanctioned).length
  const util = Math.round((totalFilled / totalSanctioned) * 100)

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Sanctioned seats" value={totalSanctioned} tone="text-slate-900" />
        <Stat label="Filled seats" value={totalFilled} tone="text-indigo-600" />
        <Stat label="Utilisation" value={`${util}%`} tone="text-emerald-600" />
        <Stat label="Ceiling breaches" value={breaches} tone={breaches ? 'text-red-600' : 'text-emerald-600'} />
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <section className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Sanctioned vs Filled Seats by Branch</h2>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchSeats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sanctioned" name="Sanctioned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="filled" name="Filled" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Quota Distribution (Filled Seats)</h2>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={quotaData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={105} paddingAngle={2} label>
                  {quotaData.map((q) => <Cell key={q.name} fill={QUOTA_COLORS[q.name]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">Reservation Compliance: Actual % vs Mandated %</h2>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quotaData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" unit="%" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Bar dataKey="mandated" name="Mandated" fill="#64748b" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
}