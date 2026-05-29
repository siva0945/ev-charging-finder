const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load initial stations from database
const STATIONS_FILE = path.join(__dirname, 'data', 'stations.json');
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json');
const WALLET_FILE = path.join(__dirname, 'data', 'wallet.json');
let stations = [];
let bookings = [];

// Default wallet data
let walletData = {
  balance: 1500.00,
  withdrawnAmount: 0,
  transactions: [
    { id: 'topup-init', type: 'Wallet Topup', amount: 1500, date: '2026-05-20', funding: 'Visa ****5678' }
  ],
  savedCards: [
    { id: 'card-1', number: '4532789012345678', expiry: '12/28', cvv: '123', holder: 'Bangalore Rider', brand: 'Visa' },
    { id: 'card-2', number: '6071829304152637', expiry: '06/29', cvv: '987', holder: 'Bangalore Rider', brand: 'RuPay' }
  ],
  savedUpis: [
    { id: 'upi-1', address: 'rider@okaxis' },
    { id: 'upi-2', address: '9876543210@paytm' }
  ]
};

try {
  const data = fs.readFileSync(STATIONS_FILE, 'utf8');
  stations = JSON.parse(data);
  console.log(`Loaded ${stations.length} stations from data store.`);
} catch (error) {
  console.error('Failed to load stations data. Using default empty array.', error);
}

try {
  if (fs.existsSync(BOOKINGS_FILE)) {
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    bookings = JSON.parse(data);
    console.log(`Loaded ${bookings.length} bookings from data store.`);
  } else {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
} catch (error) {
  console.error('Failed to load bookings data. Using default empty array.', error);
}

try {
  if (fs.existsSync(WALLET_FILE)) {
    const data = fs.readFileSync(WALLET_FILE, 'utf8');
    walletData = JSON.parse(data);
  } else {
    fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2), 'utf8');
  }
} catch (error) {
  console.error('Failed to load wallet data.', error);
}

// Helper to save wallet to file
const saveWalletToFile = () => {
  try {
    fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to wallet database:', error);
  }
};

// Helper to save stations to file
const saveStationsToFile = () => {
  try {
    fs.writeFileSync(STATIONS_FILE, JSON.stringify(stations, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to stations database:', error);
  }
};

// Helper to save bookings to file
const saveBookingsToFile = () => {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to bookings database:', error);
  }
};

// Users mock database
let users = [
  { username: 'Rider Bangalore', email: 'driver@sup.in', password: 'password', role: 'driver', phone: '+91 9876543210' },
  { username: 'Tata Operator', email: 'operator@sup.in', password: 'password', role: 'retailer', phone: '+91 9123456780' }
];

// Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, role, phone } = req.body;
  if (!username || !email || !password || !role || !phone) {
    return res.status(400).json({ message: 'All registration fields are required.' });
  }
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ message: 'An account with this email already exists.' });
  }
  const newUser = { username, email, password, role, phone };
  users.push(newUser);
  res.status(201).json({ username, email, role, phone });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Credentials and role type required.' });
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'No account associated with this email.' });
  }
  if (user.password !== password) {
    return res.status(401).json({ message: 'Incorrect password.' });
  }
  if (user.role !== role) {
    const label = user.role === 'driver' ? 'Driver' : 'Operator';
    return res.status(403).json({ message: `Access Denied: This account is registered as a ${label}. Please use the ${label} login portal.` });
  }
  res.json({ username: user.username, email: user.email, role: user.role, phone: user.phone });
});

app.post('/api/auth/change-password', (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'All password fields are required.' });
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (user.password !== currentPassword) {
    return res.status(400).json({ message: 'Incorrect current password.' });
  }
  user.password = newPassword;
  res.json({ message: 'Password updated successfully.' });
});

// Endpoints

// 1. GET /api/stations - Fetch all stations
app.get('/api/stations', (req, res) => {
  res.json(stations);
});

