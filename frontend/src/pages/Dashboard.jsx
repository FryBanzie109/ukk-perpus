import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
    const { isDark } = useTheme();
    const [books, setBooks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [students, setStudents] = useState([]);
    const [myBorrowedBooks, setMyBorrowedBooks] = useState([]);
    const [activeTab, setActiveTab] = useState('katalog');
    const [user, setUser] = useState(null);
    const [_loading, setLoading] = useState(true);
    
    // Search & Detail Book States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showBookProfile, setShowBookProfile] = useState(false);
    
    // Search & Filter Siswa States
    const [searchSiswa, setSearchSiswa] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJurusan, setFilterJurusan] = useState('');
    const [daftarKelas, setDaftarKelas] = useState([]);
    const [daftarJurusan, setDaftarJurusan] = useState([]);
    const [siswaFiltered, setSiswaFiltered] = useState([]);
    
    // Student Profile Modal States
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentProfile, setShowStudentProfile] = useState(false);
    const [studentBorrowedBooks, setStudentBorrowedBooks] = useState([]);
    
    // Form States
    const [newBook, setNewBook] = useState({ judul: '', penulis: '', penerbit: '', tahun_terbit: '', stok: '' });

    const navigate = useNavigate();

    // Load user dari localStorage saat component mount
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        console.log('Raw localStorage user string:', userStr);
        if (userStr) {
            const userData = JSON.parse(userStr);
            console.log('Parsed user object:', userData);
            setUser(userData);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const fetchData = useCallback(async () => {
        try {
            const resBooks = await axios.get('http://localhost:5000/books');
            setBooks(resBooks.data);

            if (user?.role === 'admin') {
                const resTrans = await axios.get('http://localhost:5000/transactions');
                setTransactions(resTrans.data);

                const resStudents = await axios.get('http://localhost:5000/students');
                setStudents(resStudents.data);
            }

            if (user?.role === 'siswa') {
                const resBorrowed = await axios.get(`http://localhost:5000/my-borrowed-books/${user.id}`);
                setMyBorrowedBooks(resBorrowed.data);
            }
        } catch (err) { console.error(err); }
    }, [user]);

    useEffect(() => {
        console.log('=== useEffect to fetch data triggered ===');
        console.log('Current user state:', user);
        
        if (!user) {
            console.log('User is null/undefined, skipping fetch');
            return;
        }

        console.log('User role:', user.role);
        console.log('User ID:', user.id);

        let mounted = true;
        setLoading(true);

        (async () => {
            try {
                console.log('=== FETCHING BOOKS ===');
                const resBooks = await axios.get('http://localhost:5000/books');
                if (!mounted) return;
                setBooks(resBooks.data);
                console.log('✅ Books fetched:', resBooks.data.length);

                if (user.role === 'admin') {
                    console.log('=== ADMIN MODE DETECTED - FETCHING ADMIN DATA ===');
                    
                    // TRANSACTIONS
                    try {
                        console.log('Fetching transactions from: http://localhost:5000/transactions');
                        const resTrans = await axios.get('http://localhost:5000/transactions');
                        if (!mounted) return;
                        console.log('✅ Transactions:', resTrans.data);
                        setTransactions(resTrans.data);
                    } catch (err) {
                        console.error('❌ Error fetching transactions:', err.message);
                    }

                    // STUDENTS
                    try {
                        console.log('Fetching students from: http://localhost:5000/students');
                        const studentsUrl = 'http://localhost:5000/students';
                        console.log('Request URL:', studentsUrl);
                        
                        const resStudents = await fetch(studentsUrl);
                        console.log('Fetch response status:', resStudents.status);
                        
                        if (!resStudents.ok) {
                            throw new Error(`HTTP error! status: ${resStudents.status}`);
                        }
                        
                        const studentsData = await resStudents.json();
                        if (!mounted) return;
                        console.log('✅ Students fetched from API:', studentsData);
                        console.log('Students count:', studentsData.length);
                        setStudents(studentsData);
                    } catch (err) {
                        console.error('❌ Error fetching students:', err);
                        setStudents([]);
                    }
                } else {
                    console.log('⚠️ Not admin, role is:', user.role);
                }

                if (user.role === 'siswa') {
                    console.log('Siswa detected, fetching borrowed books...');
                    try {
                        const resBorrowed = await axios.get(`http://localhost:5000/my-borrowed-books/${user.id}`);
                        if (!mounted) return;
                        console.log('✅ Borrowed books:', resBorrowed.data);
                        setMyBorrowedBooks(resBorrowed.data);
                    } catch (err) {
                        console.error('❌ Error fetching borrowed books:', err);
                    }
                }
            } catch (err) {
                console.error('❌ Critical error:', err);
            } finally {
                setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [user]);

    // Update siswaFiltered whenever students data changes
    useEffect(() => {
        setSiswaFiltered(students);
    }, [students]);

    // --- LOGIC BUKU ---
    const pinjamBuku = async (bookId) => {
        try {
            await axios.post('http://localhost:5000/borrow', { user_id: user.id, book_id: bookId });
            alert('Sukses Pinjam!'); 
            fetchData();
        } catch (err) { alert(err.response?.data?.message); }
    };

    const tambahBuku = async (e) => {
        e.preventDefault();
        try {
            // Validasi input
            if (!newBook.judul.trim() || !newBook.penulis.trim() || !newBook.stok) {
                alert('Judul, Penulis, dan Stok harus diisi!');
                return;
            }

            const bookData = {
                judul: newBook.judul.trim(),
                penulis: newBook.penulis.trim(),
                penerbit: newBook.penerbit.trim() || null,
                tahun_terbit: newBook.tahun_terbit || null,
                stok: parseInt(newBook.stok)
            };

            await axios.post('http://localhost:5000/books', bookData);
            alert('Buku berhasil ditambahkan!'); 
            setNewBook({ judul: '', penulis: '', penerbit: '', tahun_terbit: '', stok: '' }); 
            fetchData();
        } catch (err) { 
            console.error('Error adding book:', err);
            alert('Gagal menambah buku: ' + (err.response?.data?.message || err.message)); 
        }
    };

    const searchBuku = async (query) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            fetchData();
        } else {
            try {
                const encodedQuery = encodeURIComponent(query);
                const res = await axios.get(`http://localhost:5000/search-books?q=${encodedQuery}`);
                setBooks(res.data);
            } catch (err) {
                console.error('Search error:', err);
                alert('Gagal melakukan pencarian. Silakan coba lagi.');
            }
        }
    };

    const viewBookProfile = async (bookId) => {
        try {
            const res = await axios.get(`http://localhost:5000/books/${bookId}`);
            setSelectedBook(res.data);
            setShowBookProfile(true);
        } catch {
            alert('Gagal memuat detail buku');
        }
    };

    const hapusBuku = async (id) => {
        if(confirm('Hapus buku?')) { 
            await axios.delete(`http://localhost:5000/books/${id}`); 
            fetchData(); 
        }
    };

    // --- LOGIC TRANSAKSI ---
    const kembalikanBuku = async (transId, bookId) => {
        if(confirm('Kembalikan buku ini?')) { 
            try {
                const res = await axios.post('http://localhost:5000/return', { transaction_id: transId, book_id: bookId });
                const denda = res.data.denda;
                const keterangan = res.data.keterangan;
                
                if (denda > 0) {
                    alert(`Buku telah dikembalikan.\n\n⚠️ DENDA KETERLAMBATAN:\n${keterangan}\n\nTotal Denda: Rp ${denda.toLocaleString('id-ID')}`);
                } else {
                    alert(`Buku telah dikembalikan.\n✅ ${keterangan}`);
                }
                fetchData();
            } catch (err) {
                alert('Gagal mengembalikan buku: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    // --- LOGIC SISWA ---
    // Load daftar kelas & jurusan saat tab siswa diklik
    const loadFilterSiswa = async () => {
        try {
            const [resKelas, resJurusan] = await Promise.all([
                axios.get('http://localhost:5000/students/get-kelas'),
                axios.get('http://localhost:5000/students/get-jurusan')
            ]);
            setDaftarKelas(resKelas.data || []);
            setDaftarJurusan(resJurusan.data || []);
        } catch (err) {
            console.error('Error loading filter options:', err);
        }
    };

    // Search & Filter Siswa
    const searchFilterSiswa = async (search = '', kelas = '', jurusan = '') => {
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.append('q', search.trim());
            if (kelas.trim()) params.append('kelas', kelas.trim());
            if (jurusan.trim()) params.append('jurusan', jurusan.trim());

            const url = params.toString() 
                ? `http://localhost:5000/search-students?${params.toString()}`
                : 'http://localhost:5000/students';

            const res = await axios.get(url);
            setSiswaFiltered(res.data);
        } catch (err) {
            console.error('Search students error:', err);
            alert('Gagal melakukan pencarian siswa');
        }
    };

    // Handle search siswa input change
    const handleSearchSiswaChange = (value) => {
        setSearchSiswa(value);
        searchFilterSiswa(value, filterKelas, filterJurusan);
    };

    // Handle filter kelas change
    const handleFilterKelasChange = (value) => {
        setFilterKelas(value);
        searchFilterSiswa(searchSiswa, value, filterJurusan);
    };

    // Handle filter jurusan change
    const handleFilterJurusanChange = (value) => {
        setFilterJurusan(value);
        searchFilterSiswa(searchSiswa, filterKelas, value);
    };

    // Reset filter siswa
    const resetFilterSiswa = () => {
        setSearchSiswa('');
        setFilterKelas('');
        setFilterJurusan('');
        setSiswaFiltered(students);
    };

    const hapusSiswa = async (id) => {
        if(confirm('Hapus akun siswa ini?')) { 
            await axios.delete(`http://localhost:5000/students/${id}`); 
            fetchData(); 
        }
    };

    // View Student Profile with Borrowed Books
    const viewStudentProfile = async (student) => {
        setSelectedStudent(student);
        try {
            const res = await axios.get(`http://localhost:5000/student-borrowed-books/${student.id}`);
            setStudentBorrowedBooks(res.data);
        } catch (err) {
            console.error('Error fetching student borrowed books:', err);
            setStudentBorrowedBooks([]);
        }
        setShowStudentProfile(true);
    };

    const logout = () => { 
        localStorage.clear(); 
        navigate('/login'); 
    };

    if (!user) return null;

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="card mb-4 border-0">
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h2 className="mb-1">📚 Perpustakaan Digital</h2>
                        <p className="text-muted mb-0">
                            Selamat datang, <strong>{user.nama_lengkap}</strong>
                            <span className="badge bg-primary ms-2">{user.role === 'admin' ? '👨‍💼 Admin' : '👨‍🎓 Siswa'}</span>
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <button onClick={() => navigate('/profile')} className="btn btn-info">
                            👤 Profil
                        </button>
                        <button onClick={logout} className="btn btn-danger">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Controls */}
            {user.role === 'admin' && (
                <div className="mb-4">
                    <ul className="nav nav-tabs" role="tablist">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'katalog' ? 'active' : ''}`}
                                onClick={() => setActiveTab('katalog')}
                            >
                                📚 Katalog Buku
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'daftar_buku' ? 'active' : ''}`}
                                onClick={() => setActiveTab('daftar_buku')}
                            >
                                📖 Daftar Buku
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('students');
                                    loadFilterSiswa();
                                    setSiswaFiltered(students);
                                }}
                            >
                                👨‍🎓 Manajemen Siswa
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'transaksi' ? 'active' : ''}`}
                                onClick={() => setActiveTab('transaksi')}
                            >
                                📋 Transaksi
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'laporan' ? 'active' : ''}`}
                                onClick={() => setActiveTab('laporan')}
                            >
                                📊 Laporan
                            </button>
                        </li>
                    </ul>

                    <div className="card border-0 mt-3">
                        {/* Katalog Buku - Tambah Buku */}
                        {activeTab === 'katalog' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📚 Telusuri Katalog Buku</h5>
                                
                                {/* Search Bar */}
                                <div className="mb-4">
                                    <input 
                                        id="searchBooks"
                                        name="searchBooks"
                                        type="text" 
                                        className="form-control form-control-lg" 
                                        placeholder="🔍 Cari buku berdasarkan judul, penulis, atau penerbit..." 
                                        value={searchQuery}
                                        onChange={(e) => searchBuku(e.target.value)}
                                    />
                                </div>

                                {books.length === 0 ? (
                                    <div className="alert alert-info">
                                        Tidak ada buku yang tersedia saat ini.
                                    </div>
                                ) : (
                                    <div className="row g-4">
                                        {books.map(book => (
                                            <div className="col-md-6 col-lg-4" key={book.id}>
                                                <div className="card h-100 shadow-sm" style={{border: `1px solid ${isDark ? '#444444' : '#dee2e6'}`}}>
                                                    <div className="card-body">
                                                        <h5 className="card-title">{book.judul}</h5>
                                                        <p className="card-text small text-muted mb-2">
                                                            <strong>Penulis:</strong> {book.penulis}
                                                        </p>
                                                        <p className="card-text small mb-2">
                                                            <strong>Penerbit:</strong> {book.penerbit || '-'}
                                                        </p>
                                                        <p className="card-text small mb-3">
                                                            <strong>Tahun:</strong> {book.tahun_terbit || '-'}
                                                        </p>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="badge bg-primary">{book.stok} stok</span>
                                                            <button 
                                                                onClick={() => viewBookProfile(book.id)} 
                                                                className="btn btn-sm btn-outline-primary"
                                                            >
                                                                👁️ Detail
                                                            </button>
                                                        </div>
                                                        {user.role === 'siswa' && (
                                                            <button 
                                                                onClick={() => pinjamBuku(book.id)} 
                                                                className="btn btn-primary btn-sm w-100 mt-2" 
                                                                disabled={book.stok < 1}
                                                            >
                                                                {book.stok < 1 ? '❌ Habis' : '📤 Pinjam'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Daftar Buku - Manage Books */}
                        {activeTab === 'daftar_buku' && (
                            <div className="card-body">
                                <h5 className="card-title mb-3">Tambah Buku Baru</h5>
                                <form onSubmit={tambahBuku} className="row g-3 mb-5 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    <div className="col-md-6">
                                        <label htmlFor="judulBuku" className="form-label">Judul Buku</label>
                                        <input 
                                            id="judulBuku"
                                            name="judulBuku"
                                            className="form-control" 
                                            placeholder="Masukkan judul buku"
                                            value={newBook.judul} 
                                            onChange={e => setNewBook({...newBook, judul: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="penulisBuku" className="form-label">Penulis</label>
                                        <input 
                                            id="penulisBuku"
                                            name="penulisBuku"
                                            className="form-control" 
                                            placeholder="Masukkan nama penulis"
                                            value={newBook.penulis} 
                                            onChange={e => setNewBook({...newBook, penulis: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="penerbitBuku" className="form-label">Penerbit</label>
                                        <input 
                                            id="penerbitBuku"
                                            name="penerbitBuku"
                                            className="form-control" 
                                            placeholder="Masukkan nama penerbit"
                                            value={newBook.penerbit} 
                                            onChange={e => setNewBook({...newBook, penerbit: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label htmlFor="tahunTerbit" className="form-label">Tahun Terbit</label>
                                        <input 
                                            id="tahunTerbit"
                                            name="tahunTerbit"
                                            type="number" 
                                            className="form-control" 
                                            placeholder="Tahun"
                                            value={newBook.tahun_terbit} 
                                            onChange={e => setNewBook({...newBook, tahun_terbit: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label htmlFor="stokBuku" className="form-label">Stok</label>
                                        <input 
                                            id="stokBuku"
                                            name="stokBuku"
                                            type="number" 
                                            className="form-control" 
                                            placeholder="Jumlah stok"
                                            value={newBook.stok} 
                                            onChange={e => setNewBook({...newBook, stok: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="col-12">
                                        <button type="submit" className="btn btn-success">✅ Tambah Buku</button>
                                    </div>
                                </form>

                                <h5 className="card-title mb-4">📋 Daftar Buku di Sistema</h5>
                                {books.length === 0 ? (
                                    <div className="alert alert-info">
                                        Tidak ada buku yang tersedia.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Judul</th>
                                                    <th>Penulis</th>
                                                    <th>Penerbit</th>
                                                    <th>Tahun</th>
                                                    <th>Stok</th>
                                                    <th>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {books.map(book => (
                                                    <tr key={book.id}>
                                                        <td><strong>{book.judul}</strong></td>
                                                        <td>{book.penulis}</td>
                                                        <td>{book.penerbit || '-'}</td>
                                                        <td>{book.tahun_terbit || '-'}</td>
                                                        <td><span className="badge bg-primary">{book.stok}</span></td>
                                                        <td>
                                                            <button 
                                                                onClick={() => hapusBuku(book.id)} 
                                                                className="btn btn-sm btn-danger"
                                                            >
                                                                🗑️ Hapus
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manajemen Siswa */}
                        {activeTab === 'students' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📚 Manajemen Siswa</h5>

                                {/* Search & Filter Bar */}
                                <div className="row g-3 mb-4 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    {/* Search Input */}
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">🔍 Cari Siswa</label>
                                        <input 
                                            id="searchSiswa"
                                            name="searchSiswa"
                                            type="text" 
                                            className="form-control" 
                                            placeholder="Cari by nama atau username..." 
                                            value={searchSiswa}
                                            onChange={(e) => handleSearchSiswaChange(e.target.value)}
                                        />
                                    </div>

                                    {/* Filter Kelas */}
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold">🎓 Kelas</label>
                                        <select 
                                            id="filterKelas"
                                            name="filterKelas"
                                            className="form-select"
                                            value={filterKelas}
                                            onChange={(e) => handleFilterKelasChange(e.target.value)}
                                        >
                                            <option value="">Semua Kelas</option>
                                            {daftarKelas.map(kelas => (
                                                <option key={kelas} value={kelas}>{kelas}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Filter Jurusan */}
                                    <div className="col-md-3">
                                        <label className="form-label fw-bold">📖 Jurusan</label>
                                        <select 
                                            id="filterJurusan"
                                            name="filterJurusan"
                                            className="form-select"
                                            value={filterJurusan}
                                            onChange={(e) => handleFilterJurusanChange(e.target.value)}
                                        >
                                            <option value="">Semua Jurusan</option>
                                            {daftarJurusan.map(jurusan => (
                                                <option key={jurusan} value={jurusan}>{jurusan}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Reset Button */}
                                    <div className="col-md-2 d-flex align-items-end">
                                        <button 
                                            onClick={resetFilterSiswa} 
                                            className="btn btn-outline-secondary w-100"
                                        >
                                            🔄 Reset
                                        </button>
                                    </div>
                                </div>

                                {/* Results Count */}
                                <div className="mb-3">
                                    <p className="text-muted">
                                        Menampilkan <strong>{siswaFiltered.length}</strong> siswa
                                        {(searchSiswa || filterKelas || filterJurusan) && 
                                            ` (filter aktif)`}
                                    </p>
                                </div>

                                {/* Daftar Siswa Table */}
                                {siswaFiltered.length === 0 ? (
                                    <div className="alert alert-info">
                                        {students.length === 0 
                                            ? 'Belum ada siswa yang terdaftar.' 
                                            : 'Tidak ada siswa yang sesuai dengan filter.'}
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Nama Lengkap</th>
                                                    <th>Username</th>
                                                    <th>Kelas</th>
                                                    <th>Jurusan</th>
                                                    <th>Role</th>
                                                    <th>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {siswaFiltered.map(s => (
                                                    <tr key={s.id}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#f0f0f0',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    overflow: 'hidden',
                                                                    flexShrink: 0,
                                                                    border: '2px solid #dee2e6'
                                                                }}>
                                                                    {s.foto_profil ? (
                                                                        <img src={s.foto_profil} alt={s.nama_lengkap} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                                                    ) : (
                                                                        <span style={{fontSize: '18px'}}>👤</span>
                                                                    )}
                                                                </div>
                                                                <strong>{s.nama_lengkap || '-'}</strong>
                                                            </div>
                                                        </td>
                                                        <td>@{s.username}</td>
                                                        <td>{s.kelas || '-'}</td>
                                                        <td>{s.jurusan || '-'}</td>
                                                        <td>
                                                            <span className="badge bg-info">
                                                                {s.role === 'admin' ? '👨‍💼 Admin' : '👨‍🎓 Siswa'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button 
                                                                onClick={() => viewStudentProfile(s)} 
                                                                className="btn btn-sm btn-info me-2"
                                                            >
                                                                👁️ Lihat Profil
                                                            </button>
                                                            <button 
                                                                onClick={() => hapusSiswa(s.id)} 
                                                                className="btn btn-sm btn-danger"
                                                            >
                                                                🗑️ Hapus
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Laporan Transaksi */}
                        {/* Transaksi - List Transaksi */}
                        {activeTab === 'transaksi' && (
                            <div className="card-body">
                                <h5 className="card-title mb-3">Daftar Transaksi Peminjaman</h5>
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Siswa</th>
                                                <th>Buku</th>
                                                <th>Tanggal Pinjam</th>
                                                <th>Tanggal Kembali</th>
                                                <th>Status</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-muted py-4">
                                                        Belum ada transaksi peminjaman.
                                                    </td>
                                                </tr>
                                            ) : (
                                                transactions.map(t => (
                                                    <tr key={t.id}>
                                                        <td>{t.nama_lengkap}</td>
                                                        <td>{t.judul}</td>
                                                        <td>{new Date(t.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                        <td>{t.tanggal_kembali ? new Date(t.tanggal_kembali).toLocaleDateString('id-ID') : '-'}</td>
                                                        <td>
                                                            <span className={`badge ${t.status === 'dipinjam' ? 'bg-danger' : 'bg-success'}`}>
                                                                {t.status === 'dipinjam' ? '📤 Dipinjam' : '📥 Dikembalikan'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {t.status === 'dipinjam' && (
                                                                <button 
                                                                    onClick={() => kembalikanBuku(t.id, t.book_id)} 
                                                                    className="btn btn-sm btn-primary"
                                                                >
                                                                    Terima Kembali
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Laporan - Report Transaksi */}
                        {activeTab === 'laporan' && (
                            <div className="card-body">
                                <h5 className="card-title mb-3">Laporan Transaksi Peminjaman</h5>
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Siswa</th>
                                                <th>Buku</th>
                                                <th>Tanggal Pinjam</th>
                                                <th>Tanggal Kembali</th>
                                                <th>Status</th>
                                                <th>Denda</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-muted py-4">
                                                        Belum ada transaksi peminjaman.
                                                    </td>
                                                </tr>
                                            ) : (
                                                transactions.map(t => (
                                                    <tr key={t.id}>
                                                        <td>{t.nama_lengkap}</td>
                                                        <td>{t.judul}</td>
                                                        <td>{new Date(t.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                        <td>{t.tanggal_kembali ? new Date(t.tanggal_kembali).toLocaleDateString('id-ID') : '-'}</td>
                                                        <td>
                                                            <span className={`badge ${t.status === 'dipinjam' ? 'bg-danger' : 'bg-success'}`}>
                                                                {t.status === 'dipinjam' ? '📤 Dipinjam' : '📥 Dikembalikan'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {t.denda && t.denda > 0 ? (
                                                                <span className="text-danger fw-bold">Rp {t.denda.toLocaleString('id-ID')}</span>
                                                            ) : (
                                                                <span className="text-success">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Buku yang Dipinjam (Hanya untuk Siswa) */}
            {user.role === 'siswa' && (
                <div className="mb-5">
                    <h4 className="mb-4">
                        <span>📚 Buku Yang Saya Pinjam</span>
                        <span className="badge bg-warning text-dark ms-2">{myBorrowedBooks.length} Buku</span>
                    </h4>
                    {myBorrowedBooks.length === 0 ? (
                        <div className="alert alert-info">
                            Anda belum meminjam buku. Silakan pilih buku dari katalog di bawah.
                        </div>
                    ) : (
                        <div className="card border-0 mb-4">
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Judul Buku</th>
                                                <th>Penulis</th>
                                                <th>Tanggal Pinjam</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myBorrowedBooks.map(b => (
                                                <tr key={b.id}>
                                                    <td><strong>{b.judul}</strong></td>
                                                    <td>{b.penulis}</td>
                                                    <td>{new Date(b.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                    <td>
                                                        <span className="badge bg-danger">
                                                            📤 Sedang Dipinjam
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Student Profile Modal */}
            {showStudentProfile && selectedStudent && (
                <div className="modal d-block" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">👤 Profil Siswa</h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowStudentProfile(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {/* Student Info */}
                                <div className="mb-4 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    <div className="row">
                                        <div className="col-md-3 text-center mb-3 mb-md-0">
                                            <div style={{
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '50%',
                                                backgroundColor: '#f0f0f0',
                                                margin: '0 auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                border: '4px solid #0d6efd'
                                            }}>
                                                {selectedStudent.foto_profil ? (
                                                    <img src={selectedStudent.foto_profil} alt={selectedStudent.nama_lengkap} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                                ) : (
                                                    <span style={{fontSize: '48px'}}>👤</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-9">
                                            <div className="mb-3">
                                                <h6 className="text-muted mb-2">Nama Lengkap</h6>
                                                <p className="fs-5"><strong>{selectedStudent.nama_lengkap}</strong></p>
                                            </div>
                                            <div className="mb-3">
                                                <h6 className="text-muted mb-2">Username</h6>
                                                <p className="fs-5"><code>@{selectedStudent.username}</code></p>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <h6 className="text-muted mb-2">Kelas</h6>
                                                    <p className="fs-5">{selectedStudent.kelas || '-'}</p>
                                                </div>
                                                <div className="col-md-6">
                                                    <h6 className="text-muted mb-2">Jurusan</h6>
                                                    <p className="fs-5">{selectedStudent.jurusan || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Borrowed Books Section */}
                                <h6 className="text-muted mb-3">📚 Riwayat Peminjaman Buku</h6>
                                {studentBorrowedBooks.length === 0 ? (
                                    <div className="alert alert-info mb-0">
                                        Siswa ini belum pernah meminjam buku.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Judul Buku</th>
                                                    <th>Penulis</th>
                                                    <th>Tanggal Pinjam</th>
                                                    <th>Tanggal Kembali</th>
                                                    <th>Status</th>
                                                    <th>Denda</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentBorrowedBooks.map(book => (
                                                    <tr key={book.id}>
                                                        <td><strong>{book.judul}</strong></td>
                                                        <td>{book.penulis}</td>
                                                        <td>
                                                            <span className="badge bg-secondary">
                                                                {new Date(book.tanggal_pinjam).toLocaleDateString('id-ID')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {book.tanggal_kembali ? (
                                                                new Date(book.tanggal_kembali).toLocaleDateString('id-ID')
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${book.status === 'dipinjam' ? 'bg-danger' : 'bg-success'}`}>
                                                                {book.status === 'dipinjam' ? '📤 Dipinjam' : '📥 Dikembalikan'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {book.denda && book.denda > 0 ? (
                                                                <span className="text-danger fw-bold">Rp {book.denda.toLocaleString('id-ID')}</span>
                                                            ) : (
                                                                <span className="text-success">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStudentProfile(false)}>Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Book Profile Modal */}
            {showBookProfile && selectedBook && (
                <div className="modal d-block" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Profil Buku</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowBookProfile(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <h3>{selectedBook.judul}</h3>
                                <p><strong>Penulis:</strong> {selectedBook.penulis}</p>
                                <p><strong>Penerbit:</strong> {selectedBook.penerbit || '-'}</p>
                                <p><strong>Tahun Terbit:</strong> {selectedBook.tahun_terbit || '-'}</p>
                                <p><strong>Stok Tersedia:</strong> <span className="badge bg-primary">{selectedBook.stok}</span></p>
                            </div>
                            <div className="modal-footer">
                                {user.role === 'siswa' && (
                                    <button 
                                        onClick={() => { pinjamBuku(selectedBook.id); setShowBookProfile(false); }} 
                                        className="btn btn-primary" 
                                        disabled={selectedBook.stok < 1}
                                    >
                                        {selectedBook.stok < 1 ? '❌ Habis' : '📤 Pinjam'}
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={() => setShowBookProfile(false)}>Tutup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Daftar Buku untuk Peminjaman (Semua User) */}
        </div>
    );
}