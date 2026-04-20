const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const https = require('https');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validators, responses, dbHelpers, pagination } = require('./utils');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Middleware untuk error handling global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json(responses.error('Internal Server Error', 500));
});

// --- 1. LOGIN (Admin & Siswa) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Username atau Password salah" });
        }
        
        const user = rows[0];
        // Check both bcrypt hashed and plain text passwords for migration support
        let passwordMatch = false;
        
        // Try bcrypt comparison first
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
        } catch (err) {
            // If bcrypt fails, try plain text comparison (for migration)
            passwordMatch = user.password === password;
        }
        
        if (passwordMatch) {
            // Don't send password back to frontend for security
            const { password, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword });
        } else {
            res.status(401).json({ success: false, message: "Username atau Password salah" });
        }
    } catch (err) { 
        console.error('Login error:', err);
        res.status(500).json({ message: "Error during login", error: err.message }); 
    }
});

// OPEN LIBRARY INTEGRATION
// Search Buku dari Open Library API (tanpa kategori dan genre)
app.get('/books/search-openlib', async (req, res) => {
    const { q } = req.query;
    let responseSent = false; // Flag untuk prevent multiple responses
    
    try {
        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=20`;
        
        const request = https.get(searchUrl, { timeout: 10000 }, (response) => {
            // Check HTTP status code
            if (response.statusCode !== 200) {
                if (responseSent) return;
                responseSent = true;
                console.error(`❌ Open Library API returned status ${response.statusCode}`);
                return res.status(500).json({ 
                    message: `Open Library API error (${response.statusCode})`,
                    error: `HTTP ${response.statusCode}`
                });
            }

            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                if (responseSent) return;
                
                try {
                    const jsonData = JSON.parse(data);
                    
                    // Check if docs array exists
                    if (!jsonData.docs || !Array.isArray(jsonData.docs)) {
                        console.warn('⚠️ No docs in Open Library response');
                        responseSent = true;
                        return res.json([]);
                    }
                    
                    const books = jsonData.docs.map(doc => {
                        // Generate cover URL with multiple fallback options
                        let cover_url = null;
                        
                        if (doc.cover_i) {
                            cover_url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
                        } else if (doc.isbn && doc.isbn[0]) {
                            cover_url = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
                        } else if (doc.key) {
                            const olid = doc.key.split('/').pop();
                            cover_url = `https://covers.openlibrary.org/b/olid/${olid}-M.jpg`;
                        }
                        
                        return {
                            title: doc.title,
                            author: doc.author_name ? doc.author_name[0] : 'Unknown',
                            publisher: doc.publisher ? doc.publisher[0] : '-',
                            year: doc.first_publish_year || '-',
                            isbn: doc.isbn ? doc.isbn[0] : '-',
                            key: doc.key,
                            cover_i: doc.cover_i,
                            cover_url: cover_url,
                            openLibData: doc
                        };
                    });
                    
                    responseSent = true;
                    res.json(books);
                    console.log(`✅ Search for "${q}" found ${books.length} results from Open Library`);
                } catch (parseErr) {
                    if (responseSent) return;
                    responseSent = true;
                    console.error('❌ Parse error:', parseErr);
                    res.status(500).json({ message: 'Error parsing Open Library response', error: parseErr.message });
                }
            });

            response.on('error', (err) => {
                if (responseSent) return;
                responseSent = true;
                console.error('❌ Response stream error:', err);
                res.status(500).json({ message: 'Error reading Open Library response', error: err.message });
            });
        });

        // Handle request timeout
        request.on('timeout', () => {
            if (responseSent) return;
            responseSent = true;
            console.error('❌ Open Library request timeout');
            request.destroy();
            res.status(500).json({ message: 'Open Library search timeout', error: 'Request took too long' });
        });

        // Handle request error
        request.on('error', (err) => {
            if (responseSent) return;
            responseSent = true;
            console.error('❌ Open Library request error:', err);
            res.status(500).json({ message: 'Error searching Open Library', error: err.message });
        });
    } catch (err) {
        if (responseSent) return;
        responseSent = true;
        console.error('❌ Search error:', err);
        res.status(500).json({ message: 'Error searching Open Library', error: err.message });
    }
});

