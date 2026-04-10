import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import './App.css';

function AppContent() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="app-wrapper">
      <nav className="navbar navbar-expand-lg sticky-top">
        <div className="container-fluid">
          <span className="navbar-brand">📚 Perpustakaan UKK</span>
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <BrowserRouter>
        <Routes>
          {/* Redirect root ke login */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
