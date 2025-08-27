import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTable, FaTh } from 'react-icons/fa';
import { transactionsAPI, productsAPI, customersAPI, resellersAPI, receiptsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  
  const isAdmin = user?.is_superuser === true || user?.username === 'admin';
  const [formData, setFormData] = useState({
    product: '',
    customer: '',
    reseller: '',
    quantity: 1,
    status: 'RECEIVED',
    dealership_price: '',
    sale_price: '',
    is_taxed: false,
    zimra_receipt_no: '',
    notes: 'Thanks for doing business with us'
  });
  
  const [searchTerms, setSearchTerms] = useState({
    product: '',
    customer: '',
    reseller: ''
  });

  const [showDropdowns, setShowDropdowns] = useState({
    product: false,
    customer: false,
    reseller: false
  });

  const [cart, setCart] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const cartTotal = cart.reduce((sum, item) => {
      const price = formData.reseller ? item.dealership_price : item.sale_price;
      return sum + (item.quantity * price);
    }, 0);
    setTotalAmount(cartTotal);
  }, [cart, formData.reseller]);

  // Auto-save functionality
  useEffect(() => {
    if (showModal) {
      const savedData = localStorage.getItem('transactionFormData');
      if (savedData && !editingTransaction) {
        setFormData(JSON.parse(savedData));
      }
    }
  }, [showModal, editingTransaction]);

  useEffect(() => {
    if (showModal && !editingTransaction) {
      localStorage.setItem('transactionFormData', JSON.stringify(formData));
    }
  }, [formData, showModal, editingTransaction]);

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
    fetchCustomers();
    fetchResellers();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await transactionsAPI.getAll();
      const transactionsData = response.data.results || response.data || [];
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchResellers = async () => {
    try {
      const response = await resellersAPI.getAll();
      setResellers(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching resellers:', error);
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
    if (cart.length === 0 && !editingTransaction) {
      showToast('Please add at least one product to the cart', 'error');
      return;
    }
    
    if (editingTransaction) {
      // Handle transaction update
      const transactionData = {
        product: formData.product,
        quantity: formData.quantity,
        status: formData.status,
        dealership_price: formData.dealership_price,
        sale_price: formData.sale_price,
        is_taxed: formData.is_taxed,
        notes: formData.notes || ''
      };
      
      if (formData.customer) transactionData.customer = formData.customer;
      if (formData.reseller) transactionData.reseller = formData.reseller;
      if (formData.zimra_receipt_no) transactionData.zimra_receipt_no = formData.zimra_receipt_no;
      
      try {
        await transactionsAPI.update(editingTransaction.id, transactionData);
        fetchTransactions();
        resetForm();
        showToast('Transaction updated successfully!', 'success');
      } catch (error) {
        console.error('Error updating transaction:', error);
        showToast('Error updating transaction. Please try again.', 'error');
      }
      return;
    }
    
    try {
      const transactionData = {
        status: formData.status,
        is_taxed: formData.is_taxed,
        notes: formData.notes || '',
        payment_method: formData.payment_method,
        items: cart.map(item => ({
          product: item.product_id,
          quantity: item.quantity,
          unit_price: formData.reseller ? item.dealership_price : item.sale_price
        }))
      };
      
      if (formData.customer) {
        transactionData.customer = formData.customer;
      }
      
      if (formData.reseller) {
        transactionData.reseller = formData.reseller;
      }
      
      if (formData.zimra_receipt_no) {
        transactionData.zimra_receipt_no = formData.zimra_receipt_no;
      }
      
      await transactionsAPI.create(transactionData);
      
      fetchTransactions();
      localStorage.removeItem('transactionFormData');
      setCart([]);
      resetForm();
      showToast('Transaction created successfully! Receipt has been generated.', 'success');
      
      // Show receipt modal for the last created transaction
      if (cart.length > 0) {
        // Get the latest transaction to show receipt
        setTimeout(() => {
          fetchTransactions();
        }, 500);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Error saving transaction. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    const productId = transaction.product?.id || transaction.product;
    const customerId = transaction.customer?.id || transaction.customer || '';
    const resellerId = transaction.reseller?.id || transaction.reseller || '';
    
    setFormData({
      product: productId,
      customer: customerId,
      reseller: resellerId,
      quantity: transaction.quantity,
      status: transaction.status,
      dealership_price: transaction.dealership_price,
      sale_price: transaction.sale_price,
      is_taxed: transaction.is_taxed,
      zimra_receipt_no: transaction.zimra_receipt_no || '',
      notes: transaction.notes || ''
    });
    
    setSearchTerms({
      product: getSelectedName('product', productId),
      customer: getSelectedName('customer', customerId),
      reseller: getSelectedName('reseller', resellerId)
    });
    
    setShowModal(true);
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await transactionsAPI.delete(transactionToDelete.id);
      showToast('Transaction deleted successfully!', 'success');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Error deleting transaction. Please try again.', 'error');
    }
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const handleViewReceipt = async (transaction) => {
    try {
      const receiptsResponse = await receiptsAPI.getAll();
      const receipt = receiptsResponse.data.results?.find(r => 
        r.transaction === transaction.id || r.transaction?.id === transaction.id
      );
      
      if (receipt) {
        const receiptResponse = await receiptsAPI.printReceipt(receipt.id);
        setReceiptData(receiptResponse.data);
        setShowReceiptModal(true);
      } else {
        console.log('Available receipts:', receiptsResponse.data.results);
        console.log('Looking for transaction ID:', transaction.id);
        showToast('No receipt found for this transaction', 'warning');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      showToast('Error fetching receipt', 'error');
    }
  };

  const downloadReceipt = async (data) => {
    try {
      const receiptsResponse = await receiptsAPI.getAll();
      const receipt = receiptsResponse.data.results?.find(r => r.receipt_number === data.receipt.receipt_number);
      
      if (receipt) {
        const response = await receiptsAPI.downloadPdf(receipt.id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${data.receipt.receipt_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Receipt downloaded successfully!', 'success');
      } else {
        showToast('Receipt not found', 'error');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('Error downloading PDF', 'error');
    }
  };

  const shareWhatsApp = async (data) => {
    try {
      const receiptsResponse = await receiptsAPI.getAll();
      const receipt = receiptsResponse.data.results?.find(r => r.receipt_number === data.receipt.receipt_number);
      
      if (receipt) {
        const response = await receiptsAPI.downloadPdf(receipt.id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const file = new File([blob], `receipt-${data.receipt.receipt_number}.pdf`, { type: 'application/pdf' });
        
        // Skip native sharing due to user gesture requirement
        if (false) {
        } else {
          // Fallback: download PDF and show WhatsApp message
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${data.receipt.receipt_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          const customerPhone = data.customer?.phone_no;
          const message = `*${data.business.business_name}*\n*Receipt: ${data.receipt.receipt_number}*\n\nPlease find the receipt PDF downloaded to your device.\n\nProduct: ${data.transaction.product_name}\nQuantity: ${data.transaction.quantity}\nTotal: $${data.receipt.total_amount}\nPayment: ${data.receipt.payment_method}\nStatus: ${data.transaction.status}\n\n${data.business.receipt_footer_text}`;
          const whatsappUrl = customerPhone ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
          showToast('PDF downloaded. Please attach it manually to WhatsApp.', 'info');
        }
      } else {
        showToast('Receipt not found', 'error');
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      showToast('Error sharing via WhatsApp', 'error');
    }
  };

  const handleEmailSend = (data) => {
    const customerEmail = data.customer?.email;
    if (customerEmail) {
      sendEmailDirect(data, customerEmail);
    } else {
      setShowEmailModal(true);
    }
  };

  const sendEmailDirect = (data, email) => {
    const subject = `Receipt ${data.receipt.receipt_number} - ${data.business.business_name}`;
    const body = `Dear Customer,\n\nHere are your receipt details:\n\nReceipt No: ${data.receipt.receipt_number}\nDate: ${data.receipt.date}\nCashier: ${data.staff.name}\n\nProduct: ${data.transaction.product_name}\nQuantity: ${data.transaction.quantity}\nUnit Price: $${data.transaction.unit_price}\nTotal: $${data.receipt.total_amount}\nPayment: ${data.receipt.payment_method}\nStatus: ${data.transaction.status}\n\n${data.transaction.notes ? `Notes: ${data.transaction.notes}\n\n` : ''}Thank you for your business!\n\n${data.business.business_name}\n${data.business.address}\nTel: ${data.business.phone}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showToast('Email client opened with receipt', 'success');
  };

  const printReceipt = () => {
    window.print();
  };

  const resetForm = () => {
    setFormData({
      product: '',
      customer: '',
      reseller: '',
      quantity: 1,
      status: 'RECEIVED',
      dealership_price: '',
      sale_price: '',
      is_taxed: false,
      zimra_receipt_no: '',
      notes: 'Thanks for doing business with us',
      payment_method: 'CASH'
    });
    setCart([]);
    setSearchTerms({
      product: '',
      customer: '',
      reseller: ''
    });
    setShowDropdowns({
      product: false,
      customer: false,
      reseller: false
    });
    setEditingTransaction(null);
    setShowModal(false);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerms.product.toLowerCase()) ||
    (product.product_unique_code || '').toLowerCase().includes(searchTerms.product.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerms.customer.toLowerCase()) ||
    (customer.account_code || '').toLowerCase().includes(searchTerms.customer.toLowerCase())
  );

  const filteredResellers = resellers.filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerms.reseller.toLowerCase()) ||
    (reseller.account_code || '').toLowerCase().includes(searchTerms.reseller.toLowerCase())
  );

  const handleSelectItem = (type, item) => {
    if (type === 'product') {
      setFormData({
        ...formData, 
        [type]: item.id,
        sale_price: item.default_sale_price,
        dealership_price: item.default_sale_price
      });
    } else {
      setFormData({...formData, [type]: item.id});
    }
    setSearchTerms({...searchTerms, [type]: item.name});
    setShowDropdowns({...showDropdowns, [type]: false});
  };

  const addToCart = () => {
    if (!formData.product || !formData.quantity) return;
    
    const product = products.find(p => p.id == formData.product);
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? {...item, quantity: item.quantity + parseInt(formData.quantity)}
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: parseInt(formData.quantity),
        sale_price: product.default_sale_price,
        dealership_price: formData.reseller ? parseFloat(formData.dealership_price) || product.default_sale_price : product.default_sale_price
      }]);
    }
    
    setFormData({...formData, product: '', quantity: 1, sale_price: '', dealership_price: ''});
    setSearchTerms({...searchTerms, product: ''});
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.product_id === productId 
          ? {...item, quantity: parseInt(newQuantity)}
          : item
      ));
    }
  };

  const getSelectedName = (type, id) => {
    if (!id) return '';
    if (type === 'product') return products.find(p => p.id == id)?.name || '';
    if (type === 'customer') return customers.find(c => c.id == id)?.name || '';
    if (type === 'reseller') return resellers.find(r => r.id == id)?.name || '';
    return '';
  };

  const getStatusColor = (status) => {
    const colors = {
      'RECEIVED': 'status-received',
      'SOLD': 'status-sold',
      'PAID_TO_COLLECT': 'status-paid',
      'COLLECTED_TO_PAY': 'status-collected'
    };
    return colors[status] || 'status-badge';
  };

  const filteredTransactions = transactions.filter(transaction =>
    (transaction.product_names || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.reseller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="transactions">
        <div className="card">
          <div className="loading">Loading transactions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Transactions</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Add Transaction
          </button>
        </div>

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search transactions..."
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
                  <th>Product</th>
                  <th>Customer/Reseller</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Sale Price</th>
                  <th>Total Amount</th>
                  <th>Reseller Balance</th>
                  <th>Tax</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.display_product_names || transaction.product_names || 'N/A'}</td>
                    <td>{transaction.customer_name || transaction.reseller_name || 'N/A'}</td>
                    <td>{transaction.quantity}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(transaction.status)}`}>
                        {transaction.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>${transaction.display_sale_price || transaction.sale_price}</td>
                    <td>${transaction.total_amount}</td>
                    <td>{transaction.reseller ? `$${transaction.display_reseller_balance || 0}` : 'N/A'}</td>
                    <td>{transaction.is_taxed ? `$${transaction.tax_amount || 0}` : 'No Tax'}</td>
                    <td>{new Date(transaction.timestamp).toLocaleDateString()}</td>
                    <td>
                      <div style={{display: 'flex', gap: '4px', flexWrap: 'nowrap'}}>
                        <button className="btn btn-sm btn-info" onClick={() => handleViewReceipt(transaction)} style={{fontSize: '11px', padding: '4px 6px'}}>
                          📄
                        </button>
                        <button className="btn btn-sm btn-warning" onClick={() => handleEdit(transaction)} style={{padding: '4px 6px'}}>
                          <FaEdit />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => {
                            if (!isAdmin) {
                              showToast('Administrator access required to delete transactions', 'warning');
                              return;
                            }
                            handleDelete(transaction);
                          }}
                          style={{padding: '4px 6px'}}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-card">
                <div className="card-content">
                  <h3>{transaction.product_name || transaction.product_names || 'Unknown Products'}</h3>
                  <div className="transaction-info">
                    <p>👤 {transaction.customer_name || transaction.reseller_name || 'No Customer/Reseller'}</p>
                    <p>📦 Quantity: {transaction.quantity}</p>
                    <p>💰 Sale Price: ${transaction.display_sale_price || transaction.sale_price}</p>
                    <p>💵 Total: ${transaction.total_amount}</p>
                    {transaction.reseller && <p>💳 Reseller Balance: ${transaction.display_reseller_balance || 0}</p>}
                    {transaction.is_taxed && <p>🧾 Tax: ${transaction.tax_amount || 0}</p>}
                    {transaction.zimra_receipt_no && <p>📄 Receipt: {transaction.zimra_receipt_no}</p>}
                  </div>
                  <div className="transaction-status">
                    <span className={`status-badge ${getStatusColor(transaction.status)}`}>
                      {transaction.status.replace('_', ' ')}
                    </span>
                    <p className="transaction-date">
                      📅 {new Date(transaction.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  {transaction.notes && (
                    <div className="transaction-notes">
                      <p>📝 {transaction.notes}</p>
                    </div>
                  )}
                  <div className="card-actions" style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <button className="btn btn-sm btn-info" onClick={() => handleViewReceipt(transaction)} style={{fontSize: '11px'}}>
                      📄
                    </button>
                    <button className="btn btn-sm btn-warning" onClick={() => handleEdit(transaction)}>
                      <FaEdit />
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Administrator access required to delete transactions', 'warning');
                          return;
                        }
                        handleDelete(transaction);
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
              <h2>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Customer (Optional)</label>
                  <div className="searchable-dropdown">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search customers..."
                      value={searchTerms.customer}
                      onChange={(e) => {
                        setSearchTerms({...searchTerms, customer: e.target.value});
                        setShowDropdowns({...showDropdowns, customer: true});
                        if (!e.target.value) {
                          setFormData({...formData, customer: ''});
                        }
                      }}
                      onFocus={() => setShowDropdowns({...showDropdowns, customer: true})}
                    />
                    {showDropdowns.customer && (
                      <div className="dropdown-list">
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            setFormData({...formData, customer: ''});
                            setSearchTerms({...searchTerms, customer: ''});
                            setShowDropdowns({...showDropdowns, customer: false});
                          }}
                        >
                          <div className="item-name">No Customer</div>
                        </div>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="dropdown-item"
                              onClick={() => handleSelectItem('customer', customer)}
                            >
                              <div className="item-name">{customer.name}</div>
                              <div className="item-details">{customer.account_code} - {customer.phone_no}</div>
                            </div>
                          ))
                        ) : searchTerms.customer ? (
                          <div className="dropdown-item no-results">No customers found</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reseller (Optional)</label>
                  <div className="searchable-dropdown">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search resellers..."
                      value={searchTerms.reseller}
                      onChange={(e) => {
                        setSearchTerms({...searchTerms, reseller: e.target.value});
                        setShowDropdowns({...showDropdowns, reseller: true});
                        if (!e.target.value) {
                          setFormData({...formData, reseller: ''});
                        }
                      }}
                      onFocus={() => setShowDropdowns({...showDropdowns, reseller: true})}
                    />
                    {showDropdowns.reseller && (
                      <div className="dropdown-list">
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            setFormData({...formData, reseller: ''});
                            setSearchTerms({...searchTerms, reseller: ''});
                            setShowDropdowns({...showDropdowns, reseller: false});
                          }}
                        >
                          <div className="item-name">No Reseller</div>
                        </div>
                        {filteredResellers.length > 0 ? (
                          filteredResellers.map((reseller) => (
                            <div
                              key={reseller.id}
                              className="dropdown-item"
                              onClick={() => handleSelectItem('reseller', reseller)}
                            >
                              <div className="item-name">{reseller.name}</div>
                              <div className="item-details">{reseller.account_code} - {reseller.company_name || 'No company'}</div>
                            </div>
                          ))
                        ) : searchTerms.reseller ? (
                          <div className="dropdown-item no-results">No resellers found</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {(formData.customer || formData.reseller) && (
                <div style={{padding: '10px', background: formData.reseller ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.1)', borderRadius: '8px', marginBottom: '15px', textAlign: 'center'}}>
                  <strong>
                    {formData.reseller ? (
                      <span style={{color: '#00ff88'}}>🏢 RESELLER PRICING ACTIVE</span>
                    ) : (
                      <span style={{color: '#00d4ff'}}>👤 CUSTOMER PRICING ACTIVE</span>
                    )}
                  </strong>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Add Product to Cart</label>
                <div className="searchable-dropdown">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search products..."
                    value={searchTerms.product}
                    onChange={(e) => {
                      setSearchTerms({...searchTerms, product: e.target.value});
                      setShowDropdowns({...showDropdowns, product: true});
                      if (!e.target.value) {
                        setFormData({...formData, product: ''});
                      }
                    }}
                    onFocus={() => setShowDropdowns({...showDropdowns, product: true})}
                  />
                  {showDropdowns.product && (
                    <div className="dropdown-list">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="dropdown-item"
                            onClick={() => handleSelectItem('product', product)}
                          >
                            <div className="item-name">{product.name}</div>
                            <div className="item-details">
                              {product.product_unique_code} - 
                              {formData.reseller ? (
                                <span style={{color: '#00ff88'}}>Selling Price: ${product.default_sale_price}</span>
                              ) : (
                                <span style={{color: '#00d4ff'}}>Selling Price: ${product.default_sale_price}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-item no-results">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {formData.product && (
                <div style={{padding: '15px', background: 'rgba(0,212,255,0.05)', borderRadius: '8px', marginBottom: '20px'}}>
                  <div style={{marginBottom: '15px'}}>
                    <strong>Selected: {getSelectedName('product', formData.product)}</strong>
                  </div>
                  <div className="grid grid-3">
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      />
                    </div>
                    {formData.reseller && (
                      <div className="form-group">
                        <label className="form-label">Reseller Price (Your Client Price)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={formData.dealership_price}
                          onChange={(e) => setFormData({...formData, dealership_price: e.target.value})}
                          placeholder="Enter markup price"
                        />
                      </div>
                    )}
                    <div className="form-group" style={{display: 'flex', alignItems: 'end'}}>
                      <button type="button" className="btn btn-primary" onClick={addToCart} style={{width: '100%'}}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {cart.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Cart ({cart.length} items)</label>
                  <div style={{background: 'rgba(15,15,25,0.6)', borderRadius: '8px', padding: '15px', maxHeight: '300px', overflowY: 'auto'}}>
                    {cart.map((item) => (
                      <div key={item.product_id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px'}}>
                        <div style={{flex: 1}}>
                          <strong>{item.product_name}</strong>
                          <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px'}}>
                            {formData.reseller ? (
                              <span style={{color: '#00ff88'}}>Reseller Price: ${item.dealership_price}</span>
                            ) : (
                              <span style={{color: '#00d4ff'}}>Customer Price: ${item.sale_price}</span>
                            )}
                          </div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartQuantity(item.product_id, e.target.value)}
                            style={{width: '60px', padding: '6px', background: 'rgba(15,15,25,0.8)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', color: 'white', textAlign: 'center'}}
                          />
                          <span style={{minWidth: '80px', textAlign: 'right', fontWeight: 'bold'}}>
                            ${((formData.reseller ? item.dealership_price : item.sale_price) * item.quantity).toFixed(2)}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => removeFromCart(item.product_id)} 
                            style={{background: 'rgba(255,0,128,0.2)', border: '1px solid rgba(255,0,128,0.3)', borderRadius: '4px', color: '#ff0080', padding: '6px 10px', cursor: 'pointer'}}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="RECEIVED">Product Received</option>
                    <option value="SOLD">Product Sold</option>
                    <option value="PAID_TO_COLLECT">Paid but to be Collected</option>
                    <option value="COLLECTED_TO_PAY">Collected but to Pay Later</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-input"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  >
                    <option value="CASH">Cash</option>
                    <option value="ECOCASH">EcoCash</option>
                    <option value="ONE_MONEY">One Money</option>
                    <option value="MUKURU">Mukuru</option>
                    <option value="INBUCKS">Inbucks</option>
                    <option value="MAMA_MONEY">Mama Money</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CARD">Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tax Status</label>
                  <select
                    className="form-input"
                    value={formData.is_taxed}
                    onChange={(e) => setFormData({...formData, is_taxed: e.target.value === 'true'})}
                  >
                    <option value="false">No Tax</option>
                    <option value="true">Taxed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ZIMRA Receipt No.</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.zimra_receipt_no}
                    onChange={(e) => setFormData({...formData, zimra_receipt_no: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about this transaction..."
                />
              </div>
              <div style={{padding: '15px', marginTop: '20px', background: 'rgba(0,212,255,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between'}}>
                <span>Total Amount {formData.reseller ? '(Reseller Price)' : '(Customer Price)'}:</span>
                <strong>${totalAmount.toFixed(2)}</strong>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Update' : 'Create'} Transaction
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
              <p>Are you sure you want to delete this transaction?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && receiptData && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px', margin: '20px'}}>
            <div className="modal-header">
              <h2>Receipt - {receiptData.receipt.receipt_number}</h2>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}>×</button>
            </div>
            <div className="modal-body receipt-content" style={{padding: '20px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.4'}}>
              <style>{`
                @media print {
                  @page { margin: 0; }
                  body * { visibility: hidden; }
                  .receipt-content, .receipt-content * { visibility: visible; }
                  .receipt-content { position: absolute; left: 0; top: 0; width: 100%; }
                  .no-print { display: none !important; }
                  title { display: none !important; }
                }
              `}</style>
              <div style={{textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '15px', marginBottom: '15px'}}>
                {receiptData.business.logo && <img src={receiptData.business.logo} alt="Logo" style={{maxHeight: '60px', marginBottom: '10px'}} />}
                <h3 style={{margin: '5px 0', fontSize: '18px'}}>{receiptData.business.business_name}</h3>
                <div style={{fontSize: '12px', color: '#666'}}>
                  <div>{receiptData.business.address}</div>
                  <div>Tel: {receiptData.business.phone}</div>
                  {receiptData.business.tax_number && <div>Tax No: {receiptData.business.tax_number}</div>}
                </div>
              </div>
              <div style={{marginBottom: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Receipt No:</span><span>{receiptData.receipt.receipt_number}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Date:</span><span>{receiptData.receipt.date}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Cashier:</span><span>{receiptData.staff.name}</span>
                </div>
                {receiptData.customer && (
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Customer:</span><span>{receiptData.customer.name}</span>
                  </div>
                )}
              </div>
              <div style={{borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '15px 0', marginBottom: '15px'}}>
                <div style={{fontWeight: 'bold', marginBottom: '10px'}}>ITEMS:</div>
                {receiptData.transaction.items && receiptData.transaction.items.length > 0 ? (
                  receiptData.transaction.items.map((item, index) => (
                    <div key={index}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                        <span>{item.product_name}</span>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px'}}>
                        <span>{item.quantity} x ${item.unit_price}</span>
                        <span>${item.total_price}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                      <span>{receiptData.transaction.product_name}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                      <span>{receiptData.transaction.quantity} x ${receiptData.transaction.unit_price}</span>
                      <span>${receiptData.receipt.total_amount}</span>
                    </div>
                  </div>
                )}
                {receiptData.receipt.tax_amount > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                    <span>Tax:</span><span>${receiptData.receipt.tax_amount}</span>
                  </div>
                )}
              </div>
              <div style={{marginBottom: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px'}}>
                  <span>TOTAL:</span><span>${receiptData.receipt.total_amount}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '5px'}}>
                  <span>Payment:</span><span>{receiptData.receipt.payment_method}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span>Status:</span><span>{receiptData.transaction.status}</span>
                </div>
                {receiptData.receipt.zimra_receipt_no && (
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                    <span>ZIMRA:</span><span>{receiptData.receipt.zimra_receipt_no}</span>
                  </div>
                )}
                {receiptData.transaction.notes && (
                  <div style={{marginTop: '10px', fontSize: '12px'}}>
                    <div><strong>Notes:</strong></div>
                    <div>{receiptData.transaction.notes}</div>
                  </div>
                )}
              </div>
              <div style={{borderTop: '1px dashed #ccc', paddingTop: '15px', textAlign: 'center', fontSize: '12px'}}>
                <div>{receiptData.business.receipt_footer_text}</div>
              </div>
            </div>
            <div className="modal-actions no-print" style={{display: 'flex', gap: '15px', justifyContent: 'center', padding: '20px'}}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowReceiptModal(false)} style={{fontSize: '20px', padding: '12px 16px'}}>
                ✕
              </button>
              <button type="button" className="btn btn-primary" onClick={() => printReceipt()} style={{fontSize: '20px', padding: '12px 16px'}}>
                🖨️
              </button>
              <button type="button" className="btn btn-success" onClick={() => downloadReceipt(receiptData)} style={{fontSize: '20px', padding: '12px 16px'}}>
                📥
              </button>
              <button type="button" className="btn btn-info" onClick={() => shareWhatsApp(receiptData)} style={{fontSize: '20px', padding: '12px 16px'}}>
                📱
              </button>
              <button type="button" className="btn btn-warning" onClick={() => handleEmailSend(receiptData)} style={{fontSize: '20px', padding: '12px 16px'}}>
                📧
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <h2>Send Receipt via Email</h2>
              <button className="modal-close" onClick={() => setShowEmailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => {
                if (emailAddress) {
                  sendEmailDirect(receiptData, emailAddress);
                  setShowEmailModal(false);
                  setEmailAddress('');
                }
              }}>
                Send Email
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

export default Transactions;