// --- 2. MANAJEMEN BUKU (CRUD) ---
// Get Semua Buku
app.get('/books', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM books ORDER BY judul ASC');
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

// Search & Filter Buku
app.get('/search-books', async (req, res) => {
    const { q, kategori, tahun_terbit, stok_status } = req.query;
    try {
        let query = 'SELECT * FROM books WHERE 1=1';
        const params = [];

        // Filter berdasarkan search query (judul, penulis, penerbit)
        if (q && q.trim() !== '') {
            query += ' AND (judul LIKE ? OR penulis LIKE ? OR penerbit LIKE ?)';
            const searchTerm = `%${q}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Filter berdasarkan kategori
        if (kategori && kategori.trim() !== '' && kategori !== 'semua') {
            query += ' AND kategori = ?';
            params.push(kategori);
        }

        // Filter berdasarkan tahun terbit
        if (tahun_terbit && tahun_terbit.trim() !== '' && tahun_terbit !== 'semua') {
            query += ' AND tahun_terbit = ?';
            params.push(tahun_terbit);
        }

        // Filter berdasarkan stok status
        if (stok_status && stok_status.trim() !== '' && stok_status !== 'semua') {
            if (stok_status === 'tersedia') {
                query += ' AND stok > 0';
            } else if (stok_status === 'tidak_tersedia') {
                query += ' AND stok <= 0';
            }
        }

        query += ' ORDER BY judul ASC';

        const [rows] = await db.query(query, params);
        console.log(`Search for "${q}" | kategori: "${kategori}" | tahun: "${tahun_terbit}" | stok: "${stok_status}" found ${rows.length} results`);
        res.json(rows);
    } catch (err) { 
        console.error('Search error:', err);
        res.status(500).json({ message: 'Error searching books', error: err.message }); 
    }
});

// Tambah Buku (Admin)
app.post('/books', async (req, res) => {
    const { judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url, isbn } = req.body;
    try {
        await db.query('INSERT INTO books (judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url, isbn) VALUES (?,?,?,?,?,?,?,?)', 
            [judul, penulis, penerbit, kategori || 'Fiksi', tahun_terbit, stok, cover_url || null, isbn || null]);
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
    const { judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url, isbn } = req.body;
    try {
        // If stok is not provided or is null, preserve existing stok value
        let stokValue = stok;
        if (stokValue === null || stokValue === undefined) {
            console.log(`⚠️ Stok not provided in update request. Will preserve existing value.`);
            const [existing] = await db.query('SELECT stok FROM books WHERE id = ?', [req.params.id]);
            if (existing.length > 0) {
                stokValue = existing[0].stok;
                console.log(`📚 Preserved existing stok: ${stokValue}`);
            } else {
                stokValue = 0; // Default to 0 if book not found (shouldn't happen)
            }
        }

        await db.query('UPDATE books SET judul=?, penulis=?, penerbit=?, kategori=?, tahun_terbit=?, stok=?, cover_url=?, isbn=? WHERE id=?', 
            [judul, penulis, penerbit, kategori || 'Fiksi', tahun_terbit, stokValue, cover_url || null, isbn || null, req.params.id]);
        res.json({ message: "Buku diupdate" });
    } catch (err) { res.status(500).json(err); }
});

// Update Stok Buku (Tambah/Kurangi)
app.put('/books/:id/update-stok', async (req, res) => {
    const { jumlah, tipe } = req.body; // tipe: 'tambah', 'kurangi', atau 'set'
    try {
        console.log(`📦 Update stok request: id=${req.params.id}, jumlah=${jumlah}, tipe=${tipe}`);
        
        // Validate tipe first
        if (tipe !== 'tambah' && tipe !== 'kurangi' && tipe !== 'set') {
            console.log('❌ Invalid tipe:', tipe);
            return res.status(400).json({ message: "Tipe harus 'tambah', 'kurangi', atau 'set'" });
        }

        // Parse and validate jumlah - min value depends on tipe
        const parsedJumlah = parseInt(jumlah);
        const minValue = tipe === 'set' ? 0 : 1;
        console.log(`🔢 Parsed jumlah: ${parsedJumlah}, tipe: ${tipe}, minValue: ${minValue}`);
        
        if (!jumlah || isNaN(parsedJumlah) || parsedJumlah < minValue) {
            console.log(`❌ Validation failed for jumlah: ${jumlah}`);
            const msg = tipe === 'set' 
                ? "Stok awal harus berupa angka (0 atau lebih)" 
                : "Jumlah harus berupa angka positif (minimal 1)";
            return res.status(400).json({ message: msg });
        }

        // Get current stock - fetch full book data to debug
        const [book] = await db.query('SELECT id, judul, stok FROM books WHERE id = ?', [req.params.id]);
        console.log(`🔍 Database query result for id ${req.params.id}:`, JSON.stringify(book), `rows: ${book?.length || 0}`);
        
        if (!book || book.length === 0) {
            console.log('❌ Book not found with id:', req.params.id);
            return res.status(404).json({ message: "Buku tidak ditemukan" });
        }

        const currentStok = book[0].stok;
        console.log(`📊 Book found: "${book[0].judul}", stok value: ${currentStok}, type: ${typeof currentStok}`);
        
        // Check if stok is null/undefined
        const isStokNull = currentStok === null || currentStok === undefined;
        console.log(`📌 isStokNull: ${isStokNull}, tipe: ${tipe}`);
        
        // Handle null/undefined stok - only allow if tipe is 'set' (initialization)
        if (isStokNull && tipe !== 'set') {
            console.log('⚠️ ERROR: Book stok is null/undefined and tipe is not "set"!');
            return res.status(400).json({ 
                message: "Stok buku belum diinisialisasi. Gunakan 'Atur Stok Awal' terlebih dahulu.",
                error: "stok_is_null"
            });
        }
        
        // Parse current stok - use 0 if null/undefined (for initialization)
        const stokAsNumber = currentStok === null || currentStok === undefined ? 0 : parseInt(currentStok);
        if (isNaN(stokAsNumber)) {
            console.log('❌ Current stok is not a valid number:', currentStok);
            return res.status(400).json({ 
                message: "Error: Stok buku tidak berupa angka yang valid",
                error: "stok_not_number"
            });
        }
        
        let newStok = stokAsNumber;

        
        if (tipe === 'set') {
            newStok = parsedJumlah;
            console.log(`📝 Set: stok diatur dari ${stokAsNumber} menjadi ${newStok}`);
        } else if (tipe === 'tambah') {
            newStok = stokAsNumber + parsedJumlah;
            console.log(`➕ Tambah: ${stokAsNumber} + ${parsedJumlah} = ${newStok}`);
        } else if (tipe === 'kurangi') {
            if (stokAsNumber < parsedJumlah) {
                console.log(`❌ Stok tidak cukup: ${stokAsNumber} < ${parsedJumlah}`);
                return res.status(400).json({ message: `Stok tidak cukup. Stok saat ini: ${stokAsNumber}` });
            }
            newStok = stokAsNumber - parsedJumlah;
            console.log(`➖ Kurangi: ${stokAsNumber} - ${parsedJumlah} = ${newStok}`);
        }

        // Update database
        const updateResult = await db.query('UPDATE books SET stok = ? WHERE id = ?', [newStok, req.params.id]);
        console.log(`✅ Database updated: new stok = ${newStok}`);
        
        res.json({ 
            message: tipe === 'set' 
                ? `Stok awal berhasil diatur menjadi ${parsedJumlah}`
                : `Stok berhasil di${tipe} sebesar ${parsedJumlah}`,
            stok_lama: stokAsNumber,
            stok_baru: newStok,
            perubahan: tipe === 'tambah' ? `+${parsedJumlah}` : `-${parsedJumlah}`
        });
    } catch (err) {
        console.error('❌ Update stok error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Import Buku dari Open Library ke Database
app.post('/books/import-openlib', async (req, res) => {
    const { title, author, publisher, year, cover_url, isbn, openLibData } = req.body;
    try {
        // Validasi input
        if (!title || !author) {
            return res.status(400).json({ message: 'Judul dan Penulis harus diisi' });
        }

        // Cek apakah buku sudah ada
        const [existing] = await db.query('SELECT id FROM books WHERE judul = ? AND penulis = ?', [title, author]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Buku sudah ada di database' });
        }

        // Insert buku tanpa kategori (NULL untuk Open Library books)
        const insertResult = await db.query(
            'INSERT INTO books (judul, penulis, penerbit, tahun_terbit, stok, cover_url, kategori, isbn) VALUES (?,?,?,?,?,?,NULL,?)',
            [title, author, publisher || null, year || null, 1, cover_url || null, isbn || null]
        );

        console.log('✅ Book imported successfully');
        res.json({ 
            message: 'Buku berhasil diimport dari Open Library',
            book: {
                id: insertResult[0].insertId,
                title: title
            }
        });
    } catch (err) {
        console.error('❌ Import error:', err);
        res.status(500).json({ 
            message: 'Error importing book', 
            error: err.message
        });
    }
});

// Fetch ISBN dari Open Library untuk buku tertentu
app.post('/books/:id/fetch-isbn', async (req, res) => {
    try {
        const [book] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        
        if (book.length === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan' });
        }

        const bookData = book[0];
        
        // Jika sudah ada ISBN, kembalikan langsung
        if (bookData.isbn) {
            return res.json({ 
                message: 'ISBN sudah tersedia',
                isbn: bookData.isbn,
                fromDB: true
            });
        }

        // Cari ISBN dari Open Library berdasarkan judul dan penulis
        const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(bookData.judul)}&author=${encodeURIComponent(bookData.penulis)}&limit=5`;
        
        https.get(searchUrl, { timeout: 10000 }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', async () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData.docs && jsonData.docs.length > 0) {
                        // Cari ISBN dari hasil pencarian
                        for (const doc of jsonData.docs) {
                            if (doc.isbn && doc.isbn.length > 0) {
                                const isbn = doc.isbn[0];
                                // Update database dengan ISBN yang ditemukan
                                await db.query('UPDATE books SET isbn = ? WHERE id = ?', [isbn, req.params.id]);
                                console.log(`✅ ISBN ditemukan dan disimpan untuk buku: ${bookData.judul}`);
                                return res.json({
                                    message: 'ISBN berhasil ditemukan dan disimpan',
                                    isbn: isbn,
                                    fromOpenLibrary: true
                                });
                            }
                        }
                    }
                    
                    res.json({
                        message: 'ISBN tidak ditemukan di Open Library',
                        isbn: null,
                        fromOpenLibrary: false
                    });
                } catch (err) {
                    console.error('❌ Error parsing Open Library response:', err);
                    res.json({
                        message: 'Error mencari ISBN',
                        isbn: null,
                        error: err.message
                    });
                }
            });
        }).on('error', (err) => {
            console.error('❌ Error fetching from Open Library:', err);
            res.status(500).json({
                message: 'Error mengakses Open Library',
                error: err.message
            });
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ message: 'Error', error: err.message });
    }
});

