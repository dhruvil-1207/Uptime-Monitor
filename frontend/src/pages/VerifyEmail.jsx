import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing from the URL.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verifyToken = async () => {
      try {
        const response = await client.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired verification token.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="max-w-md w-full mx-auto p-8 border border-slate-800 rounded-xl bg-slate-800/30 shadow-xl mt-12 text-center">
      {status === 'loading' && (
        <div className="py-6">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-white mb-2">Verifying your email...</h2>
          <p className="text-slate-400 text-sm">Please wait a moment while we confirm your account.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 text-success mb-4 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">{message}</h2>
          <p className="text-slate-400 mb-6 text-sm">Your account is now fully active. You can sign in and start monitoring.</p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/20 text-danger mb-4 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Verification Failed</h2>
          <p className="text-slate-400 mb-6 text-sm">{message}</p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;
