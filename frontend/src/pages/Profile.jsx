import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser, triggerUserUpdate } from '../hooks/useUser';

export default function Profile() {
    // Hardcoded lists untuk kelas dan jurusan
    const DAFTAR_KELAS = ['X', 'XI', 'XII'];
    const DAFTAR_JURUSAN = ['PPLG', 'AKL', 'TJKT', 'MPLB', 'DKV'];

    const user = useUser();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nama_lengkap: '',
        bio: '',
        kelas: '',
        jurusan: '',
        foto_profil: ''
    });
    const [loading, setLoading] = useState(true);
    const [borrowedBooks, setBorrowedBooks] = useState([]);
    const [borrowingHistory, setBorrowingHistory] = useState([]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const userData = user;
        
        // Fetch profile data
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/profile/${userData.id}`);
                setFormData({
                    nama_lengkap: res.data.nama_lengkap || '',
                    bio: res.data.bio || '',
                    kelas: res.data.kelas || '',
                    jurusan: res.data.jurusan || '',
                    foto_profil: res.data.foto_profil || ''
                });
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        // Fetch borrowed books (currently dipinjam)
        const fetchBorrowedBooks = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/my-borrowed-books/${userData.id}`);
                setBorrowedBooks(res.data);
            } catch (err) {
                console.error('Error fetching borrowed books:', err);
            }
        };

        // Fetch borrowing history (semua transaksi)
        const fetchBorrowingHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/my-borrowing-history/${userData.id}`);
                setBorrowingHistory(res.data);
            } catch (err) {
                console.error('Error fetching borrowing history:', err);
            }
        };

        Promise.all([fetchProfile(), fetchBorrowedBooks(), fetchBorrowingHistory()]).finally(() => {
            setLoading(false);
        });
    }, [user, navigate]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Compress image using canvas
                    const canvas = document.createElement('canvas');
                    const maxWidth = 300;
                    const maxHeight = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to base64 with compression (quality 0.8)
                    const compressedImage = canvas.toDataURL('image/jpeg', 0.8);
                    setFormData({ ...formData, foto_profil: compressedImage });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            const updateData = {
                nama_lengkap: formData.nama_lengkap,
                bio: formData.bio,
                foto_profil: formData.foto_profil
            };

            // Jika siswa, tambahkan kelas dan jurusan
            if (user.role === 'siswa') {
                updateData.kelas = formData.kelas;
                updateData.jurusan = formData.jurusan;
            }

            await axios.put(`http://localhost:5000/profile/${user.id}`, updateData);
            alert('Profil berhasil diupdate!');
            
            // Update localStorage
            const updatedUser = { ...user, ...updateData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            triggerUserUpdate(updatedUser);
            setIsEditing(false);
        } catch (err) {
            alert('Gagal mengupdate profil: ' + err.message);
        }
    };

    const downloadMembershipCard = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/membership-card/${user.id}`, {
                responseType: 'blob'
            });
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Kartu_Anggota_${user.nama_lengkap.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentURL.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            alert('✅ Kartu anggota berhasil diunduh!');
        } catch (err) {
            console.error('Error downloading membership card:', err);
            alert('❌ Gagal mengunduh kartu anggota: ' + err.message);
        }
    };

    if (loading) {
        return <div className="container py-5"><p>Loading...</p></div>;
    }

    if (!user) return null;

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-md-8 mx-auto">
                    <div className="card border-0 shadow-sm">
                        {/* Header */}
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h3 className="mb-0">👤 Profil Saya</h3>
                            <button 
                                className="btn btn-light btn-sm"
                                onClick={() => navigate('/dashboard')}
                            >
                                ← Kembali
                            </button>
                        </div>

                        {/* Profile Content */}
                        <div className="card-body">
                            {!isEditing ? (
                                // View Mode
                                <div className="row g-4">
                                    {/* Foto Profil */}
                                    <div className="col-md-4 text-center">
                                        <div style={{
                                            width: '200px',
                                            height: '200px',
                                            margin: '0 auto',
                                            backgroundColor: '#f0f0f0',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            border: '4px solid #007bff'
                                        }}>
                                            {user.foto_profil ? (
                                                <img src={user.foto_profil} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                            ) : (
                                                <span style={{fontSize: '48px'}}>📷</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Profile Info */}
                                    <div className="col-md-8">
                                        <div className="mb-4">
                                            <h4 className="text-muted mb-2">Nama Lengkap</h4>
                                            <p className="fs-5 fw-bold">{user.nama_lengkap}</p>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-muted mb-2">Username</h4>
                                            <p className="fs-5"><code>{user.username}</code> <span className="badge bg-secondary ms-2">Tidak dapat diubah</span></p>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-muted mb-2">Role</h4>
                                            <p className="fs-5">
                                                <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                                                    {user.role === 'admin' ? '👨‍💼 Admin' : '👨‍🎓 Siswa'}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-muted mb-2">Bio</h4>
                                            <p className="fs-5">{user.bio || 'Belum ada bio'}</p>
                                        </div>

                                        {user.role === 'siswa' && (
                                            <>
                                                <div className="mb-4">
                                                    <h4 className="text-muted mb-2">Kelas</h4>
                                                    <p className="fs-5">{user.kelas || '-'}</p>
                                                </div>

                                                <div className="mb-4">
                                                    <h4 className="text-muted mb-2">Jurusan</h4>
                                                    <p className="fs-5">{user.jurusan || '-'}</p>
                                                </div>
                                            </>
                                        )}

                                        <div className="d-flex gap-2">
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => setIsEditing(true)}
                                            >
                                                ✏️ Edit Profil
                                            </button>
                                            {user.role === 'siswa' && (
                                                <button 
                                                    className="btn btn-success"
                                                    onClick={downloadMembershipCard}
                                                >
                                                    🎫 Unduh Kartu Anggota
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Edit Mode
                                <form onSubmit={handleSaveProfile}>
                                    <div className="mb-4">
                                        <label className="form-label">Foto Profil</label>
                                        <div className="mb-3">
                                            {formData.foto_profil && (
                                                <div style={{
                                                    width: '150px',
                                                    height: '150px',
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    marginBottom: '10px',
                                                    border: '3px solid #007bff'
                                                }}>
                                                    <img src={formData.foto_profil} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={handleImageUpload}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Nama Lengkap</label>
                                        <input 
                                            type="text"
                                            className="form-control"
                                            name="nama_lengkap"
                                            value={formData.nama_lengkap}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Username</label>
                                        <input 
                                            type="text"
                                            className="form-control"
                                            value={user.username}
                                            disabled
                                        />
                                        <small className="text-muted">Username tidak dapat diubah</small>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Bio</label>
                                        <textarea 
                                            className="form-control"
                                            name="bio"
                                            rows="3"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            placeholder="Tulis bio Anda..."
                                        ></textarea>
                                    </div>

                                    {user.role === 'siswa' && (
                                        <>
                                            <div className="mb-3">
                                                <label className="form-label">🎓 Kelas</label>
                                                <select 
                                                    className="form-select"
                                                    name="kelas"
                                                    value={formData.kelas}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="">Pilih Kelas</option>
                                                    {DAFTAR_KELAS.map(k => (
                                                        <option key={k} value={k}>{k}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label">📖 Jurusan</label>
                                                <select 
                                                    className="form-select"
                                                    name="jurusan"
                                                    value={formData.jurusan}
                                                    onChange={handleInputChange}
                                                >
                                                    <option value="">Pilih Jurusan</option>
                                                    {DAFTAR_JURUSAN.map(j => (
                                                        <option key={j} value={j}>{j}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    <div className="d-flex gap-2">
                                        <button 
                                            type="submit"
                                            className="btn btn-success"
                                        >
                                            💾 Simpan Perubahan
                                        </button>
                                        <button 
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({
                                                    nama_lengkap: user.nama_lengkap || '',
                                                    bio: user.bio || '',
                                                    kelas: user.kelas || '',
                                                    jurusan: user.jurusan || '',
                                                    foto_profil: user.foto_profil || ''
                                                });
                                            }}
                                        >
                                            ❌ Batal
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Buku yang Sedang Dipinjam */}
                    {user.role === 'siswa' && borrowedBooks.length > 0 && (
                        <div className="card border-0 shadow-sm mt-4">
                            <div className="card-header bg-info text-white">
                                <h4 className="mb-0">📚 Buku yang Sedang Dipinjam</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>Judul Buku</th>
                                                <th>Penulis</th>
                                                <th>Tanggal Pinjam</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {borrowedBooks.map(book => (
                                                <tr key={book.id}>
                                                    <td><strong>{book.judul}</strong></td>
                                                    <td>{book.penulis}</td>
                                                    <td>{new Date(book.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                    <td><span className="badge bg-warning">Dipinjam</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Riwayat Peminjaman */}
                    {user.role === 'siswa' && borrowingHistory.length > 0 && (
                        <div className="card border-0 shadow-sm mt-4">
                            <div className="card-header bg-success text-white">
                                <h4 className="mb-0">📖 Riwayat Peminjaman</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead>
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
                                            {borrowingHistory.map(transaction => (
                                                <tr key={transaction.id}>
                                                    <td><strong>{transaction.judul}</strong></td>
                                                    <td>{transaction.penulis}</td>
                                                    <td>{new Date(transaction.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                    <td>{transaction.tanggal_kembali ? new Date(transaction.tanggal_kembali).toLocaleDateString('id-ID') : '-'}</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            transaction.status === 'dipinjam' ? 'bg-warning' :
                                                            transaction.status === 'kembali' ? 'bg-success' :
                                                            transaction.status === 'diminta_kembali' ? 'bg-info' : 'bg-secondary'
                                                        }`}>
                                                            {transaction.status === 'dipinjam' ? 'Dipinjam' :
                                                             transaction.status === 'kembali' ? 'Dikembalikan' :
                                                             transaction.status === 'diminta_kembali' ? 'Diminta Kembali' : transaction.status}
                                                        </span>
                                                    </td>
                                                    <td>{transaction.denda ? `Rp ${transaction.denda.toLocaleString('id-ID')}` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
