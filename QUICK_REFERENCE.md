# UKK Perpustakaan - Quick Reference Guide

## Project Setup & Running

### Initial Setup

```bash
# 1. Backend Setup
cd backend
npm install
node migrate.js           # Run schema migrations
node migrate-profile.js   # Run profile column migrations

# 2. Frontend Setup
cd ../frontend
npm install

# 3. Start both services
# Terminal 1 - Backend
cd backend && npm start
# Server running on http://localhost:5000

# Terminal 2 - Frontend
cd frontend && npm run dev
# Frontend running on http://localhost:5173 (Vite default)
```

### Database Setup

```bash
# 1. Create database
mysql -u root
mysql> CREATE DATABASE ukk_perpus;
mysql> USE ukk_perpus;

# 2. Create base tables (assuming they exist from previous setup)
# If not, create them manually or import from existing backup

# 3. Run migrations
node backend/migrate.js
node backend/migrate-profile.js

# 4. Verify tables exist
mysql> SHOW TABLES;
# Should show: books, transactions, users

# 5. Check columns were added
mysql> DESCRIBE books;
mysql> DESCRIBE transactions;
mysql> DESCRIBE users;
```

---

## API Endpoint Quick Reference

### Test Data Creation

```bash
# Login as Admin
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Register Student
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"nama_lengkap":"John Doe","username":"john","password":"pass123"}'

# Add Book (Admin)
curl -X POST http://localhost:5000/books \
  -H "Content-Type: application/json" \
  -d '{
    "judul":"The Great Gatsby",
    "penulis":"F. Scott Fitzgerald",
    "penerbit":"Scribner",
    "kategori":"Fiksi",
    "tahun_terbit":1925,
    "stok":5
  }'
```

### Common API Calls Cheatsheet

| Operation | Method | Endpoint | Role | Body |
|-----------|--------|----------|------|------|
| Login | POST | /login | Any | `{username, password}` |
| Register | POST | /register | Public | `{nama_lengkap, username, password}` |
| Get Books | GET | /books | Any | - |
| Search Books | GET | /search-books?q=gatsby&kategori=Fiksi | Any | - |
| Get Categories | GET | /books/get-kategori | Any | - |
| Add Book | POST | /books | Admin | `{judul, penulis, penerbit, kategori, tahun_terbit, stok}` |
| Edit Book | PUT | /books/:id | Admin | `{judul, penulis, penerbit, kategori, tahun_terbit, stok}` |
| Delete Book | DELETE | /books/:id | Admin | - |
| Update Stock | PUT | /books/:id/update-stok | Admin | `{jumlah, tipe: 'tambah'\|'kurangi'}` |
| Search OpenLib | GET | /books/search-openlib?q=gatsby | Admin | - |
| Import Book | POST | /books/import-openlib | Admin | `{title, author, publisher, year, genre, cover_url}` |
| **Borrow Book** | **POST** | **/borrow** | **Siswa** | **`{user_id, book_id}`** |
| **Request Return** | **POST** | **/return-request** | **Siswa** | **`{transaction_id, book_id, user_id}`** |
| My Borrowed | GET | /my-borrowed-books/:userId | Siswa | - |
| All Transactions | GET | /transactions | Admin | - |
| Pending Returns | GET | /pending-returns | Admin | - |
| Confirm Return | POST | /confirm-return/:transactionId | Admin | - |
| Get Students | GET | /students | Admin | - |
| Search Students | GET | /search-students?q=john&kelas=10-A | Admin | - |
| Get Classes | GET | /students/get-kelas | Any | - |
| Get Majors | GET | /students/get-jurusan | Any | - |
| Register Student | POST | /students | Admin | `{nama_lengkap, username, password}` |
| Delete Student | DELETE | /students/:id | Admin | - |
| Get Profile | GET | /profile/:userId | Self/Admin | - |
| Update Profile | PUT | /profile/:userId | Self/Admin | `{nama_lengkap, bio, kelas, jurusan, foto_profil}` |
| Get Late Fees | GET | /late-fees | Admin | - |
| Student Late Fees | GET | /late-fees/:studentId | Admin | - |
| Download Fees PDF | GET | /late-fees/download/pdf | Admin | - |
| Download Student PDF | GET | /late-fees/download/pdf/:studentId | Admin | - |

