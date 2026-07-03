import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">RSMS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</a>
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#faq" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
            <a href="#contact" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/admin/dashboard" className="btn-primary text-sm">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-primary text-sm">
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
