import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Home } from './pages/Home/Home'
import { NotFound } from './pages/NotFound/NotFound'

export default function App() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    document.title = pathname === '/'
      ? 'Emotions — cada emoção, uma descoberta'
      : 'Página não encontrada — Emotions'

    if (previousPath.current !== pathname) {
      document.getElementById('conteudo')?.focus()
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
