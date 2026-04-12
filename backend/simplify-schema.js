/**
 * Simplify Schema: Make kategori and genre NULLABLE
 * - Remove hard-coded defaults ("Lainnya")
 * - Allow NULL untuk kategori dan genre yang tidak terdeteksi
 * - Keep both columns untuk historical data, tapi jangan wajib
 */

const db = require('./db');

async function simplifySchema() {
    try {
        console.log('\n📚 Simplifying Schema...\n');

        // ===== 1. Make kategori and genre NULLABLE =====
        console.log('Step 1: Making kategori and genre columns NULLABLE...');
        
        try {
            // Alter kategori to be nullable
            await db.query(`ALTER TABLE books MODIFY COLUMN kategori VARCHAR(100) NULL`);
            console.log('✅ kategori column updated - now NULLABLE');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                console.log('⚠️  kategori column not found (ok)');
            } else {
                throw err;
            }
        }
        
        try {
            // Alter genre_id to be nullable
            await db.query(`ALTER TABLE books MODIFY COLUMN genre_id INT NULL`);
            console.log('✅ genre_id column updated - now NULLABLE');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                console.log('⚠️  genre_id column not found (ok)');
            } else {
                throw err;
            }
        }

        try {
            // Alter category_id to be nullable
            await db.query(`ALTER TABLE books MODIFY COLUMN category_id INT NULL`);
            console.log('✅ category_id column updated - now NULLABLE');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
                console.log('⚠️  category_id column not found (ok)');
            } else {
                throw err;
            }
        }

        console.log('\n✅ Schema Simplification Complete!');
        console.log('\n📊 Updated Schema:');
        console.log('  - kategori: VARCHAR(100) NULL (allow unknown types)');
        console.log('  - category_id: INT NULL (FK to categories, optional)');
        console.log('  - genre_id: INT NULL (FK to genres, optional)');
        console.log('\n💡 Philosophy: Store data if known, NULL if unknown (no forced defaults)');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

simplifySchema();
