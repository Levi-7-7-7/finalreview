import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import '../css/StudentDashboard.css';

const StudentLayout = () => {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('userData'));
  const userName = user?.name || 'Student';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      localStorage.removeItem('userName');
      navigate('/');
    }
  };

  const avatarInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="dashboard-header">
                    <div className="header-top">
                    <div className="avatar-group">
                        <div className="avatar">
                        <span className="avatar-fallback">{avatarInitials}</span>
                        </div>
                        <div className="greeting">
                        <h1>Hello, {userName}</h1>
                        <p>Welcome back!</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button
                        onClick={handleLogout}
                        className="logout-btn-header"
                        >
                        Logout
                        </button>
                    </div>
                    </div>

      </header>

      {/* Nested student pages */}
      <main className="dashboard-main">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
};

export default StudentLayout;
