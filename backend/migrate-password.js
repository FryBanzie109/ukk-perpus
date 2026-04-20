const db = require('./db');
const bcrypt = require('bcryptjs');

/**
 * Script untuk migrate password plain text ke hashed password
 * Jalankan: node migrate-password.js
 */

async function migratePasswords() {
    try {
        console.log('🔄 Starting password migration...\n');

        // Get all users
        const [users] = await db.query('SELECT id, username, password FROM users');
        
        if (users.length === 0) {
            console.log('No users found.');
            process.exit(0);
        }

        console.log(`Found ${users.length} users\n`);

        let migratedCount = 0;
        let alreadyHashedCount = 0;

        for (const user of users) {
            try {
                // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
                const isBcryptHash = user.password.startsWith('$2a$') || 
                                    user.password.startsWith('$2b$') || 
                                    user.password.startsWith('$2y$');

                if (isBcryptHash) {
                    console.log(`✅ ${user.username} - Already hashed`);
                    alreadyHashedCount++;
                } else {
                    // Hash the plain text password
                    const hashedPassword = await bcrypt.hash(user.password, 10);
                    
                    // Update in database
                    await db.query('UPDATE users SET password = ? WHERE id = ?', 
                        [hashedPassword, user.id]);
                    
                    console.log(`🔒 ${user.username} - Migrated to hashed`);
                    migratedCount++;
                }
            } catch (err) {
                console.error(`❌ Error migrating ${user.username}:`, err.message);
            }
        }

        console.log(`\n✅ Migration Complete!`);
        console.log(`📊 Summary:`);
        console.log(`   - Already hashed: ${alreadyHashedCount}`);
        console.log(`   - Newly migrated: ${migratedCount}`);
        console.log(`   - Total users: ${users.length}\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migratePasswords();
