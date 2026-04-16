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

        // Check if nomor_identitas column exists in users table, if not add it
        const [nomorIdentitasColumns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'nomor_identitas'
        `);
        
        if (nomorIdentitasColumns.length === 0) {
            console.log('Adding nomor_identitas column to users table...');
            await db.query(`ALTER TABLE users ADD COLUMN nomor_identitas VARCHAR(50) UNIQUE AFTER id`);
            console.log('✅ Kolom nomor_identitas berhasil ditambahkan!');
            
            // Generate nomor_identitas untuk semua users yang sudah ada
            const [users] = await db.query('SELECT id FROM users WHERE nomor_identitas IS NULL');
            console.log(`Generating nomor_identitas for ${users.length} existing users...`);
            
            for (const user of users) {
                const nomor = `PKS-${String(user.id).padStart(5, '0')}`;
                await db.query('UPDATE users SET nomor_identitas = ? WHERE id = ?', [nomor, user.id]);
            }
            console.log('✅ Nomor identitas berhasil di-generate untuk semua user yang ada!');
        } else {
            console.log('✅ Kolom nomor_identitas sudah ada, skipping...');
        }

    } catch (err) {
        console.error('❌ Migration error:', err);
    }
}

migrate().then(() => process.exit(0));
