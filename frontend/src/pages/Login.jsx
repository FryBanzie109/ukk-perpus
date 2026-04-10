import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [nama, setNama] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // --- MODE REGISTER ---
        if (isRegister) {
            try {
                await axios.post('http://localhost:5000/register', { 
                    nama_lengkap: nama, 
                    username, 
                    password 
                });
                alert('Registrasi Berhasil! Silakan Login.');
                setIsRegister(false);
                setNama(''); 
                setUsername(''); 
                setPassword('');
            } catch (err) {
                alert(err.response?.data?.message || 'Gagal Daftar');
            }
        } 
        // --- MODE LOGIN ---
        else {
            try {
                const res = await axios.post('http://localhost:5000/login', { username, password });
                console.log('Login response:', res.data);
                if (res.data.success) {
                    console.log('User object to save:', res.data.user);
                    console.log('User role:', res.data.user.role);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    alert('Login Berhasil!');
                    navigate('/dashboard');
                }
            } catch {
                alert('Username atau Password Salah!');
            }
        }
        setLoading(false);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="card p-5 shadow-lg" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-4">
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</h2>
                    <h3 className="mb-2">
                        {isRegister ? 'Daftar Akun Baru' : 'Masuk ke Perpustakaan'}
                    </h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        {isRegister ? 'Buat akun baru untuk melanjutkan' : 'Masukkan kredensial Anda'}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {/* Input Nama hanya muncul saat Mode Register */}
                    {isRegister && (
                        <div className="mb-3">
                            <label className="form-label">Nama Lengkap</label>
                            <input 
                                className="form-control" 
                                placeholder="Masukkan nama lengkap"
                                value={nama}
                                onChange={e => setNama(e.target.value)} 
                                required 
                            />
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input 
                            className="form-control" 
                            placeholder="Masukkan username"
                            value={username}
                            onChange={e => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            placeholder="Masukkan password"
                            value={password}
                            onChange={e => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`btn w-100 ${isRegister ? 'btn-success' : 'btn-primary'}`}
                        style={{ padding: '0.75rem', fontSize: '1rem', fontWeight: '600' }}
                    >
                        {loading ? 'Memproses...' : (isRegister ? 'Daftar Sekarang' : 'Masuk')}
                    </button>
                </form>

                <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <small style={{ color: 'var(--text-secondary)' }}>
                        {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                        <span 
                            style={{ cursor: 'pointer', fontWeight: 'bold', color: '#60a5fa' }}
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setNama('');
                                setUsername('');
                                setPassword('');
                            }}
                        >
                            {isRegister ? 'Login disini' : 'Daftar disini'}
                        </span>
                    </small>
                </div>
            </div>
        </div>
    );
}