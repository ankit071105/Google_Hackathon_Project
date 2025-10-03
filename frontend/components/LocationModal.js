// components/LocationModal.js
import { useState } from 'react'

export default function LocationModal({ currentLocation, onSave, onClose }) {
  const [location, setLocation] = useState(currentLocation)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    setLocation({
      ...location,
      [e.target.name]: e.target.value
    })
  }

  const handleUseCurrentLocation = async () => {
    setLoading(true)
    setUseCurrentLocation(true)
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        )
        const data = await response.json()
        
        const city = data.address.city || data.address.town || data.address.village || data.address.county || ''
        const state = data.address.state || ''
        
        setLocation({ city, state })
        setLoading(false)
      } catch (error) {
        console.error('Error getting location:', error)
        alert('Failed to get your location. Please enter it manually.')
        setLoading(false)
      }
    }, (error) => {
      console.error('Geolocation error:', error)
      alert('Unable to get your location. Please enter it manually.')
      setLoading(false)
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (location.city && location.state) {
      onSave(location)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Set Your Location</h2>
          <button className="close-modal" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="option-button" onClick={handleUseCurrentLocation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {loading ? 'Detecting your location...' : 'Use My Current Location'}
          </div>
          
          <div className="divider">
            <span>or enter manually</span>
          </div>
          
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={location.city}
              onChange={handleInputChange}
              placeholder="Enter your city"
              required
            />
          </div>
          
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={location.state}
              onChange={handleInputChange}
              placeholder="Enter your state"
              required
            />
          </div>
          
          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save Location
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}