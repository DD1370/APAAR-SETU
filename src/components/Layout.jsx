import { useState } from 'react'
import { LayoutDashboard, BadgeCheck, Library, ShieldAlert, Scale, Upload, Bell, Menu, X } from 'lucide-react'

export const NAV = [
  { id: 'dashboard',    label: 'Dashboard',                 sub: 'Overview & Analytics',      icon: LayoutDashboard },
  { id: 'verification', label: 'One ID Verification',       sub: 'DigiLocker / APAAR KYC',    icon: BadgeCheck },
  { id: 'credits',      label: 'ABC Credit Sync',           sub: 'Academic Bank of Credits',  icon: Library },
  { id: 'fraud',        label: 'Fraud & Ghost Check',       sub: 'Duplicate detection',       icon: ShieldAlert },
  { id: 'compliance',   label: 'AICTE Compliance',          sub: 'Seat ceilings',             icon: Scale },
  { id: 'bulk',         label: 'Bulk Import',               sub: 'CSV data operations',       icon: Upload },
]

export default function Layout({ tab, setTab, student, children }) {
  const [open, setOpen] = useState(false)
  const current = NAV.find((n) => n.id === tab)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform lg:translate-x-0 lg:static ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-700">
          <div>
            <div className="text-lg font-bold tracking-wide text-white">APAAR <span className="text-emerald-400">SETU</span></div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">NEP 2020 Compliance</div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setOpen(false) }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                tab === id ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800'
              }`}
            >
              <Icon size={18} className={tab === id ? 'text-emerald-300' : 'text-slate-400'} />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-[11px] text-slate-400">{sub}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-slate-500 border-t border-slate-700">Ministry of Education · Demo build</div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
            <div>
              <h1 className="text-base font-semibold text-slate-900">{current.label}</h1>
              <p className="text-xs text-slate-500">{current.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {student && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs px-3 py-1 border border-emerald-200">
                Active: {student.full_name}
              </span>
            )}
            <Bell size={18} className="text-slate-500" />
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">AD</div>
          </div>
        </header>
        <main className="p-4 lg:p-8 space-y-6">{children}</main>
      </div>
    </div>
  )
}