import React, { useEffect, useState } from 'react';
import { Loader2, Award, Eye, AlertCircle, X } from 'lucide-react';
import tutorAxios from '../api/tutorAxios';
import CertModal from '../components/CertModal';
import '../css/PendingCertificates.css';

const PendingCertificates = () => {
  const [pendingCerts, setPendingCerts]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [processingId, setProcessingId]   = useState(null);
  const [modalUrl, setModalUrl]           = useState(null);
  const [modalFile, setModalFile]         = useState('');

  // Reject reason modal state
  const [rejectingCert, setRejectingCert] = useState(null); // cert object
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectError, setRejectError]     = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await tutorAxios.get('/tutors/certificates/pending');
      setPendingCerts(res.data || []);
    } catch (err) {
      console.error('Error fetching pending certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const getPotentialPoints = (cert) => {
    if (!cert?.category) return 0;
    const sub = cert.category.subcategories?.find(
      s => s.name.toLowerCase() === cert.subcategory?.toLowerCase()
    );
    if (!sub) return 0;
    if (sub.fixedPoints != null) return sub.fixedPoints;
    if (sub.levels && cert.level && cert.prizeType) {
      const lvl   = sub.levels.find(l => l.name === cert.level);
      const prize = lvl?.prizes.find(p => p.type === cert.prizeType);
      return prize?.points ?? 0;
    }
    return 0;
  };

  // ── Approve (simple confirm) ──
  const handleApprove = async (certId) => {
    if (!window.confirm('Approve this certificate?')) return;
    setProcessingId(certId);
    try {
      await tutorAxios.post(`/tutors/certificates/${certId}/approve`);
      await fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve certificate');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Reject: open reason modal ──
  const openRejectModal = (cert) => {
    setRejectingCert(cert);
    setRejectReason('');
    setRejectError('');
  };

  const closeRejectModal = () => {
    setRejectingCert(null);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Please provide a reason for rejection so the student knows what to fix.');
      return;
    }
    setProcessingId(rejectingCert._id);
    closeRejectModal();
    try {
      await tutorAxios.post(`/tutors/certificates/${rejectingCert._id}/reject`, {
        reason: rejectReason.trim(),
      });
      await fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject certificate');
    } finally {
      setProcessingId(null);
    }
  };

  const openModal = (cert) => {
    const ext  = cert.fileUrl?.split('.').pop()?.split('?')[0] || 'jpg';
    const name = `${cert.student?.name || 'certificate'}_${cert.subcategory || ''}.${ext}`;
    setModalFile(name);
    setModalUrl(cert.fileUrl);
  };

  if (loading) return <p className="pending-loading"><Loader2 className="spinner"/> Loading pending certificates…</p>;
  if (!pendingCerts.length) return (
    <div className="pending-loading" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <Award size={48} style={{ color: '#22c55e', marginBottom: '0.5rem' }} />
      <p style={{ color: '#15803d', fontWeight: 600 }}>All caught up! No pending certificates.</p>
    </div>
  );

  return (
    <div className="pending-container">
      {/* ── Image / PDF viewer modal ── */}
      {modalUrl && (
        <CertModal
          url={modalUrl}
          fileName={modalFile}
          onClose={() => { setModalUrl(null); setModalFile(''); }}
        />
      )}

      {/* ── Reject reason modal ── */}
      {rejectingCert && (
        <div className="reject-overlay" onClick={e => { if (e.target === e.currentTarget) closeRejectModal(); }}>
          <div className="reject-modal">
            <div className="reject-modal-header">
              <div className="reject-modal-title">
                <AlertCircle size={20} className="reject-icon" />
                <span>Reject Certificate</span>
              </div>
              <button className="reject-close-btn" onClick={closeRejectModal}><X size={18}/></button>
            </div>

            <div className="reject-modal-body">
              <div className="reject-cert-info">
                <strong>{rejectingCert.student?.name}</strong>
                <span> — {rejectingCert.category?.name} / {rejectingCert.subcategory}</span>
              </div>

              <label className="reject-label">
                Reason for rejection <span className="reject-required">*</span>
                <span className="reject-hint">The student will see this message.</span>
              </label>
              <textarea
                className="reject-textarea"
                placeholder="e.g. Certificate image is blurry and unreadable. Please re-upload a clear scan."
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setRejectError(''); }}
                rows={4}
                autoFocus
              />
              {rejectError && <p className="reject-error"><AlertCircle size={13}/> {rejectError}</p>}
            </div>

            <div className="reject-modal-footer">
              <button className="reject-cancel-btn" onClick={closeRejectModal}>Cancel</button>
              <button className="reject-confirm-btn" onClick={submitReject}>
                Reject Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificate cards ── */}
      {pendingCerts.map(cert => {
        const isProcessing = processingId === cert._id;
        const points       = getPotentialPoints(cert);

        return (
          <div key={cert._id} className="pending-card">
            <div className="card-left">
              <h3 className="student-name">{cert.student?.name || 'N/A'}</h3>
              <p className="reg-no">{cert.student?.registerNumber}</p>

              <p><strong>Category:</strong> {cert.category?.name || 'N/A'}</p>
              <p><strong>Subcategory:</strong> {cert.subcategory || 'N/A'}</p>

              {(cert.level || cert.prizeType) && (
                <p className="level-info">
                  <Award size={14}/>
                  {cert.level ?? ''}{cert.level && cert.prizeType ? ' · ' : ''}{cert.prizeType ?? ''}
                </p>
              )}

              <p className="points"><strong>Points:</strong> {points} pts</p>

              <div className="cert-file-actions">
                <button className="view-link" onClick={() => openModal(cert)}>
                  <Eye size={14}/> View Certificate
                </button>
              </div>
            </div>

            <div className="card-right">
              <button
                className="btn-approve"
                onClick={() => handleApprove(cert._id)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <><Loader2 size={14} className="spinner"/> Processing…</>
                  : 'Approve'
                }
              </button>
              <button
                className="btn-reject"
                onClick={() => openRejectModal(cert)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <><Loader2 size={14} className="spinner"/> Processing…</>
                  : 'Reject'
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PendingCertificates;
