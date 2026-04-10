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
    } catch (err) {
        console.error('❌ Migration error:', err);
    }
}

migrate().then(() => process.exit(0));
