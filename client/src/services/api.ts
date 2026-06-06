import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  getMe: () => api.get('/auth/me'),
};

export const booksAPI = {
  getBooks: (params?: {
    category?: string;
    search?: string;
    owner_id?: number;
    condition?: string;
    min_points?: number;
    max_points?: number;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_order?: string;
  }) => api.get('/books', { params }),
  getBook: (id: number) => api.get(`/books/${id}`),
  createBook: (book: any) => api.post('/books', book),
  getDriftRecords: (bookId: number) => api.get(`/books/${bookId}/drift-records`),
  addDriftRecord: (bookId: number, record: any) =>
    api.post(`/books/${bookId}/drift-records`, record),
  getCategories: () => api.get('/books/categories'),
  getSearchHistory: () => api.get('/books/search-history'),
  addSearchHistory: (keyword: string) =>
    api.post('/books/search-history', { keyword }),
  deleteSearchHistory: (id: number) =>
    api.delete(`/books/search-history/${id}`),
  clearSearchHistory: () => api.delete('/books/search-history'),
};

export const exchangesAPI = {
  getExchanges: () => api.get('/exchanges'),
  requestExchange: (bookId: number, message?: string) =>
    api.post('/exchanges', { book_id: bookId, message }),
  acceptExchange: (id: number) => api.post(`/exchanges/${id}/accept`),
  rejectExchange: (id: number) => api.post(`/exchanges/${id}/reject`),
};

export const topicsAPI = {
  getTopics: () => api.get('/topics'),
  getTopic: (id: number) => api.get(`/topics/${id}`),
  getPosts: (params?: {
    topic_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }) => api.get('/topics/posts', { params }),
  getPost: (id: number) => api.get(`/topics/posts/${id}`),
  createPost: (post: {
    title: string;
    content: string;
    topic_ids?: number[];
    images?: string[];
  }) => api.post('/topics/posts', post),
  getPostLikeStatus: (id: number) => api.get(`/topics/posts/${id}/like-status`),
  likePost: (id: number) => api.post(`/topics/posts/${id}/like`),
  unlikePost: (id: number) => api.post(`/topics/posts/${id}/unlike`),
  getComments: (postId: number) => api.get(`/topics/posts/${postId}/comments`),
  addComment: (postId: number, comment: {
    content: string;
    parent_id?: number | null;
    reply_to_user_id?: number;
  }) => api.post(`/topics/posts/${postId}/comments`, comment),
  likeComment: (id: number) => api.post(`/topics/comments/${id}/like`),
  unlikeComment: (id: number) => api.post(`/topics/comments/${id}/unlike`),
};

export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const wishlistsAPI = {
  getWishlists: () => api.get('/wishlists'),
  createWishlist: (name: string, description?: string) =>
    api.post('/wishlists', { name, description }),
  getWishlist: (id: number) => api.get(`/wishlists/${id}`),
  updateWishlist: (id: number, name?: string, description?: string) =>
    api.put(`/wishlists/${id}`, { name, description }),
  deleteWishlist: (id: number) => api.delete(`/wishlists/${id}`),
  addToWishlist: (wishlistId: number, bookId: number) =>
    api.post(`/wishlists/${wishlistId}/items`, { book_id: bookId }),
  removeFromWishlist: (wishlistId: number, bookId: number) =>
    api.delete(`/wishlists/${wishlistId}/items/${bookId}`),
  checkWishlistStatus: (bookId: number) =>
    api.get(`/wishlists/check/${bookId}`),
  batchRemoveFromWishlist: (wishlistId: number, bookIds: number[]) =>
    api.post(`/wishlists/${wishlistId}/items/batch-remove`, { book_ids: bookIds }),
};

export default api;
