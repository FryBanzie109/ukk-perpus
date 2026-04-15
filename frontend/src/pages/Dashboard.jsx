import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { BooksChart, StudentsChart, TransactionsChart } from '../components/Charts';

// Hardcoded constants untuk kelas, jurusan, dan kategori
const DAFTAR_KELAS = ['X', 'XI', 'XII'];
const DAFTAR_JURUSAN = ['PPLG', 'AKL', 'TJKT', 'MPLB', 'DKV'];
const DAFTAR_KATEGORI = [
    'Fiksi',
    'Non-Fiksi',
    'Pelajaran',
    'Referensi',
    'Pengetahuan Umum',
    'Biografi',
    'Sejarah',
    'Teknologi',
    'Seni & Budaya',
    'Anak-anak'
];

export default function Dashboard() {
    const { isDark } = useTheme();
    const [books, setBooks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [students, setStudents] = useState([]);
    const [myBorrowedBooks, setMyBorrowedBooks] = useState([]);
    const [myBorrowingHistory, setMyBorrowingHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('katalog');
    const [activeTabSiswa, setActiveTabSiswa] = useState('katalog'); // Tab untuk siswa
    const [user, setUser] = useState(null);
    const [_loading, setLoading] = useState(true);
    
    // Search & Detail Book States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState(null);
    const [showBookProfile, setShowBookProfile] = useState(false);
    
    // Search & Filter Buku States
    const [filterKategori, setFilterKategori] = useState('semua');
    const [filterTahun, setFilterTahun] = useState('semua');
    const [filterStok, setFilterStok] = useState('semua');
    const [tahunTersedia, setTahunTersedia] = useState([]);
    
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
    
    // Open Library Search States
    const [openLibSearchQuery, setOpenLibSearchQuery] = useState('');
    const [openLibResults, setOpenLibResults] = useState([]);
    const [openLibLoading, setOpenLibLoading] = useState(false);
    
    // Form States
    const [newBook, setNewBook] = useState({ judul: '', penulis: '', penerbit: '', kategori: 'Fiksi', tahun_terbit: '', stok: '' });
    
    // Late Fees States
    const [lateFees, setLateFees] = useState([]);

    // Stock Management States
    const [selectedBookForStock, setSelectedBookForStock] = useState(null);
    const [stokInput, setStokInput] = useState({ jumlah: '', tipe: 'tambah' });

    // Edit Book States
    const [editBookData, setEditBookData] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

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
                
                // Fetch borrowing history untuk siswa
                const resHistory = await axios.get(`http://localhost:5000/my-borrowing-history/${user.id}`);
                setMyBorrowingHistory(resHistory.data);
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

                    // Fetch borrowing history untuk siswa
                    console.log('Siswa detected, fetching borrowing history...');
                    try {
                        const resHistory = await axios.get(`http://localhost:5000/my-borrowing-history/${user.id}`);
                        if (!mounted) return;
                        console.log('✅ Borrowing history:', resHistory.data);
                        setMyBorrowingHistory(resHistory.data);
                    } catch (err) {
                        console.error('❌ Error fetching borrowing history:', err);
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

    // Extract available years from books
    useEffect(() => {
        if (books.length > 0) {
            const tahunUnique = [...new Set(books.map(b => b.tahun_terbit).filter(t => t))].sort().reverse();
            setTahunTersedia(tahunUnique);
        }
    }, [books]);



    // --- LOGIC BUKU ---
    const pinjamBuku = async (bookId) => {
        try {
            await axios.post('http://localhost:5000/borrow', { user_id: user.id, book_id: bookId });
            alert('Sukses Pinjam!'); 
            fetchData();
        } catch (err) { alert(err.response?.data?.message); }
    };

    // Konfirmasi pengembalian buku (admin)
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
                kategori: newBook.kategori.trim() || 'Fiksi',
                tahun_terbit: newBook.tahun_terbit || null,
                stok: parseInt(newBook.stok)
            };

            await axios.post('http://localhost:5000/books', bookData);
            alert('Buku berhasil ditambahkan!'); 
            setNewBook({ judul: '', penulis: '', penerbit: '', kategori: 'Fiksi', tahun_terbit: '', stok: '' }); 
            fetchData();
        } catch (err) { 
            console.error('Error adding book:', err);
            alert('Gagal menambah buku: ' + (err.response?.data?.message || err.message)); 
        }
    };

    const searchBuku = async (query = searchQuery, kategori = filterKategori, tahun = filterTahun, stok = filterStok) => {
        setSearchQuery(query);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.append('q', query.trim());
            if (kategori && kategori !== 'semua') params.append('kategori', kategori);
            if (tahun && tahun !== 'semua') params.append('tahun_terbit', tahun);
            if (stok && stok !== 'semua') params.append('stok_status', stok);

            const url = params.toString() 
                ? `http://localhost:5000/search-books?${params.toString()}`
                : 'http://localhost:5000/books';

            const res = await axios.get(url);
            setBooks(res.data);
        } catch (err) {
            console.error('Search error:', err);
            alert('Gagal melakukan pencarian. Silakan coba lagi.');
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
                // Pass user_id untuk validasi admin role
                const res = await axios.post('http://localhost:5000/return', { 
                    transaction_id: transId, 
                    book_id: bookId,
                    user_id: user.id
                });
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

    // --- LOGIC EDIT & STOK BUKU ---
    const openEditModal = (book) => {
        // Get fresh data from books state to ensure we have latest stock info
        const freshBook = books.find(b => b.id === book.id) || book;
        console.log(`\ud83d\udccb Modal dibuka untuk buku ID ${freshBook.id}, Stok saat ini: ${freshBook.stok}`);
        
        setEditBookData({
            id: freshBook.id,
            judul: freshBook.judul,
            penulis: freshBook.penulis,
            penerbit: freshBook.penerbit || '',
            kategori: freshBook.kategori || '',
            tahun_terbit: freshBook.tahun_terbit || '',
            cover_url: freshBook.cover_url || ''
        });
        setSelectedBookForStock(freshBook);
        console.log('RESET stokInput to empty');
        
        // Set tipe based on whether stok is null
        const isStokNull = freshBook.stok === null || freshBook.stok === undefined;
        setStokInput({ jumlah: '', tipe: isStokNull ? 'set' : 'tambah' });
        setShowEditModal(true);
    };

    const editBuku = async () => {
        if (!editBookData.judul.trim() || !editBookData.penulis.trim()) {
            alert('Judul dan Penulis harus diisi!');
            return;
        }

        try {
            console.log('📝 Update buku dengan ID:', editBookData.id);
            console.log('📦 Stok Input State:', stokInput);
            console.log('📚 Current stok from selectedBookForStock:', selectedBookForStock?.stok);
            
            // Update buku data - PENTING: include stok & cover_url to preserve them!
            await axios.put(`http://localhost:5000/books/${editBookData.id}`, {
                judul: editBookData.judul.trim(),
                penulis: editBookData.penulis.trim(),
                penerbit: editBookData.penerbit.trim() || null,
                kategori: editBookData.kategori || null,
                tahun_terbit: editBookData.tahun_terbit || null,
                stok: selectedBookForStock?.stok,  // CRITICAL: Don't lose stok value!
                cover_url: editBookData.cover_url || null  // CRITICAL: Don't lose cover photo!
            });

            console.log('✅ Buku data updated');

            // Update stok if ada input
            const stokJumlah = parseInt(stokInput.jumlah);
            console.log('🔢 Parsed stok jumlah:', stokJumlah, 'isNaN:', isNaN(stokJumlah), 'tipe:', stokInput.tipe);
            console.log('📚 selectedBookForStock.stok:', selectedBookForStock?.stok, 'type:', typeof selectedBookForStock?.stok);
            
            if (!isNaN(stokJumlah) && stokJumlah >= 0) {
                // Check validation based on whether stok is null or not
                const isStokNull = selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined;
                const isSettingInitialValue = stokInput.tipe === 'set';
                
                // Can't do tambah/kurangi if stok is null - must set first
                if (isStokNull && !isSettingInitialValue) {
                    alert('❌ Stok buku belum diinisialisasi!\n\nSilakan masukkan stok awal buku di field "Stok Awal" terlebih dahulu sebelum melakukan perubahan stok.');
                    return;
                }
                
                // For regular tambah/kurangi operations, need at least 1
                if (!isSettingInitialValue && stokJumlah < 1) {
                    alert('❌ Jumlah harus minimal 1 untuk operasi Tambah/Kurangi stok');
                    return;
                }
                
                console.log(`📤 Mengirim update stok: jumlah=${stokJumlah}, tipe=${stokInput.tipe}, stok_saat_ini=${selectedBookForStock?.stok}`);
                const response = await axios.put(`http://localhost:5000/books/${editBookData.id}/update-stok`, {
                    jumlah: stokJumlah,
                    tipe: stokInput.tipe
                });
                console.log('📥 Response dari server:', response.data);
                alert(`✅ ${response.data.message}\n\nStok Lama: ${response.data.stok_lama}\nStok Baru: ${response.data.stok_baru}`);
            } else {
                console.log('⏭️ Skip stok update - tidak ada input atau invalid');
            }

            alert('✅ Buku berhasil diperbarui!');
            setShowEditModal(false);
            setStokInput({ jumlah: '', tipe: 'tambah' });
            fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            console.error('❌ Edit book error:', err);
            console.error('Response data:', err.response?.data);
            alert('❌ Gagal memperbarui buku: ' + errorMsg);
        }
    };


    // --- LOGIC OPEN LIBRARY ---
    const searchOpenLibrary = async (query) => {
        setOpenLibSearchQuery(query);
        if (!query.trim()) {
            setOpenLibResults([]);
            return;
        }

        setOpenLibLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/books/search-openlib?q=${encodeURIComponent(query)}`);
            setOpenLibResults(res.data);
        } catch (err) {
            console.error('Open Library search error:', err);
            alert('Gagal mencari di Open Library');
            setOpenLibResults([]);
        } finally {
            setOpenLibLoading(false);
        }
    };

    const importFromOpenLib = async (book) => {
        try {
            const res = await axios.post('http://localhost:5000/books/import-openlib', {
                title: book.title,
                author: book.author,
                publisher: book.publisher,
                year: book.year,
                cover_url: book.cover_url
            });
            alert(res.data.message);
            setOpenLibSearchQuery('');
            setOpenLibResults([]);
            fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            const details = err.response?.data?.details || '';
            console.error('Import error:', { errorMsg, details, fullError: err.response?.data });
            alert('Gagal import buku: ' + errorMsg + (details ? ` (${details})` : ''));
        }
    };

    // --- LOGIC SISWA ---
    // Initialize daftar kelas & jurusan dengan nilai hardcoded
    useEffect(() => {
        setDaftarKelas(DAFTAR_KELAS);
        setDaftarJurusan(DAFTAR_JURUSAN);
    }, []);

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

    // --- LOGIC CETAK DENDA (LATE FEES) ---
    const fetchLateFees = async () => {
        try {
            const res = await axios.get('http://localhost:5000/late-fees');
            setLateFees(res.data || []);
        } catch (err) {
            console.error('Error fetching late fees:', err);
            alert('Gagal memuat data denda: ' + (err.message || 'Terjadi kesalahan'));
            setLateFees([]);
        }
    };

    const printLateFees = () => {
        const htmlContent = generateLateFeesPDFContent();
        const printWindow = window.open('', '', 'width=900,height=600');
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const generateLateFeesPDFContent = () => {
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Laporan Denda Keterlambatan Buku</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: white; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
                    .header h1 { margin: 0; color: #333; }
                    .header p { margin: 5px 0; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; font-weight: bold; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    tr:hover { background-color: #f5f5f5; }
                    .total-row { background-color: #e8f5e9; font-weight: bold; }
                    .amount { text-align: right; }
                    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                    .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
                    .summary p { margin: 5px 0; }
                    @media print {
                        body { margin: 0; padding: 10px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📚 LAPORAN DENDA KETERLAMBATAN BUKU</h1>
                    <p>Perpustakaan Sekolah</p>
                    <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
        `;

        if (lateFees.length === 0) {
            htmlContent += '<p style="text-align: center; color: green; font-size: 16px;"><strong>✅ Tidak ada siswa yang memiliki denda keterlambatan</strong></p>';
        } else {
            let totalDenda = 0;
            lateFees.forEach(fee => {
                totalDenda += parseInt(fee.total_denda, 10) || 0;
            });

            htmlContent += `
                <div class="summary">
                    <p><strong>Total Siswa Terdenda:</strong> ${lateFees.length} orang</p>
                    <p><strong>Total Denda Keseluruhan:</strong> Rp ${totalDenda.toLocaleString('id-ID')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">No.</th>
                            <th style="width: 15%;">Nama Siswa</th>
                            <th style="width: 8%;">Kelas</th>
                            <th style="width: 12%;">Jurusan</th>
                            <th style="width: 10%;">Jml Buku</th>
                            <th style="width: 20%;">Total Denda</th>
                            <th style="width: 30%;">Detail Buku</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            lateFees.forEach((fee, idx) => {
                const detailBooks = fee.detail_buku ? fee.detail_buku.split('\\n').filter(b => b.trim()) : [];
                htmlContent += `
                    <tr>
                        <td>${idx + 1}.</td>
                        <td><strong>${fee.nama_lengkap}</strong></td>
                        <td>${fee.kelas || '-'}</td>
                        <td>${fee.jurusan || '-'}</td>
                        <td style="text-align: center;">${fee.jumlah_buku_terlambat || 0}</td>
                        <td class="amount" style="color: #d32f2f; font-weight: bold;">Rp ${(parseInt(fee.total_denda, 10) || 0).toLocaleString('id-ID')}</td>
                        <td>${detailBooks.map(b => b.replace('- ', '&nbsp;&nbsp;&nbsp;')).join('<br/>')}</td>
                    </tr>
                `;
            });

            htmlContent += `
                    </tbody>
                </table>
            `;
        }

        htmlContent += `
                <div class="footer">
                    <p>Laporan ini dihasilkan secara otomatis oleh Sistem Informasi Perpustakaan Digital</p>
                </div>
            </body>
            </html>
        `;

        return htmlContent;
    };

    const downloadLateFeesPDF = async () => {
        if (lateFees.length === 0) {
            alert('Tidak ada data denda untuk diunduh');
            return;
        }

        try {
            // Download PDF dari backend
            const response = await axios.get('http://localhost:5000/late-fees/download/pdf', {
                responseType: 'blob'
            });
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Extract filename dari Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'Laporan_Denda_Keterlambatan.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) filename = filenameMatch[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF download error:', err);
            alert('Gagal mengunduh PDF: ' + (err.message || 'Terjadi kesalahan'));
        }
    };

    // Download Laporan Denda untuk Siswa Tertentu
    const downloadStudentLateFeesPDF = async (studentId, studentName) => {
        try {
            // Download PDF dari backend dengan student ID
            const response = await axios.get(`http://localhost:5000/late-fees/download/pdf/${studentId}`, {
                responseType: 'blob'
            });
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Extract filename dari Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = `Laporan_Denda_${studentName}.pdf`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) filename = filenameMatch[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF download error:', err);
            alert('Gagal mengunduh laporan siswa: ' + (err.message || 'Terjadi kesalahan'));
        }
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
                                className={`nav-link ${activeTab === 'daftar_buku' ? 'active' : ''}`}
                                onClick={() => setActiveTab('daftar_buku')}
                            >
                                📚 Daftar Buku
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('students');
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
                                className={`nav-link ${activeTab === 'riwayat_transaksi' ? 'active' : ''}`}
                                onClick={() => setActiveTab('riwayat_transaksi')}
                            >
                                📜 Riwayat Transaksi
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'cetak_denda' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('cetak_denda');
                                    fetchLateFees();
                                }}
                            >
                                🖨️ Cetak Denda
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'grafik' ? 'active' : ''}`}
                                onClick={() => setActiveTab('grafik')}
                            >
                                📊 Grafik & Laporan
                            </button>
                        </li>
                    </ul>

                    <div className="card border-0 mt-3">
                        {/* Daftar Buku - Tambah Buku */}
                        {activeTab === 'daftar_buku' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📚 Daftar Buku</h5>
                                
                                {/* Search Bar dan Filter */}
                                <div className="row g-3 mb-4 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">🔍 Cari Buku</label>
                                        <input 
                                            id="searchBooks"
                                            name="searchBooks"
                                            type="text" 
                                            className="form-control form-control-lg" 
                                            placeholder="Judul, penulis, penerbit..." 
                                            value={searchQuery}
                                            onChange={(e) => searchBuku(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📂 Kategori</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterKategori}
                                            onChange={(e) => {
                                                setFilterKategori(e.target.value);
                                                searchBuku(searchQuery, e.target.value, filterTahun, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua</option>
                                            {DAFTAR_KATEGORI.map(kat => (
                                                <option key={kat} value={kat}>{kat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📅 Tahun</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterTahun}
                                            onChange={(e) => {
                                                setFilterTahun(e.target.value);
                                                searchBuku(searchQuery, filterKategori, e.target.value, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua Tahun</option>
                                            {tahunTersedia.map(tahun => (
                                                <option key={tahun} value={tahun}>{tahun}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📦 Stok</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterStok}
                                            onChange={(e) => {
                                                setFilterStok(e.target.value);
                                                searchBuku(searchQuery, filterKategori, filterTahun, e.target.value);
                                            }}
                                        >
                                            <option value="semua">Semua Status</option>
                                            <option value="tersedia">✅ Tersedia</option>
                                            <option value="tidak_tersedia">❌ Tidak Tersedia</option>
                                        </select>
                                    </div>

                                    <div className="col-md-2 d-flex align-items-end">
                                        <button 
                                            className="btn btn-outline-secondary w-100" 
                                            onClick={() => {
                                                setSearchQuery('');
                                                setFilterKategori('semua');
                                                setFilterTahun('semua');
                                                setFilterStok('semua');
                                                searchBuku('', 'semua', 'semua', 'semua');
                                            }}
                                        >
                                            🔄 Reset
                                        </button>
                                    </div>
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
                                                    {/* Cover Image */}
                                                    <div style={{
                                                        width: '100%',
                                                        height: '220px',
                                                        backgroundColor: '#f0f0f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        borderBottom: `1px solid ${isDark ? '#444444' : '#dee2e6'}`
                                                    }}>
                                                        {book.cover_url ? (
                                                            <img 
                                                                src={book.cover_url} 
                                                                alt={book.judul}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'contain',
                                                                    padding: '8px'
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22220%22%3E%3Crect fill=%22%23e9ecef%22 width=%22200%22 height=%22220%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominantBaseline=%22middle%22 textAnchor=%22middle%22 fontFamily=%22Arial%22 fontSize=%2214%22 fill=%22%23999%22%3ENo Cover Image%3C/text%3E%3C/svg%3E';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '100%',
                                                                height: '100%',
                                                                backgroundColor: '#e9ecef'
                                                            }}>
                                                                <span style={{fontSize: '40px', marginBottom: '8px'}}>📖</span>
                                                                <span style={{fontSize: '12px', color: '#999'}}>No Cover</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="card-body">
                                                        <h5 className="card-title">{book.judul}</h5>
                                                        <p className="card-text small text-muted mb-2">
                                                            <strong>Penulis:</strong> {book.penulis}
                                                        </p>
                                                        <p className="card-text small mb-2">
                                                            <strong>Penerbit:</strong> {book.penerbit || '-'}
                                                        </p>
                                                        <p className="card-text small mb-2">
                                                            <strong>Kategori:</strong> <span className={`badge ${book.kategori ? 'bg-info' : 'bg-secondary'}`}>{book.kategori || '-'}</span>
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

                        {/* Daftar Buku - Search from Open Library Section */}
                        {activeTab === 'daftar_buku' && (
                            <div className="card-body">
                                {/* Open Library Search Section */}
                                <div className="mb-5 pb-4" style={{borderBottom: '3px solid #dee2e6'}}>
                                    <h5 className="card-title mb-3">📖 Cari Buku dari Open Library</h5>
                                    <p className="text-muted small">Cari dan import buku dari koleksi Open Library secara langsung</p>
                                    
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-9">
                                            <input 
                                                id="openLibSearch"
                                                name="openLibSearch"
                                                type="text" 
                                                className="form-control form-control-lg" 
                                                placeholder="Cari judul buku... (contoh: The Lord of the Rings)" 
                                                value={openLibSearchQuery}
                                                onChange={(e) => searchOpenLibrary(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <button 
                                                onClick={() => searchOpenLibrary(openLibSearchQuery)} 
                                                className="btn btn-primary btn-lg w-100"
                                                disabled={!openLibSearchQuery.trim() || openLibLoading}
                                            >
                                                {openLibLoading ? '🔄 Searching...' : '🔍 Search'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Open Library Results */}
                                    {openLibResults.length > 0 && (
                                        <div className="alert alert-info mb-4">
                                            <strong>Menemukan {openLibResults.length} buku</strong> - Klik tombol "Import" untuk menambahkan ke database
                                        </div>
                                    )}

                                    {openLibResults.length > 0 && (
                                        <div className="table-responsive mb-5">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Cover</th>
                                                        <th>Judul</th>
                                                        <th>Penulis</th>
                                                        <th>Penerbit</th>
                                                        <th>Tahun</th>
                                                        <th>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {openLibResults.map((book, idx) => (
                                                        <tr key={idx}>
                                                            <td>
                                                                {book.cover_url ? (
                                                                    <img 
                                                                        src={book.cover_url} 
                                                                        alt={book.title}
                                                                        style={{height: '50px', objectFit: 'contain', borderRadius: '4px'}}
                                                                        onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect fill=%22%23ccc%22 width=%2250%22 height=%2250%22/%3E%3C/svg%3E'; }}
                                                                    />
                                                                ) : (
                                                                    <div style={{width: '50px', height: '50px', backgroundColor: '#ccc', borderRadius: '4px'}}></div>
                                                                )}
                                                            </td>
                                                            <td><strong>{book.title}</strong></td>
                                                            <td>{book.author || '-'}</td>
                                                            <td>{book.publisher || '-'}</td>
                                                            <td>{book.year || '-'}</td>
                                                            <td>
                                                                <button 
                                                                    onClick={() => importFromOpenLib(book)} 
                                                                    className="btn btn-sm btn-success"
                                                                >
                                                                    ✅ Import
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

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
                                    <div className="col-md-6">
                                        <label htmlFor="kategoriBuku" className="form-label">Kategori</label>
                                        <select 
                                            id="kategoriBuku"
                                            name="kategoriBuku"
                                            className="form-select" 
                                            value={newBook.kategori} 
                                            onChange={e => setNewBook({...newBook, kategori: e.target.value})}
                                            required
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {DAFTAR_KATEGORI.map(kat => (
                                                <option key={kat} value={kat}>{kat}</option>
                                            ))}
                                        </select>
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

                                {/* Search Bar dan Filter */}
                                <div className="row g-3 mb-4 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">🔍 Cari Buku</label>
                                        <input 
                                            id="searchBooksSistema"
                                            name="searchBooksSistema"
                                            type="text" 
                                            className="form-control form-control-lg" 
                                            placeholder="Judul, penulis, penerbit..." 
                                            value={searchQuery}
                                            onChange={(e) => searchBuku(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📂 Kategori</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterKategori}
                                            onChange={(e) => {
                                                setFilterKategori(e.target.value);
                                                searchBuku(searchQuery, e.target.value, filterTahun, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua</option>
                                            {DAFTAR_KATEGORI.map(kat => (
                                                <option key={kat} value={kat}>{kat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📅 Tahun</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterTahun}
                                            onChange={(e) => {
                                                setFilterTahun(e.target.value);
                                                searchBuku(searchQuery, filterKategori, e.target.value, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua Tahun</option>
                                            {tahunTersedia.map(tahun => (
                                                <option key={tahun} value={tahun}>{tahun}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📦 Stok</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterStok}
                                            onChange={(e) => {
                                                setFilterStok(e.target.value);
                                                searchBuku(searchQuery, filterKategori, filterTahun, e.target.value);
                                            }}
                                        >
                                            <option value="semua">Semua Status</option>
                                            <option value="tersedia">✅ Tersedia</option>
                                            <option value="tidak_tersedia">❌ Tidak Tersedia</option>
                                        </select>
                                    </div>

                                    <div className="col-md-2 d-flex align-items-end">
                                        <button 
                                            className="btn btn-outline-secondary w-100" 
                                            onClick={() => {
                                                setSearchQuery('');
                                                setFilterKategori('semua');
                                                setFilterTahun('semua');
                                                setFilterStok('semua');
                                                searchBuku('', 'semua', 'semua', 'semua');
                                            }}
                                        >
                                            🔄 Reset
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Daftar Buku dalam Tabel */}
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
                                                    <th>Kategori</th>
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
                                                        <td><span className={`badge ${book.kategori ? 'bg-info' : 'bg-secondary'}`}>{book.kategori || '-'}</span></td>
                                                        <td>{book.tahun_terbit || '-'}</td>
                                                        <td><span className="badge bg-primary">{book.stok}</span></td>
                                                        <td>
                                                            <button 
                                                                onClick={() => openEditModal(book)} 
                                                                className="btn btn-sm btn-primary me-2"
                                                                title="Edit buku dan kelola stok"
                                                            >
                                                                ✏️ Edit
                                                            </button>
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
                                                                        <img src={s.foto_profil} alt={s.nama_lengkap} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
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
                                                            <div className="btn-group" role="group">
                                                                {t.status === 'dipinjam' && (
                                                                    <button 
                                                                        onClick={() => kembalikanBuku(t.id, t.book_id)} 
                                                                        className="btn btn-sm btn-primary"
                                                                        title="Terima pengembalian buku"
                                                                    >
                                                                        Terima Kembali
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => {
                                                                        const link = document.createElement('a');
                                                                        link.href = `http://localhost:5000/generate-pdf-transaction/${t.user_id}`;
                                                                        link.download = `Laporan_${t.nama_lengkap.replace(/\s+/g, '_')}.pdf`;
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    }}
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    title="Download laporan PDF siswa"
                                                                >
                                                                    📥 PDF
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}


                        {/* Cetak Denda - Print Late Fees */}
                        {activeTab === 'cetak_denda' && (
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="card-title mb-0">🖨️ Cetak Laporan Denda Keterlambatan</h5>
                                    <div className="btn-group" role="group">
                                        <button 
                                            onClick={printLateFees} 
                                            className="btn btn-success"
                                            disabled={lateFees.length === 0}
                                            title="Cetak laporan ke printer"
                                        >
                                            🖨️ Cetak
                                        </button>
                                        <button 
                                            onClick={downloadLateFeesPDF} 
                                            className="btn btn-primary"
                                            disabled={lateFees.length === 0}
                                            title="Download laporan sebagai file PDF"
                                        >
                                            📥 Download PDF
                                        </button>
                                    </div>
                                </div>

                                {lateFees.length === 0 ? (
                                    <div className="alert alert-success" role="alert">
                                        <h6 className="alert-heading">✅ Tidak Ada Denda</h6>
                                        Saat ini tidak ada siswa yang memiliki denda keterlambatan buku.
                                    </div>
                                ) : (
                                    <>
                                        <div className="alert alert-info mb-4">
                                            <strong>📊 Ringkasan:</strong> 
                                            <br/>
                                            Total Siswa Terdenda: <strong>{lateFees.length}</strong> orang
                                            <br/>
                                            Total Denda Keseluruhan: <strong className="text-danger">Rp {lateFees.reduce((sum, f) => sum + (parseInt(f.total_denda, 10) || 0), 0).toLocaleString('id-ID')}</strong>
                                        </div>

                                        <div className="table-responsive">
                                            <table className="table table-striped table-hover">
                                                <thead style={{ backgroundColor: '#212529', color: '#fff' }}>
                                                    <tr>
                                                        <th>No.</th>
                                                        <th>Nama Siswa</th>
                                                        <th>Kelas</th>
                                                        <th>Jurusan</th>
                                                        <th>Jml Buku</th>
                                                        <th>Total Denda</th>
                                                        <th>Detail Buku</th>
                                                        <th>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lateFees.map((fee, idx) => (
                                                        <tr key={fee.id}>
                                                            <td>{idx + 1}.</td>
                                                            <td><strong>{fee.nama_lengkap}</strong></td>
                                                            <td>{fee.kelas || '-'}</td>
                                                            <td>{fee.jurusan || '-'}</td>
                                                            <td className="text-center">
                                                                <span className="badge bg-warning">{fee.jumlah_buku_terlambat || 0}</span>
                                                            </td>
                                                            <td>
                                                                <strong className="text-danger">
                                                                    Rp {(fee.total_denda || 0).toLocaleString('id-ID')}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <small>
                                                                    {fee.detail_buku ? (
                                                                        fee.detail_buku.split('\n').filter(b => b.trim()).map((book, i) => (
                                                                            <div key={i}>{book}</div>
                                                                        ))
                                                                    ) : (
                                                                        '-'
                                                                    )}
                                                                </small>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    onClick={() => downloadStudentLateFeesPDF(fee.id, fee.nama_lengkap.replace(/\s+/g, '_'))}
                                                                    className="btn btn-sm btn-primary"
                                                                    title="Download laporan individual siswa ini"
                                                                >
                                                                    📄 Laporan
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="text-center mt-4">
                                            <button 
                                                onClick={printLateFees} 
                                                className="btn btn-lg btn-success me-2"
                                                title="Cetak laporan ke printer"
                                            >
                                                🖨️ Cetak
                                            </button>
                                            <button 
                                                onClick={downloadLateFeesPDF} 
                                                className="btn btn-lg btn-primary me-2"
                                                title="Download laporan sebagai file PDF"
                                            >
                                                📥 Download PDF
                                            </button>
                                            <button 
                                                onClick={() => window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(
                                                    'Nama Siswa,Kelas,Jurusan,Jumlah Buku Terlambat,Total Denda\n' +
                                                    lateFees.map(f => `"${f.nama_lengkap}","${f.kelas || '-'}","${f.jurusan || '-'}",${f.jumlah_buku_terlambat || 0},${f.total_denda || 0}`).join('\n')
                                                ), '_blank')}
                                                className="btn btn-lg btn-info"
                                                title="Export laporan sebagai file CSV"
                                            >
                                                📊 Export CSV
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Riwayat Transaksi - Complete Transaction History */}
                        {activeTab === 'riwayat_transaksi' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📜 Riwayat Transaksi Lengkap</h5>
                                
                                <div className="table-responsive">
                                    <table className="table table-hover table-striped">
                                        <thead>
                                            <tr>
                                                <th>No</th>
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
                                                    <td colSpan="7" className="text-center text-muted py-4">
                                                        Belum ada riwayat transaksi.
                                                    </td>
                                                </tr>
                                            ) : (
                                                transactions.map((t, index) => (
                                                    <tr key={t.id}>
                                                        <td>{index + 1}</td>
                                                        <td><strong>{t.nama_lengkap}</strong></td>
                                                        <td>{t.judul}</td>
                                                        <td>{new Date(t.tanggal_pinjam).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                                        <td>
                                                            {t.tanggal_kembali 
                                                                ? new Date(t.tanggal_kembali).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                : <span className="text-muted">-</span>
                                                            }
                                                        </td>
                                                        <td>
                                                            {t.status === 'dipinjam' ? (
                                                                <span className="badge bg-danger">📤 Dipinjam</span>
                                                            ) : t.status === 'kembali' ? (
                                                                <span className="badge bg-success">📥 Dikembalikan</span>
                                                            ) : t.status === 'diminta_kembali' ? (
                                                                <span className="badge bg-warning">⏳ Diminta Kembali</span>
                                                            ) : (
                                                                <span className="badge bg-secondary">{t.status}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {t.denda && t.denda > 0 ? (
                                                                <span className="badge bg-danger">Rp {t.denda.toLocaleString('id-ID')}</span>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Statistics */}
                                <div className="row mt-4 pt-3" style={{borderTop: '2px solid #dee2e6'}}>
                                    <div className="col-md-3">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-muted mb-2">Total Transaksi</h6>
                                                <h4 className="mb-0">{transactions.length}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-muted mb-2">Sedang Dipinjam</h6>
                                                <h4 className="mb-0 text-danger">{transactions.filter(t => t.status === 'dipinjam').length}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-muted mb-2">Sudah Dikembalikan</h6>
                                                <h4 className="mb-0 text-success">{transactions.filter(t => t.status === 'kembali').length}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card bg-light">
                                            <div className="card-body text-center">
                                                <h6 className="text-muted mb-2">Total Denda</h6>
                                                <h4 className="mb-0 text-warning">Rp {transactions.reduce((sum, t) => sum + (t.denda || 0), 0).toLocaleString('id-ID')}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Grafik & Laporan Tab */}
                        {activeTab === 'grafik' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📊 Grafik & Laporan</h5>
                                <BooksChart isDark={isDark} />
                                <StudentsChart isDark={isDark} />
                                <TransactionsChart isDark={isDark} />
                            </div>
                        )}


                    </div>
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
                                                    <img src={selectedStudent.foto_profil} alt={selectedStudent.nama_lengkap} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
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
                                <p><strong>Kategori:</strong> <span className={`badge ${selectedBook.kategori ? 'bg-info' : 'bg-secondary'}`}>{selectedBook.kategori || '-'}</span></p>
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

            {/* Edit Book Modal */}
            {showEditModal && editBookData && (
                <div className="modal d-block" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.6)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">✏️ Edit Buku</h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowEditModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label htmlFor="editJudul" className="form-label fw-bold">Judul Buku</label>
                                        <input 
                                            id="editJudul"
                                            type="text" 
                                            className="form-control" 
                                            value={editBookData.judul}
                                            onChange={(e) => setEditBookData({...editBookData, judul: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="editPenulis" className="form-label fw-bold">Penulis</label>
                                        <input 
                                            id="editPenulis"
                                            type="text" 
                                            className="form-control" 
                                            value={editBookData.penulis}
                                            onChange={(e) => setEditBookData({...editBookData, penulis: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="editPenerbit" className="form-label fw-bold">Penerbit</label>
                                        <input 
                                            id="editPenerbit"
                                            type="text" 
                                            className="form-control" 
                                            value={editBookData.penerbit}
                                            onChange={(e) => setEditBookData({...editBookData, penerbit: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="editKategori" className="form-label fw-bold">Kategori</label>
                                        <select 
                                            id="editKategori"
                                            className="form-select" 
                                            value={editBookData.kategori}
                                            onChange={(e) => setEditBookData({...editBookData, kategori: e.target.value})}
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {DAFTAR_KATEGORI.map(kat => (
                                                <option key={kat} value={kat}>{kat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="editTahunTerbit" className="form-label fw-bold">Tahun Terbit</label>
                                        <input 
                                            id="editTahunTerbit"
                                            type="text" 
                                            className="form-control" 
                                            value={editBookData.tahun_terbit}
                                            onChange={(e) => setEditBookData({...editBookData, tahun_terbit: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <hr className="my-4" />
                                <h6 className="mb-3">📦 Kelola Stok</h6>
                                
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        {selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? (
                                            <div className="alert alert-warning mb-3" style={{marginBottom: '0 !important'}}>
                                                ⚠️ <strong>Perhatian:</strong> Stok awal buku belum diatur. Silakan masukkan nilai stok awal di bawah.
                                            </div>
                                        ) : (
                                            <p className="text-muted">
                                                <strong>Stok Saat Ini:</strong> <span className="badge bg-primary">{selectedBookForStock?.stok}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="stokTipe" className="form-label fw-bold">
                                            {selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? 'Atur Stok' : 'Pilih Aksi'}
                                        </label>
                                        <select 
                                            id="stokTipe"
                                            className="form-select"
                                            value={stokInput.tipe}
                                            onChange={(e) => setStokInput({...stokInput, tipe: e.target.value})}
                                            disabled={selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? false : false}
                                        >
                                            {selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? (
                                                <option value="set">📝 Atur Stok Awal</option>
                                            ) : (
                                                <>
                                                    <option value="tambah">⬆️ Tambah Stok</option>
                                                    <option value="kurangi">⬇️ Kurangi Stok</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="stokJumlah" className="form-label fw-bold">
                                            {selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? 'Stok Awal' : 'Jumlah'}
                                        </label>
                                        <input 
                                            id="stokJumlah"
                                            type="number" 
                                            className="form-control" 
                                            placeholder={selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? 'Masukkan stok awal (minimal 0)' : 'Masukkan jumlah (minimal 1)'}
                                            value={stokInput.jumlah}
                                            onChange={(e) => {
                                                console.log('📝 Input value changed to:', e.target.value);
                                                setStokInput({...stokInput, jumlah: e.target.value});
                                            }}
                                            min={selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? '0' : '1'}
                                        />
                                    </div>
                                    <div className="col-md-12">
                                        <div className="alert alert-info mb-0">
                                            {selectedBookForStock?.stok === null || selectedBookForStock?.stok === undefined ? (
                                                `Stok buku akan diatur menjadi ${parseInt(stokInput.jumlah) || 0}`
                                            ) : (
                                                stokInput.tipe === 'tambah' 
                                                    ? `Stok akan berubah dari ${selectedBookForStock?.stok} menjadi ${parseInt(selectedBookForStock?.stok) + (parseInt(stokInput.jumlah) || 0)}`
                                                    : `Stok akan berubah dari ${selectedBookForStock?.stok} menjadi ${parseInt(selectedBookForStock?.stok) - (parseInt(stokInput.jumlah) || 0)}`
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={editBuku}
                                >
                                    ✅ Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Daftar Buku untuk Peminjaman (Hanya untuk Siswa) - dengan Tab Navigation */}
            {user.role === 'siswa' && (
                <div className="mb-5">
                    <ul className="nav nav-tabs" role="tablist">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTabSiswa === 'katalog' ? 'active' : ''}`}
                                onClick={() => setActiveTabSiswa('katalog')}
                            >
                                📚 Daftar Buku
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTabSiswa === 'bukusaya' ? 'active' : ''}`}
                                onClick={() => setActiveTabSiswa('bukusaya')}
                            >
                                📖 Buku Saya
                                <span className="badge bg-warning text-dark ms-2">{myBorrowedBooks.length}</span>
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTabSiswa === 'riwayat' ? 'active' : ''}`}
                                onClick={() => setActiveTabSiswa('riwayat')}
                            >
                                📜 Riwayat Peminjaman
                            </button>
                        </li>
                    </ul>

                    <div className="card border-0 mt-3">
                        {/* Katalog Buku Tab */}
                        {activeTabSiswa === 'katalog' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📚 Daftar Buku</h5>
                                
                                {/* Search Bar dan Filter */}
                                <div className="row g-3 mb-4 pb-3" style={{borderBottom: '2px solid #dee2e6'}}>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">🔍 Cari Buku</label>
                                        <input 
                                            id="searchBooksStudent"
                                            name="searchBooksStudent"
                                            type="text" 
                                            className="form-control form-control-lg" 
                                            placeholder="Judul, penulis, penerbit..." 
                                            value={searchQuery}
                                            onChange={(e) => searchBuku(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📂 Kategori</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterKategori}
                                            onChange={(e) => {
                                                setFilterKategori(e.target.value);
                                                searchBuku(searchQuery, e.target.value, filterTahun, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua</option>
                                            {DAFTAR_KATEGORI.map(kat => (
                                                <option key={kat} value={kat}>{kat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📅 Tahun</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterTahun}
                                            onChange={(e) => {
                                                setFilterTahun(e.target.value);
                                                searchBuku(searchQuery, filterKategori, e.target.value, filterStok);
                                            }}
                                        >
                                            <option value="semua">Semua Tahun</option>
                                            {tahunTersedia.map(tahun => (
                                                <option key={tahun} value={tahun}>{tahun}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label fw-bold">📦 Stok</label>
                                        <select 
                                            className="form-select form-select-lg"
                                            value={filterStok}
                                            onChange={(e) => {
                                                setFilterStok(e.target.value);
                                                searchBuku(searchQuery, filterKategori, filterTahun, e.target.value);
                                            }}
                                        >
                                            <option value="semua">Semua Status</option>
                                            <option value="tersedia">✅ Tersedia</option>
                                            <option value="tidak_tersedia">❌ Tidak Tersedia</option>
                                        </select>
                                    </div>

                                    <div className="col-md-2 d-flex align-items-end">
                                        <button 
                                            className="btn btn-outline-secondary w-100" 
                                            onClick={() => {
                                                setSearchQuery('');
                                                setFilterKategori('semua');
                                                setFilterTahun('semua');
                                                setFilterStok('semua');
                                                searchBuku('', 'semua', 'semua', 'semua');
                                            }}
                                        >
                                            🔄 Reset
                                        </button>
                                    </div>
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
                                                    {/* Cover Image */}
                                                    <div style={{
                                                        width: '100%',
                                                        height: '220px',
                                                        backgroundColor: '#f0f0f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        borderBottom: `1px solid ${isDark ? '#444444' : '#dee2e6'}`
                                                    }}>
                                                        {book.cover_url ? (
                                                            <img 
                                                                src={book.cover_url} 
                                                                alt={book.judul}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'contain',
                                                                    padding: '8px'
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22220%22%3E%3Crect fill=%22%23e9ecef%22 width=%22200%22 height=%22220%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominantBaseline=%22middle%22 textAnchor=%22middle%22 fontFamily=%22Arial%22 fontSize=%2214%22 fill=%22%23999%22%3ENo Cover Image%3C/text%3E%3C/svg%3E';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '100%',
                                                                height: '100%',
                                                                backgroundColor: '#e9ecef'
                                                            }}>
                                                                <span style={{fontSize: '40px', marginBottom: '8px'}}>📖</span>
                                                                <span style={{fontSize: '12px', color: '#999'}}>No Cover</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="card-body">
                                                        <h5 className="card-title">{book.judul}</h5>
                                                        <p className="card-text small text-muted mb-2">
                                                            <strong>Penulis:</strong> {book.penulis}
                                                        </p>
                                                        <p className="card-text small mb-2">
                                                            <strong>Penerbit:</strong> {book.penerbit || '-'}
                                                        </p>
                                                        <p className="card-text small mb-2">
                                                            <strong>Kategori:</strong> <span className={`badge ${book.kategori ? 'bg-info' : 'bg-secondary'}`}>{book.kategori || '-'}</span>
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
                                                        <button 
                                                            onClick={() => pinjamBuku(book.id)} 
                                                            className="btn btn-primary btn-sm w-100 mt-2" 
                                                            disabled={book.stok < 1}
                                                        >
                                                            {book.stok < 1 ? '❌ Habis' : '📤 Pinjam'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Buku Saya Tab */}
                        {activeTabSiswa === 'bukusaya' && (
                            <div className="card-body">
                                <h5 className="card-title mb-4">📖 Buku Yang Saya Pinjam</h5>
                                
                                {myBorrowedBooks.length === 0 ? (
                                    <div className="alert alert-info">
                                        Anda belum meminjam buku. Silakan pilih buku dari katalog di atas.
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        )}

                        {/* Riwayat Peminjaman Tab */}
                        {activeTabSiswa === 'riwayat' && (
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="card-title mb-0">📜 Riwayat Peminjaman</h5>
                                    <div>
                                        <button 
                                            className="btn btn-outline-primary me-2"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = `http://localhost:5000/generate-pdf-transaction/${user.id}`;
                                                link.download = `Laporan_Transaksi_${user.nama_lengkap.replace(/\s+/g, '_')}.pdf`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                        >
                                            📥 Download PDF
                                        </button>
                                        <button 
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                                window.open(`http://localhost:5000/generate-pdf-transaction/${user.id}`, '_blank');
                                            }}
                                        >
                                            🖨️ Cetak
                                        </button>
                                    </div>
                                </div>
                                
                                {myBorrowingHistory.length === 0 ? (
                                    <div className="alert alert-info">
                                        Belum ada riwayat peminjaman.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Judul Buku</th>
                                                    <th>Penulis</th>
                                                    <th>Kategori</th>
                                                    <th>Tanggal Pinjam</th>
                                                    <th>Tanggal Kembali</th>
                                                    <th>Status</th>
                                                    <th>Denda</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {myBorrowingHistory.map(h => (
                                                    <tr key={h.id}>
                                                        <td><strong>{h.judul}</strong></td>
                                                        <td>{h.penulis}</td>
                                                        <td>
                                                            <span className="badge bg-secondary">{h.kategori}</span>
                                                        </td>
                                                        <td>{new Date(h.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                                        <td>{h.tanggal_kembali ? new Date(h.tanggal_kembali).toLocaleDateString('id-ID') : '-'}</td>
                                                        <td>
                                                            {h.status === 'dipinjam' ? (
                                                                <span className="badge bg-danger">📤 Dipinjam</span>
                                                            ) : h.status === 'kembali' ? (
                                                                <span className="badge bg-success">📥 Dikembalikan</span>
                                                            ) : h.status === 'diminta_kembali' ? (
                                                                <span className="badge bg-warning">⏳ Diminta Kembali</span>
                                                            ) : (
                                                                <span className="badge bg-secondary">{h.status}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {h.denda > 0 ? (
                                                                <span className="badge bg-danger">Rp {h.denda.toLocaleString('id-ID')}</span>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}