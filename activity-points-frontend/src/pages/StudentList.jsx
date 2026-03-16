import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tutorAxios from '../api/tutorAxios';
import { Download, Search, Trash2, Eye, Filter, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../css/StudentList.css';

const StudentList = () => {
  const navigate = useNavigate();

  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [batchFilter, setBatchFilter]   = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [regSearch, setRegSearch]   = useState('');
  const [batchOptions, setBatchOptions]   = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [deleting, setDeleting]     = useState(null);
  const [msg, setMsg]               = useState('');

  // Read assigned batch/branch from localStorage (set on tutor login)
  const tutorBatch  = JSON.parse(localStorage.getItem('tutorBatch')  || 'null');
  const tutorBranch = JSON.parse(localStorage.getItem('tutorBranch') || 'null');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res  = await tutorAxios.get('/tutors/students');
      const list = res.data.students || [];
      setStudents(list);
      setBatchOptions([...new Set(list.map(s => s.batch?.name).filter(Boolean))]);
      setBranchOptions([...new Set(list.map(s => s.branch?.name).filter(Boolean))]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete student "${name}"? This will also remove all their certificates.`)) return;
    setDeleting(id);
    try {
      await tutorAxios.delete(`/tutors/students/${id}`);
      setStudents(prev => prev.filter(s => s._id !== id));
      setMsg(`Student "${name}" deleted.`);
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = students.filter(s => {
    const nameOk  = search    ? s.name?.toLowerCase().includes(search.toLowerCase())           : true;
    const regOk   = regSearch ? s.registerNumber?.toLowerCase().includes(regSearch.toLowerCase()) : true;
    const batchOk = batchFilter  ? s.batch?.name  === batchFilter  : true;
    const branchOk = branchFilter ? s.branch?.name === branchFilter : true;
    return nameOk && regOk && batchOk && branchOk;
  });

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(s => ({
      Name: s.name, RegisterNumber: s.registerNumber,
      Batch: s.batch?.name, Branch: s.branch?.name,
      Email: s.email, TotalPoints: s.totalPoints || 0,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_list.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Student List', 14, 16);
    if (tutorBatch || tutorBranch) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Batch: ${tutorBatch?.name || '—'}   Branch: ${tutorBranch?.name || '—'}`, 14, 23);
    }
    autoTable(doc, {
      startY: tutorBatch || tutorBranch ? 28 : 22,
      head: [['Name', 'Reg No', 'Batch', 'Branch', 'Email', 'Pts']],
      body: filtered.map(s => [
        s.name, s.registerNumber,
        s.batch?.name || '', s.branch?.name || '',
        s.email, s.totalPoints || 0,
      ]),
      styles: { fontSize: 9 },
    });
    doc.save('students_list.pdf');
  };

  return (
    <div className="student-list-card">
      {/* Header */}
      <div className="sl-header">
        <div className="sl-title-row">
          <Users size={22} />
          <h2>Student List</h2>
          <span className="sl-count">{filtered.length} students</span>
        </div>
        {(tutorBatch || tutorBranch) && (
          <div className="sl-scope-badge">
            {tutorBatch  && <span>Batch: <strong>{tutorBatch.name}</strong></span>}
            {tutorBranch && <span>Branch: <strong>{tutorBranch.name}</strong></span>}
          </div>
        )}
      </div>

      {msg && <div className="sl-msg">{msg}</div>}

      {/* Filters */}
      <div className="sl-filters">
        <div className="sl-search-group">
          <Search size={15} className="sl-search-icon" />
          <input
            type="text" placeholder="Search by name…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="sl-input"
          />
        </div>
        <div className="sl-search-group">
          <Search size={15} className="sl-search-icon" />
          <input
            type="text" placeholder="Search by reg. no…"
            value={regSearch} onChange={e => setRegSearch(e.target.value)}
            className="sl-input"
          />
        </div>
        <select className="sl-select" value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
          <option value="">All Batches</option>
          {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="sl-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="sl-actions">
          <button className="sl-btn outline" onClick={exportExcel} title="Export Excel">
            <Download size={15}/> Excel
          </button>
          <button className="sl-btn outline" onClick={exportPDF} title="Export PDF">
            <Download size={15}/> PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="sl-loading">Loading students…</div>
      ) : filtered.length === 0 ? (
        <div className="sl-empty">No students found.</div>
      ) : (
        <div className="sl-table-wrap">
          <table className="sl-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Reg No</th>
                <th>Batch</th>
                <th>Branch</th>
                <th>Email</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id}>
                  <td className="sl-name">{s.name}</td>
                  <td className="sl-mono">{s.registerNumber}</td>
                  <td>{s.batch?.name || '—'}</td>
                  <td>{s.branch?.name || '—'}</td>
                  <td className="sl-email">{s.email}</td>
                  <td>
                    <span className={`sl-pts ${(s.totalPoints||0) >= 60 ? 'pass' : (s.totalPoints||0) >= 40 ? 'mid' : ''}`}>
                      {s.totalPoints || 0}
                    </span>
                  </td>
                  <td className="sl-action-cell">
                    <button
                      className="sl-btn primary sm"
                      onClick={() => navigate(`/tutor/dashboard/students/${s._id}`)}
                      title="View details"
                    >
                      <Eye size={13}/> View
                    </button>
                    <button
                      className="sl-btn danger sm"
                      onClick={() => handleDelete(s._id, s.name)}
                      disabled={deleting === s._id}
                      title="Delete student"
                    >
                      <Trash2 size={13}/> {deleting === s._id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentList;
