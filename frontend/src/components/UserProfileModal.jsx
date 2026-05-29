import React, { useState } from 'react';
import { X, User, Phone, Mail, Lock, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';

export default function UserProfileModal({ currentUser, onClose, addToast }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentUser.email, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (addToast) {
        addToast('Security Status Updated', 'Your password has been changed successfully.', 'success');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password. Please check your credentials.');
      if (addToast) {
        addToast('Security Update Failed', err.message || 'Incorrect current password.', 'warning');
      }
    } finally {
      setLoading(false);
    }
  };

  const accentColor = currentUser.role === 'driver' ? 'var(--color-primary)' : 'var(--color-secondary)';
  const glowShadow = currentUser.role === 'driver' ? 'var(--color-primary-glow)' : 'var(--color-secondary-glow)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass-panel" 
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '30px',
            position: 'relative',
            borderColor: accentColor,
            boxShadow: `0 8px 32px 0 ${glowShadow}`
          }}
        >
          
          {/* Close Button */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${accentColor}, var(--color-accent))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: `0 0 10px ${accentColor}`
            }}>
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>User Profile</h2>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
                {currentUser.role === 'driver' ? 'EV Driver Account' : 'Grid Operator Account'}
              </span>
            </div>
          </div>

          {/* User Details Grid */}
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {/* Username */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={14} style={{ color: accentColor }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Name</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>{currentUser.username}</span>
              </div>
            </div>

            {/* Mobile Number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Phone size={14} style={{ color: accentColor }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Registered Mobile Number</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>{currentUser.phone || '+91 9876543210'}</span>
              </div>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={14} style={{ color: accentColor }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Email Address</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>{currentUser.email}</span>
              </div>
            </div>
          </div>

          {/* Password Reset Section */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Change Account Password
            </h3>

            {error && (
              <div style={{
                backgroundColor: 'rgba(255, 23, 68, 0.08)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-primary)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldAlert size={14} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                backgroundColor: 'rgba(0, 230, 118, 0.08)',
                border: '1px solid var(--color-primary)',
                color: '#00c853',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>Password updated successfully!</span>
              </div>
            )}

            {/* Current Password */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                required
              />
            </div>

            {/* New Password */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                required
              />
            </div>

            {/* Confirm New Password */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '36px', fontSize: '12px' }}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="glow-button"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, var(--color-accent))`,
                boxShadow: `0 4px 15px ${glowShadow}`,
                padding: '12px',
                fontSize: '12px',
                marginTop: '6px'
              }}
            >
              {loading ? 'Saving Changes...' : 'Save New Password'}
            </button>
          </form>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
