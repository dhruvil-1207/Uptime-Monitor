import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

const MonitorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    url: 'https://',
    intervalSeconds: 300,
    timeoutSeconds: 5,
    expectedStatusCode: 200,
  });
  
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const intervalOptions = [
    { value: 60, label: 'Every 1 minute' },
    { value: 300, label: 'Every 5 minutes' },
    { value: 600, label: 'Every 10 minutes' },
    { value: 1800, label: 'Every 30 minutes' },
    { value: 3600, label: 'Every 1 hour' },
  ];

  useEffect(() => {
    const fetchMonitor = async () => {
      try {
        const { data } = await client.get(`/api/monitors/${id}`);
        const m = data.monitor;
        const initialForm = {
          name: m.name,
          url: m.url,
          intervalSeconds: m.interval_seconds,
          timeoutSeconds: m.timeout_seconds,
          expectedStatusCode: m.expected_status_code,
        };
        setFormData(initialForm);
        setOriginalData(initialForm);
      } catch (err) {
        setError('Failed to load monitor details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isEditMode) {
      fetchMonitor();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation matching backend requirements
    if (formData.timeoutSeconds >= formData.intervalSeconds) {
      setError('Timeout must be less than the monitoring interval.');
      return;
    }

    if (formData.timeoutSeconds < 1 || formData.timeoutSeconds > 30) {
      setError('Timeout must be between 1 and 30 seconds.');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode) {
        // Build partial update payload with snake_case keys for PATCH
        const payload = {};
        if (formData.name !== originalData.name) payload.name = formData.name;
        if (formData.url !== originalData.url) payload.url = formData.url;
        if (formData.intervalSeconds !== originalData.intervalSeconds) payload.interval_seconds = formData.intervalSeconds;
        if (formData.timeoutSeconds !== originalData.timeoutSeconds) payload.timeout_seconds = formData.timeoutSeconds;
        if (formData.expectedStatusCode !== originalData.expectedStatusCode) payload.expected_status_code = formData.expectedStatusCode;
        
        if (Object.keys(payload).length > 0) {
          await client.patch(`/api/monitors/${id}`, payload);
        }
        navigate('/dashboard');
      } else {
        // Create payload uses camelCase
        await client.post('/api/monitors', formData);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Please check the information you entered.');
      } else {
        setError('Unable to save monitor. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {isEditMode ? 'Edit Monitor' : 'Create Monitor'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isEditMode ? 'Update your monitoring configuration.' : 'Add a new endpoint to monitor.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3 text-rose-500">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 border border-slate-800 rounded-xl bg-slate-800/30 space-y-6 shadow-sm">
        <div className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monitor Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
              placeholder="e.g., Production API"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">URL to check</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Check Interval</label>
              <select
                name="intervalSeconds"
                value={formData.intervalSeconds}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors appearance-none"
              >
                {intervalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Timeout (seconds)</label>
              <input
                type="number"
                name="timeoutSeconds"
                value={formData.timeoutSeconds}
                onChange={handleChange}
                required
                min={1}
                max={30}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Must be between 1 and 30 seconds.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Expected Status Code</label>
            <input
              type="number"
              name="expectedStatusCode"
              value={formData.expectedStatusCode}
              onChange={handleChange}
              required
              min={100}
              max={599}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
            />
          </div>
          
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditMode ? 'Save Changes' : 'Create Monitor'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MonitorForm;
