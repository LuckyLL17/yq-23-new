import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Coins, BookOpen, Sparkles, Filter, X, Clock, ChevronDown } from 'lucide-react';
import { booksAPI, wishlistsAPI } from '../services/api';
import BookCard from '../components/BookCard';
import { useAuth } from '../contexts/AuthContext';

const CONDITIONS = ['全新', '九成新', '八成新', '七成新', '六成新及以下'];
const SORT_OPTIONS = [
  { value: 'relevance', label: '相关度' },
  { value: 'date', label: '发布时间' },
  { value: 'points', label: '积分' },
  { value: 'title', label: '书名' }
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [wishlistBookIds, setWishlistBookIds] = useState<number[]>([]);
  const [lookingForBookIds, setLookingForBookIds] = useState<number[]>([]);
  const [defaultWishlistId, setDefaultWishlistId] = useState<number | null>(null);
  
  const [filters, setFilters] = useState({
    condition: '',
    minPoints: '',
    maxPoints: '',
    startDate: '',
    endDate: ''
  });
  
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, categoriesRes] = await Promise.all([
          booksAPI.getBooks(),
          booksAPI.getCategories()
        ]);
        setBooks(booksRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSearchHistory();
      fetchWishlistData();
    } else {
      setWishlistBookIds([]);
      setLookingForBookIds([]);
      setDefaultWishlistId(null);
    }
  }, [user]);

  const fetchSearchHistory = async () => {
    try {
      const res = await booksAPI.getSearchHistory();
      setSearchHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    }
  };

  const fetchWishlistData = async () => {
    try {
      const res = await wishlistsAPI.getWishlists();
      const wishlists = res.data;
      if (wishlists.length > 0) {
        const defaultList = wishlists.find((w: any) => w.is_default) || wishlists[0];
        setDefaultWishlistId(defaultList.id);
        
        const allBookIds: number[] = [];
        const lookingForIds: number[] = [];
        for (const wl of wishlists) {
          const detailRes = await wishlistsAPI.getWishlist(wl.id);
          detailRes.data.books.forEach((b: any) => {
            if (!allBookIds.includes(b.id)) {
              allBookIds.push(b.id);
            }
            if (b.is_looking_for && !lookingForIds.includes(b.id)) {
              lookingForIds.push(b.id);
            }
          });
        }
        setWishlistBookIds(allBookIds);
        setLookingForBookIds(lookingForIds);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist data:', error);
    }
  };

  const handleToggleWishlist = async (bookId: number) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!defaultWishlistId) {
      alert('请先创建心愿单');
      return;
    }

    const isInWishlist = wishlistBookIds.includes(bookId);

    try {
      if (isInWishlist) {
        await wishlistsAPI.removeFromWishlist(defaultWishlistId, bookId);
        setWishlistBookIds(wishlistBookIds.filter(id => id !== bookId));
        setLookingForBookIds(lookingForBookIds.filter(id => id !== bookId));
      } else {
        await wishlistsAPI.addToWishlist(defaultWishlistId, bookId);
        setWishlistBookIds([...wishlistBookIds, bookId]);
        const book = books.find(b => b.id === bookId);
        if (book && book.status === 'available' && book.current_holder_id !== user.id) {
          setLookingForBookIds([...lookingForBookIds, bookId]);
        }
      }
    } catch (err: any) {
      console.error('Failed to toggle wishlist:', err);
    }
  };

  const handleSearch = async (query: string, save: boolean = false) => {
    setSearchQuery(query);
    setShowHistory(false);
    
    if (save && query.trim() && user) {
      try {
        await booksAPI.addSearchHistory(query.trim());
        fetchSearchHistory();
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }
  };

  const handleHistoryClick = (keyword: string) => {
    setSearchQuery(keyword);
    setShowHistory(false);
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await booksAPI.deleteSearchHistory(id);
      fetchSearchHistory();
    } catch (error) {
      console.error('Failed to delete search history:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await booksAPI.clearSearchHistory();
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (selectedCategory) params.category = selectedCategory;
        if (searchQuery) {
          params.search = searchQuery;
          if (sortBy === 'date') params.sort_by = 'relevance';
        }
        if (filters.condition) params.condition = filters.condition;
        if (filters.minPoints) params.min_points = parseInt(filters.minPoints);
        if (filters.maxPoints) params.max_points = parseInt(filters.maxPoints);
        if (filters.startDate) params.start_date = filters.startDate;
        if (filters.endDate) params.end_date = filters.endDate;
        if (searchQuery && sortBy === 'date') {
          params.sort_by = 'relevance';
        } else {
          params.sort_by = sortBy;
        }
        params.sort_order = sortOrder;
        const res = await booksAPI.getBooks(params);
        setBooks(res.data);
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, filters, sortBy, sortOrder]);

  const resetFilters = () => {
    setFilters({
      condition: '',
      minPoints: '',
      maxPoints: '',
      startDate: '',
      endDate: ''
    });
  };

  const hasActiveFilters = filters.condition || filters.minPoints || filters.maxPoints || filters.startDate || filters.endDate;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold font-serif mb-4">
            让好书漂流，让知识传递
          </h1>
          <p className="text-lg text-primary-100 mb-6">
            以书换书，用积分发现更多好书。每一本书都有属于它的漂流故事。
          </p>
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Coins className="w-6 h-6" />
              <span>积分交换</span>
            </div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6" />
              <span>漂流记录</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6" />
              <span>发现好书</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => user && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery, true)}
              placeholder="搜索书名或作者（支持拼音搜索）..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    搜索历史
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      onMouseDown={() => handleHistoryClick(item.keyword)}
                    >
                      <span className="text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {item.keyword}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            筛选
            {hasActiveFilters && (
              <span className="bg-white text-primary-500 text-xs px-1.5 py-0.5 rounded-full">
                !
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新旧程度
                </label>
                <select
                  value={filters.condition}
                  onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">全部</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  积分范围
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="最低"
                    value={filters.minPoints}
                    onChange={(e) => setFilters({ ...filters, minPoints: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="number"
                    placeholder="最高"
                    value={filters.maxPoints}
                    onChange={(e) => setFilters({ ...filters, maxPoints: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  发布时间
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                >
                  重置筛选
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                !selectedCategory
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="h-64 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <Link key={book.id} to={`/books/${book.id}`}>
              <BookCard
                book={book}
                showWishlist={!!user}
                isInWishlist={wishlistBookIds.includes(book.id)}
                isLookingFor={lookingForBookIds.includes(book.id)}
                onWishlistClick={handleToggleWishlist}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无符合条件的书籍</p>
        </div>
      )}
    </div>
  );
};

export default Home;
