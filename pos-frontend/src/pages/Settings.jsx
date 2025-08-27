import { useState, useEffect } from 'react';
import { FaSave, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { businessAPI } from '../services/api';
import Toast from '../components/Toast';

const Settings = () => {
  const [businessProfile, setBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    tax_number: '',
    address: '',
    phone: '',
    email: '',
    zimra_enabled: false,
    zimra_tax_rate: 15.0,
    zimra_api_url: '',
    zimra_client_id: '',
    zimra_device_id: '',
    zimra_branch_code: '',
    zimra_terminal_id: ''
  });

  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    try {
      const response = await businessAPI.getProfile();
      const profiles = response.data.results || response.data || [];
      if (profiles.length > 0) {
        const profile = profiles[0];
        setBusinessProfile(profile);
        setFormData({
          business_name: profile.business_name || '',
          legal_name: profile.legal_name || '',
          tax_number: profile.tax_number || '',
          address: profile.address || '',
          phone: profile.phone || '',
          email: profile.email || '',
          zimra_enabled: profile.zimra_enabled || false,
          zimra_tax_rate: profile.zimra_tax_rate || 15.0,
          zimra_api_url: profile.zimra_api_url || '',
          zimra_client_id: profile.zimra_client_id || '',
          zimra_device_id: profile.zimra_device_id || '',
          zimra_branch_code: profile.zimra_branch_code || '',
          zimra_terminal_id: profile.zimra_terminal_id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (businessProfile) {
        await businessAPI.updateProfile(businessProfile.id, formData);
        setToast({ message: 'Settings updated successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setToast({ message: 'Error updating settings', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="settings">
        <div className="card">
          <div className="loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Business Settings</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h2>Business Information</h2>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Legal Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Tax Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({...formData, tax_number: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2>ZIMRA Integration</h2>
            <div className="form-group">
              <label className="form-label">
                <div className="toggle-container">
                  <span>Enable ZIMRA Integration</span>
                  <button
                    type="button"
                    className={`toggle-btn ${formData.zimra_enabled ? 'active' : ''}`}
                    onClick={() => setFormData({...formData, zimra_enabled: !formData.zimra_enabled})}
                  >
                    {formData.zimra_enabled ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </div>
              </label>
            </div>
            
            {formData.zimra_enabled && (
              <>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.zimra_tax_rate}
                      onChange={(e) => setFormData({...formData, zimra_tax_rate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">API URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={formData.zimra_api_url}
                      onChange={(e) => setFormData({...formData, zimra_api_url: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Client ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.zimra_client_id}
                      onChange={(e) => setFormData({...formData, zimra_client_id: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Device ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.zimra_device_id}
                      onChange={(e) => setFormData({...formData, zimra_device_id: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Branch Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.zimra_branch_code}
                      onChange={(e) => setFormData({...formData, zimra_branch_code: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Terminal ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.zimra_terminal_id}
                      onChange={(e) => setFormData({...formData, zimra_terminal_id: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <FaSave /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;