---

## Frontend State Reference

### Dashboard.jsx State Snapshot

```javascript
// User & Auth
const [user, setUser] = useState(null);                    // {id, nama_lengkap, role, ...}
const [_loading, setLoading] = useState(true);

// Navigation
const [activeTab, setActiveTab] = useState('katalog');     // 'katalog', 'transaksi', 'siswa'
const [activeTabSiswa, setActiveTabSiswa] = useState('katalog');

// Books
const [books, setBooks] = useState([]);                    // All books
const [searchQuery, setSearchQuery] = useState('');        // Search text
const [filterKategoriBuku, setFilterKategoriBuku] = useState('');
const [daftarKategoriBuku, setDaftarKategoriBuku] = useState([]);
const [selectedBook, setSelectedBook] = useState(null);    // Book details modal
const [showBookProfile, setShowBookProfile] = useState(false);

// OpenLibrary
const [openLibSearchQuery, setOpenLibSearchQuery] = useState('');
const [openLibResults, setOpenLibResults] = useState([]);
const [openLibLoading, setOpenLibLoading] = useState(false);

// Add New Book Form
const [newBook, setNewBook] = useState({
  judul: '', penulis: '', penerbit: '', kategori: 'Fiksi',
  tahun_terbit: '', stok: ''
});

// Stock Management
const [selectedBookForStock, setSelectedBookForStock] = useState(null);
const [showStockModal, setShowStockModal] = useState(false);
const [stokInput, setStokInput] = useState({ jumlah: '', tipe: 'tambah' });

// Transactions
const [transactions, setTransactions] = useState([]);
const [pendingReturns, setPendingReturns] = useState([]);
const [myBorrowedBooks, setMyBorrowedBooks] = useState([]);
const [pendingReturnsLoading, setPendingReturnsLoading] = useState(false);

// Students
const [students, setStudents] = useState([]);
const [siswaFiltered, setSiswaFiltered] = useState([]);
const [searchSiswa, setSearchSiswa] = useState('');
const [filterKelas, setFilterKelas] = useState('');
const [filterJurusan, setFilterJurusan] = useState('');
const [daftarKelas, setDaftarKelas] = useState([]);
const [daftarJurusan, setDaftarJurusan] = useState([]);
const [selectedStudent, setSelectedStudent] = useState(null);
const [showStudentProfile, setShowStudentProfile] = useState(false);
const [studentBorrowedBooks, setStudentBorrowedBooks] = useState([]);

// Late Fees
const [lateFees, setLateFees] = useState([]);
```

---

## Database Schema Reference

### Quick Column Reference

**users table:**
```
id(PK), nama_lengkap, username, password, role, 
foto_profil, bio, kelas, jurusan
```

**books table:**
```
id(PK), judul, penulis, penerbit, kategori, 
tahun_terbit, stok, cover_url
```

**transactions table:**
```
id(PK), user_id(FK), book_id(FK), tanggal_pinjam, 
tanggal_kembali, status, denda, 
tanggal_permintaan_kembali, waktu_permintaan_kembali, 
waktu_konfirmasi_kembali
```

### Status Values & Meanings

| Value | Meaning | Description |
|-------|---------|-------------|
| `dipinjam` | Borrowing | User currently has the book |
| `diminta_kembali` | Return Requested | User requested return, waiting admin confirmation |
| `kembali` | Returned | Book returned and confirmed by admin |

---

## Common Development Tasks

### Add a New Feature Checklist

