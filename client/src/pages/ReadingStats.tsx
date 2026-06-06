import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BookOpen,
  Clock,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  Download,
  BookMarked,
  Calendar,
} from 'lucide-react';
import { statsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#14B8A6', '#F97316'];

const ReadingStats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAllStats();
  }, [user, navigate]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [overviewRes, monthlyRes, categoryRes, trendRes] = await Promise.all([
        statsAPI.getOverview(),
        statsAPI.getMonthly(),
        statsAPI.getCategories(),
        statsAPI.getReadingTrend(),
      ]);
      setOverview(overviewRes.data);
      setMonthlyData(monthlyRes.data.map((item: any) => ({
        ...item,
        month: item.month.substring(5) + '月',
      })));
      setCategoryData(categoryRes.data);
      setTrendData(trendRes.data.map((item: any) => ({
        ...item,
        date: item.date.substring(5),
        hours: (item.minutes / 60).toFixed(1),
      })));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await statsAPI.exportData(exportFormat);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `reading-stats-${dateStr}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

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
          <h1 className="text-3xl font-bold text-book-ink font-serif">阅读统计</h1>
          <p className="text-gray-500 mt-1">可视化分析你的阅读数据，见证每一步成长</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          >
            <option value="json">JSON 格式</option>
            <option value="csv">CSV 格式</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            <span>{exporting ? '导出中...' : '导出数据'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          title="已读书籍"
          value={overview?.total_books || 0}
          subtitle="累计阅读本数"
          color="text-primary-600"
        />
        <StatCard
          icon={Clock}
          title="阅读时长"
          value={`${overview?.total_hours || 0} 小时`}
          subtitle="累计阅读时间"
          color="text-purple-600"
        />
        <StatCard
          icon={FileText}
          title="阅读页数"
          value={`${overview?.total_pages || 0} 页`}
          subtitle="按平均250页/本估算"
          color="text-amber-600"
        />
        <StatCard
          icon={PieChartIcon}
          title="阅读分类"
          value={overview?.categories_count || 0}
          subtitle={`最爱：${overview?.top_category || '暂无'}`}
          color="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-book-ink">月度阅读量</h2>
            </div>
            <span className="text-sm text-gray-400">近 12 个月</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: any) => [`${value} 本`, '阅读量']}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-pink-500" />
            <h2 className="text-xl font-semibold text-book-ink">分类偏好</h2>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BookMarked className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>暂无分类数据</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, _name: any, props: any) => [
                        `${value} 本 (${props.payload.percentage}%)`,
                        props.payload.name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                {categoryData.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-gray-500">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold text-book-ink">阅读时长趋势</h2>
          </div>
          <span className="text-sm text-gray-400">近 30 天</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                interval={Math.floor(trendData.length / 6)}
              />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
                formatter={(value: any, name: any) => [
                  name === 'hours' ? `${value} 小时` : `${value} 分钟`,
                  name === 'hours' ? '阅读时长' : '阅读分钟',
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorMinutes)"
                name="阅读分钟"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-book-ink">月度详情</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">月份</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">阅读数量</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">阅读时长</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">完成度</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.slice().reverse().map((item, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-book-ink font-medium">{item.month}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.count} 本</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.hours} 小时</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${Math.min(item.count * 20, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10">{Math.min(item.count * 20, 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReadingStats;
