import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaPlus, FaSearch, FaTable, FaTh, FaTimes } from 'react-icons/fa';
import { expensesAPI } from '../services/api';

const Expenses = () => {
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    expense_type: 'OPERATIONAL',
    amount: '',
    notes: ''
  });
  const [user, setUser] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await expensesAPI.getAll();
      const data = response.data?.results || response.data || [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      // Get existing categories first
      let categoryId = 1;
      try {
        const categoriesResponse = await fetch('http://127.0.0.1:8000/api/expense-categories/', {
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          }
        });
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          const categoryList = categories.results || categories;
          if (categoryList.length > 0) {
            categoryId = categoryList[0].id;
          }
        }
      } catch (err) {
        console.log('Using default category ID');
      }
      
      const expenseData = {
        category: categoryId,
        description: formData.description.trim(),
        expense_type: formData.expense_type,
        amount: parseFloat(formData.amount),
        notes: formData.notes.trim()
      };
      await expensesAPI.create(expenseData);
      setShowModal(false);
      setFormData({ description: '', expense_type: 'OPERATIONAL', amount: '', notes: '' });
      fetchExpenses();
      setMessage({ type: 'success', text: 'Expense created successfully!' });
    } catch (error) {
      console.error('Error creating expense:', error);
      setMessage({ type: 'error', text: 'Error creating expense. Please check all fields.' });
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      expense_type: expense.expense_type,
      amount: expense.amount.toString(),
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await expensesAPI.delete(expenseToDelete.id);
      setMessage({ type: 'success', text: 'Expense deleted successfully!' });
      fetchExpenses();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting expense.' });
    }
    setShowDeleteModal(false);
    setExpenseToDelete(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'Please enter a description' });
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    
    try {
      const expenseData = {
        category: editingExpense.category,
        description: formData.description.trim(),
        expense_type: formData.expense_type,
        amount: parseFloat(formData.amount),
        notes: formData.notes.trim()
      };
      await expensesAPI.update(editingExpense.id, expenseData);
      setShowModal(false);
      setEditingExpense(null);
      setFormData({ description: '', expense_type: 'OPERATIONAL', amount: '', notes: '' });
      setMessage({ type: 'success', text: 'Expense updated successfully!' });
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      setMessage({ type: 'error', text: 'Error updating expense.' });
    }
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="expenses">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <FaMoneyBillWave /> Expenses
          </h1>
          <button className="btn btn-primary" onClick={() => {
            setEditingExpense(null);
            setFormData({ description: '', expense_type: 'OPERATIONAL', amount: '', notes: '' });
            setShowModal(true);
          }}>
            <FaPlus /> Add Expense
          </button>
        </div>

      {message.text && (
        <div className="notification-container">
          <div className={`notification ${message.type === 'success' ? 'success' : 'error'}`} style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '250px',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        </div>
      )}

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search expenses..."
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
        <div className="card-content" style={{ 
          width: '100%', 
          overflowY: 'auto', 
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '400px'
        }}>
          {viewMode === 'table' ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Recorded By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td>{expense.description}</td>
                      <td>{expense.category}</td>
                      <td>${expense.amount}</td>
                      <td>{expense.recorded_by}</td>
                      <td>
                        {user?.is_superuser && (
                          <>
                            <button className="btn btn-sm btn-warning" onClick={() => handleEdit(expense)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(expense)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cards-grid">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="product-card">
                  <div className="card-content">
                    <h3>{expense.description}</h3>
                    <p className="product-code">{expense.category}</p>
                    <div className="product-prices">
                      <span className="sale-price">${expense.amount}</span>
                    </div>
                    <p className="product-category">{new Date(expense.date).toLocaleDateString()}</p>
                    <div className="card-actions">
                      {user?.is_superuser && (
                        <>
                          <button className="btn btn-sm btn-warning" onClick={() => handleEdit(expense)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(expense)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button className="btn btn-sm" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={editingExpense ? handleUpdate : handleSubmit}>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  className="form-input"
                  value={formData.expense_type}
                  onChange={(e) => setFormData({...formData, expense_type: e.target.value})}
                >
                  <option value="OPERATIONAL">Operational</option>
                  <option value="ADMINISTRATIVE">Administrative</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="RENT">Rent</option>
                  <option value="SALARIES">Salaries</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this expense?</p>
              <p><strong>{expenseToDelete?.description}</strong></p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;