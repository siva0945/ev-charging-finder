const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  return response.json();
};

export const api = {
  // Fetch all charging stations
  async getStations() {
    const res = await fetch(`${API_BASE_URL}/stations`);
    return handleResponse(res);
  },

  // Fetch a single charging station
  async getStationById(id) {
    const res = await fetch(`${API_BASE_URL}/stations/${id}`);
    return handleResponse(res);
  },

  // Toggle favorite flag
  async toggleFavorite(id) {
    const res = await fetch(`${API_BASE_URL}/stations/${id}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  // Submit user rating (Legacy/Quick rate)
  async rateStation(id, rating) {
    const res = await fetch(`${API_BASE_URL}/stations/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    return handleResponse(res);
  },

  // Submit detailed review with comments
  async submitReview(stationId, username, rating, comment) {
    const res = await fetch(`${API_BASE_URL}/stations/${stationId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, rating, comment })
    });
    return handleResponse(res);
  },

  // Report charger plug reliability (working vs broken)
  async reportPlug(stationId, type) {
    const res = await fetch(`${API_BASE_URL}/stations/${stationId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }) // type: 'working' or 'broken'
    });
    return handleResponse(res);
  },

  // Retailer API: Update station settings
  async updateStation(stationId, details) {
    const res = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    return handleResponse(res);
  },

  // Retailer API: Add new charging station
  async addStation(details) {
    const res = await fetch(`${API_BASE_URL}/stations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    return handleResponse(res);
  },

  // Update connector availability status (used in live simulator)
  async updateConnectorStatus(stationId, connectorType, status) {
    const res = await fetch(`${API_BASE_URL}/stations/${stationId}/connector-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorType, status })
    });
    return handleResponse(res);
  },

  // Get list of reservations
  async getBookings() {
    const res = await fetch(`${API_BASE_URL}/bookings`);
    return handleResponse(res);
  },

  // Create a reservation booking
  async createBooking(stationId, connectorType, timeSlot) {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId, connectorType, timeSlot })
    });
    return handleResponse(res);
  },

  // Cancel reservation booking
  async cancelBooking(bookingId) {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  // Update booking status and details (payment completion)
  async updateBooking(bookingId, details) {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });
    return handleResponse(res);
  },

  // Get wallet data
  async getWalletData() {
    const res = await fetch(`${API_BASE_URL}/wallet/data`);
    return handleResponse(res);
  },

  // Pay simulated funds
  async payWallet(amount) {
    const res = await fetch(`${API_BASE_URL}/wallet/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  // Top up simulated wallet balance
  async topupWallet(amount) {
    const res = await fetch(`${API_BASE_URL}/wallet/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  // Withdraw funds for operators
  async withdrawFunds(amount) {
    const res = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  // Auth: Login
  async login(email, password, role) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    return handleResponse(res);
  },

  // Auth: Register
  async register(username, email, password, role, phone) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role, phone })
    });
    return handleResponse(res);
  },

  // Auth: Change Password
  async changePassword(email, currentPassword, newPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, currentPassword, newPassword })
    });
    return handleResponse(res);
  }
};