// 2. GET /api/stations/:id - Fetch single station
app.get('/api/stations/:id', (req, res) => {
  const station = stations.find(s => s.id === req.params.id);
  if (station) {
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 3. POST /api/stations/:id/favorite - Toggle favorite
app.post('/api/stations/:id/favorite', (req, res) => {
  const station = stations.find(s => s.id === req.params.id);
  if (station) {
    station.isFavorite = !station.isFavorite;
    saveStationsToFile();
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 4. POST /api/stations/:id/rate - Rate a station (Legacy/Quick rate)
app.post('/api/stations/:id/rate', (req, res) => {
  const { rating } = req.body;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
  }

  const station = stations.find(s => s.id === req.params.id);
  if (station) {
    const currentRating = station.rating || 4.0;
    station.rating = Math.round(((currentRating * 9 + rating) / 10) * 10) / 10;
    saveStationsToFile();
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 5. POST /api/stations/:id/reviews - Submit review comments
app.post('/api/stations/:id/reviews', (req, res) => {
  const { username, rating, comment } = req.body;
  const ratingNum = parseFloat(rating);
  
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const station = stations.find(s => s.id === req.params.id);
  if (station) {
    const newReview = {
      username: username || 'EV Driver',
      rating: ratingNum,
      comment: comment || '',
      date: new Date().toISOString().split('T')[0]
    };
    
    if (!station.reviews) station.reviews = [];
    station.reviews.unshift(newReview);
    
    // Recalculate average rating
    const total = station.reviews.reduce((acc, r) => acc + r.rating, 0);
    station.rating = parseFloat((total / station.reviews.length).toFixed(1));
    
    saveStationsToFile();
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 6. POST /api/stations/:id/report - Report plug status (Reliability index)
app.post('/api/stations/:id/report', (req, res) => {
  const { type } = req.body; // 'working' or 'broken'
  const station = stations.find(s => s.id === req.params.id);
  
  if (station) {
    if (type === 'broken') {
      station.reliability = Math.max(10, (station.reliability || 90) - 8);
    } else {
      station.reliability = Math.min(100, (station.reliability || 90) + 3);
    }
    saveStationsToFile();
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 6b. POST /api/stations - Add a new station
app.post('/api/stations', (req, res) => {
  const { name, address, lat, lng, operator, gridStatus, openingHours, amenities, connectors } = req.body;
  
  if (!name || !address || !operator || !connectors || !connectors.length) {
    return res.status(400).json({ message: 'Station name, address, operator, and at least one connector details are required.' });
  }

  const newStation = {
    id: `station-${Date.now()}`,
    name,
    address,
    lat: parseFloat(lat) || (12.9716 + (Math.random() * 0.1 - 0.05)),
    lng: parseFloat(lng) || (77.5946 + (Math.random() * 0.1 - 0.05)),
    operator,
    rating: 5.0,
    reliability: 100,
    gridStatus: gridStatus || 'Stable Grid',
    queueLength: 0,
    peakHours: [10, 15, 20, 45, 60, 80, 95, 90, 75, 50, 30, 10],
    amenities: amenities || ['WiFi'],
    connectors: connectors.map(c => ({
      type: c.type,
      power: parseInt(c.power) || 50,
      price: parseFloat(c.price) || 18.0,
      status: c.status || 'Available',
      count: parseInt(c.count) || 1
    })),
    status: 'Available',
    isFavorite: false,
    reviews: []
  };

  if (openingHours) {
    newStation.openingHours = openingHours;
  }

  stations.push(newStation);
  saveStationsToFile();
  
  res.status(201).json(newStation);
});

// 7. PUT /api/stations/:id - Update station details (Retailer console)
app.put('/api/stations/:id', (req, res) => {
  const { name, address, basePrice, gridStatus, connectorsStatus, openingHours, connectors } = req.body;
  const stationIndex = stations.findIndex(s => s.id === req.params.id);
  
  if (stationIndex !== -1) {
    const station = stations[stationIndex];
    if (name) station.name = name;
    if (address) station.address = address;
    if (gridStatus) station.gridStatus = gridStatus;
    if (openingHours !== undefined) station.openingHours = openingHours;
    
    if (connectors && Array.isArray(connectors)) {
      station.connectors = connectors.map(c => ({
        type: c.type,
        power: parseInt(c.power) || 50,
        price: parseFloat(c.price) || 18.0,
        status: c.status || 'Available',
        count: parseInt(c.count) || 1
      }));
    } else {
      if (basePrice !== undefined) {
        const priceNum = parseFloat(basePrice);
        if (!isNaN(priceNum)) {
          station.connectors = station.connectors.map(c => ({
            ...c,
            price: priceNum
          }));
        }
      }

      if (connectorsStatus) {
        // Expecting array of { type, status }
        connectorsStatus.forEach(statusObj => {
          const connector = station.connectors.find(c => c.type === statusObj.type);
          if (connector) {
            connector.status = statusObj.status;
          }
        });
      }
    }

    // Refresh overall station availability status
    const allStatuses = station.connectors.map(c => c.status);
    if (allStatuses.every(s => s === 'Offline')) {
      station.status = 'Offline';
    } else if (allStatuses.some(s => s === 'Available')) {
      station.status = 'Available';
    } else {
      station.status = 'In Use';
    }

    saveStationsToFile();
    res.json(station);
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 8. POST /api/stations/:id/connector-status - Update status for simulation
app.post('/api/stations/:id/connector-status', (req, res) => {
  const { connectorType, status } = req.body; // status: 'Available', 'In Use', 'Offline'
  const station = stations.find(s => s.id === req.params.id);
  
  if (station) {
    const connector = station.connectors.find(c => c.type === connectorType);
    if (connector) {
      connector.status = status;
      
      const allStatuses = station.connectors.map(c => c.status);
      if (allStatuses.every(s => s === 'Offline')) {
        station.status = 'Offline';
      } else if (allStatuses.some(s => s === 'Available')) {
        station.status = 'Available';
      } else {
        station.status = 'In Use';
      }
      
      saveStationsToFile();
      res.json(station);
    } else {
      res.status(404).json({ message: 'Connector not found' });
    }
  } else {
    res.status(404).json({ message: 'Station not found' });
  }
});

// 9. GET /api/bookings - Get all bookings
app.get('/api/bookings', (req, res) => {
  res.json(bookings);
});

// 10. POST /api/bookings - Create new booking
app.post('/api/bookings', (req, res) => {
  const { stationId, connectorType, timeSlot } = req.body;
  if (!stationId || !connectorType || !timeSlot) {
    return res.status(400).json({ message: 'Missing booking parameters' });
  }

  const station = stations.find(s => s.id === stationId);
  if (!station) {
    return res.status(404).json({ message: 'Station not found' });
  }

  const connector = station.connectors.find(c => c.type === connectorType);
  if (!connector) {
    return res.status(404).json({ message: 'Connector not found' });
  }

  if (connector.status === 'Offline') {
    return res.status(400).json({ message: 'Connector is currently offline' });
  }

  const newBooking = {
    id: `booking-${Date.now()}`,
    stationId,
    stationName: station.name,
    address: station.address,
    connectorType,
    timeSlot,
    priceRate: connector.price,
    powerKwh: connector.power,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);
  saveBookingsToFile();
  res.status(201).json(newBooking);
});

// 11. DELETE /api/bookings/:id - Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === req.params.id);
  if (bookingIndex !== -1) {
    bookings[bookingIndex].status = 'Cancelled';
    saveBookingsToFile();
    res.json({ message: 'Booking cancelled successfully', booking: bookings[bookingIndex] });
  } else {
    res.status(404).json({ message: 'Booking not found' });
  }
});

// 11b. PUT /api/bookings/:id - Update booking status and details (payment completion)
app.put('/api/bookings/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === req.params.id);
  if (bookingIndex !== -1) {
    const { status, energyDelivered, accumulatedCost, paymentMethod, completedAt, targetSOC, prepaidAmount, refundAmount, pluggedInAt } = req.body;
    
    if (status) bookings[bookingIndex].status = status;
    if (energyDelivered !== undefined) bookings[bookingIndex].energyDelivered = parseFloat(energyDelivered);
    if (accumulatedCost !== undefined) bookings[bookingIndex].accumulatedCost = parseFloat(accumulatedCost);
    if (paymentMethod !== undefined) bookings[bookingIndex].paymentMethod = paymentMethod;
    if (targetSOC !== undefined) bookings[bookingIndex].targetSOC = parseFloat(targetSOC);
    if (prepaidAmount !== undefined) bookings[bookingIndex].prepaidAmount = parseFloat(prepaidAmount);
    if (refundAmount !== undefined) bookings[bookingIndex].refundAmount = parseFloat(refundAmount);
    if (pluggedInAt !== undefined) bookings[bookingIndex].pluggedInAt = pluggedInAt;
    if (completedAt !== undefined) bookings[bookingIndex].completedAt = completedAt;
    else if (status === 'Completed') bookings[bookingIndex].completedAt = new Date().toISOString();
    
    saveBookingsToFile();
    res.json(bookings[bookingIndex]);
  } else {
    res.status(404).json({ message: 'Booking not found' });
  }
});

// Wallet Simulator API Endpoints
app.get('/api/wallet/data', (req, res) => {
  res.json(walletData);
});

app.post('/api/wallet/pay', (req, res) => {
  const { amount } = req.body;
  const payAmount = parseFloat(amount);
  
  if (isNaN(payAmount) || payAmount < 0) {
    return res.status(400).json({ message: 'Invalid payment amount' });
  }

  if (walletData.balance >= payAmount) {
    walletData.balance = parseFloat((walletData.balance - payAmount).toFixed(2));
    saveWalletToFile();
    res.json({ success: true, balance: walletData.balance });
  } else {
    res.status(400).json({ success: false, message: 'Insufficient balance in SupPay Wallet. Please reload credit.' });
  }
});

app.post('/api/wallet/topup', (req, res) => {
  const { amount } = req.body;
  const addAmount = parseFloat(amount);
  
  if (isNaN(addAmount) || addAmount <= 0) {
    return res.status(400).json({ message: 'Invalid topup amount' });
  }

  walletData.balance = parseFloat((walletData.balance + addAmount).toFixed(2));
  walletData.transactions.unshift({
    id: `topup-${Date.now()}`,
    type: 'Wallet Topup',
    amount: addAmount,
    date: new Date().toISOString().split('T')[0],
    funding: 'Linked Payment Method'
  });
  saveWalletToFile();
  res.json({ success: true, balance: walletData.balance, transactions: walletData.transactions });
});

// Operator Payout API
app.post('/api/wallet/withdraw', (req, res) => {
  const { amount } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ message: 'Invalid withdrawal amount' });
  }

  walletData.withdrawnAmount = parseFloat(((walletData.withdrawnAmount || 0) + withdrawAmount).toFixed(2));
  saveWalletToFile();
  res.json({ success: true, withdrawnAmount: walletData.withdrawnAmount });
});

// Serve static frontend files if they exist in public
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Sup Charged API Server is running on port ${PORT}`);
});
