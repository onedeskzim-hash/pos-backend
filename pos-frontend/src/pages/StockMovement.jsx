import { useState, useEffect } from 'react';
import { FaBoxes, FaClipboardList, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import { stockMovementAPI, stockTakeAPI, productsAPI } from '../services/api';
import ProductSearchSelect from '../components/ProductSearchSelect';

const StockMovement = () => {
  const [activeTab, setActiveTab] = useState('movement');
  const [stockMovements, setStockMovements] = useState([]);
  const [stockTakes, setStockTakes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    movement_type: 'RECEIPT',
    product: '',
    quantity: '',
    unit_cost: '',
    reason: 'OTHER',
    notes: ''
  });
  const [stockTakeData, setStockTakeData] = useState({
    product: '',
    counted_quantity: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'movement') {
        const response = await stockMovementAPI.getAll();
        const data = response.data?.results || response.data || [];
        setStockMovements(Array.isArray(data) ? data : []);
      } else {
        const response = await stockTakeAPI.getAll();
        const data = response.data?.results || response.data || [];
        setStockTakes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (activeTab === 'movement') {
        setStockMovements([]);
      } else {
        setStockTakes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    try {
      if (activeTab === 'movement') {
        if (editingItem) {
          const response = await stockMovementAPI.update(editingItem.id, formData);
          console.log('Update response:', response);
        } else {
          const response = await stockMovementAPI.create(formData);
          console.log('Create response:', response);
        }
      } else {
        const product = products.find(p => p.id === parseInt(stockTakeData.product));
        const takeData = {
          ...stockTakeData,
          system_quantity: product?.stock_quantity || 0
        };
        if (editingItem) {
          await stockTakeAPI.update(editingItem.id, takeData);
        } else {
          await stockTakeAPI.create(takeData);
        }
      }
      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error creating stock movement. Please check the console for details.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        if (activeTab === 'movement') {
          await stockMovementAPI.delete(id);
        } else {
          await stockTakeAPI.delete(id);
        }
        fetchData();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      movement_type: 'RECEIPT',
      product: '',
      quantity: '',
      unit_cost: '',
      reason: 'OTHER',
      notes: ''
    });
    setStockTakeData({
      product: '',
      counted_quantity: '',
      notes: ''
    });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    if (activeTab === 'movement') {
      setFormData({
        movement_type: item.movement_type,
        product: item.product,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        reason: item.reason,
        notes: item.notes
      });
    } else {
      setStockTakeData({
        product: item.product,
        counted_quantity: item.counted_quantity,
        notes: item.notes
      });
    }
    setShowAddModal(true);
  };

  const filteredData = activeTab === 'movement' 
    ? (Array.isArray(stockMovements) ? stockMovements.filter(item => 
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.movement_type?.toLowerCase().includes(searchTerm.toLowerCase())
      ) : [])
    : (Array.isArray(stockTakes) ? stockTakes.filter(item => 
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) : []);

  return (
    <div className="stock-management">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <FaBoxes /> Stock Management
          </h1>
          <div className="tab-buttons">
            <button 
              className={`btn ${activeTab === 'movement' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('movement')}
            >
              Stock Movement
            </button>
            <button 
              className={`btn ${activeTab === 'stocktake' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('stocktake')}
            >
              <FaClipboardList /> Stock Take
            </button>
          </div>
        </div>
        
        <div className="card-content" style={{ 
          width: '100%', 
          overflowY: 'auto', 
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '400px'
        }}>
          <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="search-box" style={{ display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ marginRight: '10px' }} />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'movement' ? 'movements' : 'stock takes'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ width: '300px' }}
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setShowAddModal(true);
              }}
            >
              <FaPlus /> Add {activeTab === 'movement' ? 'Movement' : 'Stock Take'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '600px' }}>
              <table className="table table-striped" style={{ width: '100%', minWidth: '800px' }}>
                <thead>
                  <tr>
                    {activeTab === 'movement' ? (
                      <>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Movement Type</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Reason</th>
                        <th>Performed By</th>
                        <th>Actions</th>
                      </>
                    ) : (
                      <>
                        <th>Date</th>
                        <th>Product</th>
                        <th>System Qty</th>
                        <th>Counted Qty</th>
                        <th>Difference</th>
                        <th>Performed By</th>
                        <th>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id}>
                      {activeTab === 'movement' ? (
                        <>
                          <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                          <td>{item.product_name}</td>
                          <td>
                            <span className={`badge ${
                              item.movement_type === 'RECEIPT' ? 'badge-success' :
                              item.movement_type === 'SALE' ? 'badge-primary' :
                              item.movement_type.includes('ADJUSTMENT') ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {item.movement_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td>{item.quantity}</td>
                          <td>${item.unit_cost}</td>
                          <td>{item.reason.replace('_', ' ')}</td>
                          <td>{item.performed_by_name}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditModal(item)}
                              style={{ marginRight: '5px' }}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(item.id)}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>{item.product_name}</td>
                          <td>{item.system_quantity}</td>
                          <td>{item.counted_quantity}</td>
                          <td>
                            <span className={`badge ${
                              item.difference > 0 ? 'badge-success' :
                              item.difference < 0 ? 'badge-danger' :
                              'badge-secondary'
                            }`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </td>
                          <td>{item.performed_by_name}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditModal(item)}
                              style={{ marginRight: '5px' }}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(item.id)}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                  No {activeTab === 'movement' ? 'stock movements' : 'stock takes'} found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          zIndex: 1050, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ 
            width: '95vw', 
            maxHeight: '90vh', 
            backgroundColor: 'rgba(15, 15, 25, 0.95)', 
            borderRadius: '16px', 
            border: '1px solid rgba(0, 212, 255, 0.3)', 
            backdropFilter: 'blur(20px)', 
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)', 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '20px', 
                borderBottom: '1px solid rgba(0, 212, 255, 0.2)' 
              }}>
                <h5 style={{ 
                  margin: 0, 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  color: '#00d4ff' 
                }}>
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'movement' ? 'Stock Movement' : 'Stock Take'}
                </h5>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    color: '#ff0080', 
                    cursor: 'pointer', 
                    padding: 0, 
                    width: '30px', 
                    height: '30px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: '50%' 
                  }}
                >
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ 
                  position: 'relative', 
                  flex: '1 1 auto', 
                  padding: '20px', 
                  paddingBottom: window.innerWidth <= 768 ? '400px' : '20px',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {activeTab === 'movement' ? (
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Movement Type</label>
                        <select 
                          className="form-control"
                          value={formData.movement_type}
                          onChange={(e) => setFormData({...formData, movement_type: e.target.value})}
                          required
                        >
                          <option value="RECEIPT">Receipt</option>
                          <option value="SALE">Sale</option>
                          <option value="ADJUSTMENT_IN">Adjustment In</option>
                          <option value="ADJUSTMENT_OUT">Adjustment Out</option>
                          <option value="RETURN_IN">Return In</option>
                          <option value="RETURN_OUT">Return Out</option>
                        </select>
                      </div>
                      <div className="form-group form-group-half">
                        <label>Product</label>
                        <ProductSearchSelect
                          value={formData.product}
                          onChange={(productId) => setFormData({...formData, product: productId})}
                          placeholder="Search and select product..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input 
                          type="number"
                          className="form-control"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Unit Cost</label>
                        <input 
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={formData.unit_cost}
                          onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Reason</label>
                        <select 
                          className="form-control"
                          value={formData.reason}
                          onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        >
                          <option value="SALE">Sale</option>
                          <option value="PURCHASE">Purchase</option>
                          <option value="DAMAGE">Damage</option>
                          <option value="THEFT">Theft</option>
                          <option value="COUNT_DIFFERENCE">Count Difference</option>
                          <option value="RETURN">Return</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="form-group form-group-full">
                        <label>Notes</label>
                        <textarea 
                          className="form-control"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          rows="3"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Product</label>
                        <ProductSearchSelect
                          value={stockTakeData.product}
                          onChange={(productId) => setStockTakeData({...stockTakeData, product: productId})}
                          placeholder="Search and select product..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Counted Quantity</label>
                        <input 
                          type="number"
                          className="form-control"
                          value={stockTakeData.counted_quantity}
                          onChange={(e) => setStockTakeData({...stockTakeData, counted_quantity: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group form-group-full">
                        <label>Notes</label>
                        <textarea 
                          className="form-control"
                          value={stockTakeData.notes}
                          onChange={(e) => setStockTakeData({...stockTakeData, notes: e.target.value})}
                          rows="3"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  padding: '15px 20px', 
                  borderTop: '1px solid rgba(0, 212, 255, 0.2)', 
                  gap: '10px' 
                }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovement;