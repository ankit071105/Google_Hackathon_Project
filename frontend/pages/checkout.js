// pages/checkout.js
import { useState } from 'react'
import { useCart } from '../contexts/CartContext'

export default function Checkout() {
  const { items, getCartTotal, clearCart } = useCart()
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsProcessing(true)
    
    // Simulate payment processing
    setTimeout(() => {
      alert('Order placed successfully!')
      clearCart()
      setIsProcessing(false)
    }, 2000)
  }

  const shipping = getCartTotal() > 1000 ? 0 : 99
  const total = getCartTotal() + shipping

  return (
    <div className="container">
      <h1>Checkout</h1>
      
      <div className="checkout-grid">
        <div className="checkout-form card">
          <h2>Shipping Information</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <h2>Payment Method</h2>
            <div className="payment-methods">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span>Cash on Delivery</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                />
                <span>Online Payment</span>
              </label>
            </div>

            <button 
              type="submit" 
              className="primary button full-width"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Place Order - ₹${total}`}
            </button>
          </form>
        </div>

        <div className="order-summary card">
          <h2>Order Summary</h2>
          {items.map(item => (
            <div key={item.id} className="order-item">
              <div className="order-item-info">
                <h4>{item.name}</h4>
                <p>Qty: {item.quantity}</p>
              </div>
              <div className="order-item-price">₹{item.price * item.quantity}</div>
            </div>
          ))}
          <div className="order-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{getCartTotal()}</span>
            </div>
            <div className="total-row">
              <span>Shipping:</span>
              <span>₹{shipping}</span>
            </div>
            <div className="total-row final">
              <span>Total:</span>
              <span>₹{total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}