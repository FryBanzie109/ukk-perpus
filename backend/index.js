const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- 1. LOGIN (Admin & Siswa) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: "Username/Password salah" });
        }
    } catch (err) { res.status(500).json(err); }
});

// --- 2. MANAJEMEN BUKU (CRUD) ---
// Get Semua Buku
app.get('/books', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM books');
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Get Detail Buku
app.get('/books/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Buku tidak ditemukan" });
        }
        res.json(rows[0]);
    } catch (err) { res.status(500).json(err); }
});

// Search Buku
app.get('/search-books', async (req, res) => {
    const { q } = req.query;
    try {
        if (!q || q.trim() === '') {
            const [rows] = await db.query('SELECT * FROM books');
            return res.json(rows);
        }
        const searchTerm = `%${q}%`;
        const [rows] = await db.query(
            'SELECT * FROM books WHERE judul LIKE ? OR penulis LIKE ? OR penerbit LIKE ? ORDER BY judul ASC',
            [searchTerm, searchTerm, searchTerm]
        );
        console.log(`Search for "${q}" found ${rows.length} results`);
        res.json(rows);
    } catch (err) { 
        console.error('Search error:', err);
        res.status(500).json({ message: 'Error searching books', error: err.message }); 
    }
});

// Tambah Buku (Admin)
app.post('/books', async (req, res) => {
    const { judul, penulis, penerbit, tahun_terbit, stok } = req.body;
    try {
        await db.query('INSERT INTO books (judul, penulis, penerbit, tahun_terbit, stok) VALUES (?,?,?,?,?)', 
            [judul, penulis, penerbit, tahun_terbit, stok]);
        res.json({ message: "Buku berhasil ditambahkan" });
    } catch (err) { res.status(500).json(err); }
});

// Hapus Buku (Admin)
app.delete('/books/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        res.json({ message: "Buku dihapus" });
    } catch (err) { res.status(500).json(err); }
});

// Edit Buku (Admin)
app.put('/books/:id', async (req, res) => {
    const { judul, penulis, penerbit, tahun_terbit, stok } = req.body;
    try {
        await db.query('UPDATE books SET judul=?, penulis=?, penerbit=?, tahun_terbit=?, stok=? WHERE id=?', 
            [judul, penulis, penerbit, tahun_terbit, stok, req.params.id]);
        res.json({ message: "Buku diupdate" });
    } catch (err) { res.status(500).json(err); }
});

// --- 3. TRANSAKSI (Peminjaman & Pengembalian) ---
// Pinjam Buku
app.post('/borrow', async (req, res) => {
    const { user_id, book_id } = req.body;
    try {
        // Cek Stok
        const [book] = await db.query('SELECT stok FROM books WHERE id = ?', [book_id]);
        if (book.length === 0 || book[0].stok < 1) {
            return res.status(400).json({ message: "Stok habis atau buku tidak ada!" });
        }

        // Kurangi Stok
        await db.query('UPDATE books SET stok = stok - 1 WHERE id = ?', [book_id]);
        
        // Catat Transaksi
        await db.query('INSERT INTO transactions (user_id, book_id, tanggal_pinjam, status) VALUES (?, ?, CURDATE(), "dipinjam")', [user_id, book_id]);
        
        res.json({ message: "Peminjaman Berhasil" });
    } catch (err) { res.status(500).json(err); }
});

// Kembalikan Buku dengan Denda
app.post('/return', async (req, res) => {
    const { transaction_id, book_id } = req.body;
    try {
        // Ambil data transaksi untuk hitung denda
        const [transaction] = await db.query('SELECT tanggal_pinjam FROM transactions WHERE id = ?', [transaction_id]);
        
        if (transaction.length === 0) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan" });
        }

        const tanggal_pinjam = new Date(transaction[0].tanggal_pinjam);
        const tanggal_kembali = new Date();
        
        // Hitung selisih hari
        const selisih_hari = Math.floor((tanggal_kembali - tanggal_pinjam) / (1000 * 60 * 60 * 24));
        
        // Hitung denda jika terlambat lebih dari 7 hari
        const batas_hari = 7;
        const denda_per_hari = 5000; // Rp 5000 per hari
        const denda = selisih_hari > batas_hari ? (selisih_hari - batas_hari) * denda_per_hari : 0;
        
        console.log(`Tanggal Pinjam: ${tanggal_pinjam}, Tanggal Kembali: ${tanggal_kembali}, Selisih: ${selisih_hari} hari, Denda: Rp ${denda}`);
        
        // Update Transaksi dengan tanggal kembali dan denda
        await db.query('UPDATE transactions SET status = "kembali", tanggal_kembali = CURDATE(), denda = ? WHERE id = ?', [denda, transaction_id]);
        
        // Tambah Stok
        await db.query('UPDATE books SET stok = stok + 1 WHERE id = ?', [book_id]);
        
        res.json({ 
            message: "Buku Dikembalikan",
            selisih_hari: selisih_hari,
            denda: denda,
            keterangan: denda > 0 ? `Buku terlambat ${selisih_hari - batas_hari} hari. Denda: Rp ${denda}` : "Tepat waktu, tidak ada denda"
        });
    } catch (err) { res.status(500).json(err); }
});

// Laporan Transaksi (Admin)
app.get('/transactions', async (req, res) => {
    const sql = `
        SELECT t.id, u.nama_lengkap, b.judul, t.tanggal_pinjam, t.tanggal_kembali, t.status, t.book_id, t.denda
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        JOIN books b ON t.book_id = b.id
        ORDER BY t.id DESC
    `;
    try {
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) { 
        console.error('Transactions error:', err);
        res.status(500).json(err); 
    }
});

