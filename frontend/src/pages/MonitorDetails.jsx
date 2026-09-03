import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Clock, Activity, CheckCircle2, XCircle, HelpCircle, Edit, Trash2, Pause, Play, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const MonitorDetails = () => {
  const { id } = useParams();
  
  const [monitor, setMonitor] = useState(null);
  
  const [checks, setChecks] = useState([]);
  const [checksPage, setChecksPage] = useState(1);
  const [checksTotalPages, setChecksTotalPages] = useState(1);
  
  const [incidents, setIncidents] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isChecksLoading, setIsChecksLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMonitorOnly = async () => {
    try {
      const { data } = await client.get(`/api/monitors/${id}`);
      setMonitor(data.monitor);
    } catch (err) {
      setError('Failed to load monitor details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChecksAndIncidents = async () => {
    setIsChecksLoading(true);
    try {
      const [checksRes, incidentsRes] = await Promise.all([
        client.get(`/api/monitors/${id}/checks?limit=10&page=${checksPage}`),
        client.get(`/api/monitors/${id}/incidents?limit=5`)
      ]);
      setChecks(checksRes.data.checks || []);
      setChecksTotalPages(checksRes.data.pagination?.totalPages || 1);
      setIncidents(incidentsRes.data.incidents || []);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setIsChecksLoading(false);
    }
  };

  const fetchAllData = async () => {
    await fetchMonitorOnly();
    fetchChecksAndIncidents();
  };

  const fetchChecks = async (page) => {
    setIsChecksLoading(true);
    try {
      const res = await client.get(`/api/monitors/${id}/checks?limit=10&page=${page}`);
      setChecks(res.data.checks || []);
      setChecksPage(res.data.pagination?.page || 1);
      setChecksTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load checks');
    } finally {
      setIsChecksLoading(false);
    }
  };

  const pollData = async () => {
    try {
      const { data } = await client.get(`/api/monitors/${id}`);
      setMonitor(data.monitor);
      // only refresh checks if on page 1
      if (checksPage === 1) {
        fetchChecksAndIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Polling
    const interval = setInterval(() => {
      if (!document.hidden) pollData();
    }, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) pollData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, checksPage]);

  const getStatusBadge = (status) => {
    if (status === 'UP') return <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">UP</span>;
    if (status === 'DOWN') return <span className="px-3 py-1 rounded-full text-sm font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">DOWN</span>;
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">UNKNOWN</span>;
  };

  if (isLoading && !monitor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !monitor) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
        <p className="text-rose-400 mb-4">{error || 'Monitor not found'}</p>
        <Link to="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              {monitor.name}
              {!monitor.is_active && (
                <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-md border border-slate-700">Paused</span>
              )}
            </h2>
            <a href={monitor.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover text-sm mt-1 inline-block">
              {monitor.url}
            </a>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(monitor.current_status)}
            <Link 
              to={`/monitors/${monitor.id}/edit`}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
              title="Edit Monitor"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-xs uppercase font-medium mb-1 tracking-wider">Interval</div>
          <div className="text-lg font-semibold text-white">
            {monitor.interval_seconds >= 60 ? `${monitor.interval_seconds / 60}m` : `${monitor.interval_seconds}s`}
          </div>
        </div>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-xs uppercase font-medium mb-1 tracking-wider">Timeout</div>
          <div className="text-lg font-semibold text-white">{monitor.timeout_seconds}s</div>
        </div>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-xs uppercase font-medium mb-1 tracking-wider">Last Checked</div>
          <div className="text-lg font-semibold text-white truncate">
            {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString() : 'Never'}
          </div>
        </div>
        <div className="p-5 border border-slate-800 rounded-xl bg-slate-800/30">
          <div className="text-slate-400 text-xs uppercase font-medium mb-1 tracking-wider">Created</div>
          <div className="text-lg font-semibold text-white truncate">
            {new Date(monitor.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (Checks) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Recent Checks
            </h3>
          </div>

          <div className="border border-slate-800 rounded-xl bg-slate-800/30 overflow-hidden">
            {checks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No checks recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Response Time</th>
                      <th className="px-6 py-4">Status Code</th>
                      <th className="px-6 py-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {checks.map(check => (
                      <tr key={check.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          {check.is_up ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> UP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-medium">
                              <XCircle className="w-4 h-4" /> DOWN
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {check.response_time_ms ? `${check.response_time_ms}ms` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-mono px-2 py-1 rounded text-xs ${check.is_up ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/10 text-rose-400'}`}>
                            {check.status_code || 'ERR'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(check.checked_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {checksTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/50 bg-slate-900/30">
                <button
                  onClick={() => fetchChecks(checksPage - 1)}
                  disabled={checksPage === 1 || isChecksLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {checksPage} of {checksTotalPages}
                </span>
                <button
                  onClick={() => fetchChecks(checksPage + 1)}
                  disabled={checksPage === checksTotalPages || isChecksLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Incidents) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Incidents
            </h3>
          </div>

          <div className="space-y-4">
            {incidents.length === 0 ? (
              <div className="p-6 border border-slate-800 rounded-xl bg-slate-800/30 text-center text-slate-400 text-sm">
                No incidents recorded. Perfect uptime!
              </div>
            ) : (
              incidents.map(incident => (
                <div key={incident.id} className="p-4 border border-rose-900/30 rounded-xl bg-slate-800/30 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${incident.resolved_at ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  <div className="ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${incident.resolved_at ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {incident.resolved_at ? 'RESOLVED' : 'ACTIVE'}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(incident.started_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium mb-3">{incident.reason}</p>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Started:</span>
                        <span>{new Date(incident.started_at).toLocaleTimeString()}</span>
                      </div>
                      {incident.resolved_at && (
                        <div className="flex justify-between">
                          <span>Resolved:</span>
                          <span>{new Date(incident.resolved_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorDetails;
