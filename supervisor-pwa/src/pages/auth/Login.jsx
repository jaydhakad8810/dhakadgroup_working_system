import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(identifier, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-600 flex flex-col">
      {/* Top decoration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👷</span>
            </div>
            <h1 className="text-3xl font-bold text-white">DGSystem</h1>
            <p className="text-primary-500 font-medium mt-1">Supervisor Portal</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="label">Employee ID</label>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)}
                className="input" placeholder="Enter your Employee ID (e.g. SUP-RAHUL-001)" required autoComplete="username" />
              <p className="text-gray-500 text-xs mt-1">Login with your Employee ID provided by admin</p>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-12" placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading || !identifier || !password}
              className="btn-primary w-full py-4 text-base mt-2">
              {loading ? <Loader2 size={20} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-gray-600 text-xs mt-8">
            DGSystem Supervisor · Construction Management
          </p>
        </div>
      </div>
    </div>
  )
}
