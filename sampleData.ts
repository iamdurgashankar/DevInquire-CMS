
import { Page, Template, Section, Block, LayoutJSON, MediaItem } from './types';

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 5)}`;

export const SAMPLE_PAGES: Page[] = [
  {
    id: 'sample-saas',
    title: 'SaaS Landing Page',
    slug: 'saas-landing',
    status: 'published',
    author: 'DevInquire Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Modern SaaS Landing Page',
      metaDescription: 'A high-converting landing page for your next big idea.',
      keywords: 'saas, landing page, startup',
      ogImage: 'https://picsum.photos/1200/630'
    },
    layoutJSON: {
      layoutVersion: '1.0',
      sections: [
        {
          id: createId('sec'),
          styles: { padding: '100px 0', backgroundColor: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 100,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h1 style="font-size: 4rem; font-weight: 900; text-align: center; margin-bottom: 20px;">Build Faster with <span style="color: #2563eb;">DevInquire</span></h1><p style="font-size: 1.25rem; text-align: center; color: #64748b; max-width: 800px; margin: 0 auto 40px;">The most powerful visual page builder for modern teams. Drag, drop, and deploy in minutes.</p>',
                  styles: { textAlign: 'center' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'button',
                  content: 'Get Started for Free',
                  styles: { textAlign: 'center', padding: '15px 30px', borderRadius: '8px' },
                  settings: {}
                }
              ]
            }
          ]
        },
        {
          id: createId('sec'),
          styles: { padding: '80px 0', backgroundColor: '#f8fafc' },
          columns: [
            {
              id: createId('col'),
              width: 33.33,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 10px;">Visual Editing</h3><p style="color: #64748b;">What you see is what you get. Edit your site in real-time with our intuitive builder.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 33.33,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 10px;">Fast Performance</h3><p style="color: #64748b;">Optimized for speed. Your pages load instantly, keeping your visitors engaged.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 33.33,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 10px;">SEO Ready</h3><p style="color: #64748b;">Built-in SEO tools ensure your content ranks high on search engines from day one.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'sample-portfolio',
    title: 'Creative Portfolio',
    slug: 'portfolio',
    status: 'draft',
    author: 'Alex Designer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Alex Designer | Portfolio',
      metaDescription: 'Showcasing my best work and creative projects.',
      keywords: 'portfolio, design, creative',
      ogImage: 'https://picsum.photos/1200/630'
    },
    layoutJSON: {
      layoutVersion: '1.0',
      sections: [
        {
          id: createId('sec'),
          styles: { padding: '60px 0', backgroundColor: '#0f172a', color: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h1 style="font-size: 3.5rem; font-weight: 800; margin-bottom: 20px;">I create digital <span style="color: #fbbf24;">experiences</span>.</h1><p style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 30px;">Freelance UI/UX Designer based in San Francisco. Helping brands tell their story through design.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'button',
                  content: 'View My Work',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'image',
                  content: 'https://picsum.photos/seed/portfolio/800/800',
                  styles: { borderRadius: '24px' },
                  settings: {}
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'sample-agency',
    title: 'Digital Agency',
    slug: 'agency',
    status: 'published',
    author: 'DevInquire Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Modern Digital Agency | DevInquire',
      metaDescription: 'We help brands grow in the digital age.',
      keywords: 'agency, digital, marketing',
      ogImage: 'https://picsum.photos/seed/agency/1200/630'
    },
    layoutJSON: {
      layoutVersion: '1.0',
      sections: [
        {
          id: createId('sec'),
          styles: { padding: '120px 0', backgroundColor: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 100,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h1 style="font-size: 4.5rem; font-weight: 900; text-align: center; line-height: 1.1;">We Build <span style="background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Digital Products</span> That Matter.</h1>',
                  styles: { textAlign: 'center' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'spacer',
                  content: '',
                  styles: { padding: '20px' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<p style="font-size: 1.25rem; color: #64748b; text-align: center; max-width: 700px; margin: 0 auto;">A full-service digital agency specializing in UI/UX design, web development, and digital strategy.</p>',
                  styles: { textAlign: 'center' },
                  settings: {}
                }
              ]
            }
          ]
        },
        {
          id: createId('sec'),
          styles: { padding: '80px 0', backgroundColor: '#f1f5f9' },
          columns: [
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'image',
                  content: 'https://picsum.photos/seed/agency-work/800/600',
                  styles: { borderRadius: '16px' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 20px;">Our Approach</h2><p style="font-size: 1.1rem; color: #475569; margin-bottom: 20px;">We believe in data-driven design and user-centric development. Every project we undertake is a partnership aimed at achieving your business goals.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'button',
                  content: 'Learn More',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'sample-product',
    title: 'Product Launch',
    slug: 'product-launch',
    status: 'draft',
    author: 'DevInquire Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seo: {
      metaTitle: 'Introducing The Next Big Thing | DevInquire',
      metaDescription: 'The future of productivity is here.',
      keywords: 'product, launch, innovation',
      ogImage: 'https://picsum.photos/seed/product/1200/630'
    },
    layoutJSON: {
      layoutVersion: '1.0',
      sections: [
        {
          id: createId('sec'),
          styles: { padding: '0', backgroundColor: '#000000', color: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 100,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'image',
                  content: 'https://picsum.photos/seed/hero-product/1920/1080',
                  styles: { borderRadius: '0' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%;"><h1 style="font-size: 5rem; font-weight: 900; margin-bottom: 10px;">PRO 2.0</h1><p style="font-size: 1.5rem; opacity: 0.8; margin-bottom: 30px;">Redefining what\'s possible.</p><button style="background: white; color: black; padding: 15px 40px; border-radius: 30px; font-weight: 700; border: none; font-size: 1.1rem;">Pre-order Now</button></div>',
                  styles: { textAlign: 'center' },
                  settings: {}
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

export const SAMPLE_TEMPLATES: Template[] = [
  {
    id: 'tpl-hero',
    name: 'Modern Hero Section',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '120px 0', backgroundColor: '#ffffff' },
      columns: [
        {
          id: createId('col'),
          width: 100,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h2 style="font-size: 3rem; font-weight: 800; text-align: center;">Your Catchy Headline Here</h2>',
              styles: { textAlign: 'center' },
              settings: {}
            },
            {
              id: createId('blk'),
              type: 'spacer',
              content: '',
              styles: { padding: '20px' },
              settings: {}
            },
            {
              id: createId('blk'),
              type: 'button',
              content: 'Call to Action',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-pricing',
    name: 'Pricing Table',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '80px 0', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="background: white; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;"><h4 style="font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;">Basic</h4><div style="font-size: 3rem; font-weight: 900; margin-bottom: 20px;">$19<span style="font-size: 1rem; color: #94a3b8;">/mo</span></div><ul style="text-align: left; color: #475569; margin-bottom: 30px; list-style: none; padding: 0;"><li>✓ 5 Projects</li><li>✓ Basic Support</li><li>✓ 10GB Storage</li></ul><button style="width: 100%; background: #0f172a; color: white; padding: 12px; border-radius: 8px; font-weight: 700; border: none;">Choose Plan</button></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="background: white; padding: 40px; border-radius: 16px; border: 2px solid #3b82f6; text-align: center; position: relative;"><div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; padding: 4px 12px; rounded: 20px; font-size: 0.75rem; font-weight: 700; border-radius: 20px;">POPULAR</div><h4 style="font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;">Pro</h4><div style="font-size: 3rem; font-weight: 900; margin-bottom: 20px;">$49<span style="font-size: 1rem; color: #94a3b8;">/mo</span></div><ul style="text-align: left; color: #475569; margin-bottom: 30px; list-style: none; padding: 0;"><li>✓ Unlimited Projects</li><li>✓ Priority Support</li><li>✓ 100GB Storage</li></ul><button style="width: 100%; background: #3b82f6; color: white; padding: 12px; border-radius: 8px; font-weight: 700; border: none;">Choose Plan</button></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="background: white; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;"><h4 style="font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;">Enterprise</h4><div style="font-size: 3rem; font-weight: 900; margin-bottom: 20px;">$99<span style="font-size: 1rem; color: #94a3b8;">/mo</span></div><ul style="text-align: left; color: #475569; margin-bottom: 30px; list-style: none; padding: 0;"><li>✓ Custom Solutions</li><li>✓ 24/7 Support</li><li>✓ Unlimited Storage</li></ul><button style="width: 100%; background: #0f172a; color: white; padding: 12px; border-radius: 8px; font-weight: 700; border: none;">Contact Sales</button></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-contact',
    name: 'Contact Section',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '80px 0', backgroundColor: '#ffffff' },
      columns: [
        {
          id: createId('col'),
          width: 50,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 20px;">Get in Touch</h2><p style="color: #64748b; margin-bottom: 30px;">Have a question or want to work together? Fill out the form and we\'ll get back to you as soon as possible.</p><div style="margin-bottom: 15px;"><strong>Email:</strong> hello@devinquire.com</div><div><strong>Address:</strong> 123 Design St, San Francisco, CA</div>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 50,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;"><div style="margin-bottom: 15px;"><label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px;">NAME</label><input type="text" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;" placeholder="Your Name" /></div><div style="margin-bottom: 15px;"><label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px;">EMAIL</label><input type="email" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;" placeholder="Your Email" /></div><div style="margin-bottom: 20px;"><label style="display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px;">MESSAGE</label><textarea style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; height: 100px;" placeholder="Your Message"></textarea></div><button style="width: 100%; background: #3b82f6; color: white; padding: 12px; border-radius: 8px; font-weight: 700; border: none;">Send Message</button></div>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-features',
    name: 'Feature Grid',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '80px 0', backgroundColor: '#ffffff' },
      columns: [
        {
          id: createId('col'),
          width: 100,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h2 style="font-size: 2.5rem; font-weight: 800; text-align: center; margin-bottom: 50px;">Why Choose Us?</h2>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="text-align: center; padding: 20px;"><div style="width: 60px; height: 60px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; items-center; justify-content: center; margin: 0 auto 20px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3 style="font-weight: 700; margin-bottom: 10px;">Secure</h3><p style="color: #64748b; font-size: 0.9rem;">Your data is protected with industry-leading security protocols.</p></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="text-align: center; padding: 20px;"><div style="width: 60px; height: 60px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; items-center; justify-content: center; margin: 0 auto 20px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><h3 style="font-weight: 700; margin-bottom: 10px;">Fast</h3><p style="color: #64748b; font-size: 0.9rem;">Experience lightning-fast performance across all devices.</p></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 33.33,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="text-align: center; padding: 20px;"><div style="width: 60px; height: 60px; background: #f0fdf4; color: #22c55e; border-radius: 50%; display: flex; items-center; justify-content: center; margin: 0 auto 20px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4"/></svg></div><h3 style="font-weight: 700; margin-bottom: 10px;">Easy</h3><p style="color: #64748b; font-size: 0.9rem;">Simple and intuitive interface designed for everyone.</p></div>',
              styles: { textAlign: 'center' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-faq',
    name: 'FAQ Section',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '80px 0', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: createId('col'),
          width: 100,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h2 style="font-size: 2.5rem; font-weight: 800; text-align: center; margin-bottom: 40px;">Frequently Asked Questions</h2>',
              styles: { textAlign: 'center' },
              settings: {}
            },
            {
              id: createId('blk'),
              type: 'text',
              content: '<div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;"><div style="padding: 20px; border-bottom: 1px solid #e2e8f0;"><h4 style="font-weight: 700; margin-bottom: 5px;">How do I get started?</h4><p style="color: #64748b; font-size: 0.9rem;">Simply sign up for an account and follow our quick-start guide.</p></div><div style="padding: 20px; border-bottom: 1px solid #e2e8f0;"><h4 style="font-weight: 700; margin-bottom: 5px;">Can I cancel anytime?</h4><p style="color: #64748b; font-size: 0.9rem;">Yes, you can cancel your subscription at any time from your dashboard.</p></div><div style="padding: 20px;"><h4 style="font-weight: 700; margin-bottom: 5px;">Do you offer support?</h4><p style="color: #64748b; font-size: 0.9rem;">Our support team is available 24/7 to help you with any questions.</p></div></div>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-footer',
    name: 'Modern Footer',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '60px 0', backgroundColor: '#0f172a', color: '#ffffff' },
      columns: [
        {
          id: createId('col'),
          width: 40,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 20px;">DevInquire</h3><p style="opacity: 0.6; font-size: 0.9rem; line-height: 1.6;">Building the future of visual web development. Empowering creators to build beautiful experiences without limits.</p>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 20,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h4 style="font-weight: 700; margin-bottom: 20px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;">Product</h4><ul style="list-style: none; padding: 0; opacity: 0.6; font-size: 0.9rem; line-height: 2;"><li>Features</li><li>Pricing</li><li>Templates</li><li>Updates</li></ul>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 20,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h4 style="font-weight: 700; margin-bottom: 20px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;">Company</h4><ul style="list-style: none; padding: 0; opacity: 0.6; font-size: 0.9rem; line-height: 2;"><li>About</li><li>Careers</li><li>Blog</li><li>Contact</li></ul>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        },
        {
          id: createId('col'),
          width: 20,
          blocks: [
            {
              id: createId('blk'),
              type: 'text',
              content: '<h4 style="font-weight: 700; margin-bottom: 20px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;">Legal</h4><ul style="list-style: none; padding: 0; opacity: 0.6; font-size: 0.9rem; line-height: 2;"><li>Privacy</li><li>Terms</li><li>Cookie Policy</li></ul>',
              styles: { textAlign: 'left' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  },
  {
    id: 'tpl-creative-studio',
    name: 'Creative Studio Page',
    type: 'page',
    createdBy: 'System',
    layoutJSON: {
      layoutVersion: '1.0',
      sections: [
        {
          id: createId('sec'),
          styles: { padding: '120px 0', backgroundColor: '#000000', color: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 100,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h1 style="font-size: 6rem; font-weight: 900; line-height: 0.9; margin-bottom: 30px; letter-spacing: -0.05em;">WE BUILD<br/><span style="color: #ff3e00;">BOLD</span> IDEAS.</h1><p style="font-size: 1.5rem; max-width: 600px; opacity: 0.7; margin-bottom: 40px;">A creative studio dedicated to pushing the boundaries of digital design and brand storytelling.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'button',
                  content: 'Explore Our Work',
                  styles: { textAlign: 'left', padding: '18px 40px', borderRadius: '0', backgroundColor: '#ff3e00' },
                  settings: {}
                }
              ]
            }
          ]
        },
        {
          id: createId('sec'),
          styles: { padding: '100px 0', backgroundColor: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h2 style="font-size: 3rem; font-weight: 800; margin-bottom: 20px;">Our Services</h2><p style="color: #64748b; font-size: 1.1rem;">We provide end-to-end creative solutions for brands that want to stand out in a crowded digital landscape.</p>',
                  styles: { textAlign: 'left' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'accordion',
                  content: [
                    { title: 'Brand Identity', content: 'We craft unique visual identities that resonate with your audience and reflect your brand values.', isOpen: true },
                    { title: 'Web Design', content: 'High-performance websites that combine stunning aesthetics with seamless user experiences.', isOpen: false },
                    { title: 'Digital Strategy', content: 'Strategic planning to help your brand grow and succeed in the digital world.', isOpen: false }
                  ],
                  styles: {},
                  settings: {}
                }
              ]
            }
          ]
        },
        {
          id: createId('sec'),
          styles: { padding: '0', backgroundColor: '#f1f5f9' },
          columns: [
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'image',
                  content: 'https://picsum.photos/seed/creative1/800/1000',
                  styles: { borderRadius: '0' },
                  settings: {}
                }
              ]
            },
            {
              id: createId('col'),
              width: 50,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'image',
                  content: 'https://picsum.photos/seed/creative2/800/1000',
                  styles: { borderRadius: '0' },
                  settings: {}
                }
              ]
            }
          ]
        },
        {
          id: createId('sec'),
          styles: { padding: '100px 0', backgroundColor: '#ff3e00', color: '#ffffff' },
          columns: [
            {
              id: createId('col'),
              width: 100,
              blocks: [
                {
                  id: createId('blk'),
                  type: 'text',
                  content: '<h2 style="font-size: 4rem; font-weight: 900; text-align: center; margin-bottom: 40px;">READY TO START?</h2>',
                  styles: { textAlign: 'center' },
                  settings: {}
                },
                {
                  id: createId('blk'),
                  type: 'button',
                  content: 'LET\'S TALK',
                  styles: { textAlign: 'center', backgroundColor: '#ffffff', color: '#ff3e00', padding: '20px 50px', borderRadius: '0' },
                  settings: {}
                }
              ]
            }
          ]
        }
      ]
    } as LayoutJSON
  },
  {
    id: 'tpl-contact-form',
    name: 'Modern Contact Form',
    type: 'section',
    createdBy: 'System',
    layoutJSON: {
      id: createId('sec'),
      styles: { padding: '80px 0', backgroundColor: '#f8fafc' },
      columns: [
        {
          id: createId('col'),
          width: 100,
          blocks: [
            {
              id: createId('blk'),
              type: 'form',
              content: {
                title: "Get in Touch",
                description: "We'd love to hear from you. Please fill out the form below.",
                buttonText: "Send Message",
                successMessage: "Thank you! Your message has been sent.",
                fields: [
                  { id: "name", label: "Full Name", type: "text", placeholder: "John Doe", required: true },
                  { id: "email", label: "Email Address", type: "email", placeholder: "john@example.com", required: true },
                  { id: "message", label: "Message", type: "textarea", placeholder: "How can we help?", required: true },
                ],
              },
              styles: { padding: '0' },
              settings: {}
            }
          ]
        }
      ]
    } as Section
  }
];

export const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: 'med_saas_dashboard',
    name: 'Analytics Dashboard UI',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
    size: 245760,
    createdAt: new Date().toISOString(),
    category: 'image',
    dimensions: '1920x1080'
  },
  {
    id: 'med_hero_abstract',
    name: 'Cosmic Violet Flow',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    size: 318400,
    createdAt: new Date().toISOString(),
    category: 'banner',
    dimensions: '2400x1350'
  },
  {
    id: 'med_mobile_mockup',
    name: 'Modern Mobile App Showcase',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1000',
    size: 198200,
    createdAt: new Date().toISOString(),
    category: 'image',
    dimensions: '1200x800'
  },
  {
    id: 'med_cyber_workspace',
    name: 'Minimal Workspace Setup',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
    size: 278100,
    createdAt: new Date().toISOString(),
    category: 'banner',
    dimensions: '2000x1250'
  },
  {
    id: 'med_team_leader',
    name: 'Sarah Jenkins - Founder Portrait',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    size: 92400,
    createdAt: new Date().toISOString(),
    category: 'image',
    dimensions: '800x800'
  },
  {
    id: 'med_lead_engineer',
    name: 'Alex Chen - Lead Architect',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    size: 88500,
    createdAt: new Date().toISOString(),
    category: 'image',
    dimensions: '800x800'
  },
  {
    id: 'med_abstract_3d',
    name: 'Prism Geometry 3D Render',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=1000',
    size: 215000,
    createdAt: new Date().toISOString(),
    category: 'illustration',
    dimensions: '1600x1200'
  },
  {
    id: 'med_product_chart',
    name: 'Growth Metrics Report',
    type: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000',
    size: 165400,
    createdAt: new Date().toISOString(),
    category: 'image',
    dimensions: '1400x900'
  },
  {
    id: 'med_whitepaper_pdf',
    name: 'DevInquire CMS Architecture Whitepaper.pdf',
    type: 'application/pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: 420000,
    createdAt: new Date().toISOString(),
    category: 'document',
    dimensions: 'PDF File'
  }
];

