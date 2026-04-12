const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const https = require('https');
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
        const [rows] = await db.query('SELECT * FROM books ORDER BY judul ASC');
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Ambil daftar kategori buku
app.get('/books/get-kategori', async (req, res) => {
    try {
        // Daftar kategori buku yang tersedia
        const kategoriList = [
            'Fiksi',
            'Non-Fiksi',
            'Romantis',
            'Misteri',
            'Sains & Teknologi',
            'Sejarah',
            'Biografi',
            'Anak-anak',
            'Komik',
            'Puisi & Sastra',
            'Pendidikan',
            'Agama',
            'Psikologi',
            'Self-Help',
            'Kuliner',
            'Perjalanan',
            'Seni & Desain',
            'Lainnya'
        ];
        res.json(kategoriList);
    } catch (err) {
        console.error('Get kategori error:', err);
        res.status(500).json({ message: 'Error fetching kategori', error: err.message });
    }
});

// Genre mapping: Map Open Library subjects to local genres
const GENRE_MAPPING = {
    // Fiction genres
    'fiction': 'Fiksi',
    'novel': 'Fiksi',
    'novels': 'Fiksi',
    'literature': 'Puisi & Sastra',
    'science fiction': 'Fiksi',
    'fantasy': 'Fiksi',
    'mystery': 'Misteri',
    'detective': 'Misteri',
    'thriller': 'Misteri',
    'romance': 'Romantis',
    'love stories': 'Romantis',
    'drama': 'Fiksi',
    'historical fiction': 'Fiksi',
    
    // Non-fiction genres
    'non-fiction': 'Non-Fiksi',
    'history': 'Sejarah',
    'historical': 'Sejarah',
    'biography': 'Biografi',
    'autobiography': 'Biografi',
    'memoir': 'Biografi',
    
    // Science & Technology
    'science': 'Sains & Teknologi',
    'technology': 'Sains & Teknologi',
    'physics': 'Sains & Teknologi',
    'chemistry': 'Sains & Teknologi',
    'mathematics': 'Sains & Teknologi',
    'biology': 'Sains & Teknologi',
    'engineering': 'Sains & Teknologi',
    'programming': 'Sains & Teknologi',
    'computer science': 'Sains & Teknologi',
    
    // Religion & Spirituality
    'religion': 'Agama',
    'spirituality': 'Agama',
    'christianity': 'Agama',
    'islam': 'Agama',
    'buddhism': 'Agama',
    'philosophy': 'Agama',
    
    // Psychology & Self-Help
    'psychology': 'Psikologi',
    'self-help': 'Self-Help',
    'self improvement': 'Self-Help',
    'health': 'Self-Help',
    'wellness': 'Self-Help',
    'personal development': 'Self-Help',
    'motivation': 'Self-Help',
    
    // Cooking & Food
    'cooking': 'Kuliner',
    'recipes': 'Kuliner',
    'food': 'Kuliner',
    
    // Travel
    'travel': 'Perjalanan',
    'adventure': 'Perjalanan',
    
    // Art & Design
    'art': 'Seni & Desain',
    'design': 'Seni & Desain',
    'architecture': 'Seni & Desain',
    'painting': 'Seni & Desain',
    
    // Poetry & Literature
    'poetry': 'Puisi & Sastra',
    'poems': 'Puisi & Sastra',
    'short stories': 'Puisi & Sastra',
    'drama': 'Puisi & Sastra',
    'plays': 'Puisi & Sastra',
    
    // Education
    'education': 'Pendidikan',
    'textbook': 'Pendidikan',
    'reference': 'Pendidikan',
    
    // Children & Comics
    'children': 'Anak-anak',
    'juvenile': 'Anak-anak',
    'comics': 'Komik',
    'comic books': 'Komik',
    'manga': 'Komik',
    'animation': 'Komik'
};

