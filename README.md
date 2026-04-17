school project. Don't get into it.



# 📚 UKK Perpustakaan - Aplikasi Manajemen Perpustakaan

Aplikasi web full-stack untuk manajemen perpustakaan yang memungkinkan admin mengelola buku, peminjaman, dan profil siswa secara terintegrasi.

## 🎯 Fitur Utama

### Fitur User (Siswa)
- ✅ **Browse & Cari Buku** - Cari buku dengan genre filtering
- 📖 **Peminjaman Buku** - Pinjam buku dengan validasi otomatis
- 📤 **Return Request** - Ajukan permintaan pengembalian buku
- 📖 **Buku Saya** - Lihat daftar buku yang sedang dipinjam
- 💰 **Lihat Denda** - Cek denda keterlambatan buku

### Fitur Admin
- 📚 **Manajemen Buku** - CRUD buku dengan genre support
- 🎭 **Genre Management** - Kelola kategori/genre buku
- 👥 **Manajemen Siswa** - Kelola profil dan kelas siswa
- 📋 **Transaksi** - Lihat laporan peminjaman & pengembalian
- 🔄 **Return Confirmation** - Konfirmasi permintaan pengembalian
- 🖨️ **Laporan Denda** - Generate & print laporan denda PDF
- 📥 **Import dari OpenLibrary** - Import buku dari API eksternal

### Fitur Umum
- ✅ **Sistem Login** - Role-based (Admin & Siswa)
- 🌙 **Dark Mode** - Tema gelap untuk kenyamanan
- 📱 **Responsive Design** - Kompatibel desktop & mobile
- 🔐 **Validasi Data** - Input validation server-side

---

## ✨ Recent Updates & Improvements (v2.0)

### 🗄️ Database Layer Optimization
- ✅ **Genre Table** - Separate `genres` table dengan FK dari books
- ✅ **Performance Indexes** - 9 strategic indexes for faster queries
- ✅ **Timestamps** - `created_at` & `updated_at` on all tables
- ✅ **Data Constraints** - UNIQUE username, FK relationships
- ✅ **Better Relationships** - Proper foreign keys with CASCADE

### 🔧 Backend API (v2 Endpoints)
**New Improved API Endpoints:**
```
GET /genres                                    # Get all genres
GET /books/v2/all?page=1&limit=20              # Paginated books
GET /books/v2/search?keyword=&genre_id=        # Search + filter
GET /books/v2/:id                              # Get book details
POST /books/v2                                 # Create book (validated)
PUT /books/v2/:id                              # Update book
DELETE /books/v2/:id                           # Delete book
POST /borrow/v2                                # Smart borrow (validated)
POST /books/v2/:id/check-borrow                # Check eligibility
```

**Improvements:**
- Input validation on all endpoints
- Consistent error response format
- Pagination support (default 20 items/page)
- Smart borrow validation (checks overdue books, duplicates, stock)
- Database transaction safety for critical operations

### 💻 Frontend State Management
- ✅ **Custom Hooks** - `useBooks()`, `useBorrowing()`, `useFormValidation()`
- ✅ **Better State** - Separated concerns (data vs UI state)
- ✅ **Validation** - Client-side + server-side validation
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **Performance** - Pagination, efficient queries, smart loading

### 📚 Documentation
- ✅ **Architecture Overview** - Complete system design
- ✅ **API Documentation** - All endpoints documented
- ✅ **Frontend Hooks** - Usage examples & patterns
- ✅ **Implementation Guide** - Step-by-step integration
- ✅ **Quick Reference** - Developer cheatsheet

---

## 🔗 API Endpoints Reference

### Genres
```
GET /genres
Response: [{id, nama, deskripsi}, ...]
```

### Books (v2 - Recommended)
```
GET /books/v2/all?page=1&limit=20
GET /books/v2/search?keyword=&genre_id=&page=1
GET /books/v2/:id
POST /books/v2
PUT /books/v2/:id
DELETE /books/v2/:id
```

### Borrowing
```
POST /borrow/v2
POST /books/v2/:id/check-borrow
GET /my-borrowed-books/:userId
POST /return-request
GET /pending-returns (Admin)
POST /confirm-return/:transactionId (Admin)
```

### Reports
```
GET /late-fees
GET /late-fees/:studentId
GET /late-fees/download/pdf
GET /late-fees/download/pdf/:studentId
```

**Note**: Old endpoints still work for backward compatibility. Use v2 endpoints for new features.

---

## 📁 Project Structure (Updated)

```
ukk-perpustakaan/
├── backend/
│   ├── index.js              # Server & routes
│   ├── db.js                 # Database connection
│   ├── utils.js              # Validation & helpers (NEW)
│   ├── migrate.js            # Database migration
│   ├── optimize-schema.js    # Schema optimization (NEW)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useApi.js     # Custom hooks (NEW)
│   │   ├── pages/
│   │   ├── context/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── 📋 Documentation/
│   ├── INDEX.md                      # Overview & summary
│   ├── REFACTORING_COMPLETE.md       # Detailed changes
│   ├── API_IMPROVEMENTS.md           # New API docs
│   ├── FRONTEND_IMPROVEMENTS.md      # Hook documentation
│   ├── ARCHITECTURE_OVERVIEW.md      # Full architecture
│   ├── QUICK_REFERENCE.md           # Developer guide
│   └── ...
│
└── README.md
```

---

## 🔧 Technology Stack

### Backend
- **Node.js** & **Express** - Server framework
- **MySQL** - Database
- **CORS & Body Parser** - Middleware