```
1. Backend Task
   [ ] Add database column if needed (update migrate.js)
   [ ] Add API endpoint in backend/index.js
   [ ] Add database query/logic
   [ ] Test with curl/Postman
   [ ] Add error handling

2. Frontend Task
   [ ] Add useState for new feature
   [ ] Create event handler function
   [ ] Create API call with axios
   [ ] Update fetchData() or useEffect if needed
   [ ] Add UI elements (buttons, forms, modals)
   [ ] Test in browser
   [ ] Check responsive design

3. Testing
   [ ] Manual test happy path
   [ ] Test error cases
   [ ] Test in both admin & siswa roles
   [ ] Check localStorage persistence
   [ ] Verify database changes
```

### Debugging Tips

**Backend Debugging:**
```javascript
// Add console logs in backend/index.js
console.log('Request received:', req.body);
console.log('Query result:', rows);
console.log('Error:', err);

// Use node-inspect
node --inspect backend/index.js
# Open chrome://inspect
```

**Frontend Debugging:**
```javascript
// React DevTools browser extension
// Check React component tree, state, props

// Console logging
console.log('User state:', user);
console.log('Books state:', books);
console.log('API response:', response.data);

// Network tab in Developer Tools
// Monitor API requests and responses
```

**Database Debugging:**
```sql
-- View all books
SELECT * FROM books;

-- Check transactions for a student
SELECT * FROM transactions WHERE user_id = 2;

-- Find late fees
SELECT * FROM transactions WHERE denda > 0;

-- Check student profile
SELECT * FROM users WHERE role = 'siswa';
```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'mysql2'"
**Solution:**
```bash
cd backend
npm install mysql2
```

### Issue: Database connection fails
**Solution:**
- Check MySQL is running: `Status: Running` in Services
- Verify database exists: `SHOW DATABASES;`
- Check db.js credentials match your MySQL setup
- Ensure database name is 'ukk_perpus'

### Issue: "CORS policy blocked request"
**Solution:**
- Already configured in backend/index.js
- If still issues, check `app.use(cors())` is early in code

### Issue: Frontend can't connect to API
**Solution:**
- Verify backend is running: `http://localhost:5000`
- Check console for "Cannot POST /endpoint" errors
- Verify endpoint URL spelling in axios calls
- Check request body format matches backend expectations

### Issue: Book import from OpenLibrary fails
**Solution:**
- Check internet connection
- Open Library might be slow - add timeout
- Verify book exists on OpenLibrary
- Check cover_i field is available (not all books have covers)

### Issue: Late fees not calculating
**Solution:**
- Verify book was borrowed > 7 days before confirmation
- Check transaction tanggal_pinjam is set correctly
- Confirm /confirm-return endpoint is called (not /return)
- Check calculation: `(days - 7) * 2000`

### Issue: Student can't see borrowed books
**Solution:**
- Verify transaction status is "dipinjam" (not "kembali")
- Check API endpoint: `/my-borrowed-books/:userId`
- Verify userId is being passed correctly
- Check database query filters by status = 'dipinjam'

---

## Performance Optimization Tips

### Frontend
```javascript
// Use useCallback to prevent unnecessary re-renders
const handleSearch = useCallback((query) => {
  // search logic
}, [dependencies]);

// Debounce search input to reduce API calls
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Implement pagination for large datasets
const itemsPerPage = 20;
const paginatedItems = items.slice(0, itemsPerPage);
```

### Backend
```javascript
// Add indexes to frequently searched columns
ALTER TABLE books ADD INDEX idx_judul (judul);
ALTER TABLE books ADD INDEX idx_kategori (kategori);
ALTER TABLE users ADD INDEX idx_username (username);

// Use SELECT with specific columns, not SELECT *
SELECT id, judul, penulis FROM books LIMIT 50;

// Add WHERE clauses to filter early
SELECT * FROM transactions WHERE status = 'dipinjam' AND user_id = ?;
```

### Database
```sql
-- Check slow queries
SHOW SLOW LOG;

-- Analyze query performance
EXPLAIN SELECT * FROM transactions WHERE user_id = 2;

-- Optimize with proper indexing
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
```

