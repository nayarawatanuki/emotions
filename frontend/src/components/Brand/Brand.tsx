import { Link } from 'react-router'
import './Brand.css'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Emotions — página inicial">
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="15" fill="currentColor" />
        <path d="M14 28c3 7 17 7 20 0" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="17" cy="19" r="2" fill="white" />
        <circle cx="31" cy="19" r="2" fill="white" />
      </svg>
      <span>emotions<span className="brand-dot">.</span></span>
    </Link>
  )
}
