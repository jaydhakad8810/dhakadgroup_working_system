import { useEffect, useState } from 'react'
import { DollarSign, TrendingDown } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function DriverSalary() {
  const { user }          = useAuth()
  const [driver, setDriver] = useState(null)
  const [salary, setSalary] = useState([])
  const [advances, setAdvances] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('salary')

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await api.get('/dashboard/driver')
        setDriver(dash.data.driver)
        if (dash.data.driver) {
          // For driver, we show salary via user record salary
          // Use the labour salary endpoint — drivers may also have labour records
          const [sal, adv] = await Promise.all([
            api.get(`/salary?paid=false`).catch(() => ({ data: [] })),
            api.get(`/labour/${dash.data.driver.id}/advances`).catch(() => ({ data: [] })),
          ])
          setSalary(sal.data.filter(r => r.labour?.name === dash.data.driver?.name))
          setAdvances(adv.data)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const pendingAdvance = advances.filter(a => !a.deducted).reduce((s,a) => s + parseFloat(a.amount), 0)
  const totalUnpaid    = salary.filter(r => !r.paid).reduce((s,r) => s + parseFloat(r.net_salary||0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setTab('salary')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab==='salary' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>Salary</button>
        <button onClick={() => setTab('advances')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab==='advances' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>Advances</button>
      </div>

      {tab === 'salary' && (
        <div className="space-y-4">
          {totalUnpaid > 0 && (
            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
              <p className="text-gray-400 text-xs">Pending Salary</p>
              <p className="text-primary-400 font-bold text-2xl">₹{totalUnpaid.toLocaleString('en-IN')}</p>
            </div>
          )}
          <div className="space-y-3">
            {salary.map(r => (
              <div key={r.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{r.labour?.name}</p>
                    <p className="text-gray-500 text-xs">{r.total_days} days</p>
                  </div>
                  <span className={r.paid ? 'badge-green' : 'badge-red'}>{r.paid?'Paid':'Unpaid'}</span>
                </div>
                <div className="flex justify-between text-sm bg-surface-400 rounded-xl p-3">
                  <div className="text-center"><p className="text-gray-400 text-xs">Gross</p><p className="text-white font-medium">₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</p></div>
                  <div className="text-center"><p className="text-gray-400 text-xs">Advance</p><p className="text-red-400">-₹{parseFloat(r.advance_deduction).toLocaleString('en-IN')}</p></div>
                  <div className="text-center"><p className="text-gray-400 text-xs">Net</p><p className="text-primary-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</p></div>
                </div>
              </div>
            ))}
            {!salary.length && <p className="text-center text-gray-500 py-12">No salary records found</p>}
          </div>
        </div>
      )}

      {tab === 'advances' && (
        <div className="space-y-3">
          {pendingAdvance > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-gray-400 text-xs">Pending Advance Deduction</p>
              <p className="text-red-400 font-bold text-2xl">₹{pendingAdvance.toLocaleString('en-IN')}</p>
              <p className="text-gray-500 text-xs mt-1">Will be deducted from next salary</p>
            </div>
          )}
          {advances.map(a => (
            <div key={a.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={18} className="text-red-400"/>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">₹{parseFloat(a.amount).toLocaleString('en-IN')}</p>
                <p className="text-gray-500 text-xs">{a.payment_mode} · {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
                {a.notes && <p className="text-gray-600 text-xs">{a.notes}</p>}
              </div>
              <span className={a.deducted ? 'badge-green' : 'badge-red'}>{a.deducted?'Deducted':'Pending'}</span>
            </div>
          ))}
          {!advances.length && <p className="text-center text-gray-500 py-12">No advances recorded</p>}
        </div>
      )}
    </div>
  )
}
