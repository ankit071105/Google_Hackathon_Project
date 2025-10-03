// components/SimilarProducts.js
import ProductCard from './ProductCard'

export default function SimilarProducts({ products, onProductClick, onClose }) {
  return (
    <div className="similar-products-section">
      <div className="similar-products-header">
        <h3>Similar Products You Might Like</h3>
        <button className="close-similar" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="similar-products-grid">
        {products.map(p => (
          <ProductCard 
            key={p.id} 
            p={p} 
            onClick={onProductClick}
            compact={true}
          />
        ))}
      </div>
    </div>
  )
}