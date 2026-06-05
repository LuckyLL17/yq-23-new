import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Coins, BookOpen, Sparkles } from 'lucide-react';
import { booksAPI } from '../services/api';
import BookCard from '../components/BookCard';

const Home = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (selectedCategory) params.category = selectedCategory;
        if (searchQuery) params.search = searchQuery;
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
  }, [selectedCategory, searchQuery]);

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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索书名或作者..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
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
              <BookCard book={book} />
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
