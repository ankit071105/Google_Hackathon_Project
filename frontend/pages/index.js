// pages/index.js
import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import Header from '../components/Header'
import CartSidebar from '../components/CartSidebar'
import LocationModal from '../components/LocationModal'
import SimilarProducts from '../components/SimilarProducts'
import { useCart } from '../contexts/CartContext'

export default function Home() {
  const API = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
  const [userId, setUserId] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cityState, setCityState] = useState({ city: '', state: '' })
  const [query, setQuery] = useState('')
  const [chatResp, setChatResp] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [chatOpen, setChatOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [health, setHealth] = useState({ gemini_configured: false, products_count: 0, model: null })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [similarProducts, setSimilarProducts] = useState([])
  const [showSimilarProducts, setShowSimilarProducts] = useState(false)

  const { addToCart } = useCart()

  useEffect(() => {
    // Check if backend is running (+ health details)
    checkBackendStatus()
    
    let uid = localStorage.getItem('ecom_uid')
    if (!uid) { 
      uid = 'user_' + Math.random().toString(36).slice(2, 9); 
      localStorage.setItem('ecom_uid', uid) 
    }
    setUserId(uid)
    
    // Check if we have a saved location preference
    const savedLocation = localStorage.getItem('ecom_location')
    if (savedLocation) {
      const location = JSON.parse(savedLocation)
      setCityState({ city: location.city, state: location.state })
      fetchRecs({ user_id: uid, city: location.city, state: location.state })
    } else {
      // No saved location, try to detect or show modal
      attemptGeolocation(uid)
    }
  }, [])

  async function checkBackendStatus() {
    try {
      const res = await fetch(`${API}/health`)
      if (res.ok) {
        const h = await res.json()
        setBackendStatus('online')
        setHealth(h)
      } else {
        setBackendStatus('offline')
      }
    } catch (err) {
      console.error('Backend health check failed:', err)
      setBackendStatus('offline')
    }
  }

  async function attemptGeolocation(uid) {
    setLoading(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setShowLocationModal(true)
      return
    }
    
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      try {
        const rv = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
        const j = await rv.json()
        const city = (j.address.city || j.address.town || j.address.village || j.address.county || 'Unknown City')
        const state = j.address.state || 'Unknown State'
        
        const location = { city, state, lat, lon }
        setCityState({ city, state })
        localStorage.setItem('ecom_location', JSON.stringify(location))
        localStorage.setItem('ecom_seen', '1')
        await fetchRecs({ user_id: uid, city, state, lat, lon })
      } catch (e) {
        console.warn(e)
        setShowLocationModal(true)
      }
    }, err => {
      console.warn(err)
      setShowLocationModal(true)
    })
  }

  async function fetchRecs(payload) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Server returned ' + res.status)
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch recommendations. Please ensure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSimilarProducts(productId) {
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ similar_to: productId })
      })
      if (!res.ok) throw new Error('Server returned ' + res.status)
      const data = await res.json()
      setSimilarProducts(data.products || [])
      setShowSimilarProducts(true)
    } catch (err) {
      console.error('Failed to fetch similar products:', err)
    }
  }

  async function clickProduct(p) {
    try {
      await fetch(`${API}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, product_id: p.id })
      })
      // Refresh recs in the background (no blocking)
      fetchRecs({ user_id: userId })
      // Open modal
      setSelectedProduct(p)
      // Fetch similar products
      fetchSimilarProducts(p.id)
    } catch (e) {
      console.error(e)
      setError('Failed to record click.')
    }
  }

  async function askChat(q) {
    if (!q.trim()) return
    setChatLoading(true)
    setChatResp('...')
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q })
      })
      const data = await res.json()
      setChatResp(data.response || '(no response)')
    } catch (e) {
      console.error(e)
      setChatResp('Welcome to ArtCrafts! I\'m your virtual assistant. I can help you explore our collection of authentic Indian handicrafts. Please set up a Gemini API key for full functionality.')
    } finally {
      setChatLoading(false)
    }
  }

  // FIXED: This function was missing - causing the "onSave is not a function" error
  const handleLocationChange = (newLocation) => {
    setCityState({ city: newLocation.city, state: newLocation.state })
    localStorage.setItem('ecom_location', JSON.stringify(newLocation))
    fetchRecs({ user_id: userId, city: newLocation.city, state: newLocation.state })
    setShowLocationModal(false)
  }

  // Helper for asking about the selected product
  function askAboutSelected() {
    if (!selectedProduct) return
    const q = `Tell me about "${selectedProduct.name}". City: ${selectedProduct.city}, State: ${selectedProduct.state}. Tags: ${selectedProduct.tags?.join(', ') || 'none'}.`
    setChatOpen(true)
    askChat(q)
  }

  return (
    <div className="container">
      <Header 
        backendStatus={backendStatus} 
        health={health} 
        setChatOpen={setChatOpen} 
        chatOpen={chatOpen} 
      />

      {/* Location indicator and change button */}
      <div className="location-indicator">
        <span className="text-muted">Showing products from: </span>
        <strong>{cityState.city ? `${cityState.city}, ${cityState.state}` : 'Unknown location'}</strong>
        <button 
          className="outline text-sm" 
          onClick={() => setShowLocationModal(true)}
          style={{ marginLeft: '12px', padding: '4px 8px' }}
        >
          Change Location
        </button>
      </div>

      {/* Gemini status hint */}
      {backendStatus === 'online' && !health.gemini_configured && (
        <div className="error-message">
          <strong>AI not configured:</strong> Set <code>GEMINI_API_KEY</code> on the backend to enable live chat.
        </div>
      )}

      {backendStatus === 'offline' && (
        <div className="error-message">
          <strong>Backend Connection Issue</strong>
          <p>We can't connect to the recommendation server. Please ensure:</p>
          <ul>
            <li>The backend server is running on {API}</li>
            <li>You've installed Python dependencies: <code>pip install fastapi uvicorn sqlite3 scikit-learn requests google-generativeai</code></li>
            <li>You've started the server: <code>uvicorn server:app --reload</code></li>
          </ul>
        </div>
      )}

      <div className="main-content">
        <div className="search-section">
          <h2 className="mt-0">
            Discover Handicrafts {cityState.city ? `from ${cityState.city}` : ''}
          </h2>
          <div className="search-container">
            <input 
              placeholder="Search products or tags..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchRecs({ user_id: userId, q: query })}
            />
            <button 
              className="primary" 
              onClick={() => fetchRecs({ user_id: userId, q: query })}
            >
              Search
            </button>
          </div>
        </div>

        <div className="card product-section" style={{ minHeight: 400 }}>
          {loading && (
            <div className="text-center" style={{ padding: 40 }}>
              <div className="loading" style={{ margin: '0 auto 16px' }}></div>
              <div className="text-muted">Loading recommendations...</div>
            </div>
          )}
          
          {!loading && error && (
            <div className="text-center" style={{ padding: 40, color: 'var(--error)' }}>
              {error}
            </div>
          )}
          
          {!loading && products.length === 0 && !error && (
            <div className="text-center" style={{ padding: 40 }}>
              <div className="text-muted">No recommendations available.</div>
              <button 
                className="primary mt-1" 
                onClick={() => fetchRecs({ user_id: userId })}
              >
                Try Again
              </button>
            </div>
          )}
          
          {!loading && products.length > 0 && (
            <div className="product-grid">
              {products.map(p => (
                <ProductCard 
                  key={p.id} 
                  p={p} 
                  onClick={clickProduct} 
                  onAsk={askChat} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Similar Products Section */}
      {showSimilarProducts && similarProducts.length > 0 && (
        <SimilarProducts 
          products={similarProducts}
          onProductClick={clickProduct}
          onClose={() => setShowSimilarProducts(false)}
        />
      )}

      {/* Floating Chat Button */}
      <button 
        className={`floating-chat-btn ${chatOpen ? 'active' : ''}`}
        onClick={() => setChatOpen(!chatOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Floating Cart Button */}
      <button 
        className="floating-cart-btn"
        onClick={() => setCartOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </button>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Chat Modal */}
      <div className={`chat-modal ${chatOpen ? 'open' : ''}`}>
        <div className="chat-modal-content">
          <div className="chat-header">
            <div className="chat-title">
              <div className="chat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3 className="mt-0">Craft Assistant</h3>
            </div>
            <button className="close-chat" onClick={() => setChatOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="chat-response">
            {chatResp || (
              <div className="welcome-message">
                <p>Hi! I'm your craft assistant. I can help you with:</p>
                <ul>
                  <li>Information about specific products</li>
                  <li>Craft techniques and materials</li>
                  <li>Product recommendations</li>
                  <li>Cultural significance of handicrafts</li>
                </ul>
                <p>Try asking: "Tell me about Pashmina shawls" or "What makes Madhubani painting special?"</p>
              </div>
            )}
          </div>
          
          <div className="chat-input-container">
            <input 
              id="chatq" 
              placeholder="Ask about Pashmina, Woodwork, Pottery..." 
              onKeyDown={e => e.key === 'Enter' && askChat(document.getElementById('chatq').value)}
            />
            <button 
              className="primary" 
              onClick={() => askChat(document.getElementById('chatq').value)}
              disabled={chatLoading}
            >
              {chatLoading ? <div className="loading"></div> : 'Ask'}
            </button>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
   <LocationModal 
  currentLocation={cityState}
  // FIXED: Now properly passing the function
  onSave={handleLocationChange}  
  onClose={() => setShowLocationModal(false)}
/>

      )}

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProduct.name}</h2>
              <button className="close-modal" onClick={() => setSelectedProduct(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="product-image-large">
                {selectedProduct.image ? (selectedProduct.image.split('/').pop()) : selectedProduct.name}
              </div>
              <div className="product-details">
                <div className="text-muted">{selectedProduct.city}, {selectedProduct.state}</div>
                <div className="tags">
                  {(selectedProduct.tags || []).map((t, i) => (
                    <span key={i} className="tag">{t}</span>
                  ))}
                </div>
                <div className="price-large">₹{selectedProduct.price}</div>
                <div className="description">{selectedProduct.description}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="outline" onClick={() => setSelectedProduct(null)}>Close</button>
              <button className="primary" onClick={() => addToCart(selectedProduct)}>
                Add to Cart
              </button>
              <button className="accent" onClick={askAboutSelected}>Ask about this product</button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>About ArtCrafts</h3>
              <p>We bring you authentic Indian handicrafts directly from artisans across the country, preserving traditional crafts while supporting local communities.</p>
            </div>
            
            <div className="footer-section">
              <h3>Quick Links</h3>
              <p>All Products</p>
              <p>Artisan Stories</p>
              <p>Shipping & Returns</p>
              <p>Privacy Policy</p>
            </div>
            
            <div className="footer-section">
              <h3>Contact Us</h3>
              <p>Email: support@artcrafts.in</p>
              <p>Phone: +91 9031358194</p>
              <p>Address: 123 Craft Street, Bhubanswer, India</p>
            </div>
            
            <div className="footer-section">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <span className="social-icon">Instagram</span>
                <span className="social-icon">Facebook</span>
                <span className="social-icon">Pinterest</span>
                <span className="social-icon">YouTube</span>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© 2023 ArtCrafts. All rights reserved. Celebrating India's rich handicraft heritage.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}