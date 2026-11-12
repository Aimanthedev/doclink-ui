import { useEffect } from 'react'

// Labels every table cell with its column header (data-label) so the mobile CSS
// can render each row as a compact record card. Desktop tables are unaffected.
export function useMobileTables(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const label = () => {
      root.querySelectorAll('table').forEach(table => {
        const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim())
        if (!heads.length) return
        table.classList.add('rt')
        table.querySelectorAll('tbody tr').forEach(tr => {
          [...tr.children].forEach((td, i) => {
            const h = heads[i] || ''
            if (td.getAttribute('data-label') !== h) td.setAttribute('data-label', h)
          })
        })
      })
    }
    label()
    let raf = 0
    const obs = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(label) })
    obs.observe(root, { childList: true, subtree: true })
    return () => { obs.disconnect(); cancelAnimationFrame(raf) }
  }, [rootRef])
}
