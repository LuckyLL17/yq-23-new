import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.search = search;
      const response = await adminAPI.getPosts(params);
      setPosts(response.data.posts);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [search, page]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇帖子吗？删除后无法恢复。')) return;
    try {
      await adminAPI.deletePost(id);
      fetchPosts();
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('删除失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const truncateContent = (content: string, maxLength: number = 100) => {
    const plainText = content.replace(/[#*`_~\[\]()>!\n]/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + '...' : plainText;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">帖子管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索帖子标题或内容..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">暂无帖子数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">帖子</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">作者</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">浏览</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">点赞</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">评论</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">发布时间</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                      <p className="font-medium text-slate-800 mb-1">{post.title}</p>
                      <p className="text-sm text-slate-500 line-clamp-1">{truncateContent(post.content)}</p>
                    </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{post.author_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{post.view_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{post.like_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{post.comment_count}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(post.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPosts;
