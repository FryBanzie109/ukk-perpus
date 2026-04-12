/**
 * Backend Utility Functions
 * - Input validation
 * - Error handling
 * - Response formatting
 * - Database helpers
 */

// ===== INPUT VALIDATION =====
const validators = {
    // Validate book data
    validateBook: (book) => {
        const errors = [];
        
        if (!book.judul || !book.judul.trim()) {
            errors.push('Judul buku harus diisi');
        } else if (book.judul.trim().length < 3) {
            errors.push('Judul buku minimal 3 karakter');
        }

        if (!book.penulis || !book.penulis.trim()) {
            errors.push('Penulis harus diisi');
        }

        if (book.stok !== undefined) {
            const stok = parseInt(book.stok);
            if (isNaN(stok) || stok < 0) {
                errors.push('Stok harus berupa angka positif');
            }
        }

        if (book.tahun_terbit) {
            const tahun = parseInt(book.tahun_terbit);
            const currentYear = new Date().getFullYear();
            if (isNaN(tahun) || tahun < 1000 || tahun > currentYear) {
                errors.push(`Tahun terbit harus antara 1000 dan ${currentYear}`);
            }
        }

        if (book.cover_url) {
            try {
                new URL(book.cover_url);
            } catch {
                errors.push('URL cover tidak valid');
            }
        }

        return { isValid: errors.length === 0, errors };
    },

    // Validate user data
    validateUser: (user) => {
        const errors = [];

        if (!user.username || !user.username.trim()) {
            errors.push('Username harus diisi');
        } else if (user.username.trim().length < 3) {
            errors.push('Username minimal 3 karakter');
        } else if (!/^[a-zA-Z0-9_.-]+$/.test(user.username)) {
            errors.push('Username hanya boleh mengandung huruf, angka, underscore, titik, dan dash');
        }

        if (!user.password || user.password.length < 6) {
            errors.push('Password minimal 6 karakter');
        }

        if (!user.nama_lengkap || !user.nama_lengkap.trim()) {
            errors.push('Nama lengkap harus diisi');
        }

        if (user.role && !['admin', 'siswa'].includes(user.role)) {
            errors.push('Role harus "admin" atau "siswa"');
        }

        return { isValid: errors.length === 0, errors };
    },

    // Validate genre
    validateGenre: (genre) => {
        const errors = [];

        if (!genre.nama || !genre.nama.trim()) {
            errors.push('Nama genre harus diisi');
        } else if (genre.nama.trim().length < 3) {
            errors.push('Nama genre minimal 3 karakter');
        }

        return { isValid: errors.length === 0, errors };
    }
};

// ===== RESPONSE FORMATTING =====
const responses = {
    // Success response
    success: (data, message = 'Success', statusCode = 200) => ({
        statusCode,
        success: true,
        message,
        data
    }),

    // Error response
    error: (message = 'Error', statusCode = 500, errors = null) => ({
        statusCode,
        success: false,
        message,
        ...(errors && { errors })
    }),

    // Validation error
    validationError: (errors, message = 'Validation failed') => ({
        statusCode: 400,
        success: false,
        message,
        errors
    }),

    // Not found
    notFound: (resource = 'Resource') => ({
        statusCode: 404,
        success: false,
        message: `${resource} tidak ditemukan`
    }),

    // Unauthorized
    unauthorized: () => ({
        statusCode: 401,
        success: false,
        message: 'Anda tidak memiliki akses'
    }),

    // Forbidden
    forbidden: () => ({
        statusCode: 403,
        success: false,
        message: 'Akses ditolak'
    })
};

