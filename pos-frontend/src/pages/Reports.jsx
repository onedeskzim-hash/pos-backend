import { useState, useEffect } from 'react';
import { FaDownload, FaCalendarAlt, FaChartBar } from 'react-icons/fa';
import { reportsAPI } from '../services/api';

const Reports = () => {
  const [dailySummaries, setDailySummaries] = useState([]);
  const [profitLossReports, setProfitLossReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [dailyResponse, profitLossResponse] = await Promise.all([
        reportsAPI.getReports('daily'),
        reportsAPI.getReports('profit_loss')
      ]);
      // Use actual P&L data for daily summary to ensure consistency
      const plData = profitLossResponse.data;
      
      setDailySummaries([{ 
        id: 1, 
        date: new Date(), 
        total_amount: plData.total_sales || 0,
        total_expenses: plData.total_expenses || 0,
        net_profit: plData.net_profit || 0
      }]);
      setProfitLossReports([{ id: 1, ...profitLossResponse.data }]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setDailySummaries([]);
      setProfitLossReports([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reports">
        <div className="card">
          <div className="loading">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Reports</h1>
          <button className="btn btn-primary">
            <FaDownload /> Export Reports
          </button>
        </div>

        <div className="grid grid-2">
          <div className="report-section">
            <h2><FaCalendarAlt /> Daily Summaries</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Sales</th>
                    <th>Total Expenses</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.slice(0, 10).map((summary) => (
                    <tr key={summary.id}>
                      <td>{new Date(summary.date).toLocaleDateString()}</td>
                      <td>${summary.total_amount || summary.total_sales || 0}</td>
                      <td>${summary.total_expenses || 0}</td>
                      <td className={(summary.net_profit || 0) >= 0 ? 'profit' : 'loss'}>
                        ${summary.net_profit || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-section">
            <h2><FaChartBar /> Profit & Loss Reports</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Revenue</th>
                    <th>Expenses</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {profitLossReports.slice(0, 10).map((report) => (
                    <tr key={report.id}>
                      <td>{report.period || 'Current Period'}</td>
                      <td>${report.total_sales || 0}</td>
                      <td>${report.total_expenses || 0}</td>
                      <td className={(report.net_profit || 0) >= 0 ? 'profit' : 'loss'}>
                        ${report.net_profit || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;