import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaBoxOpen, FaCheck, FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaClock, FaExclamationTriangle, FaSearch, FaTable, FaTh } from 'react-icons/fa';
import { paymentCollectionsAPI, customersAPI, resellersAPI } from '../services/api';
import Toast from '../components/Toast';

const PaymentsCollections = () => {
  const [collections, setCollections] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [resellerSearch, setResellerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showResellerDropdown, setShowResellerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    collection_type: 'CUSTOMER_DEBT',
    customer: '',
    reseller: '',
    amount: '',
    due_date: '',
    reminder_date: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.form-group')) {
        setShowCustomerDropdown(false);
        setShowResellerDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [collectionsRes, customersRes, resellersRes] = await Promise.all([
        paymentCollectionsAPI.getAll(),
        customersAPI.getAll(),
        resellersAPI.getAll()
      ]);
      
      const collectionsData = collectionsRes.data?.results || collectionsRes.data || [];
      const customersData = customersRes.data?.results || customersRes.data || [];
      const resellersData = resellersRes.data?.results || resellersRes.data || [];
      
      // Debug: Log the first collection to see its structure
      if (collectionsData.length > 0) {
        console.log('Sample collection data:', collectionsData[0]);
      }
      
      setCollections(collectionsData);
      setCustomers(customersData);
      setResellers(resellersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data', 'error');
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
      if (editingItem) {
        await paymentCollectionsAPI.update(editingItem.id, formData);
        showToast('Updated successfully');
      } else {
        await paymentCollectionsAPI.create(formData);
        showToast('Created successfully');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      showToast('Error saving data', 'error');
    }
  };

  const markAsPaid = async (id) => {
    try {
      await paymentCollectionsAPI.markPaid(id);
      showToast('Marked as paid');
      fetchData();
    } catch (error) {
      showToast('Error updating status', 'error');
    }
  };

  const markAsCollected = async (id) => {
    try {
      await paymentCollectionsAPI.markCollected(id);
      showToast('Marked as collected');
      fetchData();
    } catch (error) {
      showToast('Error updating status', 'error');
    }
  };

  const createTestData = async () => {
    try {
      const response = await paymentCollectionsAPI.createTestCollections();
      showToast(`${response.data.status}`);
      fetchData();
    } catch (error) {
      showToast('Error creating test data', 'error');
    }
  };



  const resetForm = () => {
    setFormData({
      collection_type: 'CUSTOMER_DEBT',
      customer: '',
      reseller: '',
      amount: '',
      due_date: '',
      reminder_date: '',
      description: '',
      notes: ''
    });
  };

  const filteredCollections = collections.filter(item => {
    // Filter by tab
    let tabMatch = true;
    if (activeTab === 'debts') tabMatch = item.collection_type === 'CUSTOMER_DEBT';
    else if (activeTab === 'collections') tabMatch = item.collection_type === 'ITEM_TO_COLLECT';
    else if (activeTab === 'resellers') tabMatch = item.collection_type === 'RESELLER_PAYMENT';
    
    // Filter by search term
    let searchMatch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      searchMatch = 
        (item.customer_name || '').toLowerCase().includes(term) ||
        (item.reseller_name || '').toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.collection_type.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.amount.toString().includes(term);
    }
    
    return tabMatch && searchMatch;
  });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="payments-collections" style={{ width: '100vw', margin: '0 -20px', padding: '0' }}>
      <div className="card" style={{ width: '100%', margin: 0, borderRadius: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', minHeight: '100vh' }}>
        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <h1 className="card-title" style={{ color: '#00d4ff', fontSize: '1.8rem', margin: 0 }}>
              <FaMoneyBillWave style={{ marginRight: '10px' }} /> Payments & Collections
            </h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn" 
                onClick={() => setShowModal(true)}
                style={{ background: '#00d4ff', color: '#1a1a2e', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold' }}
              >
                <FaPlus style={{ marginRight: '8px' }} /> Add New
              </button>
              <button 
                className="btn" 
                onClick={createTestData}
                style={{ background: '#ffaa00', color: '#1a1a2e', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold' }}
              >
                Create Test Data
              </button>

            </div>
          </div>
        </div>

        {collections.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: 'rgba(255, 0, 128, 0.1)', border: '1px solid #ff0080', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <FaExclamationTriangle style={{ color: '#ff0080', fontSize: '1.5rem', marginBottom: '8px' }} />
                <div style={{ color: '#ff0080', fontSize: '1.2rem', fontWeight: 'bold' }}>{collections.filter(c => c.collection_type === 'CUSTOMER_DEBT').length}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Customer Debts</div>
              </div>
              <div style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid #00d4ff', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <FaBoxOpen style={{ color: '#00d4ff', fontSize: '1.5rem', marginBottom: '8px' }} />
                <div style={{ color: '#00d4ff', fontSize: '1.2rem', fontWeight: 'bold' }}>{collections.filter(c => c.collection_type === 'ITEM_TO_COLLECT').length}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>To Collect</div>
              </div>
              <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <FaMoneyBillWave style={{ color: '#ffaa00', fontSize: '1.5rem', marginBottom: '8px' }} />
                <div style={{ color: '#ffaa00', fontSize: '1.2rem', fontWeight: 'bold' }}>{collections.filter(c => c.collection_type === 'RESELLER_PAYMENT').length}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Reseller Payments</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <FaClock style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '8px' }} />
                <div style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 'bold' }}>{collections.filter(c => c.status === 'PENDING').length}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Pending</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                  color: viewMode === 'table' ? '#1a1a2e' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaTable /> Table
              </button>
              <button 
                onClick={() => setViewMode('cards')}
                style={{
                  background: viewMode === 'cards' ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                  color: viewMode === 'cards' ? '#1a1a2e' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaTh /> Cards
              </button>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ display: 'flex', padding: '0 20px', marginBottom: '20px', overflowX: 'auto', gap: '10px' }}>
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
            style={{ 
              background: activeTab === 'all' ? '#00d4ff' : 'transparent', 
              color: activeTab === 'all' ? '#1a1a2e' : '#ffffff', 
              border: activeTab === 'all' ? 'none' : '1px solid rgba(255,255,255,0.2)',
              padding: '10px 15px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 'bold'
            }}
          >
            All ({collections.length})
          </button>
          <button 
            className={`tab ${activeTab === 'debts' ? 'active' : ''}`} 
            onClick={() => setActiveTab('debts')}
            style={{ 
              background: activeTab === 'debts' ? '#ff0080' : 'transparent', 
              color: activeTab === 'debts' ? '#ffffff' : '#ffffff', 
              border: activeTab === 'debts' ? 'none' : '1px solid rgba(255,255,255,0.2)',
              padding: '10px 15px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 'bold'
            }}
          >
            Debts ({collections.filter(c => c.collection_type === 'CUSTOMER_DEBT').length})
          </button>
          <button 
            className={`tab ${activeTab === 'collections' ? 'active' : ''}`} 
            onClick={() => setActiveTab('collections')}
            style={{ 
              background: activeTab === 'collections' ? '#00d4ff' : 'transparent', 
              color: activeTab === 'collections' ? '#1a1a2e' : '#ffffff', 
              border: activeTab === 'collections' ? 'none' : '1px solid rgba(255,255,255,0.2)',
              padding: '10px 15px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 'bold'
            }}
          >
            Collections ({collections.filter(c => c.collection_type === 'ITEM_TO_COLLECT').length})
          </button>
          <button 
            className={`tab ${activeTab === 'resellers' ? 'active' : ''}`} 
            onClick={() => setActiveTab('resellers')}
            style={{ 
              background: activeTab === 'resellers' ? '#ffaa00' : 'transparent', 
              color: activeTab === 'resellers' ? '#1a1a2e' : '#ffffff', 
              border: activeTab === 'resellers' ? 'none' : '1px solid rgba(255,255,255,0.2)',
              padding: '10px 15px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 'bold'
            }}
          >
            Resellers ({collections.filter(c => c.collection_type === 'RESELLER_PAYMENT').length})
          </button>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {filteredCollections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.6)' }}>
              <FaMoneyBillWave style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }} />
              <p>No items found</p>
            </div>
          ) : viewMode === 'table' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Type</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Customer/Reseller</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Amount</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Due Date</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Description</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#00d4ff', fontWeight: 'bold' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.map(item => {
                    const isOverdue = new Date(item.due_date) < new Date() && item.status === 'PENDING';
                    const typeColor = item.collection_type === 'CUSTOMER_DEBT' ? '#ff0080' : 
                                     item.collection_type === 'ITEM_TO_COLLECT' ? '#00d4ff' : '#ffaa00';
                    
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '15px', color: typeColor, fontWeight: 'bold' }}>
                          {item.collection_type === 'CUSTOMER_DEBT' && <FaExclamationTriangle style={{ marginRight: '8px' }} />}
                          {item.collection_type === 'ITEM_TO_COLLECT' && <FaBoxOpen style={{ marginRight: '8px' }} />}
                          {item.collection_type === 'RESELLER_PAYMENT' && <FaMoneyBillWave style={{ marginRight: '8px' }} />}
                          {item.collection_type.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '15px', color: '#ffffff' }}>
                          {item.customer_name || item.reseller_name || 
                           (item.customer ? customers.find(c => c.id === item.customer)?.name : '') ||
                           (item.reseller ? resellers.find(r => r.id === item.reseller)?.name : '') ||
                           'No Name'}
                        </td>
                        <td style={{ padding: '15px', color: '#ffffff', fontWeight: 'bold' }}>
                          ${(() => {
                            const amount = item.amount || 
                                         (item.transaction && item.transaction.total_amount) || 
                                         (item.customer && customers.find(c => c.id === item.customer)?.outstanding_balance) ||
                                         (item.reseller && resellers.find(r => r.id === item.reseller)?.current_balance) || 
                                         0;
                            return parseFloat(amount).toFixed(2);
                          })()}
                        </td>
                        <td style={{ padding: '15px', color: isOverdue ? '#ff4444' : '#ffffff' }}>
                          {new Date(item.due_date).toLocaleDateString()}
                          {isOverdue && <span style={{ marginLeft: '8px', background: '#ff4444', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>OVERDUE</span>}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{
                            background: item.status === 'PENDING' ? 'rgba(255, 170, 0, 0.2)' : 
                                       item.status === 'PAID' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                            color: item.status === 'PENDING' ? '#ffaa00' : 
                                  item.status === 'PAID' ? '#00ff00' : '#00d4ff',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.collection_type === 'CUSTOMER_DEBT' ? 
                            `Payment due for: ${item.customer_name || (item.customer ? customers.find(c => c.id === item.customer)?.name : 'Unknown Customer')}` :
                           item.collection_type === 'ITEM_TO_COLLECT' ? 
                            `Item to collect: ${item.customer_name || (item.customer ? customers.find(c => c.id === item.customer)?.name : 'Unknown Customer')}` :
                           item.collection_type === 'RESELLER_PAYMENT' ? 
                            `Payment to: ${item.reseller_name || (item.reseller ? resellers.find(r => r.id === item.reseller)?.name : 'Unknown Reseller')}` :
                           item.description || 'No description'}
                        </td>
                        <td style={{ padding: '15px' }}>
                          {item.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {item.collection_type !== 'ITEM_TO_COLLECT' ? (
                                <button 
                                  onClick={() => markAsPaid(item.id)}
                                  style={{
                                    background: '#00ff88',
                                    color: '#1a1a2e',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <FaCheck style={{ marginRight: '4px' }} /> Paid
                                </button>
                              ) : (
                                <button 
                                  onClick={() => markAsCollected(item.id)}
                                  style={{
                                    background: '#00d4ff',
                                    color: '#1a1a2e',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <FaBoxOpen style={{ marginRight: '4px' }} /> Collected
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
              {filteredCollections.map(item => {
                const isOverdue = new Date(item.due_date) < new Date() && item.status === 'PENDING';
                const typeColor = item.collection_type === 'CUSTOMER_DEBT' ? '#ff0080' : 
                                 item.collection_type === 'ITEM_TO_COLLECT' ? '#00d4ff' : '#ffaa00';
                
                return (
                  <div key={item.id} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOverdue ? '#ff4444' : typeColor}`,
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}>
                    {isOverdue && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#ff4444',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        OVERDUE
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                      {item.collection_type === 'CUSTOMER_DEBT' && <FaExclamationTriangle style={{ color: typeColor, marginRight: '10px' }} />}
                      {item.collection_type === 'ITEM_TO_COLLECT' && <FaBoxOpen style={{ color: typeColor, marginRight: '10px' }} />}
                      {item.collection_type === 'RESELLER_PAYMENT' && <FaMoneyBillWave style={{ color: typeColor, marginRight: '10px' }} />}
                      <div>
                        <h3 style={{ color: typeColor, margin: 0, fontSize: '1rem' }}>
                          {item.collection_type.replace('_', ' ')}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>
                          {item.customer_name || item.reseller_name || 
                           (item.customer ? customers.find(c => c.id === item.customer)?.name : '') ||
                           (item.reseller ? resellers.find(r => r.id === item.reseller)?.name : '') ||
                           'No Name'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Amount:</span>
                        <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          ${(() => {
                            const amount = item.amount || 
                                         (item.transaction && item.transaction.total_amount) || 
                                         (item.customer && customers.find(c => c.id === item.customer)?.outstanding_balance) ||
                                         (item.reseller && resellers.find(r => r.id === item.reseller)?.current_balance) || 
                                         0;
                            return parseFloat(amount).toFixed(2);
                          })()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Due Date:</span>
                        <span style={{ color: isOverdue ? '#ff4444' : '#ffffff' }}>
                          {new Date(item.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Status:</span>
                        <span style={{
                          background: item.status === 'PENDING' ? 'rgba(255, 170, 0, 0.2)' : 
                                     item.status === 'PAID' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                          color: item.status === 'PENDING' ? '#ffaa00' : 
                                item.status === 'PAID' ? '#00ff00' : '#00d4ff',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 10px 0' }}>
                        {item.collection_type === 'CUSTOMER_DEBT' ? 
                          `Payment due for: ${item.customer_name || (item.customer ? customers.find(c => c.id === item.customer)?.name : 'Unknown Customer')}` :
                         item.collection_type === 'ITEM_TO_COLLECT' ? 
                          `Item to collect: ${item.customer_name || (item.customer ? customers.find(c => c.id === item.customer)?.name : 'Unknown Customer')}` :
                         item.collection_type === 'RESELLER_PAYMENT' ? 
                          `Payment to: ${item.reseller_name || (item.reseller ? resellers.find(r => r.id === item.reseller)?.name : 'Unknown Reseller')}` :
                         item.description || 'No description'}
                      </p>
                      
                      {item.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {item.collection_type !== 'ITEM_TO_COLLECT' ? (
                            <button 
                              onClick={() => markAsPaid(item.id)}
                              style={{
                                background: '#00ff88',
                                color: '#1a1a2e',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              <FaCheck style={{ marginRight: '5px' }} /> Mark Paid
                            </button>
                          ) : (
                            <button 
                              onClick={() => markAsCollected(item.id)}
                              style={{
                                background: '#00d4ff',
                                color: '#1a1a2e',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              <FaBoxOpen style={{ marginRight: '5px' }} /> Mark Collected
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
          <div className="modal" style={{ 
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ color: '#00d4ff', margin: 0 }}>{editingItem ? 'Edit' : 'Add'} Payment/Collection</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Type</label>
                <select 
                  value={formData.collection_type} 
                  onChange={(e) => setFormData({...formData, collection_type: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                >
                  <option value="CUSTOMER_DEBT" style={{ background: '#1a1a2e', color: '#ffffff' }}>Customer Debt</option>
                  <option value="ITEM_TO_COLLECT" style={{ background: '#1a1a2e', color: '#ffffff' }}>Item to Collect</option>
                  <option value="RESELLER_PAYMENT" style={{ background: '#1a1a2e', color: '#ffffff' }}>Reseller Payment</option>
                </select>
              </div>

              {formData.collection_type !== 'RESELLER_PAYMENT' && (
                <div className="form-group" style={{ marginBottom: '20px', position: 'relative' }}>
                  <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Customer</label>
                  <input 
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search customer..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                  {showCustomerDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}>
                      {customers
                        .filter(customer => customer.name.toLowerCase().includes(customerSearch.toLowerCase()))
                        .map(customer => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              setFormData({...formData, customer: customer.id});
                              setCustomerSearch(customer.name);
                              setShowCustomerDropdown(false);
                            }}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              color: '#ffffff'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{customer.name}</span>
                              <span style={{ fontSize: '0.8rem', color: customer.outstanding_balance > 0 ? '#ff4444' : '#00ff88' }}>
                                ${customer.outstanding_balance || 0}
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {formData.customer && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Outstanding Balance: </span>
                      <span style={{ color: customers.find(c => c.id == formData.customer)?.outstanding_balance > 0 ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>
                        ${customers.find(c => c.id == formData.customer)?.outstanding_balance || 0}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formData.collection_type === 'RESELLER_PAYMENT' && (
                <div className="form-group" style={{ marginBottom: '20px', position: 'relative' }}>
                  <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Reseller</label>
                  <input 
                    type="text"
                    value={resellerSearch}
                    onChange={(e) => {
                      setResellerSearch(e.target.value);
                      setShowResellerDropdown(true);
                    }}
                    onFocus={() => setShowResellerDropdown(true)}
                    placeholder="Search reseller..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                  {showResellerDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}>
                      {resellers
                        .filter(reseller => reseller.name.toLowerCase().includes(resellerSearch.toLowerCase()))
                        .map(reseller => (
                          <div
                            key={reseller.id}
                            onClick={() => {
                              setFormData({...formData, reseller: reseller.id});
                              setResellerSearch(reseller.name);
                              setShowResellerDropdown(false);
                            }}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              color: '#ffffff'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{reseller.name}</span>
                              <span style={{ fontSize: '0.8rem', color: reseller.current_balance > 0 ? '#00ff88' : '#ff4444' }}>
                                ${reseller.current_balance || 0}
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {formData.reseller && (
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Current Balance: </span>
                      <span style={{ color: resellers.find(r => r.id == formData.reseller)?.current_balance > 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>
                        ${resellers.find(r => r.id == formData.reseller)?.current_balance || 0}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                  placeholder="Enter amount"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Due Date</label>
                <input 
                  type="date" 
                  value={formData.due_date} 
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Reminder Date (Optional)</label>
                <input 
                  type="date" 
                  value={formData.reminder_date} 
                  onChange={(e) => setFormData({...formData, reminder_date: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Enter description"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '8px' }}>Notes (Optional)</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Additional notes"
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#00d4ff',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#1a1a2e',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  );
};

export default PaymentsCollections;