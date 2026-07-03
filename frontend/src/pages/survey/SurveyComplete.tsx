import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SurveyComplete() {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-medical-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h1>
        <p className="text-slate-600 mb-2">
          Your survey response has been submitted successfully.
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Your contribution to this research is greatly appreciated. The data you provided will help advance our understanding of health and wellness.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/" className="btn-primary justify-center">
            <Home className="w-4 h-4" /> Return to Home
          </Link>
          <Link to={`/survey/${slug}`} className="btn-secondary justify-center text-sm">
            View Survey Again
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