// ===== DATABASE HELPERS =====
const dbHelpers = {
    /**
     * Get book by ID with genre information
     */
    getBookWithGenre: async (db, bookId) => {
        const [rows] = await db.query(`
            SELECT 
                b.id, b.judul, b.penulis, b.penerbit, b.tahun_terbit, 
                b.stok, b.cover_url, b.kategori, b.genre_id,
                g.nama as genre_nama, g.deskripsi as genre_deskripsi,
                b.created_at, b.updated_at
            FROM books b
            LEFT JOIN genres g ON b.genre_id = g.id
            WHERE b.id = ?
        `, [bookId]);
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Search books with filters (title, author, genre)
     */
    searchBooks: async (db, { 
        keyword = '', 
        genre_id = null, 
        limit = 20, 
        offset = 0,
        sort = 'updated_at',
        order = 'DESC'
    }) => {
        let query = `
            SELECT 
                b.id, b.judul, b.penulis, b.penerbit, b.tahun_terbit, 
                b.stok, b.cover_url, b.kategori, b.genre_id,
                g.nama as genre_nama,
                b.created_at, b.updated_at
            FROM books b
            LEFT JOIN genres g ON b.genre_id = g.id
            WHERE 1=1
        `;
        const params = [];

        if (keyword) {
            query += ` AND (
                b.judul LIKE ? OR 
                b.penulis LIKE ? OR 
                b.penerbit LIKE ?
            )`;
            const searchTerm = `%${keyword}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (genre_id) {
            query += ` AND b.genre_id = ?`;
            params.push(genre_id);
        }

        // Whitelist sort columns to prevent SQL injection
        const allowedSort = ['judul', 'penulis', 'tahun_terbit', 'stok', 'updated_at'];
        const sortCol = allowedSort.includes(sort) ? sort : 'updated_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY b.${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [books] = await db.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM books b WHERE 1=1`;
        const countParams = [];

        if (keyword) {
            countQuery += ` AND (
                b.judul LIKE ? OR 
                b.penulis LIKE ? OR 
                b.penerbit LIKE ?
            )`;
            const searchTerm = `%${keyword}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (genre_id) {
            countQuery += ` AND b.genre_id = ?`;
            countParams.push(genre_id);
        }

        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;

        return {
            data: books,
            pagination: {
                total,
                limit,
                offset,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Check if user can borrow (validation)
     */
    canUserBorrow: async (db, userId, bookId) => {
        const errors = [];

        // Check if book exists and has stock
        const [book] = await db.query(
            'SELECT id, stok, judul FROM books WHERE id = ?',
            [bookId]
        );

        if (book.length === 0) {
            errors.push('Buku tidak ditemukan');
        } else if (book[0].stok < 1) {
            errors.push(`Buku "${book[0].judul}" tidak tersedia (stok habis)`);
        }

        // Check if user already borrowed this book (not returned yet)
        const [existing] = await db.query(
            'SELECT id FROM transactions WHERE user_id = ? AND book_id = ? AND status = "dipinjam"',
            [userId, bookId]
        );

        if (existing.length > 0) {
            errors.push('Anda sudah meminjam buku ini');
        }

        // Check if user has too many overdue books
        const [overdue] = await db.query(`
            SELECT COUNT(*) as count FROM transactions 
            WHERE user_id = ? 
            AND status = "dipinjam" 
            AND DATE_ADD(tanggal_pinjam, INTERVAL 7 DAY) < CURDATE()
        `, [userId]);

        if (overdue[0].count > 2) {
            errors.push('Anda memiliki terlalu banyak buku yang terlambat');
        }

        return { canBorrow: errors.length === 0, errors };
    },

    /**
     * Get user's active borrowed books
     */
    getUserBorrowedBooks: async (db, userId) => {
        const [rows] = await db.query(`
            SELECT 
                t.id as transaction_id,
                t.tanggal_pinjam,
                t.status,
                b.id as book_id,
                b.judul,
                b.penulis,
                b.cover_url,
                g.nama as genre_nama,
                DATEDIFF(CURDATE(), t.tanggal_pinjam) as hari_pinjam,
                CASE 
                    WHEN DATEDIFF(CURDATE(), t.tanggal_pinjam) > 7 
                    THEN (DATEDIFF(CURDATE(), t.tanggal_pinjam) - 7) * 2000 
                    ELSE 0 
                END as estimated_denda
            FROM transactions t
            JOIN books b ON t.book_id = b.id
            LEFT JOIN genres g ON b.genre_id = g.id
            WHERE t.user_id = ? AND t.status = "dipinjam"
            ORDER BY t.tanggal_pinjam DESC
        `, [userId]);

        return rows;
    }
};

// ===== PAGINATION HELPER =====
const pagination = {
    getPaginationParams: (page = 1, limit = 20) => {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset = (pageNum - 1) * limitNum;
        return { limit: limitNum, offset, page: pageNum };
    }
};

module.exports = {
    validators,
    responses,
    dbHelpers,
    pagination
};