// Helper function to map Open Library subject to local genre
function mapOpenLibSubjectToGenre(subject) {
    if (!subject) return null;
    
    const lowerSubject = subject.toLowerCase().trim();
    
    // Direct match
    if (GENRE_MAPPING[lowerSubject]) {
        return GENRE_MAPPING[lowerSubject];
    }
    
    // Partial match - check if any mapping keyword is contained in the subject
    for (const [key, genre] of Object.entries(GENRE_MAPPING)) {
        if (lowerSubject.includes(key)) {
            return genre;
        }
    }
    
    return null; // No match found
}

// Helper function to get the best genre ID and NAME from Open Library data
async function getBestGenreIdFromOpenLib(doc, db) {
    let genreId = null; // Will default to 'Uncategorized' if null
    let genreName = 'Uncategorized'; // Default genre name
    let foundGenres = [];
    
    const bookTitle = doc.title || 'Unknown';
    console.log(`\n🔍 Extracting genres for: "${bookTitle}"`);
    
    // Try subject_facets first (most reliable)
    if (doc.subject_facets && Array.isArray(doc.subject_facets) && doc.subject_facets.length > 0) {
        console.log(`  📚 Found subject_facets: ${doc.subject_facets.slice(0, 3).join(', ')}`);
        for (const subject of doc.subject_facets) {
            const mappedGenre = mapOpenLibSubjectToGenre(subject);
            if (mappedGenre) {
                foundGenres.push({ original: subject, mapped: mappedGenre });
                console.log(`  ✅ Mapped "${subject}" → "${mappedGenre}"`);
            }
        }
    }
    
    // Try subject field
    if (foundGenres.length === 0 && doc.subject && Array.isArray(doc.subject) && doc.subject.length > 0) {
        console.log(`  📚 Found subjects: ${doc.subject.slice(0, 3).join(', ')}`);
        for (const subject of doc.subject) {
            const mappedGenre = mapOpenLibSubjectToGenre(subject);
            if (mappedGenre) {
                foundGenres.push({ original: subject, mapped: mappedGenre });
                console.log(`  ✅ Mapped "${subject}" → "${mappedGenre}"`);
            }
        }
    }
    
    // If we found mapped genres, use the first one
    if (foundGenres.length > 0) {
        const selectedGenre = foundGenres[0].mapped;
        genreName = selectedGenre; // Set genre name
        console.log(`  🎯 Selected genre: "${selectedGenre}"`);
        
        // Get the genre_id from database
        try {
            const [rows] = await db.query('SELECT id FROM genres WHERE nama = ?', [selectedGenre]);
            if (rows.length > 0) {
                genreId = rows[0].id;
                console.log(`  🔗 Genre ID: ${genreId}`);
            }
        } catch (err) {
            console.error(`  ⚠️ Error fetching genre ID: ${err.message}`);
        }
    } else {
        console.log(`  ⚠️ No matching genres found, will use Uncategorized`);
    }
    
    return { id: genreId, nama: genreName }; // Returns object with both ID and name
}

// Simplified function to get genre name from Open Library (for search results)
function getGenreFromOpenLib(doc) {
    let foundGenres = [];
    const bookTitle = doc.title || 'Unknown';
    
    // Try subject_facets first
    if (doc.subject_facets && Array.isArray(doc.subject_facets)) {
        for (const subject of doc.subject_facets.slice(0, 3)) {
            const mappedGenre = mapOpenLibSubjectToGenre(subject);
            if (mappedGenre && !foundGenres.includes(mappedGenre)) {
                foundGenres.push(mappedGenre);
            }
        }
    }
    
    // Try subject field
    if (foundGenres.length === 0 && doc.subject && Array.isArray(doc.subject)) {
        for (const subject of doc.subject.slice(0, 3)) {
            const mappedGenre = mapOpenLibSubjectToGenre(subject);
            if (mappedGenre && !foundGenres.includes(mappedGenre)) {
                foundGenres.push(mappedGenre);
            }
        }
    }
    
    if (foundGenres.length === 0) {
        console.log(`[Genre] "${bookTitle}" - NO GENRES FOUND`);
        return 'Uncategorized';
    }
    
    const result = foundGenres.join(', ');
    console.log(`[Genre] "${bookTitle}" - ${result}`);
    return result;
}

