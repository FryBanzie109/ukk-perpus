## 🚀 Quick Implementation Guide - Frontend Integration

Panduan langkah demi langkah untuk mengintegrasikan custom hooks ke Dashboard.jsx

---

## Step 1: Import Custom Hooks (5 menit)

### Tambahkan ini di awal Dashboard.jsx:

```javascript
import { useBooks, useBorrowing, useFormValidation, validateBook } from '../hooks/useApi';
```

---

## Step 2: Replace Old State dengan Custom Hooks (10 menit)

### DELETE ini (old state):

```javascript
// ❌ DELETE - LAMA
const [books, setBooks] = useState([]);
const [loading, setLoading] = useState(true);
const [filterKategoriBuku, setFilterKategoriBuku] = useState('');
const [daftarKategoriBuku, setDaftarKategoriBuku] = useState([]);
const [myBorrowedBooks, setMyBorrowedBooks] = useState([]);
```

### REPLACE dengan ini (new hooks):

```javascript
// ✅ NEW - HOOKS
const { 
    books, 
    genres,
    loading, 
    error: booksError,
    filters,
    handleFilterChange,
    fetchGenres,
    createBook,
    updateBook,
    deleteBook,
    getBook
} = useBooks();

const {
    borrowedBooks,
    borrowBook,
    checkCanBorrow,
    fetchBorrowedBooks,
    requestReturn
} = useBorrowing();
```

### REPLACE kategori (genre) filtering:

```javascript
// ❌ OLD - Hardcoded categories
const kategoriList = ['Fiksi', 'Non-Fiksi', 'Romantis', ...];

// ✅ NEW - Dynamic from genres hook
const daftarKategoriBuku = genres;
```

---

## Step 3: Update useEffect untuk Fetch Data (10 menit)

### REPLACE existing useEffect dengan ini:

```javascript
useEffect(() => {
    if (!user) return;
    
    if (user.role === 'admin') {
        // Admin: fetch books and genres
        fetchGenres();
        // fetchBooks will be called when filters change
    } else if (user.role === 'siswa') {
        // Student: fetch books, genres, and their borrowed books
        fetchGenres();
        handleFilterChange('', null); // Load all books
        fetchBorrowedBooks(user.id);
    }
}, [user?.id, user?.role]);
```

---

## Step 4: Update Kategori Filter Handler (5 menit)

### REPLACE ini:

```javascript
// ❌ OLD
const handleFilterKategoriChange = (kategori) => {
    setFilterKategoriBuku(kategori);
    // ... manual filtering logic ...
};
```

### DENGAN:

```javascript
// ✅ NEW
const handleFilterKategoriChange = (genreId) => {
    handleFilterChange('', genreId);  // keyword='', genre_id=genreId
};
```

---

## Step 5: Update Search Handler (5 menit)

### REPLACE ini:

```javascript
// ❌ OLD
const searchBuku = (keyword) => {
    setSearchQuery(keyword);
    // ... manual search logic ...
};
```

### DENGAN:

```javascript
// ✅ NEW
const searchBuku = (keyword) => {
    handleFilterChange(keyword, filters.genre_id);
};
```

---

## Step 6: Update Borrow Button Handler (10 menit)

### REPLACE ini (pinjamBuku):

```javascript
// ❌ OLD
const pinjamBuku = async (bookId) => {
    try {
        await axios.post('http://localhost:5000/borrow', { 
            user_id: user.id, 
            book_id: bookId 
        });
        alert('Sukses Pinjam!'); 
        fetchData();
    } catch (err) { alert(err.response?.data?.message); }
};
```

### DENGAN:

```javascript
// ✅ NEW
const pinjamBuku = async (bookId) => {
    try {
        // Pre-check eligibility
        const { canBorrow, errors } = await checkCanBorrow(user.id, bookId);
        
        if (!canBorrow) {
            alert('Tidak bisa meminjam:\n' + errors.join('\n'));
            return;
        }

        // Borrow book
        const result = await borrowBook(user.id, bookId);
        alert(`✅ Sukses meminjam "${result.book_title}"`);
        
        // Refresh borrowed books
        await fetchBorrowedBooks(user.id);
        
        // Refresh books list to update stock
        handleFilterChange(filters.keyword, filters.genre_id);
    } catch (err) { 
        alert('❌ ' + err.response?.data?.message || err.message); 
    }
};
```

---

## Step 7: Update Return Button Handler (5 menit)

### REPLACE requestReturnBook():

```javascript
// ✅ NEW - Already implemented but update it
const requestReturnBook = async (transaction) => {
    if (window.confirm(`Anda yakin ingin mengembalikan "${transaction.judul}"?`)) {
        try {
            await requestReturn(transaction.id, transaction.book_id, user.id);
            alert('✅ Permintaan pengembalian dikirim ke admin');
            await fetchBorrowedBooks(user.id);
        } catch (err) {
            alert('❌ ' + (err.message || 'Error'));
        }
    }
};
```

---

## Step 8: Update Book List Display (10 menit)

### In kategori filter dropdown:

```jsx
// ✅ NEW - Use genres from hook
<select 
    className="form-select form-select-lg"
    value={filters.genre_id || ''}
    onChange={(e) => handleFilterKategoriChange(e.target.value ? parseInt(e.target.value) : null)}
>
    <option value="">Semua Kategori</option>
    {genres.map(genre => (
        <option key={genre.id} value={genre.id}>
            {genre.nama}
        </option>
    ))}
</select>
```

### Show loading state:

