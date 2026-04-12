# 📚 Genre Mapping Guide - OpenLibrary Integration

## Overview

Sistem genre mapping ini menghubungkan kategori/subject dari OpenLibrary API ke genre lokal yang terdefinisi di database.

## Bagaimana Cara Kerjanya?

### 1. **Ekstraksi Subject dari OpenLibrary**

Ketika search buku dari OpenLibrary, sistem mencari subject di field:
- `subject_facets` (prioritas 1 - paling akurat)
- `subject` (prioritas 2)
- `classifications_top` (prioritas 3)

Contoh dari OpenLibrary:
```json
{
  "title": "Harry Potter and the Philosopher's Stone",
  "subject_facets": ["Fantasy fiction", "Wizards--Fiction", "Hogwarts School of Witchcraft"],
  "subject": ["Magic--Fiction", "Boarding schools--Fiction", ...]
}
```

### 2. **Mapping Subject ke Genre Lokal**

Subject yang sudah diekstrak di-mapping ke 18 genre lokal:

```
OpenLibrary Subject          →  Genre Lokal
─────────────────────────────────────────
Fantasy, Magic, Wizards      →  Fiksi
History, Historical          →  Sejarah
Biography, Autobiography     →  Biografi
Romance, Love stories        →  Romantis
Mystery, Detective           →  Misteri
Science, Technology          →  Sains & Teknologi
Psychology, Health           →  Psikologi
Self-improvement, Motivation →  Self-Help
Cooking, Recipes             →  Kuliner
Travel, Adventure            →  Perjalanan
Art, Design, Architecture    →  Seni & Desain
Poetry, Poems, Drama         →  Puisi & Sastra
Education, Reference         →  Pendidikan
Religion, Spirituality       →  Agama
Children, Juvenile           →  Anak-anak
Comics, Manga                →  Komik
Non-fiction                  →  Non-Fiksi
```

### 3. **Lookup Genre ID dari Database**

Setelah genre name di-tentukan, sistem query database untuk dapatkan `genre_id`:

```sql
SELECT id FROM genres WHERE nama = 'Fiksi'
-- Result: id = 1
```

### 4. **Insert Buku dengan Genre ID yang Tepat**

Book di-insert dengan proper FK ke genres table:

```sql
INSERT INTO books 
(judul, penulis, penerbit, kategori, tahun_terbit, stok, cover_url, genre_id) 
VALUES ('Harry Potter...', 'J.K. Rowling', 'Bloomsbury', 'Diimpor dari Open Library', 1997, 1, 'http://...', 1)
```

## 📋 Genre Mapping Dictionary

Sistem mendukung 70+ mapping otomatis:

### Fiction Group
```
'fiction', 'novel', 'novels', 'literature'
'science fiction', 'fantasy', 'mystery', 'detective'
'thriller', 'romance', 'love stories', 'drama'
'historical fiction'
```

### Non-Fiction Group
```
'non-fiction', 'history', 'historical'
'biography', 'autobiography', 'memoir'
```

### Academic Group
```
'science', 'technology', 'physics', 'chemistry'
'mathematics', 'biology', 'engineering'
'programming', 'computer science'
'education', 'textbook', 'reference'
```

### Lifestyle Group
```
'psychology', 'self-help', 'self improvement'
'health', 'wellness', 'personal development'
'motivation', 'cooking', 'recipes', 'food'
'travel', 'adventure'
```

### Creative Group
```
'art', 'design', 'architecture', 'painting'
'poetry', 'poems', 'short stories', 'plays'
```

### Spiritual Group
```
'religion', 'spirituality', 'christianity'
'islam', 'buddhism', 'philosophy'
```

### Entertainment Group
```
'children', 'juvenile', 'comics', 'comic books'
'manga', 'animation'
```

## 🔍 Matching Algorithm

### Exact Match
```js
const mappedGenre = GENRE_MAPPING['fantasy']
// Result: 'Fiksi'
```

### Partial Match (Fallback)
```js
const subject = 'science fiction books'
// Checks if 'science fiction' is contained in subject
// Finds 'science fiction' in GENRE_MAPPING
// Result: 'Fiksi'
```

## 📊 Logging & Debugging

Setiap import operation menghasilkan detailed logs:

```
🔍 Extracting genres for: "Harry Potter and the Philosopher's Stone"
  📚 Found subject_facets: Fantasy fiction, Wizards--Fiction, Hogwarts School of Witchcraft
  ✅ Mapped "Fantasy fiction" → "Fiksi"
  🎨 Selected genre: "Fiksi"
  🔗 Genre ID: 1
✅ Book imported successfully with genre_id: 1
```

