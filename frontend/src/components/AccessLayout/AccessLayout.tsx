import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Brand } from '../Brand/Brand'
import './AccessLayout.css'

export function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="access-page">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header content-width">
        <Brand />
        <Link className="access-home-link" to="/">
          Voltar ao início
        </Link>
      </header>
      <main id="conteudo" tabIndex={-1} className="access-main content-width">
        <aside className="access-intro" aria-label="Nossa proposta">
          <div className="access-pieces" aria-hidden="true">
            <span>✦</span>
            <span>☺</span>
            <span>♡</span>
            <span>✳</span>
          </div>
          <p className="eyebrow">Conexões que acolhem</p>
          <p className="access-tagline">
            Um espaço para
            <br />
            cada descoberta.
          </p>
          <p>
            Cuidar de cada percurso começa com presença, respeito e acolhimento.
          </p>
        </aside>
        <section className="access-card">{children}</section>
      </main>
      <footer className="access-footer content-width">
        Emotions · Cada percurso tem seu próprio ritmo.
      </footer>
    </div>
  )
}
