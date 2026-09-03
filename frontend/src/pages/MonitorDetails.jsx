import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Clock, Activity, CheckCircle2, XCircle, HelpCircle, Edit, AlertTriangle, ChevronLeft, ChevronRight, Zap, Settings, BarChart2, History } from 'lucide-react';

const MonitorDetails = () => {
  const { id } = useParams();
  
  const [monitor, setMonitor] = useState(null);
  
  const [checks, setChecks] = useState([]);
  const [checksPage, setChecksPage] = useState(1);
  const [checksTotalPages, setChecksTotalPages] = useState(1);
  
  const [incidents, setIncidents] = useState([]);
  const [incidentsPage, setIncidentsPage] = useState(1);
  const [incidentsTotalPages, setIncidentsTotalPages] = useState(1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isChecksLoading, setIsChecksLoading] = useState(false);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
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
    setIsIncidentsLoading(true);
    try {
      const [checksRes, incidentsRes] = await Promise.all([
        client.get(`/api/monitors/${id}/checks?limit=10&page=${checksPage}`),
        client.get(`/api/monitors/${id}/incidents?limit=5&page=${incidentsPage}`)
      ]);
      setChecks(checksRes.data.checks || []);
      setChecksTotalPages(checksRes.data.pagination?.totalPages || 1);
      
      setIncidents(incidentsRes.data.incidents || []);
      setIncidentsTotalPages(incidentsRes.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setIsChecksLoading(false);
      setIsIncidentsLoading(false);
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

  const fetchIncidents = async (page) => {
    setIsIncidentsLoading(true);
    try {
      const res = await client.get(`/api/monitors/${id}/incidents?limit=5&page=${page}`);
      setIncidents(res.data.incidents || []);
      setIncidentsPage(res.data.pagination?.page || 1);
      setIncidentsTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load incidents');
    } finally {
      setIsIncidentsLoading(false);
    }
  };

  const pollData = async () => {
    try {
      const { data } = await client.get(`/api/monitors/${id}`);
      setMonitor(data.monitor);
      // only refresh lists if on page 1
      if (checksPage === 1 && incidentsPage === 1) {
        fetchChecksAndIncidents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  useEffect(() => {
    let intervalId;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        pollData();
        intervalId = setInterval(pollData, 30000);
      }
    };

    if (!document.hidden) {
      intervalId = setInterval(pollData, 30000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, checksPage, incidentsPage]);

  if (isLoading && !monitor) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div>
          <div className="h-4 w-24 bg-zinc-800/50 rounded mb-4"></div>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="h-10 w-64 bg-zinc-800/50 rounded mb-2"></div>
              <div className="h-4 w-48 bg-zinc-800/50 rounded"></div>
            </div>
            <div className="h-10 w-24 bg-zinc-800/50 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-zinc-800/30 rounded-xl border border-zinc-800"></div>
          <div className="h-96 bg-zinc-800/30 rounded-xl border border-zinc-800"></div>
        </div>
      </div>
    );
  }

  if (error || !monitor) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-rose-950/20 border border-rose-500/30 rounded-xl text-center">
        <p className="text-rose-400 mb-4">{error || 'Monitor not found'}</p>
        <Link to="/dashboard" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // --- Calculations for UI ---
  const validResponseTimes = checks.map(c => c.response_time_ms).filter(t => t != null);
  const avgResponse = validResponseTimes.length > 0 ? Math.round(validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length) : 0;
  const maxResponse = validResponseTimes.length > 0 ? Math.max(...validResponseTimes) : 0;
  const minResponse = validResponseTimes.length > 0 ? Math.min(...validResponseTimes) : 0;
  
  const successfulChecks = checks.filter(c => c.is_up).length;
  const totalLoadedChecks = checks.length;
  const recentUptime = totalLoadedChecks > 0 ? ((successfulChecks / totalLoadedChecks) * 100).toFixed(1) : 0;
  const recentFailures = totalLoadedChecks - successfulChecks;

  // Merge activity (checks and incidents)
  const activityFeed = [
    ...checks.map(c => ({ id: `c-${c.id}`, type: 'check', date: c.checked_at, data: c })),
    ...incidents.map(i => ({ id: `i-${i.id}`, type: 'incident', date: i.started_at, data: i }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-6 fade-in duration-500 animate-in">
      
      {/* 1. Header (Strong Hierarchy) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-zinc-800/80 pb-8">
        <div>
          <Link to="/dashboard" className="inline-flex items-center text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors mb-4 uppercase tracking-widest">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-50 tracking-tight flex items-center gap-4">
              {monitor.name}
              <div className="flex items-center relative">
                {monitor.current_status === 'UP' && <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>}
                {monitor.current_status === 'DOWN' && <div className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.8)]"></div>}
                {monitor.current_status === 'UNKNOWN' && <div className="w-3.5 h-3.5 rounded-full bg-zinc-500"></div>}
              </div>
            </h2>
          </div>
          <a href={monitor.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400 text-sm mt-3 inline-flex items-center transition-colors">
            {monitor.url}
          </a>
          {!monitor.is_active && (
            <div className="mt-3 inline-block px-3 py-1 text-xs uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400 rounded border border-zinc-700 shadow-sm">
              Monitoring Paused
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <Link 
            to={`/monitors/${monitor.id}/edit`}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit Configuration
          </Link>
          <div className="text-xs text-zinc-500 font-medium">
            Last checked: {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        
        {/* Main Column (Charts, Timelines, Tables) */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          
          {/* Response Time & Performance */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500" />
                Response Time History
              </h3>
              <div className="flex gap-6 text-xs hidden sm:flex">
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">AVG</span>
                  <span className="text-zinc-200 font-medium">{avgResponse}ms</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">FAST</span>
                  <span className="text-emerald-400 font-medium">{minResponse}ms</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">SLOW</span>
                  <span className="text-rose-400 font-medium">{maxResponse}ms</span>
                </div>
              </div>
            </div>

            <div className="p-6 h-48 relative flex items-end gap-1.5 bg-zinc-950/50 group/chart">
              {/* Grid Lines */}
              <div className="absolute inset-x-6 inset-y-6 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-zinc-800/50"></div>
                <div className="w-full border-t border-zinc-800/50"></div>
                <div className="w-full border-t border-zinc-800/50"></div>
              </div>

              {checks.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">No data available</div>
              ) : (
                checks.slice().reverse().map((check) => {
                  const maxTime = maxResponse || 10;
                  const heightPercent = check.response_time_ms ? Math.max((check.response_time_ms / maxTime) * 100, 4) : 4;
                  
                  return (
                    <div 
                      key={`chart-${check.id}`}
                      className="flex-1 flex flex-col justify-end group/bar relative h-full z-10"
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 text-zinc-100 text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-zinc-700">
                        <div className="font-bold">{check.response_time_ms || 0}ms</div>
                        <div className="text-zinc-400">{new Date(check.checked_at).toLocaleTimeString()}</div>
                      </div>
                      <div 
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-[2px] transition-all duration-300 ${
                          check.is_up 
                            ? 'bg-blue-500/80 group-hover/bar:bg-blue-400 group-hover/bar:brightness-110' 
                            : 'bg-rose-500 group-hover/bar:bg-rose-400'
                        }`}
                      ></div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Recent Check Dots Timeline */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900 flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Timeline (Recent)</span>
              <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
                {checks.length === 0 ? (
                  <span className="text-xs text-zinc-600">No checks</span>
                ) : (
                  checks.slice().reverse().map(check => (
                    <div 
                      key={`dot-${check.id}`}
                      title={`${check.is_up ? 'UP' : 'DOWN'} at ${new Date(check.checked_at).toLocaleTimeString()}`}
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${check.is_up ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    ></div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Checks Data Table */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden">
            <div className="p-6 border-b border-zinc-800/80">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-500" />
                Raw Check Logs
              </h3>
            </div>
            
            {checks.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">No checks recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Response</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {checks.map(check => (
                      <tr key={check.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-3.5">
                          {check.is_up ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium text-xs">
                              <CheckCircle2 className="w-4 h-4" /> UP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-medium text-xs">
                              <XCircle className="w-4 h-4" /> DOWN
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-200 font-medium">
                          {check.response_time_ms ? `${check.response_time_ms}ms` : '-'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`font-mono px-2 py-1 rounded text-[10px] font-bold tracking-wider ${check.is_up ? 'bg-zinc-800 text-zinc-300' : 'bg-rose-500/10 text-rose-400'}`}>
                            {check.status_code || 'ERR'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-zinc-500 text-right text-xs">
                          {new Date(check.checked_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Checks Pagination */}
            {checksTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/50 bg-zinc-950/50">
                <button
                  onClick={() => fetchChecks(checksPage - 1)}
                  disabled={checksPage === 1 || isChecksLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-zinc-900 rounded border border-zinc-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                  {checksPage} / {checksTotalPages}
                </span>
                <button
                  onClick={() => fetchChecks(checksPage + 1)}
                  disabled={checksPage === checksTotalPages || isChecksLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-zinc-900 rounded border border-zinc-800"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Configuration Summary */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden">
            <div className="p-6 border-b border-zinc-800/80">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-500" />
                Configuration
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
              <div className="p-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Check Interval</div>
                <div className="text-xl font-medium text-zinc-200">
                  {monitor.interval_seconds >= 60 ? `${monitor.interval_seconds / 60}m` : `${monitor.interval_seconds}s`}
                </div>
              </div>
              <div className="p-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Timeout</div>
                <div className="text-xl font-medium text-zinc-200">{monitor.timeout_seconds}s</div>
              </div>
              <div className="p-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Expected Status</div>
                <div className="text-xl font-medium text-zinc-200">{monitor.expected_status_code || 200}</div>
              </div>
              <div className="p-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Created At</div>
                <div className="text-sm font-medium text-zinc-200 mt-1">{new Date(monitor.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar (Health, Activity, Incidents) */}
        <div className="space-y-6">
          
          {/* Health Card */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-6">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-6">Monitor Health</h3>
            
            <div className="space-y-6">
              <div>
                <div className="text-4xl font-black tracking-tight text-zinc-50">{recentUptime}%</div>
                <div className="text-xs text-zinc-500 mt-1">Uptime (Recent checks)</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800/50">
                <div>
                  <div className="text-2xl font-bold text-zinc-200">{totalLoadedChecks}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Checks Analyzed</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${recentFailures > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>{recentFailures}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Failed Checks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Incidents Panel */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden">
            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Active & Recent Incidents
              </h3>
            </div>
            
            <div className="p-4 space-y-3 bg-zinc-950/30">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
                  No incidents recorded.
                </div>
              ) : (
                <>
                  {incidents.map(incident => (
                    <div key={incident.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${incident.resolved_at ? 'bg-emerald-500/50' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                      <div className="ml-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${incident.resolved_at ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {incident.resolved_at ? 'RESOLVED' : 'ACTIVE'}
                          </span>
                          <span className="text-[10px] text-zinc-500">{new Date(incident.started_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-zinc-200 font-medium mb-3 leading-relaxed">{incident.reason}</p>
                        <div className="text-[10px] text-zinc-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Started:</span>
                            <span className="text-zinc-400">{new Date(incident.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {incident.resolved_at && (
                            <div className="flex justify-between">
                              <span>Resolved:</span>
                              <span className="text-zinc-400">{new Date(incident.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Incidents Pagination */}
                  {incidentsTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-4">
                      <button
                        onClick={() => fetchIncidents(incidentsPage - 1)}
                        disabled={incidentsPage === 1 || isIncidentsLoading}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        {incidentsPage} / {incidentsTotalPages}
                      </span>
                      <button
                        onClick={() => fetchIncidents(incidentsPage + 1)}
                        disabled={incidentsPage === incidentsTotalPages || isIncidentsLoading}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-6">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-6 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Recent Activity
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-zinc-800">
              {activityFeed.length === 0 ? (
                <div className="text-xs text-zinc-500 pl-8">No activity yet.</div>
              ) : (
                activityFeed.slice(0, 8).map((activity) => {
                  const isIncident = activity.type === 'incident';
                  const isUp = !isIncident && activity.data.is_up;
                  
                  return (
                    <div key={activity.id} className="relative flex items-start group">
                      {/* Timeline Dot */}
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-[#09090b] ${isIncident ? 'bg-rose-500' : (isUp ? 'bg-emerald-500' : 'bg-rose-500')} absolute left-0 shadow-sm z-10 mt-1`}></div>
                      
                      {/* Content Box */}
                      <div className="ml-10 w-full p-3 border border-zinc-800/80 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isIncident ? 'text-rose-400' : (isUp ? 'text-emerald-400' : 'text-rose-400')}`}>
                            {isIncident ? 'Incident' : (isUp ? 'Checked' : 'Failed')}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-300">
                          {isIncident ? activity.data.reason : `${activity.data.response_time_ms || 0}ms · HTTP ${activity.data.status_code || 'ERR'}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MonitorDetails;
