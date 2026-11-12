import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { takeActivationToken } from './features/auth/activation-token'

const initialActivationToken = takeActivationToken(
  window.location,
  window.history
)

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App initialActivationToken={initialActivationToken} />
    </BrowserRouter>
  </StrictMode>
)
