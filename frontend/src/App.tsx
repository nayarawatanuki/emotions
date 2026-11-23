import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Home } from './pages/Home/Home'
import { Login } from './pages/Login/Login'
import { ActivateAccount } from './pages/ActivateAccount/ActivateAccount'
import { ChildSpace } from './pages/ChildSpace/ChildSpace'
import { NotFound } from './pages/NotFound/NotFound'

const Workspace = lazy(() =>
  import('./pages/Workspace/Workspace').then(({ Workspace }) => ({
    default: Workspace
  }))
)

export default function App({
  initialActivationToken
}: {
  initialActivationToken: string | null
}) {
  const [activationToken, setActivationToken] = useState(initialActivationToken)
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    document.title =
      pathname === '/'
        ? 'Emotions — cada emoção, uma descoberta'
        : pathname === '/login' || pathname === '/child/login'
          ? 'Entrar — Emotions'
          : pathname === '/activate-account'
            ? 'Ativar conta — Emotions'
            : (pathname === '/workspace' || pathname === '/child')
              ? 'Meu espaço — Emotions'
              : 'Página não encontrada — Emotions'

    if (previousPath.current !== pathname) {
      if (pathname !== '/workspace')
        document.getElementById('conteudo')?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/child/login" element={<Login child />} />
      <Route path="/child" element={<ChildSpace />} />
      <Route
        path="/activate-account"
        element={
          <ActivateAccount
            token={activationToken}
            clearToken={() => setActivationToken(null)}
          />
        }
      />
      <Route
        path="/workspace"
        element={
          <Suspense fallback={<output>Carregando seu espaço…</output>}>
            <Workspace />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
