import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  ArrowLeft, FileText, Calendar, Award,
  Eye, Download, CheckCircle, Clock, XCircle
} from 'lucide-react';
import '../css/certificatespage.css';
import { useNavigate } from 'react-router-dom';

export default function CertificatesPage() {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [certRes, catRes] = await Promise.all([
          axiosInstance.get('/certificates/my'),
          axiosInstance.get('/categories'),
        ]);
        setCertificates(certRes.data.certificates || []);
        setCategories(catRes.data.categories || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helpers
  const getCategoryById = (id) => {
    if (!id) return null;
    const searchId = id._id || id;
    return categories.find(c => c._id === searchId) || null;
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <CheckCircle className="icon status-approved-icon" />;
      case 'pending':  return <Clock className="icon status-pending-icon" />;
      case 'rejected': return <XCircle className="icon status-rejected-icon" />;
      default:         return null;
    }
  };

  const getStatusColorClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending':  return 'status-pending';
      case 'rejected': return 'status-rejected';
      default:         return 'status-default';
    }
  };

  // Points display: approved = actual awarded, pending = potential
  const displayPoints = (cert) => {
    if (cert.status?.toLowerCase() === 'approved') return cert.pointsAwarded ?? 0;
    return cert.potentialPoints ?? 0;
  };

  // Capped total across all approved certificates
  const totalPoints = useMemo(() => {
    const approved = certificates.filter(c => c.status?.toLowerCase() === 'approved');

    const grouped = approved.reduce((acc, cert) => {
      const catId = cert.category?._id || cert.category;
      if (!acc[catId]) acc[catId] = [];
      acc[catId].push(cert);
      return acc;
    }, {});

    let total = 0;
    Object.keys(grouped).forEach(catId => {
      const catData = getCategoryById(catId);
      const certsInCat = grouped[catId];
      const catName = catData?.name?.toLowerCase() || '';

      let catSum = 0;
      if (catName.includes('arts') || catName.includes('sports')) {
        catSum = Math.max(...certsInCat.map(c => c.pointsAwarded || 0), 0);
      } else {
        catSum = certsInCat.reduce((s, c) => s + (c.pointsAwarded || 0), 0);
      }

      const cap = catData?.maxPoints || 40;
      total += Math.min(catSum, cap);
    });

    return total;
  }, [certificates, categories]);

  const filteredCertificates = activeFilter === 'all'
    ? certificates
    : certificates.filter(c => c.status?.toLowerCase() === activeFilter);

  return (
    <div className="viewcertificates-container">
      <div className="header">
        <button onClick={() => navigate('/student')} className="back-button" aria-label="Back to dashboard">
          <ArrowLeft size={20} />
        </button>
        <h1 className="title">My Certificates</h1>
      </div>

      <div className="summary-card">
        <div className="points-summary full-width">
          <p className="points">{totalPoints}</p>
          <p>Total Points (Capped)</p>
        </div>
        <div className="certificates-count">
          <p>{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} submitted</p>
        </div>
      </div>

      <div className="filters">
        {['all', 'approved', 'pending', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="filter-count">
                ({certificates.filter(c => c.status?.toLowerCase() === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading certificates...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="certificates-list">
        {!loading && filteredCertificates.length === 0 && (
          <div className="no-certificates">
            <FileText size={48} className="no-cert-icon" />
            <h3>No certificates found</h3>
            <p>
              {activeFilter === 'all'
                ? "You haven't submitted any certificates yet."
                : `No ${activeFilter} certificates.`}
            </p>
            {activeFilter === 'all' && (
              <button className="upload-first-btn" onClick={() => navigate('/student/upload-certificate')}>
                Upload Your First Certificate
              </button>
            )}
          </div>
        )}

        {!loading && filteredCertificates.map(cert => (
          <div key={cert._id} className="certificate-card">
            <div className="cert-header">
              <h3>{cert.subcategory || 'Certificate'}</h3>
              {getStatusIcon(cert.status)}
            </div>

            <div className="cert-category-subcat">
              <span className="category-badge">
                {cert.category?.name || getCategoryById(cert.category)?.name || '—'}
              </span>
            </div>

            {(cert.level || cert.prizeType) && (
              <div className="prize-level">
                <Award size={16} className="award-icon" />
                <span>
                  {cert.level ?? ''}{cert.level && cert.prizeType ? ' — ' : ''}{cert.prizeType ?? ''}
                </span>
              </div>
            )}

            <span className={`status-badge ${getStatusColorClass(cert.status)}`}>
              {cert.status ?? 'Unknown'}
            </span>

            <div className="cert-footer">
              <div className="dates-points">
                <div>
                  <Calendar size={16} />
                  <span>Submitted: {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  <Award size={16} className="award-green" />
                  <span className="points-text">+{displayPoints(cert)} pts</span>
                </div>
              </div>

              {cert.fileUrl && (
                <div className="actions">
                  <button onClick={() => window.open(cert.fileUrl, '_blank')} className="btn-view">
                    <Eye size={16} /> View
                  </button>
                  <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-download">
                    <Download size={16} /> Download
                  </a>
                </div>
              )}
            </div>

            {cert.status?.toLowerCase() === 'rejected' && (
              <div className="rejected-reason">
                <div className="rejected-reason-header">
                  ❌ Certificate Rejected
                </div>
                <div className="rejected-reason-body">
                  <strong>Tutor's reason:</strong>{' '}
                  {cert.rejectionReason
                    ? cert.rejectionReason
                    : 'No reason provided. Please contact your tutor.'}
                </div>
                <div className="rejected-reason-action">
                  You can re-upload a corrected certificate if needed.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
