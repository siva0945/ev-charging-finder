import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, Edit, LogOut, CheckCircle, AlertTriangle, MessageSquare, ListCollapse, Star, Clock, Calendar, MapPin, User, ChevronRight, X, Sun, Moon, Trash, Plus, Check } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { api } from '../utils/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function OperatorDashboard({
  stations,
  bookings,
  onLogout,
  currentUser,
  onUpdateStation,
  onAddStation,
  addToast,
  theme,
  toggleTheme,
  withdrawnAmount = 0,
  setWithdrawnAmount
}) {
  const [selectedEditStation, setSelectedEditStation] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [activeDashTab, setActiveDashTab] = useState('fleet'); // 'fleet', 'bookings', 'analytics', 'b2b'

  const [dynamicSurge, setDynamicSurge] = useState(true);
  const [quickPrices, setQuickPrices] = useState({});

  // Form states for adding new station
  const [addName, setAddName] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addHours, setAddHours] = useState('24/7');
  const [addGridStatus, setAddGridStatus] = useState('Stable Grid');
  const [addAmenities, setAddAmenities] = useState(['WiFi']);
  const [addConnectors, setAddConnectors] = useState([
    { type: 'CCS', power: 150, price: 18.5, count: 2, selected: true },
    { type: 'Type 2', power: 22, price: 16.0, count: 2, selected: false },
    { type: 'CHAdeMO', power: 50, price: 18.0, count: 1, selected: false },
    { type: 'GB/T', power: 60, price: 17.5, count: 1, selected: false }
  ]);

  // Form states for editing existing station
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editHours, setEditHours] = useState('24/7');
  const [editGridStatus, setEditGridStatus] = useState('Stable Grid');
  const [editAmenities, setEditAmenities] = useState([]);
  const [editConnectors, setEditConnectors] = useState([]);

  // Sync edit form states when selectedEditStation changes
  useEffect(() => {
    if (selectedEditStation) {
      setEditName(selectedEditStation.name || '');
      setEditAddress(selectedEditStation.address || '');
      setEditHours(selectedEditStation.openingHours || '24/7');
      setEditGridStatus(selectedEditStation.gridStatus || 'Stable Grid');
      setEditAmenities(selectedEditStation.amenities || []);
      const mapped = (selectedEditStation.connectors || []).map(c => ({
        type: c.type,
        power: c.power || 50,
        price: c.price || 15.0,
        status: c.status || 'Available',
        count: c.count || 1
      }));
      setEditConnectors(mapped);
    }
  }, [selectedEditStation]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const selectedPlugs = addConnectors
      .filter(c => c.selected)
      .map(c => ({
        type: c.type,
        power: parseInt(c.power) || 50,
        price: parseFloat(c.price) || 18.0,
        status: 'Available',
        count: parseInt(c.count) || 1
      }));

    if (selectedPlugs.length === 0) {
      addToast('Validation Error', 'Please select at least one active charger plug type.', 'warning');
      return;
    }

    const newStation = {
      name: addName,
      address: addAddress,
      openingHours: addHours,
      gridStatus: addGridStatus,
      amenities: addAmenities,
      connectors: selectedPlugs,
      operator: currentUser.username,
      lat: 12.9716 + (Math.random() * 0.1 - 0.05),
      lng: 77.5946 + (Math.random() * 0.1 - 0.05)
    };

    if (onAddStation) onAddStation(newStation);
    setShowAddModal(false);

    // Reset fields
    setAddName('');
    setAddAddress('');
    setAddHours('24/7');
    setAddGridStatus('Stable Grid');
    setAddAmenities(['WiFi']);
    setAddConnectors([
      { type: 'CCS', power: 150, price: 18.5, count: 2, selected: true },
      { type: 'Type 2', power: 22, price: 16.0, count: 2, selected: false },
      { type: 'CHAdeMO', power: 50, price: 18.0, count: 1, selected: false },
      { type: 'GB/T', power: 60, price: 17.5, count: 1, selected: false }
    ]);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editConnectors.length === 0) {
      addToast('Validation Error', 'A station must have at least one operational connector.', 'warning');
      return;
    }

    const updatedDetails = {
      name: editName,
      address: editAddress,
      openingHours: editHours,
      gridStatus: editGridStatus,
      amenities: editAmenities,
      connectors: editConnectors
    };

    if (onUpdateStation) {
      onUpdateStation(selectedEditStation.id, updatedDetails);
    }
    setSelectedEditStation(null);
  };

  // Mock Reviews
  const allReviews = [
    { username: 'Rahul M.', date: 'Today, 2:15 PM', stationName: 'CyberHub Fast Charge', rating: 5, comment: 'Excellent speed, no waiting.' },
    { username: 'Priya S.', date: 'Yesterday', stationName: 'DLF Mall Charger', rating: 4, comment: 'Good location, but one plug was occupied.' }
  ];

  const handleToggleDynamicSurge = () => {
    setDynamicSurge(!dynamicSurge);
    addToast('Dynamic Surge Updated', `Surge pricing is now ${!dynamicSurge ? 'Active' : 'Disabled'}.`, 'info');
  };

  const handlePriceChange = (id, val) => {
    setQuickPrices(prev => ({ ...prev, [id]: val }));
  };

  const handlePriceSubmit = (id) => {
    addToast('Price Updated', 'Base price tariff updated successfully.', 'success');
  };

  const chartData = [
    { name: 'Mon', revenue: 4000, energy: 240 },
    { name: 'Tue', revenue: 3000, energy: 139 },
    { name: 'Wed', revenue: 2000, energy: 980 },
    { name: 'Thu', revenue: 2780, energy: 390 },
    { name: 'Fri', revenue: 1890, energy: 480 },
    { name: 'Sat', revenue: 2390, energy: 380 },
    { name: 'Sun', revenue: 3490, energy: 430 },
  ];

  const liveRevenue = bookings.filter(b => b.status === 'Completed').reduce((acc, curr) => acc + (curr.accumulatedCost || 0), 0);
  const liveEnergy = bookings.filter(b => b.status === 'Completed').reduce((acc, curr) => acc + (curr.energyDelivered || 0), 0);
  
  const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0) + liveRevenue;
  const totalEnergy = chartData.reduce((acc, curr) => acc + curr.energy, 0) + liveEnergy;

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={28} className="pulse" style={{ color: 'var(--color-primary)' }} />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Grid <span style={{ color: 'var(--color-primary)' }}>Operator</span> Hub</h1>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise Command Center</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-scale">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            onClick={() => setShowProfileModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 180, 216, 0.1)', border: '1px solid var(--color-primary)', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer' }}
            className="hover-scale"
          >
            <User size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary)' }}>{currentUser.username}</span>
          </button>
          
          <button 
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 23, 68, 0.1)', border: 'none', color: 'var(--color-danger)', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
            className="hover-scale"
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Top KPI Metrics Desk */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div 
            className="glass-panel hover-scale" 
            onClick={() => setShowRevenueModal(true)}
            style={{ padding: '20px', borderLeft: '4px solid #00e676', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>Total Revenue (7 Days)</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '10px', color: '#00e676', fontWeight: '700' }}>↑ 12% vs last week</span>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>Power Consumed</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
              {totalEnergy.toLocaleString('en-IN', { maximumFractionDigits: 1 })} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>kWh</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-secondary)', fontWeight: '700' }}>⚡ Optimized Grid Flow</span>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ff9100', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>Active Plugs In-Use</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
              {bookings.filter(b => b.status === 'Charging').length} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Cars</span>
            </div>
            <span style={{ fontSize: '10px', color: '#ff9100', fontWeight: '700' }}>Currently charging in fleet</span>
          </div>
        </div>

        {/* Navigation Tabs for Operator Dashboard */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '15px', fontSize: '14px', fontWeight: '700' }}>
            <button
              onClick={() => setActiveDashTab('fleet')}
              style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeDashTab === 'fleet' ? '2.5px solid var(--color-primary)' : 'none', color: activeDashTab === 'fleet' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeDashTab === 'fleet' ? '800' : '600' }}
            >
              🏢 Fleet & Reviews Console
            </button>
            <button
              onClick={() => setActiveDashTab('bookings')}
              style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeDashTab === 'bookings' ? '2.5px solid var(--color-secondary)' : 'none', color: activeDashTab === 'bookings' ? 'var(--color-secondary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeDashTab === 'bookings' ? '800' : '600' }}
            >
              📅 Reservations Console
            </button>
            <button
              onClick={() => setActiveDashTab('analytics')}
              style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeDashTab === 'analytics' ? '2.5px solid var(--color-accent)' : 'none', color: activeDashTab === 'analytics' ? 'var(--color-accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeDashTab === 'analytics' ? '800' : '600' }}
            >
              📈 Analytics Insights
            </button>
          </div>

          {/* Global Dynamic Grid Surge Pricing Toggle */}
          <div className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 16px',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            background: dynamicSurge ? 'rgba(0, 180, 216, 0.08)' : 'rgba(0, 0, 0, 0.02)',
            transition: 'var(--transition-smooth)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: dynamicSurge ? 'var(--color-primary)' : 'var(--text-secondary)', margin: 0 }}>
              <input 
                type="checkbox"
                checked={dynamicSurge}
                onChange={handleToggleDynamicSurge}
                style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              ⚡ Dynamic Grid Surge
            </label>
          </div>
        </div>

        {/* Tab 1: Fleet Console */}
        {activeDashTab === 'fleet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.25s' }}>
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListCollapse size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Station Fleet Management</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="glow-button"
                  style={{ padding: '8px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  <span>+ Add New Station</span>
                </button>
              </div>

              <table className="dashboard-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Station</th>
                    <th style={{ padding: '12px' }}>Operator</th>
                    <th style={{ padding: '12px' }}>Grid Power Source</th>
                    <th style={{ padding: '12px' }}>Base Price Tariff</th>
                    <th style={{ padding: '12px' }}>Plugs online</th>
                    <th style={{ padding: '12px' }}>Reliability</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map(station => {
                    const onlineCount = station.connectors.filter(c => c.status !== 'Offline').length;
                    const totalCount = station.connectors.length;
                    return (
                      <tr key={station.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                        <td style={{ padding: '12px', fontWeight: '800', color: 'var(--color-primary)' }}>
                          <div>{station.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} /> {station.address.split(',')[0]}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>{station.operator}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: station.gridStatus?.includes('Peak') ? 'var(--color-danger)' : station.gridStatus?.includes('Solar') ? '#00e676' : 'var(--color-primary)' }}>
                            {station.gridStatus || 'Stable Grid'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>₹</span>
                              <input
                                type="number"
                                value={quickPrices[station.id] !== undefined ? quickPrices[station.id] : station.connectors[0]?.price}
                                onChange={(e) => handlePriceChange(station.id, e.target.value)}
                                style={{ width: '54px', background: 'var(--bg-input)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 6px', borderRadius: '6px', fontWeight: '800', fontSize: '11px', textAlign: 'center' }}
                                min="0"
                                step="0.5"
                              />
                              <button
                                onClick={() => handlePriceSubmit(station.id)}
                                style={{ padding: '4px 8px', background: 'rgba(0, 180, 216, 0.08)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '6px', fontSize: '9px', fontWeight: '800', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                                className="hover-scale"
                              >
                                Set
                              </button>
                            </div>
                            {(() => {
                              const baseVal = quickPrices[station.id] !== undefined ? parseFloat(quickPrices[station.id]) : (station.connectors[0]?.price || 15);
                              if (isNaN(baseVal)) return null;
                              if (dynamicSurge) {
                                if (station.gridStatus?.includes('Peak')) {
                                  return (
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--color-danger)' }}>
                                      Surge: ₹{(baseVal * 1.25).toFixed(2)}
                                    </span>
                                  );
                                } else if (station.gridStatus?.includes('Solar')) {
                                  return (
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#00e676' }}>
                                      Discount: ₹{(baseVal * 0.85).toFixed(2)}
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>
                          <span style={{ color: onlineCount === totalCount ? '#00e676' : 'var(--color-warning)' }}>
                            {onlineCount} / {totalCount} Plugs
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, height: '4px', width: '60px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${station.reliability || 98}%`, background: (station.reliability || 98) > 90 ? 'var(--color-primary)' : 'var(--color-warning)' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700' }}>{station.reliability || 98}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setSelectedEditStation(station)}
                            style={{ background: 'rgba(0, 180, 216, 0.08)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--color-secondary)', fontSize: '11px', fontWeight: '800', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            className="hover-scale"
                          >
                            <Edit size={11} /> Edit settings
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Driver Reviews Monitor */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: '800' }}>Driver Reviews Feed Monitor</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {allReviews.map((r, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '800', color: 'var(--color-secondary)' }}>{r.username}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{r.date}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '4px' }}>
                      At: <strong>{r.stationName}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1px', color: 'var(--color-warning)', marginBottom: '4px' }}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={10} fill={idx < r.rating ? "currentColor" : "none"} stroke="currentColor" />
                      ))}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Reservations Console */}
        {activeDashTab === 'bookings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.25s' }}>
            
            {/* Left Col: Active Bookings */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: '800' }}>
                  Active Reservations & Sessions ({bookings.filter(b => b.status === 'Confirmed' || b.status === 'Charging').length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {bookings.filter(b => b.status === 'Confirmed' || b.status === 'Charging').length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No active reservations recorded.
                  </div>
                ) : (
                  bookings.filter(b => b.status === 'Confirmed' || b.status === 'Charging').map((booking) => (
                    <div key={booking.id} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{booking.stationName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {booking.connectorType} • Slot: {booking.timeSlot}
                        </div>
                        {booking.status === 'Charging' && (
                          <div style={{ fontSize: '10px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: '800' }}>
                            Plugged In: {new Date(booking.pluggedInAt || booking.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • {new Date(booking.pluggedInAt || booking.createdAt || new Date()).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', backgroundColor: booking.status === 'Charging' ? 'rgba(255, 145, 0, 0.12)' : 'rgba(0, 180, 216, 0.12)', color: booking.status === 'Charging' ? 'var(--color-secondary)' : 'var(--color-primary)' }}>
                        {booking.status === 'Charging' ? 'PLUGGED IN' : 'RESERVED'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Col: Earlier Bookings History */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <Calendar size={16} style={{ color: 'var(--color-secondary)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: '800' }}>
                  Earlier Bookings History ({bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Failed').length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Failed').length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No historical logs recorded.
                  </div>
                ) : (
                  bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Failed').map((booking) => (
                    <div key={booking.id} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{booking.stationName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {booking.connectorType} • Slot: {booking.timeSlot}
                          {booking.paymentMethod && (
                            <span style={{ display: 'block', color: 'var(--color-primary)', fontSize: '9px', marginTop: '2px' }}>
                              Paid via {booking.paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {booking.status === 'Completed' ? (
                          <>
                            <span style={{ color: '#00e676', fontWeight: '800', display: 'block' }}>
                              +₹{(booking.accumulatedCost || 0).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                              {(booking.energyDelivered || 0).toFixed(1)} kWh
                            </span>
                          </>
                        ) : booking.status === 'Failed' ? (
                          <>
                            <span style={{ color: 'var(--color-danger)', fontWeight: '800', display: 'block' }}>
                              UNSUCCESSFUL
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                              {(booking.energyDelivered || 0).toFixed(1)} kWh
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>CANCELLED</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics Console */}
        {activeDashTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.25s' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Revenue Trend (Past 7 Days)</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Daily gross income in INR</p>
              </div>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Energy Dispensed (Past 7 Days)</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total kWh dispensed per day</p>
              </div>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value.toFixed(1)} kWh`, 'Energy']} />
                    <Bar dataKey="energy" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}



      </main>

      {/* Add New Station Modal */}
      <AnimatePresence>
        {showAddModal && (
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
            zIndex: 1200,
            padding: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-panel animate-slide-up"
              style={{
                width: '100%',
                maxWidth: '650px',
                padding: '30px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1.5px solid var(--color-primary)',
                boxShadow: '0 8px 32px 0 var(--color-primary-glow)'
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 10px var(--color-primary)'
                }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1, margin: 0, color: 'var(--text-primary)' }}>Launch New Station</h2>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Grid Operator Provisioning Console
                  </span>
                </div>
              </div>

              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 2-Column Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  
                  {/* Left Column: Basic Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '0 0 4px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      Station Details
                    </h3>
                    
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Station Name</label>
                      <input
                        type="text"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className="glass-input"
                        placeholder="e.g. Bangalore East Hypercharge"
                        style={{ width: '100%', fontSize: '12px' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Address</label>
                      <input
                        type="text"
                        value={addAddress}
                        onChange={(e) => setAddAddress(e.target.value)}
                        className="glass-input"
                        placeholder="e.g. Metro Station, Indiranagar"
                        style={{ width: '100%', fontSize: '12px' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Opening Hours</label>
                        <input
                          type="text"
                          value={addHours}
                          onChange={(e) => setAddHours(e.target.value)}
                          className="glass-input"
                          placeholder="e.g. 24/7 or 6 AM - 11 PM"
                          style={{ width: '100%', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Grid Power Source</label>
                        <select
                          value={addGridStatus}
                          onChange={(e) => setAddGridStatus(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', cursor: 'pointer', appearance: 'auto', fontSize: '12px', padding: '10px' }}
                        >
                          <option value="Stable Grid">⚡ Stable Grid</option>
                          <option value="Eco Solar Peak">☀️ Eco Solar Peak</option>
                          <option value="Heavy Industrial Peak">🏭 Heavy Industrial Peak</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Amenities Checklist */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Station Amenities</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['WiFi', 'Cafe', 'Restroom', 'Lounge', 'Shopping'].map(amenity => {
                          const isSelected = addAmenities.includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => {
                                setAddAmenities(prev =>
                                  isSelected ? prev.filter(a => a !== amenity) : [...prev, amenity]
                                );
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-color)',
                                backgroundColor: isSelected ? 'rgba(0, 180, 216, 0.1)' : 'transparent',
                                color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                              }}
                              className="hover-scale"
                            >
                              {amenity === 'WiFi' && '📶 '}
                              {amenity === 'Cafe' && '☕ '}
                              {amenity === 'Restroom' && '🚻 '}
                              {amenity === 'Lounge' && '🛋️ '}
                              {amenity === 'Shopping' && '🛒 '}
                              {amenity}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                  
                  {/* Right Column: Connectors Specification */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '0 0 4px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      Configure Charging Plugs
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {addConnectors.map((c, idx) => (
                        <div
                          key={c.type}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '12px',
                            backgroundColor: c.selected ? 'rgba(0, 180, 216, 0.03)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: c.selected ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={c.selected}
                              onChange={(e) => {
                                const newConnectors = [...addConnectors];
                                newConnectors[idx].selected = e.target.checked;
                                setAddConnectors(newConnectors);
                              }}
                              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            />
                            🔌 {c.type} Plug Type
                          </label>

                          {c.selected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', overflow: 'hidden' }}
                            >
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Speed (kW)</label>
                                <input
                                  type="number"
                                  value={c.power}
                                  onChange={(e) => {
                                    const newConnectors = [...addConnectors];
                                    newConnectors[idx].power = parseInt(e.target.value) || 0;
                                    setAddConnectors(newConnectors);
                                  }}
                                  className="glass-input"
                                  style={{ padding: '6px 8px', fontSize: '11px' }}
                                  min="1"
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Tariff (₹/kWh)</label>
                                <input
                                  type="number"
                                  value={c.price}
                                  onChange={(e) => {
                                    const newConnectors = [...addConnectors];
                                    newConnectors[idx].price = parseFloat(e.target.value) || 0;
                                    setAddConnectors(newConnectors);
                                  }}
                                  className="glass-input"
                                  style={{ padding: '6px 8px', fontSize: '11px' }}
                                  min="0"
                                  step="0.5"
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Plug Count</label>
                                <input
                                  type="number"
                                  value={c.count}
                                  onChange={(e) => {
                                    const newConnectors = [...addConnectors];
                                    newConnectors[idx].count = parseInt(e.target.value) || 1;
                                    setAddConnectors(newConnectors);
                                  }}
                                  className="glass-input"
                                  style={{ padding: '6px 8px', fontSize: '11px' }}
                                  min="1"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="glow-button hover-scale"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    boxShadow: '0 4px 15px var(--color-primary-glow)',
                    padding: '14px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginTop: '8px',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Create & Launch Station
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Station Modal */}
      <AnimatePresence>
        {selectedEditStation && (
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
            zIndex: 1200,
            padding: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-panel animate-slide-up"
              style={{
                width: '100%',
                maxWidth: '650px',
                padding: '30px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1.5px solid var(--color-secondary)',
                boxShadow: '0 8px 32px 0 var(--color-secondary-glow)'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedEditStation(null)}
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
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--color-secondary), var(--color-accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 10px var(--color-secondary)'
                }}>
                  <Edit size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1, margin: 0, color: 'var(--text-primary)' }}>Edit Station Fleet Settings</h2>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Station ID: {selectedEditStation.id}
                  </span>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 2-Column Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  
                  {/* Left Column: Basic Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-secondary)', margin: '0 0 4px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      Station Profile
                    </h3>
                    
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Station Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', fontSize: '12px' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', fontSize: '12px' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Opening Hours</label>
                        <input
                          type="text"
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Grid Power Source</label>
                        <select
                          value={editGridStatus}
                          onChange={(e) => setEditGridStatus(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', cursor: 'pointer', appearance: 'auto', fontSize: '12px', padding: '10px' }}
                        >
                          <option value="Stable Grid">⚡ Stable Grid</option>
                          <option value="Eco Solar Peak">☀️ Eco Solar Peak</option>
                          <option value="Heavy Industrial Peak">🏭 Heavy Industrial Peak</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Amenities Checklist */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Station Amenities</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {['WiFi', 'Cafe', 'Restroom', 'Lounge', 'Shopping'].map(amenity => {
                          const isSelected = editAmenities.includes(amenity);
                          return (
                            <button
                              key={amenity}
                              type="button"
                              onClick={() => {
                                setEditAmenities(prev =>
                                  isSelected ? prev.filter(a => a !== amenity) : [...prev, amenity]
                                );
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--color-secondary)' : 'var(--border-color)',
                                backgroundColor: isSelected ? 'rgba(255, 145, 0, 0.1)' : 'transparent',
                                color: isSelected ? 'var(--color-secondary)' : 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                              }}
                              className="hover-scale"
                            >
                              {amenity === 'WiFi' && '📶 '}
                              {amenity === 'Cafe' && '☕ '}
                              {amenity === 'Restroom' && '🚻 '}
                              {amenity === 'Lounge' && '🛋️ '}
                              {amenity === 'Shopping' && '🛒 '}
                              {amenity}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                  
                  {/* Right Column: Connectors Specification */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--color-secondary)', margin: '0 0 4px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      Configure Charging Plugs
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {editConnectors.map((c, idx) => (
                        <div
                          key={c.type}
                          style={{
                            border: '1.5px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '12px',
                            backgroundColor: 'rgba(0, 180, 216, 0.01)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-primary)' }}>
                              🔌 {c.type} Connector
                            </span>
                            
                            {/* Toggle operational status */}
                            <button
                              type="button"
                              onClick={() => {
                                const newConnectors = [...editConnectors];
                                newConnectors[idx].status = c.status === 'Offline' ? 'Available' : 'Offline';
                                setEditConnectors(newConnectors);
                              }}
                              style={{
                                border: 'none',
                                background: c.status === 'Offline' ? 'rgba(255, 23, 68, 0.1)' : 'rgba(0, 230, 118, 0.1)',
                                color: c.status === 'Offline' ? 'var(--color-danger)' : '#00e676',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              {c.status === 'Offline' ? '🔴 OFFLINE' : '🟢 ONLINE'}
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Speed (kW)</label>
                              <input
                                type="number"
                                value={c.power}
                                onChange={(e) => {
                                  const newConnectors = [...editConnectors];
                                  newConnectors[idx].power = parseInt(e.target.value) || 0;
                                  setEditConnectors(newConnectors);
                                }}
                                className="glass-input"
                                style={{ padding: '6px 8px', fontSize: '11px' }}
                                min="1"
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Tariff (₹/kWh)</label>
                              <input
                                type="number"
                                value={c.price}
                                onChange={(e) => {
                                  const newConnectors = [...editConnectors];
                                  newConnectors[idx].price = parseFloat(e.target.value) || 0;
                                  setEditConnectors(newConnectors);
                                }}
                                className="glass-input"
                                style={{ padding: '6px 8px', fontSize: '11px' }}
                                min="0"
                                step="0.5"
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>Plug Count</label>
                              <input
                                type="number"
                                value={c.count}
                                onChange={(e) => {
                                  const newConnectors = [...editConnectors];
                                  newConnectors[idx].count = parseInt(e.target.value) || 1;
                                  setEditConnectors(newConnectors);
                                }}
                                className="glass-input"
                                style={{ padding: '6px 8px', fontSize: '11px' }}
                                min="1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="glow-button hover-scale"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-secondary), var(--color-accent))',
                    boxShadow: '0 4px 15px var(--color-secondary-glow)',
                    padding: '14px',
                    fontSize: '13px',
                    fontWeight: '800',
                    marginTop: '8px',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save Station Settings
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showRevenueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '24px', borderRadius: '16px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <button onClick={() => setShowRevenueModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} style={{ color: '#00e676' }} /> Revenue Transaction Ledger
            </h2>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.filter(b => b.status === 'Completed').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No completed transactions recorded yet.</div>
              ) : (
                bookings.filter(b => b.status === 'Completed').map(booking => (
                  <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>+ ₹{(booking.accumulatedCost || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {new Date(booking.createdAt).toLocaleDateString()} • {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary)' }}>{booking.paymentMethod || 'Wallet Balance'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {booking.stationName} • {booking.energyDelivered?.toFixed(1) || 0} kWh
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <UserProfileModal 
          currentUser={currentUser} 
          onClose={() => setShowProfileModal(false)} 
          addToast={addToast} 
        />
      )}
    </div>
  );
}
