
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
  Code2
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Layout size={18} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">DevInquire CMS</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Log in</Link>
              <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
              <Zap size={14} />
              <span>The Future of Visual Editing</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Build stunning websites <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">collaboratively</span> in real-time.
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              The modern CMS for high-performance teams. Drag, drop, and edit together. No coding required, but fully extensible for developers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group">
                Start Building Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg text-slate-600 hover:bg-slate-50 transition-all">
                Watch Demo
              </button>
            </div>
          </div>

          {/* App Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2rem] blur-2xl opacity-10 animate-pulse"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden aspect-video group">
              <img 
                src="https://picsum.photos/seed/cms-editor/1200/800" 
                alt="CMS Editor Preview" 
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    +12
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-white/20 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Collaboration Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to ship faster</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Powerful tools designed for designers, developers, and content creators.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MousePointer2 className="text-blue-600" />}
              title="Visual Drag & Drop"
              description="Build complex layouts visually with our intuitive elementor-like editor. No more guessing."
            />
            <FeatureCard 
              icon={<Users className="text-indigo-600" />}
              title="Real-time Collaboration"
              description="Work together with your team in the same room. See cursors and changes instantly."
            />
            <FeatureCard 
              icon={<Zap className="text-amber-600" />}
              title="Instant Publishing"
              description="Go live in seconds. Our high-performance infrastructure ensures your site is always fast."
            />
            <FeatureCard 
              icon={<Layers className="text-emerald-600" />}
              title="Template Library"
              description="Start with professionally designed templates or save your own for future projects."
            />
            <FeatureCard 
              icon={<Smartphone className="text-rose-600" />}
              title="Responsive by Default"
              description="Your sites look perfect on every device. Preview mobile and tablet views with one click."
            />
            <FeatureCard 
              icon={<Code2 className="text-violet-600" />}
              title="Developer Friendly"
              description="Full control over HTML/CSS when you need it. Export your code or use our API."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-600">Choose the plan that's right for your business.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              name="Starter"
              price="0"
              description="Perfect for individuals and small projects."
              features={["3 Pages", "Basic Templates", "Real-time Editing", "Community Support"]}
            />
            <PricingCard 
              name="Pro"
              price="29"
              description="Best for growing teams and businesses."
              highlighted={true}
              features={["Unlimited Pages", "Premium Templates", "Custom Domains", "Priority Support", "Advanced SEO Tools"]}
            />
            <PricingCard 
              name="Enterprise"
              price="99"
              description="Advanced features for large organizations."
              features={["Multiple Sites", "Team Permissions", "White-labeling", "Dedicated Manager", "SLA Guarantee"]}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-6">Ready to build your next masterpiece?</h2>
          <p className="text-xl text-blue-100 mb-10">Join thousands of creators and start building for free today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto bg-white text-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95">
              Get Started Now
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-10 py-4 rounded-full font-bold text-lg text-white border border-white/30 hover:bg-white/10 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Layout size={18} />
                </div>
                <span className="text-xl font-bold tracking-tight">DevInquire CMS</span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed">
                Empowering teams to build the web together. The most intuitive visual CMS for modern brands.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
            <p>© 2026 DevInquire CMS. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50 transition-all group">
    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
  </div>
);

const PricingCard = ({ name, price, description, features, highlighted = false }: { name: string, price: string, description: string, features: string[], highlighted?: boolean }) => (
  <div className={`p-8 rounded-3xl border transition-all ${highlighted ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-105 z-10' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>
    <h3 className={`text-lg font-bold mb-2 ${highlighted ? 'text-blue-400' : 'text-blue-600'}`}>{name}</h3>
    <div className="flex items-baseline gap-1 mb-4">
      <span className="text-4xl font-extrabold">${price}</span>
      <span className={`text-sm ${highlighted ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
    </div>
    <p className={`text-sm mb-8 leading-relaxed ${highlighted ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
    <ul className="space-y-4 mb-10">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className={highlighted ? 'text-blue-400' : 'text-blue-600'} />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <Link 
      to="/signup" 
      className={`block w-full py-4 rounded-full font-bold text-center transition-all active:scale-95 ${highlighted ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/40' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
    >
      Get Started
    </Link>
  </div>
);

export default LandingPage;
