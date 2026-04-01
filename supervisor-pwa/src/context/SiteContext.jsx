import { createContext, useContext, useState } from 'react'

const SiteContext = createContext(null)

export function SiteProvider({ children }) {
  const [selectedSiteId, setSelectedSiteId] = useState(
    () => localStorage.getItem('sv_site_id') || null
  )

  const selectSite = (id) => {
    setSelectedSiteId(id)
    if (id) localStorage.setItem('sv_site_id', id)
    else localStorage.removeItem('sv_site_id')
  }

  return (
    <SiteContext.Provider value={{ selectedSiteId, selectSite }}>
      {children}
    </SiteContext.Provider>
  )
}

export const useSite = () => useContext(SiteContext)