// Fetch ISBN dari Open Library untuk semua buku yang belum punya ISBN
app.post('/books/fetch-all-isbn', async (req, res) => {
    try {
        const [booksWithoutISBN] = await db.query('SELECT id, judul, penulis FROM books WHERE isbn IS NULL OR isbn = ""');
        
        if (booksWithoutISBN.length === 0) {
            return res.json({
                message: 'Semua buku sudah memiliki ISBN',
                totalProcessed: 0,
                totalFound: 0
            });
        }

        let totalFound = 0;
        const results = [];

        // Process books one by one
        for (const book of booksWithoutISBN) {
            const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.judul)}&author=${encodeURIComponent(book.penulis)}&limit=5`;
            
            await new Promise((resolve) => {
                https.get(searchUrl, { timeout: 10000 }, (response) => {
                    let data = '';
                    
                    response.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    response.on('end', async () => {
                        try {
                            const jsonData = JSON.parse(data);
                            
                            if (jsonData.docs && jsonData.docs.length > 0) {
                                for (const doc of jsonData.docs) {
                                    if (doc.isbn && doc.isbn.length > 0) {
                                        const isbn = doc.isbn[0];
                                        await db.query('UPDATE books SET isbn = ? WHERE id = ?', [isbn, book.id]);
                                        results.push({ id: book.id, judul: book.judul, isbn: isbn, status: 'found' });
                                        totalFound++;
                                        break;
                                    }
                                }
                            }
                            
                            if (!results.find(r => r.id === book.id)) {
                                results.push({ id: book.id, judul: book.judul, isbn: null, status: 'not_found' });
                            }
                        } catch (err) {
                            console.error('❌ Error processing book:', err);
                            results.push({ id: book.id, judul: book.judul, isbn: null, status: 'error', error: err.message });
                        }
                        resolve();
                    });
                }).on('error', (err) => {
                    console.error('❌ Error fetching from Open Library:', err);
                    results.push({ id: book.id, judul: book.judul, isbn: null, status: 'error', error: err.message });
                    resolve();
                });
            });
            
            // Add small delay to avoid hammering Open Library API
            await new Promise(r => setTimeout(r, 500));
        }

        res.json({
            message: `Proses selesai. ${totalFound} dari ${booksWithoutISBN.length} buku berhasil mendapatkan ISBN`,
            totalProcessed: booksWithoutISBN.length,
            totalFound: totalFound,
            results: results
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ message: 'Error', error: err.message });
    }
});

// --- 3. TRANSAKSI (Peminjaman & Pengembalian) ---

// Improved borrow endpoint with validation
app.post('/borrow/v2', async (req, res) => {
    const { user_id, book_id } = req.body;
    const connection = await db.getConnection();

    try {
        if (!user_id || !book_id) {
            return res.status(400).json(responses.error('user_id dan book_id harus diisi', 400));
        }

        // Check if user exists
        const [user] = await db.query('SELECT id, nama_lengkap FROM users WHERE id = ?', [user_id]);
        if (user.length === 0) {
            return res.status(404).json(responses.notFound('User'));
        }

        // Check if user can borrow
        const { canBorrow, errors: borrowErrors } = await dbHelpers.canUserBorrow(db, user_id, book_id);
        if (!canBorrow) {
            return res.status(400).json(responses.error('Tidak dapat meminjam buku', 400, borrowErrors));
        }

        // Begin transaction
        await connection.beginTransaction();

        // Decrease stock
        await connection.query('UPDATE books SET stok = stok - 1 WHERE id = ?', [book_id]);

        // Create transaction record
        const [result] = await connection.query(
            'INSERT INTO transactions (user_id, book_id, tanggal_pinjam, status) VALUES (?, ?, CURDATE(), "dipinjam")',
            [user_id, book_id]
        );

        await connection.commit();

        // Get book details
        const book = await dbHelpers.getBookWithGenre(db, book_id);

        res.status(201).json(responses.success({
            transaction_id: result.insertId,
            book_id,
            user_name: user[0].nama_lengkap,
            book_title: book.judul,
            borrow_date: new Date().toISOString().split('T')[0]
        }, 'Peminjaman berhasil', 201));

    } catch (err) {
        await connection.rollback();
        console.error('Borrow error:', err);
        res.status(500).json(responses.error('Gagal memproses peminjaman', 500));
    } finally {
        connection.release();
    }
});

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

// Kembalikan Buku dengan Denda (DEPRECATED - Gunakan /return-request + /confirm-return untuk workflow proper)
app.post('/return', async (req, res) => {
    const { transaction_id, book_id, user_id } = req.body;
    try {
        // Validasi: hanya admin yang boleh menggunakan endpoint ini
        if (user_id) {
            const [user] = await db.query('SELECT role FROM users WHERE id = ?', [user_id]);
            
            if (user.length === 0) {
                return res.status(404).json({ message: "User tidak ditemukan" });
            }
            
            if (user[0].role !== 'admin') {
                return res.status(403).json({ 
                    success: false,
                    message: "Akses ditolak. Hanya admin yang dapat mengembalikan buku langsung. Silakan gunakan /return-request untuk mengajukan permintaan." 
                });
            }
        }
        
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
        const denda_per_hari = 2000; // Rp 2000 per hari
        const denda = selisih_hari > batas_hari ? (selisih_hari - batas_hari) * denda_per_hari : 0;
        
        console.log(`[Direct Return] Transaksi ${transaction_id}: Tanggal Pinjam: ${tanggal_pinjam}, Tanggal Kembali: ${tanggal_kembali}, Selisih: ${selisih_hari} hari, Denda: Rp ${denda}`);
        
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

// --- RETURN REQUEST WORKFLOW (User Request → Admin Confirm) ---
// User mengajukan permintaan pengembalian buku
app.post('/return-request', async (req, res) => {
    const { transaction_id, book_id, user_id } = req.body;
    try {
        // Cek transaksi ada
        const [transaction] = await db.query('SELECT * FROM transactions WHERE id = ? AND user_id = ? AND status = "dipinjam"', [transaction_id, user_id]);
        
        if (transaction.length === 0) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan atau sudah dikembalikan" });
        }

        // Update status ke "diminta_kembali" (menunggu konfirmasi admin)
        await db.query('UPDATE transactions SET status = "diminta_kembali", tanggal_permintaan_kembali = CURDATE(), waktu_permintaan_kembali = CURTIME() WHERE id = ?', [transaction_id]);
        
        res.json({ 
            success: true,
            message: "Permintaan pengembalian buku dikirim. Menunggu konfirmasi dari admin.",
            transaction_id: transaction_id
        });
    } catch (err) { 
        console.error('Return request error:', err);
        res.status(500).json(err); 
    }
});

// Admin melihat semua permintaan pengembalian yang pending
app.get('/pending-returns', async (req, res) => {
    const { user_id } = req.query;
    try {
        // Validasi: hanya admin yang boleh melihat pending returns
        const [user] = await db.query('SELECT role FROM users WHERE id = ?', [user_id]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        if (user[0].role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Akses ditolak. Hanya admin yang dapat melihat daftar pengembalian buku pending." 
            });
        }
        
        const sql = `
            SELECT 
                t.id, 
                u.id as user_id,
                u.nama_lengkap, 
                u.kelas,
                b.id as book_id,
                b.judul, 
                b.penulis,
                t.tanggal_pinjam,
                t.tanggal_permintaan_kembali,
                t.waktu_permintaan_kembali,
                t.status
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE t.status = 'diminta_kembali'
            ORDER BY t.tanggal_permintaan_kembali DESC, t.waktu_permintaan_kembali DESC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) { 
        console.error('Pending returns error:', err);
        res.status(500).json(err); 
    }
});

