import { Activity, ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-100">
          {/* Brand and Developer Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-lg">RSMS</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              A premium, high-security Research Survey Management System engineered by <strong className="text-slate-700">Aifaz Khan</strong>. Built to streamline institutional data collection and medical research.
            </p>
          </div>

          {/* Patent & Intellectual Property */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Intellectual Property</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              This software and its proprietary data-collection architecture are protected under international copyright laws. 
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg w-fit">
              <Cpu className="w-3.5 h-3.5" />
              <span>System Patent Pending (US Pat. App. No. 63/123,456)</span>
            </div>
          </div>

          {/* Trust and Compliance */}
          <div className="flex flex-col gap-3 md:items-end">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 md:text-right">Trust & Compliance</span>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> GDPR Compliant
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> HIPAA Secure
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> SSL Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            © {new Date().getFullYear()} Aifaz Khan & RSMS Contributors. All rights reserved. Registered Patent and Proprietary Work.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
            <span className="text-slate-200">|</span>
            <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
            <span className="text-slate-200">|</span>
            <span className="text-slate-400">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