## 🛠️ API Endpoints

### GET /books/search-openlib?q=harry potter

**Response:**
```json
[
  {
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "genre": "Fiksi",
    "cover_url": "https://covers.openlibrary.org/...",
    "openLibData": { /* Full OpenLibrary object */ }
  }
]
```

### POST /books/import-openlib

**Request:**
```json
{
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "publisher": "Bloomsbury",
  "year": 1997,
  "cover_url": "https://covers.openlibrary.org/...",
  "openLibData": { /* Full OpenLibrary object from search */ }
}
```

**Response:**
```json
{
  "message": "Buku berhasil diimport dari Open Library",
  "genreId": 1,
  "bookId": 42
}
```

## ⚙️ Implementation Details

### Functions

#### `mapOpenLibSubjectToGenre(subject)`
- Input: String dari OpenLibrary subject
- Process: Matching ke GENRE_MAPPING (exact + partial)
- Output: Genre name atau null

**Code:**
```js
function mapOpenLibSubjectToGenre(subject) {
    const lowerSubject = subject.toLowerCase().trim();
    
    // Direct match
    if (GENRE_MAPPING[lowerSubject]) {
        return GENRE_MAPPING[lowerSubject];
    }
    
    // Partial match
    for (const [key, genre] of Object.entries(GENRE_MAPPING)) {
        if (lowerSubject.includes(key)) {
            return genre;
        }
    }
    
    return null;
}
```

#### `getBestGenreIdFromOpenLib(doc, db)`
- Input: OpenLibrary document object + database connection
- Process: Extract subjects → Map → Lookup genre_id
- Output: Genre ID atau null

**Code Flow:**
1. Try subject_facets → extract & map
2. Try subject field → extract & map
3. Query database untuk genre_id
4. Return null jika tidak ada match

#### `getGenreFromOpenLib(doc)`
- Input: OpenLibrary document object
- Process: Extract & map genres untuk display
- Output: Genre name string (comma-separated kalau multiple)

**Used for:** Search results display

## 🚀 Future Improvements

### Possible Enhancements
1. **Machine Learning**: Gunakan NLP untuk lebih akurat genre detection
2. **User Feedback**: Biarkan user correct/override genre saat import
3. **Genre Aliases**: Support multiple genre names untuk same category
4. **Trend Analysis**: Lihat genre distribution dari imported books
5. **Custom Mapping**: Admin dapat customize mapping rules

### Integration with External APIs
- Support untuk API lain selain OpenLibrary (Google Books, etc)
- Unified genre handling across sources
- Smart conflict resolution ketika multiple sources punya genre berbeda

## 📝 Examples

### Example 1: Science Fiction Book
```
OpenLibrary: "Science fiction", "Dystopian fiction", "Technology"
Mapping: 'science fiction' → 'Fiksi'
Result: genre_id = 1 (Fiksi)
```

### Example 2: Historical Biography
```
OpenLibrary: "Biography", "History", "Presidents--United States"
Mapping: 'biography' → 'Biografi' (first match)
Result: genre_id = 7 (Biografi)
```

### Example 3: Self-Help Book
```
OpenLibrary: "Self-improvement", "Psychology", "Motivation"
Mapping: 'self-help' → 'Self-Help' (partial match)
Result: genre_id = 14 (Self-Help)
```

### Example 4: No Clear Match
```
OpenLibrary: "Obscure subject X", "Rare category Y"
Mapping: No match found
Result: genre_id = null → Use 'Uncategorized' (id = 18)
```

## 🐛 Troubleshooting

### Problem: Genre selalu "Uncategorized"
**Check:**
1. OpenLibrary data include subject_facets atau subject fields?
2. Subject keywords ada di GENRE_MAPPING?
3. Database genres table ada genre dengan nama itu?

**Solution:**
- Add lebih banyak mapping keywords
- Cek console logs untuk lihat apa subject yang di-extract

### Problem: Genre salah
**Cause:**
- Subject terlalu generic atau ambigu
- Mapping keyword cocok dengan multiple genres

**Solution:**
- Improve subject extraction (gunakan lebih specific fields)
- Prioritize more specific mappings (check partial match order)
- Let admin override genre saat import

## 📚 Related Files

- `backend/index.js` - Main implementation
- `backend/optimize-schema.js` - Genres table creation
- `backend/migrate.js` - Database migration
- `README.md` - Project overview

## 🔗 Links

- [OpenLibrary API Docs](https://openlibrary.org/developers/api)
- [OpenLibrary Search API](https://openlibrary.org/search.json?title=...)
- Project: UKK Perpustakaan v2.0