// Admin mengkonfirmasi pengembalian buku
app.post('/confirm-return/:transactionId', async (req, res) => {
    const { transactionId } = req.params;
    const { user_id } = req.body;
    try {
        // Validasi: hanya admin yang boleh konfirmasi pengembalian
        const [user] = await db.query('SELECT role FROM users WHERE id = ?', [user_id]);
        
        if (user.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        
        if (user[0].role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: "Akses ditolak. Hanya admin yang dapat mengonfirmasi pengembalian buku." 
            });
        }
        
        // Ambil data transaksi untuk hitung denda
        const [transaction] = await db.query('SELECT * FROM transactions WHERE id = ? AND status = "diminta_kembali"', [transactionId]);
        
        if (transaction.length === 0) {
            return res.status(404).json({ message: "Permintaan pengembalian tidak ditemukan atau sudah diproses" });
        }

        const tanggal_pinjam = new Date(transaction[0].tanggal_pinjam);
        const tanggal_kembali = new Date();
        
        // Hitung selisih hari
        const selisih_hari = Math.floor((tanggal_kembali - tanggal_pinjam) / (1000 * 60 * 60 * 24));
        
        // Hitung denda jika terlambat lebih dari 7 hari
        const batas_hari = 7;
        const denda_per_hari = 2000; // Rp 2000 per hari
        const denda = selisih_hari > batas_hari ? (selisih_hari - batas_hari) * denda_per_hari : 0;
        
        console.log(`[Confirm Return] Transaksi ${transactionId}: ${selisih_hari} hari, Denda: Rp ${denda}`);
        
        // Update Transaksi dengan status "kembali", tanggal kembali, dan denda
        await db.query('UPDATE transactions SET status = "kembali", tanggal_kembali = CURDATE(), denda = ?, waktu_konfirmasi_kembali = CURTIME() WHERE id = ?', [denda, transactionId]);
        
        // Tambah Stok Buku
        await db.query('UPDATE books SET stok = stok + 1 WHERE id = ?', [transaction[0].book_id]);
        
        res.json({ 
            success: true,
            message: "Pengembalian buku dikonfirmasi",
            transaction_id: transactionId,
            selisih_hari: selisih_hari,
            denda: denda,
            keterangan: denda > 0 ? `Buku terlambat ${selisih_hari - batas_hari} hari. Denda: Rp ${denda}` : "Tepat waktu, tidak ada denda"
        });
    } catch (err) { 
        console.error('Confirm return error:', err);
        res.status(500).json(err); 
    }
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
        // Kita ambil id, nama, username, role, created_at. Password jangan dikirim demi keamanan.
        const [rows] = await db.query('SELECT id, nama_lengkap, username, role, kelas, jurusan, foto_profil, created_at FROM users WHERE role = "siswa"');
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Search & Filter Siswa (berdasarkan nama, kelas, jurusan)
app.get('/search-students', async (req, res) => {
    const { q, kelas, jurusan } = req.query;
    try {
        let query = 'SELECT id, nama_lengkap, username, role, kelas, jurusan, foto_profil, created_at FROM users WHERE role = "siswa"';
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
        // Cek dulu apakah username sudah ada
        const [cek] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (cek.length > 0) return res.status(400).json({ message: "Username sudah dipakai!" });

        // Hash password dengan bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Role otomatis di-set jadi 'siswa'
        await db.query('INSERT INTO users (nama_lengkap, username, password, role) VALUES (?, ?, ?, "siswa")', 
            [nama_lengkap, username, hashedPassword]);
        res.json({ message: "Siswa berhasil ditambahkan" });
    } catch (err) { 
        console.error('Add student error:', err);
        res.status(500).json({ message: "Error adding student", error: err.message }); 
    }
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

// Ambil Semua Riwayat Peminjaman Siswa (untuk Admin)
app.get('/student-borrowed-books/:userId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT t.id, b.id as book_id, b.judul, b.penulis, t.tanggal_pinjam, t.tanggal_kembali, t.status, t.denda, u.foto_profil FROM transactions t JOIN books b ON t.book_id = b.id JOIN users u ON t.user_id = u.id WHERE t.user_id = ? ORDER BY t.tanggal_pinjam DESC',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Ambil Riwayat Peminjaman untuk Siswa (Semua transaksi termasuk yang sudah dikembalikan)
app.get('/my-borrowing-history/:userId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT t.id, b.id as book_id, b.judul, b.penulis, b.kategori, t.tanggal_pinjam, t.tanggal_kembali, t.status, t.denda FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.user_id = ? ORDER BY t.tanggal_pinjam DESC',
            [req.params.userId]
        );
        res.json(rows);
    } catch (err) { 
        console.error('Borrowing history error:', err);
        res.status(500).json(err); 
    }
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

// --- 7. LATE FEES REPORT ---
// Get all students with late fees for printing
app.get('/late-fees', async (req, res) => {
    try {
        const sql = `
            SELECT 
                DISTINCT u.id,
                u.nama_lengkap,
                u.username,
                u.kelas,
                u.jurusan,
                SUM(CASE WHEN t.denda > 0 THEN t.denda ELSE 0 END) as total_denda,
                COUNT(CASE WHEN t.denda > 0 THEN 1 END) as jumlah_buku_terlambat,
                GROUP_CONCAT(CONCAT('- ', b.judul, ' (Rp ', FORMAT(t.denda, 0), ')') SEPARATOR '\n') as detail_buku
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE t.denda > 0 AND t.status = 'kembali'
            GROUP BY u.id, u.nama_lengkap, u.username, u.kelas, u.jurusan
            ORDER BY total_denda DESC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Late fees error:', err);
        res.status(500).json(err);
    }
});

// Get late fees for specific student
app.get('/late-fees/:studentId', async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id,
                u.nama_lengkap,
                u.username,
                u.kelas,
                u.jurusan,
                b.judul,
                b.penulis,
                t.tanggal_pinjam,
                t.tanggal_kembali,
                t.denda,
                DATEDIFF(t.tanggal_kembali, t.tanggal_pinjam) as hari_pinjam
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE u.id = ? AND t.denda > 0 AND t.status = 'kembali'
            ORDER BY t.tanggal_kembali DESC
        `;
        const [rows] = await db.query(sql, [req.params.studentId]);
        if (rows.length === 0) {
            return res.json({ message: "Tidak ada denda untuk siswa ini", data: [] });
        }
        res.json(rows);
    } catch (err) {
        console.error('Student late fees error:', err);
        res.status(500).json(err);
    }
});

// --- 8. PDF GENERATOR untuk Late Fees Report ---
// Download Laporan Denda untuk SEMUA SISWA dalam format PDF
app.get('/late-fees/download/pdf', async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        
        // Query: Ambil semua siswa dengan denda
        const sql = `
            SELECT 
                DISTINCT u.id,
                u.nama_lengkap,
                u.username,
                u.kelas,
                u.jurusan,
                SUM(CASE WHEN t.denda > 0 THEN t.denda ELSE 0 END) as total_denda,
                COUNT(CASE WHEN t.denda > 0 THEN 1 END) as jumlah_buku_terlambat,
                GROUP_CONCAT(CONCAT('- ', b.judul, ' (Rp ', FORMAT(t.denda, 0), ')') SEPARATOR '\n') as detail_buku
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE t.denda > 0 AND t.status = 'kembali'
            GROUP BY u.id, u.nama_lengkap, u.username, u.kelas, u.jurusan
            ORDER BY total_denda DESC
        `;
        
        const [lateFees] = await db.query(sql);
        
        // Create PDF Document
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        
        // Generate filename dengan tanggal
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const filename = `Laporan_Denda_Keterlambatan_${dateStr}.pdf`;
        
        // Set response headers untuk download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Pipe PDF ke response
        doc.pipe(res);
        
        // ===== HEADER PROFESIONAL =====
        doc.fontSize(24).font('Helvetica-Bold').text('LAPORAN DENDA KETERLAMBATAN BUKU', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Perpustakaan Sekolah Digital', { align: 'center' });
        doc.fontSize(10).text('Sistem Informasi Manajemen Perpustakaan', { align: 'center', margin: 0 });
        
        // Garis pemisah horizontal
        doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
        doc.moveDown(20);
        
        // Informasi tanggal cetak
        const printDate = today.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.fontSize(10).font('Helvetica').text(`Tanggal Cetak: ${printDate}`, { align: 'right' });
        doc.moveDown(15);
        
        // ===== SUMMARY SECTION =====
        if (lateFees.length > 0) {
            const totalDenda = lateFees.reduce((sum, fee) => sum + (parseInt(fee.total_denda, 10) || 0), 0);
            
            doc.fontSize(11).font('Helvetica-Bold').text('RINGKASAN:', 0, doc.y);
            doc.fontSize(10).font('Helvetica')
                .text(`Total Siswa Terdenda: ${lateFees.length} orang`, { indent: 20 })
                .text(`Total Denda Keseluruhan: Rp ${totalDenda.toLocaleString('id-ID')}`, { indent: 20 });
            
            doc.moveDown(15);
        }
        
        // ===== TABLE dengan Data Denda =====
        if (lateFees.length === 0) {
            doc.fontSize(12).text('✅ Tidak ada siswa yang memiliki denda keterlambatan buku.', { align: 'center', color: '#2d7a2d' });
        } else {
            // Tabel header
            const tableTop = doc.y;
            const col1 = 45;   // No.
            const col2 = 110;  // Nama Siswa
            const col3 = 200;  // Kelas
            const col4 = 270;  // Jurusan
            const col5 = 370;  // Total Denda
            const rowHeight = 20;
            
            // Header background
            doc.rect(40, tableTop - 5, 515, rowHeight).fill('#4CAF50');
            
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
                .text('No.', col1, tableTop + 5, { width: 50 })
                .text('Nama Siswa', col2, tableTop + 5, { width: 80 })
                .text('Kelas', col3, tableTop + 5, { width: 60 })
                .text('Jurusan', col4, tableTop + 5, { width: 90 })
                .text('Total Denda', col5, tableTop + 5, { width: 100 });
            
            doc.fillColor('#000000');
            let y = tableTop + rowHeight;
            
            // Data rows
            lateFees.forEach((fee, idx) => {
                // Alternating row colors
                if (idx % 2 === 0) {
                    doc.rect(40, y - 5, 515, rowHeight).fill('#f5f5f5');
                }
                
                doc.fontSize(9).font('Helvetica')
                    .text(`${idx + 1}`, col1, y, { width: 50 })
                    .text(fee.nama_lengkap, col2, y, { width: 80 })
                    .text(fee.kelas || '-', col3, y, { width: 60 })
                    .text(fee.jurusan || '-', col4, y, { width: 90 })
                    .text(`Rp ${(fee.total_denda || 0).toLocaleString('id-ID')}`, col5, y, { width: 100 });
                
                y += rowHeight;
                
                // Buat halaman baru jika perlu
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });
            
            doc.moveDown(10);
        }
        
        // ===== FOOTER =====
        doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
        doc.moveDown(15);
        
        doc.fontSize(8).font('Helvetica').text(
            'Laporan ini dihasilkan secara otomatis oleh Sistem Informasi Perpustakaan Digital.',
            { align: 'center', color: '#666666' }
        );
        doc.text('Untuk pertanyaan, silakan hubungi pihak Perpustakaan.', { align: 'center', color: '#666666' });
        
        // Finalize PDF file
        doc.end();
        
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
});

// Download Laporan Denda untuk SISWA TERTENTU dalam format PDF
app.get('/late-fees/download/pdf/:studentId', async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        const studentId = req.params.studentId;
        
        // Query: Ambil data siswa dan riwayat buku terlambat
        const sql = `
            SELECT 
                u.id,
                u.nama_lengkap,
                u.username,
                u.kelas,
                u.jurusan,
                b.judul,
                b.penulis,
                t.tanggal_pinjam,
                t.tanggal_kembali,
                t.denda,
                DATEDIFF(t.tanggal_kembali, t.tanggal_pinjam) as hari_pinjam
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE u.id = ? AND t.denda > 0 AND t.status = 'kembali'
            ORDER BY t.tanggal_kembali DESC
        `;
        
        const [records] = await db.query(sql, [studentId]);
        
        if (records.length === 0) {
            return res.status(404).json({ message: 'Tidak ada denda untuk siswa ini' });
        }
        
        const student = records[0];
        const totalDenda = records.reduce((sum, record) => sum + (parseInt(record.denda, 10) || 0), 0);
        
        // Create PDF Document
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        
        // Generate filename
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const filename = `Laporan_Denda_${student.nama_lengkap.replace(/\s+/g, '_')}_${dateStr}.pdf`;
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Pipe PDF ke response
        doc.pipe(res);
        
        // ===== HEADER PROFESIONAL =====
        doc.fontSize(22).font('Helvetica-Bold').text('SURAT NOTIFIKASI DENDA', { align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold').text('KETERLAMBATAN PENGEMBALIAN BUKU', { align: 'center' });
        doc.fontSize(11).font('Helvetica').text('Perpustakaan Sekolah Digital', { align: 'center' });
        
        // Garis pemisah horizontal
        doc.moveTo(40, doc.y + 10).lineTo(555, doc.y + 10).stroke();
        doc.moveDown(20);
        
        // Informasi tanggal
        const printDate = today.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.fontSize(10).font('Helvetica').text(`${printDate}`, { align: 'right' });
        doc.moveDown(20);
        
        // ===== SURAT KEPADA SISWA =====
        doc.fontSize(10).font('Helvetica');
        doc.text('Kepada Yth. :', 0, doc.y);
        doc.fontSize(11).font('Helvetica-Bold').text(student.nama_lengkap, { indent: 20 });
        doc.fontSize(10).font('Helvetica')
            .text(`Kelas: ${student.kelas || '-'} (${student.jurusan || '-'})`, { indent: 20 });
        
        doc.moveDown(20);
        
        // ===== ISI SURAT =====
        doc.fontSize(10).font('Helvetica')
            .text('Dengan hormat,', 0, doc.y)
            .moveDown(10)
            .text(`Berdasarkan data perpustakaan, kami informasikan bahwa Anda memiliki keterlambatan dalam pengembalian buku dengan rincian berikut:`, 0, doc.y);
        
        doc.moveDown(15);
        
        // ===== TABEL DETAIL BUKU TERLAMBAT =====
        const tableTop = doc.y;
        const col1 = 45;    // No.
        const col2 = 120;   // Judul Buku
        const col3 = 300;   // Tanggal Pinjam
        const col4 = 400;   // Denda
        const rowHeight = 22;
        
        // Header background
        doc.rect(40, tableTop - 5, 515, rowHeight).fill('#d32f2f');
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text('No.', col1, tableTop + 6, { width: 60 })
            .text('Judul Buku', col2, tableTop + 6, { width: 160 })
            .text('Tgl. Kembali', col3, tableTop + 6, { width: 80 })
            .text('Denda', col4, tableTop + 6, { width: 80 });
        
        doc.fillColor('#000000');
        let y = tableTop + rowHeight;
        
        // Data rows
        records.forEach((record, idx) => {
            // Alternating row colors
            if (idx % 2 === 0) {
                doc.rect(40, y - 5, 515, rowHeight).fill('#f0f0f0');
            }
            
            const tanggalKembali = new Date(record.tanggal_kembali).toLocaleDateString('id-ID');
            
            doc.fontSize(9).font('Helvetica')
                .text(`${idx + 1}`, col1, y + 5, { width: 60 })
                .text(record.judul, col2, y + 5, { width: 160 })
                .text(tanggalKembali, col3, y + 5, { width: 80 })
                .text(`Rp ${(record.denda || 0).toLocaleString('id-ID')}`, col4, y + 5, { width: 80 });
            
            y += rowHeight;
            
            // Buat halaman baru jika perlu
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });
        
        doc.moveDown(15);
        
        // ===== RINGKASAN DENDA =====
        doc.fontSize(11).font('Helvetica-Bold').text('RINGKASAN:', 0, doc.y);
        doc.fontSize(10).font('Helvetica')
            .text(`Total Buku Terlambat: ${records.length} buku`, { indent: 20 })
            .text(`Total Denda: Rp ${totalDenda.toLocaleString('id-ID')}`, { indent: 20 });
        
        doc.moveDown(15);
        
        // ===== URAIAN =====
        doc.fontSize(10).font('Helvetica')
            .text('Berdasarkan peraturan perpustakaan, denda keterlambatan adalah Rp 2.000 per hari untuk setiap buku yang melebihi batas waktu peminjaman 7 hari. Dimohon segera menyelesaikan pembayaran denda tersebut.', 0, doc.y)
            .moveDown(15)
            .text('Pembayaran dapat dilakukan ke bagian administrasi perpustakaan dengan membawa bukti ini. Setelah pembayaran selesai, silakan menunjukkan bukti pembayaran untuk dicatat dalam sistem.', 0, doc.y);
        
        doc.moveDown(20);
        
        // ===== FOOTER =====
        doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke();
        doc.moveDown(15);
        
        doc.fontSize(8).font('Helvetica').text(
            'Laporan ini dihasilkan secara otomatis oleh Sistem Informasi Perpustakaan Digital.',
            { align: 'center', color: '#666666' }
        );
        doc.text('Untuk pertanyaan, silakan hubungi bagian Perpustakaan.', { align: 'center', color: '#666666' });
        
        // Finalize PDF
        doc.end();
        
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
});

// --- 9. MEMBERSHIP CARD PDF GENERATOR ---
// Download Kartu Anggota Perpustakaan untuk Siswa
app.get('/membership-card/:studentId', async (req, res) => {
    try {
        // Get student data
        const [student] = await db.query(
            'SELECT id, nama_lengkap, username, kelas, jurusan, foto_profil, created_at FROM users WHERE id = ? AND role = "siswa"',
            [req.params.studentId]
        );
        
        if (student.length === 0) {
            return res.status(404).json({ message: "Siswa tidak ditemukan" });
        }

        const studentData = student[0];
        const doc = new PDFDocument({ margin: 0, size: [340, 215] }); // Ukuran kartu: 85.6mm x 54mm (standar ID card)
        
        // Generate filename
        const filename = `Kartu_Anggota_${studentData.nama_lengkap.replace(/\s+/g, '_')}.pdf`;
        
        // Set response headers untuk download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Pipe PDF ke response
        doc.pipe(res);
        
        // ===== BACKGROUND COLOR =====
        doc.rect(0, 0, 340, 215).fill('#1a237e');
        
        // ===== HEADER KARTU =====
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text('KARTU ANGGOTA', 20, 15, { width: 300, align: 'center' });
        
        doc.fontSize(9).font('Helvetica').fillColor('#FFD700')
            .text('PERPUSTAKAAN SEKOLAH DIGITAL', 20, 33, { width: 300, align: 'center' });
        
        // ===== GARIS PEMISAH =====
        doc.moveTo(20, 48).lineTo(320, 48).stroke('#FFFFFF');
        
        // ===== FOTO SISWA (Jika ada) =====
        let photoX = 25;
        if (studentData.foto_profil) {
            try {
                // Check if it's base64 or URL
                if (studentData.foto_profil.startsWith('data:image')) {
                    const base64Data = studentData.foto_profil.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    doc.image(buffer, photoX, 58, { width: 65, height: 85 });
                } else {
                    // Try to use as URL (if applicable)
                    // For now, skip if it's not valid base64
                }
            } catch (err) {
                console.log('⚠️ Could not load student photo:', err.message);
                // Draw placeholder if photo fails
                doc.rect(photoX, 58, 65, 85).stroke('#FFFFFF');
                doc.fontSize(8).fillColor('#FFFFFF').text('FOTO', photoX + 5, 95, { width: 55, align: 'center' });
            }
        } else {
            // Draw placeholder for no photo
            doc.rect(photoX, 58, 65, 85).stroke('#FFFFFF');
            doc.fontSize(8).fillColor('#FFFFFF').text('FOTO', photoX + 5, 95, { width: 55, align: 'center' });
        }
        
        // ===== DATA SISWA (Right side) =====
        const dataX = 100;
        const dataWidth = 230;
        
        // Nomor Identitas
        doc.fontSize(8).font('Helvetica').fillColor('#FFD700').text('No. Identitas:', dataX, 58);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text(`PKS-${String(studentData.id).padStart(5, '0')}`, dataX, 67, { width: dataWidth });
        
        // Nama Lengkap
        doc.fontSize(8).font('Helvetica').fillColor('#FFD700').text('Nama:', dataX, 88);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
            .text(studentData.nama_lengkap, dataX, 97, { width: dataWidth });
        
        // Kelas
        doc.fontSize(8).font('Helvetica').fillColor('#FFD700').text('Kelas:', dataX, 118);
        doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF')
            .text(`${studentData.kelas || '-'} - ${studentData.jurusan || '-'}`, dataX, 127, { width: dataWidth });
        
        // Nomor Induk
        doc.fontSize(8).font('Helvetica').fillColor('#FFD700').text('Username:', dataX, 142);
        doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF')
            .text(studentData.username, dataX, 151, { width: dataWidth });
        
        // Tanggal Bergabung
        const joinDate = new Date(studentData.created_at).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        doc.fontSize(8).font('Helvetica').fillColor('#FFD700').text('Bergabung:', dataX, 166);
        doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF')
            .text(joinDate, dataX, 175, { width: dataWidth });
        
        // ===== FOOTER KARTU =====
        doc.moveTo(20, 192).lineTo(320, 192).stroke('#FFD700');
        
        doc.fontSize(7).font('Helvetica').fillColor('#FFD700')
            .text('Kartu ini adalah bukti keanggotaan sah. Silakan tunjukkan saat meminjam buku.', 20, 197, { width: 300, align: 'center' });
        
        // Finalize PDF
        doc.end();
        
    } catch (err) {
        console.error('Membership card PDF generation error:', err);
        res.status(500).json({ message: 'Error generating membership card PDF', error: err.message });
    }
});

// --- 5. REGISTER SISWA (Public) ---
app.post('/register', async (req, res) => {
    const { nama_lengkap, username, password, recaptchaToken } = req.body;
    try {
        // Validate reCAPTCHA token if provided
        if (recaptchaToken) {
            try {
                // You would need to verify reCAPTCHA v3 token with Google
                // For now, we'll just log it
                console.log('reCAPTCHA token received for verification');
            } catch (err) {
                console.warn('reCAPTCHA verification failed:', err);
            }
        }
        
        // Cek dulu apakah username sudah ada
        const [cek] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (cek.length > 0) return res.status(400).json({ message: "Username sudah dipakai!" });

        // Hash password dengan bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Kalau aman, masukkan ke database dengan role 'siswa'
        const [result] = await db.query('INSERT INTO users (nama_lengkap, username, password, role) VALUES (?, ?, ?, "siswa")', 
            [nama_lengkap, username, hashedPassword]);
        
        res.json({ message: "Registrasi Berhasil! Silakan Login." });
    } catch (err) { 
        console.error('Register error:', err);
        res.status(500).json({ message: "Error during registration", error: err.message }); 
    }
});

// --- STOCK TRENDS (untuk grafik) ---
app.get('/books/trends/stock', async (req, res) => {
    try {
        // Get last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        // Count books added (masuk) by created_at
        const booksIn = {};
        const booksOut = {};
        const totalStockByDay = {};

        last7Days.forEach(day => {
            booksIn[day] = 0;
            booksOut[day] = 0;
            totalStockByDay[day] = 0;
        });

        // Get books created in last 7 days (Buku Masuk)
        for (const day of last7Days) {
            const [count] = await db.query(
                'SELECT COUNT(*) as total FROM books WHERE DATE(created_at) = ?',
                [day]
            );
            booksIn[day] = count[0].total || 0;
        }

        // Get books returned (dikembalikan) in last 7 days (Buku Keluar dari stok)
        for (const day of last7Days) {
            const [count] = await db.query(
                'SELECT COUNT(*) as total FROM transactions WHERE DATE(tanggal_kembali) = ? AND status = "kembali"',
                [day]
            );
            booksOut[day] = count[0].total || 0;
        }

        // Get total stock each day (simulated as last day stock for all days)
        const [totalStock] = await db.query('SELECT COALESCE(SUM(stok), 0) as total FROM books');
        const totalStockValue = totalStock[0].total || 0;

        last7Days.forEach(day => {
            totalStockByDay[day] = totalStockValue;
        });

        res.json({
            booksIn,
            booksOut,
            totalStockByDay,
            last7Days
        });
    } catch (err) {
        console.error('Error fetching stock trends:', err);
        res.status(500).json({ message: 'Error fetching stock trends', error: err.message });
    }
});

// --- MONTHLY STOCK TRENDS (untuk grafik bulanan) ---
app.get('/books/trends/stock/monthly', async (req, res) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // Get first and last day of current month
        const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
        
        // Generate all days of the month
        const daysOfMonth = [];
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(currentYear, currentMonth - 1, i);
            daysOfMonth.push(date.toISOString().split('T')[0]);
        }
        
        // Count books added (masuk) by created_at
        const booksIn = {};
        const booksOut = {};
        const totalStockByDay = {};
        
        daysOfMonth.forEach(day => {
            booksIn[day] = 0;
            booksOut[day] = 0;
            totalStockByDay[day] = 0;
        });
        
        // Get books created in this month (Buku Masuk)
        for (const day of daysOfMonth) {
            const [count] = await db.query(
                'SELECT COUNT(*) as total FROM books WHERE DATE(created_at) = ?',
                [day]
            );
            booksIn[day] = count[0].total || 0;
        }
        
        // Get books returned (dikembalikan) in this month (Buku Keluar dari stok)
        for (const day of daysOfMonth) {
            const [count] = await db.query(
                'SELECT COUNT(*) as total FROM transactions WHERE DATE(tanggal_kembali) = ? AND status = "kembali"',
                [day]
            );
            booksOut[day] = count[0].total || 0;
        }
        
        // Get total stock each day
        const [totalStock] = await db.query('SELECT COALESCE(SUM(stok), 0) as total FROM books');
        const totalStockValue = totalStock[0].total || 0;
        
        daysOfMonth.forEach(day => {
            totalStockByDay[day] = totalStockValue;
        });
        
        const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        
        res.json({
            booksIn,
            booksOut,
            totalStockByDay,
            daysOfMonth,
            month: monthName,
            currentYear,
            currentMonth
        });
    } catch (err) {
        console.error('Error fetching monthly stock trends:', err);
        res.status(500).json({ message: 'Error fetching monthly stock trends', error: err.message });
    }
});

// --- MONTHLY TRANSACTIONS TRENDS ---
app.get('/transactions/trends/monthly', async (req, res) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // Get first and last day of current month
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
        
        // Generate all days of the month
        const daysOfMonth = [];
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(currentYear, currentMonth - 1, i);
            daysOfMonth.push(date.toISOString().split('T')[0]);
        }
        
        // Count transactions by day
        const borrowed = {};
        const returned = {};
        
        daysOfMonth.forEach(day => {
            borrowed[day] = 0;
            returned[day] = 0;
        });
        
        // Get all transactions in this month
        const [transactions] = await db.query(
            'SELECT tanggal_pinjam, tanggal_kembali FROM transactions WHERE YEAR(tanggal_pinjam) = ? AND MONTH(tanggal_pinjam) = ?',
            [currentYear, currentMonth]
        );
        
        // Count by day
        transactions.forEach(trans => {
            if (trans.tanggal_pinjam) {
                const borrowDate = new Date(trans.tanggal_pinjam).toISOString().split('T')[0];
                if (borrowed[borrowDate] !== undefined) {
                    borrowed[borrowDate]++;
                }
            }
            if (trans.tanggal_kembali) {
                const returnDate = new Date(trans.tanggal_kembali).toISOString().split('T')[0];
                if (returned[returnDate] !== undefined) {
                    returned[returnDate]++;
                }
            }
        });
        
        const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        
        res.json({
            borrowed,
            returned,
            daysOfMonth,
            month: monthName,
            currentYear,
            currentMonth
        });
    } catch (err) {
        console.error('Error fetching monthly transaction trends:', err);
        res.status(500).json({ message: 'Error fetching monthly transaction trends', error: err.message });
    }
});

