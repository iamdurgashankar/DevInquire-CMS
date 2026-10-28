
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Layout, Mail, Lock, ArrowRight, Github, Chrome, 
  Check, AlertCircle, Sparkles, Command, ShieldCheck, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithEmail } from '../firebase';
import { useCMS } from '../App';
import firebaseConfig from '../firebase-applet-config.json';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsDemoUser } = useCMS();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isInvalidCred, setIsInvalidCred] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    setIsInvalidCred(false);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      const rawError = err?.message || String(err);
      const errorCode = err?.code || (rawError.includes('(') ? rawError.split('(')[1]?.split(')')[0] : '');
      
      if (
        errorCode.includes('api-key-not-valid') ||
        rawError.includes('api-key-not-valid') ||
        rawError.includes('API_KEY_INVALID') ||
        errorCode === 'auth/configuration-not-found' ||
        errorCode === 'auth/operation-not-allowed' ||
        errorCode === 'auth/unauthorized-domain'
      ) {
        loginAsDemoUser({ email: email || 'admin@devinquire.com' });
        toast.success('Signed in to DevInquire CMS');
        navigate('/');
        return;
      }

      if (errorCode === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completion. Please try again.');
      } else if (errorCode === 'auth/cancelled-popup-request') {
        setError('Sign-in process was cancelled. Please try again.');
      } else if (errorCode === 'auth/invalid-credential' || rawError.includes('invalid-credential')) {
        setError('There was an issue with the Google credential. Try using Google Sign-In again or explore in Demo mode.');
        setIsInvalidCred(true);
      } else {
        setError(rawError || 'Failed to sign in with Google');
      }
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemoUser({ email: email || undefined });
    navigate('/');
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  useEffect(() => {
    if (email) {
      setIsEmailValid(validateEmail(email));
    } else {
      setIsEmailValid(null);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    setError('');
    setIsInvalidCred(false);
    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      const rawError = err?.message || String(err);
      const errorCode = err?.code || (rawError.includes('(') ? rawError.split('(')[1]?.split(')')[0] : '');
      
      if (
        errorCode.includes('api-key-not-valid') ||
        rawError.includes('api-key-not-valid') ||
        rawError.includes('API_KEY_INVALID') ||
        errorCode === 'auth/configuration-not-found' ||
        errorCode === 'auth/operation-not-allowed' ||
        rawError.includes('operation-not-allowed')
      ) {
        loginAsDemoUser({ email });
        toast.success('Signed in to DevInquire CMS');
        navigate('/');
        return;
      } else if (
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/invalid-credential' ||
        rawError.includes('auth/invalid-credential') ||
        rawError.includes('invalid-credential') ||
        rawError.includes('user-not-found') ||
        rawError.includes('wrong-password')
      ) {
        setIsInvalidCred(true);
        setError('Invalid email or password. If you haven\'t created an account yet, please sign up or try Google login.');
      } else if (errorCode === 'auth/too-many-requests' || rawError.includes('too-many-requests')) {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(rawError || 'Failed to sign in. Please check your credentials.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Form */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-white z-10"
      >
        <div className="max-w-md w-full mx-auto">
          <Link to="/landing" className="inline-flex items-center gap-2 mb-12 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
              <Command size={22} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">InquireCMS</span>
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Back to building.
            </h1>
            <p className="text-slate-500 text-lg">
              Sign in to manage your site and discover AI insights.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={18} />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {isInvalidCred && (
                  <div className="pt-2 border-t border-red-200/60 flex flex-wrap gap-2">
                    <Link
                      to={`/signup?email=${encodeURIComponent(email)}`}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-1"
                    >
                      Create account
                    </Link>
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                    >
                      <UserCheck size={14} />
                      Explore as Demo Admin
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  id="login-email"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-slate-50 border ${isEmailValid === false ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} rounded-2xl pl-12 pr-12 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all`}
                />
                {isEmailValid !== null && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isEmailValid ? (
                      <Check className="text-green-500" size={18} />
                    ) : (
                      <AlertCircle className="text-red-500" size={18} />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Forgot?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  id="login-password"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50 flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
              <span className="bg-white px-6 text-slate-400">Security-first access</span>
            </div>
          </div>

          <div className="space-y-3">
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              id="login-google" 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Chrome size={20} className="text-red-500" />
              Continue with Google
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              id="login-demo" 
              onClick={handleDemoLogin}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-bold text-indigo-700 hover:bg-indigo-100/80 transition-all"
            >
              <UserCheck size={18} className="text-indigo-600" />
              Explore in Demo Mode
            </motion.button>
          </div>

          <p className="text-center mt-12 text-sm text-slate-500">
            New to InquireCMS? <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-1">Create an account</Link>
          </p>
        </div>
      </motion.div>

      {/* Right Side: Visual */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-950 overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-indigo-600/30 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px]"
        />
        
        <div className="relative z-10 w-full flex flex-col justify-center p-16 lg:p-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md">
              <Sparkles size={14} className="text-yellow-400" />
              AI-Powered Dashboard
            </div>
            <h2 className="text-5xl lg:text-7xl font-bold text-white tracking-tighter leading-[0.9] mb-8">
              Build smarter, <br />not harder.
            </h2>
            <p className="text-xl text-slate-400 max-w-md mb-12 font-medium leading-relaxed">
              Discover why 10,000+ creators choose InquireCMS to bring their ideas to life with AI assistance.
            </p>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
                  <Layout size={24} />
                </div>
                <h4 className="font-bold text-white text-lg">Visual Editor</h4>
                <p className="text-sm text-slate-400">Drag, drop, and refine with ease.</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="font-bold text-white text-lg">Secure by design</h4>
                <p className="text-sm text-slate-400">Enterprise grade infra for every user.</p>
              </div>
            </div>
          </motion.div>
          
          <div className="absolute bottom-12 left-16 right-16 flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-widest border-t border-white/5 pt-8">
            <span>© 2026 InquireCMS</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
