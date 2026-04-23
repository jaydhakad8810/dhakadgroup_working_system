import { ClipboardList, ChevronDown, ChevronUp, CheckCircle, Package, Layers, RefreshCw, ShoppingCart, X, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import toast from 'react-hot-toast'

function StepProgressRow({ step, totalFlats }) {
  const done = step.done_count || 0
  const pct = totalFlats > 0 ? Math.round((done / totalFlats) * 100) : 0
  const color = pct === 100 ? '#10B981' : pct > 0 ? '#F97316' : '#6B7280'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-sm text-white flex-1">{step.step_name}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
        </div>
        <span className="text-xs w-8 text-right" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function MaterialRow({ mat, woId, cartProps }) {
  // Progress API returns { total, used, remaining } — fall back to _quantity fields too
  const used = parseFloat(mat.used ?? mat.used_quantity) || 0
  const total = parseFloat(mat.total ?? mat.total_quantity) || 0
  const remaining = mat.remaining !== undefined ? parseFloat(mat.remaining) : Math.max(0, total - used)
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const isLow = remaining > 0 && remaining < total * 0.2
  const isExhausted = remaining <= 0

  const inCart = cartProps ? cartProps.isInCart(mat.id) : false
  const showInput = cartProps ? (cartProps.showInlineInput[mat.id] || false) : false
  const qtyVal = cartProps ? (cartProps.inlineQty[mat.id] || '') : ''

  return (
    <div className="card-sm mb-2">
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{mat.product_name}</p>
          <p className="text-xs text-gray-400">{mat.company_name} · {mat.unit}</p>
          {isExhausted && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full inline-block mt-0.5">Exhausted</span>
          )}
          {isLow && !isExhausted && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full inline-block mt-0.5">Low</span>
          )}
        </div>
        {cartProps && !isExhausted && (
          <div className="shrink-0">
            {inCart ? (
              <div className="flex items-center gap-1">
                <CheckCircle size={13} className="text-green-400" />
                <span className="text-xs text-green-400 font-medium">
                  {cartProps.cartItems.find(c => c.work_order_material_id === mat.id)?.quantity} {mat.unit}
                </span>
                <button
                  onClick={() => cartProps.removeFromCart(mat.id)}
                  className="text-gray-500 hover:text-red-400 p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ) : showInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  autoFocus
                  className="w-14 text-xs bg-surface-400 border border-white/10 rounded-lg px-1.5 py-1 text-white text-center"
                  value={qtyVal}
                  onChange={e => cartProps.setInlineQty(prev => ({ ...prev, [mat.id]: e.target.value }))}
                />
                <span className="text-xs text-gray-500">{mat.unit}</span>
                <button
                  className="text-xs bg-primary-500 text-white px-2 py-1 rounded-lg font-medium"
                  onClick={() => cartProps.addToCart({
                    id: mat.id,
                    product_name: mat.product_name,
                    company_name: mat.company_name,
                    unit: mat.unit,
                    remaining_quantity: remaining,
                    work_order_id: woId,
                  })}
                >
                  Add
                </button>
                <button
                  onClick={() => cartProps.setShowInlineInput(prev => ({ ...prev, [mat.id]: false }))}
                  className="text-gray-500 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => cartProps.setShowInlineInput(prev => ({ ...prev, [mat.id]: true }))}
                className="flex items-center gap-1 text-xs border border-primary-500/40 text-primary-400 px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-colors"
              >
                <ShoppingCart size={11} /> Add to Cart
              </button>
            )}
          </div>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
        <div className="h-full rounded-full bg-primary-500" style={{ width: pct + '%' }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Used: {used} {mat.unit}</span>
        <span>
          Remaining:{' '}
          <span className={isLow || isExhausted ? 'text-orange-400' : 'text-white'}>
            {remaining.toFixed(1)} {mat.unit}
          </span>
        </span>
      </div>
    </div>
  )
}

function CartSheet({ cartItems, setCartItems, show, onClose, urgency, setUrgency, notes, setNotes, onPlaceOrder, placing, removeFromCart, siteId }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-300 rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Your Order — {cartItems.length} items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cartItems.map(item => (
            <div key={item.work_order_material_id} className="card-sm">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{item.material_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      className="w-20 text-xs bg-surface-400 border border-white/10 rounded-lg px-2 py-1 text-white"
                      value={item.quantity}
                      onChange={e => setCartItems(prev => prev.map(ci =>
                        ci.work_order_material_id === item.work_order_material_id
                          ? { ...ci, quantity: e.target.value }
                          : ci
                      ))}
                    />
                    <span className="text-gray-400 text-xs">{item.unit}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.work_order_material_id)}
                  className="text-gray-500 hover:text-red-400 p-1 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 space-y-3">
          <div>
            <label className="label mb-2">Urgency</label>
            <div className="flex gap-2">
              {['normal', 'urgent', 'critical'].map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    urgency === u
                      ? u === 'critical' ? 'bg-red-500 text-white'
                      : u === 'urgent' ? 'bg-orange-500 text-white'
                      : 'bg-primary-500 text-white'
                      : 'bg-surface-400 text-gray-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Add a note for admin (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            onClick={onPlaceOrder}
            disabled={placing || cartItems.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            {placing ? 'Placing...' : 'Place Order'}
          </button>
          <button onClick={onClose} className="w-full text-center text-gray-400 text-sm py-1">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkOrderCard({ wo, cartProps }) {
  const [expanded, setExpanded] = useState(false)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!expanded && !progress) {
      setLoading(true)
      try {
        const res = await api.get(`/workorders/${wo.id}/progress`)
        setProgress(res.data)
      } catch { toast.error('Failed to load progress') }
      setLoading(false)
    }
    setExpanded(v => !v)
  }

  const typeColor = wo.type === 'internal' ? '#3B82F6' : wo.type === 'external' ? '#10B981' : '#F97316'
  const typeBg = wo.type === 'internal' ? 'bg-blue-500/20 text-blue-400' : wo.type === 'external' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
  const totalFlats = progress?.total_flats || 0
  const overallPct = progress?.overall_percent || 0

  return (
    <div className="card mb-3" style={{ borderLeft: `3px solid ${typeColor}` }}>
      <div className="flex items-center justify-between cursor-pointer" onClick={toggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeBg}`}>{wo.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              wo.status === 'active' ? 'bg-green-500/20 text-green-400' :
              wo.status === 'completed' ? 'bg-gold-500/20 text-gold-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>{wo.status}</span>
          </div>
          <p className="text-white font-semibold text-sm truncate">{wo.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{wo.start_date} → {wo.end_date}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {progress && (
            <span className="text-lg font-bold text-primary-400">{overallPct}%</span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-white/10 pt-3">
          {loading && <p className="text-xs text-gray-500 text-center py-4">Loading progress...</p>}

          {progress && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-primary-400">{overallPct}%</p>
                  <p className="text-xs text-gray-500">Overall</p>
                </div>
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-white">{totalFlats}</p>
                  <p className="text-xs text-gray-500">Flats</p>
                </div>
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-green-400">
                    {progress.steps_progress?.filter(s => s.done_count === totalFlats && totalFlats > 0).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Steps Done</p>
                </div>
              </div>

              {progress.steps_progress?.length > 0 && (
                <div className="card-sm mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Layers size={12} /> Steps
                  </p>
                  {progress.steps_progress.map(s => (
                    <StepProgressRow key={s.step_id} step={s} totalFlats={totalFlats} />
                  ))}
                </div>
              )}

              {progress.materials_progress?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Package size={12} /> Materials
                  </p>
                  {progress.materials_progress.map(m => (
                    <MaterialRow key={m.id} mat={m} woId={wo.id} cartProps={cartProps} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorkOrderView() {
  const navigate = useNavigate()
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [supervisorSiteId, setSupervisorSiteId] = useState('')

  // Cart state
  const [cartItems, setCartItems] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [inlineQty, setInlineQty] = useState({})
  const [showInlineInput, setShowInlineInput] = useState({})
  const [cartUrgency, setCartUrgency] = useState('normal')
  const [cartNotes, setCartNotes] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/workorders')
      .then(res => {
        const data = res.data?.data || res.data || []
        setWorkOrders(data)
        if (data.length && !supervisorSiteId) setSupervisorSiteId(data[0]?.site_id || '')
      })
      .catch(() => toast.error('Failed to load work orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addToCart = (material) => {
    const cartItem = {
      work_order_material_id: material.id,
      material_name: material.product_name,
      company_name: material.company_name,
      unit: material.unit,
      work_order_id: material.work_order_id,
      quantity: inlineQty[material.id] || '',
    }
    setCartItems(prev => {
      const idx = prev.findIndex(c => c.work_order_material_id === material.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = cartItem
        return updated
      }
      return [...prev, cartItem]
    })
    setShowInlineInput(prev => ({ ...prev, [material.id]: false }))
    setInlineQty(prev => ({ ...prev, [material.id]: '' }))
  }

  const removeFromCart = (work_order_material_id) => {
    setCartItems(prev => prev.filter(c => c.work_order_material_id !== work_order_material_id))
  }

  const isInCart = (work_order_material_id) => {
    return cartItems.some(c => c.work_order_material_id === work_order_material_id)
  }

  const placeOrder = async () => {
    if (cartItems.length === 0) return
    const invalid = cartItems.some(item => !item.quantity || parseFloat(item.quantity) <= 0)
    if (invalid) {
      toast.error('All items must have a quantity greater than 0')
      return
    }
    setPlacingOrder(true)
    try {
      const res = await api.post('/godown/requests/batch', {
        site_id: supervisorSiteId,
        urgency: cartUrgency,
        notes: cartNotes,
        items: cartItems,
      })
      const itemCount = res.data?.item_count || cartItems.length
      toast.success(`Order placed — ${itemCount} items requested`)
      setCartItems([])
      setShowCart(false)
      setCartUrgency('normal')
      setCartNotes('')
      navigate('/godown')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to place order')
    } finally {
      setPlacingOrder(false)
    }
  }

  const cartProps = {
    cartItems,
    addToCart,
    removeFromCart,
    isInCart,
    inlineQty,
    setInlineQty,
    showInlineInput,
    setShowInlineInput,
  }

  const filtered = workOrders.filter(wo =>
    filter === 'all' ? true : wo.status === filter
  )

  return (
    <div className="page-content" style={{ paddingBottom: 100 }}>
      <div className="card mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-primary-400" />
            Work Orders
          </h1>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button onClick={() => setShowCart(true)} className="relative btn-ghost p-2">
                <ShoppingCart size={15} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {cartItems.length}
                </span>
              </button>
            )}
            <button onClick={load} className="btn-ghost p-2">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Your site's work orders and progress</p>
      </div>

      <div className="flex gap-2 mb-3">
        {['active', 'all', 'completed', 'draft'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] capitalize ${
              filter === f
                ? 'bg-primary-500/30 text-primary-400 border border-primary-500/50'
                : 'bg-surface-400 text-gray-500 border border-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={24} className="mx-auto text-gray-600 animate-spin mb-2" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium">No {filter} work orders</p>
          <p className="text-gray-500 text-sm mt-1">Admin creates work orders for your site</p>
        </div>
      )}

      {!loading && filtered.map(wo => (
        <WorkOrderCard key={wo.id} wo={wo} cartProps={cartProps} />
      ))}

      <CartSheet
        cartItems={cartItems}
        setCartItems={setCartItems}
        show={showCart}
        onClose={() => setShowCart(false)}
        urgency={cartUrgency}
        setUrgency={setCartUrgency}
        notes={cartNotes}
        setNotes={setCartNotes}
        onPlaceOrder={placeOrder}
        placing={placingOrder}
        removeFromCart={removeFromCart}
        siteId={supervisorSiteId}
      />
    </div>
  )
}
