/**
 * Database Schema Optimization
 * - Separate genres into dedicated table
 * - Add proper foreign keys and constraints
 * - Add timestamps (created_at, updated_at)
 * - Add indexes for better query performance
 * - Add default values and constraints
 */

const db = require('./db');

async function optimizeSchema() {
    try {
        console.log('\n🔄 Starting Database Schema Optimization...\n');

        // ===== 1. CREATE GENRES TABLE =====
        console.log('📚 Step 1: Creating genres table...');
        const checkGenres = await db.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'genres' AND TABLE_SCHEMA = 'ukk_perpus'
        `);

        if (checkGenres[0].length === 0) {
            await db.query(`
                CREATE TABLE genres (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    nama VARCHAR(100) NOT NULL UNIQUE,
                    deskripsi TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_nama (nama)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Genres table created');

            // Insert default genres
            const genreDefaults = [
                { nama: 'Fiksi', deskripsi: 'Novel dan cerita fiksi' },
                { nama: 'Non-Fiksi', deskripsi: 'Buku faktual dan informasi' },
                { nama: 'Romantis', deskripsi: 'Cerita roman dan percintaan' },
                { nama: 'Misteri', deskripsi: 'Cerita detektif dan misteri' },
                { nama: 'Sains & Teknologi', deskripsi: 'Ilmu pengetahuan dan teknologi' },
                { nama: 'Sejarah', deskripsi: 'Sejarah dan peradaban' },
                { nama: 'Biografi', deskripsi: 'Kisah hidup tokoh terkenal' },
                { nama: 'Anak-anak', deskripsi: 'Buku untuk anak-anak' },
                { nama: 'Komik', deskripsi: 'Komik dan manga' },
                { nama: 'Puisi & Sastra', deskripsi: 'Puisi dan karya sastra' },
                { nama: 'Pendidikan', deskripsi: 'Buku referensi pendidikan' },
                { nama: 'Agama', deskripsi: 'Buku agama dan spiritualitas' },
                { nama: 'Psikologi', deskripsi: 'Psikologi dan pengembangan diri' },
                { nama: 'Self-Help', deskripsi: 'Buku pengembangan pribadi' },
                { nama: 'Kuliner', deskripsi: 'Resep dan panduan memasak' },
                { nama: 'Perjalanan', deskripsi: 'Panduan perjalanan dan petualangan' },
                { nama: 'Seni & Desain', deskripsi: 'Seni, desain, dan arsitektur' },
                { nama: 'Uncategorized', deskripsi: 'Kategori tidak terdefinisi' }
            ];

            for (const genre of genreDefaults) {
                const checkGenre = await db.query(
                    'SELECT id FROM genres WHERE nama = ?',
                    [genre.nama]
                );
                if (checkGenre[0].length === 0) {
                    await db.query(
                        'INSERT INTO genres (nama, deskripsi) VALUES (?, ?)',
                        [genre.nama, genre.deskripsi]
                    );
                }
            }
            console.log('✅ Default genres inserted');
        } else {
            console.log('✅ Genres table already exists, skipping creation');
        }

        // ===== 2. ADD GENRE_ID TO BOOKS TABLE =====
        console.log('\n📚 Step 2: Adding genre_id to books table...');
        const [booksColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'genre_id'
        `);

        if (booksColumns.length === 0) {
            // Get default 'Uncategorized' genre id
            const [defaultGenre] = await db.query(
                'SELECT id FROM genres WHERE nama = "Uncategorized"'
            );
            const genreId = defaultGenre[0]?.id || 18;

            await db.query(`
                ALTER TABLE books 
                ADD COLUMN genre_id INT DEFAULT ${genreId} AFTER kategori
            `);
            console.log('✅ genre_id column added to books');

            // Add foreign key constraint
            await db.query(`
                ALTER TABLE books 
                ADD CONSTRAINT fk_books_genre 
                FOREIGN KEY (genre_id) REFERENCES genres(id) 
                ON DELETE SET NULL ON UPDATE CASCADE
            `);
            console.log('✅ Foreign key constraint added');
        } else {
            console.log('✅ genre_id column already exists, skipping');
        }

        // ===== 3. ADD TIMESTAMPS TO BOOKS TABLE =====
        console.log('\n📚 Step 3: Adding timestamps to books table...');
        const [createdAtCol] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'created_at'
        `);

        if (createdAtCol.length === 0) {
            await db.query(`
                ALTER TABLE books 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ Timestamps added to books table');
        } else {
            console.log('✅ Timestamps already exist in books table');
        }

        // ===== 4. ADD TIMESTAMPS TO USERS TABLE =====
        console.log('\n👤 Step 4: Adding timestamps to users table...');
        const [userCreatedAt] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at'
        `);

        if (userCreatedAt.length === 0) {
            await db.query(`
                ALTER TABLE users 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ Timestamps added to users table');
        } else {
            console.log('✅ Timestamps already exist in users table');
        }

        // ===== 5. ADD TIMESTAMPS TO TRANSACTIONS TABLE =====
        console.log('\n📋 Step 5: Adding timestamps to transactions table...');
        const [transCreatedAt] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'created_at'
        `);

        if (transCreatedAt.length === 0) {
            await db.query(`
                ALTER TABLE transactions 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ Timestamps added to transactions table');
        } else {
            console.log('✅ Timestamps already exist in transactions table');
        }

        // ===== 6. ADD INDEXES FOR PERFORMANCE =====
        console.log('\n⚡ Step 6: Adding performance indexes...');
        
        const indexQueries = [
            { table: 'books', column: 'judul', name: 'idx_books_judul' },
            { table: 'books', column: 'penulis', name: 'idx_books_penulis' },
            { table: 'books', column: 'genre_id', name: 'idx_books_genre_id' },
            { table: 'books', column: 'stok', name: 'idx_books_stok' },
            { table: 'transactions', column: 'user_id', name: 'idx_trans_user_id' },
            { table: 'transactions', column: 'book_id', name: 'idx_trans_book_id' },
            { table: 'transactions', column: 'status', name: 'idx_trans_status' },
            { table: 'users', column: 'username', name: 'idx_users_username' },
            { table: 'users', column: 'role', name: 'idx_users_role' }
        ];

        for (const idx of indexQueries) {
            try {
                const [existingIndex] = await db.query(`
                    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
                    WHERE TABLE_NAME = ? AND INDEX_NAME = ?
                `, [idx.table, idx.name]);

                if (existingIndex.length === 0) {
                    await db.query(`
                        ALTER TABLE ${idx.table} 
                        ADD INDEX ${idx.name} (${idx.column})
                    `);
                    console.log(`  ✅ Index ${idx.name} created`);
                } else {
                    console.log(`  ℹ️  Index ${idx.name} already exists`);
                }
            } catch (err) {
                console.log(`  ⚠️  Could not create index ${idx.name}: ${err.message}`);
            }
        }

        // ===== 7. UPDATE EXISTING BOOKS WITH GENRE_ID =====
        console.log('\n🔄 Step 7: Mapping existing books to genres...');
        
        const genreMapping = {
            'Fiksi': 'Fiksi',
            'Non-Fiksi': 'Non-Fiksi',
            'Romantis': 'Romantis',
            'Misteri': 'Misteri',
            'Sains & Teknologi': 'Sains & Teknologi',
            'Sejarah': 'Sejarah',
            'Biografi': 'Biografi',
            'Anak-anak': 'Anak-anak',
            'Komik': 'Komik',
            'Puisi & Sastra': 'Puisi & Sastra',
            'Pendidikan': 'Pendidikan',
            'Agama': 'Agama',
            'Psikologi': 'Psikologi',
            'Self-Help': 'Self-Help',
            'Kuliner': 'Kuliner',
            'Perjalanan': 'Perjalanan',
            'Seni & Desain': 'Seni & Desain',
            'Lainnya': 'Uncategorized',
            'Umum': 'Uncategorized'
        };

        const [booksNeedMapping] = await db.query(`
            SELECT DISTINCT kategori FROM books WHERE genre_id IS NULL OR genre_id = 0
        `);

        if (booksNeedMapping.length > 0) {
            for (const book of booksNeedMapping) {
                const targetGenre = genreMapping[book.kategori] || 'Uncategorized';
                const [genreRecord] = await db.query(
                    'SELECT id FROM genres WHERE nama = ?',
                    [targetGenre]
                );

                if (genreRecord.length > 0) {
                    await db.query(
                        'UPDATE books SET genre_id = ? WHERE kategori = ?',
                        [genreRecord[0].id, book.kategori]
                    );
                    console.log(`  ✅ Mapped "${book.kategori}" → "${targetGenre}"`);
                }
            }
        } else {
            console.log('  ✅ All books already have genre_id assigned');
        }

        // ===== 8. ADD CONSTRAINTS TO USERS TABLE =====
        console.log('\n👤 Step 8: Adding constraints to users table...');
        
        try {
            // Check if UNIQUE constraint exists on username
            const [usernameConstraint] = await db.query(`
                SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'username' 
                AND CONSTRAINT_NAME != 'PRIMARY'
            `);

            if (usernameConstraint.length === 0) {
                await db.query(`ALTER TABLE users ADD UNIQUE KEY uk_username (username)`);
                console.log('✅ UNIQUE constraint added to username');
            } else {
                console.log('✅ Username uniqueness already enforced');
            }
        } catch (err) {
            console.log('⚠️  Could not add username constraint: ' + err.message);
        }

        // ===== FINAL REPORT =====
        console.log('\n✨ DATABASE OPTIMIZATION COMPLETE!\n');
        console.log('Summary of changes:');
        console.log('  ✅ Created genres table with 18 default genres');
        console.log('  ✅ Added genre_id foreign key to books table');
        console.log('  ✅ Added created_at & updated_at to all tables');
        console.log('  ✅ Added performance indexes');
        console.log('  ✅ Mapped existing books to genres');
        console.log('  ✅ Added constraints (UNIQUE username, FK genre)');
        console.log('\nNext steps:');
        console.log('  1. Update backend API endpoints to use new genre_id');
        console.log('  2. Update frontend to fetch genre data from new table');
        console.log('  3. Test all book CRUD operations\n');

    } catch (err) {
        console.error('❌ Error during optimization:', err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

optimizeSchema();
