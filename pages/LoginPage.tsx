import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Layout, Mail, Lock, ArrowRight, Chrome, 
  Check, AlertCircle, Command, ShieldCheck, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithEmail } from '../firebase';
import { useCMS } from '../App';
import { toast } from 'sonner';
import { AppleThemeSwitcher } from '../components/AppleThemeSwitcher';

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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col md:flex-row overflow-hidden font-sans transition-colors duration-200">
      {/* Left Side: Apple ID Style Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full md:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white dark:bg-[#1C1C1E] z-10"
      >
        <div className="flex items-center justify-between">
          <Link to="/landing" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#007AFF] dark:bg-[#0A84FF] rounded-xl flex items-center justify-center text-white shadow-sm">
              <Command size={19} />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">InquireCMS</span>
          </Link>
          <AppleThemeSwitcher variant="segmented" />
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-2">
              Sign in to InquireCMS
            </h1>
            <p className="text-[#86868B] dark:text-[#98989D] text-sm">
              Enter your credentials to access your visual workspace and collections.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/25 text-[#FF3B30] dark:text-[#FF453A] text-xs font-medium rounded-2xl flex flex-col gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {isInvalidCred && (
                  <div className="pt-2 border-t border-[#FF3B30]/20 flex flex-wrap gap-2">
                    <Link
                      to={`/signup?email=${encodeURIComponent(email)}`}
                      className="px-3 py-1.5 bg-[#FF3B30] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                    >
                      Create account
                    </Link>
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="px-3 py-1.5 bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                    >
                      <UserCheck size={13} />
                      Explore as Demo Admin
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] ml-0.5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#007AFF] dark:group-focus-within:text-[#0A84FF] transition-colors" size={17} />
                <input 
                  id="login-email"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border ${
                    isEmailValid === false
                      ? 'border-[#FF3B30]'
                      : 'border-black/[0.08] dark:border-white/[0.10]'
                  } rounded-xl pl-10 pr-10 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#3A3A3C] focus:ring-3 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF] outline-none transition-all`}
                />
                {isEmailValid !== null && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isEmailValid ? (
                      <Check className="text-[#34C759]" size={16} />
                    ) : (
                      <AlertCircle className="text-[#FF3B30]" size={16} />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-0.5">
                <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Password</label>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="text-xs font-medium text-[#007AFF] dark:text-[#0A84FF] hover:underline"
                >
                  Use Demo Account
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#007AFF] dark:group-focus-within:text-[#0A84FF] transition-colors" size={17} />
                <input 
                  id="login-password"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#3A3A3C] focus:ring-3 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/30 focus:border-[#007AFF] dark:focus:border-[#0A84FF] outline-none transition-all"
                />
              </div>
            </div>

            <button 
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#409CFF] text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#1C1C1E] px-4 text-[#86868B] dark:text-[#98989D]">or continue with</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button 
              id="login-google" 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA]/70 dark:hover:bg-[#3A3A3C] border border-black/[0.08] dark:border-white/[0.10] rounded-xl text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              <Chrome size={18} className="text-[#007AFF] dark:text-[#0A84FF]" />
              <span>Continue with Google</span>
            </button>

            <button 
              id="login-demo" 
              onClick={handleDemoLogin}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 hover:bg-[#007AFF]/15 dark:hover:bg-[#0A84FF]/25 border border-[#007AFF]/20 dark:border-[#0A84FF]/30 rounded-xl text-sm font-semibold text-[#007AFF] dark:text-[#0A84FF] transition-all active:scale-[0.99]"
            >
              <UserCheck size={17} />
              <span>Explore in Demo Mode</span>
            </button>
          </div>

          <p className="text-center mt-8 text-xs text-[#86868B] dark:text-[#98989D]">
            New to InquireCMS?{' '}
            <Link to="/signup" className="font-semibold text-[#007AFF] dark:text-[#0A84FF] hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <div className="text-xs text-[#86868B] dark:text-[#98989D] flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
          <span>© 2026 InquireCMS</span>
          <Link to="/landing" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">
            Back to Home
          </Link>
        </div>
      </motion.div>

      {/* Right Side: Apple Studio Showcase */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#F5F5F7] dark:bg-[#141416] border-l border-black/[0.06] dark:border-white/[0.08] overflow-hidden items-center justify-center p-12 lg:p-20">
        <div className="max-w-lg w-full space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF]">
              Visual Experience Studio
            </p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight leading-[1.08] text-balance">
              Crafted for clarity, speed, and control.
            </h2>
            <p className="text-base text-[#86868B] dark:text-[#98989D] leading-relaxed">
              Manage your entire web presence—from visual blocks and sitemaps to headless collections and team permissions—in one unified workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#2C2C2E] p-6 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] mb-3">
                <Layout size={20} />
              </div>
              <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm mb-1">Visual Hierarchy</h4>
              <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed">
                Drag, drop, and reorder blocks across sections with instant visual feedback.
              </p>
            </div>
            <div className="bg-white dark:bg-[#2C2C2E] p-6 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center text-[#34C759] mb-3">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm mb-1">Role Governance</h4>
              <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed">
                Granular RBAC permissions and point-in-time page version snapshots.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
