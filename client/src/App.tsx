import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookDetail from './pages/BookDetail';
import AddBook from './pages/AddBook';
import MyBooks from './pages/MyBooks';
import Exchanges from './pages/Exchanges';
import Topics from './pages/Topics';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Wishlists from './pages/Wishlists';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-book-cream">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-book-ink">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-book-cream">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/books/:id" element={<BookDetail />} />
            <Route path="/add-book" element={<AddBook />} />
            <Route path="/my-books" element={<MyBooks />} />
            <Route path="/wishlists" element={<Wishlists />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/posts/:id" element={<PostDetail />} />
            <Route path="/topics/new" element={<CreatePost />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