```jsx
{loading && (
    <div className="text-center">
        <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    </div>
)}

{!loading && booksError && (
    <div className="alert alert-danger">
        ❌ {booksError}
    </div>
)}

{!loading && books.length === 0 && (
    <div className="alert alert-info">
        📚 Tidak ada buku yang sesuai filter
    </div>
)}
```

### Book grid (unchanged):

```jsx
{!loading && books.map(book => (
    <div className="col-md-6 col-lg-4" key={book.id}>
        {/* Book card - sama seperti sebelumnya */}
        <div className="card">
            {/* ... */}
            <button 
                onClick={() => pinjamBuku(book.id)} 
                className="btn btn-primary btn-sm w-100 mt-2" 
                disabled={loading || book.stok < 1}
            >
                {loading ? 'Loading...' : (book.stok < 1 ? '❌ Habis' : '📤 Pinjam')}
            </button>
        </div>
    </div>
))}
```

---

## Step 9: Update "Buku Saya" Tab (5 menit)

### Replace table display:

```jsx
{activeTabSiswa === 'bukusaya' && (
    <div className="card-body">
        <h5 className="card-title mb-4">📖 Buku Yang Saya Pinjam</h5>
        
        {borrowedBooks.length === 0 ? (
            <div className="alert alert-info">
                Anda belum meminjam buku.
            </div>
        ) : (
            <div className="table-responsive">
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Judul</th>
                            <th>Penulis</th>
                            <th>Tanggal Pinjam</th>
                            <th>Hari Pinjam</th>
                            <th>Est. Denda</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {borrowedBooks.map(b => (
                            <tr key={b.transaction_id}>
                                <td><strong>{b.judul}</strong></td>
                                <td>{b.penulis}</td>
                                <td>{new Date(b.tanggal_pinjam).toLocaleDateString('id-ID')}</td>
                                <td>{b.hari_pinjam} hari</td>
                                <td>
                                    <strong className={b.estimated_denda > 0 ? 'text-danger' : 'text-success'}>
                                        Rp {b.estimated_denda.toLocaleString('id-ID')}
                                    </strong>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => requestReturnBook(b)}
                                        className="btn btn-sm btn-warning"
                                    >
                                        🔄 Kembalikan
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
)}
```

---

## Step 10: Test Everything (15 menit)

### Test Checklist:

```
✅ LOAD:
□ Dashboard loads without errors
□ Console has no red errors
□ Genres load correctly

✅ SEARCH & FILTER:
□ Click genre dropdown → books filter
□ Type in search box → books search
□ Combine genre filter + keyword search

✅ BROWSE & BORROW:
□ Can see book stock numbers
□ Click "Pinjam" on available book
□ Gets success message
□ Stock decreases
□ Book appears in "Buku Saya"

✅ ERROR HANDLING:
□ Try borrow same book twice → Shows error
□ Try borrow when no stock → Shows error
□ Check console for no RED errors (warnings OK)

✅ ADMIN:
□ Admin can still add/edit books
□ Admin can see pending returns
□ Admin can confirm returns
```

---

## Common Issues & Solutions

### Issue 1: "books is undefined"
**Solution**: Make sure you imported useBooks and called it:
```javascript
const { books, loading } = useBooks(); // ✅ Correct
```

### Issue 2: Genres not loading
**Solution**: Make sure fetchGenres() is called in useEffect:
```javascript
useEffect(() => {
    fetchGenres();  // ✅ Add this
}, []);
```

### Issue 3: Can't borrow books
**Solution**: Check browser console for error messages. Common issues:
- User ID not set correctly
- API endpoint not running
- Book stock is 0

### Issue 4: Loading spinner never stops
**Solution**: Make sure you're using new v2 endpoints:
```javascript
// ❌ Wrong - Old endpoint
await axios.post('/borrow', {...})

// ✅ Correct - Hook handles it internally
await borrowBook(userId, bookId)
```

---

## Migration Checklist

Complete these sequentially:

```
□ Step 1: Add imports
□ Step 2: Replace state with hooks
□ Step 3: Update useEffect
□ Step 4: Update kategori handler
□ Step 5: Update search handler
□ Step 6: Update pinjam handler
□ Step 7: Update return handler
□ Step 8: Update book list display
□ Step 9: Update "Buku Saya" tab
□ Step 10: Test everything

🎉 DONE! Your app is now using custom hooks!
```

---

## Before & After Comparison

### Before (Old Approach)
```
Component has:
- 10+ useState for books/categories/filters
- Multiple useEffect with axios calls
- Manual error handling
- Hard to test
- Bug-prone code
```

### After (New Approach)
```
Component has:
- 2 custom hooks
- 1 useEffect for initialization
- Automatic error handling
- Easy to test
- Clean, maintainable code
```

---

## Need Help?

1. **Check Documentation**: See FRONTEND_IMPROVEMENTS.md
2. **Check Examples**: Look at original useApi.js file
3. **Browser Console**: Check for error messages (F12)
4. **Network Tab**: Check API responses are correct
5. **Console logs**: Add `console.log()` to debug

---

## What's Next?

After successful frontend integration:

1. ✅ Migrate old code to hooks
2. ✅ Test complete flow
3. 🔄 Add form validation for add book modal
4. 🔄 Implement debounced search
5. 🔄 Optimize for mobile
6. 🔄 Add more error handling
7. 🔄 Setup CI/CD pipeline
8. 🔄 Deploy to production

---

**Time Estimate**: 1-2 hours total
**Difficulty**: Easy-Medium
**Support**: All necessary code provided, just copy-paste!

Good luck! 🚀
