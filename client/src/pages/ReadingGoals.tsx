import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Target,
  Plus,
  X,
  BookOpen,
  Calendar,
  Trash2,
  Edit3,
  ChevronRight,
  Award,
  CheckCircle,
  Circle,
  Search,
  ListPlus,
} from 'lucide-react';
import { goalsAPI, booksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ReadingGoals = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetBooks, setNewTargetBooks] = useState(5);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetBooks, setEditTargetBooks] = useState(1);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchGoals();
  }, [user, navigate]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await goalsAPI.getGoals();
      setGoals(res.data);
      if (res.data.length > 0 && !selectedGoal) {
        selectGoal(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectGoal = async (goal: any) => {
    try {
      setDetailLoading(true);
      setSelectedGoal(goal);
      const res = await goalsAPI.getGoal(goal.id);
      setBooks(res.data.books || []);
    } catch (error) {
      console.error('Failed to fetch goal:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim() || !newStartDate || !newEndDate || newTargetBooks < 1) return;
    try {
      setSubmitting(true);
      const res = await goalsAPI.createGoal({
        title: newTitle,
        description: newDescription,
        target_books: newTargetBooks,
        start_date: newStartDate,
        end_date: newEndDate,
      });
      setGoals([res.data, ...goals]);
      setShowCreateModal(false);
      resetCreateForm();
      selectGoal(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewTargetBooks(5);
    setNewStartDate('');
    setNewEndDate('');
  };

  const openEditModal = () => {
    if (!selectedGoal) return;
    setEditTitle(selectedGoal.title);
    setEditDescription(selectedGoal.description || '');
    setEditTargetBooks(selectedGoal.target_books);
    setShowEditModal(true);
  };

  const handleEditGoal = async () => {
    if (!selectedGoal || !editTitle.trim()) return;
    try {
      setSubmitting(true);
      const res = await goalsAPI.updateGoal(selectedGoal.id, {
        title: editTitle,
        description: editDescription,
        target_books: editTargetBooks,
      });
      setGoals(goals.map(g => (g.id === selectedGoal.id ? res.data : g)));
      setSelectedGoal(res.data);
      setShowEditModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      await goalsAPI.deleteGoal(selectedGoal.id);
      const remaining = goals.filter(g => g.id !== selectedGoal.id);
      setGoals(remaining);
      setSelectedGoal(null);
      setBooks([]);
      setShowDeleteConfirm(false);
      if (remaining.length > 0) {
        selectGoal(remaining[0]);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const handleSearchBooks = async (keyword: string) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await booksAPI.getBooks({ search: keyword });
      const goalBookIds = books.map((b: any) => b.id);
      const filtered = res.data.filter((b: any) => !goalBookIds.includes(b.id));
      setSearchResults(filtered.slice(0, 10));
    } catch (error) {
      console.error('Failed to search books:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddBook = async (bookId: number) => {
    if (!selectedGoal) return;
    try {
      await goalsAPI.addBookToGoal(selectedGoal.id, bookId);
      const goalRes = await goalsAPI.getGoal(selectedGoal.id);
      setBooks(goalRes.data.books || []);
      setGoals(goals.map(g =>
        g.id === selectedGoal.id ? { ...g, book_count: g.book_count + 1 } : g
      ));
      setSearchResults(searchResults.filter((b: any) => b.id !== bookId));
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleCompleteBook = async (bookId: number) => {
    if (!selectedGoal) return;
    try {
      const res = await goalsAPI.completeBook(selectedGoal.id, bookId);
      const goalRes = await goalsAPI.getGoal(selectedGoal.id);
      setBooks(goalRes.data.books || []);
      setGoals(goals.map(g =>
        g.id === selectedGoal.id
          ? { ...g, completed_count: goalRes.data.completed_count, progress: goalRes.data.progress, status: goalRes.data.status }
          : g
      ));
      setSelectedGoal(goalRes.data);

      if (res.data.newly_unlocked_achievements && res.data.newly_unlocked_achievements.length > 0) {
        setNewAchievement(res.data.newly_unlocked_achievements[0]);
        refreshUser?.();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleUncompleteBook = async (bookId: number) => {
    if (!selectedGoal) return;
    try {
      await goalsAPI.uncompleteBook(selectedGoal.id, bookId);
      const goalRes = await goalsAPI.getGoal(selectedGoal.id);
      setBooks(goalRes.data.books || []);
      setGoals(goals.map(g =>
        g.id === selectedGoal.id
          ? { ...g, completed_count: goalRes.data.completed_count, progress: goalRes.data.progress, status: goalRes.data.status }
          : g
      ));
      setSelectedGoal(goalRes.data);
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleRemoveBook = async (bookId: number) => {
    if (!selectedGoal) return;
    if (!confirm('确定要从阅读目标中移除这本书吗？')) return;
    try {
      await goalsAPI.removeBookFromGoal(selectedGoal.id, bookId);
      setBooks(books.filter((b: any) => b.id !== bookId));
      setGoals(goals.map(g =>
        g.id === selectedGoal.id ? { ...g, book_count: g.book_count - 1 } : g
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || '移除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '未完成';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-book-ink font-serif">阅读目标</h1>
          <p className="text-gray-500 mt-1">设定目标，记录每一次阅读成长</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-500 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新建目标</span>
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-book-ink flex items-center space-x-2">
                <Target className="w-5 h-5 text-primary-500" />
                <span>我的目标</span>
              </h3>
            </div>
            <div className="p-2">
              {goals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无阅读目标</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {goals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => selectGoal(goal)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedGoal?.id === goal.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{goal.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {goal.completed_count}/{goal.target_books} 本
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(goal.status)}`}>
                              {getStatusText(goal.status)}
                            </span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-primary-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${goal.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {!selectedGoal ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">选择一个阅读目标</h3>
              <p className="text-gray-400">从左侧选择目标查看详情，或创建新的阅读目标</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold text-book-ink font-serif">
                          {selectedGoal.title}
                        </h2>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedGoal.status)}`}>
                          {getStatusText(selectedGoal.status)}
                        </span>
                      </div>
                      {selectedGoal.description && (
                        <p className="text-gray-500 mt-2">{selectedGoal.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(selectedGoal.start_date)} - {formatDate(selectedGoal.end_date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>目标 {selectedGoal.target_books} 本</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowAddBookModal(true)}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                        title="添加书籍"
                      >
                        <ListPlus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={openEditModal}
                        className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">完成进度</span>
                      <span className="text-sm text-gray-500">
                        {selectedGoal.completed_count} / {selectedGoal.target_books} 本 ({selectedGoal.progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          selectedGoal.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-primary-500'
                        }`}
                        style={{ width: `${selectedGoal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="p-12 flex justify-center">
                    <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : books.length === 0 ? (
                  <div className="p-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">目标里还没有书</h3>
                    <p className="text-gray-400 text-sm mb-4">添加书籍到你的阅读目标吧</p>
                    <button
                      onClick={() => setShowAddBookModal(true)}
                      className="inline-flex items-center space-x-1 text-primary-500 hover:text-primary-600"
                    >
                      <Plus className="w-4 h-4" />
                      <span>添加书籍</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {books.map((book: any) => (
                      <div
                        key={book.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          book.is_completed ? 'bg-green-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center pt-1">
                            <button
                              onClick={() => book.is_completed ? handleUncompleteBook(book.id) : handleCompleteBook(book.id)}
                              className={`transition-colors ${
                                book.is_completed
                                  ? 'text-green-500'
                                  : 'text-gray-300 hover:text-primary-400'
                              }`}
                            >
                              {book.is_completed ? (
                                <CheckCircle className="w-6 h-6 fill-green-500 text-white" />
                              ) : (
                                <Circle className="w-6 h-6" />
                              )}
                            </button>
                          </div>

                          <Link
                            to={`/books/${book.id}`}
                            className="w-16 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden shadow-sm"
                          >
                            {book.cover ? (
                              <img
                                src={book.cover}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                                <span className="text-2xl">📖</span>
                              </div>
                            )}
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link
                                  to={`/books/${book.id}`}
                                  className={`font-semibold hover:text-primary-500 transition-colors ${
                                    book.is_completed ? 'text-gray-500 line-through' : 'text-book-ink'
                                  }`}
                                >
                                  {book.title}
                                </Link>
                                <p className="text-sm text-gray-500 mt-1">{book.author}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveBook(book.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="移除"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="flex items-center space-x-3 mt-2">
                              {book.category && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {book.category}
                                </span>
                              )}
                              {book.is_completed && book.completed_at && (
                                <span className="text-xs text-green-600 flex items-center space-x-1">
                                  <Award className="w-3 h-3" />
                                  <span>已于 {formatDate(book.completed_at)} 完成</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">新建阅读目标</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标标题
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：六月阅读计划"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述（选填）
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="描述一下这个阅读目标..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标书籍数量
                </label>
                <input
                  type="number"
                  value={newTargetBooks}
                  onChange={(e) => setNewTargetBooks(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateGoal}
                disabled={!newTitle.trim() || !newStartDate || !newEndDate || newTargetBooks < 1 || submitting}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-book-ink">编辑阅读目标</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标标题
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目标书籍数量
                </label>
                <input
                  type="number"
                  value={editTargetBooks}
                  onChange={(e) => setEditTargetBooks(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEditGoal}
                disabled={!editTitle.trim() || submitting}
                className="flex-1 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddBookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-book-ink">添加书籍到目标</h3>
              <button
                onClick={() => {
                  setShowAddBookModal(false);
                  setSearchKeyword('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => handleSearchBooks(e.target.value)}
                placeholder="搜索书籍名称或作者..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{searchKeyword ? '未找到相关书籍' : '输入关键词搜索书籍'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((book: any) => (
                    <div
                      key={book.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-100">
                            <span className="text-sm">📖</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-book-ink truncate">{book.title}</p>
                        <p className="text-sm text-gray-500 truncate">{book.author}</p>
                      </div>
                      <button
                        onClick={() => handleAddBook(book.id)}
                        className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>添加</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-book-ink mb-2">删除阅读目标</h3>
              <p className="text-gray-500 mb-6">
                确定要删除「{selectedGoal?.title}」吗？<br />
                此操作不可撤销，里面的书籍也将被移除。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteGoal}
                className="flex-1 bg-red-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {newAchievement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-bounce-in">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">{newAchievement.icon}</span>
            </div>
            <div className="text-2xl font-bold text-book-ink mb-1">🎉 恭喜解锁成就！</div>
            <div className="text-xl font-bold text-primary-600 mb-2">{newAchievement.name}</div>
            <p className="text-gray-500 mb-4">{newAchievement.description}</p>
            <div className="inline-flex items-center space-x-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full mb-6">
              <Award className="w-4 h-4" />
              <span className="font-medium">+{newAchievement.points_reward} 积分</span>
            </div>
            <button
              onClick={() => setNewAchievement(null)}
              className="w-full bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              太棒了！
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingGoals;
