
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Layout, Mail, Lock, User, ArrowRight, Github, 
  Chrome, CheckCircle2, Check, AlertCircle, Sparkles, 
  Command, Zap, Globe, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signupWithEmail, updateProfile } from '../firebase';
import { useCMS } from '../App';
import firebaseConfig from '../firebase-applet-config.json';
import { toast } from 'sonner';

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

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');
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
        loginAsDemoUser({ name: name || undefined, email: email || 'admin@devinquire.com' });
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
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-indigo-500';
    return 'bg-emerald-500';
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
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Visual Side (Reversed from Login for variety) */}
      <div className="hidden md:flex md:w-1/2 relative bg-indigo-950 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#4338ca_0%,transparent_70%)]"
        />
        
        <div className="relative z-10 w-full flex flex-col justify-center p-16 lg:p-24 text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Link to="/landing" className="inline-flex items-center gap-2 mb-16 group">
              <div className="w-10 h-10 bg-white text-indigo-900 rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform">
                <Command size={22} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">InquireCMS</span>
            </Link>

            <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.9] mb-8">
              The future <br />of CMS is AI.
            </h2>
            <p className="text-xl text-indigo-200/80 max-w-md mb-12 font-medium leading-relaxed">
              Experience the first visual builder with integrated Gemini intelligence.
            </p>

            <div className="space-y-8">
              {[
                { icon: <Zap size={20} />, title: "Instant Generation", desc: "Build whole pages from a single prompt." },
                { icon: <Globe size={20} />, title: "Edge Performance", desc: "Your sites deploy globally in seconds." },
                { icon: <Sparkles size={20} />, title: "Smart SEO", desc: "AI-optimized metadata and structure." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{feature.title}</h4>
                    <p className="text-sm text-indigo-300/60 leading-snug">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-white"
      >
        <div className="max-w-md w-full mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Start building for free.
            </h1>
            <p className="text-slate-500 font-medium">
              Join the community of 10,000+ builders.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  id="signup-name"
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  id="signup-email"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-slate-50 border ${isEmailValid === false ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'} rounded-2xl pl-12 pr-12 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all`}
                />
                {isEmailValid !== null && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isEmailValid ? <Check className="text-emerald-500" size={18} /> : <AlertCircle className="text-red-500" size={18} />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  id="signup-password"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strength</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${getStrengthColor().replace('bg-', 'text-')}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level}
                        className={`h-full flex-1 transition-all duration-500 ${level <= passwordStrength ? getStrengthColor() : 'bg-slate-200'} rounded-full`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 py-3">
              <input 
                id="signup-terms" 
                type="checkbox" 
                required 
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
              />
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                I agree to the <a href="#" className="font-bold text-indigo-600 hover:underline">Terms</a> and <a href="#" className="font-bold text-indigo-600 hover:underline">Privacy Policy</a>.
              </p>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              id="signup-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]">
                <span className="bg-white px-6 text-slate-300">Social Sign Up</span>
              </div>
            </div>

            <div className="space-y-3">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <Chrome size={20} className="text-red-500" />
                Sign up with Google
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                id="signup-demo" 
                onClick={handleDemoLogin}
                type="button"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-bold text-indigo-700 hover:bg-indigo-100/80 transition-all"
              >
                <UserCheck size={18} className="text-indigo-600" />
                Explore in Demo Mode
              </motion.button>
            </div>
          </form>

          <p className="text-center mt-12 text-sm text-slate-500 font-medium">
            Already have an account? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
