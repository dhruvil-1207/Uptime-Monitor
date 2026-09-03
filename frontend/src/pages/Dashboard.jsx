import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Plus, Activity, CheckCircle2, XCircle, HelpCircle, Clock, ExternalLink } from 'lucide-react';

const Dashboard = () => {
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Total Monitors
          </div>
          <div className="text-3xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="p-5 border border-emerald-900/30 rounded-xl bg-emerald-900/10">
          <div className="text-emerald-500 text-sm mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> UP
          </div>
          <div className="text-3xl font-semibold text-emerald-400">{stats.up}</div>
        </div>
        <div className="p-5 border border-rose-900/30 rounded-xl bg-rose-900/10">
          <div className="text-rose-500 text-sm mb-1 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> DOWN
          </div>
          <div className="text-3xl font-semibold text-rose-400">{stats.down}</div>
        </div>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Unknown
          </div>
          <div className="text-3xl font-semibold text-slate-300">{stats.unknown}</div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="text-center p-12 border border-slate-800 border-dashed rounded-xl bg-slate-800/10">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No monitors yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            You haven't added any monitors. Create one to start tracking your website's uptime.
          </p>
          <Link 
            to="/monitors/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4" />
            Create First Monitor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {monitors.map((monitor) => (
            <Link
              key={monitor.id}
              to={`/monitors/${monitor.id}`}
              className="group p-5 border border-slate-800 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 hover:border-slate-700 transition-all block relative overflow-hidden"
            >
              {!monitor.is_active && (
                <div className="absolute top-0 right-0 p-1.5 px-3 bg-slate-800/80 rounded-bl-lg text-xs font-medium text-slate-400 border-b border-l border-slate-700">
                  Paused
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <StatusIcon status={monitor.current_status} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg group-hover:text-primary transition-colors">
                      {monitor.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mt-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px] sm:max-w-[300px]">{monitor.url}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 mt-1">
                  {getStatusBadge(monitor.current_status)}
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-800/50 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  {monitor.interval_seconds >= 60 ? `${monitor.interval_seconds / 60}m interval` : `${monitor.interval_seconds}s interval`}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  Last checked: {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
