import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTable, FaTh } from 'react-icons/fa';
import { resellersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';

const Resellers = () => {
  const { user } = useAuth();
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReseller, setEditingReseller] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState(null);
  
  const isAdmin = user?.is_superuser === true || user?.username === 'admin';
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone_no: '',
    email: '',
    national_id_no: '',
    address: '',
    settlement_mode: 'PRICE_DIFFERENCE',
    commission_rate_pct: 0,
    current_balance: 0,
    credit_limit: 0,
    payment_terms_days: 30,
    outstanding_balance: 0,
    bank_details: '',
    is_active: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (showModal) {
      const savedData = localStorage.getItem('resellerFormData');
      if (savedData && !editingReseller) {
        setFormData(JSON.parse(savedData));
      }
    }
  }, [showModal, editingReseller]);

  useEffect(() => {
    if (showModal && !editingReseller) {
      localStorage.setItem('resellerFormData', JSON.stringify(formData));
    }
  }, [formData, showModal, editingReseller]);

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const response = await resellersAPI.getAll();
      const resellersData = response.data.results || response.data || [];
      setResellers(resellersData);
    } catch (error) {
      console.error('Error fetching resellers:', error);
      setResellers([]);
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
    try {
      if (editingReseller) {
        await resellersAPI.update(editingReseller.id, formData);
        showToast('Reseller updated successfully!', 'success');
      } else {
        await resellersAPI.create(formData);
        showToast('Reseller created successfully!', 'success');
      }
      fetchResellers();
      localStorage.removeItem('resellerFormData');
      resetForm();
    } catch (error) {
      console.error('Error saving reseller:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Error saving reseller. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      company_name: reseller.company_name || '',
      phone_no: reseller.phone_no || '',
      email: reseller.email || '',
      national_id_no: reseller.national_id_no || '',
      address: reseller.address || '',
      settlement_mode: reseller.settlement_mode,
      commission_rate_pct: reseller.commission_rate_pct || 0,
      current_balance: reseller.current_balance || 0,
      credit_limit: reseller.credit_limit || 0,
      payment_terms_days: reseller.payment_terms_days || 30,
      outstanding_balance: reseller.outstanding_balance || 0,
      bank_details: reseller.bank_details || '',
      is_active: reseller.is_active !== undefined ? reseller.is_active : true
    });
    setShowModal(true);
  };

  const handleDelete = (reseller) => {
    setResellerToDelete(reseller);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await resellersAPI.delete(resellerToDelete.id);
      showToast('Reseller deleted successfully!', 'success');
      fetchResellers();
    } catch (error) {
      console.error('Error deleting reseller:', error);
      showToast('Error deleting reseller. Please try again.', 'error');
    }
    setShowDeleteModal(false);
    setResellerToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      phone_no: '',
      email: '',
      national_id_no: '',
      address: '',
      settlement_mode: 'PRICE_DIFFERENCE',
      commission_rate_pct: 0,
      current_balance: 0,
      credit_limit: 0,
      payment_terms_days: 30,
      outstanding_balance: 0,
      bank_details: '',
      is_active: true
    });
    setEditingReseller(null);
    setShowModal(false);
  };

  const filteredResellers = resellers.filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reseller.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reseller.phone_no || '').includes(searchTerm) ||
    (reseller.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="resellers">
        <div className="card">
          <div className="loading">Loading resellers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="resellers">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Resellers</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Add Reseller
          </button>
        </div>

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search resellers..."
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
                  <th>Name</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Settlement</th>
                  <th>Commission</th>
                  <th>Reseller Balance</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResellers.map((reseller) => (
                  <tr key={reseller.id}>
                    <td>{reseller.name}</td>
                    <td>{reseller.company_name || 'N/A'}</td>
                    <td>{reseller.phone_no}</td>
                    <td>{reseller.settlement_mode.replace('_', ' ')}</td>
                    <td>{reseller.commission_rate_pct}%</td>
                    <td>${reseller.calculated_reseller_balance || '0.00'}</td>
                    <td>${reseller.outstanding_balance}</td>
                    <td>
                      <button className="btn btn-sm btn-warning" onClick={() => handleEdit(reseller)}>
                        <FaEdit />
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                          if (!isAdmin) {
                            showToast('Administrator access required to delete resellers', 'warning');
                            return;
                          }
                          handleDelete(reseller);
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
            {filteredResellers.map((reseller) => (
              <div key={reseller.id} className="reseller-card">
                <div className="card-content">
                  <h3>{reseller.name}</h3>
                  <p className="reseller-company">{reseller.company_name || 'No company'}</p>
                  <div className="reseller-info">
                    <p>📞 {reseller.phone_no}</p>
                    <p>✉️ {reseller.email}</p>
                  </div>
                  <div className="reseller-financial">
                    <p>💼 {reseller.settlement_mode.replace('_', ' ')}</p>
                    <p>💰 Commission: {reseller.commission_rate_pct}%</p>
                    <p>🏦 Reseller Balance: ${reseller.calculated_reseller_balance || '0.00'}</p>
                    <p>💳 Outstanding: ${reseller.outstanding_balance}</p>
                    <p>⏰ Payment Terms: {reseller.payment_terms_days} days</p>
                  </div>
                  <div className="reseller-status">
                    <span className={`status-badge ${reseller.is_active ? 'status-active' : 'status-inactive'}`}>
                      {reseller.is_active ? 'Active' : 'Inactive'}
                    </span>

                  </div>
                  <div className="card-actions">
                    <button className="btn btn-sm btn-warning" onClick={() => handleEdit(reseller)}>
                      <FaEdit />
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Administrator access required to delete resellers', 'warning');
                          return;
                        }
                        handleDelete(reseller);
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
              <h2>{editingReseller ? 'Edit Reseller' : 'Add New Reseller'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-instructions">
                <p className="instruction-text">
                  📋 <strong>Reseller Information:</strong> Add installers, dealers, or partners who sell your products. 
                  Account codes are automatically generated (RESL-YEAR-NUMBER format).
                </p>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Reseller Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., John Smith, ABC Solar Installers"
                    required
                  />
                  <small className="form-help">Individual name or business name of the reseller</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="e.g., Solar Solutions Ltd, Green Energy Co"
                  />
                  <small className="form-help">Optional: Registered company name if different from reseller name</small>
                </div>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone_no}
                    onChange={(e) => setFormData({...formData, phone_no: e.target.value})}
                    placeholder="e.g., +263771234567"
                    maxLength="20"
                    required
                  />
                  <small className="form-help">{formData.phone_no.length}/20 characters</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="e.g., john@solarsolutions.com"
                  />
                  <small className="form-help">Optional: Email address for communication</small>
                </div>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">National ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.national_id_no}
                    onChange={(e) => setFormData({...formData, national_id_no: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                    placeholder="Enter 12-digit Zim National ID"
                    maxLength="12"
                  />
                  <small className="form-help">{formData.national_id_no.length}/12 digits</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Physical address or location"
                  />
                  <small className="form-help">Optional: Physical address or location</small>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">💰 Commission & Payment Settings</h3>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Settlement Mode</label>
                    <select
                      className="form-input"
                      value={formData.settlement_mode}
                      onChange={(e) => setFormData({...formData, settlement_mode: e.target.value})}
                    >
                      <option value="PRICE_DIFFERENCE">Price Difference</option>
                      <option value="PERCENT_COMMISSION">Percentage Commission</option>
                    </select>
                    <small className="form-help">
                      <strong>Price Difference:</strong> Reseller keeps difference between dealership and sale price<br/>
                      <strong>Percentage:</strong> Reseller gets fixed percentage of sale amount
                    </small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-input"
                      value={formData.commission_rate_pct}
                      onChange={(e) => setFormData({...formData, commission_rate_pct: parseFloat(e.target.value) || 0})}
                      placeholder="e.g., 10.5"
                    />
                    <small className="form-help">Only applies to Percentage Commission mode. Enter rate as percentage (e.g., 10 for 10%)</small>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Current Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({...formData, current_balance: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                  <small className="form-help">Current amount owed to or by the reseller. Positive = we owe them, Negative = they owe us</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                  <small className="form-help">Maximum credit amount allowed for this reseller</small>
                </div>
              </div>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    value={formData.payment_terms_days}
                    onChange={(e) => setFormData({...formData, payment_terms_days: parseInt(e.target.value) || 30})}
                    placeholder="30"
                  />
                  <small className="form-help">Number of days to settle payments (typically 30, 60, or 90 days)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Outstanding Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.outstanding_balance}
                    onChange={(e) => setFormData({...formData, outstanding_balance: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                  <small className="form-help">Current amount owed by the reseller. Positive = they owe us, Negative = we owe them</small>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Bank Details</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.bank_details}
                  onChange={(e) => setFormData({...formData, bank_details: e.target.value})}
                  placeholder="Bank: CBZ Bank&#10;Account Name: John Smith&#10;Account Number: 12345678901&#10;Branch: Harare Main Branch"
                />
                <small className="form-help">Bank account information for commission payments. Include bank name, account number, and branch.</small>
              </div>
              
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                >
                  <option value="true">✅ Active</option>
                  <option value="false">❌ Inactive</option>
                </select>
                <small className="form-help">Inactive resellers cannot make new sales but existing records remain accessible</small>
              </div>
              
              {!editingReseller && (
                <div className="form-warning">
                  <p className="warning-text">
                    ⚠️ <strong>Important:</strong> Once created, the reseller account code cannot be changed. 
                    Ensure all information is correct before saving.
                  </p>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingReseller ? '💾 Update Reseller' : '➕ Create Reseller'}
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
              <p>Are you sure you want to delete <strong>{resellerToDelete?.name}</strong>?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete Reseller
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

export default Resellers;