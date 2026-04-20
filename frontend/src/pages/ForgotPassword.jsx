import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
    const [step, setStep] = useState('request'); // 'request' or 'reset'
    const [username, setUsername] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await axios.post('http://localhost:5000/forgot-password', { username });
            setMessage(res.data.message);
            
            // If reset token is provided in response (dev mode), move to reset step
            if (res.data.resetToken) {
                setResetToken(res.data.resetToken);
                setStep('reset');
                setMessage('Token reset telah digenerate. Silakan isi password baru Anda.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memproses permintaan reset password');
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Password tidak cocok');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post('http://localhost:5000/reset-password', {
                resetToken,
                newPassword,
                confirmPassword
            });
            setMessage(res.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal reset password');
        }
        setLoading(false);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="card p-5 shadow-lg" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-4">
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</h2>
                    <h3 className="mb-2">
                        {step === 'request' ? 'Lupa Password' : 'Reset Password'}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        {step === 'request' 
                            ? 'Masukkan username Anda untuk reset password' 
                            : 'Buat password baru Anda'}
                    </p>
                </div>

                {message && (
                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                        {message}
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={() => setMessage('')}
                        ></button>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        {error}
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={() => setError('')}
                        ></button>
                    </div>
                )}

                {step === 'request' ? (
                    <form onSubmit={handleRequestReset}>
                        <div className="mb-4">
                            <label className="form-label">Username</label>
                            <input 
                                className="form-control" 
                                placeholder="Masukkan username Anda"
                                value={username}
                                onChange={e => setUsername(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-100"
                            style={{ padding: '0.75rem', fontSize: '1rem', fontWeight: '600' }}
                        >
                            {loading ? 'Memproses...' : 'Minta Reset Password'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-3">
                            <label className="form-label">Password Baru</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Masukkan password baru"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Konfirmasi Password</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Konfirmasi password baru"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-100"
                            style={{ padding: '0.75rem', fontSize: '1rem', fontWeight: '600' }}
                        >
                            {loading ? 'Memproses...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <small style={{ color: 'var(--text-secondary)' }}>
                        Ingat password Anda? 
                        <span 
                            style={{ cursor: 'pointer', fontWeight: 'bold', color: '#60a5fa', marginLeft: '5px' }}
                            onClick={() => navigate('/login')}
                        >
                            Login disini
                        </span>
                    </small>
                </div>
            </div>
        </div>
    );
}