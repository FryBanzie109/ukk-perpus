const db = require('./db');

async function addMembershipCard() {
    try {
        // Check if nomor_identitas column exists in users table
        const [columns] = await db.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'nomor_identitas'
        `);
        
        if (columns.length === 0) {
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

    } catch (error) {
        console.error('❌ Error adding membership card column:', error);
        process.exit(1);
    }
}

addMembershipCard();
