import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MonitorForm from './pages/MonitorForm';
import MonitorDetails from './pages/MonitorDetails';
import { LogOut, Activity } from 'lucide-react';

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-[15px] font-semibold tracking-tight text-slate-100 flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center shadow-sm">
            <Activity className="w-3.5 h-3.5 text-slate-100" />
          </div>
          Uptime
        </Link>
      </div>
      
      {isAuthenticated && (
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-md transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      )}
    </header>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 relative">
      {/* Subtle Dot Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto fade-in duration-700 animate-in">
          {children}
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Unauthenticated Routes */}
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Layout><Register /></Layout>} />
      
      {/* Authenticated Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/monitors/new" element={<Layout><MonitorForm /></Layout>} />
        <Route path="/monitors/:id/edit" element={<Layout><MonitorForm /></Layout>} />
        <Route path="/monitors/:id" element={<Layout><MonitorDetails /></Layout>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
