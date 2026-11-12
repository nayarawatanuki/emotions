// Called once before mounting the router: never put the invitation in router state or storage.
export function takeActivationToken(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  history: Pick<History, 'replaceState' | 'state'>
): string | null {
  if (location.pathname !== '/activate-account') return null
  const fragment = location.hash
  history.replaceState(history.state, '', location.pathname + location.search)
  if (!/^#token=[A-Za-z0-9_-]{43}$/.test(fragment)) return null
  const token = fragment.slice(7)
  // A 32-byte base64url token has two zero padding bits in its final character.
  return /^[AEIMQUYcgkosw048]$/.test(token.at(-1) ?? '') ? token : null
}
