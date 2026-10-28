
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Layout, 
  Zap, 
  Users, 
  Shield, 
  Smartphone, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  Layers,
  MousePointer2,
  Code2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Command,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Command size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">InquireCMS</span>
            </motion.div>
            <div className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-500">
              <a href="#features" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px]">Features</a>
              <a href="#solutions" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px]">Solutions</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px]">Pricing</a>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-6"
            >
              <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Log in</Link>
              <Link to="/signup" className="group bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 active:scale-95">
                Get Started
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-20 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_50%_0%,#4f46e50a_0%,transparent_70%)] -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>Next-Gen Visual Intelligence</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.85]"
            >
              The CMS that <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600">works with you.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium"
            >
              Experience the power of real-time multi-user editing combined with integrated Gemini AI for content generation and design suggestions.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              <Link to="/signup" className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-bold text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 group active:scale-95">
                Build My Site
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-10 py-5 rounded-[2rem] font-bold text-lg text-slate-600 hover:bg-slate-50 transition-all border border-slate-200">
                Explore Features
              </button>
            </motion.div>
          </div>

          {/* App Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="absolute -inset-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-[5rem] blur-[120px] opacity-10"></div>
            <div className="relative bg-slate-900 rounded-[3rem] p-4 shadow-2xl shadow-indigo-100/50 border border-slate-200 overflow-hidden group">
              <div className="flex gap-1.5 mb-4 px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>
              <div className="bg-white rounded-[2rem] overflow-hidden aspect-video relative">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
                  alt="Editor Interface" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex flex-col justify-end p-12">
                   <div className="flex items-center gap-6">
                      <div className="flex -space-x-4">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden ring-4 ring-indigo-500/20">
                            <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="User" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                      <div className="bg-indigo-600/90 backdrop-blur px-6 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Collective Editing</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-24">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">Built for the next generation of teams.</h2>
              <p className="text-xl text-slate-500 font-medium">Sophisticated tools shouldn't be complicated. InquireCMS brings clarity to the creative process.</p>
            </div>
            <Link to="/signup" className="group flex items-center gap-2 text-indigo-600 font-bold text-lg mb-2">
              Get Started
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<MousePointer2 size={24} />}
              title="Intuitive Canvas"
              description="A blank slate for your imagination. Drag, drop, and refine with a level of precision usually reserved for code."
            />
            <FeatureCard 
              icon={<Users size={24} />}
              title="Global Collab"
              description="Edit together as if you're in the same room. Our low-latency sync engine keeps everyone in perfect harmony."
            />
            <FeatureCard 
              icon={<Sparkles size={24} />}
              title="AI Assistant"
              description="Gemini-powered insights suggest layout improvements, content refinements, and SEO optimizations in real-time."
            />
            <FeatureCard 
              icon={<Layers size={24} />}
              title="Atomic Design"
              description="Build reusable component libraries that scale. Change once, update everywhere instantly."
            />
            <FeatureCard 
              icon={<Smartphone size={24} />}
              title="Responsive Lab"
              description="Design for every viewport simultaneously. Peek at how your site looks on mobile while you edit on desktop."
            />
            <FeatureCard 
              icon={<Shield size={24} />}
              title="Safe Sync"
              description="Never lose a pixel. Automated versioning and incremental backups ensure your work is always recoverable."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
             <div className="text-indigo-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-4">Pricing Plans</div>
             <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">Simple and Scalable.</h2>
             <p className="text-slate-500 text-xl font-medium">Start building today, scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            <PricingCard 
              name="Free"
              price="0"
              description="Experiment and build your first masterpiece."
              features={["3 CMS Pages", "Community Patterns", "Real-time Sync", "Standard Support"]}
            />
            <PricingCard 
              name="Professional"
              price="29"
              description="The standard for growing teams and creators."
              highlighted={true}
              features={["Unlimited Pages", "AI Suggestions", "Custom Domain", "Priority Support", "Version History"]}
            />
            <PricingCard 
              name="Team"
              price="79"
              description="Advanced collaboration for larger orgs."
              features={["Shared Patterns", "RBAC Permissions", "Advanced Analytics", "Dedicated Channel", "99.9% SLF"]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-32 overflow-hidden relative">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-24 -mb-24" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-12 gap-16 mb-24">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Command size={22} />
                </div>
                <span className="text-2xl font-bold tracking-tight">InquireCMS</span>
              </div>
              <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-sm">
                Empowering the next generation of builders to create a faster, more beautiful web together.
              </p>
              <div className="flex items-center gap-5">
                {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all transform hover:-translate-y-1">
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2 md:col-start-7 text-sm">
              <h4 className="font-bold text-white uppercase tracking-[0.2em] mb-8 text-xs text-indigo-400">Product</h4>
              <ul className="space-y-5 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Studio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div className="md:col-span-2 text-sm">
              <h4 className="font-bold text-white uppercase tracking-[0.2em] mb-8 text-xs text-indigo-400">Resources</h4>
              <ul className="space-y-5 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">CMS Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>

            <div className="md:col-span-2 text-sm">
              <h4 className="font-bold text-white uppercase tracking-[0.2em] mb-8 text-xs text-indigo-400">Company</h4>
              <ul className="space-y-5 text-slate-500 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Customers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-600 text-xs font-bold uppercase tracking-widest">
            <p>© 2026 InquireCMS. Built with Antigravity.</p>
            <div className="flex gap-10">
               <a href="#" className="hover:text-white transition-colors">Legal</a>
               <a href="#" className="hover:text-white transition-colors">System Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -8 }}
    className="bg-white p-10 rounded-[2.5rem] border border-slate-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-300 group"
  >
    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50/50 text-indigo-600 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight leading-none">{title}</h3>
    <p className="text-slate-500 text-lg leading-relaxed font-medium">{description}</p>
  </motion.div>
);

const PricingCard = ({ name, price, description, features, highlighted = false }: { name: string, price: string, description: string, features: string[], highlighted?: boolean }) => (
  <motion.div 
    whileHover={{ y: highlighted ? 0 : -8 }}
    className={`p-10 rounded-[3rem] border flex flex-col transition-all duration-500 ${highlighted ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xl scale-105 z-10' : 'bg-white text-slate-900 border-slate-100'}`}
  >
    <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${highlighted ? 'text-indigo-200' : 'text-indigo-600'}`}>
      {name}
    </div>
    <div className="flex items-baseline gap-2 mb-6">
      <span className="text-6xl font-black tracking-tighter">${price}</span>
      <span className={`text-sm font-bold uppercase tracking-widest opacity-60`}>/mo</span>
    </div>
    <p className={`text-lg mb-10 leading-relaxed font-medium opacity-80`}>{description}</p>
    <ul className="space-y-5 mb-12 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-4 text-sm font-bold">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlighted ? 'bg-indigo-500/50 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
            <CheckCircle2 size={14} />
          </div>
          <span className="opacity-90">{f}</span>
        </li>
      ))}
    </ul>
    <Link 
      to="/signup" 
      className={`block w-full py-5 rounded-[2rem] font-black text-center transition-all active:scale-95 shadow-xl ${highlighted ? 'bg-white text-indigo-600 hover:bg-slate-50 shadow-indigo-900/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'}`}
    >
      Start for free
    </Link>
  </motion.div>
);

export default LandingPage;

