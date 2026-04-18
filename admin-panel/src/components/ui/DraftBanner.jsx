export default function DraftBanner({ hasDraft, onRestore, onDiscard }) {
  if (!hasDraft) return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-4 border"
      style={{ background: '#C9A84C15', borderColor: '#C9A84C40' }}>
      <div>
        <p className="text-sm font-semibold text-white">Unsaved draft found</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          You have a saved draft. Restore it or start fresh.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onDiscard}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 text-gray-400 hover:text-white transition-all">
          Discard
        </button>
        <button onClick={onRestore}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 transition-all">
          Restore Draft
        </button>
      </div>
    </div>
  )
}
