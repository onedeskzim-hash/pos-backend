import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBox, FaUsers, FaUserTie, FaExchangeAlt, FaChartBar, FaCog, FaBars, FaTimes, FaSignOutAlt, FaBell, FaChevronDown, FaFileInvoice, FaBoxes, FaMoneyBillWave } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { path: '/', icon: FaHome, label: 'Dashboard' },
    { path: '/products', icon: FaBox, label: 'Products' },
    { path: '/customers', icon: FaUsers, label: 'Customers' },
    { path: '/resellers', icon: FaUserTie, label: 'Resellers' },
    { path: '/transactions', icon: FaExchangeAlt, label: 'Transactions' },
    { path: '/reports', icon: FaChartBar, label: 'Reports' },
  ];

  const moreItems = [
    { path: '/invoice-generation', icon: FaFileInvoice, label: 'Invoice Generation' },
    { path: '/stock-movement', icon: FaBoxes, label: 'Stock Movement' },
    { path: '/expenses', icon: FaMoneyBillWave, label: 'Add Expenses' },
    { path: '/payments-collections', icon: FaMoneyBillWave, label: 'Payments & Collections' },
    { path: '/notifications', icon: FaBell, label: 'Notifications' },
    { path: '/settings', icon: FaCog, label: 'Settings' },
  ];

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      const data = response.data?.results || response.data || [];
      const notificationsList = Array.isArray(data) ? data : [];
      const unreadNotifications = notificationsList.filter(n => !n.is_read);
      setNotifications(unreadNotifications.slice(0, 5));
      setNotificationCount(unreadNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setNotificationCount(0);
    }
  };

  const handleNotificationClick = (notification) => {
    setShowNotifications(false);
    navigate('/notifications');
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    fetchNotifications();
    
    // Fetch notifications every 10 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 10000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Top bar for mobile */}
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <FaBox className="logo-icon" />
              <span>POS</span>
            </Link>
            <div className="nav-actions">
              <span className="user-name">Hi, {user?.username}</span>
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
              </button>
              <div className="nav-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaTimes /> : <FaBars />}
              </div>
            </div>
          </div>
          
          {/* Mobile menu overlay */}
          {isOpen && (
            <div className="nav-overlay" onClick={() => setIsOpen(false)} />
          )}
          
          <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* Bottom navigation for mobile */}
        <nav className="bottom-nav">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <Icon className="bottom-nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <FaBox className="logo-icon" />
          <span>POS System</span>
        </Link>

        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="nav-dropdown">
            <button 
              className="nav-link dropdown-toggle"
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
            >
              <FaBars className="nav-icon" />
              <span>More</span>
              <FaChevronDown className="dropdown-arrow" />
            </button>
            {showMoreDropdown && (
              <div className="dropdown-menu">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`dropdown-item ${location.pathname === item.path ? 'active' : ''}`}
                      onClick={() => {setShowMoreDropdown(false); setIsOpen(false);}}
                    >
                      <Icon className="dropdown-icon" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="nav-actions">
          <div className="notification-dropdown">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell className="notification-icon" />
              {notificationCount > 0 && (
                <span className="notification-count">{notificationCount > 99 ? '99+' : notificationCount}</span>
              )}
            </button>
            {showNotifications && (
              <div className="notification-menu">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  <Link to="/notifications" onClick={() => setShowNotifications(false)}>View All</Link>
                </div>
                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p>{notification.message}</p>
                        <small>{new Date(notification.timestamp).toLocaleDateString()}</small>
                      </div>
                    ))
                  ) : (
                    <div className="notification-item">
                      <p>No notifications available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <span className="user-name">Welcome, {user?.username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
          </button>
          <div className="nav-toggle" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;