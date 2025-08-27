import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTable, FaTh } from 'react-icons/fa';
import { customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';

const Customers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  
  const isAdmin = user?.is_superuser === true || user?.username === 'admin';
  const [formData, setFormData] = useState({
    name: '',
    phone_no: '',
    email: '',
    address: '',
    national_id_no: '',
    credit_limit: 0,
    payment_terms_days: 30,
    outstanding_balance: 0,
    is_active: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (showModal) {
      const savedData = localStorage.getItem('customerFormData');
      if (savedData && !editingCustomer) {
        setFormData(JSON.parse(savedData));
      }
    }
  }, [showModal, editingCustomer]);

  useEffect(() => {
    if (showModal && !editingCustomer) {
      localStorage.setItem('customerFormData', JSON.stringify(formData));
    }
  }, [formData, showModal, editingCustomer]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      const customersData = response.data.results || response.data || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    if (!formData.phone_no.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }
    
    try {
      const cleanData = {
        name: formData.name.trim(),
        phone_no: formData.phone_no.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        national_id_no: formData.national_id_no.trim(),
        credit_limit: formData.credit_limit,
        payment_terms_days: formData.payment_terms_days,
        outstanding_balance: formData.outstanding_balance,
        is_active: formData.is_active
      };
      
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, cleanData);
        showToast('Customer updated successfully!', 'success');
      } else {
        await customersAPI.create(cleanData);
        showToast('Customer created successfully!', 'success');
      }
      fetchCustomers();
      localStorage.removeItem('customerFormData');
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Error saving customer. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone_no: customer.phone_no,
      email: customer.email || '',
      address: customer.address || '',
      national_id_no: customer.national_id_no || '',
      credit_limit: customer.credit_limit || 0,
      payment_terms_days: customer.payment_terms_days || 30,
      outstanding_balance: customer.outstanding_balance || 0,
      is_active: customer.is_active !== undefined ? customer.is_active : true
    });
    setShowModal(true);
  };

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await customersAPI.delete(customerToDelete.id);
      showToast('Customer deleted successfully!', 'success');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      showToast('Error deleting customer. Please try again.', 'error');
    }
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone_no: '',
      email: '',
      address: '',
      national_id_no: '',
      credit_limit: 0,
      payment_terms_days: 30,
      outstanding_balance: 0,
      is_active: true
    });
    setEditingCustomer(null);
    setShowModal(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_no.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="customers">
        <div className="card">
          <div className="loading">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="customers">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Customers</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Add Customer
          </button>
        </div>

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input search-input"
            />
          </div>
          <div className="view-toggle">
            <button 
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('table')}
            >
              <FaTable /> Table
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('cards')}
            >
              <FaTh /> Cards
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.account_code}</td>
                    <td>{customer.name}</td>
                    <td>{customer.phone_no}</td>
                    <td>{customer.email || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${(customer.customer_type || 'individual').toLowerCase()}`}>
                        {customer.customer_type || 'Individual'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-warning" onClick={() => handleEdit(customer)}>
                        <FaEdit />
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                          if (!isAdmin) {
                            showToast('Administrator access required to delete customers', 'warning');
                            return;
                          }
                          handleDelete(customer);
                        }}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="customer-card">
                <div className="card-content">
                  <h3>{customer.name}</h3>
                  <p className="customer-code">{customer.account_code}</p>
                  <div className="customer-info">
                    <p>📞 {customer.phone_no}</p>
                    <p>✉️ {customer.email || 'No email'}</p>
                    <p>🏠 {customer.address || 'No address'}</p>
                    <p>🆔 {customer.national_id_no || 'No ID'}</p>
                  </div>
                  <div className="customer-financial">
                    <p>💳 Credit Limit: ${customer.credit_limit || 0}</p>
                    <p>⏰ Payment Terms: {customer.payment_terms_days || 30} days</p>
                    <p className={customer.outstanding_balance > 0 ? 'outstanding-balance' : ''}>
                      💰 Balance: ${customer.outstanding_balance || 0}
                    </p>
                  </div>
                  <div className="customer-status">
                    <span className={`status-badge ${customer.is_active ? 'status-active' : 'status-inactive'}`}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <p className="customer-since">
                      📅 Customer since: {new Date(customer.date_created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-sm btn-warning" onClick={() => handleEdit(customer)}>
                      <FaEdit />
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Administrator access required to delete customers', 'warning');
                          return;
                        }
                        handleDelete(customer);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter full customer name"
                  maxLength={200}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
                <small className="form-help">{formData.name.length}/200 characters</small>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +263771234567"
                    maxLength={20}
                    value={formData.phone_no}
                    onChange={(e) => setFormData({...formData, phone_no: e.target.value})}
                    required
                  />
                  <small className="form-help">{formData.phone_no.length}/20 characters</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">National ID</label>
                <input
                  type="text"
                  className={`form-input ${formData.national_id_no.length > 12 ? 'error' : ''}`}
                  placeholder="Enter 12-digit Zim National ID"
                  maxLength={12}
                  value={formData.national_id_no}
                  onChange={(e) => setFormData({...formData, national_id_no: e.target.value.replace(/\D/g, '')})}
                />
                <small className={`form-help ${formData.national_id_no.length > 12 ? 'error' : ''}`}>
                  {formData.national_id_no.length}/12 digits {formData.national_id_no.length > 12 && '- Too long!'}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Enter customer address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Credit Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    placeholder="30"
                    value={formData.payment_terms_days}
                    onChange={(e) => setFormData({...formData, payment_terms_days: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Outstanding Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.outstanding_balance}
                    onChange={(e) => setFormData({...formData, outstanding_balance: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{customerToDelete?.name}</strong>?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Customers;