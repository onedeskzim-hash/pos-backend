import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Resellers from './pages/Resellers';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import InvoiceGeneration from './pages/InvoiceGeneration';
import StockMovement from './pages/StockMovement';
import Expenses from './pages/Expenses';
import Notifications from './pages/Notifications';
import PaymentsCollections from './pages/PaymentsCollections';
import './App.css';

function AppContent() {
  const { isAuthenticated, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/resellers" element={<Resellers />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/invoice-generation" element={<InvoiceGeneration />} />
          <Route path="/stock-movement" element={<StockMovement />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/payments-collections" element={<PaymentsCollections />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;