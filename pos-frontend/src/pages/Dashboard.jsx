import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBox, FaUsers, FaMoneyBillWave, FaChartLine, FaArrowUp, FaArrowDown, FaEye, FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { reportsAPI, productsAPI, customersAPI, transactionsAPI, expensesAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    total_products: 0,
    total_customers: 0,
    total_sales: 0,
    pending_collections: 0,
    recent_transactions: [],
    cash_sales: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
    received_products: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
    profits: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
    expenses: { daily: 0, weekly: 0, monthly: 0, overall: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [productsRes, customersRes, transactionsRes, expensesRes] = await Promise.all([
        productsAPI.getAll(),
        customersAPI.getAll(),
        transactionsAPI.getAll(),
        expensesAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const products = productsRes.data.results || productsRes.data || [];
      const customers = customersRes.data.results || customersRes.data || [];
      const transactions = transactionsRes.data.results || transactionsRes.data || [];
      const expenses = expensesRes.data.results || expensesRes.data || [];

      // Calculate dashboard metrics
      const totalSales = transactions
        .filter(t => ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY'].includes(t.status))
        .reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);

      const pendingCollections = transactions
        .filter(t => t.status === 'PAID_TO_COLLECT').length;

      // Get recent transactions (last 5)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Calculate time-based metrics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      // Cash sales calculations
      const cashTransactions = transactions.filter(t => t.payment_method === 'CASH' && ['SOLD', 'PAID_TO_COLLECT'].includes(t.status));
      const cashSales = {
        daily: cashTransactions.filter(t => new Date(t.timestamp) >= today).reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        weekly: cashTransactions.filter(t => new Date(t.timestamp) >= weekAgo).reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        monthly: cashTransactions.filter(t => new Date(t.timestamp) >= monthAgo).reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0),
        overall: cashTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0)
      };

      // Received products calculations
      const receivedTransactions = transactions.filter(t => t.status === 'RECEIVED');
      const receivedProducts = {
        daily: receivedTransactions.filter(t => new Date(t.timestamp) >= today).reduce((sum, t) => sum + (t.quantity || 0), 0),
        weekly: receivedTransactions.filter(t => new Date(t.timestamp) >= weekAgo).reduce((sum, t) => sum + (t.quantity || 0), 0),
        monthly: receivedTransactions.filter(t => new Date(t.timestamp) >= monthAgo).reduce((sum, t) => sum + (t.quantity || 0), 0),
        overall: receivedTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0)
      };

      // Profits calculations (total_amount - dealership_price * quantity)
      const profitTransactions = transactions.filter(t => ['SOLD', 'PAID_TO_COLLECT'].includes(t.status));
      const calculateProfit = (trans) => {
        const total = parseFloat(trans.total_amount || 0);
        const cost = parseFloat(trans.dealership_price || 0) * (trans.quantity || 1);
        return total - cost;
      };
      
      const profits = {
        daily: profitTransactions.filter(t => new Date(t.timestamp) >= today).reduce((sum, t) => sum + calculateProfit(t), 0),
        weekly: profitTransactions.filter(t => new Date(t.timestamp) >= weekAgo).reduce((sum, t) => sum + calculateProfit(t), 0),
        monthly: profitTransactions.filter(t => new Date(t.timestamp) >= monthAgo).reduce((sum, t) => sum + calculateProfit(t), 0),
        overall: profitTransactions.reduce((sum, t) => sum + calculateProfit(t), 0)
      };

      // Expenses calculations
      const expenseMetrics = {
        daily: expenses.filter(e => new Date(e.date) >= today).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        weekly: expenses.filter(e => new Date(e.date) >= weekAgo).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        monthly: expenses.filter(e => new Date(e.date) >= monthAgo).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        overall: expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
      };

      setDashboardData({
        total_products: products.length,
        total_customers: customers.length,
        total_sales: totalSales,
        pending_collections: pendingCollections,
        recent_transactions: recentTransactions,
        cash_sales: cashSales,
        received_products: receivedProducts,
        profits: profits,
        expenses: expenseMetrics
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty state on error
      setDashboardData({
        total_products: 0,
        total_customers: 0,
        total_sales: 0,
        pending_collections: 0,
        recent_transactions: [],
        cash_sales: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
        received_products: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
        profits: { daily: 0, weekly: 0, monthly: 0, overall: 0 },
        expenses: { daily: 0, weekly: 0, monthly: 0, overall: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Products',
      value: dashboardData.total_products,
      icon: FaBox,
      color: '#00d4ff',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Customers',
      value: dashboardData.total_customers,
      icon: FaUsers,
      color: '#00ff88',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'Sales',
      value: `$${dashboardData.total_sales?.toLocaleString() || '0'}`,
      icon: FaMoneyBillWave,
      color: '#ffaa00',
      trend: '+24%',
      trendUp: true
    },
    {
      title: 'Collections',
      value: dashboardData.pending_collections,
      icon: FaChartLine,
      color: '#ff0080',
      trend: '-5%',
      trendUp: false
    }
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="card">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Thin Welcome Header */}
      <div className="welcome-banner" style={{ padding: '10px 0', minHeight: 'auto' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>Welcome Back!</h1>
        <p style={{ margin: '0', fontSize: '0.9rem' }}>Here's what's happening with your business today</p>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-cards-grid">
        <div className="quick-action-btn" onClick={() => navigate('/transactions')}>
          <FaPlus className="quick-action-icon" />
          <div className="quick-action-content">
            <h3>New Sale</h3>
            <p>Start a new transaction</p>
          </div>
        </div>
        
        <div className="quick-action-btn" onClick={() => navigate('/customers')}>
          <FaUsers className="quick-action-icon" />
          <div className="quick-action-content">
            <h3>Add Customer</h3>
            <p>Register new customer</p>
          </div>
        </div>
        
        <div className="quick-action-btn" onClick={() => navigate('/products')}>
          <FaBox className="quick-action-icon" />
          <div className="quick-action-content">
            <h3>Add Product</h3>
            <p>Add new inventory</p>
          </div>
        </div>
        
        <div className="quick-action-btn" onClick={() => navigate('/reports')}>
          <FaChartLine className="quick-action-icon" />
          <div className="quick-action-content">
            <h3>View Reports</h3>
            <p>Check analytics</p>
          </div>
        </div>
      </div>

      {/* Business Metrics Cards */}
      <div className="dashboard-cards-grid">
        <div className="stat-card hover-lift">
          <div className="stat-icon" style={{ color: '#00d4ff' }}>
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <div className="stat-value">${dashboardData.cash_sales.daily.toFixed(0)}</div>
            <div className="stat-title">Cash Sales Today</div>
            <div className="stat-breakdown">
              <small>Week: ${dashboardData.cash_sales.weekly.toFixed(0)} | Month: ${dashboardData.cash_sales.monthly.toFixed(0)} | Total: ${dashboardData.cash_sales.overall.toFixed(0)}</small>
            </div>
          </div>
        </div>

        <div className="stat-card hover-lift">
          <div className="stat-icon" style={{ color: '#00ff88' }}>
            <FaBox />
          </div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.received_products.daily}</div>
            <div className="stat-title">Products Received Today</div>
            <div className="stat-breakdown">
              <small>Week: {dashboardData.received_products.weekly} | Month: {dashboardData.received_products.monthly} | Total: {dashboardData.received_products.overall}</small>
            </div>
          </div>
        </div>

        <div className="stat-card hover-lift">
          <div className="stat-icon" style={{ color: '#ffaa00' }}>
            <FaChartLine />
          </div>
          <div className="stat-content">
            <div className="stat-value">${dashboardData.profits.daily.toFixed(0)}</div>
            <div className="stat-title">Profits Today</div>
            <div className="stat-breakdown">
              <small>Week: ${dashboardData.profits.weekly.toFixed(0)} | Month: ${dashboardData.profits.monthly.toFixed(0)} | Total: ${dashboardData.profits.overall.toFixed(0)}</small>
            </div>
          </div>
        </div>

        <div className="stat-card hover-lift">
          <div className="stat-icon" style={{ color: '#ff0080' }}>
            <FaMoneyBillWave />
          </div>
          <div className="stat-content">
            <div className="stat-value">${dashboardData.expenses.daily.toFixed(0)}</div>
            <div className="stat-title">Expenses Today</div>
            <div className="stat-breakdown">
              <small>Week: ${dashboardData.expenses.weekly.toFixed(0)} | Month: ${dashboardData.expenses.monthly.toFixed(0)} | Total: ${dashboardData.expenses.overall.toFixed(0)}</small>
            </div>
          </div>
        </div>
      </div>

      {/* Stats and Actions Grid */}
      <div className="dashboard-cards-grid">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendUp ? FaArrowUp : FaArrowDown;
          return (
            <div key={index} className="stat-card hover-lift">
              <div className="stat-icon" style={{ color: stat.color }}>
                <Icon />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-title">{stat.title}</div>
                <div className={`stat-trend ${stat.trendUp ? 'trend-up' : 'trend-down'}`}>
                  <TrendIcon />
                  <span>{stat.trend}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity - Full Width */}
      <div className="card" style={{ width: '100%', marginTop: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">📊 Recent Activity</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>
            <FaEye /> View All
          </button>
        </div>
        
        {dashboardData.recent_transactions.length > 0 ? (
          <div className="activity-list" style={{ padding: '0' }}>
            {dashboardData.recent_transactions.map((transaction, index) => (
              <div key={transaction.id} className="activity-item" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                minHeight: '50px',
                borderBottom: index < dashboardData.recent_transactions.length - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: '#f8f9fa',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              >
                <div className="activity-icon" style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#e3f2fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  color: '#1976d2'
                }}>
                  <FaExchangeAlt size={16} />
                </div>
                
                <div className="activity-details" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="activity-info" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="activity-main">
                      <div className="activity-title" style={{ 
                        fontWeight: '600', 
                        fontSize: '14px', 
                        color: '#333',
                        marginBottom: '2px'
                      }}>
                        {transaction.transaction_code || `Transaction #${transaction.id}`}
                      </div>
                      <div className="activity-subtitle" style={{ 
                        fontSize: '12px', 
                        color: '#666'
                      }}>
                        {transaction.customer_name || 'No Customer'}
                      </div>
                    </div>
                    
                    <div className="activity-type" style={{
                      fontSize: '11px',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      minWidth: '80px'
                    }}>
                      Transaction
                    </div>
                  </div>
                  
                  <div className="activity-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="activity-amount" style={{ 
                      fontWeight: '700', 
                      fontSize: '14px',
                      color: '#2e7d32',
                      minWidth: '80px',
                      textAlign: 'right'
                    }}>
                      ${parseFloat(transaction.total_amount || 0).toFixed(2)}
                    </div>
                    
                    <span className={`status-badge status-${(transaction.status || '').toLowerCase().replace('_', '-')}`} style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                      minWidth: '90px',
                      textAlign: 'center',
                      backgroundColor: transaction.status === 'SOLD' ? '#e8f5e8' : 
                                     transaction.status === 'RECEIVED' ? '#fff3e0' :
                                     transaction.status === 'PAID_TO_COLLECT' ? '#e3f2fd' : '#f3e5f5',
                      color: transaction.status === 'SOLD' ? '#2e7d32' : 
                             transaction.status === 'RECEIVED' ? '#f57c00' :
                             transaction.status === 'PAID_TO_COLLECT' ? '#1976d2' : '#7b1fa2'
                    }}>
                      {(transaction.status || 'Unknown').replace('_', ' ')}
                    </span>
                    
                    <div className="activity-time" style={{
                      fontSize: '11px',
                      color: '#999',
                      minWidth: '60px',
                      textAlign: 'right'
                    }}>
                      {new Date(transaction.timestamp || transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ 
            padding: '40px 20px', 
            textAlign: 'center',
            color: '#666'
          }}>
            <FaChartLine size={48} style={{ color: '#ddd', marginBottom: '16px' }} />
            <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>No recent activity</p>
            <button className="btn btn-primary" onClick={() => navigate('/transactions')}>
              <FaPlus /> Create Transaction
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button className="fab">
        <FaPlus />
      </button>
    </div>
  );
};

export default Dashboard;