
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Mail, Lock, User, ArrowRight, Github, Chrome, CheckCircle2 } from 'lucide-react';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate signup
    setTimeout(() => {
      localStorage.setItem('devinquire_auth', 'true');
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* Left Side - Form */}
        <div className="p-8 md:p-12">
          <div className="mb-10">
            <Link to="/landing" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Layout size={22} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">DevInquire</span>
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create account</h1>
            <p className="text-slate-500">Join 10,000+ teams building the web</p>
            <div className="mt-4 p-2 bg-blue-50 rounded-lg border border-blue-100 inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Demo Mode Active</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <input type="checkbox" required className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <p className="text-xs text-slate-500 leading-relaxed">
                I agree to the <a href="#" className="font-bold text-blue-600">Terms of Service</a> and <a href="#" className="font-bold text-blue-600">Privacy Policy</a>.
              </p>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">Log in</Link>
          </p>
        </div>

        {/* Right Side - Features/Social */}
        <div className="hidden md:flex flex-col justify-center bg-slate-900 p-12 text-white">
          <h2 className="text-2xl font-bold mb-8">Why teams choose DevInquire:</h2>
          <ul className="space-y-6 mb-12">
            <li className="flex items-start gap-4">
              <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                <CheckCircle2 size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold mb-1">Real-time Collaboration</h4>
                <p className="text-sm text-slate-400">Edit together with your team in the same room. No more conflicts.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                <CheckCircle2 size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold mb-1">Visual Page Builder</h4>
                <p className="text-sm text-slate-400">Intuitive drag and drop interface for designers and creators.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                <CheckCircle2 size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold mb-1">Enterprise Security</h4>
                <p className="text-sm text-slate-400">SSO, advanced permissions, and secure infrastructure by default.</p>
              </div>
            </li>
          </ul>

          <div className="pt-8 border-t border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Trusted by</p>
            <div className="flex gap-6 opacity-40 grayscale">
              <Github size={24} />
              <Chrome size={24} />
              <div className="font-bold text-xl italic">LOGO</div>
              <div className="font-bold text-xl italic">BRAND</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
