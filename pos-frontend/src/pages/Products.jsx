import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTable, FaTh } from 'react-icons/fa';
import { productsAPI, categoriesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  
  // Check if user is admin - simple check for now
  const isAdmin = user?.is_superuser === true || user?.username === 'admin';
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    cost_price_avg: '',
    default_sale_price: '',
    stock_quantity: '',
    reorder_level: '',
    unit: 'unit'
  });

  // Auto-save functionality
  useEffect(() => {
    if (showModal) {
      const savedData = localStorage.getItem('productFormData');
      if (savedData && !editingProduct) {
        setFormData(JSON.parse(savedData));
      }
    }
  }, [showModal, editingProduct]);

  useEffect(() => {
    if (showModal && !editingProduct) {
      localStorage.setItem('productFormData', JSON.stringify(formData));
    }
  }, [formData, showModal, editingProduct]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      const productsData = response.data.results || response.data || [];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryFormData);
        showToast('Category updated successfully!', 'success');
      } else {
        await categoriesAPI.create(categoryFormData);
        showToast('Category created successfully!', 'success');
      }
      fetchCategories();
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      let errorMessage = 'Error saving category. Please try again.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.name) {
          errorMessage = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '' });
    setEditingCategory(null);
    setShowCategoryModal(false);
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
    
    // Validation
    if (!formData.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!formData.category) {
      showToast('Please select a category', 'error');
      return;
    }
    if (!formData.default_sale_price || parseFloat(formData.default_sale_price) <= 0) {
      showToast('Sale price must be greater than 0', 'error');
      return;
    }
    
    try {
      const productData = {
        ...formData,
        name: formData.name.trim(),
        category: parseInt(formData.category),
        cost_price_avg: parseFloat(formData.cost_price_avg) || 0,
        default_sale_price: parseFloat(formData.default_sale_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        reorder_level: parseInt(formData.reorder_level) || 0,
        unit: formData.unit.trim() || 'unit'
      };
      
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
        showToast('Product updated successfully!', 'success');
      } else {
        await productsAPI.create(productData);
        showToast('Product created successfully!', 'success');
      }
      fetchProducts();
      localStorage.removeItem('productFormData');
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      let errorMessage = 'Error saving product. Please try again.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.product_unique_code) {
          errorMessage = 'Product code already exists. Please try again.';
        } else if (errorData.barcode) {
          errorMessage = 'Barcode already exists. Please use a different barcode.';
        } else if (errorData.name) {
          errorMessage = 'Product name is required and must be unique.';
        } else {
          errorMessage = errorData.detail || errorData.message || errorMessage;
        }
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category?.id || product.category,
      cost_price_avg: product.cost_price_avg,
      default_sale_price: product.default_sale_price,
      stock_quantity: product.stock_quantity,
      reorder_level: product.reorder_level,
      unit: product.unit || 'unit'
    });
    setShowModal(true);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await productsAPI.delete(productToDelete.id);
      showToast('Product deleted successfully!', 'success');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error deleting product. Please try again.', 'error');
    }
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      cost_price_avg: '',
      default_sale_price: '',
      stock_quantity: '',
      reorder_level: '',
      unit: 'unit'
    });
    setEditingProduct(null);
    setShowModal(false);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_name || product.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="products">
        <div className="card">
          <div className="loading">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="products">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Products</h1>
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (!isAdmin) {
                showToast('Administrator access required', 'warning');
                return;
              }
              setShowModal(true);
            }}
          >
            <FaPlus /> Add Product
          </button>
        </div>

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products..."
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
                  <th>Description</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Buying Price</th>
                  <th>Selling Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.product_unique_code}</td>
                    <td>{product.name}</td>
                    <td>{product.description || 'No description'}</td>
                    <td>{product.category_name || product.category}</td>
                    <td>
                      <span className={product.stock_quantity <= product.reorder_level ? 'low-stock' : ''}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td>${product.cost_price_avg}</td>
                    <td>${product.default_sale_price}</td>
                    <td>
                      <>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => {
                            if (!isAdmin) {
                              showToast('Administrator access required', 'warning');
                              return;
                            }
                            handleEdit(product);
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (!isAdmin) {
                              showToast('Administrator access required', 'warning');
                              return;
                            }
                            handleDelete(product);
                          }}
                        >
                          <FaTrash />
                        </button>
                      </>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="card-content">
                  <h3>{product.name}</h3>
                  <p className="product-code">{product.product_unique_code}</p>
                  <p className="product-category">{product.category_name || product.category}</p>
                  <div className="product-prices">
                    <span className="cost-price">Cost: ${product.cost_price_avg}</span>
                    <span className="sale-price">Sale: ${product.default_sale_price}</span>
                  </div>
                  <div className="product-stock">
                    <span className={product.stock_quantity <= product.reorder_level ? 'low-stock' : ''}>
                      Stock: {product.stock_quantity}
                    </span>
                  </div>
                  <div className="card-actions">
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Administrator access required', 'warning');
                          return;
                        }
                        handleEdit(product);
                      }}
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Administrator access required', 'warning');
                          return;
                        }
                        handleDelete(product);
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
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter product name (e.g., Solar Panel 100W)"
                  required
                />
                <small className="form-help">Product name must be unique and descriptive</small>
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      if (!isAdmin) {
                        showToast('Administrator access required', 'warning');
                        return;
                      }
                      setShowCategoryModal(true);
                    }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <FaPlus /> Add Category
                  </button>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.cost_price_avg}
                    onChange={(e) => setFormData({...formData, cost_price_avg: e.target.value})}
                    placeholder="0.00"
                  />
                  <small className="form-help">Your purchase/wholesale price (optional)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    value={formData.default_sale_price}
                    onChange={(e) => setFormData({...formData, default_sale_price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                  <small className="form-help">Retail price customers will pay</small>
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    placeholder="0"
                  />
                  <small className="form-help">Current stock on hand</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
                    placeholder="0"
                  />
                  <small className="form-help">Alert when stock falls below this level</small>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="e.g., piece, kg, meter, liter"
                />
                <small className="form-help">How this product is counted/measured</small>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Product description (optional)..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update' : 'Save'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={resetCategoryForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="modal-close" onClick={resetCategoryForm}>×</button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                  placeholder="Category description (optional)..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetCategoryForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Save'} Category
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
              <p>Are you sure you want to delete <strong>{productToDelete?.name}</strong>?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Delete Product
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

export default Products;