---

## File Locations Quick Map

| What | Where |
|------|-------|
| Main API | `backend/index.js` |
| Database config | `backend/db.js` |
| Run backend | `backend/npm start` |
| Main UI | `frontend/src/pages/Dashboard.jsx` |
| Run frontend | `frontend/npm run dev` |
| Styling | `frontend/src/App.css` |
| Routes | `frontend/src/App.jsx` |
| Theme context | `frontend/src/context/ThemeContext.jsx` |
| Login page | `frontend/src/pages/Login.jsx` |
| Profile page | `frontend/src/pages/Profile.jsx` |
| This docs | `ARCHITECTURE_OVERVIEW.md` |
| Diagrams | `ARCHITECTURE_DIAGRAMS.md` |

---

## Default Credentials (For Testing)

**Admin Account:**
```
Username: admin
Password: admin123  (or whatever you set during setup)
```

**Student Accounts:**
Can register new students via `/register` endpoint or admin interface

---

## Environment Variables (If Needed)

Current implementation doesn't use .env files. Hardcoded values:

```javascript
// Backend/db.js
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ukk_perpus'
});

// Backend/index.js - Server port
app.listen(5000, ...)

// Frontend - API base URL
'http://localhost:5000'

// PDF settings
const denda_per_hari = 2000;  // Rp 2000 per day
const batas_hari = 7;          // 7 days free period
```

**To change these for production:**
1. Create `.env` file in backend/
2. Add variables: `DB_HOST`, `DB_USER`, `DB_PASS`, `API_PORT`
3. Use `require('dotenv').config()` and `process.env.VARIABLE_NAME`
4. Update frontend to use environment variables too

---

## Code Style Guidelines

### Backend (JavaScript/Node.js)
```javascript
// Use camelCase for variables
const userData = { /* ... */ };

// Use arrow functions for callbacks
const result = array.map(item => item.value);

// Use async/await, not .then()
const [rows] = await db.query(sql, params);

// Comment complex logic
// Check if book stock is available before borrowing
if (book.stok > 0) { /* ... */ }
```

### Frontend (React)
```javascript
// Use camelCase for variables
const [userData, setUserData] = useState(null);

// Use PascalCase for components
function UserProfile() { /* ... */ }

// Use const for components and functions
const handleSubmit = async (e) => { /* ... */ };

// Use destructuring
const { id, name, role } = user;
```

### SQL
```sql
-- Use UPPER for SQL keywords
SELECT * FROM users WHERE role = 'admin';

-- Use backticks for column names with special chars
SELECT `column-name` FROM `table-name`;

-- Comment complex queries
-- Get all students with late fees
SELECT u.id, SUM(t.denda) as total_denda
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.denda > 0;
```

---

## Useful Resources

### Documentation Links
- Express.js: https://expressjs.com/
- React: https://react.dev/
- React Router: https://reactrouter.com/
- MySQL: https://dev.mysql.com/doc/
- Axios: https://axios-http.com/docs/intro
- Bootstrap: https://getbootstrap.com/docs/
- PDFKit: http://pdfkit.org/

### Tools
- Postman: API testing
- MySQL Workbench: Database GUI
- VS Code Extensions: Prettier, ESLint, MySQL, Thunder Client
- DevTools: Browser developer tools (F12)

---

## Project Statistics

**Lines of Code Estimate:**
- Backend: ~1,200 lines (index.js)
- Frontend Dashboard: ~800 lines
- Login & Profile: ~300 lines combined
- Total: ~2,300 lines

**Database Size:**
- Tables: 3 (users, books, transactions)
- Columns: ~30 total
- Estimated rows (small setup): <10,000

**API Endpoints:**
- Total endpoints: ~45+
- By resource:
  - Authentication: 2
  - Books: 8
  - Transactions: 8
  - Students: 6
  - Profiles: 2
  - Late Fees: 4

