import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2,
  Layers,
  MousePointer2,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Command,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppleThemeSwitcher } from '../components/AppleThemeSwitcher';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans transition-colors duration-200">
      {/* Apple Frosted Glass Navigation Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link to="/landing" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 bg-[#007AFF] dark:bg-[#0A84FF] rounded-xl flex items-center justify-center text-white shadow-sm">
              <Command size={17} />
            </div>
            <span className="text-base font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              InquireCMS
            </span>
          </Link>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#86868B] dark:text-[#98989D]">
            <a href="#features" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">Features</a>
            <a href="#workspace" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">Workspace</a>
            <a href="#pricing" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">Pricing</a>
            <Link to="/login" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">Sign In</Link>
          </nav>

          {/* Zone 3: Theme Switcher & Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <AppleThemeSwitcher variant="segmented" />
            <Link
              to="/signup"
              className="bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#409CFF] text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <span>Get Started</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden relative bg-gradient-to-b from-[#F5F5F7]/70 to-[#FFFFFF] dark:from-[#1C1C1E] dark:to-[#1C1C1E]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] tracking-tight mb-4"
            >
              Visual Content Studio · Headless Architecture · Real-Time Sync
            </motion.p>
            
            <motion.h1 
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5 }}
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mb-6 leading-[1.05] text-balance"
            >
              Designed for clarity. <br />
              Built for creators.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="text-lg md:text-xl text-[#86868B] dark:text-[#98989D] mb-10 leading-relaxed max-w-2xl mx-auto font-normal"
            >
              Craft responsive pages, orchestrate structured collections, and collaborate in real time with an interface that feels effortless from the very first click.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#409CFF] text-white px-7 py-3.5 rounded-full font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] whitespace-nowrap"
              >
                <span>Build Your Site</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-sm text-[#007AFF] dark:text-[#0A84FF] bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA]/70 dark:hover:bg-[#3A3A3C] transition-all border border-black/[0.06] dark:border-white/[0.08] whitespace-nowrap text-center"
              >
                Explore Demo Workspace
              </Link>
            </motion.div>
          </div>

          {/* macOS Window Preview Frame */}
          <motion.div 
            id="workspace"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[28px] p-3 sm:p-4 shadow-[0_24px_60px_rgba(0,0,0,0.10)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)] border border-black/[0.08] dark:border-white/[0.10] overflow-hidden">
              {/* macOS Window Traffic Lights */}
              <div className="flex items-center justify-between mb-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840] border border-black/10" />
                </div>
                <div className="px-4 py-1 rounded-md bg-white/80 dark:bg-[#1C1C1E]/80 border border-black/[0.05] dark:border-white/[0.06] text-[11px] font-medium text-[#86868B] dark:text-[#98989D]">
                  devinquire.com — Visual Experience Studio
                </div>
                <div className="w-12" />
              </div>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden aspect-video relative border border-black/[0.06] dark:border-white/[0.08]">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426" 
                  alt="InquireCMS Visual Studio Interface" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-white/75 mb-1">
                        Multi-User Studio · Sub-50ms State Sync
                      </p>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Visual Hierarchy, Sitemap & Version Snapshots in One Place
                      </h3>
                    </div>
                    <Link
                      to="/login"
                      className="px-5 py-2.5 rounded-full bg-white/95 text-[#1D1D1F] text-xs font-semibold hover:bg-white transition-all shadow-md whitespace-nowrap"
                    >
                      Open Studio →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Features Grid */}
      <section id="features" className="py-24 bg-[#F5F5F7] dark:bg-[#141416] border-y border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] mb-2">
                Engineered for Precision
              </p>
              <h2 className="text-3xl sm:text-5xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight text-balance">
                Everything your team needs. Nothing in your way.
              </h2>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 text-[#007AFF] dark:text-[#0A84FF] font-semibold text-sm hover:underline whitespace-nowrap"
            >
              <span>Start creating</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<MousePointer2 size={22} />}
              title="Intuitive Visual Canvas"
              description="Drag, reorder, and refine blocks across columns and sections with tactile precision and real-time layout feedback."
            />
            <FeatureCard 
              icon={<Users size={22} />}
              title="Live Collaboration"
              description="Edit together seamlessly. Low-latency synchronization keeps your entire team aligned on every revision."
            />
            <FeatureCard 
              icon={<Sparkles size={22} />}
              title="Intelligent Assistance"
              description="Generate page blueprints, collection schemas, and layout refinements directly inside your workflow."
            />
            <FeatureCard 
              icon={<Layers size={22} />}
              title="Structured Collections"
              description="Define custom schemas once and deliver content anywhere through instant REST API endpoints."
            />
            <FeatureCard 
              icon={<Smartphone size={22} />}
              title="Responsive Viewport Lab"
              description="Preview and fine-tune desktop, tablet, and mobile breakpoints side by side without leaving the editor."
            />
            <FeatureCard 
              icon={<Shield size={22} />}
              title="Version History & RBAC"
              description="Save point-in-time snapshots, compare diffs, and govern team access with granular role permissions."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#FFFFFF] dark:bg-[#1C1C1E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF] mb-2">
              Transparent Plans
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-4 text-balance">
              Simple, predictable pricing.
            </h2>
            <p className="text-[#86868B] dark:text-[#98989D] text-base">
              Start free with full visual editing, then scale as your team and content grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            <PricingCard 
              name="For individual creators"
              tier="Starter"
              price="0"
              description="Everything you need to design and launch your first project."
              features={[
                "Up to 3 published pages",
                "Visual block & section editor",
                "Real-time preview & export",
                "Standard community templates"
              ]}
            />
            <PricingCard 
              name="For growing product teams"
              tier="Professional"
              price="29"
              description="Full studio capabilities with version history and custom domains."
              highlighted={true}
              features={[
                "Unlimited published pages",
                "40-point Page Version History",
                "UTF-8 CSV Page Automation",
                "Custom domain with auto SSL",
                "Headless REST API access"
              ]}
            />
            <PricingCard 
              name="For scaling organizations"
              tier="Enterprise"
              price="79"
              description="Granular role-based access control and multi-team governance."
              features={[
                "Granular RBAC permission matrix",
                "Role simulation & audit controls",
                "Unlimited collections & entries",
                "Dedicated edge delivery SLA",
                "Priority engineering support"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Minimalist Apple Footer */}
      <footer className="bg-[#F5F5F7] dark:bg-[#141416] text-[#1D1D1F] dark:text-[#F5F5F7] py-16 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-10 pb-12 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-[#007AFF] dark:bg-[#0A84FF] rounded-xl flex items-center justify-center text-white">
                  <Command size={17} />
                </div>
                <span className="text-lg font-bold tracking-tight">InquireCMS</span>
              </div>
              <p className="text-[#86868B] dark:text-[#98989D] text-sm leading-relaxed mb-6 max-w-sm">
                A modern visual content management system and headless experience studio designed with clarity and precision.
              </p>
              <div className="flex items-center gap-3">
                {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
                  <a
                    key={i}
                    href="#features"
                    className="w-9 h-9 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#86868B] dark:text-[#98989D] hover:text-[#007AFF] dark:hover:text-[#0A84FF] transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2 md:col-start-7 text-xs">
              <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">Platform</h4>
              <ul className="space-y-3 text-[#86868B] dark:text-[#98989D]">
                <li><a href="#features" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Visual Editor</a></li>
                <li><a href="#workspace" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Experience Manager</a></li>
                <li><Link to="/headless-demo" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Headless API</Link></li>
                <li><a href="#pricing" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div className="md:col-span-2 text-xs">
              <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">Resources</h4>
              <ul className="space-y-3 text-[#86868B] dark:text-[#98989D]">
                <li><Link to="/headless-demo" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">API Explorer</Link></li>
                <li><Link to="/login" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Template Library</Link></li>
                <li><Link to="/login" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">CSV Automation</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2 text-xs">
              <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">Account</h4>
              <ul className="space-y-3 text-[#86868B] dark:text-[#98989D]">
                <li><Link to="/login" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Sign In</Link></li>
                <li><Link to="/signup" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Create Account</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[#86868B] dark:text-[#98989D] text-xs">
            <p>Copyright © 2026 InquireCMS. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#features" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Privacy Policy</a>
              <a href="#pricing" className="hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors">Terms of Use</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white dark:bg-[#2C2C2E] p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-200">
    <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2.5 tracking-tight">{title}</h3>
    <p className="text-[#86868B] dark:text-[#98989D] text-sm leading-relaxed">{description}</p>
  </div>
);

const PricingCard = ({
  name,
  tier,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  tier: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) => (
  <div
    className={`p-8 rounded-3xl border flex flex-col transition-all duration-200 ${
      highlighted
        ? 'bg-[#1D1D1F] dark:bg-[#2C2C2E] text-white border-[#007AFF] dark:border-[#0A84FF] ring-2 ring-[#007AFF]/20 dark:ring-[#0A84FF]/30 shadow-xl'
        : 'bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 text-[#1D1D1F] dark:text-[#F5F5F7] border-black/[0.06] dark:border-white/[0.08]'
    }`}
  >
    <div className="mb-5">
      <p className={`text-xs font-medium mb-1 ${highlighted ? 'text-[#0A84FF]' : 'text-[#86868B] dark:text-[#98989D]'}`}>
        {name}
      </p>
      <h3 className="text-2xl font-bold tracking-tight">{tier}</h3>
    </div>
    <div className="flex items-baseline gap-1.5 mb-4 tabular-nums">
      <span className="text-5xl font-bold tracking-tight">${price}</span>
      <span className={`text-xs font-medium ${highlighted ? 'text-white/60' : 'text-[#86868B] dark:text-[#98989D]'}`}>
        / month
      </span>
    </div>
    <p className={`text-sm mb-8 leading-relaxed ${highlighted ? 'text-white/80' : 'text-[#86868B] dark:text-[#98989D]'}`}>
      {description}
    </p>
    <ul className="space-y-3.5 mb-8 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-3 text-sm font-medium">
          <CheckCircle2
            size={16}
            className={highlighted ? 'text-[#0A84FF] shrink-0' : 'text-[#007AFF] dark:text-[#0A84FF] shrink-0'}
          />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <Link
      to="/signup"
      className={`block w-full py-3.5 rounded-full font-semibold text-sm text-center transition-all active:scale-[0.98] ${
        highlighted
          ? 'bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#409CFF] text-white shadow-sm'
          : 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] border border-black/[0.08] dark:border-white/[0.08]'
      }`}
    >
      Get Started
    </Link>
  </div>
);

export default LandingPage;
