import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import { LogOut, Activity } from 'lucide-react';

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  
  return (
    <header className="border-b border-slate-800 p-4 bg-slate-900/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Activity className="w-6 h-6 text-emerald-400" />
        UptimeMonitor
      </Link>
      
      {isAuthenticated && (
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      )}
    </header>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        {children}
      </main>
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
        <Route path="/dashboard" element={
          <Layout>
            <div className="p-8 border border-slate-800 rounded-xl bg-slate-800/30">
              <h2 className="text-xl mb-4 font-semibold">Dashboard Placeholder</h2>
              <p className="text-slate-400 text-sm">Will be implemented in Phase 3. You are authenticated!</p>
            </div>
          </Layout>
        } />
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
