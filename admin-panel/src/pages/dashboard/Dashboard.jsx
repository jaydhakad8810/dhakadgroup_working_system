import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Users, ClipboardCheck, DollarSign, Truck, Wrench, Bell, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import api from '../../utils/api'
import { StatCard, LoadingPage, StatusBadge } from '../../components/ui'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [attendanceChart, setAttendanceChart] = useState([])
  const [expenseChart, setExpenseChart] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, att, exp] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/dashboard/charts/attendance'),
          api.get('/dashboard/charts/expenses'),
        ])
        setData(dash.data)
        // Process attendance chart data
        const attMap = {}
        att.data.forEach(r => {
          if (!attMap[r.date]) attMap[r.date] = { date: r.date, present: 0, absent: 0 }
          if (r.status === 'present') attMap[r.date].present = parseInt(r.count)
          if (r.status === 'absent') attMap[r.date].absent = parseInt(r.count)
        })
        setAttendanceChart(Object.values(attMap).slice(-14))
        setExpenseChart(exp.data.map(e => ({ month: new Date(e.month).toLocaleString('default', { month: 'short' }), total: parseFloat(e.total) })))
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingPage />
  const s = data?.stats || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate('/sites')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Building2} label="Active Sites" value={s.activeSites} color="gold" sub={`${s.totalSites} total`} />
        </div>
        <div onClick={() => navigate('/labour')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Users} label="Active Labour" value={s.activeLabour} color="green" sub={`${s.totalLabour} total`} />
        </div>
        <div onClick={() => navigate('/attendance')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={ClipboardCheck} label="Today Present" value={s.todayAttendance} color="blue" />
        </div>
        <div onClick={() => navigate('/expenses')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={TrendingUp} label="Month Expenses" value={`₹${(s.monthExpenses || 0).toLocaleString('en-IN')}`} color="red" />
        </div>
        <div onClick={() => navigate('/users')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Users} label="Supervisors" value={s.totalSupervisors} color="purple" />
        </div>
        <div onClick={() => navigate('/drivers/trips')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Truck} label="Active Trips" value={s.activeTrips} color="blue" />
        </div>
        <div onClick={() => navigate('/machines')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Wrench} label="Machines In Use" value={s.machinesInUse} color="gold" />
        </div>
        <div onClick={() => navigate('/notifications')} className="cursor-pointer hover:border-gold-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 rounded-xl">
          <StatCard icon={Bell} label="Pending Requests" value={s.pendingRequests} color="red" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Attendance (Last 14 Days)</h3>
          {attendanceChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="present" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data yet</p>}
        </div>

        <div className="card">
          <h3 className="text-white font-semibold mb-4">Monthly Expenses</h3>
          {expenseChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={expenseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Expenses']} />
                <Line type="monotone" dataKey="total" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-10">No data yet</p>}
        </div>
      </div>

      {/* Recent Sites */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Sites</h3>
          <Link to="/sites" className="text-gold-500 text-sm hover:underline">View all</Link>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Site</th><th>Client</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {data?.recentSites?.map(site => (
                <tr key={site.id}>
                  <td><Link to={`/sites/${site.id}`} className="text-gold-400 hover:underline">{site.name}</Link></td>
                  <td>{site.client_name || '—'}</td>
                  <td><StatusBadge status={site.status} /></td>
                  <td className="text-gray-400">{new Date(site.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
