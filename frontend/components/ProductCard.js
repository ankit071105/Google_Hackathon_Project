// components/ProductCard.js
import { useCart } from '../contexts/CartContext'

export default function ProductCard({ p, onClick, onAsk, compact = false }) {
  const { addToCart } = useCart()

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart(p)
  }

  return (
    <div className={`product card ${compact ? 'compact' : ''}`} style={{ 
      margin: 0, 
      padding: 0, 
      width: '100%', 
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer'
    }} onClick={() => onClick(p)}>
      <div className="img" style={{ height: compact ? '120px' : '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f3e8ff, #fef3c7)' }}>
        {p.image ? (
          <span style={{ padding: '10px', textAlign: 'center', fontSize: compact ? '12px' : '14px' }}>
            {p.image.split('/').pop()}
          </span>
        ) : (
          <span style={{ padding: '10px', textAlign: 'center', fontSize: compact ? '12px' : '14px' }}>
            {p.name}
          </span>
        )}
      </div>
      <div className="body" style={{ padding: compact ? '12px' : '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '12px' }}>
        <h4 style={{ margin: 0, marginBottom: compact ? '4px' : '8px', fontSize: compact ? '14px' : '18px', lineHeight: '1.4' }}>{p.name}</h4>
        <div className="text-muted text-sm" style={{ marginBottom: compact ? '8px' : '12px', fontSize: compact ? '12px' : '14px' }}>
          {p.city}, {p.state}
        </div>
        
        <div className="tags" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: compact ? '4px 0' : '8px 0' }}>
          {p.tags && p.tags.slice(0, 3).map((t, i) => (
            <div key={i} className="tag" style={{ 
              background: '#f3e8ff', 
              padding: compact ? '3px 8px' : '4px 10px', 
              borderRadius: '999px', 
              fontSize: compact ? '10px' : '11px', 
              color: 'var(--primary)', 
              fontWeight: '500' 
            }}>
              {t}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center" style={{ 
          marginTop: 'auto', 
          paddingTop: compact ? '12px' : '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="price" style={{ color: 'var(--accent)', fontWeight: '700', fontSize: compact ? '16px' : '20px' }}>
            ₹{p.price}
          </div>
          <div className="flex gap-2" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!compact && (
              <button 
                className="outline" 
                onClick={(e) => {
                  e.stopPropagation()
                  onAsk && onAsk(`Tell me about ${p.name}`)
                }}
                style={{ 
                  padding: '8px 12px', 
                  fontSize: '13px', 
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  minWidth: '70px'
                }}
              >
                Ask
              </button>
            )}
            <button 
              className="primary" 
              onClick={handleAddToCart}
              style={{ 
                padding: compact ? '6px 10px' : '8px 12px', 
                fontSize: compact ? '12px' : '13px', 
                background: 'var(--primary)',
                color: 'white',
                border: '1px solid var(--primary)',
                borderRadius: '6px',
                cursor: 'pointer',
                minWidth: compact ? '60px' : '70px'
              }}
            >
              {compact ? 'Add' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}