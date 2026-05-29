import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LeafletMap from './components/LeafletMap';
import BookingModal from './components/BookingModal';
import ChargingSimulator from './components/ChargingSimulator';
import AuthPortal from './components/AuthPortal';
import OperatorDashboard from './components/OperatorDashboard';
import UserProfileModal from './components/UserProfileModal';
import { api } from './utils/api';
import { ShieldAlert, Info, CheckCircle, AlertTriangle, Wallet, Sun, Moon, ScanLine, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'EN');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'EN' ? 'HI' : 'EN');
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [walletBalance, setWalletBalance] = useState(1500.0);
  
  // Role matches the logged in user: 'driver' or 'retailer'
  const [role, setRole] = useState(currentUser?.role || 'driver');

  const [routePoints, setRoutePoints] = useState(null);
  const [highlightedStationIds, setHighlightedStationIds] = useState(null);
  const [userLocation, setUserLocation] = useState([12.976, 77.601]);

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleScanQR = () => {
    setShowQRScanner(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress(prev => prev >= 100 ? 100 : prev + 8);
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setShowQRScanner(false);
      
      const availableStation = stations.find(s => s.status === 'Available' && s.connectors.some(c => c.status === 'Available'));
      if (availableStation) {
        handleStartSimulation(availableStation);
        addToast('QR Scanned Successfully!', `Charger identified at ${availableStation.name}`, 'success');
      } else {
        addToast('Scan Failed', 'No available charger recognized.', 'warning');
      }
    }, 2500);
  };

  const [selectedVehicle, setSelectedVehicle] = useState(() => {
    const saved = localStorage.getItem('selected_vehicle_id');
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
    const match = profiles.find(p => p.id === saved);
    return match || profiles[0];
  });

  useEffect(() => {
    localStorage.setItem('selected_vehicle_id', selectedVehicle.id);
  }, [selectedVehicle]);

  // Booking Modal overlays
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStation, setBookingStation] = useState(null);

  // User Profile Modal overlay
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Live Simulator state
  const [activeSimulatorBooking, setActiveSimulatorBooking] = useState(null);

  // Toast Notification Queue
  const [toasts, setToasts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [savedCards, setSavedCards] = useState([
    { id: 'card-1', brand: 'Visa', number: '1234567890123456', expiry: '12/28', holder: currentUser?.username || 'EV Driver' }
  ]);
  const [savedUpis, setSavedUpis] = useState([
    { id: 'upi-1', address: 'driver@okicici' }
  ]);
  const [savedRfids, setSavedRfids] = useState([
    { id: 'rfid-1', tag: 'EV-Smart-Key-8A9C' }
  ]);
  const [topupTransactions, setTopupTransactions] = useState([]);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  const addToast = (title, message, type = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync role state when user logs in/out
  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
    }
  }, [currentUser]);

  // Load initial data
  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const fetchedStations = await api.getStations();
      const fetchedBookings = await api.getBookings();
      const wallet = await api.getWalletData();
      setStations(fetchedStations);
      setBookings(fetchedBookings);
      setWalletBalance(wallet.balance);
      setSavedCards(wallet.savedCards || []);
      setSavedUpis(wallet.savedUpis || []);
      setTopupTransactions(wallet.transactions || []);
      setWithdrawnAmount(wallet.withdrawnAmount || 0);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure the Node server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Periodically poll bookings and stations to synchronize driver and operator portals in real-time
    const pollInterval = setInterval(async () => {
      if (!currentUser) return;
      try {
        const fetchedStations = await api.getStations();
        const fetchedBookings = await api.getBookings();
        setStations(fetchedStations);
        setBookings(fetchedBookings);

        if (currentUser.role === 'driver') {
          const wallet = await api.getWalletData();
          setWalletBalance(wallet.balance);
          setTopupTransactions(wallet.transactions || []);
        } else if (currentUser.role === 'retailer') {
          const wallet = await api.getWalletData();
          setWithdrawnAmount(wallet.withdrawnAmount || 0);
        }
      } catch (err) {
        console.error('Data polling sync failed:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [currentUser]);

  // Live Background Occupancy Simulator
  useEffect(() => {
    if (!currentUser || role !== 'driver' || stations.length === 0) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * stations.length);
      const targetStation = stations[randomIndex];
      if (!targetStation) return;

      const isCurrentlyAvailable = targetStation.status === 'Available';
      const newStatus = isCurrentlyAvailable ? 'In Use' : 'Available';
      const newQueueLength = isCurrentlyAvailable ? Math.floor(Math.random() * 3) + 1 : 0;

      setStations(prevStations => 
        prevStations.map(s => {
          if (s.id === targetStation.id) {
            return {
              ...s,
              status: newStatus,
              queueLength: newQueueLength
            };
          }
          return s;
        })
      );

      if (selectedStation && selectedStation.id === targetStation.id) {
        setSelectedStation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: newStatus,
            queueLength: newQueueLength
          };
        });
      }

      if (targetStation.isFavorite || (selectedStation && selectedStation.id === targetStation.id)) {
        addToast(
          'Station Status Update',
          `${targetStation.name} is now ${newStatus}. ${newStatus === 'In Use' ? 'Est. wait time: ' + (newQueueLength * 12) + 'm.' : 'Available for charging!'}`,
          newStatus === 'Available' ? 'success' : 'info'
        );
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [currentUser, role, stations, selectedStation]);

  const handleAuthSuccess = (session) => {
    setCurrentUser(session);
    localStorage.setItem('currentUser', JSON.stringify(session));
    addToast('Authentication Verified', `Logged in as ${session.username} (${session.role === 'driver' ? 'Driver' : 'Operator'}).`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setSelectedStation(null);
    setRoutePoints(null);
    setHighlightedStationIds(null);
    setActiveSimulatorBooking(null);
    addToast('Logged Out', 'Successfully cleared security credentials.', 'info');
  };

  const handleSelectStation = (station) => {
    setSelectedStation(station);
  };

  const handleToggleFavorite = async (stationId) => {
    try {
      const updatedStation = await api.toggleFavorite(stationId);
      setStations(prev => prev.map(s => s.id === stationId ? updatedStation : s));
      if (selectedStation?.id === stationId) {
        setSelectedStation(updatedStation);
      }
      
      if (updatedStation.isFavorite) {
        addToast('Added to Favorites', `${updatedStation.name} has been saved.`, 'success');
      } else {
        addToast('Removed from Favorites', `${updatedStation.name} removed from favorites list.`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRateStation = async (stationId, rating) => {
    try {
      const updatedStation = await api.rateStation(stationId, rating);
      setStations(prev => prev.map(s => s.id === stationId ? updatedStation : s));
      if (selectedStation?.id === stationId) {
        setSelectedStation(updatedStation);
      }
      addToast('Rating Submitted', `You rated this station ${rating} stars.`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (stationId, username, rating, comment, photos = []) => {
    try {
      const updatedStation = await api.submitReview(stationId, username, rating, comment);
      // Attach photos (base64) to the newest review client-side
      if (photos.length > 0 && updatedStation.reviews?.length > 0) {
        updatedStation.reviews[updatedStation.reviews.length - 1].photos = photos;
      }
      setStations(prev => prev.map(s => s.id === stationId ? updatedStation : s));
      if (selectedStation?.id === stationId) {
        setSelectedStation(updatedStation);
      }
      addToast('Feedback Published', `Thank you! ${photos.length > 0 ? `📷 ${photos.length} photo${photos.length > 1 ? 's' : ''} attached.` : 'Helping other EV drivers!'}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Publish Failed', 'Unable to submit review at this time.', 'warning');
    }
  };

  const handleReportPlug = async (stationId, type) => {
    try {
      const updatedStation = await api.reportPlug(stationId, type);
      setStations(prev => prev.map(s => s.id === stationId ? updatedStation : s));
      if (selectedStation?.id === stationId) {
        setSelectedStation(updatedStation);
      }
      const msg = type === 'broken' 
        ? 'Reported broken. Reliability index decreased.' 
        : 'Reported operational. Reliability index updated.';
      addToast('Status Logged', msg, type === 'broken' ? 'warning' : 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStation = async (stationId, details) => {
    try {
      const updatedStation = await api.updateStation(stationId, details);
      setStations(prev => prev.map(s => s.id === stationId ? updatedStation : s));
      if (selectedStation?.id === stationId) {
        setSelectedStation(updatedStation);
      }
      addToast('Station Updated', `${updatedStation.name} profile settings saved.`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Update Failed', 'Failed to update station details.', 'warning');
    }
  };

  const handleAddStation = async (stationDetails) => {
    try {
      const newStation = await api.addStation(stationDetails);
      setStations(prev => [...prev, newStation]);
      addToast('Station Added', `${newStation.name} has been launched successfully.`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Launch Failed', 'Failed to add the new charging station.', 'warning');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await api.cancelBooking(bookingId);
      const fetchedBookings = await api.getBookings();
      setBookings(fetchedBookings);
      addToast('Reservation Cancelled', 'Your booking was cancelled successfully.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookingSuccess = async (newBooking) => {
    setShowBookingModal(false);
    setBookingStation(null);
    const fetchedStations = await api.getStations();
    const fetchedBookings = await api.getBookings();
    setStations(fetchedStations);
    setBookings(fetchedBookings);
    addToast('Plug Reserved', `Charger booked at ${newBooking.stationName}.`, 'success');
  };

  const handleStartSimulation = (station = null, booking = null) => {
    if (station) {
      setBookingStation(station);
      setShowBookingModal(true);
    } else if (booking) {
      setActiveSimulatorBooking(booking);
    }
  };

  const handleSimulationEnd = async (simStats) => {
    if (!activeSimulatorBooking) return;

    try {
      await api.updateBooking(activeSimulatorBooking.id, {
        status: simStats.status || 'Completed',
        energyDelivered: simStats.energyDelivered,
        accumulatedCost: simStats.cost,
        paymentMethod: simStats.paymentMethod || 'SupPay Wallet',
        completedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to save booking updates to database:', err);
    }

    setActiveSimulatorBooking(null);

    const fetchedStations = await api.getStations();
    const fetchedBookings = await api.getBookings();
    const wallet = await api.getWalletBalance();
    setStations(fetchedStations);
    setBookings(fetchedBookings);
    setWalletBalance(wallet.balance);
  };

  const handleWalletTopup = async (amount) => {
    try {
      const wallet = await api.topupWallet(amount);
      setWalletBalance(wallet.balance);
      addToast('Wallet Refilled', `Added ₹${amount}. New balance: ₹${wallet.balance}`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  let mainContent;
  if (!currentUser) {
    mainContent = <AuthPortal onAuthSuccess={handleAuthSuccess} />;
  } else if (role === 'retailer') {
    mainContent = (
      <OperatorDashboard
        stations={stations}
        bookings={bookings}
        onLogout={handleLogout}
        currentUser={currentUser}
        onUpdateStation={handleUpdateStation}
        onAddStation={handleAddStation}
        addToast={addToast}
        theme={theme}
        toggleTheme={toggleTheme}
        withdrawnAmount={withdrawnAmount}
        setWithdrawnAmount={setWithdrawnAmount}
      />
    );
  } else {
    mainContent = (
      <div className="app-container">
        {/* Sidebar Control Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0 }}>
          
          {/* Top Header Card (Displays user status and Logout button) */}
          <div style={{
            padding: '16px 20px 0 20px',
            backgroundColor: 'var(--bg-main)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            zIndex: 20
          }}>
            {role === 'driver' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={handleScanQR}
                  className="hover-scale"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    border: 'none',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--color-primary-glow)'
                  }}
                >
                  <ScanLine size={14} />
                  SCAN QR
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <Wallet size={14} style={{ color: 'var(--color-primary)' }} />
                  <span>Wallet: <strong style={{ color: 'var(--color-primary)' }}>₹{walletBalance.toFixed(2)}</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-secondary)' }}>
                <ShieldAlert size={14} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontWeight: '700' }}>Operator Mode</span>
              </div>
            )}

            {/* User profile with theme toggle & logout action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-scale"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <button
                onClick={toggleLanguage}
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '800',
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-scale"
                title="Toggle Language"
              >
                {language}
              </button>
              <span 
                onClick={() => setShowProfileModal(true)}
                style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-secondary)', 
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px'
                }}
                className="hover-scale"
                title="Click to view profile details"
              >
                Hi, {currentUser.username.split(' ')[0]}
              </span>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255, 23, 68, 0.05)',
                  color: 'var(--color-danger)',
                  fontSize: '9px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-scale"
              >
                Sign Out
              </button>
            </div>
          </div>

          <Sidebar
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            onToggleFavorite={handleToggleFavorite}
            onRateStation={handleRateStation}
            bookings={bookings}
            onCancelBooking={handleCancelBooking}
            onStartSimulation={handleStartSimulation}
            routePoints={routePoints}
            onRouteSelect={setRoutePoints}
            onHighlightStations={setHighlightedStationIds}
            clearRoute={() => setRoutePoints(null)}
            highlightedStationIds={highlightedStationIds}
            role={role}
            onUpdateStation={handleUpdateStation}
            onSubmitReview={handleSubmitReview}
            onReportPlug={handleReportPlug}
            walletBalance={walletBalance}
            onWalletTopup={handleWalletTopup}
            currentUser={currentUser}
            savedCards={savedCards}
            setSavedCards={setSavedCards}
            savedUpis={savedUpis}
            setSavedUpis={setSavedUpis}
            savedRfids={savedRfids}
            setSavedRfids={setSavedRfids}
            topupTransactions={topupTransactions}
            setTopupTransactions={setTopupTransactions}
            userLocation={userLocation}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            addToast={addToast}
            language={language}
          />

          {/* Charge Simulator HUD Overlay */}
          {activeSimulatorBooking && (
            <div style={{ padding: '0 20px 20px 20px', backgroundColor: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', zIndex: 10 }}>
              <ChargingSimulator 
                activeBooking={activeSimulatorBooking}
                onSimulationEnd={handleSimulationEnd}
                addToast={addToast}
                walletBalance={walletBalance}
                savedCards={savedCards}
                savedUpis={savedUpis}
                savedRfids={savedRfids}
                selectedVehicle={selectedVehicle}
              />
            </div>
          )}
        </div>

        {/* Main Map Panel */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {loading ? (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(0, 180, 216, 0.1)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Locating network grids...
              </span>
            </div>
          ) : error ? (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center'
            }}>
              <ShieldAlert size={48} style={{ color: 'var(--color-danger)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Backend Offline</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          ) : (
            <>
              <LeafletMap 
                stations={stations}
                selectedStation={selectedStation}
                onSelectStation={handleSelectStation}
                routePoints={routePoints}
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                theme={theme}
              />

              {/* QR Scanner Modal Overlay */}
              <AnimatePresence>
                {showQRScanner && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      backdropFilter: 'blur(10px)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <button 
                      onClick={() => setShowQRScanner(false)}
                      style={{ position: 'absolute', top: '30px', right: '30px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      <X size={32} />
                    </button>
                    
                    <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '800', marginBottom: '40px' }}>
                      Scan Charger QR
                    </h2>

                    <div style={{
                      position: 'relative',
                      width: '280px',
                      height: '280px',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '24px',
                      overflow: 'hidden'
                    }}>
                      {/* Corner brackets */}
                      <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '40px', height: '40px', borderTop: '4px solid var(--color-primary)', borderLeft: '4px solid var(--color-primary)', borderRadius: '24px 0 0 0' }} />
                      <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '40px', height: '40px', borderTop: '4px solid var(--color-primary)', borderRight: '4px solid var(--color-primary)', borderRadius: '0 24px 0 0' }} />
                      <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '40px', height: '40px', borderBottom: '4px solid var(--color-primary)', borderLeft: '4px solid var(--color-primary)', borderRadius: '0 0 0 24px' }} />
                      <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '40px', height: '40px', borderBottom: '4px solid var(--color-primary)', borderRight: '4px solid var(--color-primary)', borderRadius: '0 0 24px 0' }} />
                      
                      {/* Scanning Laser Animation */}
                      <div style={{
                        position: 'absolute',
                        top: `${scanProgress}%`,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'var(--color-primary)',
                        boxShadow: '0 0 15px 4px var(--color-primary-glow)',
                        transition: 'top 0.15s ease-out'
                      }} />

                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.2 }}>
                        <ScanLine size={100} color="white" />
                      </div>
                    </div>
                    
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '30px', fontSize: '14px' }}>
                      Align QR code within the frame to start charging
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Booking Modal */}
        {showBookingModal && bookingStation && (
          <BookingModal
            station={bookingStation}
            onClose={() => {
              setShowBookingModal(false);
              setBookingStation(null);
            }}
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {/* User Profile Modal */}
        {showProfileModal && (
          <UserProfileModal 
            currentUser={currentUser}
            onClose={() => setShowProfileModal(false)}
            addToast={addToast}
          />
        )}

        {/* Toast Notification Container Overlay */}
        <div className="toasts-wrapper">
          {toasts.map(t => (
            <div key={t.id} className={`toast-item ${t.type}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px' }}>
                {t.type === 'success' && <CheckCircle size={16} style={{ color: '#00e676' }} />}
                {t.type === 'info' && <Info size={16} style={{ color: 'var(--color-primary)' }} />}
                {t.type === 'warning' && <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '800' }}>{t.title}</strong>
                  <button 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }}
                    onClick={() => removeToast(t.id)}
                  >
                    ×
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>
                  {t.message}
                </span>
              </div>
            </div>
          ))}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              overflow: 'hidden'
            }}
          >
            {/* Pulse Ring and Lightning Bolt Logo */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 80, delay: 0.2 }}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px var(--color-primary-glow)',
                marginBottom: '24px',
                position: 'relative'
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                <Zap size={48} color="#ffffff" fill="#ffffff" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '24px',
                  border: '2px solid var(--color-primary)',
                  pointerEvents: 'none'
                }}
              />
            </motion.div>

            {/* Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <h1 style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '36px',
                fontWeight: '900',
                margin: 0,
                letterSpacing: '-1px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px var(--color-primary-glow))'
              }}>
                Sup Charged
              </h1>
              <p style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                marginTop: '8px'
              }}>
                Smart Grid EV Network
              </p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              style={{ position: 'absolute', bottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
            >
              <div style={{ width: '180px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.8, ease: 'easeInOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}
                />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.08em' }}>
                INITIALIZING CORE POWER GRIDS...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {mainContent}
    </>
  );
}