### Frontend
- **React 19** - UI library
- **Vite** - Build tool & development server
- **Bootstrap 5** - CSS framework
- **Axios** - HTTP client
- **React Router DOM** - Navigation

---

## 📦 Requirements

Pastikan sudah install:

- **Node.js** v14+ ([Download](https://nodejs.org/))
- **npm** atau **yarn**
- **MySQL** Server ([XAMPP](https://www.apachefriends.org/) atau MySQL standalone)
- **Git**

---

## 🚀 Cara Instalasi & Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/FryBanzie109/ukk-perpus.git
cd ukk-perpus
```

### 2️⃣ Setup Database

#### Menggunakan XAMPP:
1. Buka **XAMPP Control Panel**
2. Klik **Start** pada **Apache** dan **MySQL**
3. Buka **phpMyAdmin** di browser: `http://localhost/phpmyadmin`
4. Buat database baru dengan nama `ukk_perpus`
5. Import file SQL (jika ada di folder):
   ```bash
   # Di phpMyAdmin, pilih database ukk_perpus → Import → pilih file .sql
   ```

#### Atau buat table secara manual:
```sql
CREATE DATABASE ukk_perpus;
USE ukk_perpus;

-- Tabel Users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role ENUM('admin', 'siswa') DEFAULT 'siswa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Books
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    judul VARCHAR(200) NOT NULL,
    penulis VARCHAR(100),
    penerbit VARCHAR(100),
    tahun_terbit INT,
    isbn VARCHAR(20) UNIQUE,
    stok INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Profiles (opsional)
CREATE TABLE profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    nama_lengkap VARCHAR(100),
    nisn VARCHAR(20),
    kelas VARCHAR(10),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3️⃣ Setup Backend

```bash
cd backend
npm install
```

**Konfigurasi Database** (sudah otomatis di `db.js`):
```javascript
// backend/db.js - Default XAMPP
host: 'localhost'
user: 'root'
password: ''          // Kosong untuk XAMPP default
database: 'ukk_perpus'
```

**Run Database Migration** (setup genres table & optimization):
```bash
cd backend
node migrate.js          # Setup basic schema
node optimize-schema.js  # Optimize with genres & indexes (v2.0)
```

Jika menggunakan password MySQL, edit `backend/db.js`:
```javascript
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'YOUR_PASSWORD',  // Ubah di sini
    database: 'ukk_perpus'
});
```

### 4️⃣ Setup Frontend

```bash
cd frontend
npm install
```

**Konfigurasi API** (jika backend di server lain):
- Edit file yang melakukan API call (misalnya di `src/`)
- Sesuaikan URL dari `http://localhost:5000` ke URL backend Anda

### 5️⃣ (Optional) Import Custom Hooks

Untuk menggunakan custom hooks di frontend:
```bash
# Hooks sudah ready di: frontend/src/hooks/useApi.js
import { useBooks, useBorrowing } from '../hooks/useApi';
```

---

## ▶️ Cara Menjalankan Aplikasi

### Terminal 1 - Jalankan Backend (Port 5000)
```bash
cd backend
npm start
```

Output:
```
> backend@1.0.0 start
> nodemon index.js

[nodemon] 2.x.x
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,json
Koneksi Database Berhasil!
Server running on port 5000
```

### Terminal 2 - Jalankan Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

Output:
```
> frontend@0.0.0 dev
> vite

✓ built in 234ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### 3️⃣ Buka Browser
Akses aplikasi di: **http://localhost:5173**

---

## 📁 Struktur Project

```
ukk-perpustakaan/
├── backend/
│   ├── db.js                 # Konfigurasi database
│   ├── index.js              # Main server & routes
│   ├── migrate.js            # Database migration
│   ├── package.json
│   └── node_modules/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main component
│   │   ├── main.jsx          # Entry point
│   │   ├── pages/
│   │   │   ├── Login.jsx     # Halaman login
│   │   │   ├── Dashboard.jsx # Halaman utama
│   │   │   └── Profile.jsx   # Halaman profil
│   │   ├── context/
│   │   │   └── ThemeContext.jsx  # Theme management
│   │   ├── assets/           # Images, icons
│   │   └── App.css
│   ├── public/               # Static files
│   ├── vite.config.js
│   ├── package.json
│   └── node_modules/
│
└── README.md
```

---

## 🔐 Default User Credentials

Setelah membuat tabel `users`, tambahkan user test:

```sql
INSERT INTO users (username, password, role) VALUES 
('admin', 'admin123', 'admin'),
('siswa', 'siswa123', 'siswa');
```

**Login:**
- Username: `admin` / Password: `admin123` (Admin)
- Username: `siswa` / Password: `siswa123` (Siswa)

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"
```bash
cd backend
npm install
```

### Error: "ECONNREFUSED" (Database tidak terkoneksi)
1. Pastikan MySQL server sudah berjalan (XAMPP: klik Start MySQL)
2. Pastikan database `ukk_perpus` sudah dibuat
3. Cek konfigurasi di `backend/db.js`

### Error: "Port 5173 already in use"
```bash
# Gunakan port berbeda
cd frontend
npm run dev -- --port 3000
```

### Error: "CORS blocked"
- Backend sudah menggunakan CORS middleware
- Pastikan URL frontend benar di konfigurasi backend

---

## 📝 Catatan Penting

- Jangan commit `node_modules/` ke git (sudah di `.gitignore`)
- Password di database ini adalah plaintext untuk development saja
- Untuk production, gunakan bcrypt untuk hashing password
- Database migration: jalankan `node backend/migrate.js` (jika ada)

---

## 👨‍💻 Author
**FryBanzie109** - UKK School Project

---

## 📄 License
MIT