// --- MONTHLY STUDENTS TRENDS (Mock data - login/logout patterns) ---
app.get('/students/trends/monthly', async (req, res) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // Get first and last day of current month
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
        
        // Generate all days of the month
        const daysOfMonth = [];
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(currentYear, currentMonth - 1, i);
            daysOfMonth.push(date.toISOString().split('T')[0]);
        }
        
        // Get total students count
        const [students] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "siswa"');
        const totalStudents = students[0].total || 0;
        
        // Mock login/logout data based on pattern
        const login = {};
        const logout = {};
        
        daysOfMonth.forEach(day => {
            // Generate realistic patterns (weekdays more active than weekends)
            const dateObj = new Date(day);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const baseLogin = isWeekend ? 10 : 25;
            const baseLogout = isWeekend ? 8 : 20;
            
            login[day] = Math.floor(Math.random() * 15) + baseLogin;
            logout[day] = Math.floor(Math.random() * 12) + baseLogout;
        });
        
        const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        
        res.json({
            login,
            logout,
            totalStudents,
            daysOfMonth,
            month: monthName,
            currentYear,
            currentMonth
        });
    } catch (err) {
        console.error('Error fetching monthly students trends:', err);
        res.status(500).json({ message: 'Error fetching monthly students trends', error: err.message });
    }
});

