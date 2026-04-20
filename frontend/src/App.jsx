import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import Catalog from './pages/Catalog';
import './App.css';
import { useState } from 'react';
import { useUser, triggerUserUpdate } from './hooks/useUser';

function Navbar({ user, onLogout }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    triggerUserUpdate(null);
    setShowDropdown(false);
    onLogout();
    setShowDropdown(false);
    navigate('/catalog');
  };

  const handleLoginNavigate = () => {
    setShowDropdown(false);
    navigate('/login');
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  return (
    <nav className="navbar navbar-expand-lg sticky-top">
      <div className="container-fluid">
        <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/catalog')}>
          📚 Perpustakaan UKK
        </span>
        <div className="d-flex align-items-center gap-3">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          
          {/* Profile Dropdown */}
          <div className="dropdown" style={{ position: 'relative' }}>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={toggleDropdown}
            >
              👤 {user ? user.nama_lengkap : 'Profil'}
            </button>
            {showDropdown && (
              <div 
                className="dropdown-menu show"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  minWidth: '200px',
                  zIndex: 1000,
                  marginTop: '5px'
                }}
              >
                {user ? (
                  <>
                    <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {user.nama_lengkap}
                      </div>
                      <small style={{ color: 'var(--text-secondary)' }}>
                        {user.role === 'admin' ? '👨‍💼 Admin' : '👨‍🎓 Siswa'}
                      </small>
                    </div>
                    {user.role === 'admin' && (
                      <>
                        <a 
                          href="#" 
                          className="dropdown-item"
                          onClick={(e) => { e.preventDefault(); navigate('/dashboard'); setShowDropdown(false); }}
                        >
                          📊 Dashboard
                        </a>
                        <a 
                          href="#" 
                          className="dropdown-item"
                          onClick={(e) => { e.preventDefault(); navigate('/profile'); setShowDropdown(false); }}
                        >
                          👤 Profil
                        </a>
                      </>
                    )}
                    {user.role !== 'admin' && (
                      <a 
                        href="#" 
                        className="dropdown-item"
                        onClick={(e) => { e.preventDefault(); navigate('/profile'); setShowDropdown(false); }}
                      >
                        👤 Profil Saya
                      </a>
                    )}
                    <div style={{ borderTop: '1px solid var(--border-color)' }}>
                      <a 
                        href="#" 
                        className="dropdown-item"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                        style={{ color: '#dc3545' }}
                      >
                        🚪 Logout
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <a 
                      href="#" 
                      className="dropdown-item"
                      onClick={(e) => { e.preventDefault(); handleLoginNavigate(); }}
                    >
                      🔐 Login
                    </a>
                    <a 
                      href="#" 
                      className="dropdown-item"
                      onClick={(e) => { e.preventDefault(); handleLoginNavigate(); }}
                    >
                      📝 Daftar Akun
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, user }) {
  const location = useLocation();
  
  // Check if route requires admin
  const isAdminRoute = location.pathname === '/dashboard' || location.pathname === '/profile';
  
  if (isAdminRoute && !user) {
    return <Navigate to="/login" />;
  }
  
  if (location.pathname === '/dashboard' && user?.role !== 'admin') {
    return <Navigate to="/catalog" />;
  }
  
  return children;
}

function AppContent() {
  const user = useUser();

  return (
    <div className="app-wrapper">
      <Navbar user={user} onLogout={() => {}} />

      <Routes>
        {/* Redirect root ke catalog */}
        <Route path="/" element={<Navigate to="/catalog" />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute user={user}>
              <Profile />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
