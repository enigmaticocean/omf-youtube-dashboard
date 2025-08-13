import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Eye, Video, Calendar, Users, ThumbsUp, MessageCircle, BarChart3, Minus, LogOut } from 'lucide-react';
import { useRouter } from 'next/router';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-data');
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
        setError(null);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dashboard_token');
    router.push('/login');
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '2px solid #475569',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#64748b' }}>Loading YouTube analytics...</p>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error Loading Data</h2>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={fetchDashboardData}
            style={{
              backgroundColor: '#475569',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categoryColors = [
    '#475569', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#84cc16'
  ];

  const categoryDataWithColors = data.current.categories.map((cat, index) => ({
    ...cat,
    fill: categoryColors[index % categoryColors.length]
  }));

  const topPerformer = data.current.videos.reduce((top, current) => 
    current.views > (top?.views || 0) ? current : top, null
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 0'
          }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                YouTube Analytics Dashboard
              </h1>
              <p style={{ color: '#6b7280' }}>
                {data.current.channel.name} • Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#475569',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'videos', label: 'Videos', icon: Video },
              { id: 'trends', label: 'Trends', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 0.25rem',
                  borderBottom: activeTab === tab.id ? '2px solid #475569' : '2px solid transparent',
                  color: activeTab === tab.id ? '#475569' : '#6b7280',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPI Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Total Views */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Total Views
                    </p>
                    <p style={{
                      fontSize: '1.875rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {formatNumber(data.current.summary.totalViews)}
                    </p>
                    {data.comparisons.yesterday && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.5rem'
                      }}>
                        {getChangeIcon(data.comparisons.yesterday.views)}
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }} className={getChangeColor(data.comparisons.yesterday.views)}>
                          {data.comparisons.yesterday.views >= 0 ? '+' : ''}{data.comparisons.yesterday.views} vs yesterday
                        </span>
                      </div>
                    )}
                  </div>
                  <Eye style={{ width: '2rem', height: '2rem', color: '#3b82f6' }} />
                </div>
              </div>

              {/* Total Videos */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Total Videos
                    </p>
                    <p style={{
                      fontSize: '1.875rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {data.current.summary.totalVideos}
                    </p>
                    {data.comparisons.yesterday && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.5rem'
                      }}>
                        {getChangeIcon(data.comparisons.yesterday.videos)}
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }} className={getChangeColor(data.comparisons.yesterday.videos)}>
                          {data.comparisons.yesterday.videos >= 0 ? '+' : ''}{data.comparisons.yesterday.videos} vs yesterday
                        </span>
                      </div>
                    )}
                  </div>
                  <Video style={{ width: '2rem', height: '2rem', color: '#475569' }} />
                </div>
              </div>

              {/* Average Views */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Average Views
                    </p>
                    <p style={{
                      fontSize: '1.875rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {formatNumber(data.current.summary.avgViews)}
                    </p>
                    {data.comparisons.yesterday && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.5rem'
                      }}>
                        {getChangeIcon(data.comparisons.yesterday.avgViews)}
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }} className={getChangeColor(data.comparisons.yesterday.avgViews)}>
                          {data.comparisons.yesterday.avgViews >= 0 ? '+' : ''}{data.comparisons.yesterday.avgViews} vs yesterday
                        </span>
                      </div>
                    )}
                  </div>
                  <BarChart3 style={{ width: '2rem', height: '2rem', color: '#10b981' }} />
                </div>
              </div>

              {/* Subscribers */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Subscribers
                    </p>
                    <p style={{
                      fontSize: '1.875rem',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {formatNumber(data.current.channel.subscriberCount)}
                    </p>
                  </div>
                  <Users style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
                </div>
              </div>
            </div>

            {/* Charts and other content continues... */}
            {topPerformer && (
              <div style={{
                background: 'linear-gradient(90deg, #475569 0%, #334155 100%)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '1.5rem',
                color: 'white'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  🏆 Top Performing Video
                </h3>
                <p style={{
                  fontSize: '1.25rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  {topPerformer.title}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ opacity: 0.9 }}>
                      {formatNumber(topPerformer.views)} views
                    </span>
                    <span style={{ opacity: 0.9 }}>
                      {topPerformer.likes} likes
                    </span>
                    <span style={{ opacity: 0.9 }}>
                      {topPerformer.category}
                    </span>
                  </div>
                  <span style={{ opacity: 0.9 }}>
                    {new Date(topPerformer.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .text-green-600 { color: #16a34a; }
        .text-red-600 { color: #dc2626; }
        .text-gray-400 { color: #9ca3af; }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          main {
            padding: 1rem 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
