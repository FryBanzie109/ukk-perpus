import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../hooks/useUser';

export default function Catalog() {
    const { isDark } = useTheme();
    const user = useUser();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKategori, setFilterKategori] = useState('semua');
    const [filterTahun, setFilterTahun] = useState('semua');
    const [filterStok, setFilterStok] = useState('semua');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showBookProfile, setShowBookProfile] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [tahunTersedia, setTahunTersedia] = useState([]);
    const navigate = useNavigate();

    // Fetch semua buku
    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const res = await axios.get('http://localhost:5000/books');
            setBooks(res.data);
            
            // Get unique years
            const years = [...new Set(res.data.map(b => b.tahun_terbit))].sort((a, b) => b - a);
            setTahunTersedia(years);
            
            setLoading(false);
        } catch (err) {
            console.error('Error fetching books:', err);
            setLoading(false);
        }
    };

    // Search & filter books
    const filteredBooks = books.filter(book => {
        const matchesSearch = book.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              book.penulis.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              book.penerbit.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesKategori = filterKategori === 'semua' || book.kategori === filterKategori;
        const matchesTahun = filterTahun === 'semua' || book.tahun_terbit == filterTahun;
        
        let matchesStok = true;
        if (filterStok === 'tersedia') {
            matchesStok = book.stok > 0;
        } else if (filterStok === 'tidak_tersedia') {
            matchesStok = book.stok <= 0;
        }
        
        return matchesSearch && matchesKategori && matchesTahun && matchesStok;
    });

    const handleBorrowClick = (book) => {
        setSelectedBook(book);
        if (!user) {
            // Show login prompt modal
            setShowLoginPrompt(true);
        } else {
            setShowBookProfile(true);
        }
    };

    const handleBorrowBook = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const res = await axios.post('http://localhost:5000/borrow/v2', {
                user_id: user.id,
                book_id: selectedBook.id,
                durasi_pinjam: 7 // Default 7 hari
            });
            
            alert('Buku berhasil dipinjam!');
            setShowBookProfile(false);
            setSelectedBook(null);
            fetchBooks();
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal meminjam buku');
        }
    };

    const daftarKategori = [...new Set(books.map(b => b.kategori))].sort();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: 'calc(100vh - 60px)', padding: '20px' }}>
            <div className="container">
                {/* Header */}
                <div className="row mb-4">
                    <div className="col-md-8">
                        <h1 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>📚 Katalog Buku</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Jelajahi koleksi buku perpustakaan kami</p>
                    </div>
                    <div className="col-md-4 text-end">
                        {user ? (
                            <div>
                                <small style={{ color: 'var(--text-secondary)' }}>Selamat datang, </small>
                                <strong style={{ color: 'var(--text-primary)' }}>{user.nama_lengkap}</strong>
                            </div>
                        ) : (
                            <div>
                                <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => navigate('/login')}
                                >
                                    🔐 Login / 📝 Daftar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Banner for non-logged-in users */}
                {!user && (
                    <div className="alert alert-info mb-4" style={{ backgroundColor: '#e7f3ff', borderColor: '#b3d9ff', color: '#004085' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                            <div>
                                <strong>Anda sedang melihat sebagai tamu</strong>
                                <p style={{ marginBottom: 0, fontSize: '0.9rem' }}>
                                    Untuk meminjam buku, silakan <strong>login</strong> jika sudah punya akun atau <strong>daftar</strong> untuk membuat akun baru. 
                                    Anda dapat terus menjelajahi katalog buku kami tanpa perlu login.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search & Filter */}
                <div className="card mb-4 p-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="Cari judul, penulis, atau penerbit..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <select 
                                className="form-select"
                                value={filterKategori}
                                onChange={e => setFilterKategori(e.target.value)}
                            >
                                <option value="semua">Semua Kategori</option>
                                {daftarKategori.map(kat => (
                                    <option key={kat} value={kat}>{kat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <select 
                                className="form-select"
                                value={filterTahun}
                                onChange={e => setFilterTahun(e.target.value)}
                            >
                                <option value="semua">Semua Tahun</option>
                                {tahunTersedia.map(tahun => (
                                    <option key={tahun} value={tahun}>{tahun}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <select 
                                className="form-select"
                                value={filterStok}
                                onChange={e => setFilterStok(e.target.value)}
                            >
                                <option value="semua">Semua Stok</option>
                                <option value="tersedia">Tersedia</option>
                                <option value="tidak_tersedia">Tidak Tersedia</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button 
                                className="btn btn-secondary w-100"
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterKategori('semua');
                                    setFilterTahun('semua');
                                    setFilterStok('semua');
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Books Grid */}
                <div className="row g-4">
                    {filteredBooks.length > 0 ? (
                        filteredBooks.map(book => (
                            <div key={book.id} className="col-md-6 col-lg-3">
                                <div 
                                    className="card h-100" 
                                    style={{ 
                                        backgroundColor: 'var(--card-bg)', 
                                        borderColor: 'var(--border-color)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {book.cover_url ? (
                                        <img 
                                            src={book.cover_url} 
                                            className="card-img-top" 
                                            alt={book.judul}
                                            style={{ height: '250px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div 
                                            className="card-img-top d-flex align-items-center justify-content-center"
                                            style={{ height: '250px', backgroundColor: '#ccc' }}
                                        >
                                            <span style={{ color: '#999' }}>No Cover</span>
                                        </div>
                                    )}
                                    <div className="card-body d-flex flex-column">
                                        <h5 className="card-title" style={{ fontSize: '1rem', marginBottom: '5px' }}>
                                            {book.judul.substring(0, 30)}
                                        </h5>
                                        <small style={{ color: 'var(--text-secondary)' }}>
                                            {book.penulis}
                                        </small>
                                        <small style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                            {book.penerbit} ({book.tahun_terbit})
                                        </small>
                                        <div style={{ marginTop: 'auto' }}>
                                            <div className="mb-2">
                                                <span 
                                                    className="badge"
                                                    style={{ 
                                                        backgroundColor: book.stok > 0 ? '#28a745' : '#dc3545',
                                                        color: 'white'
                                                    }}
                                                >
                                                    {book.stok > 0 ? `Stok: ${book.stok}` : 'Tidak Tersedia'}
                                                </span>
                                            </div>
                                            <button 
                                                className={`btn btn-sm w-100 ${book.stok > 0 ? 'btn-primary' : 'btn-secondary disabled'}`}
                                                onClick={() => {
                                                    setSelectedBook(book);
                                                    if (!user) {
                                                        navigate('/login');
                                                    } else {
                                                        setShowBookProfile(true);
                                                    }
                                                }}
                                                disabled={book.stok <= 0}
                                            >
                                                {book.stok > 0 ? 'Pinjam' : 'Tidak Bisa Dipinjam'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-12 text-center">
                            <p style={{ color: 'var(--text-secondary)' }}>Tidak ada buku yang sesuai dengan filter Anda</p>
                        </div>
                    )}
                </div>

                {/* Book Detail Modal */}
                {showBookProfile && selectedBook && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content" style={{ backgroundColor: 'var(--card-bg)' }}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{selectedBook.judul}</h5>
                                    <button 
                                        type="button" 
                                        className="btn-close"
                                        onClick={() => setShowBookProfile(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <p><strong>Penulis:</strong> {selectedBook.penulis}</p>
                                    <p><strong>Penerbit:</strong> {selectedBook.penerbit}</p>
                                    <p><strong>Tahun Terbit:</strong> {selectedBook.tahun_terbit}</p>
                                    <p><strong>Kategori:</strong> {selectedBook.kategori}</p>
                                    <p><strong>Stok:</strong> {selectedBook.stok}</p>
                                    {selectedBook.isbn && <p><strong>ISBN:</strong> {selectedBook.isbn}</p>}
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setShowBookProfile(false)}
                                    >
                                        Batal
                                    </button>
                                    {selectedBook.stok > 0 && (
                                        <button 
                                            type="button" 
                                            className="btn btn-primary"
                                            onClick={handleBorrowBook}
                                        >
                                            Pinjam Buku
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Prompt Modal for Non-Logged-In Users */}
                {showLoginPrompt && selectedBook && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content" style={{ backgroundColor: 'var(--card-bg)' }}>
                                <div className="modal-header" style={{ borderColor: 'var(--border-color)', borderBottom: '2px solid var(--border-color)' }}>
                                    <h5 className="modal-title" style={{ color: 'var(--text-primary)' }}>
                                        🔐 Diperlukan Login
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close"
                                        onClick={() => setShowLoginPrompt(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div style={{ marginBottom: '20px' }}>
                                        <p style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
                                            <strong>Anda ingin meminjam buku:</strong>
                                        </p>
                                        <div style={{ 
                                            backgroundColor: 'var(--bg-primary)', 
                                            padding: '15px', 
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #0d6efd'
                                        }}>
                                            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {selectedBook.judul}
                                            </p>
                                            <small style={{ color: 'var(--text-secondary)' }}>
                                                oleh {selectedBook.penulis}
                                            </small>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        backgroundColor: '#fff3cd',
                                        border: '1px solid #ffc107',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginBottom: '20px'
                                    }}>
                                        <p style={{ margin: 0, color: '#856404', marginBottom: '10px' }}>
                                            <strong>⚠️ Anda belum memiliki akun</strong>
                                        </p>
                                        <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
                                            Untuk meminjam buku, Anda perlu login atau membuat akun terlebih dahulu. Jangan khawatir, proses pendaftaran hanya memerlukan beberapa klik!
                                        </p>
                                    </div>

                                    <div style={{ 
                                        backgroundColor: 'var(--bg-primary)',
                                        borderRadius: '8px',
                                        padding: '15px'
                                    }}>
                                        <p style={{ margin: 0, marginBottom: '10px', color: 'var(--text-secondary)' }}>
                                            <strong>Pilih opsi Anda:</strong>
                                        </p>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                            <li>✓ Sudah punya akun? <strong>Login</strong></li>
                                            <li>✓ Belum punya akun? <strong>Daftar sekarang</strong></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ borderColor: 'var(--border-color)' }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setShowLoginPrompt(false)}
                                    >
                                        Lanjut Jelajahi
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setShowLoginPrompt(false);
                                            navigate('/login');
                                        }}
                                    >
                                        Login / Daftar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}