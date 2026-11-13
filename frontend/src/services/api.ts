export class ApiError extends Error {
  readonly status: number
  readonly retryAfter: number | null

  constructor(status: number, retryAfter: number | null = null) {
    super('Não foi possível concluir a solicitação.')
    this.status = status
    this.retryAfter = retryAfter
  }
}

export async function apiRequest(
  path: string,
  options: {
    method?: 'POST' | 'PATCH'
    body?: unknown
    csrfToken?: string
    signal?: AbortSignal
  } = {}
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    headers['X-Emotions-Request'] = '1'
  }
  if (options.csrfToken) headers['X-CSRF-Token'] = options.csrfToken
  const timeout = AbortSignal.timeout(20_000)
  const response = await fetch(`/api${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout
  })
  if (!response.ok) {
    const retry = response.headers.get('Retry-After')
    const seconds = retry && /^\d{1,6}$/.test(retry) ? Number(retry) : null
    throw new ApiError(response.status, seconds)
  }
  if (response.status === 204) return null
  if (!response.headers.get('Content-Type')?.includes('application/json'))
    throw new ApiError(502)
  return response.json()
}

export function requestError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    const wait = error.retryAfter
      ? ` Aguarde cerca de ${Math.ceil(error.retryAfter / 60)} minuto(s).`
      : ' Aguarde um pouco.'
    return `Muitas tentativas em pouco tempo.${wait}`
  }
  return 'Não conseguimos conectar ao serviço. Tente novamente em instantes.'
}
