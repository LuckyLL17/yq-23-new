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

export default api;
