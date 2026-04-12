## Frontend Improvements Summary

### Custom Hooks Created

#### 1. **useBooks Hook**
Manages books data with search and filtering

```javascript
const {
    books,           // Array of books
    genres,          // Available genres
    loading,         // Loading state
    error,           // Error message
    pagination,      // {page, limit, total, pages}
    filters,         // Current filters {keyword, genre_id}
    fetchBooks,      // (page, keyword?, genre_id?)
    fetchGenres,     // () - fetch available genres
    handleFilterChange, // (keyword, genre_id) - update filters and fetch
    getBook,         // (bookId) - get single book
    createBook,      // (bookData) - create new book
    updateBook,      // (bookId, bookData) - update book
    deleteBook       // (bookId) - delete book
} = useBooks();
```

**Usage Example:**
```jsx
const { books, genres, loading, handleFilterChange } = useBooks();

useEffect(() => {
    fetchGenres(); // Load genres on mount
    handleFilterChange('', null); // Load all books
}, []);

// Handle filter change
const handleGenreSelect = (genre_id) => {
    handleFilterChange('', genre_id);
};
```

#### 2. **useBorrowing Hook**
Manages borrowing operations and validation

```javascript
const {
    borrowedBooks,      // User's currently borrowed books
    loading,            // Loading state
    error,              // Error message
    borrowBook,         // (userId, bookId) - borrow book with validation
    checkCanBorrow,     // (userId, bookId) - check eligibility before borrowing
    fetchBorrowedBooks, // (userId) - get user's borrowed books
    requestReturn       // (transactionId, bookId, userId) - request return
} = useBorrowing();
```

**Usage Example:**
```jsx
const { borrowedBooks, borrowBook, checkCanBorrow } = useBorrowing();

// Check before showing borrow button
const handleBorrowClick = async (bookId) => {
    const { canBorrow, errors } = await checkCanBorrow(user.id, bookId);
    
    if (!canBorrow) {
        alert('Tidak bisa meminjam: ' + errors.join(', '));
        return;
    }
    
    try {
        await borrowBook(user.id, bookId);
        alert('Berhasil meminjam buku!');
        await fetchBorrowedBooks(user.id);
    } catch (err) {
        alert('Error: ' + err.message);
    }
};
```

#### 3. **useFormValidation Hook**
Generic form validation with error tracking

```javascript
const {
    values,        // Form values
    errors,        // { fieldName: errorMessage }
    touched,       // { fieldName: boolean } - track user interaction
    handleChange,  // Handle input changes
    handleBlur,    // Handle blur event (validates on blur)
    handleSubmit,  // (callback) => submit handler
    resetForm,     // Reset to initial values
    setValues,     // Set form values programmatically
    setErrors      // Set errors programmatically
} = useFormValidation(initialValues, validateFunction);
```

**Usage Example:**
```jsx
const initialValues = { judul: '', penulis: '', stok: '' };
const { values, errors, handleChange, handleBlur, handleSubmit } = 
    useFormValidation(initialValues, validateBook);

const onSubmit = async (formValues) => {
    await createBook(formValues);
};

return (
    <form onSubmit={handleSubmit(onSubmit)}>
        <input
            name="judul"
            value={values.judul}
            onChange={handleChange}
            onBlur={handleBlur}
        />
        {errors.judul && <div className="error">{errors.judul}</div>}
    </form>
);
```

### Validation Functions Available

#### validateBook(values)
Validates book data:
- `judul`: Required, 3+ characters
- `penulis`: Required
- `stok`: Non-negative integer
- `tahun_terbit`: Valid year (1000-current)

#### validateUser(values)
Validates user data:
- `username`: Required, 3+ characters, alphanumeric
- `password`: Required, 6+ characters
- `nama_lengkap`: Required

### Recommended UI/UX Improvements

#### 1. **Navigation Flow: Browse → Filter → Borrow**

Step 1: Browse Books
```
Dashboard → Student Tab → Select "Daftar Buku"
```

Step 2: Filter by Category
```
Show genre dropdown/buttons
onClick → handleFilterChange(null, genre_id)
Loading spinner while fetching
```

Step 3: View Book Details
```
Click Detail button → Show modal with:
- Full book info
- Genre display
- Check borrowing eligibility
```

Step 4: Borrow Book
```
Click Pinjam button
→ Verify availability
→ Check user eligibility (checkCanBorrow)
→ Create transaction
→ Show confirmation
→ Refresh borrowed books list
```

