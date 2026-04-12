# Return Book Workflow - Admin-Only Security

## Overview
Updated book return logic to restrict return acceptance (confirmation) to admins only. Students can request returns, but only admins can approve/confirm them.

## Changes Made

### 1. POST `/return` (Deprecated)
**Purpose**: Direct book return endpoint (legacy, non-workflow)  
**Access Control**: ✅ **ADMIN ONLY**

**Behavior**:
- Requires `user_id` in request body to validate admin role
- Returns 403 Forbidden if user is not admin
- Calculates fine based on return date
- Updates transaction status to "kembali" directly
- Recommended: Use `/return-request` + `/confirm-return` workflow instead

**Request**:
```json
{
  "transaction_id": 1,
  "book_id": 5,
  "user_id": 2  // Must be admin
}
```

**Success Response**:
```json
{
  "message": "Buku Dikembalikan",
  "selisih_hari": 10,
  "denda": 6000,
  "keterangan": "Buku terlambat 3 hari. Denda: Rp 6000"
}
```

**Error Response** (Non-admin):
```json
{
  "success": false,
  "message": "Akses ditolak. Hanya admin yang dapat mengembalikan buku langsung. Silakan gunakan /return-request untuk mengajukan permintaan."
}
```

---

### 2. POST `/return-request` (Student Request)
**Purpose**: Student requests book return (workflow initiator)  
**Access Control**: ✅ **Open to all users** (typically students)

**Behavior**:
- Validates transaction exists and belongs to user
- Updates transaction status to "diminta_kembali" (pending admin confirmation)
- Records request date and time
- No role check needed - students submit requests

**Request**:
```json
{
  "transaction_id": 1,
  "book_id": 5,
  "user_id": 3  // Student ID
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Permintaan pengembalian buku dikirim. Menunggu konfirmasi dari admin.",
  "transaction_id": 1
}
```

---

### 3. GET `/pending-returns` (Admin View)
**Purpose**: Admin views all pending return requests awaiting confirmation  
**Access Control**: ✅ **ADMIN ONLY** (NEW)

**Behavior**:
- Requires `user_id` query parameter to validate admin role
- Returns 403 Forbidden if user is not admin
- Fetches all transactions with status "diminta_kembali"
- Shows student name, class, book title, and request timestamps
- Sorted by most recent requests first

**Request**:
```
GET /pending-returns?user_id=2
```

**Success Response**:
```json
[
  {
    "id": 1,
    "user_id": 3,
    "nama_lengkap": "Budi Santoso",
    "kelas": "XII IPA 1",
    "book_id": 5,
    "judul": "Harry Potter and the Philosopher's Stone",
    "penulis": "J.K. Rowling",
    "tanggal_pinjam": "2024-01-15",
    "tanggal_permintaan_kembali": "2024-01-28",
    "waktu_permintaan_kembali": "14:30:00",
    "status": "diminta_kembali"
  }
]
```

**Error Response** (Non-admin):
```json
{
  "success": false,
  "message": "Akses ditolak. Hanya admin yang dapat melihat daftar pengembalian buku pending."
}
```

---

### 4. POST `/confirm-return/:transactionId` (Admin Confirm)
**Purpose**: Admin confirms/approves student's return request  
**Access Control**: ✅ **ADMIN ONLY** (NEW)

**Behavior**:
- Requires `user_id` in request body to validate admin role
- Returns 403 Forbidden if user is not admin
- Validates transaction exists and status is "diminta_kembali"
- Calculates fine based on lending period
- Updates transaction to "kembali" with fine amount
- Increases book stock by 1
- Records confirmation time

**Request**:
```json
{
  "user_id": 2  // Must be admin
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Pengembalian buku dikonfirmasi",
  "transaction_id": 1,
  "selisih_hari": 13,
  "denda": 12000,
  "keterangan": "Buku terlambat 6 hari. Denda: Rp 12000"
}
```

**Error Response** (Non-admin):
```json
{
  "success": false,
  "message": "Akses ditolak. Hanya admin yang dapat mengonfirmasi pengembalian buku."
}
```

---

## Return Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ RETURN WORKFLOW (Student Request → Admin Confirmation)     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. STUDENT REQUEST RETURN                                  │
│     POST /return-request                                    │
│     Body: {transaction_id, book_id, user_id}               │
│     Status Change: dipinjam → diminta_kembali              │
│     Access: ✅ Student/User (anyone)                        │
│                                                              │
│  2. ADMIN VIEWS PENDING                                     │
│     GET /pending-returns?user_id=<admin_id>                │
│     Returns list of diminta_kembali transactions           │
│     Access: ✅ ADMIN ONLY (403 if non-admin)               │
│                                                              │
│  3. ADMIN CONFIRMS RETURN                                   │
│     POST /confirm-return/:transactionId                    │
│     Body: {user_id: <admin_id>}                            │
│     Status Change: diminta_kembali → kembali               │
│     Fine Auto-calculated: 7 day limit, Rp 2000/day         │
│     Access: ✅ ADMIN ONLY (403 if non-admin)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Summary

| Endpoint | Method | Access | Notes |
|----------|--------|--------|-------|
| `/return` | POST | Admin Only | Legacy direct return (deprecated) |
| `/return-request` | POST | Public | Students request returns |
| `/pending-returns` | GET | Admin Only | NEW: Role check added |
| `/confirm-return/:transactionId` | POST | Admin Only | NEW: Role check added |

### Key Security Features:
1. ✅ **Role Verification**: All admin endpoints verify `user_id` against database role
2. ✅ **403 Forbidden**: Non-admins receive proper error responses
3. ✅ **Server-Side Validation**: Role checks happen on backend, not client-side
4. ✅ **Clear Error Messages**: Users understand why access is denied
5. ✅ **Audit Trail**: All confirmations logged with admin user_id

---

## Fine Calculation

**Rules**:
- Maksimal peminjaman: 7 hari
- Denda keterlambatan: Rp 2000 per hari (hanya jika melewati 7 hari)

**Example**:
- Dipinjam: 15 Januari
- Dikembalikan: 28 Januari (13 hari)
- Terlambat: 13 - 7 = 6 hari
- Denda: 6 × Rp 2000 = Rp 12000

---

## Testing

### Test 1: Student requests return (should succeed)
```bash
curl -X POST http://localhost:5000/return-request \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1,
    "book_id": 5,
    "user_id": 3
  }'
```

### Test 2: View pending returns as admin (should succeed)
```bash
curl -X GET "http://localhost:5000/pending-returns?user_id=2"
```

### Test 3: View pending returns as student (should fail with 403)
```bash
curl -X GET "http://localhost:5000/pending-returns?user_id=3"
```

### Test 4: Confirm return as admin (should succeed)
```bash
curl -X POST http://localhost:5000/confirm-return/1 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2
  }'
```

### Test 5: Confirm return as student (should fail with 403)
```bash
curl -X POST http://localhost:5000/confirm-return/1 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3
  }'
```

---

## Frontend Integration Notes

### For Students:
After borrowing a book, show a "Request Return" button that calls:
```javascript
POST /return-request
Body: { transaction_id, book_id, user_id }
```

### For Admins:
1. Add route to view pending returns:
```javascript
GET /pending-returns?user_id=<admin_id>
```

2. Display pending returns with "Confirm Return" button that calls:
```javascript
POST /confirm-return/:transactionId
Body: { user_id: <admin_id> }
```

---

## Implementation Date
Updated in latest commit - Admin-only restriction enforced for return confirmation endpoints.
