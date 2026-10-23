import { useState } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import Verification from './components/Verification.jsx'
import CreditSync from './components/CreditSync.jsx'
import FraudCheck from './components/FraudCheck.jsx'
import Compliance from './components/Compliance.jsx'
import BulkImport from './components/BulkImport.jsx'

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [student, setStudent] = useState(null) // set by Verification, read by CreditSync

  const views = {
    dashboard: <Dashboard />,
    verification: <Verification onVerified={setStudent} onOpenPassport={() => setTab('credits')} />,
    credits: <CreditSync student={student} goVerify={() => setTab('verification')} />,
    fraud: <FraudCheck />,
    compliance: <Compliance />,
    bulk: <BulkImport />,
  }

  return (
    <Layout tab={tab} setTab={setTab} student={student}>
      {views[tab]}
    </Layout>
  )
}