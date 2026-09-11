import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, Clock, Activity, CheckCircle2, XCircle, Edit, AlertTriangle, Zap, Settings, BarChart2, History, Download, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MonitorDetails = () => {
  const { id } = useParams();
  
  const [monitor, setMonitor] = useState(null);
  const [history, setHistory] = useState(null);
  const [timeRange, setTimeRange] = useState('24h'); // '24h', '7d', '30d', 'all'
  
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMonitorOnly = async () => {
    try {
      const { data } = await client.get(`/api/monitors/${id}`);
      setMonitor(data.monitor);
    } catch (err) {
      setError('Failed to load monitor details.');
    }
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const { data } = await client.get(`/api/monitors/${id}/history?timeRange=${timeRange}`);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsHistoryLoading(false);
      setIsLoading(false);
    }
  };

  const fetchAllData = async () => {
    await fetchMonitorOnly();
    await fetchHistory();
  };

  const pollData = async () => {
    try {
      const { data } = await client.get(`/api/monitors/${id}`);
      setMonitor(data.monitor);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id, timeRange]);

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
  }, [id]);

  const generatePDF = () => {
    if (!monitor || !history) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Uptime Monitor Report', pageWidth / 2, 20, { align: 'center' });

    // Monitor Info
    doc.setFontSize(12);
    doc.text(`Monitor: ${monitor.name}`, 14, 40);
    doc.text(`URL: ${monitor.url}`, 14, 48);
    doc.text(`Expected Status: ${monitor.expected_status_code || 200}`, 14, 56);
    doc.text(`Interval: ${monitor.interval_seconds}s`, 14, 64);
    
    const rangeLabels = { '24h': 'Last 24 Hours', '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'all': 'All Time' };
    doc.text(`Reporting Period: ${rangeLabels[timeRange]}`, 120, 40);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 120, 48);

    // Summary Stats
    doc.setFontSize(16);
    doc.text('Summary', 14, 80);
    
    const summaryData = [
      ['Uptime', `${history.summary.uptimePercentage}%`],
      ['Total Checks', history.summary.totalChecks.toString()],
      ['Successful Checks', history.summary.successfulChecks.toString()],
      ['Failed Checks', history.summary.failedChecks.toString()],
      ['Avg Response Time', `${history.summary.avgResponseTime || 0}ms`],
      ['Min Response Time', `${history.summary.minResponseTime || 0}ms`],
      ['Max Response Time', `${history.summary.maxResponseTime || 0}ms`],
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }
    });

    // Incidents
    doc.text('Incidents', 14, doc.lastAutoTable.finalY + 15);
    
    if (history.incidents.length === 0) {
      doc.setFontSize(12);
      doc.text('No incidents recorded in this period.', 14, doc.lastAutoTable.finalY + 25);
    } else {
      const incidentData = history.incidents.map(inc => {
        const start = new Date(inc.started_at);
        const end = inc.resolved_at ? new Date(inc.resolved_at) : null;
        let durationStr = 'Ongoing';
        
        if (end) {
          const diffMins = Math.round((end - start) / 60000);
          durationStr = diffMins > 60 ? `${(diffMins/60).toFixed(1)}h` : `${diffMins}m`;
        }

        return [
          start.toLocaleString(),
          end ? end.toLocaleString() : 'Ongoing',
          durationStr,
          inc.reason || 'Unknown error'
        ];
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Started', 'Resolved', 'Duration', 'Reason']],
        body: incidentData,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72] }
      });
    }

    doc.save(`${monitor.name.replace(/\\s+/g, '_')}_Report.pdf`);
  };

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

  const { summary, chartData, recentChecks, incidents } = history || { summary: {}, chartData: [], recentChecks: [], incidents: [] };

  // Merge activity (recent checks and incidents) for the sidebar feed
  const activityFeed = history ? [
    ...recentChecks.map(c => ({ id: `c-${c.id}`, type: 'check', date: c.checked_at, data: c })),
    ...incidents.map(i => ({ id: `i-${i.id}`, type: 'incident', date: i.started_at, data: i }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 fade-in duration-500 animate-in">
      
      {/* 1. Header */}
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
          <div className="flex gap-2">
            <button 
              onClick={generatePDF}
              disabled={isHistoryLoading || !history}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Report
            </button>
            <Link 
              to={`/monitors/${monitor.id}/edit`}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
          </div>
          <div className="text-xs text-zinc-500 font-medium mt-1">
            Last checked: {monitor.last_checked_at ? new Date(monitor.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <h3 className="text-xl font-bold text-zinc-100">Analytics History</h3>
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          {['24h', '7d', '30d', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${timeRange === range ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          
          {/* Response Time Chart */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500" />
                Response Time History
              </h3>
              <div className="flex gap-6 text-xs hidden sm:flex">
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">AVG</span>
                  <span className="text-zinc-200 font-medium">{summary.avgResponseTime || 0}ms</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">FAST</span>
                  <span className="text-emerald-400 font-medium">{summary.minResponseTime || 0}ms</span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase font-bold tracking-wider mr-2">SLOW</span>
                  <span className="text-rose-400 font-medium">{summary.maxResponseTime || 0}ms</span>
                </div>
              </div>
            </div>

            <div className="p-6 h-64 w-full bg-zinc-950/50">
              {isHistoryLoading ? (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">Loading chart...</div>
              ) : chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return timeRange === '24h' ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : d.toLocaleDateString([], {month: 'short', day: 'numeric'});
                      }}
                      stroke="#52525b" 
                      fontSize={10}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#52525b" 
                      fontSize={10}
                      tickFormatter={(val) => `${val}ms`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.5rem', color: '#f4f4f5', fontSize: '12px' }}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      formatter={(value) => [`${value}ms`, 'Response Time']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="response_time_ms" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorResponse)" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">No data available for this time range</div>
              )}
            </div>
            
            {/* Recent Check Dots Timeline */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-900 flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Timeline (Recent)</span>
              <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
                {recentChecks && recentChecks.length === 0 ? (
                  <span className="text-xs text-zinc-600">No checks</span>
                ) : (
                  recentChecks?.slice().reverse().map(check => (
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
            <div className="p-6 border-b border-zinc-800/80 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-500" />
                Recent Checks Log
              </h3>
              <span className="text-xs text-zinc-500">Showing last 50 checks</span>
            </div>
            
            {isHistoryLoading ? (
               <div className="p-12 text-center text-zinc-500 text-sm">Loading logs...</div>
            ) : recentChecks && recentChecks.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">No checks recorded in this time range.</div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Response</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {recentChecks?.map(check => (
                      <tr key={check.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-3.5">
                          {check.is_up ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium text-xs">
                              <CheckCircle2 className="w-4 h-4" /> UP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-medium text-xs" title={check.error_message}>
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

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Health Card */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-6">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-6">Monitor Health</h3>
            
            <div className="space-y-6">
              <div>
                {isHistoryLoading ? (
                  <div className="h-10 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                ) : (
                  <div className="text-4xl font-black tracking-tight text-zinc-50">{summary.uptimePercentage || 0}%</div>
                )}
                <div className="text-xs text-zinc-500 mt-1">Uptime ({timeRange})</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800/50">
                <div>
                  <div className="text-2xl font-bold text-zinc-200">{summary.totalChecks || 0}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Checks</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${summary.failedChecks > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>{summary.failedChecks || 0}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Incidents Panel */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Incidents ({timeRange})
              </h3>
            </div>
            
            <div className="p-4 space-y-3 bg-zinc-950/30 overflow-y-auto custom-scrollbar flex-1">
              {isHistoryLoading ? (
                <div className="p-6 text-center text-zinc-500 text-xs">Loading incidents...</div>
              ) : incidents && incidents.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs flex flex-col items-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
                  No incidents in this period.
                </div>
              ) : (
                incidents?.map(incident => (
                  <div key={incident.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${incident.resolved_at ? 'bg-emerald-500/50' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                    <div className="ml-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded uppercase ${incident.resolved_at ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {incident.resolved_at ? 'RESOLVED' : 'ACTIVE'}
                        </span>
                        <span className="text-[10px] text-zinc-500">{new Date(incident.started_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-200 font-medium mb-3 leading-relaxed">{incident.reason || 'Service unavailable'}</p>
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
                        {incident.resolved_at && (
                          <div className="flex justify-between mt-2 pt-2 border-t border-zinc-800">
                            <span>Downtime:</span>
                            <span className="text-zinc-400">
                              {Math.round((new Date(incident.resolved_at) - new Date(incident.started_at)) / 60000)} mins
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-6 hidden lg:block">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-6 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Recent Activity
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-zinc-800">
              {activityFeed.length === 0 ? (
                <div className="text-xs text-zinc-500 pl-8">No activity yet.</div>
              ) : (
                activityFeed.slice(0, 5).map((activity) => {
                  const isIncident = activity.type === 'incident';
                  const isUp = !isIncident && activity.data.is_up;
                  
                  return (
                    <div key={activity.id} className="relative flex items-start group">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-[#09090b] ${isIncident ? 'bg-rose-500' : (isUp ? 'bg-emerald-500' : 'bg-rose-500')} absolute left-0 shadow-sm z-10 mt-1`}></div>
                      
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
