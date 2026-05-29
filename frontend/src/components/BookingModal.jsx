import React, { useState } from 'react';
import { Calendar, Clock, X, CheckCircle, Zap } from 'lucide-react';
import { api } from '../utils/api';

export default function BookingModal({ station, onClose, onBookingSuccess }) {
  const getConnectorDynamicPrice = (connector) => {
    if (!connector) return 0;
    const isSurgeEnabled = localStorage.getItem('dynamic_grid_surge_enabled') === 'true';
    const basePrice = connector.price;
    if (!isSurgeEnabled) return basePrice;
    
    if (station.gridStatus?.includes('Peak')) {
      return basePrice * 1.25;
    } else if (station.gridStatus?.includes('Solar')) {
      return basePrice * 0.85;
    }
    return basePrice;
  };

  const [selectedConnector, setSelectedConnector] = useState(station.connectors[0]?.type || '');
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const slots = [
    '08:00 AM - 09:00 AM',
    '10:00 AM - 11:00 AM',
    '01:00 PM - 02:00 PM',
    '03:00 PM - 04:00 PM',
    '06:00 PM - 07:00 PM',
    '08:00 PM - 09:00 PM'
  ];

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedConnector) return;
    
    setLoading(true);
    setError(null);
    try {
      const booking = await api.createBooking(station.id, selectedConnector, timeSlot);
      setBookingDetails(booking);
      setIsSuccess(true);
      setTimeout(() => {
        onBookingSuccess(booking);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeConnectorDetails = station.connectors.find(c => c.type === selectedConnector);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '30px',
        position: 'relative',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Close Button */}
        {!isSuccess && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0,0,0,0.03)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            className="hover-scale"
          >
            <X size={18} />
          </button>
        )}

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 230, 118, 0.1)',
              border: '2px solid var(--color-primary)',
              color: 'var(--color-primary)',
              marginBottom: '20px',
              animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Reservation Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Your slot at <strong>{station.name}</strong> is reserved.
            </p>
            
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              fontSize: '13px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connector</span>
                <span style={{ fontWeight: '600' }}>{bookingDetails?.connectorType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Time Slot</span>
                <span style={{ fontWeight: '600', color: 'var(--color-secondary)' }}>{bookingDetails?.timeSlot}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Rate</span>
                <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                  ₹{bookingDetails ? getConnectorDynamicPrice(station.connectors.find(c => c.type === bookingDetails.connectorType)).toFixed(2) : '15.00'}/kWh
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBooking}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={20} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                Reserve Charger
              </span>
            </div>
            
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', lineHeight: 1.2 }}>{station.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>{station.address}</p>

            {error && (
              <div style={{
                backgroundColor: 'rgba(255, 23, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-primary)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            {/* Step 1: Select Connector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Connector
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {station.connectors.map((c) => (
                  <div 
                    key={c.type}
                    onClick={() => c.status !== 'Offline' && setSelectedConnector(c.type)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: selectedConnector === c.type ? 'var(--color-primary)' : 'var(--border-color)',
                      backgroundColor: selectedConnector === c.type ? 'rgba(0, 180, 216, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                      cursor: c.status === 'Offline' ? 'not-allowed' : 'pointer',
                      opacity: c.status === 'Offline' ? 0.4 : 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{c.type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Power: {c.power} kW • Rate: ₹{getConnectorDynamicPrice(c).toFixed(2)}/kWh
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: c.status === 'Available' ? 'rgba(0, 180, 216, 0.15)' : c.status === 'In Use' ? 'rgba(255, 145, 0, 0.15)' : 'rgba(0,0,0,0.05)',
                      color: c.status === 'Available' ? 'var(--color-primary)' : c.status === 'In Use' ? 'var(--color-secondary)' : 'var(--text-secondary)'
                    }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Select Time Slot */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Time Slot
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {slots.map((slot) => (
                  <div 
                    key={slot}
                    onClick={() => setTimeSlot(slot)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: timeSlot === slot ? 'var(--color-secondary)' : 'var(--border-color)',
                      backgroundColor: timeSlot === slot ? 'rgba(255, 145, 0, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      textAlign: 'center',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Cost Summary */}
            {activeConnectorDetails && (
              <div style={{
                backgroundColor: 'rgba(0, 180, 216, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '24px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Power output speed</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{activeConnectorDetails.power} kW (Max)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Booking charge</span>
                  <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Free reservation</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading || !selectedConnector}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading || !selectedConnector ? 'not-allowed' : 'pointer',
                opacity: loading || !selectedConnector ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              className="glow-button"
            >
              {loading ? 'Reserving...' : 'Confirm Reservation'}
            </button>
          </form>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
}
