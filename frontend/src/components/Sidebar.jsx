import React, { useState, useRef } from 'react';
import { Search, SlidersHorizontal, Heart, Star, Wifi, Coffee, ShoppingBag, Utensils, Trees, Clock, Calendar, Compass, ChevronLeft, MapPin, Zap, User, AlertTriangle, Battery, ThumbsUp, ThumbsDown, Send, Edit, ShieldAlert, CreditCard, Plus, Trash2, Wallet, Phone, Leaf, Activity, Car, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import TripPlanner from './TripPlanner';

// Calculate Haversine distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getConnectorDynamicPrice(station, connector) {
  if (!connector) return 15;
  const isSurgeEnabled = localStorage.getItem('dynamic_grid_surge_enabled') === 'true';
  const basePrice = connector.price;
  if (!isSurgeEnabled) return basePrice;
  
  if (station.gridStatus?.includes('Peak')) {
    return basePrice * 1.25;
  } else if (station.gridStatus?.includes('Solar')) {
    return basePrice * 0.85;
  }
  return basePrice;
}

export default function Sidebar({
  stations,
  selectedStation,
  onSelectStation,
  onToggleFavorite,
  onRateStation,
  bookings,
  onCancelBooking,
  onStartSimulation,
  routePoints,
  onRouteSelect,
  onHighlightStations,
  clearRoute,
  highlightedStationIds,
  role,
  onUpdateStation,
  onSubmitReview,
  onReportPlug,
  walletBalance,
  onWalletTopup,
  currentUser,
  savedCards = [],
  setSavedCards,
  savedUpis = [],
  setSavedUpis,
  topupTransactions = [],
  setTopupTransactions,
  userLocation,
  selectedVehicle,
  setSelectedVehicle,
  savedRfids,
  setSavedRfids,
  addToast,
  language
}) {
  const [activeTab, setActiveTab] = useState('stations'); // 'stations', 'planner', 'bookings'
  const [vehicleCategory, setVehicleCategory] = useState(selectedVehicle?.battery < 15 ? 'bike' : 'car');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [connectorFilter, setConnectorFilter] = useState([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPower, setMinPower] = useState(0);

  // Review Form States
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [feedbackSlideIndex, setFeedbackSlideIndex] = useState(0);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState([]); // base64 preview URLs
  const [photoDragOver, setPhotoDragOver] = useState(false);

  const handlePhotoFiles = (files) => {
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/'));
    accepted.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReviewPhotoPreviews(prev => prev.length < 4 ? [...prev, ev.target.result] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  // Retailer Editor Form States
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editGridStatus, setEditGridStatus] = useState('Stable Grid');
  const [editConnectors, setEditConnectors] = useState([]);

  // Wallet topup helper state
  const [topupAmount, setTopupAmount] = useState('500');
  
  // Payment tab form states
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const [showAddUpi, setShowAddUpi] = useState(false);
  const [newUpi, setNewUpi] = useState('');

  const [topupMethod, setTopupMethod] = useState('card'); // 'card' or 'upi'
  const [topupSourceId, setTopupSourceId] = useState(''); // ID of selected card/upi
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [upiPendingAmount, setUpiPendingAmount] = useState(0);

  const scrollRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setIsScrolled(el.scrollTop > 60);
    setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 20);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const amenitiesIconMap = {
    WiFi: <Wifi size={13} />,
    Coffee: <Coffee size={13} />,
    Shopping: <ShoppingBag size={13} />,
    Dining: <Utensils size={13} />,
    Park: <Trees size={13} />,
    Restrooms: <User size={13} />
  };

  const handleConnectorToggle = (type) => {
    setConnectorFilter(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter Stations and Sort by Distance Proximity
  const filteredStations = stations
    .filter(station => {
      const matchesSearch = station.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            station.address.toLowerCase().includes(searchQuery.toLowerCase());
      const stationConnectorTypes = station.connectors.map(c => c.type);
      const matchesConnector = connectorFilter.length === 0 || 
        connectorFilter.some(type => stationConnectorTypes.includes(type));
      const matchesFavorites = !onlyFavorites || station.isFavorite;
      const matchesAvailable = !onlyAvailable || station.status === 'Available';
      const maxStationPower = Math.max(...station.connectors.map(c => c.power));
      const matchesPower = maxStationPower >= minPower;
      const matchesHighlight = !highlightedStationIds || highlightedStationIds.includes(station.id);

      return matchesSearch && matchesConnector && matchesFavorites && matchesAvailable && matchesPower && matchesHighlight;
    })
    .map(station => {
      const distance = userLocation 
        ? calculateDistance(userLocation[0], userLocation[1], station.lat, station.lng)
        : 0;
      return { ...station, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  const handleReviewFormSubmit = (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    // Pass photos array along with the review (base64 previews)
    onSubmitReview(selectedStation.id, reviewName || 'EV Driver', reviewRating, reviewComment, reviewPhotoPreviews);
    setReviewComment('');
    setReviewName('');
    setReviewPhotoPreviews([]);
  };

  // Initialize Retailer Form values on selection
  const selectStationWithRetailInit = (station) => {
    onSelectStation(station);
    if (station) {
      setEditName(station.name);
      setEditPrice(station.connectors[0]?.price.toString() || '15');
      setEditGridStatus(station.gridStatus || 'Stable Grid');
      setEditConnectors(station.connectors.map(c => ({ type: c.type, status: c.status })));
    }
  };

  const handleRetailerSave = (e) => {
    e.preventDefault();
    onUpdateStation(selectedStation.id, {
      name: editName,
      basePrice: parseFloat(editPrice),
      gridStatus: editGridStatus,
      connectorsStatus: editConnectors
    });
  };

  const handleConnectorStatusToggle = (type) => {
    setEditConnectors(prev =>
      prev.map(c => c.type === type 
        ? { ...c, status: c.status === 'Offline' ? 'Available' : 'Offline' } 
        : c
      )
    );
  };
  const handleAddCardSubmit = (e) => {
    e.preventDefault();
    if (cardNum.replace(/\s/g, '').length < 16 || cardExp.length < 5 || cardCvv.length < 3 || !cardHolder.trim()) {
      alert('Please fill out all card fields correctly.');
      return;
    }
    const brand = cardNum.startsWith('4') ? 'Visa' : cardNum.startsWith('5') ? 'MasterCard' : cardNum.startsWith('6') ? 'RuPay' : 'Card';
    const newCardObj = {
      id: `card-${Date.now()}`,
      number: cardNum.replace(/\s/g, ''),
      expiry: cardExp,
      cvv: cardCvv,
      holder: cardHolder,
      brand
    };
    setSavedCards(prev => [...prev, newCardObj]);
    setCardNum('');
    setCardExp('');
    setCardCvv('');
    setCardHolder('');
    setShowAddCard(false);
  };

  const handleDeleteCard = (id) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
    if (topupSourceId === id) setTopupSourceId('');
  };

  const handleAddUpiSubmit = (e) => {
    e.preventDefault();
    if (!newUpi.includes('@')) {
      alert('Please enter a valid UPI ID (e.g. user@bank).');
      return;
    }
    const newUpiObj = {
      id: `upi-${Date.now()}`,
      address: newUpi
    };
    setSavedUpis(prev => [...prev, newUpiObj]);
    setNewUpi('');
    setShowAddUpi(false);
  };

  const handleDeleteUpi = (id) => {
    setSavedUpis(prev => prev.filter(u => u.id !== id));
    if (topupSourceId === id) setTopupSourceId('');
  };

  const handleWalletTopupSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    
    let fundingLabel = 'Demo Source';
    if (topupMethod === 'card') {
      const activeSourceId = topupSourceId || (savedCards[0]?.id);
      const selectedCard = savedCards.find(c => c.id === activeSourceId);
      if (selectedCard) {
        fundingLabel = `${selectedCard.brand} ****${selectedCard.number.slice(-4)}`;
      } else {
        alert('Please add a credit card first.');
        return;
      }
    } else {
      const activeSourceId = topupSourceId || (savedUpis[0]?.id);
      const selectedUpiObj = savedUpis.find(u => u.id === activeSourceId);
      if (selectedUpiObj) {
        fundingLabel = `UPI: ${selectedUpiObj.address}`;
        setUpiPendingAmount(amount);
        setShowUpiQr(true);
        
        // Mock 3-second scan
        setTimeout(() => {
          setShowUpiQr(false);
          const newTx = {
            id: `topup-${Date.now()}`,
            type: 'Wallet Topup',
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            funding: fundingLabel
          };
          // Assuming Sidebar doesn't have onWalletTopup directly passed from App but modifies walletBalance via App context? 
          // Wait, where does onWalletTopup come from? It might not exist! Let me just add an event dispatch or assume it's defined globally.
          // Wait, I will just call a global dispatch to trigger toast, but topup transactions state gets updated.
          // Actually, earlier code called `onWalletTopup(amount);`
          if (typeof onWalletTopup === 'function') onWalletTopup(amount);
          setTopupTransactions(prev => [newTx, ...prev]);
          if (addToast) addToast('Payment Received', `₹${amount} added via PhonePe / GPay.`, 'success');
        }, 3000);
        return; // wait for timeout
      } else {
        alert('Please add a UPI address first.');
        return;
      }
    }

    if (typeof onWalletTopup === 'function') onWalletTopup(amount);
    
    // Create topup transaction history item
    const newTx = {
      id: `topup-${Date.now()}`,
      type: 'Wallet Topup',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      funding: fundingLabel
    };
    
    setTopupTransactions(prev => [newTx, ...prev]);
  };
  return (
    <div className="sidebar-panel">
      {/* Header logo & title */}
      <div style={{
        padding: '20px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'linear-gradient(180deg, rgba(0, 180, 216, 0.08) 0%, transparent 100%)'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #ff6f00, #ff9100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(255, 111, 0, 0.35)'
        }}>
          <Zap size={20} fill="#ffffff" stroke="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1, letterSpacing: '0.05em' }}>SUP CHARGED</h1>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>India EV Smart Grid</span>
        </div>
      </div>

      {/* Tabs (Only visible to Driver) */}
      {role === 'driver' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: '700'
        }}>
          <button 
            onClick={() => setActiveTab('stations')}
            style={{
              padding: '14px 2px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'stations' ? '2.5px solid var(--color-primary)' : 'none',
              color: activeTab === 'stations' ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'stations' ? '800' : '600',
              textAlign: 'center'
            }}
          >
            Stations
          </button>
          <button 
            onClick={() => setActiveTab('planner')}
            style={{
              padding: '14px 2px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'planner' ? '2.5px solid var(--color-secondary)' : 'none',
              color: activeTab === 'planner' ? 'var(--color-secondary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'planner' ? '800' : '600',
              textAlign: 'center'
            }}
          >
            Planner
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            style={{
              padding: '14px 2px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'bookings' ? '2.5px solid var(--color-accent)' : 'none',
              color: activeTab === 'bookings' ? 'var(--color-accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'bookings' ? '800' : '600',
              position: 'relative',
              textAlign: 'center'
            }}
          >
            Bookings
            {bookings.filter(b => b.status === 'Confirmed').length > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-secondary)',
                boxShadow: '0 0 6px var(--color-secondary-glow)'
              }} />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '14px 2px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'payments' ? '2.5px solid var(--color-primary)' : 'none',
              color: activeTab === 'payments' ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'payments' ? '800' : '600',
              textAlign: 'center'
            }}
          >
            Payments
          </button>
        </div>
      )}

      {/* Main scrollable content area */}
      <div
        ref={scrollRef}
        className="sidebar-scroll-area"
        onScroll={handleScroll}
      >
        
        {/* RETAILER / OPERATOR CONSOLE MODE */}
        {role === 'retailer' ? (
          selectedStation ? (
            /* Retailer Station Editor Form */
            <form onSubmit={handleRetailerSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s' }}>
              <button 
                type="button"
                onClick={() => onSelectStation(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  alignSelf: 'flex-start',
                  marginBottom: '8px'
                }}
              >
                <ChevronLeft size={14} /> Owner Panel Dashboard
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={16} style={{ color: 'var(--color-secondary)' }} />
                <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Edit Station Settings</h2>
              </div>

              {/* Station Name */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>
                  Station Name
                </label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              {/* Pricing Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>
                  Electricity Pricing Rate (₹/kWh)
                </label>
                <input 
                  type="number" 
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Grid Status Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>
                  Grid Power Source & Load Health
                </label>
                <select 
                  value={editGridStatus}
                  onChange={(e) => setEditGridStatus(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', fontSize: '13px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="Stable Grid">🟢 Stable Grid Power</option>
                  <option value="Solar Power Backup">☀️ Solar Backup (Green Mode)</option>
                  <option value="Reduced Load - Peak Demand">🟡 Reduced Load (Grid Congestion)</option>
                </select>
              </div>

              {/* Connectors maintenance toggler */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '8px' }}>
                  Connector Maintenance Status
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editConnectors.map((c) => (
                    <div 
                      key={c.type} 
                      onClick={() => handleConnectorStatusToggle(c.type)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: c.status === 'Offline' ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '700' }}>{c.type}</div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: c.status === 'Offline' ? 'rgba(255,23,68,0.15)' : 'rgba(0,180,216,0.15)',
                        color: c.status === 'Offline' ? 'var(--color-danger)' : 'var(--color-primary)'
                      }}>
                        {c.status === 'Offline' ? 'OFFLINE' : 'ONLINE / ACTIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="glow-button" style={{ padding: '12px', fontSize: '13px', marginTop: '10px' }}>
                Save Settings
              </button>
            </form>
          ) : (
            /* Retailer Station List (Owner dashboard view) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} style={{ color: 'var(--color-secondary)' }} />
                <h3 style={{ fontSize: '14px', fontWeight: '800' }}>Operator Dashboard Console</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Select any charging station from the network listing below to open its owner settings form.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stations.map(station => (
                  <div 
                    key={station.id}
                    onClick={() => selectStationWithRetailInit(station)}
                    className="glass-panel hover-scale"
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      borderColor: 'var(--border-color)',
                      background: 'rgba(0, 180, 216, 0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800' }}>{station.name}</h4>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Grid: {station.gridStatus} • Plugs: {station.connectors.length}
                      </span>
                    </div>
                    <Edit size={14} style={{ color: 'var(--color-secondary)' }} />
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* DRIVER CONSOLE MODE */
          <>
            {/* Tab 1: Stations Browse */}
            {activeTab === 'stations' && (
              selectedStation ? (
                /* Detailed Station Profile Card */
                <div style={{ animation: 'fadeIn 0.25s' }}>
                  <button 
                    onClick={() => onSelectStation(null)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.03)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '700',
                      marginBottom: '16px'
                    }}
                    className="hover-scale"
                  >
                    <ChevronLeft size={14} /> Back to Search
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1.2 }}>{selectedStation.name}</h2>
                      {selectedVehicle && !selectedStation.connectors.some(c => selectedVehicle.connectors.includes(c.type)) && (
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-danger)', backgroundColor: 'rgba(255, 23, 68, 0.08)', padding: '3px 8px', borderRadius: '4px', alignSelf: 'flex-start', border: '1px solid rgba(255, 23, 68, 0.2)' }}>
                          ⚠️ Plugs Incompatible with {selectedVehicle.name}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => onToggleFavorite(selectedStation.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: selectedStation.isFavorite ? 'var(--color-secondary)' : 'var(--text-muted)',
                        paddingLeft: '10px'
                      }}
                      className="hover-scale"
                    >
                      <Heart size={18} fill={selectedStation.isFavorite ? 'var(--color-secondary)' : 'none'} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '12px' }}>
                    <MapPin size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{selectedStation.address}</span>
                      {userLocation && (
                        <span style={{ color: 'var(--color-primary)', fontWeight: '700', flexShrink: 0, marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <MapPin size={10} />
                          {calculateDistance(userLocation[0], userLocation[1], selectedStation.lat, selectedStation.lng).toFixed(1)} km
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Quick info row: Rating + Status + Open Hours */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={14} fill="var(--color-warning)" stroke="var(--color-warning)" />
                      <span style={{ fontSize: '12px', fontWeight: '800' }}>{selectedStation.rating}</span>
                    </div>
                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
                    <span style={{
                      fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: selectedStation.status === 'Available' ? 'rgba(0, 180, 216, 0.12)' : 'rgba(255, 145, 0, 0.12)',
                      color: selectedStation.status === 'Available' ? 'var(--color-primary)' : 'var(--color-secondary)'
                    }}>
                      {selectedStation.status}
                    </span>
                    {selectedStation.openingHours && (
                      <>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                          <Clock size={10} style={{ color: 'var(--color-primary)' }} />
                          {selectedStation.openingHours}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Contact Row */}
                  {selectedStation.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '11px' }}>
                      <Phone size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>Helpline: </span>
                      <a href={`tel:${selectedStation.phone}`} style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
                        {selectedStation.phone}
                      </a>
                    </div>
                  )}

                  {/* 4 KPI Stats Tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0, 180, 216, 0.05)', border: '1px solid rgba(0, 180, 216, 0.15)' }}>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>Total Sessions</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>
                        {(selectedStation.totalSessions || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>
                        <Leaf size={9} style={{ color: '#00e676' }} /> CO₂ Saved
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#00c853' }}>
                        {selectedStation.co2SavedKg ? `${(selectedStation.co2SavedKg / 1000).toFixed(1)}t` : 'N/A'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 145, 0, 0.05)', border: '1px solid rgba(255, 145, 0, 0.15)' }}>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>Reliability</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: selectedStation.reliability > 90 ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                        {selectedStation.reliability}%
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(0, 0, 0, 0.02)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>Operator</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {selectedStation.operator}
                      </div>
                    </div>
                  </div>

                  {/* Market Challenge Details Panel (Grid health, Reliability Index, Queues) */}
                  <div className="glass-panel" style={{ padding: '14px', background: 'rgba(0, 180, 216, 0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {/* Grid load status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Grid Load Health:</span>
                      <span style={{ 
                        fontWeight: '700', 
                        color: selectedStation.gridStatus?.includes('Peak') ? 'var(--color-danger)' : selectedStation.gridStatus?.includes('Solar') ? '#00e676' : 'var(--color-primary)'
                      }}>
                        {selectedStation.gridStatus || 'Stable Grid'}
                      </span>
                    </div>
                    
                    {/* Occupancy wait-times */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Wait Queue Status:</span>
                      <span style={{ fontWeight: '700', color: selectedStation.queueLength > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                        {selectedStation.queueLength === 0 ? 'No waiting lines' : `${selectedStation.queueLength} car(s) queueing (Est: ${selectedStation.queueLength * 12} mins)`}
                      </span>
                    </div>

                    {/* Crowdsourced Reliability indexes */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Success reliability rate:</span>
                        <strong style={{ color: selectedStation.reliability > 90 ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                          {selectedStation.reliability || 90}% operational
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Help drivers: is this station functional?</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => onReportPlug(selectedStation.id, 'working')}
                            style={{ padding: '3px 8px', background: 'rgba(0, 180, 216, 0.08)', border: '1px solid var(--color-primary)', borderRadius: '4px', color: 'var(--color-primary)', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            className="hover-scale"
                          >
                            <ThumbsUp size={10} /> Yes
                          </button>
                          <button 
                            onClick={() => onReportPlug(selectedStation.id, 'broken')}
                            style={{ padding: '3px 8px', background: 'rgba(255,23,68,0.08)', border: '1px solid var(--color-danger)', borderRadius: '4px', color: 'var(--color-danger)', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            className="hover-scale"
                          >
                            <ThumbsDown size={10} /> No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Peak Congestion Chart Panel */}
                  <div className="glass-panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.02)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Traffic Congestion index (Peak Hours)
                    </div>
                    <div style={{ display: 'flex', height: '45px', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 6px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {(selectedStation.peakHours || [10, 25, 45, 75, 90, 95, 80, 70, 60, 50, 30, 15]).map((val, idx) => (
                        <div key={idx} className="chart-bar" style={{ height: `${val}%` }} title={`Occupancy: ${val}%`} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>8 AM</span>
                      <span>2 PM</span>
                      <span>8 PM</span>
                    </div>
                  </div>

                  {/* EV Compatibility Panel */}
                  {selectedStation.evCompatibility && selectedStation.evCompatibility.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Car size={13} style={{ color: 'var(--color-primary)' }} />
                        <h3 style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>EV Compatibility</h3>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {selectedStation.evCompatibility.map(ev => (
                          <span key={ev} style={{
                            fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontWeight: '700',
                            background: 'rgba(255, 111, 0, 0.06)', border: '1px solid rgba(255, 111, 0, 0.2)',
                            color: '#ff6f00'
                          }}>{ev}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plugs availability details */}
                  <h3 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Available Connectors
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {selectedStation.connectors.map(c => (
                      <div key={c.type} className="glass-panel" style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>{c.type}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '800',
                            color: c.status === 'Available' ? 'var(--color-primary)' : 'var(--text-muted)'
                          }}>
                            {c.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span>Power: <strong>{c.power} kW</strong></span>
                          <span>
                            Rate: <strong>₹{getConnectorDynamicPrice(selectedStation, c).toFixed(2)}/kWh</strong>
                            {localStorage.getItem('dynamic_grid_surge_enabled') === 'true' && (
                              selectedStation.gridStatus?.includes('Peak') ? (
                                <span style={{ color: 'var(--color-danger)', fontSize: '9px', marginLeft: '4px', fontWeight: '800' }}>(Surge)</span>
                              ) : selectedStation.gridStatus?.includes('Solar') ? (
                                <span style={{ color: '#00e676', fontSize: '9px', marginLeft: '4px', fontWeight: '800' }}>(Eco)</span>
                              ) : null
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Amenities */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {selectedStation.amenities.map(amenity => (
                      <span 
                        key={amenity}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(0, 180, 216, 0.08)',
                          border: '1px solid rgba(0, 180, 216, 0.2)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {amenitiesIconMap[amenity]}
                        {amenity}
                      </span>
                    ))}
                  </div>

                  {/* Action Reservation Button */}
                  {selectedStation.status !== 'Offline' && (
                    selectedStation.connectors.some(c => c.status === 'Available') ? (
                      <button
                        onClick={() => onStartSimulation(selectedStation)}
                        style={{
                          width: '100%',
                          padding: '14px',
                          fontSize: '13px',
                          marginBottom: '20px'
                        }}
                        className="glow-button"
                      >
                        Book / Reserve Now
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          addToast('Notification Set', 'We will notify you when a plug becomes available.', 'info');
                          setTimeout(() => {
                            addToast('Plug Available!', `A charger is now free at ${selectedStation.name}.`, 'success');
                          }, 6000);
                        }}
                        style={{
                          width: '100%',
                          padding: '14px',
                          fontSize: '13px',
                          marginBottom: '20px',
                          backgroundColor: 'rgba(255, 145, 0, 0.1)',
                          color: 'var(--color-secondary)',
                          border: '1px solid var(--color-secondary)',
                          borderRadius: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        className="hover-scale"
                      >
                        <Bell size={16} />
                        Notify Me When Available
                      </button>
                    )
                  )}

                  {/* ─── FEEDBACK SLIDE SECTION ─── */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '8px' }}>

                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #ff6f00, #ff9100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={13} fill="#fff" stroke="#fff" />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>Driver Feedback</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>{selectedStation.reviews?.length || 0} review{(selectedStation.reviews?.length || 0) !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      {/* Overall rating badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(255, 159, 0, 0.1)', border: '1px solid rgba(255, 159, 0, 0.25)' }}>
                        <Star size={13} fill="var(--color-warning)" stroke="var(--color-warning)" />
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-warning)' }}>{selectedStation.rating}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>/5</span>
                      </div>
                    </div>

                    {/* Star Breakdown Summary Bar */}
                    {selectedStation.reviews && selectedStation.reviews.length > 0 && (() => {
                      const counts = [5,4,3,2,1].map(s => ({
                        star: s,
                        count: selectedStation.reviews.filter(r => r.rating === s).length
                      }));
                      const total = selectedStation.reviews.length;
                      return (
                        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {counts.map(({ star, count }) => (
                            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: '700', width: '18px', textAlign: 'right' }}>{star}</span>
                              <Star size={9} fill="var(--color-warning)" stroke="none" />
                              <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${total > 0 ? (count / total) * 100 : 0}%`,
                                  background: 'linear-gradient(90deg, #ff9100, #ffcc00)',
                                  borderRadius: '3px',
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                              <span style={{ color: 'var(--text-muted)', fontWeight: '700', width: '14px' }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Slide Carousel */}
                    {(!selectedStation.reviews || selectedStation.reviews.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                        No reviews yet — be the first to share your experience!
                      </div>
                    ) : (() => {
                      const reviews = selectedStation.reviews;
                      const slideIdx = Math.min(feedbackSlideIndex, reviews.length - 1);
                      const r = reviews[slideIdx];
                      const totalStars = 5;
                      return (
                        <div>
                          {/* Slide Card */}
                          <div style={{
                            borderRadius: '14px',
                            padding: '16px',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            position: 'relative',
                            marginBottom: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
                          }}>
                            {/* Quote mark decoration */}
                            <div style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '36px', color: 'rgba(255,111,0,0.1)', fontFamily: 'Georgia, serif', lineHeight: 1, userSelect: 'none' }}>&ldquo;</div>

                            {/* User avatar + name + date */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                background: `hsl(${(r.username.charCodeAt(0) * 37) % 360}, 65%, 55%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: '800', color: '#fff'
                              }}>
                                {r.username.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary)' }}>{r.username}</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>{r.date}</div>
                              </div>
                              {/* Star rating pills */}
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {Array.from({ length: totalStars }).map((_, i) => (
                                  <Star key={i} size={11}
                                    fill={i < r.rating ? 'var(--color-warning)' : 'transparent'}
                                    stroke={i < r.rating ? 'var(--color-warning)' : 'var(--text-muted)'}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Comment */}
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic', marginBottom: r.photos && r.photos.length > 0 ? '12px' : 0 }}>&#8220;{r.comment}&#8221;</p>

                            {/* Attached Photos Grid */}
                            {r.photos && r.photos.length > 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(r.photos.length, 3)}, 1fr)`, gap: '6px', marginTop: '10px' }}>
                                {r.photos.map((src, pi) => (
                                  <div key={pi} style={{ position: 'relative', paddingBottom: '70%', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border-color)' }}>
                                    <img src={src} alt={`Review photo ${pi + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Prev / Dot / Next Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                            <button
                              onClick={() => setFeedbackSlideIndex(i => Math.max(0, i - 1))}
                              disabled={slideIdx === 0}
                              style={{
                                width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid var(--border-color)',
                                background: slideIdx === 0 ? 'transparent' : 'rgba(0,180,216,0.08)',
                                color: slideIdx === 0 ? 'var(--text-muted)' : 'var(--color-primary)',
                                cursor: slideIdx === 0 ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                              }}
                            >&#8249;</button>

                            {/* Dot indicators */}
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              {reviews.map((_, i) => (
                                <button key={i} onClick={() => setFeedbackSlideIndex(i)}
                                  style={{
                                    width: i === slideIdx ? '18px' : '7px',
                                    height: '7px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: i === slideIdx ? '#ff6f00' : 'var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    padding: 0
                                  }}
                                />
                              ))}
                            </div>

                            <button
                              onClick={() => setFeedbackSlideIndex(i => Math.min(reviews.length - 1, i + 1))}
                              disabled={slideIdx === reviews.length - 1}
                              style={{
                                width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid var(--border-color)',
                                background: slideIdx === reviews.length - 1 ? 'transparent' : 'rgba(0,180,216,0.08)',
                                color: slideIdx === reviews.length - 1 ? 'var(--text-muted)' : 'var(--color-primary)',
                                cursor: slideIdx === reviews.length - 1 ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                              }}
                            >&#8250;</button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Write Feedback Toggle ── */}
                    <button
                      onClick={() => setShowFeedbackForm(f => !f)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1.5px solid var(--border-color)',
                        background: showFeedbackForm ? 'rgba(255,111,0,0.06)' : 'rgba(0,0,0,0.02)',
                        color: showFeedbackForm ? '#ff6f00' : 'var(--text-secondary)',
                        fontSize: '12px', fontWeight: '800', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.25s', marginBottom: showFeedbackForm ? '10px' : '0'
                      }}
                      className="hover-scale"
                    >
                      <Send size={12} />
                      {showFeedbackForm ? 'Close Feedback Form' : 'Write a Review'}
                    </button>

                    {/* Collapsible Submit Form */}
                    {showFeedbackForm && (
                      <form
                        onSubmit={(e) => { handleReviewFormSubmit(e); setShowFeedbackForm(false); setFeedbackSlideIndex((selectedStation.reviews?.length || 0)); }}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: '10px',
                          padding: '14px', borderRadius: '12px',
                          border: '1.5px solid rgba(255,111,0,0.2)',
                          background: 'rgba(255,111,0,0.03)',
                          animation: 'fadeIn 0.2s ease'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#ff6f00', marginBottom: '2px' }}>Share Your Experience</div>

                        {/* Name + Stars row */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text" placeholder="Your name"
                            value={reviewName} onChange={(e) => setReviewName(e.target.value)}
                            className="glass-input"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                          />
                          <select
                            value={reviewRating} onChange={(e) => setReviewRating(parseInt(e.target.value))}
                            className="glass-input"
                            style={{ padding: '8px', fontSize: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', minWidth: '90px' }}
                          >
                            <option value="5">⭐⭐⭐⭐⭐ 5</option>
                            <option value="4">⭐⭐⭐⭐ 4</option>
                            <option value="3">⭐⭐⭐ 3</option>
                            <option value="2">⭐⭐ 2</option>
                            <option value="1">⭐ 1</option>
                          </select>
                        </div>

                        {/* Comment textarea */}
                        <textarea
                          placeholder="Describe your charging experience..."
                          value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                          className="glass-input"
                          style={{ padding: '10px 12px', fontSize: '12px', height: '70px', resize: 'none', width: '100%' }}
                          required
                        />

                        {/* ── Photo Attachment Zone ── */}
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            📷 Attach Photos <span style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'none', fontSize: '9px' }}>(up to 4)</span>
                          </div>

                          {/* Drop Zone */}
                          <div
                            onClick={() => document.getElementById('feedback-photo-input').click()}
                            onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                            onDragLeave={() => setPhotoDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setPhotoDragOver(false); handlePhotoFiles(e.dataTransfer.files); }}
                            style={{
                              border: `2px dashed ${photoDragOver ? '#ff6f00' : 'rgba(255,111,0,0.3)'}`,
                              borderRadius: '10px',
                              padding: '14px 12px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              background: photoDragOver ? 'rgba(255,111,0,0.06)' : 'rgba(255,111,0,0.02)',
                              transition: 'all 0.2s',
                              display: reviewPhotoPreviews.length >= 4 ? 'none' : 'block'
                            }}
                          >
                            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🖼️</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>Click or drag photos here</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>JPG, PNG, WEBP supported</div>
                          </div>

                          {/* Hidden file input */}
                          <input
                            id="feedback-photo-input"
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => handlePhotoFiles(e.target.files)}
                          />

                          {/* Preview Thumbnails Strip */}
                          {reviewPhotoPreviews.length > 0 && (
                            <div style={{ display: 'flex', gap: '7px', marginTop: '10px', flexWrap: 'wrap' }}>
                              {reviewPhotoPreviews.map((src, i) => (
                                <div key={i} style={{ position: 'relative', width: '62px', height: '62px', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(255,111,0,0.3)', flexShrink: 0 }}>
                                  <img src={src} alt={`Preview ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  {/* Remove button */}
                                  <button
                                    type="button"
                                    onClick={() => setReviewPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{
                                      position: 'absolute', top: '2px', right: '2px',
                                      width: '16px', height: '16px', borderRadius: '50%',
                                      border: 'none', background: 'rgba(0,0,0,0.65)',
                                      color: '#fff', fontSize: '9px', fontWeight: '900',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', lineHeight: 1
                                    }}
                                  >✕</button>
                                </div>
                              ))}
                              {reviewPhotoPreviews.length < 4 && (
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('feedback-photo-input').click()}
                                  style={{
                                    width: '62px', height: '62px', borderRadius: '8px',
                                    border: '2px dashed rgba(255,111,0,0.3)',
                                    background: 'rgba(255,111,0,0.03)',
                                    color: '#ff6f00', fontSize: '20px',
                                    cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >+</button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Submit button */}
                        <button
                          type="submit"
                          style={{
                            padding: '10px', border: 'none', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #ff6f00, #ff9100)',
                            color: '#fff', fontSize: '12px', fontWeight: '800',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '6px'
                          }}
                          className="hover-scale"
                        >
                          <Send size={12} /> Submit Review
                          {reviewPhotoPreviews.length > 0 && (
                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '10px' }}>
                              📷 {reviewPhotoPreviews.length}
                            </span>
                          )}
                        </button>
                      </form>
                    )}

                  </div>

                </div>
              ) : (
                /* Search List View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search charging stations..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', paddingLeft: '38px', fontSize: '13px' }}
                    />
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      style={{
                        marginLeft: '8px',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        background: showFilters ? 'rgba(0, 180, 216, 0.15)' : 'rgba(0,0,0,0.03)',
                        color: showFilters ? 'var(--color-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                      className="hover-scale"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>

                  {highlightedStationIds && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(0, 180, 216, 0.08)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: 'var(--color-primary)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={14} />
                        <span>Filtering stops along trip route</span>
                      </div>
                      <button 
                        onClick={() => {
                          clearRoute();
                          onHighlightStations(null);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                      >
                        Clear Path
                      </button>
                    </div>
                  )}

                  {/* Sliders Drawer Filters */}
                  {showFilters && (
                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s' }}>
                      
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                          Connector Types
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {['Tesla Supercharger', 'CCS', 'Type 2', 'CHAdeMO'].map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={connectorFilter.includes(type)}
                                onChange={() => handleConnectorToggle(type)}
                                style={{ accentColor: 'var(--color-primary)' }}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <span>Min Charging Speed</span>
                          <span style={{ color: 'var(--color-primary)' }}>{minPower} kW</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="350"
                          step="50"
                          value={minPower}
                          onChange={(e) => setMinPower(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={onlyFavorites} 
                            onChange={() => setOnlyFavorites(!onlyFavorites)}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          Favorites Only
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={onlyAvailable} 
                            onChange={() => setOnlyAvailable(!onlyAvailable)}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          Available Only
                        </label>
                      </div>

                    </div>
                  )}

                  {/* List View Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredStations.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No stations match filter criteria.
                      </div>
                    ) : (
                      filteredStations.map(station => {
                        const maxPower = Math.max(...station.connectors.map(c => c.power));
                        return (
                          <div 
                            key={station.id}
                            onClick={() => selectStationWithRetailInit(station)}
                            className="glass-panel hover-scale"
                            style={{
                              padding: '14px',
                              cursor: 'pointer',
                              backgroundColor: 'var(--bg-card)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '80%' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '800' }}>{station.name}</h4>
                                {selectedVehicle && !station.connectors.some(c => selectedVehicle.connectors.includes(c.type)) && (
                                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--color-danger)', backgroundColor: 'rgba(255, 23, 68, 0.08)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', border: '1px solid rgba(255, 23, 68, 0.2)' }}>
                                    ⚠️ Incompatible
                                  </span>
                                )}
                              </div>
                              <span style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: station.status === 'Available' ? 'var(--color-primary)' : station.status === 'In Use' ? 'var(--color-secondary)' : 'var(--text-muted)',
                                boxShadow: station.status === 'Available' ? '0 0 6px var(--color-primary)' : station.status === 'In Use' ? '0 0 6px var(--color-secondary)' : 'none',
                                marginTop: '4px'
                              }} />
                            </div>
                            
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{station.address}</span>
                              {station.distance !== undefined && (
                                <span style={{ color: 'var(--color-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0, marginLeft: '8px' }}>
                                  <MapPin size={10} />
                                  {station.distance.toFixed(1)} km
                                </span>
                              )}
                            </span>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--color-warning)' }}>
                                  <Star size={11} fill="var(--color-warning)" stroke="var(--color-warning)" />
                                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{station.rating}</span>
                                </div>
                                <span style={{ color: 'var(--text-secondary)' }}>₹<strong>{getConnectorDynamicPrice(station, station.connectors[0]).toFixed(0)}</strong>/kWh</span>
                              </div>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                Grid: <strong style={{ color: station.gridStatus?.includes('Solar') ? '#00e676' : station.gridStatus?.includes('Peak') ? 'var(--color-danger)' : 'var(--text-primary)' }}>{station.gridStatus?.split(' ')[0] || 'Stable'}</strong>
                              </span>
                            </div>
                            {/* Extra data row: sessions + hours */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Activity size={9} />
                                {(station.totalSessions || 0).toLocaleString()} sessions
                              </span>
                              {station.openingHours && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={9} />
                                  {station.openingHours}
                                </span>
                              )}
                            </div>

                            {station.status === 'Offline' ? (
                              <button
                                disabled
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 23, 68, 0.2)',
                                  background: 'rgba(255, 23, 68, 0.05)',
                                  color: 'var(--color-danger)',
                                  fontWeight: '700',
                                  fontSize: '11px',
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                              >
                                🚫 Station Offline
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartSimulation(station);
                                }}
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                  color: 'var(--text-white)',
                                  fontWeight: '800',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                className="hover-scale"
                              >
                                <Zap size={12} fill="#ffffff" stroke="#ffffff" /> Book / Reserve Charger
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )
            )}

            {/* Tab 2: Route Planner */}
            {activeTab === 'planner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* EV Profile Selection Card */}
                <motion.div 
                  className="glass-panel" 
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 180, 216, 0.15)', borderColor: 'var(--color-primary)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{ padding: '14px', background: 'rgba(0, 0, 0, 0.02)', border: '1px solid var(--border-color)', cursor: 'default' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Active Vehicle Profile
                    </span>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.05)', padding: '2px', borderRadius: '6px' }}>
                      <button onClick={() => setVehicleCategory('car')} style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', background: vehicleCategory === 'car' ? 'var(--color-primary)' : 'transparent', color: vehicleCategory === 'car' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>Cars</button>
                      <button onClick={() => setVehicleCategory('bike')} style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', background: vehicleCategory === 'bike' ? 'var(--color-primary)' : 'transparent', color: vehicleCategory === 'bike' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>2-Wheelers</button>
                    </div>
                  </div>
                  <select
                    value={selectedVehicle?.id || 'tata-nexon'}
                    onChange={(e) => {
                      const profiles = [
                        { id: 'tata-nexon', name: 'Tata Nexon EV', battery: 40.5, maxSpeed: 50, range: 312, connectors: ['CCS', 'Type 2'] },
                        { id: 'tata-tiago', name: 'Tata Tiago EV', battery: 24.0, maxSpeed: 50, range: 250, connectors: ['CCS', 'Type 2'] },
                        { id: 'tata-punch', name: 'Tata Punch EV', battery: 35.0, maxSpeed: 50, range: 421, connectors: ['CCS', 'Type 2'] },
                        { id: 'tata-curvv', name: 'Tata Curvv EV', battery: 55.0, maxSpeed: 70, range: 585, connectors: ['CCS', 'Type 2'] },
                        { id: 'mahindra-xuv400', name: 'Mahindra XUV400', battery: 39.4, maxSpeed: 50, range: 375, connectors: ['CCS', 'Type 2'] },
                        { id: 'mg-zs', name: 'MG ZS EV', battery: 50.3, maxSpeed: 76, range: 461, connectors: ['CCS', 'Type 2'] },
                        { id: 'mg-comet', name: 'MG Comet EV', battery: 17.3, maxSpeed: 3.3, range: 230, connectors: ['Type 2'] },
                        { id: 'hyundai-ioniq5', name: 'Hyundai Ioniq 5', battery: 72.6, maxSpeed: 233, range: 481, connectors: ['CCS', 'Type 2'] },
                        { id: 'hyundai-kona', name: 'Hyundai Kona Electric', battery: 39.2, maxSpeed: 50, range: 452, connectors: ['CCS', 'Type 2'] },
                        { id: 'kia-ev6', name: 'Kia EV6', battery: 77.4, maxSpeed: 240, range: 708, connectors: ['CCS', 'Type 2'] },
                        { id: 'byd-atto3', name: 'BYD Atto 3', battery: 60.48, maxSpeed: 80, range: 521, connectors: ['CCS', 'Type 2'] },
                        { id: 'byd-seal', name: 'BYD Seal', battery: 82.5, maxSpeed: 150, range: 650, connectors: ['CCS', 'Type 2'] },
                        { id: 'citroen-ec3', name: 'Citroen eC3', battery: 29.2, maxSpeed: 30, range: 320, connectors: ['CCS', 'Type 2'] },
                        { id: 'volvo-xc40', name: 'Volvo XC40 Recharge', battery: 78.0, maxSpeed: 150, range: 418, connectors: ['CCS', 'Type 2'] },
                        { id: 'tesla-m3', name: 'Tesla Model 3', battery: 75.0, maxSpeed: 250, range: 491, connectors: ['Tesla Supercharger', 'CCS'] },
                        { id: 'ola-s1-pro', name: 'Ola S1 Pro', battery: 4.0, maxSpeed: 10, range: 181, connectors: ['Type 2'] },
                        { id: 'ather-450x', name: 'Ather 450X', battery: 3.7, maxSpeed: 10, range: 146, connectors: ['Type 2'] },
                        { id: 'tvs-iqube', name: 'TVS iQube', battery: 3.0, maxSpeed: 10, range: 100, connectors: ['Type 2'] },
                        { id: 'bajaj-chetak', name: 'Bajaj Chetak', battery: 3.2, maxSpeed: 10, range: 126, connectors: ['Type 2'] },
                        { id: 'hero-vida', name: 'Hero Vida V1 Pro', battery: 3.94, maxSpeed: 10, range: 165, connectors: ['Type 2'] }
                      ];
                      const match = profiles.find(p => p.id === e.target.value);
                      if (match) setSelectedVehicle(match);
                    }}
                    className="glass-input"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  >
                    {vehicleCategory === 'car' ? (
                      <>
                        <optgroup label="Tata Motors">
                          <option value="tata-nexon">Tata Nexon EV (40.5 kWh, CCS/Type 2)</option>
                          <option value="tata-tiago">Tata Tiago EV (24.0 kWh, CCS/Type 2)</option>
                          <option value="tata-punch">Tata Punch EV (35.0 kWh, CCS/Type 2)</option>
                          <option value="tata-curvv">Tata Curvv EV (55.0 kWh, CCS/Type 2)</option>
                        </optgroup>
                        <optgroup label="Mahindra & MG">
                          <option value="mahindra-xuv400">Mahindra XUV400 (39.4 kWh, CCS/Type 2)</option>
                          <option value="mg-zs">MG ZS EV (50.3 kWh, CCS/Type 2)</option>
                          <option value="mg-comet">MG Comet EV (17.3 kWh, Type 2)</option>
                        </optgroup>
                        <optgroup label="Hyundai & Kia">
                          <option value="hyundai-ioniq5">Hyundai Ioniq 5 (72.6 kWh, CCS/Type 2)</option>
                          <option value="hyundai-kona">Hyundai Kona Electric (39.2 kWh, CCS/Type 2)</option>
                          <option value="kia-ev6">Kia EV6 (77.4 kWh, CCS/Type 2)</option>
                        </optgroup>
                        <optgroup label="BYD & Others">
                          <option value="byd-atto3">BYD Atto 3 (60.48 kWh, CCS/Type 2)</option>
                          <option value="byd-seal">BYD Seal (82.5 kWh, CCS/Type 2)</option>
                          <option value="citroen-ec3">Citroen eC3 (29.2 kWh, CCS/Type 2)</option>
                          <option value="volvo-xc40">Volvo XC40 Recharge (78.0 kWh, CCS/Type 2)</option>
                          <option value="tesla-m3">Tesla Model 3 (75.0 kWh, Supercharger/CCS)</option>
                        </optgroup>
                      </>
                    ) : (
                      <optgroup label="Electric 2-Wheelers">
                        <option value="ola-s1-pro">Ola S1 Pro (4.0 kWh, Type 2)</option>
                        <option value="ather-450x">Ather 450X (3.7 kWh, Type 2)</option>
                        <option value="tvs-iqube">TVS iQube (3.0 kWh, Type 2)</option>
                        <option value="bajaj-chetak">Bajaj Chetak (3.2 kWh, Type 2)</option>
                        <option value="hero-vida">Hero Vida V1 Pro (3.94 kWh, Type 2)</option>
                      </optgroup>
                    )}
                  </select>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <span>Range: <strong style={{ color: 'var(--color-primary)' }}>{selectedVehicle?.range || 312} km</strong></span>
                    <span>•</span>
                    <span>Max Charge: <strong style={{ color: 'var(--color-secondary)' }}>{selectedVehicle?.maxSpeed || 50} kW</strong></span>
                    <span>•</span>
                    <span>Battery: <strong style={{ color: '#00e676' }}>{selectedVehicle?.battery || 40.5} kWh</strong></span>
                  </div>
                </motion.div>

                <TripPlanner 
                  onRouteSelect={onRouteSelect}
                  onHighlightStations={onHighlightStations}
                  clearRoute={clearRoute}
                  selectedVehicle={selectedVehicle}
                />
              </div>
            )}

            {/* Tab 3: Reservations */}
            {activeTab === 'bookings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Simulated credit card top-up HUD in reservations */}
                <div className="glass-panel" style={{ padding: '14px', background: 'rgba(0, 180, 216, 0.03)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SupPay Wallet Credit</span>
                    <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>₹{walletBalance.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="number"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="glass-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '11px' }}
                    />
                    <button
                      onClick={() => onWalletTopup(parseFloat(topupAmount))}
                      style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: 'var(--color-secondary)', color: '#ffffff', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      className="hover-scale"
                    >
                      Topup
                    </button>
                  </div>
                </div>

                {/* Active reservations listing */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Clock size={16} style={{ color: 'var(--color-accent)' }} />
                    <h3 style={{ fontSize: '14px', fontWeight: '800' }}>Active Reservations</h3>
                  </div>

                  {bookings.filter(b => b.status === 'Confirmed').length === 0 ? (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      borderRadius: '10px',
                      border: '1px dashed var(--border-color)'
                    }}>
                      No active bookings. Select a station to reserve.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {bookings.filter(b => b.status === 'Confirmed').map(booking => (
                        <div 
                          key={booking.id} 
                          className="glass-panel" 
                          style={{ 
                            padding: '14px',
                            borderLeft: '4px solid var(--color-accent)',
                            background: 'rgba(0, 180, 216, 0.02)'
                          }}
                        >
                          <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>{booking.stationName}</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{booking.address}</p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                            <span>Plug: <strong>{booking.connectorType}</strong></span>
                            <span>Slot: <strong>{booking.timeSlot}</strong></span>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => onStartSimulation(null, booking)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '800',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              Drive & Charge
                            </button>
                            <button
                              onClick={() => onCancelBooking(booking.id)}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(0,0,0,0.03)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--color-danger)',
                                fontSize: '11px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              className="hover-scale"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History logs */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                    <h3 style={{ fontSize: '14px', fontWeight: '800' }}>Charging History Logs</h3>
                  </div>

                  {bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Failed').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No charging logs recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Failed').map(b => (
                        <div 
                          key={b.id} 
                          style={{ 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            backgroundColor: 'rgba(0,0,0,0.02)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{b.stationName}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                              {b.connectorType} • {b.timeSlot}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {b.status === 'Completed' ? (
                              <>
                                <span style={{ color: 'var(--color-primary)', fontWeight: '800', display: 'block' }}>
                                  +₹{b.accumulatedCost?.toFixed(2) || '150.00'}
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                                  {b.energyDelivered?.toFixed(1) || '12.5'} kWh
                                </span>
                              </>
                            ) : b.status === 'Failed' ? (
                              <span style={{ color: 'var(--color-danger)', fontWeight: '800' }}>Unsuccessful</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Cancelled</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tab 4: Payments */}
            {activeTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s' }}>
                
                {/* SupPay Wallet Neon Card Visual */}
                <div className="glass-panel" style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(7, 4, 18, 0.95) 0%, rgba(26, 15, 54, 0.95) 100%)',
                  border: '1.5px solid var(--color-primary)',
                  boxShadow: '0 0 15px var(--color-primary-glow)',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  {/* Glowing background circles */}
                  <div style={{
                    position: 'absolute',
                    top: '-60px',
                    right: '-60px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(0, 242, 254, 0.1)',
                    filter: 'blur(30px)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-60px',
                    left: '-60px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(184, 0, 255, 0.1)',
                    filter: 'blur(30px)'
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                        {language === 'HI' ? 'SupPay बटुआ' : 'SupPay Wallet'}
                      </span>
                    </div>
                    {/* Micro-chip design */}
                    <div style={{
                      width: '28px',
                      height: '20px',
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, #f1c40f, #e67e22)',
                      opacity: 0.85,
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </div>

                  <div style={{ margin: '6px 0' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Available Balance
                    </span>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-heading)' }} className="glow-text-green">
                      ₹{walletBalance.toFixed(2)}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase' }}>Account Holder</span>
                      <strong style={{ color: '#fff', fontSize: '10px' }}>{currentUser?.username || 'EV Driver'}</strong>
                    </div>
                    <span>⚡ Secure Grid</span>
                  </div>
                </div>

                {/* Topup wallet Module */}
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} style={{ color: 'var(--color-primary)' }} /> Topup Wallet
                  </h4>
                  
                  <form onSubmit={handleWalletTopupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="number"
                        placeholder="Amount (₹)"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="glass-input"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                        required
                        min="10"
                      />
                      <button
                        type="submit"
                        className="glow-button"
                        style={{ padding: '8px 16px', fontSize: '11px' }}
                      >
                        Add Cash
                      </button>
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
                      {['100', '500', '1000', '2000'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          style={{
                            padding: '6px 0',
                            borderRadius: '6px',
                            background: topupAmount === amt ? 'rgba(0, 180, 216, 0.15)' : 'rgba(0,0,0,0.02)',
                            border: '1px solid',
                            borderColor: topupAmount === amt ? 'var(--color-primary)' : 'var(--border-color)',
                            color: topupAmount === amt ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>

                    {/* Funding Method details */}
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                        Recharge Funding Method
                      </label>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                        {['card', 'upi'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setTopupMethod(m);
                              setTopupSourceId('');
                            }}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: topupMethod === m ? 'var(--color-primary)' : 'var(--border-color)',
                              background: topupMethod === m ? 'rgba(0,180,216,0.05)' : 'transparent',
                              color: topupMethod === m ? 'var(--color-primary)' : 'var(--text-muted)',
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              cursor: 'pointer'
                            }}
                          >
                            {m === 'card' ? 'Cards' : 'UPI'}
                          </button>
                        ))}
                      </div>

                      {topupMethod === 'card' ? (
                        savedCards.length === 0 ? (
                          <span style={{ fontSize: '9px', color: 'var(--color-danger)' }}>
                            No saved cards. Add a card below to recharge.
                          </span>
                        ) : (
                          <select
                            value={topupSourceId || (savedCards[0]?.id || '')}
                            onChange={(e) => setTopupSourceId(e.target.value)}
                            className="glass-input"
                            style={{ width: '100%', fontSize: '11px', padding: '6px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                          >
                            {savedCards.map(c => (
                              <option key={c.id} value={c.id}>
                                💳 {c.brand} ending in •••• {c.number.slice(-4)}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        savedUpis.length === 0 ? (
                          <span style={{ fontSize: '9px', color: 'var(--color-danger)' }}>
                            No saved UPI IDs. Add a UPI ID below to recharge.
                          </span>
                        ) : (
                          <select
                            value={topupSourceId || (savedUpis[0]?.id || '')}
                            onChange={(e) => setTopupSourceId(e.target.value)}
                            className="glass-input"
                            style={{ width: '100%', fontSize: '11px', padding: '6px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                          >
                            {savedUpis.map(u => (
                              <option key={u.id} value={u.id}>
                                🌐 UPI ID: {u.address}
                              </option>
                            ))}
                          </select>
                        )
                      )}
                    </div>
                  </form>
                </div>

                {/* Credit Cards list */}
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} style={{ color: 'var(--color-secondary)' }} /> Saved Cards
                    </h4>
                    <button
                      onClick={() => setShowAddCard(!showAddCard)}
                      style={{
                        background: 'rgba(0,180,216,0.08)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--color-primary)',
                        fontSize: '9px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontWeight: '800'
                      }}
                    >
                      {showAddCard ? 'Cancel' : '+ Add'}
                    </button>
                  </div>

                  {showAddCard && (
                    <form onSubmit={handleAddCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', padding: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', animation: 'fadeIn 0.2s' }}>
                      <input 
                        type="text" 
                        placeholder="Card Number (16 Digits)"
                        value={cardNum}
                        onChange={(e) => setCardNum(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        className="glass-input"
                        style={{ fontSize: '11px', padding: '6px 10px' }}
                        required
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="MM/YY"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value.slice(0, 5))}
                          className="glass-input"
                          style={{ flex: 1, fontSize: '11px', padding: '6px 10px', textAlign: 'center' }}
                          required
                        />
                        <input 
                          type="password" 
                          placeholder="CVV"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          className="glass-input"
                          style={{ flex: 1, fontSize: '11px', padding: '6px 10px', textAlign: 'center' }}
                          required
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Holder Name"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="glass-input"
                        style={{ fontSize: '11px', padding: '6px 10px' }}
                        required
                      />
                      <button type="submit" className="glow-button" style={{ padding: '6px', fontSize: '11px' }}>
                        Save Card
                      </button>
                    </form>
                  )}

                  {savedCards.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '10px' }}>
                      No saved cards.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {savedCards.map(card => (
                        <div key={card.id} style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '22px',
                              borderRadius: '4px',
                              background: card.brand === 'Visa' ? '#1a1f71' : card.brand === 'RuPay' ? '#ff9f00' : '#d22d7d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '8px',
                              fontWeight: '900'
                            }}>
                              {card.brand}
                            </div>
                            <div>
                              <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>•••• •••• •••• {card.number.slice(-4)}</strong>
                              <span style={{ display: 'block', fontSize: '8px', color: 'var(--text-muted)' }}>
                                Exp: {card.expiry} • {card.holder}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.7 }}
                            className="hover-scale"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* UPI IDs list */}
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} style={{ color: 'var(--color-primary)' }} /> Saved UPI IDs
                    </h4>
                    <button
                      onClick={() => setShowAddUpi(!showAddUpi)}
                      style={{
                        background: 'rgba(0,180,216,0.08)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--color-primary)',
                        fontSize: '9px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontWeight: '800'
                      }}
                    >
                      {showAddUpi ? 'Cancel' : '+ Add'}
                    </button>
                  </div>

                  {showAddUpi && (
                    <form onSubmit={handleAddUpiSubmit} style={{ display: 'flex', gap: '6px', marginBottom: '14px', animation: 'fadeIn 0.2s' }}>
                      <input 
                        type="text" 
                        placeholder="address@upi"
                        value={newUpi}
                        onChange={(e) => setNewUpi(e.target.value)}
                        className="glass-input"
                        style={{ flex: 1, fontSize: '11px', padding: '6px 10px' }}
                        required
                      />
                      <button type="submit" className="glow-button" style={{ padding: '6px 12px', fontSize: '11px' }}>
                        Save
                      </button>
                    </form>
                  )}

                  {savedUpis.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '10px' }}>
                      No saved UPI ID accounts.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {savedUpis.map(upi => (
                        <div key={upi.id} style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            📱 {upi.address}
                          </span>
                          <button
                            onClick={() => handleDeleteUpi(upi.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.7 }}
                            className="hover-scale"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RFID Keys list */}
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} style={{ color: 'var(--color-primary)' }} /> Smart RFID Keys
                    </h4>
                    <button
                      onClick={() => setSavedRfids([...savedRfids, { id: Date.now().toString(), tag: `EV-Key-${Math.floor(Math.random()*10000)}` }])}
                      style={{
                        background: 'rgba(0,180,216,0.08)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--color-primary)',
                        fontSize: '9px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontWeight: '800'
                      }}
                      className="hover-scale"
                    >
                      + Link Key
                    </button>
                  </div>

                  {(!savedRfids || savedRfids.length === 0) ? (
                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '10px' }}>
                      No linked RFID cards. Link a key to charge instantly.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {savedRfids.map(rfid => (
                        <div key={rfid.id} style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Zap size={12} style={{ color: 'var(--color-primary)' }} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '11px', color: 'var(--text-primary)' }}>RFID Key</strong>
                              <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>ID: {rfid.tag}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSavedRfids(savedRfids.filter(r => r.id !== rfid.id))}
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.7 }}
                            className="hover-scale"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unified Transaction History Ledger */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
                    <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>{language === 'HI' ? 'लेनदेन और बिलिंग खाता' : 'Transactions & Billing Ledger'}</h3>
                  </div>

                  {(() => {
                    const allTxs = [
                      ...topupTransactions.map(tx => ({ ...tx, amount: tx.amount })),
                      ...bookings.filter(b => b.status === 'Completed' || b.status === 'Failed').map(b => ({
                        id: b.id,
                        type: b.status === 'Failed' ? `Charging at ${b.stationName} (Unsuccessful)` : `Charging at ${b.stationName}`,
                        amount: b.status === 'Failed' ? 0 : - (b.accumulatedCost || 0),
                        date: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        funding: 'Wallet Pay',
                        status: b.status
                      }))
                    ];
                    // Sort descending
                    allTxs.sort((a, b) => b.id.localeCompare(a.id));

                    if (allTxs.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                          No transactions recorded.
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {allTxs.map(tx => (
                          <div key={tx.id} style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0,0,0,0.02)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{tx.type}</strong>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                {tx.date} • {tx.funding}
                              </span>
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '12px', color: tx.amount > 0 ? '#00e676' : tx.status === 'Failed' ? 'var(--text-muted)' : 'var(--color-danger)' }}>
                              {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Mock UPI Scanner Modal */}
                {showUpiQr && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '24px',
                    padding: '20px'
                  }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,255,100,0.2)' }}>
                      <h3 style={{ color: '#000', fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>Scan & Pay ₹{upiPendingAmount}</h3>
                      <p style={{ color: '#666', fontSize: '10px', marginBottom: '16px' }}>Open PhonePe, GPay, or Paytm</p>
                      
                      <div style={{ width: '150px', height: '150px', border: '4px solid #000', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '4px' }}>
                        {/* Mock QR blocks */}
                        {Array.from({length: 25}).map((_, i) => (
                          <div key={i} style={{ width: '25px', height: '25px', background: Math.random() > 0.3 ? '#000' : '#fff' }} />
                        ))}
                      </div>
                      
                      <div style={{ marginTop: '20px', fontSize: '11px', color: '#00e676', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
                        Waiting for payment confirmation...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Bottom fade — hints more content below */}
      <div
        className="sidebar-scroll-fade"
        style={{ opacity: isAtBottom ? 0 : 1 }}
      />

      {/* Scroll to top button — appears after scrolling down */}
      {isScrolled && (
        <button
          className="sidebar-scroll-top-btn"
          onClick={scrollToTop}
          title="Back to top"
        >
          ↑
        </button>
      )}

    </div>
  );
}
