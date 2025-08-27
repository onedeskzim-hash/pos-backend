import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaChevronDown } from 'react-icons/fa';
import { productsAPI } from '../services/api';

const ProductSearchSelect = ({ value, onChange, placeholder = "Search and select product..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (value && !selectedProduct) {
      // Find the selected product from the current products list
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [value, products, selectedProduct]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && products.length === 0 && searchTerm === '') {
      setLoading(true);
      productsAPI.getAll()
        .then(response => {
          const data = response.data?.results || response.data || [];
          setProducts(Array.isArray(data) ? data : []);
        })
        .catch(error => {
          console.error('Error loading products:', error);
          setProducts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.length >= 1) {
      setLoading(true);
      const debounceTimer = setTimeout(() => {
        productsAPI.search(searchTerm)
          .then(response => {
            const data = response.data?.results || response.data || [];
            setProducts(Array.isArray(data) ? data : []);
          })
          .catch(error => {
            console.error('Error searching products:', error);
            setProducts([]);
          })
          .finally(() => setLoading(false));
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    onChange(product.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedProduct(null);
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="product-search-select" ref={dropdownRef} style={{ position: 'relative' }}>
      <div 
        className="form-control"
        onClick={handleToggleDropdown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          minHeight: '38px',
          padding: '6px 12px'
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>
          {selectedProduct ? (
            <span>
              {selectedProduct.name} (Stock: {selectedProduct.stock_quantity})
            </span>
          ) : (
            <span style={{ color: '#6c757d' }}>{placeholder}</span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearSelection();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc3545',
                cursor: 'pointer',
                padding: '0',
                fontSize: '14px'
              }}
            >
              ×
            </button>
          )}
          <FaChevronDown 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '0.375rem',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'hidden',
            color: '#ffffff'
          }}
        >
          <div style={{ padding: '8px' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#6c757d',
                  fontSize: '14px'
                }} 
              />
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Type to search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '35px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ffffff' }}>
                Searching...
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
                    backgroundColor: selectedProduct?.id === product.id ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProduct?.id !== product.id) {
                      e.target.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProduct?.id !== product.id) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                    Code: {product.product_unique_code} | Stock: {product.stock_quantity} | Price: ${product.default_sale_price}
                  </div>
                </div>
              ))
            ) : searchTerm.length >= 1 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ffffff' }}>
                No products found for "{searchTerm}"
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#ffffff' }}>
                Start typing to search products
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchSelect;