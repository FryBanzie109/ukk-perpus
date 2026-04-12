# UKK Perpustakaan - Complete Architecture Overview

## 1. DATABASE SCHEMA

### Database Connection
- **Database Name:** `ukk_perpus`
- **Server:** localhost
- **User:** root (XAMPP Default)
- **Password:** Empty (XAMPP Default)
- **Driver:** MySQL (mysql2)

### Tables

#### `users` Table
User accounts for both admin and students.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | User ID |
| `nama_lengkap` | VARCHAR | NOT NULL | Full name |
| `username` | VARCHAR | NOT NULL | Login username |
| `password` | VARCHAR | NOT NULL | Login password (plain text stored) |
| `role` | VARCHAR | NOT NULL | 'admin' or 'siswa' |
| `foto_profil` | LONGTEXT | NULL, DEFAULT NULL | Base64 encoded profile photo |
| `bio` | TEXT | NULL, DEFAULT NULL | User biography |
| `kelas` | VARCHAR(50) | NULL, DEFAULT NULL | Class (for students only) |
| `jurusan` | VARCHAR(100) | NULL, DEFAULT NULL | Major/Program (for students only) |

**Relationships:**
- One-to-Many with `transactions` (user can have multiple borrowing records)

---

#### `books` Table
Library book inventory.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Book ID |
| `judul` | VARCHAR | NOT NULL | Book title |
| `penulis` | VARCHAR | NOT NULL | Author name |
| `penerbit` | VARCHAR | NULL | Publisher |
| `kategori` | VARCHAR(100) | DEFAULT 'Umum' | Category/Genre (e.g., 'Fiksi', 'Non-Fiksi', 'Misteri') |
| `tahun_terbit` | YEAR | NULL | Publication year |
| `stok` | INT | NOT NULL | Available copies count |
| `cover_url` | VARCHAR(500) | NULL | URL to book cover image (from Open Library) |

**Relationships:**
- One-to-Many with `transactions` (book can be borrowed multiple times)

**Available Categories:**
- Fiksi, Non-Fiksi, Romantis, Misteri, Sains & Teknologi
- Sejarah, Biografi, Anak-anak, Komik, Puisi & Sastra
- Pendidikan, Agama, Psikologi, Self-Help, Kuliner
- Perjalanan, Seni & Desain, Lainnya

---

#### `transactions` Table
Records of book borrowing and return operations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Transaction ID |
| `user_id` | INT | FOREIGN KEY → users.id | Borrower ID |
| `book_id` | INT | FOREIGN KEY → books.id | Borrowed book ID |
| `tanggal_pinjam` | DATE | NOT NULL | Borrow date (auto-set to CURDATE()) |
| `tanggal_kembali` | DATE | NULL | Return date (set when returned) |
| `status` | VARCHAR | NOT NULL | Transaction status |
| `denda` | INT | DEFAULT 0 | Late fee amount in IDR (Rp) |
| `tanggal_permintaan_kembali` | DATE | NULL | Date student requests return |
| `waktu_permintaan_kembali` | TIME | NULL | Time student requests return |
| `waktu_konfirmasi_kembali` | TIME | NULL | Time admin confirms return |

**Transaction Status Values:**
- `dipinjam` - Book currently borrowed
- `diminta_kembali` - Student requested return (waiting for admin confirmation)
- `kembali` - Book returned and confirmed

**Late Fee Logic:**
- Borrow limit: 7 days
- Fee rate: Rp 2.000 per day for late returns
- Example: 10-day borrow = 3 days late = Rp 6.000 fee

---

## 2. BACKEND API STRUCTURE

**Base URL:** `http://localhost:5000`
**Framework:** Express.js v5.2.1

### Authentication Endpoints

#### POST `/login`
User authentication for both admin and students.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "nama_lengkap": "Admin Name",
    "username": "admin",
    "role": "admin",
    "foto_profil": null,
    "bio": null,
    "kelas": null,
    "jurusan": null
  }
}
```

#### POST `/register`
Public student registration.

**Request Body:**
```json
{
  "nama_lengkap": "string",
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Registrasi Berhasil! Silakan Login."
}
```

---

### Book Management Endpoints

#### GET `/books`
Retrieve all books.

**Response:**
```json
[
  {
    "id": 1,
    "judul": "The Great Gatsby",
    "penulis": "F. Scott Fitzgerald",
    "penerbit": "Scribner",
    "kategori": "Fiksi",
    "tahun_terbit": 1925,
    "stok": 5,
    "cover_url": "https://covers.openlibrary.org/b/id/123-M.jpg"
  }
]
```

#### GET `/books/:id`
Get specific book details.

#### GET `/search-books`
Search and filter books.

**Query Parameters:**
- `q` (optional) - Search term (searches title, author, publisher)
- `kategori` (optional) - Filter by category

**Response:** Array of books matching criteria

#### GET `/books/get-kategori`
Get list of all available book categories.

**Response:**
```json
["Fiksi", "Non-Fiksi", "Romantis", "Misteri", ...]
```

#### POST `/books` (Admin Only)
Add new book manually.

**Request Body:**
```json
{
  "judul": "string",
  "penulis": "string",
  "penerbit": "string",
  "kategori": "string",
  "tahun_terbit": "number",
  "stok": "number",
  "cover_url": "string (optional)"
}
```

#### PUT `/books/:id` (Admin Only)
Update book details.

**Request Body:** Same as POST /books

#### DELETE `/books/:id` (Admin Only)
Delete a book from inventory.

#### PUT `/books/:id/update-stok` (Admin Only)
Add or reduce book stock.

**Request Body:**
```json
{
  "jumlah": 5,
  "tipe": "tambah" // or "kurangi"
}
```

**Response:**
```json
{
  "message": "Stok berhasil di[tambah|kurangi] sebesar 5",
  "stok_lama": 10,
  "stok_baru": 15,
  "perubahan": "+5"
}
```

---

### Open Library Integration

#### GET `/books/search-openlib`
Search for books from Open Library API.

**Query Parameters:**
- `q` - Book title search term

**Response:**
```json
[
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "publisher": "Scribner",
    "year": 1925,
    "isbn": "9780743273565",
    "genre": "Fiction, Classics",
    "key": "/works/OL45883W",
    "cover_i": 6440037,
    "cover_url": "https://covers.openlibrary.org/b/id/6440037-M.jpg"
  }
]
```

**Genre Selection Logic:**
- Tries `subject_facets` first
- Falls back to `subject` field
- Falls back to `classifications_top`
- Returns "Uncategorized" if none available

#### POST `/books/import-openlib` (Admin Only)
Import book from Open Library to local database.

**Request Body:**
```json
{
  "title": "string",
  "author": "string",
  "publisher": "string",
  "year": "number",
  "genre": "string",
  "cover_url": "string"
}
```

---

### Transaction Endpoints (Borrowing & Returning)

#### POST `/borrow`
Create new borrow transaction.

**Request Body:**
```json
{
  "user_id": 1,
  "book_id": 5
}
```

**Logic:**
- Validates book stock > 0
- Decreases book stock by 1
- Creates transaction with status "dipinjam"

#### POST `/return-request`
Student requests to return borrowed book (New Workflow).

**Request Body:**
```json
{
  "transaction_id": 1,
  "book_id": 5,
  "user_id": 1
}
```

**Logic:**
- Validates transaction belongs to user and status is "dipinjam"
- Sets status to "diminta_kembali" (waiting for admin confirmation)
- Records request date and time

#### GET `/pending-returns`
Admin view of all pending return requests.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "nama_lengkap": "Student Name",
    "kelas": "10-A",
    "book_id": 5,
    "judul": "The Great Gatsby",
    "penulis": "F. Scott Fitzgerald",
    "tanggal_pinjam": "2024-01-01",
    "tanggal_permintaan_kembali": "2024-01-15",
    "waktu_permintaan_kembali": "14:30:00",
    "status": "diminta_kembali"
  }
]
```

#### POST `/confirm-return/:transactionId` (Admin Only)
Admin confirms the book return.

**Logic:**
- Calculates days borrowed from tanggal_pinjam to today
- Calculates late fee: max(0, (days - 7) × 2000)
- Updates transaction with status "kembali", return date, and fee
- Increases book stock by 1
- Records confirmation time

**Response:**
```json
{
  "message": "Pengembalian buku dikonfirmasi",
  "transaction_id": 1,
  "selisih_hari": 10,
  "denda": 6000,
  "keterangan": "Buku terlambat 3 hari. Denda: Rp 6000"
}
```

#### POST `/return` (Legacy - Direct Return)
Old endpoint for immediate return without admin confirmation.

**Request Body:**
```json
{
  "transaction_id": 1,
  "book_id": 5
}
```

#### GET `/transactions` (Admin Only)
Get all transactions (borrowing history).

**Response:**
```json
[
  {
    "id": 1,
    "nama_lengkap": "Student Name",
    "judul": "Book Title",
    "tanggal_pinjam": "2024-01-01",
    "tanggal_kembali": "2024-01-10",
    "status": "kembali",
    "book_id": 5,
    "denda": 6000
  }
]
```

#### GET `/my-borrowed-books/:userId`
Get only active borrowed books for a specific student.

**Response:**
```json
[
  {
    "id": 1,
    "book_id": 5,
    "judul": "Book Title",
    "penulis": "Author",
    "tanggal_pinjam": "2024-01-01",
    "status": "dipinjam"
  }
]
```

#### GET `/student-borrowed-books/:userId` (Admin Only)
Get complete borrowing history for a specific student.

**Response:** Includes all statuses with return dates and fees.

---

### Student Management Endpoints

#### GET `/students` (Admin Only)
Get all students.

**Response:**
```json
[
  {
    "id": 2,
    "nama_lengkap": "Student Name",
    "username": "student01",
    "role": "siswa",
    "kelas": "10-A",
    "jurusan": "IPA",
    "foto_profil": null
  }
]
```

#### GET `/search-students` (Admin Only)
Search and filter students.

**Query Parameters:**
- `q` - Search name or username
- `kelas` - Filter by class
- `jurusan` - Filter by major

#### GET `/students/get-kelas`
Get list of available classes.

#### GET `/students/get-jurusan`
Get list of available majors.

#### POST `/students` (Admin Only)
Register new student.

**Request Body:**
```json
{
  "nama_lengkap": "string",
  "username": "string",
  "password": "string"
}
```

#### DELETE `/students/:id` (Admin Only)
Delete student account.

---

### User Profile Endpoints

#### GET `/profile/:userId`
Get user profile information.

**Response:**
```json
{
  "id": 1,
  "nama_lengkap": "User Name",
  "username": "username",
  "role": "admin",
  "foto_profil": "data:image/jpeg;base64,...",
  "bio": "User biography",
  "kelas": null,
  "jurusan": null
}
```

#### PUT `/profile/:userId`
Update user profile.

**Request Body:**
```json
{
  "nama_lengkap": "string",
  "bio": "string",
  "kelas": "string (siswa only)",
  "jurusan": "string (siswa only)",
  "foto_profil": "base64 image string"
}
```

---

### Late Fees Report Endpoints

#### GET `/late-fees` (Admin Only)
Get all students with outstanding late fees.

**Response:**
```json
[
  {
    "id": 2,
    "nama_lengkap": "Student Name",
    "username": "student01",
    "kelas": "10-A",
    "jurusan": "IPA",
    "total_denda": 12000,
    "jumlah_buku_terlambat": 2,
    "detail_buku": "- The Great Gatsby (Rp 6000)\n- 1984 (Rp 6000)"
  }
]
```

#### GET `/late-fees/:studentId` (Admin Only)
Get late fees for specific student with book details.

**Response:**
```json
[
  {
    "id": 2,
    "nama_lengkap": "Student Name",
    "username": "student01",
    "kelas": "10-A",
    "jurusan": "IPA",
    "judul": "Book Title",
    "penulis": "Author",
    "tanggal_pinjam": "2024-01-01",
    "tanggal_kembali": "2024-01-10",
    "denda": 6000,
    "hari_pinjam": 9
  }
]
```

#### GET `/late-fees/download/pdf` (Admin Only)
Download comprehensive late fees report as PDF.

**Response:** PDF file attachment

#### GET `/late-fees/download/pdf/:studentId` (Admin Only)
Download individual student late fees notification as PDF.

**Response:** PDF file attachment

---

## 3. FRONTEND STRUCTURE

### Technology Stack
- **Framework:** React 19.2.0
- **Routing:** React Router DOM 7.13.0
- **HTTP Client:** Axios 1.13.4
- **UI Framework:** Bootstrap 5.3.8
- **Build Tool:** Vite 7.2.4

### Pages

#### **Login.jsx**
Login page for authentication.

**Flow:**
1. Form submission with username & password
2. API call to POST `/login`
3. Store user data in localStorage
4. Redirect to Dashboard

---

#### **Dashboard.jsx** (Main Application)
Central hub for both admin and student interfaces.

**User Roles & Views:**
- **Admin:** Full library management dashboard
- **Siswa (Student):** Book browsing and borrowing interface

##### Admin Features:

###### 1. **Katalog Buku (Books Management)**
- View all books with search
- Add new books manually or from Open Library
- Edit book details
- Delete books
- Manage stock (add/reduce quantities)
- Filter by category

**State Variables:**
- `books` - All books in system
- `searchQuery` - Current search text
- `selectedBook` - Book being viewed/edited
- `showBookProfile` - Modal visibility
- `filterKategoriBuku` - Selected category filter
- `daftarKategoriBuku` - Available categories

###### 2. **Transaksi (Transaction Management)**
- View all current borrowing transactions
- View return requests from students
- Confirm book returns and calculate late fees
- Transaction history report

**State Variables:**
- `transactions` - All transactions
- `pendingReturns` - Waiting return requests
- `selectedBook` - Book in transaction context

**Return Request Workflow:**
1. Student applies for return
2. Admin sees pending requests
3. Admin confirms, system calculates fees
4. Stock is restored

###### 3. **Siswa (Student Management)**
- View all registered students
- Search students by name, class, or major
- View student profiles with borrowing history
- View student late fees with PDF report
- Add/delete student accounts

**State Variables:**
- `students` - All students
- `siswaFiltered` - Filtered student results
- `searchSiswa` - Student search query
- `filterKelas` - Class filter
- `filterJurusan` - Major filter
- `daftarKelas` - Available classes
- `daftarJurusan` - Available majors
- `selectedStudent` - Student profile data
- `showStudentProfile` - Profile modal
- `studentBorrowedBooks` - Student's borrowing history

###### 4. **Laporan Denda (Late Fees Report)**
- View table of all students with outstanding fines
- Generate PDF of all late fees
- Generate PDF for individual student
- Print reports

**State Variables:**
- `lateFees` - Array of students with fees

---

##### Student (Siswa) Features:

###### 1. **Katalog Buku (Browse Books)**
- Browse all available books
- Search by title, author, publisher
- Filter by category
- View book details
- Borrow available books

**State Variables:**
- `books` - Available books
- `searchQuery` - Search text
- `filterKategoriBuku` - Category filter
- `selectedBook` - Book details modal

###### 2. **Buku Saya (My Borrowed Books)**
- View all currently borrowed books
- Borrow date display
- Request book return from this view

**State Variables:**
- `myBorrowedBooks` - Current active borrowings

###### 3. **Profil (User Profile)**
- Edit profile information (name, bio, class, major)
- Upload profile photo
- View profile data

---

### Component Architecture

