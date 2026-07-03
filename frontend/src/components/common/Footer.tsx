import { Activity } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-700">RSMS</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Research Survey Management System. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-700">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
