const db = require('./db');

/**
 * Script untuk menambah kolom reset_token dan reset_token_expiry ke tabel users
 * Jalankan: node migrate-reset-token.js
 */

async function migrateResetToken() {
    try {
        console.log('🔄 Adding reset_token columns to users table...\n');

        // Check if columns already exist
        const [columns] = await db.query(
            "SHOW COLUMNS FROM users WHERE FIELD IN ('reset_token', 'reset_token_expiry')"
        );

        if (columns.length >= 2) {
            console.log('✅ Columns already exist, skipping migration');
            process.exit(0);
        }

        // Add reset_token column if not exists
        try {
            await db.query(`
                ALTER TABLE users 
                ADD COLUMN reset_token VARCHAR(255) NULL,
                ADD COLUMN reset_token_expiry DATETIME NULL
            `);
            console.log('✅ Columns added successfully');
        } catch (err) {
            if (err.message.includes('Duplicate column')) {
                console.log('✅ Columns already exist');
            } else {
                throw err;
            }
        }

        console.log('\n✅ Migration Complete!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrateResetToken();
