
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
        fetch('/api/v1/content/pages?includeDrafts=true'), // Show drafts in demo so users see content immediately
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
          primaryColor: '#4f46e5',
          textColor: '#1e293b',
          backgroundColor: '#ffffff',
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
        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400">
          <p className="text-sm italic">This page has no layout data.</p>
        </div>
      );
    }

    const sections = layout.sections || [];
    if (sections.length === 0) {
      return (
        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400">
          <p className="text-sm italic">This layout has no sections.</p>
        </div>
      );
    }
    
    if (!globalStyles) return (
      <div className="flex items-center justify-center py-12">
        <RefreshCcw className="animate-spin text-slate-300" />
      </div>
    );
    
    return (
      <div 
        className="w-full rounded-xl overflow-hidden shadow-inner bg-white"
        style={{ 
          backgroundColor: globalStyles.backgroundColor || '#ffffff',
          color: globalStyles.textColor || '#1e293b',
          fontFamily: globalStyles.bodyFont || 'Inter, sans-serif'
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <Terminal size={16} />
              </div>
              <h1 className="font-bold text-slate-900">Headless API Demo</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest border border-green-100">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               API Connected
             </div>
             <button 
               onClick={fetchInitialData}
               className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
               title="Refresh Data"
             >
               <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left: API Explorer Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-xs font-medium flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Error: {error}
              </div>
            )}
            
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Database size={16} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Endpoints</span>
              </div>
              <div className="p-4 space-y-1">
                {pages.length === 0 && !loading && (
                  <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Database size={24} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-900">No pages found</p>
                    <p className="text-[10px] text-slate-500 mt-1 mb-4">Create and save a page in the CMS dashboard first.</p>
                    <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all">
                      Go to Dashboard
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => fetchPageDetails(page.slug || page.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${
                      (selectedPage?.slug === page.slug || selectedPage?.id === page.id) && selectedPage
                        ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{page.title}</span>
                        {page.status === 'draft' && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-black uppercase">Draft</span>
                        )}
                      </div>
                      <code className="text-[10px] opacity-60">/pages/{page.slug || page.id}</code>
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${(selectedPage?.slug === page.slug || selectedPage?.id === page.id) && selectedPage ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Code size={120} />
               </div>
               <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4">Raw JSON Response</h3>
               {loading ? (
                 <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                   Fetching...
                 </div>
               ) : (
                 <pre className="text-[10px] font-mono whitespace-pre-wrap h-[400px] overflow-y-auto custom-scrollbar text-indigo-100/70">
                   {rawJson || '// Select a page to see response'}
                 </pre>
               )}
            </div>
          </div>

          {/* Right: Render Preview */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1 flex flex-col min-h-[600px]">
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Headless Client Rendering (Visual)</span>
                  </div>
                  {selectedPage && (
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400">
                        {selectedPage.layoutJSON?.sections?.length || 0} Blocks Rendered
                      </span>
                    </div>
                  )}
               </div>

               <div className="flex-1 overflow-y-auto p-8 bg-white selection:bg-blue-100">
                 {loading && !selectedPage ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400">
                     <Zap size={48} className="mb-4 animate-pulse" />
                     <p className="text-sm font-medium">Hydrating content from API...</p>
                   </div>
                 ) : selectedPage ? (
                   <div className="max-w-3xl mx-auto">
                     <div className="mb-12 pb-8 border-b border-slate-100">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                          {selectedPage.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="px-2 py-0.5 rounded bg-slate-100">Headless Content</span>
                          <span>•</span>
                          <span>Published {new Date(selectedPage.updatedAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                     
                     <div className="space-y-0">
                       {renderLayout(selectedPage.layoutJSON)}
                     </div>
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center max-w-sm mx-auto">
                     <Database size={48} className="mb-4 opacity-20" />
                     <p className="text-lg font-bold text-slate-300">No Content Selected</p>
                     <p className="text-sm mt-2">Publish a page in the main dashboard and select it from the sidebar to see how our headless API delivers structured layout data to your custom frontend.</p>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
              <div className="max-w-md">
                <h3 className="text-2xl font-bold mb-2">Build your own frontend.</h3>
                <p className="text-indigo-100 text-sm">
                  This demo page is built using standard React `fetch` and our generic `BlockRenderer`. 
                  Your content isn't locked into our builder – consume it anywhere.
                </p>
              </div>
              <a 
                href="/api/v1/content/pages" 
                target="_blank" 
                className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shrink-0 hover:bg-slate-50 transition-all active:scale-95"
              >
                Open API Root
                <ExternalLink size={18} />
              </a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default HeadlessClientDemo;
