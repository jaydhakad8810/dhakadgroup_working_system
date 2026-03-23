import { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import api from '../api/axios';
import { Plus, Package, ArrowDown, ArrowUp, ArrowLeftRight, Search, Trash2, X, Upload, Camera } from 'lucide-react';

const GOLD = '#C9A84C';
const GOLD_GRAD = 'linear-gradient(135deg, #C9A84C, #a8863d)';
const UNITS = ['kg', 'liter', 'bag', 'piece', 'box', 'bundle', 'bucket', 'roll'];
const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-300 text-gray-800";
const selectCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none text-gray-800";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const modalBg = { background: '#00000088' };

const PhotoInput = ({ label, name, optional = true, onFileChange }) => {
  const uploadRef = useRef();
  const cameraRef = useRef();
  const [fileName, setFileName] = useState('');
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) { setFileName(file.name); onFileChange(name, file); }
  };
  return (
    <div>
      <label className={labelCls}>{label} {optional && <span className="text-gray-400 text-xs">(optional)</span>}</label>
      {fileName && <p className="text-xs text-green-600 mb-1 truncate">✅ {fileName}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => cameraRef.current.click()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-yellow-400 flex-1 justify-center"><Camera size={14} /> Camera</button>
        <button type="button" onClick={() => uploadRef.current.click()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-yellow-400 flex-1 justify-center"><Upload size={14} /> Upload</button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

const StockTable = ({ stockList }) => (
  stockList.length === 0
    ? <div className="text-center py-6 text-gray-400 text-sm">No stock found</div>
    : <table className="w-full">
      <thead><tr style={{ background: '#0a0a0a' }}>
        {['Material', 'Type', 'Quantity', 'Unit', 'Status'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {stockList.map(s => (
          <tr key={s.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{s.MaterialCategory?.name || '—'}</td>
            <td className="px-4 py-3 text-gray-500 text-sm capitalize">{s.MaterialCategory?.category_type || '—'}</td>
            <td className="px-4 py-3 font-bold text-lg" style={{ color: s.quantity <= (s.low_stock_threshold || 10) ? '#ef4444' : '#111' }}>
              {parseFloat(s.quantity || 0).toFixed(2)}
            </td>
            <td className="px-4 py-3 text-gray-500 text-sm">{s.unit || '—'}</td>
            <td className="px-4 py-3">
              {s.quantity <= (s.low_stock_threshold || 10)
                ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">🔴 Low Stock</span>
                : <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ OK</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
);

export default function Godown() {
  const [godowns, setGodowns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sites, setSites] = useState([]);
  const [allStock, setAllStock] = useState({});
  const [selectedGodown, setSelectedGodown] = useState('');
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overall');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showAddGodown, setShowAddGodown] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDeleteGodown, setShowDeleteGodown] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const emptyGodownForm = { name: '', address: '', city: '', location_url: '', site_id: '', incharge_id: '' };
  const emptyCatForm = { name: '', category_type: '' };
  const emptyStockIn = { godown_id: '', category_id: '', quantity: '', unit: 'kg', bill_amount: '', received_from: '', notes: '' };
  const emptyStockOut = { godown_id: '', category_id: '', quantity: '', unit: 'kg', destination_type: 'site', site_id: '', to_godown_id: '', driver_id: '', notes: '' };
  const emptyTransfer = { from_godown_id: '', to_godown_id: '', category_id: '', quantity: '', unit: 'kg', driver_id: '', notes: '' };

  const [godownForm, setGodownForm] = useState(emptyGodownForm);
  const [catForm, setCatForm] = useState(emptyCatForm);
  const [stockInForm, setStockInForm] = useState(emptyStockIn);
  const [stockOutForm, setStockOutForm] = useState(emptyStockOut);
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [stockInFiles, setStockInFiles] = useState({});
  const [stockOutFiles, setStockOutFiles] = useState({});

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (selectedGodown) { fetchStock(selectedGodown); fetchHistory(selectedGodown); } }, [selectedGodown]);

  const fetchAll = async () => {
    try {
      const [gRes, cRes, sRes, supRes, dRes] = await Promise.all([
        api.get('/godown'), api.get('/godown/category'), api.get('/sites'),
        api.get('/auth/supervisors'), api.get('/drivers'),
      ]);
      const list = gRes.data.data || [];
      setGodowns(list);
      setCategories(cRes.data.data || []);
      setSites(sRes.data.data || []);
      setSupervisors((supRes.data.data || []).filter(s => s.is_active));
      setDrivers((dRes.data.data || []).filter(d => d.is_active));
      if (list.length > 0) {
        setSelectedGodown(list[0].id);
        const sd = {};
        await Promise.all(list.map(async g => {
          try { const r = await api.get(`/godown/stock/${g.id}`); sd[g.id] = r.data.data || []; } catch { sd[g.id] = []; }
        }));
        setAllStock(sd);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchStock = async (id) => {
    try { const r = await api.get(`/godown/stock/${id}`); setStock(r.data.data || []); setAllStock(p => ({ ...p, [id]: r.data.data || [] })); } catch (e) { console.error(e); }
  };

  const fetchHistory = async (id) => {
    try { const r = await api.get(`/godown/history/${id}`); setHistory(r.data.data || []); } catch (e) { console.error(e); }
  };

  const refreshAllStock = async () => {
    const sd = {};
    await Promise.all(godowns.map(async g => {
      try { const r = await api.get(`/godown/stock/${g.id}`); sd[g.id] = r.data.data || []; } catch { sd[g.id] = []; }
    }));
    setAllStock(sd);
  };

  const filterStock = (list) => !search.trim() ? list : list.filter(s => s.MaterialCategory?.name?.toLowerCase().includes(search.toLowerCase()));

  const searchResults = () => {
    if (!search.trim()) return {};
    const results = {};
    godowns.forEach(g => {
      const matched = (allStock[g.id] || []).filter(s => s.MaterialCategory?.name?.toLowerCase().includes(search.toLowerCase()));
      if (matched.length > 0) results[g.id] = { godown: g, items: matched };
    });
    return results;
  };

  const getIncharge = (g) => supervisors.find(s => s.id === g?.incharge_id);

  const handleAddGodown = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.post('/godown', godownForm); setShowAddGodown(false); setGodownForm(emptyGodownForm); fetchAll(); }
    catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/godown/category', catForm); setShowAddCategory(false); setCatForm(emptyCatForm);
      const r = await api.get('/godown/category'); setCategories(r.data.data || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  const handleStockIn = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(stockInForm).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      Object.entries(stockInFiles).forEach(([k, v]) => fd.append(k, v));
      await api.post('/godown/stock-in', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowStockIn(false); setStockInForm(emptyStockIn); setStockInFiles({});
      if (selectedGodown) { fetchStock(selectedGodown); fetchHistory(selectedGodown); }
      refreshAllStock();
    } catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  const handleStockOut = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(stockOutForm).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      Object.entries(stockOutFiles).forEach(([k, v]) => fd.append(k, v));
      await api.post('/godown/stock-out', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowStockOut(false); setStockOutForm(emptyStockOut); setStockOutFiles({});
      if (selectedGodown) { fetchStock(selectedGodown); fetchHistory(selectedGodown); }
      refreshAllStock();
    } catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/godown/transfer', transferForm);
      setShowTransfer(false); setTransferForm(emptyTransfer); refreshAllStock();
    } catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  const handleDeleteGodown = async () => {
    setSaving(true);
    try {
      await api.delete(`/godown/${deleteTarget.id}`);
      setShowDeleteGodown(false); setDeleteTarget(null); fetchAll();
    } catch (err) { setError(err.response?.data?.message || 'Failed!'); } finally { setSaving(false); }
  };

  return (
    <Layout title="Godown & Stock">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Godown & Stock</h2>
          <p className="text-gray-500 text-sm mt-1">{godowns.length} godowns · {categories.length} materials</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => { setGodownForm(emptyGodownForm); setError(''); setShowAddGodown(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold text-sm bg-green-500 hover:bg-green-600"><Plus size={15} /> Godown</button>
          <button onClick={() => { setCatForm(emptyCatForm); setError(''); setShowAddCategory(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold text-sm bg-indigo-500 hover:bg-indigo-600"><Plus size={15} /> Material</button>
          <button onClick={() => { setTransferForm(emptyTransfer); setError(''); setShowTransfer(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold text-sm bg-purple-500 hover:bg-purple-600"><ArrowLeftRight size={15} /> Transfer</button>
          <button onClick={() => { setStockInForm(emptyStockIn); setStockInFiles({}); setError(''); setShowStockIn(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-black font-semibold text-sm" style={{ background: GOLD_GRAD }}><ArrowDown size={15} /> Stock IN</button>
          <button onClick={() => { setStockOutForm(emptyStockOut); setStockOutFiles({}); setError(''); setShowStockOut(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold text-sm" style={{ background: '#0a0a0a', border: '1px solid #C9A84C44' }}><ArrowUp size={15} /> Stock OUT</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input type="text" placeholder="Search material across all godowns..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-800 shadow-sm" />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"><X size={18} /></button>}
      </div>

      {/* Search Results */}
      {search.trim() && (
        <div className="space-y-4 mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Results for "{search}"</p>
          {Object.values(searchResults()).length === 0
            ? <div className="bg-white rounded-2xl p-8 text-center text-gray-400">No material found</div>
            : Object.values(searchResults()).map(({ godown: g, items }) => {
              const incharge = getIncharge(g);
              const totalQty = items.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
              return (
                <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100" style={{ background: '#fafafa' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold" style={{ color: GOLD }}>{g.godown_code}</span>
                      <span className="font-bold text-gray-900">{g.name}</span>
                      {g.city && <span className="text-xs text-gray-400">📍 {g.city}</span>}
                      {incharge && <span className="text-xs text-gray-400">👷 {incharge.name}</span>}
                    </div>
                    <span className="text-xs font-medium text-gray-500">Total: {totalQty.toFixed(2)}</span>
                  </div>
                  <StockTable stockList={items} />
                </div>
              );
            })}
        </div>
      )}

      {/* Tabs */}
      {!search.trim() && (
        <>
          <div className="flex gap-2 mb-5">
            {[{ key: 'overall', label: '🏭 Overall Stock' }, { key: 'godown', label: '📦 By Godown' }, { key: 'history', label: '📋 History' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${tab === t.key ? 'text-black' : 'bg-white text-gray-500 border border-gray-200'}`}
                style={tab === t.key ? { background: GOLD_GRAD } : {}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overall Stock */}
          {tab === 'overall' && (
            <div className="space-y-5">
              {loading ? <div className="text-center py-16 text-gray-400">Loading...</div>
                : godowns.length === 0 ? <div className="text-center py-16 text-gray-400"><Package size={40} className="mx-auto mb-3 opacity-30" /><p>No godowns yet</p></div>
                : godowns.map(g => {
                  const gStock = allStock[g.id] || [];
                  const incharge = getIncharge(g);
                  const linkedSite = sites.find(s => s.id === g.site_id);
                  return (
                    <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: '#fafafa' }}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold" style={{ color: GOLD }}>{g.godown_code}</span>
                            <h3 className="font-bold text-gray-900">{g.name}</h3>
                            {linkedSite && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🏗️ {linkedSite.name}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {g.city && <p className="text-xs text-gray-400">📍 {g.city}</p>}
                            {incharge && <p className="text-xs text-gray-400">👷 {incharge.name} ({incharge.supervisor_id})</p>}
                            {g.location_url && <a href={g.location_url} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline">🗺 Maps</a>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">{gStock.length} materials</span>
                          <button onClick={() => { setDeleteTarget(g); setError(''); setShowDeleteGodown(true); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                        </div>
                      </div>
                      {gStock.length === 0
                        ? <div className="text-center py-6 text-gray-400 text-sm">No stock in this godown</div>
                        : <StockTable stockList={gStock} />}
                    </div>
                  );
                })}
            </div>
          )}

          {/* By Godown */}
          {tab === 'godown' && (
            <div>
              <select value={selectedGodown} onChange={e => setSelectedGodown(e.target.value)}
                className="w-full md:w-72 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-800 shadow-sm mb-5">
                <option value="">Select godown...</option>
                {godowns.map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
              </select>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {!selectedGodown ? <div className="text-center py-16 text-gray-400"><Package size={40} className="mx-auto mb-3 opacity-30" /><p>Select a godown</p></div>
                  : <StockTable stockList={filterStock(stock)} />}
              </div>
            </div>
          )}

          {/* History */}
          {tab === 'history' && (
            <div>
              <select value={selectedGodown} onChange={e => setSelectedGodown(e.target.value)}
                className="w-full md:w-72 px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-800 shadow-sm mb-5">
                <option value="">Select godown...</option>
                {godowns.map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
              </select>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {history.length === 0 ? <div className="text-center py-16 text-gray-400">No history yet</div>
                  : <table className="w-full">
                    <thead><tr style={{ background: '#0a0a0a' }}>
                      {['Type', 'Material', 'Qty', 'Unit', 'Amount', 'From/To', 'Photo', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: GOLD }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.transaction_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {h.transaction_type === 'IN' ? '📥 IN' : '📤 OUT'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{h.MaterialCategory?.name || '—'}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{h.quantity}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{h.unit || '—'}</td>
                          <td className="px-4 py-3 text-gray-900">{h.bill_amount ? `₹${parseFloat(h.bill_amount).toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{h.received_from || h.notes || '—'}</td>
                          <td className="px-4 py-3">
                            {h.bill_photo_url ? <a href={h.bill_photo_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600">📷 View</a> : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ ADD GODOWN ══ */}
      {showAddGodown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Add New Godown</h3>
              <button onClick={() => setShowAddGodown(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddGodown} className="p-6 space-y-4">
              <div><label className={labelCls}>Godown Name *</label><input required value={godownForm.name} onChange={e => setGodownForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Main Godown Nagpur" /></div>
              <div><label className={labelCls}>Address</label><input value={godownForm.address} onChange={e => setGodownForm(f => ({ ...f, address: e.target.value }))} className={inputCls} placeholder="Full address" /></div>
              <div><label className={labelCls}>City</label><input value={godownForm.city} onChange={e => setGodownForm(f => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="City" /></div>
              <div>
                <label className={labelCls}>Linked Site <span className="text-gray-400 text-xs">(optional)</span></label>
                <select value={godownForm.site_id} onChange={e => setGodownForm(f => ({ ...f, site_id: e.target.value }))} className={selectCls}>
                  <option value="">No site linked</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.site_code} — {s.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">💡 Material from this godown will be tracked to this site</p>
              </div>
              <div>
                <label className={labelCls}>Google Maps URL <span className="text-gray-400 text-xs">(optional)</span></label>
                <input value={godownForm.location_url} onChange={e => setGodownForm(f => ({ ...f, location_url: e.target.value }))} className={inputCls} placeholder="Paste Google Maps link..." />
                <p className="text-xs text-gray-400 mt-1">💡 Google Maps → Share → Copy link → Paste here</p>
              </div>
              <div>
                <label className={labelCls}>Incharge Supervisor <span className="text-gray-400 text-xs">(optional)</span></label>
                <select value={godownForm.incharge_id} onChange={e => setGodownForm(f => ({ ...f, incharge_id: e.target.value }))} className={selectCls}>
                  <option value="">Select supervisor...</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} — {s.supervisor_id}</option>)}
                </select>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddGodown(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-black font-semibold disabled:opacity-50" style={{ background: GOLD_GRAD }}>{saving ? 'Adding...' : 'Add Godown'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD MATERIAL ══ */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Add Material</h3>
              <button onClick={() => setShowAddCategory(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div><label className={labelCls}>Material Name *</label><input required value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Asian Paint Apex" /></div>
              <div>
                <label className={labelCls}>Category Type</label>
                <select value={catForm.category_type} onChange={e => setCatForm(f => ({ ...f, category_type: e.target.value }))} className={selectCls}>
                  <option value="">Select type</option>
                  {['paint', 'putty', 'primer', 'chemical', 'tool', 'hardware', 'other'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddCategory(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-black font-semibold disabled:opacity-50" style={{ background: GOLD_GRAD }}>{saving ? 'Adding...' : 'Add Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ STOCK IN ══ */}
      {showStockIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">📥 Stock IN</h3>
              <button onClick={() => setShowStockIn(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleStockIn} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Godown *</label>
                <select required value={stockInForm.godown_id} onChange={e => setStockInForm(f => ({ ...f, godown_id: e.target.value }))} className={selectCls}>
                  <option value="">Select godown</option>
                  {godowns.map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
                </select>
                {stockInForm.godown_id && (() => {
                  const inc = getIncharge(godowns.find(g => g.id === stockInForm.godown_id));
                  return inc ? (
                    <div className="mt-2 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: '#C9A84C44' }}>{inc.name?.charAt(0)}</div>
                      <p className="text-xs text-gray-700">Incharge: <span className="font-semibold">{inc.name}</span> ({inc.supervisor_id})</p>
                    </div>
                  ) : null;
                })()}
              </div>
              <div><label className={labelCls}>Received From <span className="text-gray-400 text-xs">(supplier/client)</span></label>
                <input value={stockInForm.received_from} onChange={e => setStockInForm(f => ({ ...f, received_from: e.target.value }))} className={inputCls} placeholder="e.g. Asian Paints Depot" /></div>
              <div><label className={labelCls}>Material *</label>
                <select required value={stockInForm.category_id} onChange={e => setStockInForm(f => ({ ...f, category_id: e.target.value }))} className={selectCls}>
                  <option value="">Select material</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.category_type ? ` (${c.category_type})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity *</label><input required type="number" min="0.01" step="any" value={stockInForm.quantity} onChange={e => setStockInForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} placeholder="Qty" /></div>
                <div><label className={labelCls}>Unit *</label>
                  <select required value={stockInForm.unit} onChange={e => setStockInForm(f => ({ ...f, unit: e.target.value }))} className={selectCls}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Bill Amount (₹) *</label><input required type="number" min="0" step="any" value={stockInForm.bill_amount} onChange={e => setStockInForm(f => ({ ...f, bill_amount: e.target.value }))} className={inputCls} placeholder="Total bill amount" /></div>
              <PhotoInput label="Bill Photo" name="bill_photo" optional={true} onFileChange={(n, f) => setStockInFiles(p => ({ ...p, [n]: f }))} />
              <div><label className={labelCls}>Notes <span className="text-gray-400 text-xs">(optional)</span></label><input value={stockInForm.notes} onChange={e => setStockInForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional notes" /></div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStockIn(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-black font-semibold disabled:opacity-50" style={{ background: GOLD_GRAD }}>{saving ? 'Saving...' : 'Stock IN'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ STOCK OUT ══ */}
      {showStockOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">📤 Stock OUT</h3>
              <button onClick={() => setShowStockOut(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleStockOut} className="p-6 space-y-4">
              <div><label className={labelCls}>From Godown *</label>
                <select required value={stockOutForm.godown_id} onChange={e => setStockOutForm(f => ({ ...f, godown_id: e.target.value }))} className={selectCls}>
                  <option value="">Select godown</option>
                  {godowns.map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Material *</label>
                <select required value={stockOutForm.category_id} onChange={e => setStockOutForm(f => ({ ...f, category_id: e.target.value }))} className={selectCls}>
                  <option value="">Select material</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.category_type ? ` (${c.category_type})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity *</label><input required type="number" min="0.01" step="any" value={stockOutForm.quantity} onChange={e => setStockOutForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} placeholder="Qty" /></div>
                <div><label className={labelCls}>Unit *</label>
                  <select required value={stockOutForm.unit} onChange={e => setStockOutForm(f => ({ ...f, unit: e.target.value }))} className={selectCls}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {/* Destination */}
              <div>
                <label className={labelCls}>Destination *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'site', label: '🏗️ Send to Site' }, { v: 'godown', label: '🏭 Send to Godown' }].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setStockOutForm(f => ({ ...f, destination_type: opt.v, site_id: '', to_godown_id: '' }))}
                      className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${stockOutForm.destination_type === opt.v ? 'border-yellow-400' : 'border-gray-200 text-gray-500'}`}
                      style={stockOutForm.destination_type === opt.v ? { background: '#C9A84C22', color: '#111' } : {}}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {stockOutForm.destination_type === 'site' && (
                <div><label className={labelCls}>Send to Site *</label>
                  <select required value={stockOutForm.site_id} onChange={e => setStockOutForm(f => ({ ...f, site_id: e.target.value }))} className={selectCls}>
                    <option value="">Select site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.site_code} — {s.name}</option>)}
                  </select>
                </div>
              )}
              {stockOutForm.destination_type === 'godown' && (
                <div><label className={labelCls}>Send to Godown *</label>
                  <select required value={stockOutForm.to_godown_id} onChange={e => setStockOutForm(f => ({ ...f, to_godown_id: e.target.value }))} className={selectCls}>
                    <option value="">Select godown</option>
                    {godowns.filter(g => g.id !== stockOutForm.godown_id).map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls}>Assign Driver <span className="text-gray-400 text-xs">(optional)</span></label>
                <select value={stockOutForm.driver_id} onChange={e => setStockOutForm(f => ({ ...f, driver_id: e.target.value }))} className={selectCls}>
                  <option value="">No driver assigned</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.driver_id}</option>)}
                </select>
                {stockOutForm.driver_id && <p className="text-xs text-blue-600 mt-1">✅ Driver will receive a task notification</p>}
              </div>
              <PhotoInput label="Delivery Photo" name="delivery_photo" optional={true} onFileChange={(n, f) => setStockOutFiles(p => ({ ...p, [n]: f }))} />
              <div><label className={labelCls}>Notes <span className="text-gray-400 text-xs">(optional)</span></label><input value={stockOutForm.notes} onChange={e => setStockOutForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional notes" /></div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStockOut(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: '#0a0a0a' }}>{saving ? 'Saving...' : 'Stock OUT'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ TRANSFER ══ */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">🔄 Transfer Material</h3>
              <button onClick={() => setShowTransfer(false)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              {/* Flow */}
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm font-semibold text-purple-700">
                <span>{transferForm.from_godown_id ? godowns.find(g => g.id === transferForm.from_godown_id)?.godown_code || 'Godown A' : 'Godown A'}</span>
                <ArrowLeftRight size={14} className="text-purple-400 shrink-0" />
                <span>Driver</span>
                <ArrowLeftRight size={14} className="text-purple-400 shrink-0" />
                <span>{transferForm.to_godown_id ? godowns.find(g => g.id === transferForm.to_godown_id)?.godown_code || 'Godown B' : 'Godown B'}</span>
              </div>
              <div><label className={labelCls}>From Godown *</label>
                <select required value={transferForm.from_godown_id} onChange={e => setTransferForm(f => ({ ...f, from_godown_id: e.target.value }))} className={selectCls}>
                  <option value="">Select source</option>
                  {godowns.map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>To Godown *</label>
                <select required value={transferForm.to_godown_id} onChange={e => setTransferForm(f => ({ ...f, to_godown_id: e.target.value }))} className={selectCls}>
                  <option value="">Select destination</option>
                  {godowns.filter(g => g.id !== transferForm.from_godown_id).map(g => <option key={g.id} value={g.id}>{g.godown_code} — {g.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Material *</label>
                <select required value={transferForm.category_id} onChange={e => setTransferForm(f => ({ ...f, category_id: e.target.value }))} className={selectCls}>
                  <option value="">Select material</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.category_type ? ` (${c.category_type})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Quantity *</label><input required type="number" min="0.01" step="any" value={transferForm.quantity} onChange={e => setTransferForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} placeholder="Qty" /></div>
                <div><label className={labelCls}>Unit *</label>
                  <select required value={transferForm.unit} onChange={e => setTransferForm(f => ({ ...f, unit: e.target.value }))} className={selectCls}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Assign Driver <span className="text-gray-400 text-xs">(optional — gets notification)</span></label>
                <select value={transferForm.driver_id} onChange={e => setTransferForm(f => ({ ...f, driver_id: e.target.value }))} className={selectCls}>
                  <option value="">No driver assigned</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.driver_id}</option>)}
                </select>
                {transferForm.driver_id && <p className="text-xs text-blue-600 mt-1">✅ Driver will receive a transfer task notification</p>}
              </div>
              <div><label className={labelCls}>Notes <span className="text-gray-400 text-xs">(optional)</span></label><input value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional notes" /></div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTransfer(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 bg-purple-500 hover:bg-purple-600">{saving ? 'Transferring...' : 'Start Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE GODOWN ══ */}
      {showDeleteGodown && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Godown</h3>
            <p className="text-gray-500 text-sm mb-6">Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.godown_code})? All stock records will be lost!</p>
            {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">⚠️ {error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteGodown(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600">Cancel</button>
              <button onClick={handleDeleteGodown} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50">{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
