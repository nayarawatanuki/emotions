import { Link } from 'react-router'
import { Brand } from '../../components/Brand/Brand'
import './NotFound.css'

export function NotFound() {
  return (
    <div className="not-found">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="site-header content-width">
        <Brand />
      </header>
      <main className="not-found-content content-width" id="conteudo" tabIndex={-1}>
        <p className="eyebrow">Página não encontrada</p>
        <h1>Vamos voltar ao começo?</h1>
        <p>Não encontramos a página que você procurou. Você pode continuar pela página inicial.</p>
        <Link className="primary-link" to="/">Voltar para o início</Link>
      </main>
    </div>
  )
}
