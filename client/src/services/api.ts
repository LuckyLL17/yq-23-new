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
  getExchange: (id: number) => api.get(`/exchanges/${id}`),
  requestExchange: (bookId: number, message?: string, borrowDays?: number) =>
    api.post('/exchanges', { book_id: bookId, message, borrow_days: borrowDays }),
  acceptExchange: (id: number) => api.post(`/exchanges/${id}/accept`),
  rejectExchange: (id: number) => api.post(`/exchanges/${id}/reject`),
  cancelExchange: (id: number) => api.post(`/exchanges/${id}/cancel`),
  startExchange: (id: number) => api.post(`/exchanges/${id}/start`),
  completeExchange: (id: number) => api.post(`/exchanges/${id}/complete`),
  reviewExchange: (id: number, rating: number, comment?: string) =>
    api.post(`/exchanges/${id}/review`, { rating, comment }),
  getExchangeReviews: (id: number) => api.get(`/exchanges/${id}/reviews`),
  getUserReviews: (userId: number) => api.get(`/exchanges/user/${userId}/reviews`),
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

export const goalsAPI = {
  getGoals: () => api.get('/goals'),
  createGoal: (goal: {
    title: string;
    description?: string;
    target_books: number;
    start_date: string;
    end_date: string;
  }) => api.post('/goals', goal),
  getGoal: (id: number) => api.get(`/goals/${id}`),
  updateGoal: (id: number, data: {
    title?: string;
    description?: string;
    target_books?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) => api.put(`/goals/${id}`, data),
  deleteGoal: (id: number) => api.delete(`/goals/${id}`),
  addBookToGoal: (goalId: number, bookId: number) =>
    api.post(`/goals/${goalId}/books`, { book_id: bookId }),
  removeBookFromGoal: (goalId: number, bookId: number) =>
    api.delete(`/goals/${goalId}/books/${bookId}`),
  completeBook: (goalId: number, bookId: number) =>
    api.post(`/goals/${goalId}/books/${bookId}/complete`),
  uncompleteBook: (goalId: number, bookId: number) =>
    api.post(`/goals/${goalId}/books/${bookId}/uncomplete`),
};

export const achievementsAPI = {
  getAchievements: () => api.get('/achievements'),
  getMyAchievements: () => api.get('/achievements/mine'),
  getStats: () => api.get('/achievements/stats'),
  checkAchievements: () => api.post('/achievements/check'),
  getAchievementTypes: () => api.get('/achievements/types'),
};

export const readingClubsAPI = {
  getClubs: (params?: {
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }) => api.get('/reading-clubs', { params }),
  getMyClubs: () => api.get('/reading-clubs/mine'),
  getClub: (id: number) => api.get(`/reading-clubs/${id}`),
  createClub: (club: {
    title: string;
    description: string;
    book_title?: string;
    book_id?: number;
    location: string;
    location_lat?: number;
    location_lng?: number;
    start_time: string;
    end_time: string;
    max_participants: number;
    cover_image?: string;
  }) => api.post('/reading-clubs', club),
  updateClub: (id: number, data: {
    title?: string;
    description?: string;
    book_title?: string;
    book_id?: number;
    location?: string;
    location_lat?: number;
    location_lng?: number;
    start_time?: string;
    end_time?: string;
    max_participants?: number;
    status?: string;
    cover_image?: string;
  }) => api.put(`/reading-clubs/${id}`, data),
  deleteClub: (id: number) => api.delete(`/reading-clubs/${id}`),
  registerClub: (id: number) => api.post(`/reading-clubs/${id}/register`),
  cancelRegistration: (id: number) => api.post(`/reading-clubs/${id}/cancel`),
  getParticipants: (id: number) => api.get(`/reading-clubs/${id}/participants`),
};

export const usersAPI = {
  getUser: (id: number) => api.get(`/users/${id}`),
  getFollowStatus: (id: number) => api.get(`/users/${id}/follow-status`),
  followUser: (id: number) => api.post(`/users/${id}/follow`),
  unfollowUser: (id: number) => api.post(`/users/${id}/unfollow`),
  getFollowers: (id: number) => api.get(`/users/${id}/followers`),
  getFollowing: (id: number) => api.get(`/users/${id}/following`),
  getUserPosts: (id: number, params?: {
    page?: number;
    limit?: number;
  }) => api.get(`/users/${id}/posts`, { params }),
  getUserBooks: (id: number) => api.get(`/users/${id}/books`),
  getFollowingFeed: (params?: {
    page?: number;
    limit?: number;
  }) => api.get('/users/feed/following', { params }),
  getMyProfile: () => api.get('/users/me/profile'),
  updateProfile: (data: {
    avatar?: string;
    bio?: string;
    reading_tags?: string[];
    expertise_fields?: string[];
    shelf_style?: string;
  }) => api.put('/users/me', data),
};

export const statsAPI = {
  getOverview: () => api.get('/stats/overview'),
  getMonthly: () => api.get('/stats/monthly'),
  getCategories: () => api.get('/stats/categories'),
  getReadingTrend: () => api.get('/stats/reading-trend'),
  exportData: (format: 'json' | 'csv') =>
    api.get(`/stats/export?format=${format}`, { responseType: 'blob' }),
};

export default api;