// ===== IMPROVED API ENDPOINTS (v2) =====

// Get all genres
app.get('/genres', async (req, res) => {
    try {
        const [genres] = await db.query(`
            SELECT id, nama, deskripsi FROM genres 
            ORDER BY nama ASC
        `);
        res.json(responses.success(genres, 'Genres retrieved successfully'));
    } catch (err) {
        console.error('Get genres error:', err);
        res.status(500).json(responses.error('Failed to retrieve genres', 500));
    }
});

// Get all books with pagination (improved)
app.get('/books/v2/all', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const { limit: pageLimit, offset } = pagination.getPaginationParams(page, limit);

        const [books] = await db.query(`
            SELECT 
                b.id, b.judul, b.penulis, b.penerbit, b.tahun_terbit, 
                b.stok, b.cover_url, b.kategori, b.genre_id,
                g.nama as genre_nama, g.deskripsi as genre_deskripsi,
                b.created_at, b.updated_at
            FROM books b
            LEFT JOIN genres g ON b.genre_id = g.id
            ORDER BY b.updated_at DESC
            LIMIT ? OFFSET ?
        `, [pageLimit, offset]);

        const [countResult] = await db.query('SELECT COUNT(*) as total FROM books');
        const total = countResult[0].total;

        res.json(responses.success({
            data: books,
            pagination: {
                total,
                page: parseInt(page),
                limit: pageLimit,
                pages: Math.ceil(total / pageLimit)
            }
        }, 'Books retrieved successfully'));
    } catch (err) {
        console.error('Get books error:', err);
        res.status(500).json(responses.error('Failed to retrieve books', 500));
    }
});

// Search books with genre filter (improved)
app.get('/books/v2/search', async (req, res) => {
    try {
        const { keyword = '', genre_id = null, page = 1, limit = 20 } = req.query;
        const { limit: pageLimit, offset } = pagination.getPaginationParams(page, limit);

        const result = await dbHelpers.searchBooks(db, {
            keyword,
            genre_id: genre_id ? parseInt(genre_id) : null,
            limit: pageLimit,
            offset
        });

        res.json(responses.success(result, 'Search completed successfully'));
    } catch (err) {
        console.error('Search books error:', err);
        res.status(500).json(responses.error('Failed to search books', 500));
    }
});

// Get single book with full details (improved)
app.get('/books/v2/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json(responses.error('Invalid book ID', 400));
        }

        const book = await dbHelpers.getBookWithGenre(db, parseInt(id));

        if (!book) {
            return res.status(404).json(responses.notFound('Book'));
        }

        res.json(responses.success(book, 'Book retrieved successfully'));
    } catch (err) {
        console.error('Get book error:', err);
        res.status(500).json(responses.error('Failed to retrieve book', 500));
    }
});

// Create book with validation (improved)
app.post('/books/v2', async (req, res) => {
    try {
        const { judul, penulis, penerbit = '', kategori = '', genre_id = null, tahun_terbit = null, stok = 1, cover_url = '' } = req.body;

        // Validate input
        const validation = validators.validateBook({ judul, penulis, stok, tahun_terbit, cover_url });
        if (!validation.isValid) {
            return res.status(400).json(responses.validationError(validation.errors));
        }

        // Get genre_id if provided genre_id is null
        let finalGenreId = genre_id;
        if (!finalGenreId) {
            // Try to find genre by kategori name for backward compatibility
            if (kategori) {
                const [genreMatch] = await db.query(
                    'SELECT id FROM genres WHERE nama = ?',
                    [kategori]
                );
                finalGenreId = genreMatch.length > 0 ? genreMatch[0].id : 18; // 18 = Uncategorized
            } else {
                finalGenreId = 18; // Default to Uncategorized
            }
        }

        // Insert book
        const [result] = await db.query(
            'INSERT INTO books (judul, penulis, penerbit, kategori, genre_id, tahun_terbit, stok, cover_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [judul, penulis, penerbit, kategori, finalGenreId, tahun_terbit, stok, cover_url]
        );

        // Get the created book
        const book = await dbHelpers.getBookWithGenre(db, result.insertId);

        res.status(201).json(responses.success(book, 'Book created successfully', 201));
    } catch (err) {
        console.error('Create book error:', err);
        res.status(500).json(responses.error('Failed to create book', 500));
    }
});

