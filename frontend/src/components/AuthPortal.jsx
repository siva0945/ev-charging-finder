import React, { useState } from 'react';
import { Car, ShieldAlert, ArrowLeft, Mail, Lock, User, Zap, AlertCircle, Phone } from 'lucide-react';
import { api } from '../utils/api';

export default function AuthPortal({ onAuthSuccess }) {
  const [selectedRole, setSelectedRole] = useState(null); // 'driver', 'retailer', or null
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError(null);
    setIsSignUp(false);
  };

  const handleBackToGate = () => {
    setSelectedRole(null);
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setPhone('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Validation
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (!phone.trim()) {
          throw new Error("Mobile number is required.");
        }

        // Register user
        const result = await api.register(username, email, password, selectedRole, phone);
        
        // Auto login on success
        const session = await api.login(email, password, selectedRole);
        onAuthSuccess(session);
      } else {
        // Login user
        const session = await api.login(email, password, selectedRole);
        onAuthSuccess(session);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = selectedRole === 'driver' ? 'var(--color-primary)' : 'var(--color-secondary)';
  const glowShadow = selectedRole === 'driver' ? 'var(--color-primary-glow)' : 'var(--color-secondary-glow)';

  return (
    <div className="auth-page-container">
      {/* Visual logo header overlay */}
      <div style={{
        position: 'absolute',
        top: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 50
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #ff6f00, #ff9100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(255, 111, 0, 0.35)'
        }}>
          <Zap size={18} fill="#ffffff" stroke="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1, letterSpacing: '0.1em' }}>SUP CHARGED</h1>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>Smart Grid Hub</span>
        </div>
      </div>

      {selectedRole === null ? (
        /* Gateway Gate Selector Screen */
        <div className="glass-panel auth-gate-card">
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Identity Portal Gateway</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '32px' }}>
            Choose your profile gateway to access the smart grid network
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            
            {/* Driver Role Card selection */}
            <div 
              onClick={() => handleRoleSelect('driver')}
              className="auth-role-card driver"
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 180, 216, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)'
              }}>
                <Car size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '2px', color: 'var(--text-primary)' }}>Driver Access Portal</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  Locate chargers, reserve time slots, and pay session fees.
                </p>
              </div>
            </div>

            {/* Operator Role Card selection */}
            <div 
              onClick={() => handleRoleSelect('retailer')}
              className="auth-role-card operator"
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 145, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-secondary)'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '2px', color: 'var(--text-primary)' }}>Operator Access Portal</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  Edit pricing structures, grid load indices, and connector grids.
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Sign In / Sign Up Form Screen */
        <div className="glass-panel auth-gate-card" style={{
          borderColor: accentColor,
          boxShadow: `0 8px 32px 0 ${glowShadow}`
        }}>
          
          {/* Back button */}
          <button 
            onClick={handleBackToGate}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            className="hover-scale"
          >
            <ArrowLeft size={14} />
          </button>

          <span style={{
            fontSize: '9px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: selectedRole === 'driver' ? 'rgba(0, 180, 216, 0.15)' : 'rgba(255, 145, 0, 0.15)',
            color: accentColor,
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            {selectedRole === 'driver' ? 'Driver Portal' : 'Operator Portal'}
          </span>

          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>
            {isSignUp ? 'Create Smart Account' : 'Gateway Verification'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '24px' }}>
            {isSignUp ? 'Register profile to connect to network grids' : 'Sign in to access maps and grids'}
          </p>

          {error && (
            <div style={{
              backgroundColor: 'rgba(255, 0, 85, 0.08)',
              border: '1px solid var(--color-danger)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px',
              marginBottom: '16px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              textAlign: 'left'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, color: 'var(--color-danger)' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Username field (only on Sign Up) */}
            {isSignUp && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  placeholder={selectedRole === 'driver' ? 'Username' : 'Operator / Brand Name'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                  required
                />
              </div>
            )}

            {/* Phone field (only on Sign Up) */}
            {isSignUp && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="tel"
                  placeholder="Registered Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                  required
                />
              </div>
            )}

            {/* Email field */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                required
              />
            </div>

            {/* Password field */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                required
              />
            </div>

            {/* Password confirmation (only on Sign Up) */}
            {isSignUp && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                  required
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="glow-button"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, var(--color-accent))`,
                boxShadow: `0 4px 15px ${glowShadow}`,
                padding: '12px',
                fontSize: '12px',
                marginTop: '10px'
              }}
            >
              {loading ? 'Verifying...' : isSignUp ? 'Create Credentials' : 'Access Hub'}
            </button>
          </form>

          {/* Toggle login vs register link */}
          <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {isSignUp ? (
              <span>
                Already registered?{' '}
                <span 
                  onClick={() => setIsSignUp(false)}
                  style={{ color: accentColor, cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}
                >
                  Sign In
                </span>
              </span>
            ) : (
              <span>
                First time using Sup Charged?{' '}
                <span 
                  onClick={() => setIsSignUp(true)}
                  style={{ color: accentColor, cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}
                >
                  Create Account
                </span>
              </span>
            )}
          </div>

          {/* Helper details for easy testing */}
          <div style={{
            marginTop: '24px',
            padding: '10px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border-color)',
            fontSize: '10px',
            textAlign: 'left'
          }}>
            <span style={{ fontWeight: '800', color: accentColor, display: 'block', marginBottom: '3px' }}>Quick Test Login:</span>
            {selectedRole === 'driver' ? (
              <span>Email: <strong>driver@sup.in</strong> | Password: <strong>password</strong></span>
            ) : (
              <span>Email: <strong>operator@sup.in</strong> | Password: <strong>password</strong></span>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
