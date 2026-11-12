import { Link } from 'react-router'
import { Brand } from '../../components/Brand/Brand'
import './Home.css'

function EmotionIllustration() {
  return (
    <svg className="emotion-illustration" viewBox="0 0 480 430" aria-hidden="true">
      <circle cx="245" cy="210" r="173" fill="#e7f2ed" />
      <path d="M65 115h70c-12-35 39-35 27 0h69v66c35-12 35 39 0 27v69h-66c12 35-39 35-27 0H65v-66c35 12 35-39 0-27z" fill="#f4c66c" stroke="#fffaf2" strokeWidth="7" strokeLinejoin="round" />
      <path d="M231 115h66c-12-35 39-35 27 0h69v69c-35-12-35 39 0 27v66h-69c12-35-39-35-27 0h-66v-69c35 12 35-39 0-27z" fill="#a8c8e7" stroke="#fffaf2" strokeWidth="7" strokeLinejoin="round" />
      <path d="M65 277h73c-12 35 39 35 27 0h66v66c-35-12-35 39 0 27v31H65z" fill="#edac9b" stroke="#fffaf2" strokeWidth="7" strokeLinejoin="round" />
      <path d="M231 277h66c-12-35 39-35 27 0h69v124H231v-31c-35 12-35-39 0-27z" fill="#add1bd" stroke="#fffaf2" strokeWidth="7" strokeLinejoin="round" />
      <g fill="#273e43">
        <circle cx="120" cy="173" r="5" /><circle cx="166" cy="173" r="5" />
        <circle cx="289" cy="173" r="5" /><circle cx="335" cy="173" r="5" />
        <circle cx="120" cy="335" r="5" /><circle cx="166" cy="335" r="5" />
        <circle cx="289" cy="335" r="5" /><circle cx="335" cy="335" r="5" />
      </g>
      <g fill="none" stroke="#273e43" strokeWidth="4" strokeLinecap="round">
        <path d="M127 193q16 19 32 0" /><path d="M298 202q14-13 28 0" />
        <path d="M128 354h30" /><path d="M296 354q16 15 32 0" />
      </g>
      <circle cx="400" cy="87" r="11" fill="#edac9b" />
      <path d="M385 44v18m-9-9h18" stroke="#b98a3a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Home() {
  return (
    <div className="home">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="site-header content-width">
        <Brand />
        <Link className="text-link" to="/login">Entrar <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="conteudo" tabIndex={-1}>
        <section className="hero content-width" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="small-dot" aria-hidden="true" /> Um espaço para descobrir e sentir</p>
            <h1 id="welcome-title">Cada emoção,<br />uma <span>descoberta.</span></h1>
            <p className="hero-description">Reconhecer, expressar e conversar sobre o que sentimos. Um passo de cada vez, no ritmo de cada criança.</p>
            <a className="primary-link" href="#sobre">Conheça o Emotions <span aria-hidden="true">↓</span></a>
            <p className="hero-note">Conexões que começam com acolhimento.</p>
          </div>
          <div className="hero-art">
            <EmotionIllustration />
            <p className="illustration-caption">Diferentes emoções. Muitas formas de sentir.</p>
          </div>
        </section>
        <section className="about-section" id="sobre" aria-labelledby="about-title">
          <div className="content-width">
            <div className="section-heading">
              <p className="eyebrow">Aprender com acolhimento</p>
              <h2 id="about-title">Um encontro entre brincar e compreender.</h2>
              <p>O Emotions apoia atividades sobre emoções com crianças com transtorno do espectro autista (TEA), sob a orientação de profissionais de psicologia e psiquiatria.</p>
            </div>
            <div className="audience-grid">
              <article className="audience-card">
                <span className="card-symbol child-symbol" aria-hidden="true">✦</span>
                <div>
                  <h3>Para cada criança</h3>
                  <p>Atividades para explorar imagens, palavras e emoções, com a mediação de um profissional e respeito às necessidades individuais.</p>
                </div>
              </article>
              <article className="audience-card">
                <span className="card-symbol professional-symbol" aria-hidden="true">✳</span>
                <div>
                  <h3>Para quem acompanha</h3>
                  <p>Um espaço para profissionais organizarem atividades e acompanharem os registros das respostas de cada criança.</p>
                </div>
              </article>
            </div>
            <p className="care-note">Uma ferramenta de apoio às atividades. Cada percurso é acompanhado pelo profissional responsável.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer content-width">
        <p>Emotions</p>
        <p>Cada criança tem seu próprio jeito de descobrir o mundo.</p>
      </footer>
    </div>
  )
}