```
src/
├── pages/
│   ├── Login.jsx              # Authentication UI
│   ├── Dashboard.jsx          # Main application (Admin & Student views)
│   └── Profile.jsx            # User profile management
├── context/
│   └── ThemeContext.jsx       # Dark/Light mode context
├── App.jsx                    # Main routing component
├── App.css                    # Global styles
└── main.jsx                   # React DOM render
```

### State Management Approach

**Current Implementation:**
- No Redux or Context (except ThemeContext)
- Local component state with `useState`
- Direct API calls with Axios
- localStorage for user persistence

**Key State Variables:**
```javascript
// User & Auth
const [user, setUser] = useState(null);
const [activeTab, setActiveTab] = useState('katalog');

// Book Management
const [books, setBooks] = useState([]);
const [searchQuery, setSearchQuery] = useState('');
const [filterKategoriBuku, setFilterKategoriBuku] = useState('');
const [selectedBook, setSelectedBook] = useState(null);
const [openLibResults, setOpenLibResults] = useState([]);

// Transaction Management
const [transactions, setTransactions] = useState([]);
const [pendingReturns, setPendingReturns] = useState([]);
const [myBorrowedBooks, setMyBorrowedBooks] = useState([]);

// Student Management
const [students, setStudents] = useState([]);
const [siswaFiltered, setSiswaFiltered] = useState([]);
const [searchSiswa, setSearchSiswa] = useState('');
const [filterKelas, setFilterKelas] = useState('');
const [filterJurusan, setFilterJurusan] = useState('');

// Reports
const [lateFees, setLateFees] = useState([]);

// Modals & UI States
const [showBookProfile, setShowBookProfile] = useState(false);
const [showStudentProfile, setShowStudentProfile] = useState(false);
const [showStockModal, setShowStockModal] = useState(false);
```

---

## 4. DATA FLOW DIAGRAMS

### Borrowing Process Flow

```
Student → Request Borrow (POST /borrow)
          ↓
          API validates book stock > 0
          ↓
          Book stock decreases by 1
          ↓
          Transaction created with status "dipinjam"
          ↓
          Dashboard updates to show borrowed books
```

### Return Request Workflow (New)

```
Student → Request Return (POST /return-request)
          ↓
          Sets transaction status to "diminta_kembali"
          ↓
          Admin sees in "pending-returns" list
          ↓
          Admin Confirms (POST /confirm-return/:id)
          ↓
          Late fees calculated:
          - Days overdue = current_date - borrow_date - 7
          - Fee = max(0, days_overdue × 2000)
          ↓
          Status = "kembali", stock increased by 1
          ↓
          Student notified of fees
```

### Legacy Return Process (Direct)

```
Admin → POST /return with transaction_id
        ↓
        Same fee calculation as confirm-return
        ↓
        Immediate finalization
```

### Book Import from Open Library

```
Admin → Search (GET /books/search-openlib?q=title)
        ↓
        HTTPS GET to https://openlibrary.org/search.json
        ↓
        Parse response: extract title, author, genre, cover
        ↓
        Set transaction status with all fields mapped
        ↓
        Display results in UI with cover images
        ↓
        Admin selects book → POST /books/import-openlib
        ↓
        Book inserted into database with cover_url
        ↓
        Dashboard updates books list
```

### Authentication Flow

```
User → Login form (username, password)
       ↓
       POST /login
       ↓
       Database query: SELECT * FROM users WHERE username=? AND password=?
       ↓
       If match: Return user object with role
       ↓
       Store in localStorage as 'user'
       ↓
       useEffect detects user state change
       ↓
       Conditional render based on role:
       - role='admin' → Load all data (transactions, students)
       - role='siswa' → Load borrowed books only
```

---

## 5. KEY FEATURES & WORKFLOWS

### Feature 1: Multi-Role Authentication
- **Admin:** Full system access
- **Siswa:** Limited to browsing and borrowing

### Feature 2: Dual Return Request System
- **User-initiated requests:** Students can request returns (new workflow)
- **Admin confirmation:** Admin must confirm and calculate fees
- **Legacy direct return:** Old method still supported

