const db = require('./db');

async function migrate() {
    try {
        // Check if denda column exists, if not add it
        const [columns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'denda'
        `);
        
        if (columns.length === 0) {
            console.log('Adding denda column to transactions table...');
            await db.query(`ALTER TABLE transactions ADD COLUMN denda INT DEFAULT 0 AFTER status`);
            console.log('✅ Kolom denda berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom denda sudah ada, skipping...');
        }

        // Check if kategori column exists in books table, if not add it
        const [booksColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'kategori'
        `);
        
        if (booksColumns.length === 0) {
            console.log('Adding kategori column to books table...');
            await db.query(`ALTER TABLE books ADD COLUMN kategori VARCHAR(100) DEFAULT 'Umum' AFTER penerbit`);
            console.log('✅ Kolom kategori berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom kategori sudah ada, skipping...');
        }

        // Check if cover_url column exists in books table, if not add it
        const [coverColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'cover_url'
        `);
        
        if (coverColumns.length === 0) {
            console.log('Adding cover_url column to books table...');
            await db.query(`ALTER TABLE books ADD COLUMN cover_url VARCHAR(500) AFTER kategori`);
            console.log('✅ Kolom cover_url berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom cover_url sudah ada, skipping...');
        }

        // Check if tanggal_permintaan_kembali column exists, if not add it
        const [permintaanKembaliColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'tanggal_permintaan_kembali'
        `);
        
        if (permintaanKembaliColumns.length === 0) {
            console.log('Adding tanggal_permintaan_kembali column to transactions table...');
            await db.query(`ALTER TABLE transactions ADD COLUMN tanggal_permintaan_kembali DATE AFTER denda`);
            console.log('✅ Kolom tanggal_permintaan_kembali berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom tanggal_permintaan_kembali sudah ada, skipping...');
        }

        // Check if waktu_permintaan_kembali column exists, if not add it
        const [waktuPermintaanColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'waktu_permintaan_kembali'
        `);
        
        if (waktuPermintaanColumns.length === 0) {
            console.log('Adding waktu_permintaan_kembali column to transactions table...');
            await db.query(`ALTER TABLE transactions ADD COLUMN waktu_permintaan_kembali TIME AFTER tanggal_permintaan_kembali`);
            console.log('✅ Kolom waktu_permintaan_kembali berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom waktu_permintaan_kembali sudah ada, skipping...');
        }

        // Check if waktu_konfirmasi_kembali column exists, if not add it
        const [waktuKonfirmasiColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = 'waktu_konfirmasi_kembali'
        `);
        
        if (waktuKonfirmasiColumns.length === 0) {
            console.log('Adding waktu_konfirmasi_kembali column to transactions table...');
            await db.query(`ALTER TABLE transactions ADD COLUMN waktu_konfirmasi_kembali TIME AFTER waktu_permintaan_kembali`);
            console.log('✅ Kolom waktu_konfirmasi_kembali berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom waktu_konfirmasi_kembali sudah ada, skipping...');
        }

        // Check if created_at column exists in users table, if not add it
        const [usersCreatedAtColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at'
        `);
        
        if (usersCreatedAtColumns.length === 0) {
            console.log('Adding created_at column to users table...');
            await db.query(`ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER foto_profil`);
            console.log('✅ Kolom created_at berhasil ditambahkan ke users table!');
        } else {
            console.log('✅ Kolom created_at sudah ada di users table, skipping...');
        }

        // Check if isbn column exists in books table, if not add it
        const [isbnColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'books' AND COLUMN_NAME = 'isbn'
        `);
        
        if (isbnColumns.length === 0) {
            console.log('Adding isbn column to books table...');
            await db.query(`ALTER TABLE books ADD COLUMN isbn VARCHAR(20) AFTER cover_url`);
            console.log('✅ Kolom isbn berhasil ditambahkan!');
        } else {
            console.log('✅ Kolom isbn sudah ada, skipping...');
        }

        // Check if nomor_identitas column exists in users table, if yes drop it
        const [nomorIdentitasColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'nomor_identitas'
        `);
        
        if (nomorIdentitasColumns.length > 0) {
            console.log('Dropping nomor_identitas column from users table...');
            await db.query(`ALTER TABLE users DROP COLUMN nomor_identitas`);
            console.log('✅ Kolom nomor_identitas berhasil dihapus!');
        } else {
            console.log('✅ Kolom nomor_identitas sudah tidak ada, skipping...');
        }

    } catch (err) {
        console.error('❌ Migration error:', err);
    }
}

migrate().then(() => process.exit(0));
