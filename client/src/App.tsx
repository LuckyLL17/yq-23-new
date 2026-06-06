import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookDetail from './pages/BookDetail';
import AddBook from './pages/AddBook';
import BatchAddBook from './pages/BatchAddBook';
import EditBook from './pages/EditBook';
import MyBooks from './pages/MyBooks';
import Exchanges from './pages/Exchanges';
import Topics from './pages/Topics';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Wishlists from './pages/Wishlists';
import ReadingGoals from './pages/ReadingGoals';
import Achievements from './pages/Achievements';
import ReadingClubs from './pages/ReadingClubs';
import ReadingClubDetail from './pages/ReadingClubDetail';
import ReadingClubEdit from './pages/ReadingClubEdit';
import UserProfile from './pages/UserProfile';
import UserFollowList from './pages/UserFollowList';
import FollowingFeed from './pages/FollowingFeed';
import ReadingStats from './pages/ReadingStats';
import ProfileSettings from './pages/ProfileSettings';

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
            <Route path="/books/:id/edit" element={<EditBook />} />
            <Route path="/add-book" element={<AddBook />} />
            <Route path="/batch-add-book" element={<BatchAddBook />} />
            <Route path="/my-books" element={<MyBooks />} />
            <Route path="/wishlists" element={<Wishlists />} />
            <Route path="/reading-goals" element={<ReadingGoals />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/reading-stats" element={<ReadingStats />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/posts/:id" element={<PostDetail />} />
            <Route path="/topics/new" element={<CreatePost />} />
            <Route path="/reading-clubs" element={<ReadingClubs />} />
            <Route path="/reading-clubs/:id" element={<ReadingClubDetail />} />
            <Route path="/reading-clubs/:id/edit" element={<ReadingClubEdit />} />
            <Route path="/users/:id" element={<UserProfile />} />
            <Route path="/users/:id/followers" element={<UserFollowList type="followers" />} />
            <Route path="/users/:id/following" element={<UserFollowList type="following" />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/following" element={<FollowingFeed />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
