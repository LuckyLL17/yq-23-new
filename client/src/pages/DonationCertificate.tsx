import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  Download,
  ArrowLeft,
  Gift,
  BookOpen,
  Calendar,
  Hash,
  Share2,
  Printer
} from 'lucide-react';
import { donationsAPI } from '../services/api';

const DonationCertificate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchCertificate();
    }
  }, [id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await donationsAPI.getDonationCertificate(parseInt(id!));
      setCertificate(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '获取证书信息失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    handlePrint();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '我的捐赠证书',
        text: `我在书漂平台捐赠了 ${certificate?.donation?.quantity} 本书，获得了专属捐赠证书！`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-book-ink mb-2">证书不存在</h2>
          <p className="text-gray-500 mb-6">{error || '未找到该捐赠证书'}</p>
          <button
            onClick={() => navigate('/donations/records')}
            className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            返回我的捐赠
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">分享</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">打印</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">下载证书</span>
          </button>
        </div>
      </div>

      <div ref={certificateRef} className="relative">
        <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-200">
          <div className="absolute top-0 left-0 w-32 h-32">
            <div className="absolute top-6 left-6 w-20 h-20 border-t-4 border-l-4 border-amber-400 rounded-tl-2xl opacity-60"></div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32">
            <div className="absolute top-6 right-6 w-20 h-20 border-t-4 border-r-4 border-amber-400 rounded-tr-2xl opacity-60"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32">
            <div className="absolute bottom-6 left-6 w-20 h-20 border-b-4 border-l-4 border-amber-400 rounded-bl-2xl opacity-60"></div>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32">
            <div className="absolute bottom-6 right-6 w-20 h-20 border-b-4 border-r-4 border-amber-400 rounded-br-2xl opacity-60"></div>
          </div>

          <div className="p-12 text-center relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Award className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-4xl font-bold font-serif text-amber-900 mb-2">
              捐赠证书
            </h1>
            <p className="text-amber-700 mb-8">Donation Certificate</p>

            <div className="bg-white/60 backdrop-blur rounded-2xl p-8 max-w-md mx-auto mb-8">
              <p className="text-amber-800 text-lg mb-6">
                兹证明
              </p>
              <p className="text-3xl font-bold text-amber-900 mb-2 font-serif">
                {certificate.user?.username}
              </p>
              <p className="text-amber-700 mb-6">
                先生/女士
              </p>

              <div className="border-t border-amber-200 pt-6">
                <p className="text-amber-800 leading-relaxed">
                  热心捐赠书籍 <span className="font-bold text-amber-900">《{certificate.donation?.book_title}》</span>
                  {certificate.donation?.quantity > 1 && (
                    <span> 共 <span className="font-bold text-amber-900">{certificate.donation?.quantity}</span> 本</span>
                  )}
                  ，<br />
                  您的爱心将帮助更多人获得阅读的机会。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-200">
                <div className="text-left">
                  <p className="text-xs text-amber-600 mb-1">作者</p>
                  <p className="text-sm font-medium text-amber-900">{certificate.donation?.book_author}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-amber-600 mb-1">状况</p>
                  <p className="text-sm font-medium text-amber-900">{certificate.donation?.book_condition}</p>
                </div>
              </div>

              {certificate.donation?.message && (
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <p className="text-xs text-amber-600 mb-2">捐赠寄语</p>
                  <p className="text-sm text-amber-800 italic">
                    "{certificate.donation.message}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
              <div className="flex items-center space-x-2 text-amber-700">
                <Calendar className="w-4 h-4" />
                <span>捐赠日期：{formatDate(certificate.donation?.donated_at)}</span>
              </div>
              <div className="flex items-center space-x-2 text-amber-700">
                <Hash className="w-4 h-4" />
                <span>证书编号：{certificate.certificate_no}</span>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="text-right">
                <div className="inline-block border-b-2 border-amber-400 pb-1 mb-1">
                  <span className="text-amber-800 font-serif text-lg">书漂平台</span>
                </div>
                <p className="text-xs text-amber-600">{formatDate(certificate.issued_at)}</p>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 opacity-20">
              <div className="w-24 h-24 border-4 border-amber-500 rounded-full flex items-center justify-center rotate-12">
                <div className="text-center">
                  <Award className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-amber-500 font-bold mt-1">爱心捐赠</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-book-ink mb-4 flex items-center space-x-2">
          <Gift className="w-5 h-5 text-pink-500" />
          <span>捐赠详情</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">书籍名称</p>
            <p className="font-medium text-book-ink truncate">{certificate.donation?.book_title}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">作者</p>
            <p className="font-medium text-book-ink truncate">{certificate.donation?.book_author}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">捐赠数量</p>
            <p className="font-medium text-book-ink">{certificate.donation?.quantity} 本</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">书籍状况</p>
            <p className="font-medium text-book-ink">{certificate.donation?.book_condition}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h3 className="font-bold text-book-ink mb-1">感谢您的爱心捐赠</h3>
            <p className="text-sm text-gray-600 mb-4">
              每一本书都是知识的传递，您的捐赠将为更多人打开阅读的大门。
              继续分享您的闲置书籍，让书香传递更远！
            </p>
            <button
              onClick={() => navigate('/donate')}
              className="text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center space-x-1"
            >
              <Gift className="w-4 h-4" />
              <span>继续捐赠</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationCertificate;
