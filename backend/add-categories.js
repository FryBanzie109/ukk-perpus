/**
 * Add Categories Table & Fix Genre/Kategori Distinction
 * - Kategori = Physical type (Fiksi, Non-Fiksi, Komik, Majalah, Jurnal, Biografi)
 * - Genre = Story theme (Horor, Romance, Sci-Fi, Fantasi, Misteri)
 */

const db = require('./db');

async function addCategories() {
    try {
        console.log('\n📚 Starting Categories Table Setup...\n');

        // ===== 1. CREATE CATEGORIES TABLE =====
        console.log('📦 Step 1: Creating categories table...');
        const checkCategories = await db.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'categories' AND TABLE_SCHEMA = 'ukk_perpus'
        `);

        if (checkCategories[0].length === 0) {
            await db.query(`
                CREATE TABLE categories (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    nama VARCHAR(100) NOT NULL UNIQUE,
                    deskripsi TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_nama (nama)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Categories table created');

            // Insert default categories (physical book types)
            const categoryDefaults = [
                { nama: 'Fiksi', deskripsi: 'Novel dan cerita fiksi (fiktif)' },
                { nama: 'Non-Fiksi', deskripsi: 'Buku faktual dan informasi' },
                { nama: 'Komik', deskripsi: 'Komik dan manga' },
                { nama: 'Majalah', deskripsi: 'Publikasi berkala (majalah)' },
                { nama: 'Jurnal', deskripsi: 'Jurnal dan publikasi ilmiah' },
                { nama: 'Biografi', deskripsi: 'Biografi dan otobiografi' },
                { nama: 'Puisi & Sastra', deskripsi: 'Puisi dan karya sastra' },
                { nama: 'Referensi', deskripsi: 'Buku referensi dan ensiklopedi' },
                { nama: 'Pendidikan', deskripsi: 'Buku teks dan materi pembelajaran' },
                { nama: 'Panduan & Manual', deskripsi: 'Panduan praktis dan manual' },
                { nama: 'Seni & Fotografi', deskripsi: 'Buku seni, desain, fotografi' },
                { nama: 'Lainnya', deskripsi: 'Kategori lainnya' }
            ];

            for (const category of categoryDefaults) {
                const checkCategory = await db.query(
                    'SELECT id FROM categories WHERE nama = ?',
                    [category.nama]
                );
                if (checkCategory[0].length === 0) {
                    await db.query(
                        'INSERT INTO categories (nama, deskripsi) VALUES (?, ?)',
                        [category.nama, category.deskripsi]
                    );
                }
            }
            console.log('✅ Default categories inserted');
        } else {
            console.log('✅ Categories table already exists');
        }

        // ===== 2. ADD CATEGORY_ID TO BOOKS TABLE =====
        console.log('\n📚 Step 2: Adding category_id to books table...');
        const [booksColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'category_id'
        `);

        if (booksColumns.length === 0) {
            // Get default 'Lainnya' category id
            const [defaultCategory] = await db.query(
                'SELECT id FROM categories WHERE nama = "Lainnya"'
            );
            const categoryId = defaultCategory[0]?.id || 12;

            await db.query(`
                ALTER TABLE books 
                ADD COLUMN category_id INT DEFAULT ${categoryId} AFTER kategori
            `);
            console.log('✅ category_id column added to books');

            // Add foreign key constraint
            try {
                await db.query(`
                    ALTER TABLE books 
                    ADD CONSTRAINT fk_books_category 
                    FOREIGN KEY (category_id) REFERENCES categories(id) 
                    ON DELETE SET NULL ON UPDATE CASCADE
                `);
                console.log('✅ Foreign key constraint added');
            } catch (fkErr) {
                if (fkErr.code !== 'ER_DUP_KEYNAME') {
                    console.error('FK error (might already exist):', fkErr.message);
                }
            }
        } else {
            console.log('✅ category_id column already exists');
        }

        // ===== 3. UPDATE GENRES TABLE (for story themes only) =====
        console.log('\n🎭 Step 3: Updating genres to focus on story themes...');
        const [genresCheck] = await db.query(`
            SELECT COUNT(*) as cnt FROM genres
        `);

        const genreCount = genresCheck[0]?.cnt || 0;

        if (genreCount === 0 || genreCount < 20) {
            // Clear old genres (if any)
            await db.query('TRUNCATE TABLE genres');
            console.log('✅ Cleared old genres');

            // Insert new genres (story themes)
            const genreDefaults = [
                // Fiction genres (tema cerita)
                { nama: 'Horor', deskripsi: 'Cerita seram dan menakutkan' },
                { nama: 'Romance', deskripsi: 'Cerita cinta dan percintaan' },
                { nama: 'Sci-Fi', deskripsi: 'Sains fiksi dan futuristik' },
                { nama: 'Fantasi', deskripsi: 'Dunia fantasi dan magic' },
                { nama: 'Misteri', deskripsi: 'Cerita detektif dan misteri' },
                { nama: 'Thriller', deskripsi: 'Cerita penuh tegang dan aksi' },
                { nama: 'Drama', deskripsi: 'Cerita dramatis dan emosional' },
                { nama: 'Komedi', deskripsi: 'Cerita lucu dan menghibur' },
                { nama: 'Petualangan', deskripsi: 'Cerita petualangan' },
                { nama: 'Dark Fantasy', deskripsi: 'Fantasi gelap dan seram' },
                { nama: 'Historical Fiction', deskripsi: 'Fiksi yang berlatar sejarah' },
                
                // Non-fiction genres (tema konten)
                { nama: 'Sejarah', deskripsi: 'Buku sejarah dan peradaban' },
                { nama: 'Sains & Teknologi', deskripsi: 'Ilmu pengetahuan dan teknologi' },
                { nama: 'Psikologi', deskripsi: 'Psikologi dan perilaku manusia' },
                { nama: 'Filosofi', deskripsi: 'Filsafat dan pemikiran' },
                { nama: 'Bisnis & Ekonomi', deskripsi: 'Bisnis, ekonomi, dan keuangan' },
                { nama: 'Self-Help', deskripsi: 'Pengembangan diri dan motivasi' },
                { nama: 'Kesehatan & Wellness', deskripsi: 'Kesehatan, diet, dan kebugaran' },
                { nama: 'Kuliner', deskripsi: 'Resep dan panduan memasak' },
                { nama: 'Perjalanan', deskripsi: 'Panduan dan cerita perjalanan' },
                
                // Universal genres
                { nama: 'Anak-anak', deskripsi: 'Konten untuk anak-anak' },
                { nama: 'Seni & Desain', deskripsi: 'Seni, desain, dan arsitektur' },
                { nama: 'Lainnya', deskripsi: 'Genre lainnya' }
            ];

            for (const genre of genreDefaults) {
                await db.query(
                    'INSERT INTO genres (nama, deskripsi) VALUES (?, ?)',
                    [genre.nama, genre.deskripsi]
                );
            }
            console.log('✅ New genres (story themes) inserted:', genreDefaults.length);
        } else {
            console.log('✅ Genres already properly setup');
        }

        console.log('\n✅ Categories and Genres setup complete!\n');
        console.log('📊 Schema Summary:');
        console.log('  - categories: Physical book types (Fiksi, Non-Fiksi, Komik, Majalah, etc)');
        console.log('  - genres: Story themes (Horor, Romance, Sci-Fi, Fantasi, etc)');
        console.log('  - books.category_id: FK to categories');
        console.log('  - books.genre_id: FK to genres\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

addCategories();