// Update book with validation (improved)
app.put('/books/v2/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, penulis, penerbit, kategori, genre_id, tahun_terbit, stok, cover_url } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json(responses.error('Invalid book ID', 400));
        }

        // Check if book exists
        const book = await dbHelpers.getBookWithGenre(db, parseInt(id));
        if (!book) {
            return res.status(404).json(responses.notFound('Book'));
        }

        // Validate input
        const updateData = {};
        if (judul) {
            const validation = validators.validateBook({ judul, penulis: book.penulis, stok: book.stok });
            if (!validation.isValid) {
                return res.status(400).json(responses.validationError(validation.errors));
            }
            updateData.judul = judul;
        }
        if (penulis) updateData.penulis = penulis;
        if (penerbit !== undefined) updateData.penerbit = penerbit;
        if (kategori !== undefined) updateData.kategori = kategori;
        if (genre_id !== undefined) updateData.genre_id = genre_id;
        if (tahun_terbit !== undefined) updateData.tahun_terbit = tahun_terbit;
        if (stok !== undefined) updateData.stok = stok;
        if (cover_url !== undefined) updateData.cover_url = cover_url;

        // Build update query
        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updateData), id];

        if (fields) {
            await db.query(`UPDATE books SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
        }

        // Get updated book
        const updatedBook = await dbHelpers.getBookWithGenre(db, parseInt(id));

        res.json(responses.success(updatedBook, 'Book updated successfully'));
    } catch (err) {
        console.error('Update book error:', err);
        res.status(500).json(responses.error('Failed to update book', 500));
    }
});

// Delete book with validation (improved)
app.delete('/books/v2/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json(responses.error('Invalid book ID', 400));
        }

        // Check if book exists
        const book = await dbHelpers.getBookWithGenre(db, parseInt(id));
        if (!book) {
            return res.status(404).json(responses.notFound('Book'));
        }

        // Check if book is currently borrowed
        const [borrowed] = await db.query(
            'SELECT COUNT(*) as count FROM transactions WHERE book_id = ? AND status = "dipinjam"',
            [id]
        );

        if (borrowed[0].count > 0) {
            return res.status(400).json(responses.error(
                'Buku tidak dapat dihapus karena masih dipinjam oleh pengguna',
                400
            ));
        }

        // Delete book
        await db.query('DELETE FROM books WHERE id = ?', [id]);

        res.json(responses.success(null, 'Book deleted successfully'));
    } catch (err) {
        console.error('Delete book error:', err);
        res.status(500).json(responses.error('Failed to delete book', 500));
    }
});

// Check if user can borrow a specific book
app.post('/books/v2/:id/check-borrow', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!id || isNaN(id) || !user_id) {
            return res.status(400).json(responses.error('Invalid parameters', 400));
        }

        const { canBorrow, errors } = await dbHelpers.canUserBorrow(db, user_id, parseInt(id));

        if (!canBorrow) {
            return res.status(400).json(responses.error('Cannot borrow book', 400, errors));
        }

        res.json(responses.success({ canBorrow: true }, 'User can borrow this book'));
    } catch (err) {
        console.error('Check borrow error:', err);
        res.status(500).json(responses.error('Failed to check borrow eligibility', 500));
    }
});

// --- OPEN LIBRARY INTEGRATION ---
// Search Buku dari Open Library API
app.get('/books/search-openlib', async (req, res) => {
    const { q } = req.query;
    try {
        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=20`;
        
        https.get(searchUrl, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    // Transform Open Library data
                    const books = jsonData.docs.map(doc => {
                        // Generate cover URL with multiple fallback options
                        let cover_url = null;
                        
                        if (doc.cover_i) {
                            // Use cover_i if available (most reliable)
                            cover_url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
                        } else if (doc.isbn && doc.isbn[0]) {
                            // Fallback to ISBN
                            cover_url = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
                        } else if (doc.key) {
                            // Last resort: use OLID key
                            const olid = doc.key.split('/').pop();
                            cover_url = `https://covers.openlibrary.org/b/olid/${olid}-M.jpg`;
                        }
                        
                        // Determine genre based on Open Library data
                        const genre = getGenreFromOpenLib(doc);
                        
                        return {
                            title: doc.title,
                            author: doc.author_name ? doc.author_name[0] : 'Unknown',
                            publisher: doc.publisher ? doc.publisher[0] : '-',
                            year: doc.first_publish_year || '-',
                            isbn: doc.isbn ? doc.isbn[0] : '-',
                            genre: genre,
                            key: doc.key,
                            cover_i: doc.cover_i,
                            cover_url: cover_url,
                            openLibData: doc  // Include full Open Library data for import
                        };
                    });
                    
                    res.json(books);
                    console.log(`✅ Search for "${q}" found ${books.length} results from Open Library`);
                    // Log first book's genre info for debugging
                    if (books.length > 0) {
                        console.log(`📚 First book genre: "${books[0].genre}"`);
                    }
                } catch (parseErr) {
                    console.error('Parse error:', parseErr);
                    res.status(500).json({ message: 'Error parsing Open Library response' });
                }
            });
        }).on('error', (err) => {
            console.error('Open Library search error:', err);
            res.status(500).json({ message: 'Error searching Open Library', error: err.message });
        });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ message: 'Error searching Open Library', error: err.message });
    }
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
    const { q, kategori } = req.query;
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
        if (kategori && kategori.trim() !== '') {
            query += ' AND kategori = ?';
            params.push(kategori);
        }

        query += ' ORDER BY judul ASC';

        const [rows] = await db.query(query, params);
        console.log(`Search for "${q}" with kategori "${kategori}" found ${rows.length} results`);
        res.json(rows);
    } catch (err) { 
        console.error('Search error:', err);
        res.status(500).json({ message: 'Error searching books', error: err.message }); 
    }
});

