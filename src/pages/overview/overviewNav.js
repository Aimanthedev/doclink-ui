// Overview quick actions must enforce the same access as their destination
// pages. A link is only active when the user's tab permission allows the page.
import { NAV } from '../../components/layout/navConfig'

export function basePath(path) {
  return path.split('?')[0].split('#')[0]
}

// `can` is PermissionsContext's can(key). Overview itself has no permission.
export function canNavigateTo(path, can) {
  const item = NAV.find(n => n.to === basePath(path))
  if (!item) return false
  if (!item.permission) return true
  return can(item.permission)
}
