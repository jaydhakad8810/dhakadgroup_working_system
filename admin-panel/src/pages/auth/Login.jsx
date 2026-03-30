import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react'
import api from '../../utils/api'

export default function Login() {
  const [email, setEmail] = useState('dgsystem8810@gmail.com')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('dg_admin_view_mode') || 'desktop'
  )

  // OTP state
  const [showOtp, setShowOtp] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  const navigate = useNavigate()

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('dg_admin_view_mode', mode)
  }

  const saveToken = (token, user) => {
    if (rememberMe) {
      localStorage.setItem('dg_token', token)
      localStorage.setItem('dg_user', JSON.stringify(user))
    } else {
      sessionStorage.setItem('dg_token', token)
      sessionStorage.setItem('dg_user', JSON.stringify(user))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.requires_otp) {
        setOtpEmail(data.email)
        setShowOtp(true)
        setCountdown(60)
        toast.success('OTP sent to your email')
      } else {
        saveToken(data.token, data.user)
        window.location.href = '/dashboard'
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) otpRefs[i + 1].current?.focus()
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) return toast.error('Enter all 6 digits')
    setOtpLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { email: otpEmail, otp_code: code })
      saveToken(data.token, data.user)
      toast.success('Welcome back!')
      window.location.href = '/dashboard'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      otpRefs[0].current?.focus()
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    try {
      await api.post('/auth/login', { email, password })
      setOtp(['', '', '', '', '', ''])
      setCountdown(60)
      toast.success('OTP resent to your email')
      otpRefs[0].current?.focus()
    } catch {
      toast.error('Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Dhakad Group" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-white mt-4">DGSystem</h1>
          <p className="text-gold-500 font-medium mt-1">Construction Management</p>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>

        <div className="card shadow-2xl">
          {!showOtp ? (
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@example.com"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-[#D4AF37]"
                />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>

              {/* View Mode Toggle */}
              <div>
                <label className="label">View Mode</label>
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
                  <button
                    type="button"
                    onClick={() => handleViewMode('desktop')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all border-r ${
                      viewMode === 'desktop'
                        ? 'bg-gold-500/20 text-gold-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Monitor size={15} />
                    Desktop View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewMode('mobile')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                      viewMode === 'mobile'
                        ? 'bg-gold-500/20 text-gold-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Smartphone size={15} />
                    Mobile View
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3">
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-white font-medium">Enter OTP</p>
                <p className="text-gray-400 text-sm mt-1">
                  Sent to <span className="text-gold-400">{otpEmail}</span>
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-dark-800 border border-dark-600 focus:border-gold-500 rounded-lg text-white outline-none transition-colors"
                  />
                ))}
              </div>
              <button onClick={handleVerify} disabled={otpLoading} className="btn-gold w-full justify-center py-3">
                {otpLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {otpLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                className="w-full text-sm text-center text-gray-400 hover:text-gold-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          DGSystem © 2026 · Construction Management Platform
        </p>
      </div>
    </div>
  )
}
