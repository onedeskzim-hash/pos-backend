import { useState } from 'react';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaBox, FaChartLine, FaUsers, FaShoppingCart, FaMobile } from 'react-icons/fa';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', formData);
      
      // Make actual API call to Django backend
      const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        // Store user data and token
        const userData = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          is_staff: data.user.is_staff,
          is_superuser: data.user.is_superuser,
        };
        onLogin(userData, data.token);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Desktop Splash Screen */}
      <div className="login-splash">
        <div className="splash-content">
          <h1>POS System</h1>
          <p>Modern Point of Sale solution for solar panel and electrical supplies dealers</p>
          
          <div className="splash-features">
            <div className="splash-feature">
              <FaChartLine className="splash-feature-icon" />
              <span className="splash-feature-text">Real-time Analytics</span>
            </div>
            <div className="splash-feature">
              <FaUsers className="splash-feature-icon" />
              <span className="splash-feature-text">Customer Management</span>
            </div>
            <div className="splash-feature">
              <FaShoppingCart className="splash-feature-icon" />
              <span className="splash-feature-text">Inventory Tracking</span>
            </div>
            <div className="splash-feature">
              <FaMobile className="splash-feature-icon" />
              <span className="splash-feature-text">Mobile First Design</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FaBox className="login-logo-icon" />
              <h1>POS System</h1>
            </div>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-container">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`login-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="login-spinner"></div>
              ) : (
                'Sign In'
              )}
            </button>


          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;