import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Zap, Battery, Thermometer, Sparkles, Clock, Compass, IndianRupee } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';

export default function ChargingSimulator({ activeBooking, onSimulationEnd, addToast, walletBalance, selectedVehicle, savedRfids }) {
  const [soc, setSoc] = useState(35); // Start at 35% state of charge
  const [targetSOC, setTargetSOC] = useState(80);
  const [charging, setCharging] = useState(false);
  const [energyDelivered, setEnergyDelivered] = useState(0.0);
  const [cost, setCost] = useState(0.0);
  const [temp, setTemp] = useState(26);
  const [voltage, setVoltage] = useState(0);
  const [amperage, setAmperage] = useState(0);
  const [status, setStatus] = useState('Setup'); // 'Setup', 'Charging', 'Completed', 'Terminated'
  
  const [prepaidAmount, setPrepaidAmount] = useState(0.0);
  const [setupPaying, setSetupPaying] = useState(false);
  const [setupError, setSetupError] = useState('');

  const intervalRef = useRef(null);
  const latestStates = useRef({ soc, energyDelivered, cost });

  const basePower = activeBooking?.powerKwh || 150;
  const power = selectedVehicle ? Math.min(basePower, selectedVehicle.maxSpeed) : basePower;
  const priceRate = activeBooking?.priceRate || 18.00;

  const BATTERY_CAPACITY_KWH = selectedVehicle ? selectedVehicle.battery : 75;
  
  const remainingEnergyNeeded = (BATTERY_CAPACITY_KWH * (targetSOC - Math.max(soc, 35))) / 100;
  const estimatedCost = Math.max(0, remainingEnergyNeeded * priceRate);
  const timeToChargeMinutes = Math.max(0, Math.ceil((remainingEnergyNeeded / power) * 60));

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (soc / 100) * circumference;

  useEffect(() => {
    latestStates.current = { soc, energyDelivered, cost };
  }, [soc, energyDelivered, cost]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePayAndStart = async () => {
    if (estimatedCost <= 0) return;
    setSetupPaying(true);
    setSetupError('');
    try {
      const payResult = await api.payWallet(estimatedCost);
      if (payResult.success) {
        addToast('Payment Successful', `Prepaid ₹${estimatedCost.toFixed(2)} for ${targetSOC}% target.`, 'success');
        setPrepaidAmount(estimatedCost);
        
        try {
          await api.updateBooking(activeBooking.id, { 
            targetSOC, 
            prepaidAmount: estimatedCost,
            status: 'Charging',
            pluggedInAt: new Date().toISOString()
          });
        } catch (e) { console.error('Booking sync failed', e); }

        setStatus('Charging');
        startCharging();
      } else {
        setSetupError('Insufficient Wallet Balance. Please top up.');
      }
    } catch (err) {
      setSetupError(err.message || 'Payment failed.');
    } finally {
      setSetupPaying(false);
    }
  };

  const startCharging = async () => {
    if (charging) return;
    setCharging(true);
    setVoltage(power > 120 ? 800 : 400);
    setAmperage(Math.round((power * 1000) / (power > 120 ? 800 : 400)));

    addToast('Vehicle Plugged In', `Charging started at ${activeBooking.stationName}.`, 'info');

    try {
      await api.updateConnectorStatus(activeBooking.stationId, activeBooking.connectorType, 'In Use');
    } catch (err) {}

    intervalRef.current = setInterval(() => {
      setSoc((prevSoc) => {
        const increment = Math.max(0.1, Math.round((power / 80) * 10) / 10);
        const nextSoc = Math.min(100, parseFloat((prevSoc + increment).toFixed(1)));
        
        if (nextSoc >= targetSOC) {
          handleAutoStop(nextSoc);
          return nextSoc;
        }

        const kwhPerMinute = power / 60;
        setEnergyDelivered((prevEnergy) => {
          const nextEnergy = parseFloat((prevEnergy + kwhPerMinute).toFixed(3));
          setCost(parseFloat((nextEnergy * priceRate).toFixed(2)));
          return nextEnergy;
        });

        setTemp((prevTemp) => {
          if (prevTemp < 41) return parseFloat((prevTemp + 0.3).toFixed(1));
          return parseFloat((prevTemp + (Math.random() * 0.1 - 0.05)).toFixed(1));
        });

        return nextSoc;
      });
    }, 1000);
  };

  const handleAutoStop = (finalSoc) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCharging(false);
    setVoltage(0);
    setAmperage(0);
    setStatus('Completed');
    addToast('Target Reached', `Successfully charged to ${finalSoc}%.`, 'success');
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 }, colors: ['#00f2fe', '#ec4899', '#b800ff'] });
  };

  const handleUnplugAndSettle = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCharging(false);
    
    const { energyDelivered: finalEnergy, cost: finalCost, soc: finalSoc } = latestStates.current;
    
    // Auto Refund
    const diff = prepaidAmount - finalCost;
    const refund = diff > 0.01 ? diff : 0;
    
    if (refund > 0) {
      try {
        await api.topupWallet(refund);
        addToast('Auto-Refund Issued', `Unused amount of ₹${refund.toFixed(2)} refunded to Wallet.`, 'success');
      } catch (err) { console.error('Refund failed', err); }
    }

    try {
      await api.updateBooking(activeBooking.id, {
        status: 'Completed',
        energyDelivered: finalEnergy,
        accumulatedCost: finalCost,
        refundAmount: refund,
        paymentMethod: 'Prepaid Wallet'
      });
      await api.updateConnectorStatus(activeBooking.stationId, activeBooking.connectorType, 'Available');
    } catch (err) { console.error(err); }

    addToast('Session Ended', 'Vehicle Unplugged successfully.', 'info');
    if (onSimulationEnd) {
      onSimulationEnd({
        soc: finalSoc,
        energyDelivered: finalEnergy,
        cost: finalCost,
        duration: 'Simulated',
        paymentMethod: 'Prepaid Wallet',
        status: 'Completed'
      });
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      border: '1.5px solid var(--border-glow)',
      backgroundColor: 'rgba(12, 8, 30, 0.95)',
      marginTop: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        backgroundColor: charging ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        transition: 'var(--transition-smooth)'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: 'var(--color-primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.1 }}>
              {status === 'Setup' ? 'Pre-Charge Setup' : 'Live Console'}
            </h3>
            {selectedVehicle && (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                Vehicle: {selectedVehicle.name}
              </span>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: '800',
          padding: '3px 8px',
          borderRadius: '6px',
          backgroundColor: status === 'Charging' ? 'rgba(0, 242, 254, 0.15)' : status === 'Completed' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          color: status === 'Charging' ? 'var(--color-primary)' : status === 'Completed' ? '#00e676' : 'var(--text-secondary)'
        }}>
          {status}
        </span>
      </div>

      {status === 'Setup' ? (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800' }}>
              <span>Target Battery %</span>
              <span style={{ color: 'var(--color-primary)' }}>{targetSOC}%</span>
            </label>
            <input 
              type="range" 
              min={soc + 5} 
              max="100" 
              value={targetSOC}
              onChange={(e) => setTargetSOC(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Current: {soc}%</span>
              <span>Full: 100%</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Target Energy</span>
              <span style={{ fontWeight: '700' }}>{remainingEnergyNeeded.toFixed(2)} kWh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Base Price Rate</span>
              <span style={{ fontWeight: '700' }}>₹{priceRate.toFixed(2)}/kWh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', fontWeight: '800' }}>
              <span style={{ color: 'var(--text-primary)' }}>Estimated Cost</span>
              <span style={{ color: 'var(--color-secondary)' }}>₹{estimatedCost.toFixed(2)}</span>
            </div>
          </div>

          {setupError && (
            <div style={{ color: '#ea5455', fontSize: '11px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>
              {setupError}
            </div>
          )}

          <div style={{
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(0, 180, 216, 0.05)',
            fontSize: '11px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Wallet Balance: <strong style={{ color: walletBalance < estimatedCost ? '#ea5455' : 'var(--color-primary)' }}>₹{walletBalance.toFixed(2)}</strong>
          </div>

          <button
            onClick={handlePayAndStart}
            disabled={setupPaying || walletBalance < estimatedCost}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: walletBalance < estimatedCost ? 'var(--text-muted)' : 'var(--color-primary)',
              color: '#ffffff',
              fontWeight: '800',
              cursor: walletBalance < estimatedCost ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: walletBalance < estimatedCost ? 'none' : '0 4px 15px var(--color-primary-glow)'
            }}
            className="hover-scale"
          >
            <IndianRupee size={14} /> {setupPaying ? 'Processing...' : `Pay ₹${estimatedCost.toFixed(2)} & Start`}
          </button>

          {savedRfids && savedRfids.length > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '800', letterSpacing: '0.05em' }}>— Or Tap Smart Key to Charge —</div>
              <button
                onClick={handlePayAndStart}
                disabled={setupPaying || walletBalance < estimatedCost}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px dashed var(--color-primary)',
                  backgroundColor: 'rgba(0,180,216,0.05)',
                  color: 'var(--color-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: walletBalance < estimatedCost ? 'not-allowed' : 'pointer',
                  opacity: walletBalance < estimatedCost ? 0.5 : 1,
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-scale"
                title="Tap your saved RFID Smart Key"
              >
                <Zap size={32} />
              </button>
            </div>
          )}
        </motion.div>
        </AnimatePresence>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0', animation: 'fadeIn 0.3s' }}>
          
          <div style={{ position: 'relative', width: '150px', height: '150px', marginBottom: '16px' }}>
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx="75" cy="75" r={radius} fill="transparent" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="9" />
              <circle
                className="progress-ring-circle"
                cx="75" cy="75" r={radius} fill="transparent"
                stroke="url(#chargingGradient)" strokeWidth="9"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="chargingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
              </defs>
            </svg>
            
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <Battery size={20} style={{ 
                color: charging ? 'var(--color-primary)' : 'var(--text-secondary)',
                animation: charging ? 'pulse-cyan 1.5s infinite' : 'none'
              }} />
              <span style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', fontWeight: '800', lineHeight: 1, marginTop: '4px' }} className="glow-text-green">
                {soc}%
              </span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target: {targetSOC}%
              </span>
            </div>
          </div>

          <div className="glass-panel" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
            border: '1px solid rgba(0, 242, 254, 0.15)', background: 'rgba(0, 242, 254, 0.02)', fontSize: '11px', marginBottom: '20px'
          }}>
            <Clock size={13} style={{ color: 'var(--color-primary)' }} />
            <span>
              {status === 'Completed' ? (
                <strong style={{ color: '#00e676' }}>Charging target reached!</strong>
              ) : charging ? (
                <span>Est. time to target: <strong style={{ color: 'var(--color-primary)' }}>{timeToChargeMinutes} mins</strong></span>
              ) : (
                <span>Estimated duration: <strong>{timeToChargeMinutes} mins</strong></span>
              )}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '20px' }}>
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Delivered</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {energyDelivered.toFixed(2)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>kWh</span>
              </span>
            </div>
            
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Consumed Value</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-secondary)' }} className="glow-text-pink">
                ₹{cost.toFixed(2)}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              <Zap size={13} style={{ color: 'var(--color-primary)' }} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '8px', color: 'var(--text-secondary)', display: 'block' }}>Voltage</span>
                <span style={{ fontSize: '11px', fontWeight: '700' }}>{voltage} V</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              <Thermometer size={13} style={{ color: temp > 40 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '8px', color: 'var(--text-secondary)', display: 'block' }}>Battery Temp</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: temp > 40 ? 'var(--color-danger)' : 'var(--color-primary)' }}>{temp} °C</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              onClick={handleUnplugAndSettle}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-primary)', color: '#ffffff', fontWeight: '800',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 15px var(--color-primary-glow)'
              }}
              className="hover-scale"
            >
              <Sparkles size={14} /> Unplug {charging && '& Auto-Refund Unused Amount'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
