const db = require('./db');

async function migrateProfile() {
    try {
        console.log('Checking and adding profile columns...');
        
        const [columns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users'
        `);
        
        const columnNames = columns.map(col => col.COLUMN_NAME);
        
        // Add foto_profil if not exists
        if (!columnNames.includes('foto_profil')) {
            await db.query(`ALTER TABLE users ADD COLUMN foto_profil LONGTEXT DEFAULT NULL`);
            console.log('✅ Added foto_profil column');
        }
        
        // Add bio if not exists
        if (!columnNames.includes('bio')) {
            await db.query(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL`);
            console.log('✅ Added bio column');
        }
        
        // Add kelas if not exists (untuk siswa)
        if (!columnNames.includes('kelas')) {
            await db.query(`ALTER TABLE users ADD COLUMN kelas VARCHAR(50) DEFAULT NULL`);
            console.log('✅ Added kelas column');
        }
        
        // Add jurusan if not exists (untuk siswa)
        if (!columnNames.includes('jurusan')) {
            await db.query(`ALTER TABLE users ADD COLUMN jurusan VARCHAR(100) DEFAULT NULL`);
            console.log('✅ Added jurusan column');
        }
        
        console.log('✅ Profile migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration error:', err);
    }
}

migrateProfile().then(() => process.exit(0));
