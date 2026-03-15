import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, TrendingUp } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const s = searchParams.get('site_id')
    if (s) setFilterSite(s)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterSite) params.append('site_id', filterSite)
    Promise.all([api.get(`/expenses?${params}`), api.get('/sites')])
      .then(([e, s]) => { setExpenses(e.data); setSites(s.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [filterSite])

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div className="page-content space-y-4">
      <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
        <option value="">All Sites</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <button onClick={() => navigate('/expenses/add')} className="btn-primary w-full">
        <Plus size={18} /> Add Expense
      </button>

      {expenses.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-gray-400 text-xs">Total Expenses</p>
          <p className="text-red-400 font-bold text-2xl">₹{total.toLocaleString('en-IN')}</p>
        </div>
      )}

      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={18} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium text-sm">{e.category_name || 'Expense'}</p>
                  <p className="text-red-400 font-bold">₹{parseFloat(e.amount).toLocaleString('en-IN')}</p>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{e.expense_date} · {e.payment_mode}</p>
                {e.description && <p className="text-gray-600 text-xs truncate">{e.description}</p>}
                {e.receipt_photo && <a href={e.receipt_photo} target="_blank" rel="noreferrer" className="text-primary-400 text-xs">View receipt</a>}
              </div>
            </div>
          ))}
          {!expenses.length && <p className="text-center text-gray-500 py-12">No expenses found</p>}
        </div>
      )}
    </div>
  )
}
