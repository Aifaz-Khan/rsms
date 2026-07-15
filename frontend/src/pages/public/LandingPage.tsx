import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, BarChart3, Users, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { surveyApi } from '../../api';

const stats = [
  { label: 'Surveys Created', value: '500+' },
  { label: 'Responses Collected', value: '50,000+' },
  { label: 'Research Institutions', value: '120+' },
  { label: 'Data Accuracy', value: '99.9%' },
];

const features = [
  { icon: BarChart3, title: 'Advanced Analytics', description: 'Real-time charts, heatmaps, and detailed question-wise analysis for deep research insights.' },
  { icon: Shield, title: 'Secure & Compliant', description: 'JWT authentication, encrypted data storage, and GDPR-compliant data handling.' },
  { icon: Users, title: 'Multi-Role Access', description: 'Admin, Researcher, and Participant roles with granular permission controls.' },
  { icon: Clock, title: 'Auto-Save & Resume', description: 'Participants can resume surveys anytime. No data is ever lost.' },
];

const faqs = [
  { q: 'Do participants need to create an account?', a: 'No. Participants receive a unique secure token that allows them to access and resume their survey without any registration.' },
  { q: 'Can I create multiple surveys?', a: 'Yes. RSMS supports unlimited surveys with different sections, question types, and conditional logic.' },
  { q: 'What question types are supported?', a: 'RSMS supports 17 question types including Short Text, Radio, Checkbox, Likert Scale, Rating, File Upload, Slider, and more.' },
  { q: 'Can I export survey data?', a: 'Yes. You can export responses in CSV, Excel, and PDF formats directly from the admin panel.' },
  { q: 'Is conditional logic supported?', a: 'Yes. You can configure skip logic and section branching based on participant answers, all configurable through the admin panel.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: surveysData, isLoading } = useQuery({
    queryKey: ['activeSurveys'],
    queryFn: () => surveyApi.getActiveList(),
  });

  const activeSurveys = surveysData?.data?.data || [];

  return (
    <div className="bg-medical-light">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-100 mb-6">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
            Professional Research Platform
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-6">
            Research Survey Management
            <span className="text-primary-600"> System</span>
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
            <span>Designed & Engineered by Aifaz Khan</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">Patent Pending</span>
          </div>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            A professional, configurable survey platform designed for medical research, academic studies, and institutional data collection. Build, deploy, and analyze surveys with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {activeSurveys.length > 0 ? (
              <Link to={`/survey/${activeSurveys[0].slug}`} className="btn-primary px-6 py-3 text-base">
                Take the Active Survey <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a href="#surveys" className="btn-primary px-6 py-3 text-base">
                View Surveys <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <Link to="/login" className="btn-secondary px-6 py-3 text-base">
              Admin Login
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-white border-y border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-primary-600">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Built for Serious Research
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              RSMS is a comprehensive survey management platform designed for medical researchers, academic institutions, and healthcare organizations. It provides all the tools needed to design, deploy, and analyze complex research surveys.
            </p>
            <ul className="space-y-3">
              {['Configurable survey builder with 17+ question types', 'Conditional logic and skip patterns', 'Auto-save with resume capability', 'Real-time analytics and reporting', 'Export to CSV, Excel, and PDF'].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Ayurgrama Indriya Arogya Survey 3.0</p>
                  <p className="text-xs text-slate-500">20 sections · 130+ questions · Active</p>
                </div>
                <span className="ml-auto badge badge-success">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800">1,247</p>
                  <p className="text-xs text-slate-500">Responses</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800">78%</p>
                  <p className="text-xs text-slate-500">Completion Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Surveys List */}
      <section id="surveys" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-slate-50 rounded-2xl my-8 border border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Active Research Surveys</h2>
          <p className="text-slate-600 max-w-xl mx-auto">Select a survey below to participate in our ongoing research studies. No account creation required.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeSurveys.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {activeSurveys.map((survey: any) => (
              <div key={survey.id} className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge badge-success">Live</span>
                    <span className="text-xs text-slate-400 font-medium">{(survey._count?.sections ?? 0)} Sections</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{survey.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">{survey.description || 'No description provided.'}</p>
                </div>
                <Link
                  to={`/survey/${survey.slug}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors mt-2"
                >
                  Start Survey <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-100 max-w-md mx-auto">
            <p className="text-slate-500 font-medium mb-1">No surveys are active right now</p>
            <p className="text-xs text-slate-400">Please check back later or contact the research team.</p>
          </div>
        )}
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Platform Features</h2>
            <p className="text-slate-600 max-w-xl mx-auto">Everything you need to run professional research surveys at scale.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card hover:shadow-card-hover transition-shadow"
              >
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-slate-800 text-sm">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Research?</h2>
          <p className="text-primary-100 mb-8 max-w-xl mx-auto">
            Contact us to set up your research survey or participate in our ongoing Ayurvedic Medical Research Study.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {activeSurveys.length > 0 ? (
              <Link to={`/survey/${activeSurveys[0].slug}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors">
                Participate in Survey <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a href="#surveys" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors">
                View Active Surveys <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <a href="mailto:contact@rsms.com" className="inline-flex items-center gap-2 px-6 py-3 border border-primary-400 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
