import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Image, X, Send, Eye, Edit3, Hash, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { topicsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'content' | 'cover'>('content');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await topicsAPI.getTopics();
        setTopics(res.data);
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      }
    };
    fetchTopics();
  }, []);

  const toggleTopic = (topicId: number) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    setImages(prev => [...prev, imageUrl.trim()]);
    setImageUrl('');
    setShowImageInput(false);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const insertImageToContent = () => {
    if (!imageUrl.trim()) return;
    const imgMarkdown = `![图片](${imageUrl.trim()})`;
    setContent(prev => prev + (prev ? '\n\n' : '') + imgMarkdown);
    setImageUrl('');
    setShowImageInput(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('请选择图片文件');
      return;
    }

    handleUploadImages(imageFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadImages = async (files: File[]) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadAPI.uploadImages(files);
      const uploadedUrls = res.data.urls;

      if (uploadMode === 'cover') {
        setImages(prev => [...prev, ...uploadedUrls]);
      } else {
        const newContent = uploadedUrls
          .map((url: string) => `![图片](${url})`)
          .join('\n\n');
        setContent(prev => prev + (prev ? '\n\n' : '') + newContent);
      }
      setShowImageInput(false);
    } catch (err: any) {
      setError(err.response?.data?.error || '图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const openUploadDialog = (mode: 'content' | 'cover') => {
    setUploadMode(mode);
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('请输入帖子标题');
      return;
    }
    if (title.length > 200) {
      setError('标题不能超过200个字符');
      return;
    }
    if (!content.trim()) {
      setError('请输入帖子内容');
      return;
    }

    setSubmitting(true);
    try {
      const res = await topicsAPI.createPost({
        title: title.trim(),
        content: content.trim(),
        topic_ids: selectedTopics,
        images
      });
      navigate(`/topics/posts/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/topics')}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回讨论区</span>
      </button>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-book-ink mb-6 font-serif">发布新帖子</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入帖子标题"
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-lg"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {title.length}/200
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择话题
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-4 py-2 rounded-full flex items-center gap-1.5 transition-all ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{topic.icon}</span>
                  <span>{topic.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              可选择多个话题，让更多人看到你的帖子
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                内容 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <Image className="w-4 h-4" />
                  <span>插入图片</span>
                </button>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${
                      !previewMode
                        ? 'bg-white text-gray-700 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${
                      previewMode
                        ? 'bg-white text-gray-700 shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    预览
                  </button>
                </div>
              </div>
            </div>

            {showImageInput && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openUploadDialog('content')}
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? '上传中...' : '上传图片并插入内容'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openUploadDialog('cover')}
                    disabled={uploading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>上传为封面</span>
                  </button>
                </div>
                <div className="text-center text-xs text-gray-400">或使用图片链接</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="请输入图片URL"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={insertImageToContent}
                    className="px-4 py-2 bg-primary-100 text-primary-600 text-sm rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    插入内容
                  </button>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    添加为封面
                  </button>
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {previewMode ? (
              <div className="min-h-[400px] p-4 border border-gray-200 rounded-xl bg-gray-50">
                {content ? (
                  <div className="prose max-w-none prose-headings:text-book-ink prose-p:text-gray-700 prose-strong:text-book-ink prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:bg-primary-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-600 prose-blockquote:not-italic prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-20">暂无内容，请在编辑模式下输入</p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="支持 Markdown 格式，分享你的想法..."
                rows={16}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all font-mono text-sm leading-relaxed"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                支持 # 标题
              </span>
              <span>**粗体**</span>
              <span>*斜体*</span>
              <span>- 无序列表</span>
              <span>1. 有序列表</span>
              <span>{'>'} 引用</span>
              <span>[链接](url)</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              to="/topics"
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              取消
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? '发布中...' : '发布帖子'}</span>
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default CreatePost;
