// components/Header.js
import Link from 'next/link'
import { useCart } from '../contexts/CartContext'

export default function Header({ backendStatus, health, setChatOpen, chatOpen }) {
  const { getCartItemsCount } = useCart()

  return (
    <header className="header">
      <div>
        <Link href="/" className="brand">ArtCrafts — Indian Handicrafts</Link>
        <div className="text-muted text-sm">
          Personalized, location-aware recommendations
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`status-indicator ${backendStatus === 'online' ? 'online' : 'offline'}`}>
          {backendStatus === 'online' ? 'Backend Online' : 'Backend Offline'}
        </div>
        <button 
          className="chat-toggle" 
          onClick={() => setChatOpen(!chatOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Craft Assistant
        </button>
        <Link href="/cart" className="cart-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {getCartItemsCount() > 0 && (
            <span className="cart-badge">{getCartItemsCount()}</span>
          )}
        </Link>
        <button 
          className="outline" 
          onClick={() => { localStorage.clear(); location.reload() }}
        >
          Reset demo
        </button>
      </div>
    </header>
  )
}