#### 2. **Error Handling Best Practices**

```jsx
// Show errors to user clearly
{error && (
    <div className="alert alert-danger">
        ❌ {error}
        {Array.isArray(errors) && (
            <ul>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
        )}
    </div>
)}

// Loading state
{loading && <div className="spinner-border">Loading...</div>}

// Empty state
{!loading && books.length === 0 && (
    <div className="alert alert-info">
        Tidak ada buku yang sesuai dengan filter
    </div>
)}
```

#### 3. **Responsive Design Checklist**

- [ ] Genre filter responsive on mobile (dropdown instead of buttons)
- [ ] Book grid uses grid-auto-fit for responsive layout
- [ ] Pagination buttons visible and clickable on small screens
- [ ] Form inputs full width on mobile
- [ ] Modal/dialog scales properly
- [ ] Table horizontal scroll on mobile

#### 4. **State Management Best Practices**

```jsx
// ✅ DO: Use custom hooks for data fetching
const { books, loading } = useBooks();

// ❌ DON'T: Mix UI state and API state
// const [books, setBooks] = useState([]);
// const [loading, setLoading] = useState(false);
// ... manual fetching ...

// ✅ DO: Separate filters and data
const [filters, setFilters] = useState({ keyword: '', genre_id: null });

// ❌ DON'T: Merge everything into one state
// const [bookState, setBookState] = useState({
//     books: [], filters: {}, loading: false, ...
// });
```

### Integration Steps

#### Step 1: Create hooks directory
```bash
mkdir -p frontend/src/hooks
# Move useApi.js to this directory
```

#### Step 2: Update Dashboard.jsx imports
```jsx
import { useBooks, useBorrowing, useFormValidation, validateBook } from '../hooks/useApi';
```

#### Step 3: Replace old state management in Dashboard.jsx
```jsx
// Old approach (to remove):
const [books, setBooks] = useState([]);
const [loading, setLoading] = useState(false);
// ... manual fetching ...

// New approach:
const { 
    books, 
    loading, 
    genres, 
    handleFilterChange,
    fetchBooks,
    fetchGenres 
} = useBooks();
```

#### Step 4: Implement in student tab
```jsx
{activeTabSiswa === 'katalog' && (
    <StudentBooksTab
        books={books}
        genres={genres}
        loading={loading}
        onFilterChange={handleFilterChange}
        onBorrow={borrowBook}
    />
)}
```

### Performance Optimizations Included

1. **Pagination**: Prevents loading entire database
   - Default: 20 items per page
   - Configurable limit (max 100 for API safety)

2. **Search Debouncing**: Recommended in component
   ```jsx
   const [searchValue, setSearchValue] = useState('');
   
   useEffect(() => {
       const timer = setTimeout(() => {
           handleFilterChange(searchValue, null);
       }, 500); // Debounce 500ms
       
       return () => clearTimeout(timer);
   }, [searchValue]);
   ```

3. **Conditional Fetching**: Only fetch when needed
   ```jsx
   useEffect(() => {
       if (activeTabSiswa === 'katalog') {
           fetchGenres();
           fetchBooks(1);
       }
   }, [activeTabSiswa]);
   ```

### Testing the Improvements

#### Test Book Search and Filter
```
1. Go to Student Dashboard
2. Select "Daftar Buku" tab
3. From genres dropdown, select a genre
4. Verify books filtered correctly
5. Enter keyword in search box
6. Verify books searched correctly
7. Combine genre filter + keyword search
```

#### Test Borrow Flow
```
1. Click "Pinjam" button on a book
2. System checks eligibility
3. If eligible: Show success message + refresh borrowed books
4. If not eligible: Show specific error messages
5. Check "Buku Saya" tab for newly borrowed book
6. Click "Kembalikan" button to request return
7. Verify request appears in admin's "Permintaan Pengembalian" tab
```

#### Test Error Handling
```
1. Borrow same book twice → Should show "Already borrowed"
2. Borrow with overdue books → Should show "Too many overdue"
3. Try to borrow unavailable book → Should show "Out of stock"
4. Invalid form submission → Should show validation errors
```

### API Endpoint Mapping

Hooks automatically use correct endpoints:
- `useBooks()` → `/books/v2/all`, `/books/v2/search`, `/genres`, etc.
- `useBorrowing()` → `/borrow/v2`, `/books/v2/:id/check-borrow`, `/return-request`
- Form validation → Server-side validation in API

No hardcoded endpoints in components = easier API migration later.
