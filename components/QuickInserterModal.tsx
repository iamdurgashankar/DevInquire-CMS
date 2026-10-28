import React, { useState, useMemo } from 'react';
import { 
  Type, Image as ImageIcon, MousePointer2, Play, 
  SeparatorVertical, Code, Columns, LayoutPanelLeft, Menu,
  Smile, List, DollarSign, Share2, ClipboardList,
  MapPin, Quote, Grid, Minus, Hash, Activity, Trello, CheckSquare,
  AlertCircle, Mail, Sparkles, X, Search, Plus, Layers,
  CheckCircle2, ArrowRight, Zap, Star, ShieldCheck
} from 'lucide-react';
import { BlockType, Section, Block } from '../types';
import { BLOCK_DEFS } from '../constants';

export interface SectionKit {
  id: string;
  name: string;
  category: string;
  description: string;
  previewIcon: React.ReactNode;
  section: Section;
}

export const PREBUILT_SECTION_KITS: SectionKit[] = [
  {
    id: 'kit-hero',
    name: 'Modern Hero Banner',
    category: 'Marketing',
    description: 'High-converting headline, subtitle, primary CTA button, and featured visual.',
    previewIcon: <Zap className="text-amber-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '80px 20px', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: '',
          width: 55,
          blocks: [
            {
              id: '',
              type: 'text',
              content: '<h1 class="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">Build Faster with Visual Power</h1><p class="text-lg text-slate-600 mb-6">Create breathtaking web experiences in minutes with real-time interactive components and zero complexity.</p>',
              styles: { padding: '10px' },
              settings: {}
            },
            {
              id: '',
              type: 'button',
              content: 'Get Started Free →',
              styles: { padding: '12px 28px', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '8px', fontWeight: 'bold' },
              settings: {}
            }
          ]
        },
        {
          id: '',
          width: 45,
          blocks: [
            {
              id: '',
              type: 'image',
              content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
              styles: { padding: '10px', borderRadius: '16px' },
              settings: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kit-features-3col',
    name: '3-Column Features Grid',
    category: 'Features',
    description: 'Clean triple-feature showcase with distinct icons, titles, and descriptions.',
    previewIcon: <Grid className="text-blue-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '60px 20px', backgroundColor: '#ffffff' },
      columns: [
        {
          id: '',
          width: 33.33,
          blocks: [
            {
              id: '',
              type: 'icon',
              content: { iconName: 'Activity', size: 36, color: '#2563eb' },
              styles: { padding: '8px', textAlign: 'center' },
              settings: {}
            },
            {
              id: '',
              type: 'text',
              content: '<h3 class="text-xl font-bold text-slate-900 text-center mb-2">Blazing Fast</h3><p class="text-sm text-slate-500 text-center">Optimized lightweight code output ensuring instant sub-second page loads.</p>',
              styles: { padding: '10px' },
              settings: {}
            }
          ]
        },
        {
          id: '',
          width: 33.33,
          blocks: [
            {
              id: '',
              type: 'icon',
              content: { iconName: 'CheckSquare', size: 36, color: '#10b981' },
              styles: { padding: '8px', textAlign: 'center' },
              settings: {}
            },
            {
              id: '',
              type: 'text',
              content: '<h3 class="text-xl font-bold text-slate-900 text-center mb-2">Live Interactive</h3><p class="text-sm text-slate-500 text-center">Direct canvas editing with immediate visual feedback across desktop & mobile.</p>',
              styles: { padding: '10px' },
              settings: {}
            }
          ]
        },
        {
          id: '',
          width: 33.33,
          blocks: [
            {
              id: '',
              type: 'icon',
              content: { iconName: 'Star', size: 36, color: '#f59e0b' },
              styles: { padding: '8px', textAlign: 'center' },
              settings: {}
            },
            {
              id: '',
              type: 'text',
              content: '<h3 class="text-xl font-bold text-slate-900 text-center mb-2">AI Accelerated</h3><p class="text-sm text-slate-500 text-center">Built-in AI styling and smart content refinement at your fingertips.</p>',
              styles: { padding: '10px' },
              settings: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kit-pricing',
    name: 'Pricing Tier Showcase',
    category: 'Conversion',
    description: 'Pro pricing table with feature checklists and highlighted premium plan.',
    previewIcon: <DollarSign className="text-emerald-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '70px 20px', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: '',
          width: 50,
          blocks: [
            {
              id: '',
              type: 'pricing',
              content: {
                plan: 'Starter Plan',
                price: '19',
                currency: '$',
                period: 'month',
                features: ['Unlimited Pages', 'Standard Layout Kits', 'Email Support', 'SSL Certificate'],
                buttonText: 'Start Free Trial',
                isFeatured: false
              },
              styles: { padding: '12px' },
              settings: {}
            }
          ]
        },
        {
          id: '',
          width: 50,
          blocks: [
            {
              id: '',
              type: 'pricing',
              content: {
                plan: 'Pro Unlimited',
                price: '49',
                currency: '$',
                period: 'month',
                features: ['Everything in Starter', 'AI Page Architect', 'Custom Domain & Rewrites', '24/7 Priority Support', 'Unlimited Team Members'],
                buttonText: 'Upgrade to Pro',
                isFeatured: true
              },
              styles: { padding: '12px' },
              settings: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kit-cta-newsletter',
    name: 'Call To Action & Newsletter',
    category: 'Conversion',
    description: 'Bold centered banner with newsletter subscription input.',
    previewIcon: <Mail className="text-indigo-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '70px 20px', backgroundColor: '#1e293b', color: '#ffffff', borderRadius: '16px' },
      columns: [
        {
          id: '',
          width: 100,
          blocks: [
            {
              id: '',
              type: 'newsletter',
              content: {
                title: 'Stay ahead of the curve',
                description: 'Join over 25,000+ creators building world-class websites faster with DevInquire.',
                buttonText: 'Subscribe Now',
                placeholder: 'Enter your work email...'
              },
              styles: { padding: '20px', textAlign: 'center' },
              settings: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kit-testimonials',
    name: 'Customer Testimonial',
    category: 'Social Proof',
    description: 'Authentic quote card with author avatar and credential badge.',
    previewIcon: <Quote className="text-purple-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '60px 20px', backgroundColor: '#ffffff' },
      columns: [
        {
          id: '',
          width: 50,
          blocks: [
            {
              id: '',
              type: 'testimonial',
              content: {
                quote: 'The interactive builder turned a week of frontend engineering into an afternoon project. Outstanding tool!',
                author: 'Sarah Jenkins',
                role: 'Lead Product Designer @ Velo',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
              },
              styles: { padding: '16px' },
              settings: {}
            }
          ]
        },
        {
          id: '',
          width: 50,
          blocks: [
            {
              id: '',
              type: 'testimonial',
              content: {
                quote: 'Adding components and adjusting live styling is so seamless. Our entire marketing team uses this daily.',
                author: 'Marcus Vance',
                role: 'VP Marketing @ GrowthStack',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
              },
              styles: { padding: '16px' },
              settings: {}
            }
          ]
        }
      ]
    }
  },
  {
    id: 'kit-faq',
    name: 'FAQ Accordion Section',
    category: 'Content',
    description: 'Clean expandable FAQ accordion for handling common questions.',
    previewIcon: <List className="text-teal-500" size={24} />,
    section: {
      id: '',
      styles: { padding: '60px 20px', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: '',
          width: 100,
          blocks: [
            {
              id: '',
              type: 'text',
              content: '<h2 class="text-3xl font-black text-slate-900 text-center mb-8">Frequently Asked Questions</h2>',
              styles: { padding: '10px' },
              settings: {}
            },
            {
              id: '',
              type: 'accordion',
              content: [
                { title: 'How does live interactive component editing work?', content: 'You can click directly on any element in the canvas to edit text, change styles, duplicate, or reorder instantly.', isOpen: true },
                { title: 'Can I export the full responsive website code?', content: 'Yes! You can export clean production JSON or HTML with all custom styling and scripts bundled.', isOpen: false },
                { title: 'Can I add custom HTML, CSS, and JS embeds?', content: 'Absolutely. The Custom HTML and Custom Embed blocks allow you to integrate any third-party script or design widget.', isOpen: false }
              ],
              styles: { padding: '10px' },
              settings: {}
            }
          ]
        }
      ]
    }
  }
];

interface QuickInserterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (type: BlockType) => void;
  onSelectSectionKit?: (kit: SectionKit) => void;
  targetInfo?: {
    columnId?: string;
    sectionIndex?: number;
    blockIndex?: number;
    title?: string;
  };
}

export const QuickInserterModal: React.FC<QuickInserterModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock,
  onSelectSectionKit,
  targetInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'widgets' | 'kits'>('widgets');

  const categories = [
    { id: 'all', label: 'All Widgets' },
    { id: 'typography', label: 'Typography' },
    { id: 'media', label: 'Media & Images' },
    { id: 'interactive', label: 'Interactive' },
    { id: 'conversion', label: 'Forms & Conversion' },
    { id: 'structure', label: 'Structure & Data' }
  ];

  const getWidgetCategory = (type: BlockType): string => {
    switch (type) {
      case 'text':
        return 'typography';
      case 'image':
      case 'video':
      case 'gallery':
      case 'icon':
      case 'map':
        return 'media';
      case 'button':
      case 'nav':
      case 'accordion':
      case 'tabs':
      case 'social':
      case 'list':
        return 'interactive';
      case 'form':
      case 'pricing':
      case 'newsletter':
      case 'testimonial':
      case 'alert':
        return 'conversion';
      case 'spacer':
      case 'divider':
      case 'counter':
      case 'progress':
      case 'html':
      case 'code':
      case 'embed':
      case 'sitemap':
      default:
        return 'structure';
    }
  };

  const getWidgetDescription = (type: BlockType): string => {
    switch (type) {
      case 'text': return 'Rich typography, headings, paragraphs & prose.';
      case 'button': return 'Interactive call-to-action button with hover effects.';
      case 'image': return 'High-resolution image with lightbox and border styles.';
      case 'video': return 'Responsive YouTube, Vimeo or HTML5 video embed.';
      case 'form': return 'Customizable contact & lead capture form.';
      case 'nav': return 'Responsive navigation header with logo and links.';
      case 'accordion': return 'Expandable FAQ accordion items with smooth transitions.';
      case 'pricing': return 'Tiered pricing card with feature checklists.';
      case 'testimonial': return 'Customer review card with avatar and quote styling.';
      case 'gallery': return 'Multi-column image grid with responsive layout.';
      case 'newsletter': return 'Email capture banner with one-click subscription.';
      case 'social': return 'Linked social media icons with branded styling.';
      case 'counter': return 'Animated stat counter with custom suffixes.';
      case 'progress': return 'Visual progress and skill indicator bar.';
      case 'tabs': return 'Tabbed content switcher for organizing information.';
      case 'list': return 'Feature checklist with customizable check icons.';
      case 'alert': return 'Highlighted notification banner (info, success, warning).';
      case 'map': return 'Interactive Google Maps embed for physical locations.';
      case 'spacer': return 'Adjustable vertical whitespace between elements.';
      case 'divider': return 'Subtle decorative line separator.';
      case 'html':
      case 'embed':
      case 'code': return 'Custom HTML, CSS, JavaScript or widget iframe embed.';
      case 'sitemap': return 'Automated internal links sitemap tree.';
      default: return 'Interactive page building component.';
    }
  };

  const filteredWidgets = useMemo(() => {
    return BLOCK_DEFS.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getWidgetDescription(item.type).toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemCat = getWidgetCategory(item.type);
      const matchesCategory = activeCategory === 'all' || itemCat === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const filteredKits = useMemo(() => {
    return PREBUILT_SECTION_KITS.filter(kit => {
      return kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kit.category.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Plus size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Insert Component</h3>
                {targetInfo?.title && (
                  <span className="text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/60 px-2.5 py-0.5 rounded-full">
                    {targetInfo.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Choose a widget or pre-built section kit to add to your page</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('widgets')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'widgets' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Widgets ({BLOCK_DEFS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kits')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'kits' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Sparkles size={13} className="text-amber-300" />
                Section Kits ({PREBUILT_SECTION_KITS.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'widgets' ? "Search widgets by name (e.g., 'button', 'video', 'pricing', 'form')..." : "Search pre-built section kits..."}
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {activeTab === 'widgets' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-950/50">
          {activeTab === 'widgets' ? (
            <div>
              {filteredWidgets.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-sm font-medium">No components found matching "{searchTerm}"</p>
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
                    className="mt-3 text-xs text-blue-400 hover:underline"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredWidgets.map((widget) => (
                    <button
                      key={widget.type}
                      type="button"
                      onClick={() => {
                        onSelectBlock(widget.type);
                        onClose();
                      }}
                      className="group relative p-3.5 bg-slate-900/90 border border-slate-800 hover:border-blue-500 hover:bg-slate-800/90 rounded-xl flex items-start gap-3.5 text-left transition-all duration-150 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors shrink-0 shadow-sm">
                        {widget.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                            {widget.label}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-800">
                            {widget.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {getWidgetDescription(widget.type)}
                        </p>
                      </div>
                      <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {filteredKits.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-sm font-medium">No section kits found matching "{searchTerm}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredKits.map((kit) => (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => {
                        if (onSelectSectionKit) {
                          onSelectSectionKit(kit);
                        }
                        onClose();
                      }}
                      className="group p-4 bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800/80 rounded-xl text-left transition-all duration-150 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                            {kit.previewIcon}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/50">
                            {kit.category}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors mb-1">
                          {kit.name}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {kit.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                        <span>Insert Section Kit</span>
                        <div className="flex items-center gap-1">
                          <span>Apply</span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Element Inserter • Click any element to add instantly</span>
          </div>
          <span className="text-[11px] text-slate-500">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
