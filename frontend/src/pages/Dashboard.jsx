import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Plus, Activity, CheckCircle2, XCircle, HelpCircle, Clock, ExternalLink, Play, Pause, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const fetchMonitors = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setError('');
    
    try {
      const { data } = await client.get('/api/monitors');
      setMonitors(data.monitors || []);
    } catch (err) {
      setError('Failed to load monitors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      setMonitors(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
      await client.patch(`/api/monitors/${id}/status`, { is_active: !currentStatus });
    } catch (err) {
      // revert on failure
      setMonitors(prev => prev.map(m => m.id === id ? { ...m, is_active: currentStatus } : m));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this monitor? This will remove the monitor and its associated monitoring data.')) return;
    
    try {
      await client.delete(`/api/monitors/${id}`);
      setMonitors(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete monitor.');
    }
  };

  // ... (use effect and stats remain the same) ...
  useEffect(() => {
    fetchMonitors();

    // Set up 30-second polling
    const interval = setInterval(() => {
      // Background refresh only if page is visible
      if (!document.hidden) {
        fetchMonitors(true);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchMonitors(true);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const stats = {
    total: monitors.length,
    up: monitors.filter(m => m.current_status === 'UP').length,
    down: monitors.filter(m => m.current_status === 'DOWN').length,
    unknown: monitors.filter(m => m.current_status === 'UNKNOWN').length,
  };

  const StatusIcon = ({ status, className = "" }) => {
    if (status === 'UP') return <CheckCircle2 className={`text-emerald-500 ${className}`} />;
    if (status === 'DOWN') return <XCircle className={`text-rose-500 ${className}`} />;
    return <HelpCircle className={`text-slate-400 ${className}`} />;
  };

  const getStatusBadge = (status) => {
    if (status === 'UP') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">UP</span>;
    if (status === 'DOWN') return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">DOWN</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">UNKNOWN</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/50 rounded-lg w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
        <p className="text-rose-400 mb-4">{error}</p>
        <button 
          onClick={() => fetchMonitors()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Overview of your monitored services.</p>
        </div>
        <Link 
          to="/monitors/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Add Monitor
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 border border-slate-800/80 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all duration-300">
          <div className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Total
          </div>
          <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
        </div>
        <div className="p-5 border border-emerald-900/30 rounded-xl bg-emerald-950/20 hover:bg-emerald-900/20 transition-all duration-300">
          <div className="text-emerald-500 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> UP
          </div>
          <div className="text-3xl font-bold text-emerald-400">{stats.up}</div>
        </div>
        <div className="p-5 border border-rose-900/40 rounded-xl bg-rose-950/30 hover:bg-rose-900/30 transition-all duration-300">
          <div className="text-rose-500 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5" /> DOWN
          </div>
          <div className="text-3xl font-bold text-rose-400">{stats.down}</div>
        </div>
        <div className="p-5 border border-slate-800/80 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all duration-300">
          <div className="text-slate-500 text-xs font-semibold tracking-wider uppercase mb-2 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5" /> Unknown
          </div>
          <div className="text-3xl font-bold text-slate-300">{stats.unknown}</div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="text-center p-16 border border-slate-800 border-dashed rounded-xl bg-slate-900/20">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No monitors configured</h3>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
            You haven't added any monitors yet. Set up your first monitor to start tracking your website's uptime and performance.
          </p>
          <Link 
            to="/monitors/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Monitor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {monitors.map((monitor) => (
            <div
              key={monitor.id}
              className={`group p-5 border rounded-xl transition-all duration-300 relative overflow-hidden flex flex-col ${
                monitor.current_status === 'DOWN' 
                  ? 'border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-500/50' 
                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {!monitor.is_active && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-0 pointer-events-none transition-all"></div>
              )}
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 w-full pr-16">
                    <StatusIcon status={monitor.current_status} className="w-5 h-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <Link to={`/monitors/${monitor.id}`} className="font-semibold text-slate-100 text-base hover:text-blue-400 transition-colors focus:outline-none truncate block">
                        {monitor.name}
                      </Link>
                      <a href={monitor.url} target="_blank" rel="noreferrer" className="text-slate-500 text-xs mt-0.5 hover:text-slate-300 truncate block transition-colors">
                        {monitor.url}
                      </a>
                    </div>
                  </div>
                  
                  <div className="absolute top-0 right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleStatus(monitor.id, monitor.is_active)}
                      disabled={togglingId === monitor.id}
                      className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                      title={monitor.is_active ? "Pause Monitor" : "Resume Monitor"}
                    >
                      {togglingId === monitor.id ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                      ) : monitor.is_active ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(monitor.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950 rounded-md transition-colors"
                      title="Delete Monitor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-slate-800/50">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Interval</div>
                    <div className="text-sm font-medium text-slate-300">
                      {monitor.interval_seconds >= 60 ? `${monitor.interval_seconds / 60}m` : `${monitor.interval_seconds}s`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Status</div>
                    <div>{getStatusBadge(monitor.current_status)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
