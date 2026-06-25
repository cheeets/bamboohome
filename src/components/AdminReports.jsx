import React, { useState, useEffect } from 'react'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Flag, CheckCircle, XCircle, Eye, Trash2, AlertTriangle } from 'lucide-react'
import '../css/AdminReports.css'

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const reportsList = []
      querySnapshot.forEach((doc) => {
        reportsList.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      setReports(reportsList)
    } catch (err) {
      console.error('Error fetching reports:', err)
      alert('Failed to load reports: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const reportRef = doc(db, 'reports', reportId)
      await updateDoc(reportRef, {
        status: newStatus,
        reviewed: true,
        reviewedAt: new Date(),
      })
      setReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, status: newStatus, reviewed: true } : report
        )
      )
      alert(`Report marked as ${newStatus}`)
    } catch (err) {
      console.error('Error updating report:', err)
      alert('Failed to update report status')
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return

    try {
      await deleteDoc(doc(db, 'reports', reportId))
      setReports(prev => prev.filter(r => r.id !== reportId))
      setSelectedReport(null)
      alert('Report deleted successfully')
    } catch (err) {
      console.error('Error deleting report:', err)
      alert('Failed to delete report')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredReports = filterStatus === 'all' 
    ? reports 
    : reports.filter(r => r.status === filterStatus)

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  }

  return (
    <div className="admin-reports-container">
      <div className="reports-stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Flag size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Reports</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.pending}</h3>
            <p>Pending Review</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon resolved">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.resolved}</h3>
            <p>Resolved</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon dismissed">
            <XCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.dismissed}</h3>
            <p>Dismissed</p>
          </div>
        </div>
      </div>

      <div className="reports-filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All Reports
        </button>
        <button
          className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${filterStatus === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('resolved')}
        >
          Resolved
        </button>
        <button
          className={`filter-btn ${filterStatus === 'dismissed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('dismissed')}
        >
          Dismissed
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading reports...</div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-state">
          <Flag size={48} />
          <p>No reports found</p>
        </div>
      ) : (
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reporter</th>
                <th>Store</th>
                <th>Product</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    <div className="reporter-cell">
                      <strong>{report.reporterName}</strong>
                      <small>{report.reporterEmail}</small>
                    </div>
                  </td>
                  <td>
                    <div className="store-cell">
                      <strong>{report.storeName}</strong>
                      <small>{report.sellerEmail}</small>
                    </div>
                  </td>
                  <td>{report.productName}</td>
                  <td>
                    <span className="reason-badge">{report.reason}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() => setSelectedReport(report)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {report.status === 'pending' && (
                        <>
                          <button
                            className="btn-resolve"
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            title="Mark as Resolved"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="btn-dismiss"
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            title="Dismiss Report"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteReport(report.id)}
                        title="Delete Report"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReport && (
        <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3><Flag size={20} /> Report Details</h3>
              <button onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="report-modal-body">
              <div className="report-detail-row">
                <strong>Report ID:</strong>
                <span>{selectedReport.id}</span>
              </div>
              <div className="report-detail-row">
                <strong>Submitted:</strong>
                <span>{formatDate(selectedReport.createdAt)}</span>
              </div>
              <div className="report-detail-row">
                <strong>Reporter:</strong>
                <span>{selectedReport.reporterName} ({selectedReport.reporterEmail})</span>
              </div>
              <div className="report-detail-row">
                <strong>Store:</strong>
                <span>{selectedReport.storeName}</span>
              </div>
              <div className="report-detail-row">
                <strong>Seller:</strong>
                <span>{selectedReport.sellerEmail}</span>
              </div>
              <div className="report-detail-row">
                <strong>Product:</strong>
                <span>{selectedReport.productName}</span>
              </div>
              <div className="report-detail-row">
                <strong>Reason:</strong>
                <span className="reason-badge">{selectedReport.reason}</span>
              </div>
              <div className="report-detail-row">
                <strong>Status:</strong>
                <span className={`status-badge ${selectedReport.status}`}>
                  {selectedReport.status}
                </span>
              </div>
              <div className="report-detail-full">
                <strong>Additional Details:</strong>
                <p>{selectedReport.details}</p>
              </div>
              {selectedReport.reviewed && (
                <div className="report-detail-row">
                  <strong>Reviewed:</strong>
                  <span>{formatDate(selectedReport.reviewedAt)}</span>
                </div>
              )}
            </div>
            <div className="report-modal-footer">
              {selectedReport.status === 'pending' && (
                <>
                  <button
                    className="btn-resolve-modal"
                    onClick={() => {
                      handleUpdateStatus(selectedReport.id, 'resolved')
                      setSelectedReport(null)
                    }}
                  >
                    <CheckCircle size={16} />
                    Mark as Resolved
                  </button>
                  <button
                    className="btn-dismiss-modal"
                    onClick={() => {
                      handleUpdateStatus(selectedReport.id, 'dismissed')
                      setSelectedReport(null)
                    }}
                  >
                    <XCircle size={16} />
                    Dismiss Report
                  </button>
                </>
              )}
              <button
                className="btn-delete-modal"
                onClick={() => handleDeleteReport(selectedReport.id)}
              >
                <Trash2 size={16} />
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
