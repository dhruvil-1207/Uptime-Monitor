import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, password);
      setSuccess(true);
      // Optional: automatically navigate to login after a short delay
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        setError(err.response.data.message || 'Please check the information you entered.');
      } else {
        setError('Unable to reach the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-8 border border-slate-800 rounded-xl bg-slate-800/30 shadow-xl mt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Create an account</h2>
        <p className="text-slate-400 mt-2 text-sm">Start monitoring your services</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3 text-danger">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success ? (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 text-success mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Registration successful!</h3>
          <p className="text-slate-400 mb-6 text-sm">You can now sign in with your credentials.</p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-white outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
};

export default Register;
