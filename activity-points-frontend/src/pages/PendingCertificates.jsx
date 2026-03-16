import React, { useEffect, useState } from 'react';
import { Loader2, Award, Eye, Download } from 'lucide-react';
import tutorAxios from '../api/tutorAxios';
import CertModal from '../components/CertModal';
import '../css/PendingCertificates.css';

const PendingCertificates = () => {
  const [pendingCerts, setPendingCerts]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [processingId, setProcessingId]   = useState(null);
  const [modalUrl, setModalUrl]           = useState(null);
  const [modalFile, setModalFile]         = useState('');

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

  const handleAction = async (certId, action) => {
    const msg = action === 'approve'
      ? 'Approve this certificate?'
      : 'Reject this certificate? This cannot be undone.';
    if (!window.confirm(msg)) return;

    setProcessingId(certId);
    try {
      await tutorAxios.post(`/tutors/certificates/${certId}/${action}`);
      await fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} certificate`);
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
  if (!pendingCerts.length) return <p className="pending-loading"> No pending certificates right now.</p>;

  return (
    <div className="pending-container">
      {modalUrl && (
        <CertModal
          url={modalUrl}
          fileName={modalFile}
          onClose={() => { setModalUrl(null); setModalFile(''); }}
        />
      )}

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

              {/* FIX: view opens inline modal; download triggers actual file download */}
              <div className="cert-file-actions">
                <button className="view-link" onClick={() => openModal(cert)}>
                  <Eye size={14}/> View Certificate
                </button>
              </div>
            </div>

            <div className="card-right">
              <button
                className="btn-approve"
                onClick={() => handleAction(cert._id, 'approve')}
                disabled={isProcessing}
              >
                {isProcessing ? <><Loader2 size={14} className="spinner"/> Processing…</> : 'Approve'}
              </button>
              <button
                className="btn-reject"
                onClick={() => handleAction(cert._id, 'reject')}
                disabled={isProcessing}
              >
                {isProcessing ? <><Loader2 size={14} className="spinner"/> Processing…</> : 'Reject'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PendingCertificates;
