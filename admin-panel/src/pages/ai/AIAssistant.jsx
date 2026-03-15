import { useState, useRef, useEffect } from 'react'
import api from '../../utils/api'
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react'

export default function AIAssistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello! I\'m your DGSystem AI Assistant. I can help you analyze site performance, expenses, labour productivity, and more. What would you like to know?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const { data } = await api.post('/ai/chat', { message: userMsg })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    }
    setLoading(false)
  }

  const analyzeSite = async () => {
    if (!selectedSite) return
    setAnalyzing(true)
    setMessages(prev => [...prev, { role: 'user', content: `Analyze site: ${sites.find(s => s.id === selectedSite)?.name}` }])
    try {
      const { data } = await api.post(`/ai/analyze-site/${selectedSite}`)
      setMessages(prev => [...prev, { role: 'assistant', content: data.analysis }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to analyze site. Please try again.' }])
    }
    setAnalyzing(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center"><Sparkles size={20} className="text-gold-400" /></div>
        <div><h1 className="text-2xl font-bold text-white">AI Assistant</h1><p className="text-gray-400 text-sm">Powered by Google Gemini</p></div>
        <div className="ml-auto flex gap-2">
          <select className="select w-48 text-sm" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
            <option value="">Select site to analyze</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={analyzeSite} disabled={!selectedSite || analyzing} className="btn-gold text-sm py-2">
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Analyze Site
          </button>
        </div>
      </div>

      <div className="flex-1 card overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gold-500/20' : 'bg-blue-500/20'}`}>
              {msg.role === 'assistant' ? <Bot size={16} className="text-gold-400" /> : <User size={16} className="text-blue-400" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'bg-dark-800 text-gray-200 rounded-tl-sm' : 'bg-gold-500/20 text-gold-100 rounded-tr-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center"><Bot size={16} className="text-gold-400" /></div>
            <div className="bg-dark-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={14} className="animate-spin text-gold-400" />Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-3">
        <input className="input flex-1" placeholder="Ask anything about your construction sites, expenses, labour..." value={input} onChange={e => setInput(e.target.value)} disabled={loading} />
        <button type="submit" disabled={!input.trim() || loading} className="btn-gold px-5"><Send size={16} /></button>
      </form>
    </div>
  )
}
