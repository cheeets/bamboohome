import React, { useState, useEffect } from 'react'
import { useConfirmation } from '../context/ConfirmationContext'
import { db } from '../services/firebase'
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { sendSellerWarning } from '../services/notificationService'
import { Flag, CheckCircle, XCircle, Eye, Trash2, AlertTriangle, Send } from 'lucide-react'
import { Toast } from './Toast'
import '../css/AdminReports.css'

export default function AdminReports() {
  const { openConfirmation } = useConfirmation()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningMessage, setWarningMessage] = useState('Please adhere to our platform policies. Violations may result in account suspension.')
  const [sendingWarning, setSendingWarning] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')

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
      setToastMessage('Failed to load reports: ' + err.message)
      setToastType('error')
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
      setToastMessage(`Report marked as ${newStatus}`)
      setToastType('success')
    } catch (err) {
      console.error('Error updating report:', err)
      setToastMessage('Failed to update report status')
      setToastType('error')
    }
  }

  const handleDeleteReport = async (reportId) => {
    openConfirmation({
      title: 'Delete Report',
      message: 'Are you sure you want to delete this report?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'reports', reportId))
          setReports(prev => prev.filter(r => r.id !== reportId))
          setSelectedReport(null)
          setToastMessage('Report deleted successfully')
          setToastType('success')
        } catch (err) {
          console.error('Error deleting report:', err)
          setToastMessage('Failed to delete report')
          setToastType('error')
        }
      }
    })
  }

  const handleSendWarning = async () => {
    if (!selectedReport || !selectedReport.sellerId) {
      setToastMessage('Cannot send warning: Seller information missing')
      setToastType('error')
      return
    }

    if (!warningMessage.trim()) {
      setToastMessage('Please enter a warning message')
      setToastType('error')
      return
    }

    try {
      setSendingWarning(true)
      const success = await sendSellerWarning(
        selectedReport.sellerId,
        warningMessage,
        selectedReport.id,
        selectedReport.reason
      )

      if (success) {
        setToastMessage('Warning sent to seller successfully!')
        setToastType('success')
        setShowWarningModal(false)
        setWarningMessage('Please adhere to our platform policies. Violations may result in account suspension.')
        // Update report status to resolved
        await handleUpdateStatus(selectedReport.id, 'resolved')
      } else {
        setToastMessage('Failed to send warning to seller')
        setToastType('error')
      }
    } catch (err) {
      console.error('Error sending warning:', err)
      setToastMessage('Failed to send warning: ' + err.message)
      setToastType('error')
    } finally {
      setSendingWarning(false)
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
                    className="btn-warning-modal"
                    onClick={() => setShowWarningModal(true)}
                    title="Send Warning"
                  >
                    <AlertTriangle size={16} />
                    Send Warning
                  </button>
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

      {showWarningModal && selectedReport && (
        <div className="warning-modal-overlay" onClick={() => !sendingWarning && setShowWarningModal(false)}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="warning-modal-header">
              <h3><AlertTriangle size={20} /> Send Warning to Seller</h3>
              <button onClick={() => !sendingWarning && setShowWarningModal(false)} disabled={sendingWarning}>×</button>
            </div>
            <div className="warning-modal-body">
              <div className="warning-info">
                <p><strong>Store:</strong> {selectedReport.storeName}</p>
                <p><strong>Seller Email:</strong> {selectedReport.sellerEmail}</p>
                <p><strong>Reason:</strong> {selectedReport.reason}</p>
              </div>
              <div className="warning-form-group">
                <label>Warning Message *</label>
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="Enter the warning message to send to the seller..."
                  className="warning-textarea"
                  rows={5}
                  disabled={sendingWarning}
                />
                <p className="char-count">{warningMessage.length} characters</p>
              </div>
            </div>
            <div className="warning-modal-footer">
              <button
                className="btn-cancel-warning"
                onClick={() => setShowWarningModal(false)}
                disabled={sendingWarning}
              >
                Cancel
              </button>
              <button
                className="btn-send-warning"
                onClick={handleSendWarning}
                disabled={sendingWarning || !warningMessage.trim()}
              >
                <Send size={16} />
                {sendingWarning ? 'Sending...' : 'Send Warning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  )
}
