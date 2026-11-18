import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Code, 
  ArrowLeft, 
  Globe, 
  Database, 
  Zap, 
  RefreshCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BlockRenderer } from '../components/BlockRenderer';
import { AppleThemeSwitcher } from '../components/AppleThemeSwitcher';

const HeadlessClientDemo: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [globalStyles, setGlobalStyles] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rawJson, setRawJson] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagesRes, configRes] = await Promise.all([
        fetch('/api/v1/content/pages?includeDrafts=true'),
        fetch('/api/v1/content/config')
      ]);
      
      if (!pagesRes.ok) {
        throw new Error(`Failed to fetch pages: ${pagesRes.status} ${pagesRes.statusText}`);
      }
      if (!configRes.ok) {
        throw new Error(`Failed to fetch config: ${configRes.status} ${configRes.statusText}`);
      }

      const pagesData = await pagesRes.json();
      const configData = await configRes.json();
      
      if (pagesData.success) {
        setPages(pagesData.data);
      } else {
        throw new Error(pagesData.error || 'Failed to load pages');
      }
      
      if (configData.success && configData.data.styles) {
        setGlobalStyles(configData.data.styles);
      } else {
        setGlobalStyles({
          primaryColor: '#007AFF',
          textColor: '#1D1D1F',
          backgroundColor: '#FFFFFF',
          containerWidth: '1200px'
        });
      }

      if (pagesData.success && pagesData.data.length > 0) {
        fetchPageDetails(pagesData.data[0].slug || pagesData.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchPageDetails = async (slug: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/content/pages/${slug}`);
      const result = await response.json();
      
      if (result.success) {
        setSelectedPage(result.data);
        setRawJson(JSON.stringify(result.data, null, 2));
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderLayout = (layout: any) => {
    if (!layout) {
      return (
        <div className="p-8 border border-dashed border-black/[0.08] dark:border-white/[0.10] rounded-2xl text-center text-[#86868B] dark:text-[#98989D]">
          <p className="text-sm">This page has no layout data.</p>
        </div>
      );
    }

    const sections = layout.sections || [];
    if (sections.length === 0) {
      return (
        <div className="p-8 border border-dashed border-black/[0.08] dark:border-white/[0.10] rounded-2xl text-center text-[#86868B] dark:text-[#98989D]">
          <p className="text-sm">This layout has no sections.</p>
        </div>
      );
    }
    
    if (!globalStyles) return (
      <div className="flex items-center justify-center py-12">
        <RefreshCcw className="animate-spin text-[#86868B]" />
      </div>
    );
    
    return (
      <div 
        className="w-full rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-white"
        style={{ 
          backgroundColor: globalStyles.backgroundColor || '#ffffff',
          color: globalStyles.textColor || '#1D1D1F',
          fontFamily: globalStyles.bodyFont || '-apple-system, BlinkMacSystemFont, Plus Jakarta Sans, sans-serif'
        }}
      >
        {sections.map((section: any, sIdx: number) => (
          <section 
            key={section.id || sIdx}
            style={{
              ...section.styles,
              padding: section.styles?.padding || '2rem 1.5rem',
            }}
            className="w-full"
          >
            <div 
              className="mx-auto"
              style={{ maxWidth: globalStyles.containerWidth || '1200px' }}
            >
              <div 
                className="grid gap-6 md:gap-8" 
                style={{ 
                  gridTemplateColumns: `repeat(${section.columns?.length || 1}, minmax(0, 1fr))` 
                }}
              >
                {section.columns?.map((column: any, cIdx: number) => (
                  <div key={column.id || cIdx} className="space-y-6">
                    {column.blocks?.map((block: any, bIdx: number) => (
                      <div key={block.id || bIdx} className="w-full">
                        <BlockRenderer 
                          block={block} 
                          onUpdate={() => {}} 
                          onRemove={() => {}} 
                          globalStyles={globalStyles}
                          pages={pages}
                          readOnly={true}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans transition-colors duration-200">
      {/* Apple Frosted Header */}
      <header className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border-b border-black/[0.07] dark:border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-xl transition-colors text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              title="Back to Studio"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#007AFF] dark:bg-[#0A84FF] rounded-xl flex items-center justify-center text-white shadow-xs">
                <Terminal size={16} />
              </div>
              <h1 className="font-bold text-sm sm:text-base text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                Headless Content API Console
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-[#34C759]">
              REST v1 Connected
            </span>
            <AppleThemeSwitcher variant="segmented" />
            <button 
              onClick={fetchInitialData}
              className="p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-xl transition-colors text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              title="Refresh Data"
            >
              <RefreshCcw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: API Explorer Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {error && (
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 p-4 rounded-2xl text-[#FF3B30] dark:text-[#FF453A] text-xs font-medium">
                Error: {error}
              </div>
            )}
            
            <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-xs">
              <div className="px-4 py-3.5 bg-[#F5F5F7]/60 dark:bg-[#1C1C1E]/50 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
                <Database size={15} className="text-[#007AFF] dark:text-[#0A84FF]" />
                <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Available Page Endpoints</span>
              </div>
              <div className="p-3 space-y-1">
                {pages.length === 0 && !loading && (
                  <div className="text-center py-10 px-4 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.10]">
                    <Database size={24} className="mx-auto text-[#86868B] mb-3" />
                    <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">No pages found</p>
                    <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1 mb-4">Create and save a page in the CMS dashboard first.</p>
                    <Link to="/" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all">
                      Go to Dashboard
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                )}
                {pages.map((page) => {
                  const isSelected = (selectedPage?.slug === page.slug || selectedPage?.id === page.id) && selectedPage;
                  return (
                    <button
                      key={page.id}
                      onClick={() => fetchPageDetails(page.slug || page.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between group transition-all ${
                        isSelected
                          ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white shadow-xs' 
                          : 'hover:bg-[#F5F5F7] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{page.title}</span>
                          {page.status === 'draft' && (
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-[#86868B] dark:text-[#98989D]'}`}>
                              · Draft
                            </span>
                          )}
                        </div>
                        <code className={`text-[11px] font-mono truncate ${isSelected ? 'text-white/80' : 'text-[#86868B] dark:text-[#98989D]'}`}>
                          /api/v1/content/pages/{page.slug || page.id}
                        </code>
                      </div>
                      <ChevronRight size={14} className={`shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 text-white' : 'text-[#86868B] opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1C1C1E] dark:bg-[#141416] rounded-2xl p-5 text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden relative shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#0A84FF] flex items-center gap-1.5">
                  <Code size={14} />
                  <span>JSON Payload Inspector</span>
                </span>
                <span className="text-[11px] font-mono text-[#98989D]">application/json</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-[#98989D] text-xs font-mono py-8">
                  <div className="w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse" />
                  Fetching response...
                </div>
              ) : (
                <pre className="text-[11px] font-mono whitespace-pre-wrap h-[380px] overflow-y-auto text-[#F5F5F7]/85 leading-relaxed">
                  {rawJson || '// Select a page endpoint to inspect JSON'}
                </pre>
              )}
            </div>
          </div>

          {/* Right: Render Preview */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-xs flex-1 flex flex-col min-h-[600px]">
              <div className="px-5 py-3.5 bg-[#F5F5F7]/60 dark:bg-[#1C1C1E]/50 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-[#007AFF] dark:text-[#0A84FF]" />
                  <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Live Headless Client Renderer</span>
                </div>
                {selectedPage && (
                  <span className="text-xs font-medium text-[#86868B] dark:text-[#98989D] tabular-nums">
                    {selectedPage.layoutJSON?.sections?.length || 0} Sections
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F5F5F7]/40 dark:bg-[#1C1C1E]/40">
                {loading && !selectedPage ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#86868B] dark:text-[#98989D]">
                    <Zap size={36} className="mb-3 text-[#007AFF] dark:text-[#0A84FF] animate-pulse" />
                    <p className="text-sm font-medium">Hydrating content from REST API...</p>
                  </div>
                ) : selectedPage ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-8 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                      <h2 className="text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-2">
                        {selectedPage.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-[#86868B] dark:text-[#98989D]">
                        <span>Headless Delivery</span>
                        <span>·</span>
                        <span>Updated {new Date(selectedPage.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div>
                      {renderLayout(selectedPage.layoutJSON)}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#86868B] dark:text-[#98989D] text-center max-w-sm mx-auto">
                    <Database size={40} className="mb-3 opacity-30" />
                    <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">No Content Selected</p>
                    <p className="text-xs mt-1.5 leading-relaxed">
                      Select a page from the sidebar to preview how the headless API delivers structured layout JSON to any frontend.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-6 sm:p-8 border border-black/[0.06] dark:border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">Consume content anywhere.</h3>
                <p className="text-[#86868B] dark:text-[#98989D] text-xs leading-relaxed">
                  Built with standard REST JSON endpoints and our portable BlockRenderer. Connect React, Swift, Kotlin, or Astro clients effortlessly.
                </p>
              </div>
              <a 
                href="/api/v1/content/pages" 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#409CFF] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-95"
              >
                <span>Open API Root</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HeadlessClientDemo;
