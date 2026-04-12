/**
 * Custom React Hooks for UKK Perpustakaan
 * - API data fetching
 * - State management
 * - Validation
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

// ===== HOOKS FOR BOOKS MANAGEMENT =====

/**
 * Hook for fetching and managing books with search/filter
 */
export const useBooks = () => {
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [filters, setFilters] = useState({ keyword: '', genre_id: null });

    // Fetch genres once
    const fetchGenres = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/genres`);
            if (res.data.success) {
                setGenres(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching genres:', err);
        }
    }, []);

    // Fetch books based on filters
    const fetchBooks = useCallback(async (page = 1, keyword = '', genre_id = null) => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_BASE}/books/v2/all?page=${page}&limit=${pagination.limit}`;
            
            if (keyword) {
                url = `${API_BASE}/books/v2/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${pagination.limit}`;
                if (genre_id) {
                    url += `&genre_id=${genre_id}`;
                }
            } else if (genre_id) {
                url = `${API_BASE}/books/v2/search?genre_id=${genre_id}&page=${page}&limit=${pagination.limit}`;
            }

            const res = await axios.get(url);
            if (res.data.success) {
                setBooks(res.data.data.data);
                setPagination(prev => ({
                    ...prev,
                    ...res.data.data.pagination
                }));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch books');
            console.error('Fetch books error:', err);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    // Handle filter changes
    const handleFilterChange = useCallback((keyword = '', genre_id = null) => {
        setFilters({ keyword, genre_id });
        fetchBooks(1, keyword, genre_id);
    }, [fetchBooks]);

    // Get single book
    const getBook = useCallback(async (bookId) => {
        try {
            const res = await axios.get(`${API_BASE}/books/v2/${bookId}`);
            if (res.data.success) {
                return res.data.data;
            }
        } catch (err) {
            console.error('Error getting book:', err);
            throw err;
        }
    }, []);

    // Create book
    const createBook = useCallback(async (bookData) => {
        try {
            const res = await axios.post(`${API_BASE}/books/v2`, bookData);
            if (res.data.success) {
                await fetchBooks(pagination.page, filters.keyword, filters.genre_id);
                return res.data.data;
            }
        } catch (err) {
            throw err.response?.data || err;
        }
    }, [fetchBooks, pagination.page, filters]);

    // Update book
    const updateBook = useCallback(async (bookId, bookData) => {
        try {
            const res = await axios.put(`${API_BASE}/books/v2/${bookId}`, bookData);
            if (res.data.success) {
                await fetchBooks(pagination.page, filters.keyword, filters.genre_id);
                return res.data.data;
            }
        } catch (err) {
            throw err.response?.data || err;
        }
    }, [fetchBooks, pagination.page, filters]);

    // Delete book
    const deleteBook = useCallback(async (bookId) => {
        try {
            const res = await axios.delete(`${API_BASE}/books/v2/${bookId}`);
            if (res.data.success) {
                await fetchBooks(pagination.page, filters.keyword, filters.genre_id);
                return true;
            }
        } catch (err) {
            throw err.response?.data || err;
        }
    }, [fetchBooks, pagination.page, filters]);

    return {
        books,
        genres,
        loading,
        error,
        pagination,
        filters,
        fetchBooks,
        fetchGenres,
        handleFilterChange,
        getBook,
        createBook,
        updateBook,
        deleteBook
    };
};

// ===== HOOKS FOR BORROWING =====

/**
 * Hook for borrowing management
 */
export const useBorrowing = () => {
    const [borrowedBooks, setBorrowedBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if user can borrow
    const checkCanBorrow = useCallback(async (userId, bookId) => {
        try {
            await axios.post(`${API_BASE}/books/v2/${bookId}/check-borrow`, {
                user_id: userId
            });
            return { canBorrow: true, errors: [] };
        } catch (err) {
            return {
                canBorrow: false,
                errors: err.response?.data?.errors || [err.response?.data?.message || 'Cannot borrow book']
            };
        }
    }, []);

    // Borrow book
    const borrowBook = useCallback(async (userId, bookId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_BASE}/borrow/v2`, {
                user_id: userId,
                book_id: bookId
            });
            if (res.data.success) {
                return res.data.data;
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to borrow book';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Get user's borrowed books
    const fetchBorrowedBooks = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE}/my-borrowed-books/${userId}`);
            setBorrowedBooks(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch borrowed books');
            console.error('Fetch borrowed books error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Request return
    const requestReturn = useCallback(async (transactionId, bookId, userId) => {
        try {
            const res = await axios.post(`${API_BASE}/return-request`, {
                transaction_id: transactionId,
                book_id: bookId,
                user_id: userId
            });
            if (res.data.success) {
                await fetchBorrowedBooks(userId);
                return true;
            }
        } catch (err) {
            throw err.response?.data || err;
        }
    }, [fetchBorrowedBooks]);

    return {
        borrowedBooks,
        loading,
        error,
        borrowBook,
        checkCanBorrow,
        fetchBorrowedBooks,
        requestReturn
    };
};

// ===== HOOKS FOR FORM VALIDATION =====

/**
 * Hook for form validation
 */
export const useFormValidation = (initialValues, validate) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setValues(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    }, [errors]);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouched(prev => ({
            ...prev,
            [name]: true
        }));
        
        // Validate on blur
        const fieldErrors = validate(values);
        if (fieldErrors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: fieldErrors[name]
            }));
        }
    }, [validate, values]);

    const handleSubmit = useCallback((callback) => {
        return async (e) => {
            e.preventDefault();
            
            // Validate all fields
            const fieldErrors = validate(values);
            setErrors(fieldErrors);
            
            // Mark all fields as touched
            setTouched(Object.keys(values).reduce((acc, key) => ({
                ...acc,
                [key]: true
            }), {}));

            if (Object.keys(fieldErrors).length === 0) {
                try {
                    await callback(values);
                } catch (err) {
                    console.error('Form submission error:', err);
                }
            }
        };
    }, [validate, values]);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    return {
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
        resetForm,
        setValues,
        setErrors
    };
};

// ===== VALIDATION RULES =====

export const validateBook = (values) => {
    const errors = {};

    if (!values.judul || !values.judul.trim()) {
        errors.judul = 'Judul buku harus diisi';
    } else if (values.judul.trim().length < 3) {
        errors.judul = 'Judul minimal 3 karakter';
    }

    if (!values.penulis || !values.penulis.trim()) {
        errors.penulis = 'Penulis harus diisi';
    }

    if (values.stok !== undefined && values.stok !== '') {
        const stok = parseInt(values.stok);
        if (isNaN(stok) || stok < 0) {
            errors.stok = 'Stok harus angka positif';
        }
    }

    if (values.tahun_terbit && values.tahun_terbit !== '') {
        const tahun = parseInt(values.tahun_terbit);
        const currentYear = new Date().getFullYear();
        if (isNaN(tahun) || tahun < 1000 || tahun > currentYear) {
            errors.tahun_terbit = `Tahun harus antara 1000 dan ${currentYear}`;
        }
    }

    return errors;
};

export const validateUser = (values) => {
    const errors = {};

    if (!values.username || !values.username.trim()) {
        errors.username = 'Username harus diisi';
    } else if (values.username.trim().length < 3) {
        errors.username = 'Username minimal 3 karakter';
    }

    if (!values.password || values.password.length < 6) {
        errors.password = 'Password minimal 6 karakter';
    }

    if (!values.nama_lengkap || !values.nama_lengkap.trim()) {
        errors.nama_lengkap = 'Nama lengkap harus diisi';
    }

    return errors;
};
