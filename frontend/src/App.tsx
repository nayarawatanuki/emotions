import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Home } from './pages/Home/Home'
import { Login } from './pages/Login/Login'
import { ActivateAccount } from './pages/ActivateAccount/ActivateAccount'
import { Workspace } from './pages/Workspace/Workspace'
import { NotFound } from './pages/NotFound/NotFound'

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
        : pathname === '/login'
          ? 'Entrar — Emotions'
          : pathname === '/activate-account'
            ? 'Ativar conta — Emotions'
            : pathname === '/workspace'
              ? 'Meu espaço — Emotions'
              : 'Página não encontrada — Emotions'

    if (previousPath.current !== pathname) {
      document.getElementById('conteudo')?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/activate-account"
        element={
          <ActivateAccount
            token={activationToken}
            clearToken={() => setActivationToken(null)}
          />
        }
      />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
