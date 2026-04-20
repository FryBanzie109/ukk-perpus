import { useState, useEffect } from 'react';

/**
 * Custom hook untuk sync user state dari localStorage
 * Automatically detects changes saat user login/logout
 */
export function useUser() {
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  useEffect(() => {
    // Listen untuk storage changes (dari tab lain)
    const handleStorageChange = () => {
      const userStr = localStorage.getItem('user');
      setUser(userStr ? JSON.parse(userStr) : null);
    };

    // Listen untuk custom event (dari tab yang sama)
    const handleUserUpdate = (e) => {
      setUser(e.detail?.user || null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  return user;
}

/**
 * Helper untuk trigger user update event
 * Panggil ini setelah localStorage.setItem('user', ...)
 */
export function triggerUserUpdate(userData) {
  window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: userData } }));
}
