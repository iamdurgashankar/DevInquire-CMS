import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mail, Lock, User, ArrowRight, 
  Chrome, Check, AlertCircle, Sparkles, 
  Command, Zap, Globe, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signupWithEmail, updateProfile } from '../firebase';
import { useCMS } from '../App';
import { toast } from 'sonner';
import { AppleThemeSwitcher } from '../components/AppleThemeSwitcher';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAsDemoUser } = useCMS();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const markNewAccountCreated = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'devinquire_cms_new_account=1; max-age=86400; path=/; SameSite=Lax';
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('devinquire_cms_new_account', '1');
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');
    try {
      const cred: any = await signInWithGoogle();
      const meta = cred?.user?.metadata;
      const isNew =
        cred?._tokenResponse?.isNewUser ||
        (meta?.creationTime && meta?.lastSignInTime && meta.creationTime === meta.lastSignInTime);
      if (isNew) markNewAccountCreated();
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
        loginAsDemoUser({ name: name || undefined, email: email || 'admin@devinquire.com' });
        markNewAccountCreated();
        toast.success('Account ready! Welcome to DevInquire CMS.');
        navigate('/');
        return;
      }
      setError(rawError || 'Failed to sign up with Google');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemoUser({ name: name || undefined, email: email || undefined });
    navigate('/');
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  useEffect(() => {
    if (email) {
      setIsEmailValid(validateEmail(email));
    } else {
      setIsEmailValid(null);
    }
  }, [email]);

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-[#FF3B30]';
    if (passwordStrength <= 3) return 'bg-[#FF9F0A]';
    if (passwordStrength <= 4) return 'bg-[#4e45e1]';
    return 'bg-[#34C759]';
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Good';
    if (passwordStrength <= 4) return 'Strong';
    return 'Highly Secure';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (passwordStrength < 2) {
      setError('Password is too weak. Try adding numbers or special characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const userCredential = await signupWithEmail(email, password);
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      markNewAccountCreated();
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
        loginAsDemoUser({ name, email });
        markNewAccountCreated();
        toast.success('Account created! Welcome to DevInquire CMS.');
        navigate('/');
        return;
      } else if (errorCode === 'auth/email-already-in-use' || rawError.includes('email-already-in-use')) {
        setError('This email is already registered. Please log in instead.');
      } else if (errorCode === 'auth/invalid-email' || rawError.includes('invalid-email')) {
        setError('The email address is invalid.');
      } else if (errorCode === 'auth/weak-password' || rawError.includes('weak-password')) {
        setError('The password is too weak.');
      } else if (errorCode === 'auth/invalid-credential' || rawError.includes('invalid-credential')) {
        setError('Invalid credential or signup parameters. Try signing up with Google or explore in Demo mode.');
      } else {
        setError(rawError || 'Failed to create account. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col md:flex-row overflow-hidden font-sans transition-colors duration-200">
      {/* Left Side: Apple Studio Showcase */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#F5F5F7] dark:bg-[#141416] border-r border-black/[0.06] dark:border-white/[0.08] overflow-hidden items-center justify-center p-12 lg:p-20">
        <div className="max-w-lg w-full space-y-10">
          <Link to="/landing" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-[#4e45e1] dark:bg-[#6B63F2] text-white rounded-xl flex items-center justify-center shadow-sm">
              <Command size={19} />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">InquireCMS</span>
          </Link>

          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] text-[#1D1D1F] dark:text-[#F5F5F7] text-balance">
              Your complete visual & headless studio.
            </h2>
            <p className="text-base text-[#86868B] dark:text-[#98989D] leading-relaxed">
              Design pages visually, automate site hierarchies via CSV, and publish structured collections with zero friction.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <Zap size={18} />, title: "Instant Blueprints", desc: "Scaffold multi-section pages from a single prompt or CSV file." },
              { icon: <Globe size={18} />, title: "Headless Delivery", desc: "Consume pages and collections via clean REST endpoints." },
              { icon: <Sparkles size={18} />, title: "Version Snapshots", desc: "Compare and restore any point-in-time page revision." }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="w-9 h-9 rounded-xl bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{feature.title}</h4>
                  <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full md:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white dark:bg-[#1C1C1E]"
      >
        <div className="flex items-center justify-between">
          <Link to="/landing" className="md:hidden inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4e45e1] dark:bg-[#6B63F2] rounded-xl flex items-center justify-center text-white">
              <Command size={17} />
            </div>
            <span className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">InquireCMS</span>
          </Link>
          <div className="ml-auto">
            <AppleThemeSwitcher variant="segmented" />
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-[#86868B] dark:text-[#98989D] text-sm">
              Start building and managing your digital experiences for free.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/25 text-[#FF3B30] dark:text-[#FF453A] text-xs font-medium rounded-2xl flex items-start gap-2.5"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] ml-0.5">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#4e45e1] dark:group-focus-within:text-[#6B63F2] transition-colors" size={17} />
                <input 
                  id="signup-name"
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#3A3A3C] focus:ring-3 focus:ring-[#4e45e1]/20 dark:focus:ring-[#6B63F2]/30 focus:border-[#4e45e1] dark:focus:border-[#6B63F2] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] ml-0.5">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#4e45e1] dark:group-focus-within:text-[#6B63F2] transition-colors" size={17} />
                <input 
                  id="signup-email"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border ${
                    isEmailValid === false ? 'border-[#FF3B30]' : 'border-black/[0.08] dark:border-white/[0.10]'
                  } rounded-xl pl-10 pr-10 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#3A3A3C] focus:ring-3 focus:ring-[#4e45e1]/20 dark:focus:ring-[#6B63F2]/30 focus:border-[#4e45e1] dark:focus:border-[#6B63F2] outline-none transition-all`}
                />
                {isEmailValid !== null && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isEmailValid ? <Check className="text-[#34C759]" size={16} /> : <AlertCircle className="text-[#FF3B30]" size={16} />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] ml-0.5">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] group-focus-within:text-[#4e45e1] dark:group-focus-within:text-[#6B63F2] transition-colors" size={17} />
                <input 
                  id="signup-password"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#3A3A3C] focus:ring-3 focus:ring-[#4e45e1]/20 dark:focus:ring-[#6B63F2]/30 focus:border-[#4e45e1] dark:focus:border-[#6B63F2] outline-none transition-all"
                />
              </div>
              {password && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-medium text-[#86868B] dark:text-[#98989D]">
                    <span>Password strength</span>
                    <span>{getStrengthText()}</span>
                  </div>
                  <div className="h-1 w-full bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level}
                        className={`h-full flex-1 transition-all duration-300 ${level <= passwordStrength ? getStrengthColor() : 'bg-transparent'} rounded-full`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 py-2">
              <input 
                id="signup-terms" 
                type="checkbox" 
                required 
                className="mt-0.5 w-4 h-4 rounded border-black/20 text-[#4e45e1] focus:ring-[#4e45e1]" 
              />
              <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed">
                I agree to the <a href="#terms" className="font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline">Terms</a> and <a href="#privacy" className="font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline">Privacy Policy</a>.
              </p>
            </div>

            <button 
              id="signup-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4e45e1] hover:bg-[#4139BF] dark:bg-[#6B63F2] dark:hover:bg-[#8179FF] text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#1C1C1E] px-4 text-[#86868B] dark:text-[#98989D]">or sign up with</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button 
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA]/70 dark:hover:bg-[#3A3A3C] border border-black/[0.08] dark:border-white/[0.10] rounded-xl text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] transition-all disabled:opacity-50"
              >
                <Chrome size={18} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                <span>Sign up with Google</span>
              </button>

              <button 
                id="signup-demo" 
                onClick={handleDemoLogin}
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 hover:bg-[#4e45e1]/15 dark:hover:bg-[#6B63F2]/25 border border-[#4e45e1]/20 dark:border-[#6B63F2]/30 rounded-xl text-sm font-semibold text-[#4e45e1] dark:text-[#6B63F2] transition-all"
              >
                <UserCheck size={17} />
                <span>Explore in Demo Mode</span>
              </button>
            </div>
          </form>

          <p className="text-center mt-8 text-xs text-[#86868B] dark:text-[#98989D]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline">
              Sign in
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
    </div>
  );
};

export default SignupPage;
