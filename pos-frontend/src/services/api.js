import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://127.0.0.1:8000/media';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  // Include credentials for session-based auth
  config.withCredentials = true;
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories/'),
  getById: (id) => api.get(`/categories/${id}/`),
  create: (data) => api.post('/categories/', data),
  update: (id, data) => api.put(`/categories/${id}/`, data),
  delete: (id) => api.delete(`/categories/${id}/`),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products/'),
  search: (query) => api.get(`/products/?search=${encodeURIComponent(query)}`),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers/'),
  getById: (id) => api.get(`/customers/${id}/`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.put(`/customers/${id}/`, data),
  delete: (id) => api.delete(`/customers/${id}/`),
};

// Resellers API
export const resellersAPI = {
  getAll: () => api.get('/resellers/'),
  getById: (id) => api.get(`/resellers/${id}/`),
  create: (data) => api.post('/resellers/', data),
  update: (id, data) => api.put(`/resellers/${id}/`, data),
  delete: (id) => api.delete(`/resellers/${id}/`),
};

// Transactions API
export const transactionsAPI = {
  getAll: () => api.get('/transactions/'),
  getById: (id) => api.get(`/transactions/${id}/`),
  create: (data) => api.post('/transactions/', data),
  update: (id, data) => api.put(`/transactions/${id}/`, data),
  delete: (id) => api.delete(`/transactions/${id}/`),
};

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  getUser: () => api.get('/auth/user/'),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/dashboard/'),
  getDailySummary: () => api.get('/daily-summaries/'),
  getProfitLoss: () => api.get('/profit-loss-reports/'),
  getReports: (type) => api.get(`/reports/?type=${type}`),
};

// Receipts API
export const receiptsAPI = {
  getAll: () => api.get('/receipts/'),
  getById: (id) => api.get(`/receipts/${id}/`),
  printReceipt: (id) => api.get(`/receipts/${id}/print_receipt/`),
  downloadPdf: (id) => api.get(`/receipts/${id}/download_pdf/`, { responseType: 'blob' }),
};

// Invoices API
export const invoicesAPI = {
  getAll: () => api.get('/invoices/'),
  getById: (id) => api.get(`/invoices/${id}/`),
  create: (data) => api.post('/invoices/', data),
  update: (id, data) => api.put(`/invoices/${id}/`, data),
  delete: (id) => api.delete(`/invoices/${id}/`),
};

// Business Profile API
export const businessAPI = {
  getProfile: () => api.get('/business-profile/'),
  updateProfile: (id, data) => api.put(`/business-profile/${id}/`, data),
};

// Stock Movement API
export const stockMovementAPI = {
  getAll: () => api.get('/stock-movements/'),
  getById: (id) => api.get(`/stock-movements/${id}/`),
  create: (data) => api.post('/stock-movements/', data),
  update: (id, data) => api.put(`/stock-movements/${id}/`, data),
  delete: (id) => api.delete(`/stock-movements/${id}/`),
};

// Stock Take API
export const stockTakeAPI = {
  getAll: () => api.get('/stock-takes/'),
  getById: (id) => api.get(`/stock-takes/${id}/`),
  create: (data) => api.post('/stock-takes/', data),
  update: (id, data) => api.put(`/stock-takes/${id}/`, data),
  delete: (id) => api.delete(`/stock-takes/${id}/`),
};

// Expenses API
export const expensesAPI = {
  getAll: () => api.get('/expenses/'),
  getById: (id) => api.get(`/expenses/${id}/`),
  create: (data) => api.post('/expenses/', data),
  update: (id, data) => api.put(`/expenses/${id}/`, data),
  delete: (id) => api.delete(`/expenses/${id}/`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications/'),
  getById: (id) => api.get(`/notifications/${id}/`),
  create: (data) => api.post('/notifications/', data),
  update: (id, data) => api.put(`/notifications/${id}/`, data),
  delete: (id) => api.delete(`/notifications/${id}/`),
  markAsRead: (id) => api.patch(`/notifications/${id}/`, { is_read: true }),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  deleteAll: () => api.delete('/notifications/delete_all/'),
  createTestNotifications: () => api.post('/notifications/create_test_notifications/'),
};

// Payment Collections API
export const paymentCollectionsAPI = {
  getAll: () => api.get('/payment-collections/'),
  getById: (id) => api.get(`/payment-collections/${id}/`),
  create: (data) => api.post('/payment-collections/', data),
  update: (id, data) => api.put(`/payment-collections/${id}/`, data),
  delete: (id) => api.delete(`/payment-collections/${id}/`),
  markPaid: (id) => api.post(`/payment-collections/${id}/mark_paid/`),
  markCollected: (id) => api.post(`/payment-collections/${id}/mark_collected/`),
  createTestCollections: () => api.post('/payment-collections/create_test_collections/'),
};

export { MEDIA_BASE_URL };
export default api;