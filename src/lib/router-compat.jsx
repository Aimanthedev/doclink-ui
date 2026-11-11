// Small bridge so the original pages' navigation calls work on TanStack Router.
import { useEffect, useMemo, useCallback } from 'react'
import { useNavigate as useTsNavigate, useLocation as useTsLocation, useRouterState, Link } from '@tanstack/react-router'

function split(to) {
  const [path, query = ''] = String(to).split('?')
  return { path: path || '/', search: Object.fromEntries(new URLSearchParams(query)) }
}

export function useNavigate() {
  const nav = useTsNavigate()
  return useCallback((to, opts = {}) => {
    if (typeof to === 'number') { window.history.go(to); return }
    const { path, search } = split(to)
    nav({ to: path, search, replace: !!opts.replace })
  }, [nav])
}

export function useLocation() {
  const loc = useTsLocation()
  return { pathname: loc.pathname, search: loc.searchStr || '', hash: loc.hash || '', state: loc.state }
}

export function useSearchParams() {
  const searchStr = useRouterState({ select: s => s.location.searchStr || '' })
  const pathname = useRouterState({ select: s => s.location.pathname })
  const nav = useTsNavigate()
  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr])
  const setParams = useCallback((next, opts = {}) => {
    const value = typeof next === 'function' ? next(new URLSearchParams(searchStr)) : next
    const sp = value instanceof URLSearchParams ? value : new URLSearchParams(value)
    nav({ to: pathname, search: Object.fromEntries(sp), replace: !!opts.replace })
  }, [nav, pathname, searchStr])
  return [params, setParams]
}

export function NavLink({ to, end, className, style, children, ...rest }) {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { path, search } = split(to)
  const isActive = end || path === '/' ? pathname === path : pathname === path || pathname.startsWith(path + '/')
  const arg = { isActive, isPending: false }
  return (
    <Link to={path} search={search} {...rest}
      className={typeof className === 'function' ? className(arg) : className}
      style={typeof style === 'function' ? style(arg) : style}>
      {typeof children === 'function' ? children(arg) : children}
    </Link>
  )
}

export function Navigate({ to, replace }) {
  const navigate = useNavigate()
  useEffect(() => { navigate(to, { replace }) }, [to])
  return null
}
