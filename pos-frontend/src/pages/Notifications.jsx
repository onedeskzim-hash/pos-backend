import { useState, useEffect } from 'react';
import { FaBell, FaTrash, FaCheck, FaSearch, FaTable, FaTh, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { notificationsAPI } from '../services/api';
import Toast from '../components/Toast';

const Notifications = () => {
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      const data = response.data?.results || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      showToast('Error loading notifications', 'error');
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

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
      showToast('Notification marked as read', 'success');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Error marking notification as read', 'error');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Notification deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('Error deleting notification', 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({...n, is_read: true})));
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Error marking all as read', 'error');
    }
  };

  const deleteAllNotifications = async () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      try {
        await notificationsAPI.deleteAll();
        setNotifications([]);
        showToast('All notifications deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting all notifications:', error);
        showToast('Error deleting all notifications', 'error');
      }
    }
  };

  const createTestNotifications = async () => {
    try {
      const response = await notificationsAPI.createTestNotifications();
      showToast(`${response.data.status}`, 'success');
      fetchNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error creating test notifications:', error);
      showToast('Error creating test notifications', 'error');
    }
  };



  const filteredNotifications = notifications.filter(notification =>
    notification.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notification.notification_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK':
      case 'STOCK_ALERT':
        return <FaExclamationTriangle />;
      case 'PAYMENT_DUE':
        return <FaInfoCircle />;
      case 'GENERAL':
      default:
        return <FaBell />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'LOW_STOCK':
      case 'STOCK_ALERT':
        return '#ff0080';
      case 'PAYMENT_DUE':
        return '#ffaa00';
      case 'GENERAL':
      default:
        return '#00d4ff';
    }
  };

  if (loading) {
    return (
      <div className="notifications">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">
              <FaBell /> Notifications
            </h1>
          </div>
          <div className="loading">Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <FaBell /> Notifications
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-success btn-sm" onClick={markAllAsRead}>
              <FaCheck /> Mark All Read
            </button>
            <button className="btn btn-danger btn-sm" onClick={deleteAllNotifications}>
              <FaTrash /> Delete All
            </button>
            <button className="btn btn-info btn-sm" onClick={createTestNotifications}>
              <FaBell /> Create Test
            </button>
            <button className="btn btn-warning btn-sm" onClick={() => deleteAllNotifications()}>
              <FaTrash /> Delete All Bad Data
            </button>
            <span className="badge badge-info">
              {notifications.filter(n => !n.is_read).length} Unread
            </span>
            <span className="badge badge-secondary">
              {notifications.length} Total
            </span>
          </div>
        </div>

        <div className="search-bar">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search notifications..."
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
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.6)' }}>
            <FaBell style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }} />
            <p>No notifications found</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map(notification => (
                  <tr key={notification.id} style={{ opacity: notification.is_read ? 0.7 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: getNotificationColor(notification.notification_type) }}>
                          {getNotificationIcon(notification.notification_type)}
                        </span>
                        {(notification.notification_type || 'GENERAL').replace('_', ' ')}
                      </div>
                    </td>
                    <td>{notification.message}</td>
                    <td>{new Date(notification.timestamp).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${!notification.is_read ? 'status-received' : 'status-paid'}`}>
                        {notification.is_read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {!notification.is_read && (
                          <button className="btn btn-sm btn-success" onClick={() => markAsRead(notification.id)}>
                            <FaCheck />
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => deleteNotification(notification.id)}>
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
            {filteredNotifications.map(notification => (
              <div key={notification.id} className="notification-card" style={{ opacity: notification.is_read ? 0.7 : 1 }}>
                <div className="card-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: getNotificationColor(notification.notification_type), fontSize: '1.2rem' }}>
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <h3 style={{ margin: 0, color: getNotificationColor(notification.notification_type) }}>
                      {(notification.notification_type || 'GENERAL').replace('_', ' ')}
                    </h3>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <p className="notification-date">{new Date(notification.timestamp).toLocaleString()}</p>
                  <div className="notification-status">
                    <span className={`status-badge ${!notification.is_read ? 'status-received' : 'status-paid'}`}>
                      {notification.is_read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <div className="card-actions">
                    {!notification.is_read && (
                      <button className="btn btn-sm btn-success" onClick={() => markAsRead(notification.id)}>
                        <FaCheck /> Mark Read
                      </button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => deleteNotification(notification.id)}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

export default Notifications;