// Tambah Buku (Admin)
app.post('/books', async (req, res) => {
    const { judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url } = req.body;
    try {
        await db.query('INSERT INTO books (judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url) VALUES (?,?,?,?,?,?,?)', 
            [judul, penulis, penerbit, kategori || 'Fiksi', tahun_terbit, stok, cover_url || null]);
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
    const { judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url } = req.body;
    try {
        await db.query('UPDATE books SET judul=?, penulis=?, penerbit=?, kategori=?, tahun_terbit=?, stok=?, cover_url=? WHERE id=?', 
            [judul, penulis, penerbit, kategori || 'Fiksi', tahun_terbit, stok, cover_url || null, req.params.id]);
        res.json({ message: "Buku diupdate" });
    } catch (err) { res.status(500).json(err); }
});

// Update Stok Buku (Tambah/Kurangi)
app.put('/books/:id/update-stok', async (req, res) => {
    const { jumlah, tipe } = req.body; // tipe: 'tambah' atau 'kurangi'
    try {
        if (!jumlah || isNaN(jumlah) || jumlah < 1) {
            return res.status(400).json({ message: "Jumlah harus berupa angka positif" });
        }

        // Get current stock
        const [book] = await db.query('SELECT stok FROM books WHERE id = ?', [req.params.id]);
        if (book.length === 0) {
            return res.status(404).json({ message: "Buku tidak ditemukan" });
        }

        const currentStok = book[0].stok;
        let newStok = currentStok;

        if (tipe === 'tambah') {
            newStok = currentStok + parseInt(jumlah);
        } else if (tipe === 'kurangi') {
            if (currentStok < jumlah) {
                return res.status(400).json({ message: `Stok tidak cukup. Stok saat ini: ${currentStok}` });
            }
            newStok = currentStok - parseInt(jumlah);
        } else {
            return res.status(400).json({ message: "Tipe harus 'tambah' atau 'kurangi'" });
        }

        await db.query('UPDATE books SET stok = ? WHERE id = ?', [newStok, req.params.id]);
        
        res.json({ 
            message: `Stok berhasil di${tipe} sebesar ${jumlah}`,
            stok_lama: currentStok,
            stok_baru: newStok,
            perubahan: tipe === 'tambah' ? `+${jumlah}` : `-${jumlah}`
        });
    } catch (err) {
        console.error('Update stok error:', err);
        res.status(500).json(err);
    }
});

// Import Buku dari Open Library ke Database
app.post('/books/import-openlib', async (req, res) => {
    const { title, author, publisher, year, cover_url, openLibData } = req.body;
    
    console.log('\n📥 Import request received:', { title, author, publisher, year, cover_url });
    
    try {
        // Validasi input
        if (!title || !author) {
            return res.status(400).json({ message: 'Judul dan Penulis harus diisi' });
        }

        // Cek apakah buku sudah ada
        const [existing] = await db.query('SELECT id FROM books WHERE judul = ? AND penulis = ?', [title, author]);
        if (existing.length > 0) {
            console.log('⚠️ Book already exists:', title);
            return res.status(400).json({ message: 'Buku sudah ada di database' });
        }

        console.log('🔄 Determining genre...');
        
        // Get best genre_id and name from Open Library data if available
        let genreId = null;
        let genreName = 'Uncategorized';
        
        if (openLibData) {
            const genreResult = await getBestGenreIdFromOpenLib(openLibData, db);
            genreId = genreResult.id;
            genreName = genreResult.nama;
        }
        
        // If no genre found, query for Uncategorized
        if (genreId === null) {
            const [uncatGenre] = await db.query('SELECT id FROM genres WHERE nama = "Uncategorized"');
            genreId = uncatGenre[0]?.id || null;
            genreName = 'Uncategorized';
        }
        
        console.log(`🔄 Inserting book with genre: "${genreName}" (ID: ${genreId})...`);
        
        // Insert buku baru dengan cover_url, kategori, dan genre_id
        const insertResult = await db.query(
            'INSERT INTO books (judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url, genre_id) VALUES (?,?,?,?,?,?,?,?)',
            [title, author, publisher || null, genreName, year || null, 1, cover_url || null, genreId]
        );

        console.log('✅ Book imported successfully with genre:', genreName);
        res.json({ 
            message: 'Buku berhasil diimport dari Open Library',
            genreId: genreId,
            genreName: genreName,
            bookId: insertResult[0].insertId
        });
    } catch (err) {
        console.error('❌ Import error:', err);
        console.error('Error details:', {
            message: err.message,
            code: err.code,
            errno: err.errno,
            sql: err.sql
        });
        res.status(500).json({ 
            message: 'Error importing book', 
            error: err.message,
            details: err.code
        });
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
        const denda_per_hari = 2000; // Rp 2000 per hari
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
    try {
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
    try {
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
        // Kita ambil id, nama, username, role. Password jangan dikirim demi keamanan.
        const [rows] = await db.query('SELECT id, nama_lengkap, username, role, kelas, jurusan, foto_profil FROM users WHERE role = "siswa"');
        res.json(rows);
    } catch (err) { res.status(500).json(err); }
});

// Search & Filter Siswa (berdasarkan nama, kelas, jurusan)
app.get('/search-students', async (req, res) => {
    const { q, kelas, jurusan } = req.query;
    try {
        let query = 'SELECT id, nama_lengkap, username, role, kelas, jurusan, foto_profil FROM users WHERE role = "siswa"';
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