### Feature 3: Automated Late Fee Calculation
- 7-day free borrow period
- Rp 2,000 per day penalty after 7 days
- Fees calculated at return confirmation
- Fees never applied to on-time returns

### Feature 4: Book Catalog Management
- Manual book entry
- Import from Open Library API
- Stock tracking per book
- Category filtering (18 predefined categories)
- Cover images from Open Library

### Feature 5: Open Library Integration
- Real-time search with cover images
- Automatic genre extraction
- ISBN and publication year data
- Imports to local database

### Feature 6: Student Profile Management
- Profile photo (Base64 encoded)
- Bio/description
- Class and major tracking
- Complete history tracking

### Feature 7: Comprehensive Reporting
- Transaction history report
- Late fees by student
- PDF exports for all reports
- Individual student PDF notifications

---

## 6. DEPENDENCIES

### Backend
```json
{
  "express": "^5.2.1",           // Web framework
  "cors": "^2.8.6",              // CORS middleware
  "body-parser": "^2.2.2",       // Request parsing
  "mysql2": "^3.16.3",           // MySQL driver
  "pdfkit": "^0.18.0",           // PDF generation
  "nodemon": "^3.1.11"           // Dev auto-reload
}
```

### Frontend
```json
{
  "react": "^19.2.0",            // UI framework
  "react-dom": "^19.2.0",        // DOM rendering
  "react-router-dom": "^7.13.0", // Client-side routing
  "axios": "^1.13.4",            // HTTP client
  "bootstrap": "^5.3.8"          // CSS framework
}
```

---

## 7. CURRENT IMPLEMENTATION GAPS & NOTES

### Security Issues
- ⚠️ Passwords stored plain text (should use hashing - bcrypt)
- ⚠️ No JWT/session tokens (using localStorage only)
- ⚠️ No input validation on backend (SQL injection risk)
- ⚠️ CORS allows all origins

### Code Quality Issues
- ❌ No error handling in catch blocks (just res.status(500).json(err))
- ❌ Limited input validation
- ❌ No logging system
- ❌ State management could use Context API or Redux

### Potential Improvements
- Add loading states for all async operations
- Implement request debouncing for searches
- Add form validation feedback
- Implement caching strategy for books/students
- Add pagination for large datasets
- Improve error messages to users
- Add confirmation dialogs for destructive actions
- Implement soft deletes instead of hard deletes

---

## 8. MIGRATION FILES

### `migrate.js`
Adds new columns to existing tables:
- `denda` (INT, DEFAULT 0) - Late fees
- `kategori` (VARCHAR(100), DEFAULT 'Umum') - Book category
- `cover_url` (VARCHAR(500)) - Book cover URL
- `tanggal_permintaan_kembali` (DATE) - Return request date
- `waktu_permintaan_kembali` (TIME) - Return request time
- `waktu_konfirmasi_kembali` (TIME) - Confirmation time

**Run:** `node migrate.js`

### `migrate-profile.js`
Adds user profile columns:
- `foto_profil` (LONGTEXT) - Base64 encoded image
- `bio` (TEXT) - User biography
- `kelas` (VARCHAR(50)) - Student class
- `jurusan` (VARCHAR(100)) - Student major

**Run:** `node migrate-profile.js`

---

## 9. RUNNING THE APPLICATION

### Backend
```bash
cd backend
npm install
node migrate.js          # Run migrations first
node migrate-profile.js  # Run profile migration
npm start               # Runs on port 5000 with nodemon
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Dev server with Vite
npm run build          # Production build
```

### Database Setup
1. Create database: `CREATE DATABASE ukk_perpus;`
2. Create tables manually or import existing schema
3. Update db.js if using different credentials
4. Run migration scripts

---

## 10. API RESPONSE FORMATS

### Success Response (200)
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "message": "Error description",
  "error": "error_details"
}
```

Many endpoints return simple message objects without success flag - improvements needed for consistency.