// --- PDF GENERATION ---
// Generate PDF Laporan Transaksi
app.get('/generate-pdf-transaction/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Get user profile
        const [userRows] = await db.query(
            'SELECT id, nama_lengkap, username, kelas, jurusan, role FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const user = userRows[0];

        // Get all transactions for this user
        const [transactions] = await db.query(
            `SELECT t.id, b.id as book_id, b.judul, b.penulis, b.kategori, 
                    t.tanggal_pinjam, t.tanggal_kembali, t.status, t.denda 
             FROM transactions t 
             JOIN books b ON t.book_id = b.id 
             WHERE t.user_id = ? 
             ORDER BY t.tanggal_pinjam DESC`,
            [userId]
        );

        // Create PDF stream
        const doc = new PDFDocument({
            bufferPages: true,
            margin: 40
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Laporan_Transaksi_${user.nama_lengkap.replace(/\s+/g, '_')}.pdf"`);

        // Pipe to response
        doc.pipe(res);

        // Add content
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN RIWAYAT TRANSAKSI PEMINJAMAN BUKU', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Sistem Informasi Perpustakaan', { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // User Information Section
        doc.fontSize(11).font('Helvetica-Bold').text('Informasi Peminjam:', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nama: ${user.nama_lengkap}`);
        doc.text(`Username: ${user.username}`);
        doc.text(`Kelas: ${user.kelas || '-'}`);
        doc.text(`Jurusan: ${user.jurusan || '-'}`);
        doc.moveDown(0.5);

        // Report Info Section
        doc.fontSize(11).font('Helvetica-Bold').text('Informasi Laporan:', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
        doc.text(`Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')}`);
        doc.moveDown(1);

        // Transaction Summary
        const totalTransactions = transactions.length;
        const completedTransactions = transactions.filter(t => t.status === 'kembali').length;
        const ongoingTransactions = transactions.filter(t => t.status === 'dipinjam').length;
        const totalFines = transactions.reduce((sum, t) => sum + (t.denda || 0), 0);

        // Draw summary box
        const summaryY = doc.y;
        doc.rect(40, summaryY, 515, 75).stroke();
        doc.fontSize(11).font('Helvetica-Bold').text('Ringkasan:', 50, summaryY + 8);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Total Transaksi: ${totalTransactions}`, 50, summaryY + 25);
        doc.text(`Sudah Dikembalikan: ${completedTransactions}`, 50, summaryY + 40);
        doc.text(`Sedang Dipinjam: ${ongoingTransactions}`, 290, summaryY + 25);
        doc.text(`Total Denda: Rp ${totalFines.toLocaleString('id-ID')}`, 290, summaryY + 40);
        
        doc.moveDown(5);

        // Transactions Table
        if (transactions.length > 0) {
            doc.fontSize(11).font('Helvetica-Bold').text('Daftar Transaksi:', { underline: true });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const col1X = 50;
            const col2X = 90;
            const col3X = 170;
            const col4X = 250;
            const col5X = 350;
            const col6X = 430;
            const col7X = 500;
            const rowHeight = 25;

            // Table Header
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text('No', col1X, tableTop);
            doc.text('Buku', col3X, tableTop);
            doc.text('Tgl Pinjam', col4X, tableTop);
            doc.text('Tgl Kembali', col5X, tableTop);
            doc.text('Status', col6X, tableTop);
            doc.text('Denda', col7X, tableTop);

            doc.moveTo(50, tableTop + 12).lineTo(555, tableTop + 12).stroke();

            // Table Rows
            doc.font('Helvetica');
            transactions.forEach((trans, index) => {
                const yPosition = tableTop + 17 + (index * rowHeight);

                // Check if we need a new page
                if (yPosition > 700) {
                    doc.addPage({ margin: 40 });
                    doc.font('Helvetica-Bold').fontSize(8);
                    doc.text('No', col1X, 50);
                    doc.text('Buku', col3X, 50);
                    doc.text('Tgl Pinjam', col4X, 50);
                    doc.text('Tgl Kembali', col5X, 50);
                    doc.text('Status', col6X, 50);
                    doc.text('Denda', col7X, 50);
                    doc.moveTo(50, 62).lineTo(555, 62).stroke();
                    doc.font('Helvetica').fontSize(8);
                }

                const displayY = yPosition > 700 ? (yPosition % 700) + 70 : yPosition;

                doc.fontSize(7);
                doc.text(index + 1, col1X, displayY);
                doc.text(trans.judul.substring(0, 15), col3X, displayY);
                doc.text(trans.tanggal_pinjam ? new Date(trans.tanggal_pinjam).toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }) : '-', col4X, displayY);
                doc.text(trans.tanggal_kembali ? new Date(trans.tanggal_kembali).toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }) : '-', col5X, displayY);

                const statusBadge = trans.status === 'kembali' ? 'Dikembalikan' : 'Dipinjam';
                doc.text(statusBadge, col6X, displayY);
                doc.text(trans.denda ? `Rp ${trans.denda.toLocaleString('id-ID')}` : '-', col7X, displayY);
            });

            // Footer line
            doc.moveTo(50, tableTop + 17 + (transactions.length * rowHeight)).lineTo(555, tableTop + 17 + (transactions.length * rowHeight)).stroke();
        } else {
            doc.fontSize(10).font('Helvetica').text('Tidak ada riwayat transaksi.', { align: 'center' });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(9).font('Helvetica');
        doc.text('_____________________________', { align: 'center' });
        doc.text('Kepala Perpustakaan', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('gray');
        doc.text('Dokumen ini dibuat oleh sistem dan bersifat sah.', { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });

        // End the document
        doc.end();

        console.log(`✅ PDF laporan transaksi untuk user ${userId} berhasil dibuat`);
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
});

// --- GENERATE PDF CUSTOM TRANSACTIONS (Admin select transaksi) ---
app.post('/transactions/generate-pdf', async (req, res) => {
    try {
        const { transactionIds } = req.body;

        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({ message: 'Tidak ada transaksi yang dipilih' });
        }

        // Get selected transactions
        const placeholders = transactionIds.map(() => '?').join(',');
        const [transactions] = await db.query(
            `SELECT t.id, u.nama_lengkap, u.username, u.kelas, u.jurusan, b.id as book_id, b.judul, b.penulis, b.kategori, 
                    t.tanggal_pinjam, t.tanggal_kembali, t.status, t.denda 
             FROM transactions t 
             JOIN books b ON t.book_id = b.id 
             JOIN users u ON t.user_id = u.id
             WHERE t.id IN (${placeholders}) 
             ORDER BY t.tanggal_pinjam DESC`,
            transactionIds
        );

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'Tidak ada transaksi yang ditemukan' });
        }

        // Create PDF stream
        const doc = new PDFDocument({
            bufferPages: true,
            margin: 40
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Laporan_Transaksi_Riwayat_${new Date().toLocaleDateString('id-ID')}.pdf"`);

        // Pipe to response
        doc.pipe(res);

        // Add content
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN RIWAYAT TRANSAKSI PEMINJAMAN BUKU', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Sistem Informasi Perpustakaan', { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // Report Information
        doc.fontSize(11).font('Helvetica-Bold').text('Informasi Laporan:', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
        doc.text(`Total Transaksi Dipilih: ${transactions.length}`);
        doc.moveDown(1);

        // Transaction Summary
        const totalTransactions = transactions.length;
        const completedTransactions = transactions.filter(t => t.status === 'kembali').length;
        const ongoingTransactions = transactions.filter(t => t.status === 'dipinjam').length;
        const totalFines = transactions.reduce((sum, t) => sum + (t.denda || 0), 0);

        doc.fontSize(11).font('Helvetica-Bold').text('Ringkasan:', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Transaksi: ${totalTransactions}`);
        doc.text(`Sudah Dikembalikan: ${completedTransactions}`);
        doc.text(`Sedang Dipinjam: ${ongoingTransactions}`);
        doc.text(`Total Denda: Rp ${totalFines.toLocaleString('id-ID')}`);
        doc.moveDown(1.5);

        // Transactions Table
        if (transactions.length > 0) {
            doc.fontSize(11).font('Helvetica-Bold').text('Daftar Transaksi Terpilih:', { underline: true });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const col1X = 50;
            const col2X = 90;
            const col3X = 170;
            const col4X = 250;
            const col5X = 350;
            const col6X = 430;
            const col7X = 500;
            const rowHeight = 25;

            // Table Header
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text('No', col1X, tableTop);
            doc.text('Peminjam', col2X, tableTop);
            doc.text('Buku', col3X, tableTop);
            doc.text('Tgl Pinjam', col4X, tableTop);
            doc.text('Tgl Kembali', col5X, tableTop);
            doc.text('Status', col6X, tableTop);
            doc.text('Denda', col7X, tableTop);

            doc.moveTo(50, tableTop + 12).lineTo(555, tableTop + 12).stroke();

            // Table Rows
            doc.font('Helvetica');
            transactions.forEach((trans, index) => {
                const yPosition = tableTop + 17 + (index * rowHeight);

                // Check if we need a new page
                if (yPosition > 700) {
                    doc.addPage({ margin: 40 });
                    doc.font('Helvetica-Bold').fontSize(8);
                    doc.text('No', col1X, 50);
                    doc.text('Peminjam', col2X, 50);
                    doc.text('Buku', col3X, 50);
                    doc.text('Tgl Pinjam', col4X, 50);
                    doc.text('Tgl Kembali', col5X, 50);
                    doc.text('Status', col6X, 50);
                    doc.text('Denda', col7X, 50);
                    doc.moveTo(50, 62).lineTo(555, 62).stroke();
                    doc.font('Helvetica').fontSize(8);
                }

                const displayY = yPosition > 700 ? (yPosition % 700) + 70 : yPosition;

                doc.fontSize(7);
                doc.text(index + 1, col1X, displayY);
                doc.text(trans.nama_lengkap.substring(0, 15), col2X, displayY);
                doc.text(trans.judul.substring(0, 12), col3X, displayY);
                doc.text(trans.tanggal_pinjam ? new Date(trans.tanggal_pinjam).toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }) : '-', col4X, displayY);
                doc.text(trans.tanggal_kembali ? new Date(trans.tanggal_kembali).toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }) : '-', col5X, displayY);

                const statusBadge = trans.status === 'kembali' ? '📥 Dikembalikan' : '📤 Dipinjam';
                doc.text(statusBadge, col6X, displayY);
                doc.text(trans.denda ? `Rp ${trans.denda.toLocaleString('id-ID')}` : '-', col7X, displayY);
            });

            // Footer line
            doc.moveTo(50, tableTop + 17 + (transactions.length * rowHeight)).lineTo(555, tableTop + 17 + (transactions.length * rowHeight)).stroke();
        } else {
            doc.fontSize(10).font('Helvetica').text('Tidak ada transaksi terpilih.', { align: 'center' });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(9).font('Helvetica');
        doc.text('_____________________________', { align: 'center' });
        doc.text('Kepala Perpustakaan', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('gray');
        doc.text('Dokumen ini dibuat oleh sistem dan bersifat sah.', { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });

        // End the document
        doc.end();

        console.log(`✅ PDF laporan transaksi custom (${transactions.length} transaksi) berhasil dibuat`);
    } catch (err) {
        console.error('Custom PDF generation error:', err);
        res.status(500).json({ message: 'Error generating custom PDF', error: err.message });
    }
});

// --- 6. PASSWORD RESET / FORGOT PASSWORD ---

// Request Password Reset - Generate reset token
app.post('/forgot-password', async (req, res) => {
    const { username } = req.body;
    try {
        const [user] = await db.query('SELECT id, username, email FROM users WHERE username = ?', [username]);
        if (user.length === 0) {
            // Don't reveal if user exists for security
            return res.json({ message: "Jika username terdaftar, link reset password akan dikirim" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

        // Store reset token in database
        await db.query(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetTokenHash, resetTokenExpiry, user[0].id]
        );

        console.log(`✅ Reset token generated for user: ${username}`);
        // In production, send email with reset link
        // For now, return token in response (NOT SECURE for production)
        res.json({ 
            message: "Link reset password telah dikirim ke email Anda", 
            resetToken: resetToken,  // Remove this in production!
            expiresIn: '1 jam'
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: "Error processing forgot password", error: err.message });
    }
});

// Reset Password - Validate token and reset password
app.post('/reset-password', async (req, res) => {
    const { resetToken, newPassword, confirmPassword } = req.body;
    try {
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Password tidak cocok" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter" });
        }

        // Hash the token to compare
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Find user with valid token
        const [user] = await db.query(
            'SELECT id, username FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
            [resetTokenHash]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: "Link reset password tidak valid atau sudah kadaluarsa" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await db.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [hashedPassword, user[0].id]
        );

        console.log(`✅ Password reset successful for user: ${user[0].username}`);
        res.json({ message: "Password berhasil direset. Silakan login dengan password baru." });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: "Error resetting password", error: err.message });
    }
});

// Change Password - For logged-in users (requires current password)
app.put('/users/:userId/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.params.userId;

    try {
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Password baru tidak cocok" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password minimal 6 karakter" });
        }

        // Get user
        const [user] = await db.query('SELECT id, password, username FROM users WHERE id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        // Verify current password
        let currentPasswordMatch = false;
        try {
            currentPasswordMatch = await bcrypt.compare(currentPassword, user[0].password);
        } catch (err) {
            // Fallback for non-bcrypt passwords
            currentPasswordMatch = user[0].password === currentPassword;
        }

        if (!currentPasswordMatch) {
            return res.status(400).json({ message: "Password saat ini tidak benar" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        console.log(`✅ Password changed successfully for user: ${user[0].username}`);
        res.json({ message: "Password berhasil diubah" });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: "Error changing password", error: err.message });
    }
});

app.listen(5000, () => console.log('Server running on port 5000'));