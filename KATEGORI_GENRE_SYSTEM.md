# 📚 Kategori & Genre System Guide

## Overview

Sistem baru membedakan antara **Kategori** (physical type) dan **Genre** (story theme):

```
┌─────────────────────────────────────────────────────┐
│                      BUKU                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📦 KATEGORI (Physical Type)                       │
│  Tipe fisik/struktur buku:                        │
│  • Fiksi         • Non-Fiksi      • Komik         │
│  • Majalah       • Jurnal         • Biografi      │
│  • Puisi & Sastra• Referensi      • Pendidikan    │
│  • Panduan & Manual • Seni & Fotografi             │
│                                                     │
│  🎭 GENRE (Story Theme)                            │
│  Tema/isi cerita (khususnya fiksi):              │
│  • Horor         • Romance        • Sci-Fi        │
│  • Fantasi       • Misteri        • Thriller      │
│  • Drama         • Komedi         • Petualangan   │
│  • Dark Fantasy  • Historical Fiction              │
│  • Sains & Teknologi • Psikologi  • Bisnis        │
│  • Self-Help     • Kesehatan      • Kuliner       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Database Schema

### Categories Table
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(100) NOT NULL UNIQUE,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**12 Default Categories:**
1. **Fiksi** - Novel dan cerita fiksi (fiktif)
2. **Non-Fiksi** - Buku faktual dan informasi
3. **Komik** - Komik dan manga
4. **Majalah** - Publikasi berkala (majalah)
5. **Jurnal** - Jurnal dan publikasi ilmiah
6. **Biografi** - Biografi dan otobiografi
7. **Puisi & Sastra** - Puisi dan karya sastra
8. **Referensi** - Buku referensi dan ensiklopedi
9. **Pendidikan** - Buku teks dan materi pembelajaran
10. **Panduan & Manual** - Panduan praktis dan manual
11. **Seni & Fotografi** - Buku seni, desain, fotografi
12. **Lainnya** - Kategori lainnya

### Genres Table (Updated)
```sql
CREATE TABLE genres (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(100) NOT NULL UNIQUE,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**23 Default Genres (Story Themes):**

**Fiction Themes:**
1. Horor - Cerita seram dan menakutkan
2. Romance - Cerita cinta dan percintaan
3. Sci-Fi - Sains fiksi dan futuristik
4. Fantasi - Dunia fantasi dan magic
5. Misteri - Cerita detektif dan misteri
6. Thriller - Cerita penuh tegang dan aksi
7. Drama - Cerita dramatis dan emosional
8. Komedi - Cerita lucu dan menghibur
9. Petualangan - Cerita petualangan
10. Dark Fantasy - Fantasi gelap dan seram
11. Historical Fiction - Fiksi yang berlatar sejarah

**Non-Fiction Themes:**
12. Sejarah - Buku sejarah dan peradaban
13. Sains & Teknologi - Ilmu pengetahuan dan teknologi
14. Psikologi - Psikologi dan perilaku manusia
15. Filosofi - Filsafat dan pemikiran
16. Bisnis & Ekonomi - Bisnis, ekonomi, dan keuangan
17. Self-Help - Pengembangan diri dan motivasi
18. Kesehatan & Wellness - Kesehatan, diet, dan kebugaran
19. Kuliner - Resep dan panduan memasak
20. Perjalanan - Panduan dan cerita perjalanan

**Universal Themes:**
21. Anak-anak - Konten untuk anak-anak
22. Seni & Desain - Seni, desain, dan arsitektur
23. Lainnya - Genre lainnya

### Books Table (Updated)
```sql
ALTER TABLE books ADD COLUMN category_id INT;
ALTER TABLE books ADD COLUMN genre_id INT;

ALTER TABLE books 
ADD CONSTRAINT fk_books_category 
FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE books 
ADD CONSTRAINT fk_books_genre 
FOREIGN KEY (genre_id) REFERENCES genres(id);
```

## How It Works

### 1. Category Detection (Physical Type)
Ketika import dari OpenLibrary, sistem detect tipe fisik buku:

```
Input: OpenLibrary subjects
  - "Comic books"
  - "Graphic novels"
  
Detection: CATEGORY_MAPPING matches "comic"
  
Output: category_id = 3 (Komik)
```

**CATEGORY_MAPPING Contoh:**
```js
- 'comics', 'comic books', 'manga' → 'Komik'
- 'magazine', 'journals' → 'Majalah'
- 'biography', 'autobiography' → 'Biografi'
- 'poetry', 'short stories', 'drama' → 'Puisi & Sastra'
- 'reference', 'encyclopedia' → 'Referensi'
```

### 2. Genre Detection (Story Theme)
Setelah kategori, sistem detect tema cerita:

```
Input: Book subjects
  - "Superhero stories"
  - "Magic"
  - "Fantasy worlds"
  
Detection: GENRE_MAPPING matches "magic" & "fantasy"
  
Output: genre_id = 4 (Fantasi)
```

**GENRE_MAPPING Contoh (100+ keywords):**
```js
// Horor keywords
'horror', 'scary', 'paranormal', 'supernatural', 'ghost', 
'vampire', 'werewolf', 'dark'

// Romance keywords
'romance', 'love', 'romantic', 'love stories'

// Sci-Fi keywords
'science fiction', 'sci-fi', 'futuristic', 'space', 
'cyberpunk', 'dystopian', 'alien'

// Fantasi keywords
'fantasy', 'magical', 'magic', 'wizard', 'dragon', 'elf'

// Misteri keywords
'mystery', 'detective', 'crime', 'murder'

// ... dan 60+ lainnya
```

## API Flow

### GET /books/search-openlib?q=harry potter

**Response includes:**
```json
{
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "category": "Fiksi",
  "genre": "Fantasi",
  "openLibData": { "subject_facets": [...], "subject": [...] }
}
```

### POST /books/import-openlib

**Request:**
```json
{
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "publisher": "Bloomsbury",
  "year": 1997,
  "cover_url": "...",
  "openLibData": { /* dari search result */ }
}
```

**Processing:**
```
1. Extract subjects dari openLibData
   → subject_facets: ["Fantasy fiction", "Wizards", "Magic"]
   
2. Determine CATEGORY
   → No match dalam CATEGORY_MAPPING
   → Default: "Lainnya" (category_id = 12)
   
   TAPI BISA:
   - author_name contains "J.K." → might be book type fiction
   - Actually default Fiksi: category_id = 1
   
3. Determine GENRE
   → "Wizards" matches 'wizard' → Fantasi
   → "Magic" matches 'magic' → Fantasi
   → Selected: "Fantasi" (genre_id = 4)
   
4. Insert to database
   INSERT INTO books (kategori, category_id, genre_id, ...)
   VALUES ('Fiksi', 1, 4, ...)
```

**Response:**
```json
{
  "message": "Buku berhasil diimport dari Open Library",
  "book": {
    "id": 42,
    "title": "Harry Potter and the Philosopher's Stone",
    "categoryId": 1,
    "categoryName": "Fiksi",
    "genreId": 4,
    "genreName": "Fantasi"
  }
}
```

## Examples

### Example 1: Comic Book
```
OpenLibrary: "Manga", "Graphic novel", "Superhero"
Category Detection: 'comics', 'manga' → Komik (id: 3)
Genre Detection: 'superhero' → No direct match → Lainnya (id: 23)
Result:
  kategori: "Komik"
  category_id: 3
  genre_id: 23
```

### Example 2: Science Fiction Novel
```
OpenLibrary: "Science fiction", "Dystopian fiction", "Space travel"
Category Detection: 'fiction' implied → Fiksi (id: 1)
Genre Detection: 'science fiction' → Sci-Fi (id: 3)
Result:
  kategori: "Fiksi"
  category_id: 1
  genre_id: 3
```

### Example 3: Magazine
```
OpenLibrary: "Magazine", "Periodical", "News"
Category Detection: 'magazine' → Majalah (id: 4)
Genre Detection: "News" → No match → Lainnya (id: 23)
Result:
  kategori: "Majalah"
  category_id: 4
  genre_id: 23
```

### Example 4: Self-Help Book
```
OpenLibrary: "Self-help", "Personal development", "Psychology"
Category Detection: No match → Lainnya (id: 12)
Genre Detection: 'self-help' or 'personal development' → Self-Help (id: 17)
Result:
  kategori: "Lainnya"
  category_id: 12
  genre_id: 17
```

## Implementation Details

### Functions

#### `mapOpenLibSubjectToCategory(subject: string)`
Maps OpenLibrary subject to physical book type.

```js
mapOpenLibSubjectToCategory('manga')    // → 'Komik'
mapOpenLibSubjectToCategory('magazine') // → 'Majalah'
mapOpenLibSubjectToCategory('unknown')  // → null
```

#### `getBestCategoryIdFromOpenLib(doc, db)`
Extracts category from OpenLibrary data:
- Try subject_facets
- Try subject field
- Fallback to 'Lainnya'

Returns: `{ id: number, nama: string }`

#### `mapOpenLibSubjectToGenre(subject: string)`
Maps subject to story theme.

```js
mapOpenLibSubjectToGenre('fantasy')     // → 'Fantasi'
mapOpenLibSubjectToGenre('romance')     // → 'Romance'
mapOpenLibSubjectToGenre('unknown')     // → null
```

#### `getBestGenreIdFromOpenLib(doc, db)`
Extracts genre from OpenLibrary data:
- Try subject_facets
- Try subject field
- Fallback to 'Lainnya'

Returns: `{ id: number, nama: string }`

## Frontend Integration

### When Searching Books

```js
const [bookResults, setBookResults] = useState([]);

async function searchOpenLibrary(query) {
  const response = await fetch(`/books/search-openlib?q=${query}`);
  const results = await response.json();
  // results now include: title, author, category, genre, openLibData
}
```

### When Importing Books

```js
async function importBook(book) {
  const response = await fetch('/books/import-openlib', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      year: book.year,
      cover_url: book.cover_url,
      openLibData: book.openLibData  // IMPORTANT!
    })
  });
  
  const result = await response.json();
  console.log(`Book imported as ${result.book.categoryName} - ${result.book.genreName}`);
}
```

## Filtering & Display

### Filter by Category
```sql
SELECT * FROM books WHERE category_id = 1; -- Fiksi
SELECT * FROM books b 
  JOIN categories c ON b.category_id = c.id 
  WHERE c.nama = 'Komik';
```

### Filter by Genre
```sql
SELECT * FROM books WHERE genre_id = 4; -- Fantasi
SELECT * FROM books b 
  JOIN genres g ON b.genre_id = g.id 
  WHERE g.nama = 'Horror';
```

### Get with Both
```sql
SELECT b.*, 
       c.nama as category_name,
       g.nama as genre_name
FROM books b
  LEFT JOIN categories c ON b.category_id = c.id
  LEFT JOIN genres g ON b.genre_id = g.id
WHERE category_id = 1 AND genre_id = 4;
```

## Future Enhancements

1. **Admin Interface** - Edit category/genre assignments
2. **Machine Learning** - Better genre prediction using NLP
3. **User Feedback** - Let users suggest/correct classifications
4. **Statistics** - Show distribution of books by category/genre
5. **Smart Search** - Search by category OR genre combined
6. **Recommendations** - Recommend books based on category + genre preferences

## Installation

Run migration to setup categories and update genres:

```bash
cd backend
node add-categories.js
```

What it does:
- ✅ Creates `categories` table with 12 default categories
- ✅ Adds `category_id` column to `books` table
- ✅ Updates `genres` table with 23 story themes
- ✅ Creates FK constraints

## Troubleshooting

### Problem: Books always "Lainnya" category
**Check:**
- Is openLibData being passed to import endpoint?
- Does book have subject_facets or subject field?

**Solution:**
- Pass full openLibData object from search result
- Check console logs for debugging

### Problem: Genre detection seems wrong
**Cause:**
- Keyword matching is partial, so "superhero" matches "hero" 
- Multiple keywords match, first one is used

**Solution:**
- Check GENRE_MAPPING order
- Add more specific keywords earlier
- Consider machine learning approach

---

**Created:** v2.1
**Updated:** 2026-04-12
**Status:** Production Ready
