const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Default user XAMPP
    password: '',      // Default password XAMPP (kosong)
    database: 'ukk_perpus'
});

console.log("Koneksi Database Berhasil!");
module.exports = db.promise();