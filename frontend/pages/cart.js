// pages/cart.js
import { useCart } from '../contexts/CartContext'
import Link from 'next/link'

export default function Cart() {
  const { items, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '40px' }}>
          <h2>Your Cart is Empty</h2>
          <p className="text-muted">Add some beautiful handicrafts to your cart</p>
          <Link href="/" className="primary button">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-4">
        <h1>Shopping Cart</h1>
        <button className="outline" onClick={clearCart}>Clear Cart</button>
      </div>

      <div className="cart-items">
        {items.map(item => (
          <div key={item.id} className="cart-item card">
            <div className="cart-item-image">
              {item.image ? (
                <span>{item.image.split('/').pop()}</span>
              ) : (
                <span>{item.name}</span>
              )}
            </div>
            <div className="cart-item-details">
              <h3>{item.name}</h3>
              <p className="text-muted">{item.city}, {item.state}</p>
              <div className="tags">
                {item.tags && item.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            <div className="cart-item-price">₹{item.price}</div>
            <div className="cart-item-quantity">
              <button 
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="quantity-btn"
              >-</button>
              <span>{item.quantity}</span>
              <button 
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="quantity-btn"
              >+</button>
            </div>
            <div className="cart-item-total">₹{item.price * item.quantity}</div>
            <button 
              onClick={() => removeFromCart(item.id)}
              className="remove-btn"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary card">
        <h2>Order Summary</h2>
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>₹{getCartTotal()}</span>
        </div>
        <div className="summary-row">
          <span>Shipping:</span>
          <span>₹{getCartTotal() > 1000 ? 0 : 99}</span>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <span>₹{getCartTotal() + (getCartTotal() > 1000 ? 0 : 99)}</span>
        </div>
        <Link href="/checkout" className="primary button full-width">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  )
}