// --- 4. MANAJEMEN SISWA (CRUD User) ---
// Ambil Semua Siswa
app.get('/students', async (req, res) => {
    try {
        // Kita ambil id, nama, username, role. Password jangan dikirim demi keamanan.
        const [rows] = await db.query('SELECT id, nama_lengkap, username, role, kelas, jurusan FROM users WHERE role = "siswa"');
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Search & Filter Siswa (berdasarkan nama, kelas, jurusan)
app.get('/search-students', async (req, res) => {
    const { q, kelas, jurusan } = req.query;
    try {
        let query = 'SELECT id, nama_lengkap, username, role, kelas, jurusan FROM users WHERE role = "siswa"';
        const params = [];

        // Filter berdasarkan nama/username
        if (q && q.trim() !== '') {
            query += ' AND (nama_lengkap LIKE ? OR username LIKE ?)';
            const searchTerm = `%${q}%`;
            params.push(searchTerm, searchTerm);
        }

        // Filter berdasarkan kelas
        if (kelas && kelas.trim() !== '') {
            query += ' AND kelas = ?';
            params.push(kelas);
        }

        // Filter berdasarkan jurusan
        if (jurusan && jurusan.trim() !== '') {
            query += ' AND jurusan = ?';
            params.push(jurusan);
        }

        query += ' ORDER BY nama_lengkap ASC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Search students error:', err);
        res.status(500).json({ message: 'Error searching students', error: err.message });
    }
});

// Ambil daftar kelas (untuk filter dropdown)
app.get('/students/get-kelas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT kelas FROM users WHERE role = "siswa" AND kelas IS NOT NULL ORDER BY kelas ASC');
        const kelas = rows.map(r => r.kelas);
        res.json(kelas);
    } catch (err) {
        console.error('Get kelas error:', err);
        res.status(500).json({ message: 'Error fetching kelas', error: err.message });
    }
});

// Ambil daftar jurusan (untuk filter dropdown)
app.get('/students/get-jurusan', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT jurusan FROM users WHERE role = "siswa" AND jurusan IS NOT NULL ORDER BY jurusan ASC');
        const jurusan = rows.map(r => r.jurusan);
        res.json(jurusan);
    } catch (err) {
        console.error('Get jurusan error:', err);
        res.status(500).json({ message: 'Error fetching jurusan', error: err.message });
    }
});

// Tambah Siswa Baru (Register oleh Admin)
app.post('/students', async (req, res) => {
    const { nama_lengkap, username, password } = req.body;
    try {
        // Role otomatis di-set jadi 'siswa'
        await db.query('INSERT INTO users (nama_lengkap, username, password, role) VALUES (?, ?, ?, "siswa")', 
            [nama_lengkap, username, password]);
        res.json({ message: "Siswa berhasil ditambahkan" });
    } catch (err) { res.status(500).json(err); }
});

// Hapus Siswa
app.delete('/students/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: "Siswa dihapus" });
    } catch (err) { res.status(500).json(err); }
});

// Ambil Buku yang Dipinjam oleh User Tertentu
app.get('/my-borrowed-books/:userId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT t.id, b.id as book_id, b.judul, b.penulis, t.tanggal_pinjam, t.status FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.user_id = ? AND t.status = "dipinjam" ORDER BY t.tanggal_pinjam DESC',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// --- 6. PROFILE USER ---
// Get User Profile
app.get('/profile/:userId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, nama_lengkap, username, role, foto_profil, bio, kelas, jurusan FROM users WHERE id = ?',
            [req.params.userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json(err);
    }
});

// Update User Profile
app.put('/profile/:userId', async (req, res) => {
    const { nama_lengkap, bio, kelas, jurusan, foto_profil } = req.body;
    try {
        // Username tidak bisa diubah, jadi kita cek field yang dikirim
        const [user] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.userId]);
        if (user.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        // Jika role adalah siswa, update dengan kelas dan jurusan
        // Jika role adalah admin, tidak perlu kelas dan jurusan
        if (user[0].role === 'siswa') {
            await db.query(
                'UPDATE users SET nama_lengkap=?, bio=?, kelas=?, jurusan=?, foto_profil=? WHERE id=?',
                [nama_lengkap || null, bio || null, kelas || null, jurusan || null, foto_profil || null, req.params.userId]
            );
        } else {
            // Admin tidak perlu kelas dan jurusan
            await db.query(
                'UPDATE users SET nama_lengkap=?, bio=?, foto_profil=? WHERE id=?',
                [nama_lengkap || null, bio || null, foto_profil || null, req.params.userId]
            );
        }
        
        res.json({ message: "Profil berhasil diupdate" });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json(err);
    }
});

// --- 5. REGISTER SISWA (Public) ---
app.post('/register', async (req, res) => {
    const { nama_lengkap, username, password } = req.body;
    try {
        // Cek dulu apakah username sudah ada
        const [cek] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (cek.length > 0) return res.status(400).json({ message: "Username sudah dipakai!" });

        // Kalau aman, masukkan ke database dengan role 'siswa'
        await db.query('INSERT INTO users (nama_lengkap, username, password, role) VALUES (?, ?, ?, "siswa")', 
            [nama_lengkap, username, password]);
        
        res.json({ message: "Registrasi Berhasil! Silakan Login." });
    } catch (err) { res.status(500).json(err); }
});

app.listen(5000, () => console.log('Server running on port 5000'));