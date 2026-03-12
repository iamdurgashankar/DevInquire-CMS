
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCMS } from '../App';
import { 
  Plus, Search, Edit3, Trash2, Globe, FileText, 
  Copy, Eye, Upload, Download, Layout, Settings, BarChart3, 
  FolderOpen, Clock, Filter, Palette, Type,
  ChevronRight, ExternalLink, Activity, Repeat, X,
  ChevronUp, TrendingUp, Users, Zap, LogOut, Lock
} from 'lucide-react';
import { Page, Template, LayoutJSON, Section, MediaItem } from '../types';
import { SAMPLE_TEMPLATES } from '../sampleData';

type DashboardView = 'dashboard' | 'pages' | 'templates' | 'media' | 'settings' | 'seo' | 'global-styles' | 'profile';

const Dashboard: React.FC = () => {
  const { pages, setPages, templates, setTemplates, globalStyles, setGlobalStyles, user, setUser, media, setMedia, socket } = useCMS();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>('pages');
  const [profileData, setProfileData] = useState(user);
  const [globalActivity, setGlobalActivity] = useState<Record<string, any[]>>({});

  React.useEffect(() => {
    if (!socket) return;
    socket.on("global-activity", (activity: Record<string, any[]>) => {
      setGlobalActivity(activity);
    });
    return () => {
      socket.off("global-activity");
    };
  }, [socket]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({ name: '', type: 'section' as 'section' | 'page' });
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('devinquire_auth');
    navigate('/landing');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUser(prev => ({ ...prev, avatarUrl: base64 }));
      setProfileData(prev => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newMedia: MediaItem = {
          id: Math.random().toString(36).substring(2, 9),
          url: base64,
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: new Date().toISOString()
        };
        setMedia(prev => [newMedia, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteMedia = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Media',
      message: 'Are you sure you want to delete this media item? This action cannot be undone.',
      onConfirm: () => {
        setMedia(prev => prev.filter(m => m.id !== id));
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleImportSite = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const id = Math.random().toString(36).substr(2, 9);
      
      try {
        // Try to parse as JSON first (CMS Page or Full Site format)
        if (file.name.endsWith('.json')) {
          const importedData = JSON.parse(content);
          
          // Check if it's a full site export
          if (importedData.pages && Array.isArray(importedData.pages)) {
            setPages(prev => [...importedData.pages, ...prev]);
            if (importedData.templates && Array.isArray(importedData.templates)) {
              setTemplates(prev => [...importedData.templates, ...prev]);
            }
            if (importedData.globalStyles) {
              setGlobalStyles(importedData.globalStyles);
            }
            alert('Full site imported successfully!');
          } else {
            // Single page import
            const newPage: Page = {
              id,
              title: importedData.title || `Imported ${file.name}`,
              slug: importedData.slug || `imported-${id}`,
              status: 'draft',
              seo: importedData.seo || { metaTitle: '', metaDescription: '', keywords: '', ogImage: '' },
              layoutJSON: importedData.layoutJSON || { sections: [], layoutVersion: '1.0' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              author: 'Admin',
              isCustomSite: importedData.isCustomSite,
              customHTML: importedData.customHTML,
              customCSS: importedData.customCSS,
              customJS: importedData.customJS
            };
            setPages(prev => [newPage, ...prev]);
            alert('Page imported successfully!');
          }
        } 
        // If HTML, import as a Custom Site
        else if (file.name.endsWith('.html')) {
          const newPage: Page = {
            id,
            title: `Custom Site: ${file.name}`,
            slug: `custom-${id}`,
            status: 'draft',
            seo: { metaTitle: file.name, metaDescription: 'Imported custom site', keywords: '', ogImage: '' },
            layoutJSON: { sections: [], layoutVersion: '1.0' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: 'Admin',
            isCustomSite: true,
            customHTML: content
          };
          setPages(prev => [newPage, ...prev]);
          alert('HTML file imported as a Custom Site!');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import file. Please ensure it is a valid JSON or HTML file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const createPage = (template?: Template) => {
    // Defensive check: if template is an event object (has target/currentTarget), ignore it
    const isEvent = template && (template as any).target && (template as any).preventDefault;
    const actualTemplate = isEvent ? undefined : template;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newPage: Page = {
      id,
      title: actualTemplate ? `New ${actualTemplate.name || 'Template'}` : 'New Untitled Page',
      slug: actualTemplate?.name ? `${actualTemplate.name.toLowerCase().replace(/\s+/g, '-')}-${id}` : `new-page-${id}`,
      status: 'draft',
      seo: { metaTitle: '', metaDescription: '', keywords: '', ogImage: '' },
      layoutJSON: actualTemplate && actualTemplate.type === 'page' 
        ? (actualTemplate.layoutJSON as LayoutJSON) 
        : { sections: actualTemplate ? [actualTemplate.layoutJSON as Section] : [], layoutVersion: '1.0' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'Admin'
    };
    setPages(prev => [newPage, ...prev]);
    navigate(`/editor/${id}`);
  };

  const deleteTemplate = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      onConfirm: () => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const restoreSampleTemplates = () => {
    setConfirmModal({
      show: true,
      title: 'Restore Templates',
      message: 'This will add the default sample templates back to your library. Continue?',
      onConfirm: () => {
        setTemplates(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newSamples = SAMPLE_TEMPLATES.filter(t => !existingIds.has(t.id));
          return [...prev, ...newSamples];
        });
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const deletePage = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Page',
      message: 'Are you sure you want to delete this page? This action cannot be undone.',
      onConfirm: () => {
        setPages(prev => prev.filter(p => p.id !== id));
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const duplicatePage = (page: Page) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duplicated: Page = {
      ...page,
      id,
      title: `${page.title || 'Untitled Page'} (Copy)`,
      slug: `${page.slug || 'untitled'}-copy`,
      updatedAt: new Date().toISOString()
    };
    setPages(prev => [duplicated, ...prev]);
  };

  const downloadPage = (page: Page) => {
    let content = "";
    let filename = "";
    let mimeType = "";

    if (page.isCustomSite) {
      // For custom sites, download the HTML
      content = page.customHTML || "";
      filename = `${page.slug || 'site'}.html`;
      mimeType = "text/html";
    } else {
      // For CMS pages, download the JSON
      content = JSON.stringify(page, null, 2);
      filename = `${page.slug || 'page'}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const downloadFullSite = () => {
    const siteData = {
      pages,
      templates,
      globalStyles,
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(siteData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `full-site-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCreateTemplate = () => {
    if (!newTemplateData.name) {
      alert('Please enter a template name');
      return;
    }

    const id = `tpl_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: Template = {
      id,
      name: newTemplateData.name,
      type: newTemplateData.type,
      createdBy: 'Admin',
      layoutJSON: newTemplateData.type === 'page' 
        ? { sections: [], layoutVersion: '1.0' } 
        : { id: `sec_${Math.random().toString(36).substr(2, 5)}`, columns: [{ id: `col_${Math.random().toString(36).substr(2, 5)}`, width: 100, blocks: [] }], styles: { padding: '40px 0' } }
    };

    setTemplates(prev => [newTemplate, ...prev]);
    setShowCreateTemplateModal(false);
    setNewTemplateData({ name: '', type: 'section' });
    
    // Navigate to editor to design the template
    navigate(`/editor/${id}`);
  };

  const filteredPages = pages.filter(p => {
    const title = p.title || '';
    const slug = p.slug || '';
    const query = searchQuery || '';
    
    const matchesSearch = title.toLowerCase().includes(query.toLowerCase()) || 
                          slug.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: pages.length,
    published: pages.filter(p => p.status === 'published').length,
    drafts: pages.filter(p => p.status === 'draft').length,
    views: pages.length * 124 
  };

  // View Components
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-4 gap-6">
              <StatCard label="Live Pages" value={stats.published} trend="+12%" icon={<Zap className="text-yellow-500" size={20} />} />
              <StatCard label="Monthly Visitors" value="4,290" trend="+5.4%" icon={<Users className="text-blue-500" size={20} />} />
              <StatCard label="Avg. Load Time" value="1.2s" trend="-0.1s" icon={<TrendingUp className="text-green-500" size={20} />} />
              <StatCard label="Active Projects" value="3" trend="Stable" icon={<Activity className="text-purple-500" size={20} />} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Clock size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">Page "Home" was updated by Admin</p>
                      <p className="text-xs text-slate-500">2 hours ago</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'pages':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-6">
              <StatCard label="Total Pages" value={stats.total} trend="+2 this week" icon={<FileText className="text-blue-500" size={20} />} />
              <StatCard label="Published" value={stats.published} trend="Live" icon={<Globe className="text-green-500" size={20} />} />
              <StatCard label="Drafts" value={stats.drafts} trend="In Progress" icon={<Edit3 className="text-amber-500" size={20} />} />
              <StatCard label="Page Views" value={stats.views.toLocaleString()} trend="+12.5%" icon={<Eye className="text-purple-500" size={20} />} />
            </div>

            {/* Filters & View Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex items-center gap-2">
              <FilterTab active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} label="All Pages" count={stats.total} />
              <FilterTab active={activeFilter === 'published'} onClick={() => setActiveFilter('published')} label="Published" count={stats.published} />
              <FilterTab active={activeFilter === 'draft'} onClick={() => setActiveFilter('draft')} label="Drafts" count={stats.drafts} />
              <div className="ml-auto flex items-center gap-2 px-4">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Sort By</span>
                 <select className="text-xs font-bold bg-transparent outline-none cursor-pointer text-slate-600">
                   <option>Last Modified</option>
                   <option>A-Z</option>
                   <option>Creation Date</option>
                 </select>
              </div>
            </div>

            {/* Page List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {filteredPages.length === 0 ? (
                <div className="px-6 py-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={40} className="text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No pages found</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">
                    {searchQuery ? "We couldn't find anything matching your search." : "Ready to launch your site? Create your first page to get started."}
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => createPage()}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
                    >
                      <Plus size={20} />
                      Start Creating
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Page Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Live Path</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPages.map(page => (
                      <tr key={page.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                              page.isCustomSite ? 'bg-purple-50 text-purple-600' :
                              page.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                            }`}>
                              {page.isCustomSite ? <Globe size={20} /> : <FileText size={20} />}
                            </div>
                              <div>
                                <span className="block font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{page.title}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    By {page.author} • {page.isCustomSite ? 'Custom Code' : `${page.layoutJSON.sections.length} Sections`}
                                  </span>
                                  {globalActivity[page.id]?.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">
                                        {globalActivity[page.id].length} Editing Now
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium group-hover:bg-white group-hover:shadow-sm transition-all italic">/{page.slug}</code>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            page.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {page.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton onClick={() => navigate(`/editor/${page.id}`)} icon={<Edit3 size={16} />} label="Edit" color="blue" />
                            <ActionButton onClick={() => duplicatePage(page)} icon={<Copy size={16} />} label="Copy" color="slate" />
                            <ActionButton onClick={() => downloadPage(page)} icon={<Download size={16} />} label="Download" color="slate" />
                            <ActionButton onClick={() => deletePage(page.id)} icon={<Trash2 size={16} />} label="Delete" color="red" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      case 'templates':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Template Library</h2>
              <button 
                onClick={restoreSampleTemplates}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Repeat size={14} />
                Restore Sample Templates
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    <Layout size={48} className="text-slate-300 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{template.type}</span>
                      <span className="text-[10px] text-slate-400 font-medium">By {template.createdBy}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{template.name}</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => createPage(template)}
                        className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
                      >
                        Use
                      </button>
                      <button 
                        onClick={() => navigate(`/editor/${template.id}`)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setShowCreateTemplateModal(true)}
                className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4 p-8 hover:bg-slate-50 hover:border-blue-300 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-slate-800">Create New Template</span>
                  <span className="text-xs text-slate-400">Save your custom designs</span>
                </div>
              </button>
            </div>

            {/* Create Template Modal */}
            {showCreateTemplateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-slate-800">Create New Template</h3>
                    <button onClick={() => setShowCreateTemplateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Template Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g. My Custom Section"
                        value={newTemplateData.name}
                        onChange={(e) => setNewTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Template Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setNewTemplateData(prev => ({ ...prev, type: 'section' }))}
                          className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${newTemplateData.type === 'section' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          Section
                        </button>
                        <button 
                          onClick={() => setNewTemplateData(prev => ({ ...prev, type: 'page' }))}
                          className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${newTemplateData.type === 'page' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          Full Page
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={handleCreateTemplate}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Create Template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'media':
        const filteredMedia = media.filter(m => 
          m.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Media Library</h2>
                <p className="text-sm text-slate-500">Manage your images and assets</p>
              </div>
              <div className="flex gap-3">
                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  className="hidden" 
                  multiple 
                  accept="image/*" 
                  onChange={handleMediaUpload} 
                />
                <button 
                  onClick={() => mediaInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  <Upload size={18} /> 
                  Upload Media
                </button>
              </div>
            </div>

            {filteredMedia.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No media found</h3>
                <p className="text-sm text-slate-500 mb-6">Upload your first image to get started</p>
                <button 
                  onClick={() => mediaInputRef.current?.click()}
                  className="text-blue-600 font-bold text-sm hover:underline"
                >
                  Click here to upload
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {filteredMedia.map(item => (
                  <div key={item.id} className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center relative overflow-hidden">
                      <img 
                        src={item.url} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(item.url);
                            alert('URL copied to clipboard!');
                          }}
                          className="p-2 bg-white rounded-lg text-slate-900 hover:bg-blue-50 hover:text-blue-600 transition-all"
                          title="Copy URL"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={() => window.open(item.url, '_blank')}
                          className="p-2 bg-white rounded-lg text-slate-900 hover:bg-blue-50 hover:text-blue-600 transition-all"
                          title="View Full"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => deleteMedia(item.id)}
                          className="p-2 bg-white rounded-lg text-slate-900 hover:bg-red-50 hover:text-red-600 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-50">
                      <p className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{(item.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-8 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Site Configuration</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Site Name</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue="DevInquire Official" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base URL</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" defaultValue="https://devinquire.com" />
              </div>
              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all">Save Changes</button>
            </div>
          </div>
        );
      case 'seo':
        return (
          <div className="grid grid-cols-2 gap-8 animate-in fade-in duration-500">
             <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={20} className="text-blue-500" /> SEO Health</h2>
                <div className="flex items-center gap-4 py-6 border-b">
                   <div className="text-4xl font-black text-green-500">88</div>
                   <div className="text-sm font-medium text-slate-500">Site-wide SEO score based on content analysis and metadata completeness.</div>
                </div>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600"><CheckCircle size={16} className="text-green-500" /> Meta titles optimized</li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600"><CheckCircle size={16} className="text-green-500" /> Alt texts present on all images</li>
                  <li className="flex items-center gap-3 text-sm font-medium text-slate-600"><AlertCircle size={16} className="text-amber-500" /> 2 pages missing meta descriptions</li>
                </ul>
             </div>
             <div className="bg-slate-900 rounded-2xl p-8 text-white">
                <h2 className="text-xl font-bold mb-4">Google Search Console</h2>
                <p className="text-slate-400 text-sm mb-8">Connect your site to track impressions and search ranking data directly in your CMS.</p>
                <button className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-slate-100 transition-all">Connect Site</button>
             </div>
          </div>
        );
      case 'global-styles':
        return (
          <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Palette size={20} className="text-blue-500" />
                  Color Palette
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <ColorInput 
                    label="Primary Color" 
                    value={globalStyles.primaryColor} 
                    onChange={(val) => setGlobalStyles(prev => ({ ...prev, primaryColor: val }))} 
                  />
                  <ColorInput 
                    label="Secondary Color" 
                    value={globalStyles.secondaryColor} 
                    onChange={(val) => setGlobalStyles(prev => ({ ...prev, secondaryColor: val }))} 
                  />
                  <ColorInput 
                    label="Accent Color" 
                    value={globalStyles.accentColor} 
                    onChange={(val) => setGlobalStyles(prev => ({ ...prev, accentColor: val }))} 
                  />
                  <ColorInput 
                    label="Background" 
                    value={globalStyles.backgroundColor} 
                    onChange={(val) => setGlobalStyles(prev => ({ ...prev, backgroundColor: val }))} 
                  />
                  <ColorInput 
                    label="Text Color" 
                    value={globalStyles.textColor} 
                    onChange={(val) => setGlobalStyles(prev => ({ ...prev, textColor: val }))} 
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Type size={20} className="text-blue-500" />
                  Typography
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Primary Font (Headings)</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={globalStyles.headingFont}
                      onChange={(e) => setGlobalStyles(prev => ({ ...prev, headingFont: e.target.value }))}
                    >
                      <option>Inter</option>
                      <option>Playfair Display</option>
                      <option>Space Grotesk</option>
                      <option>Outfit</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secondary Font (Body)</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={globalStyles.bodyFont}
                      onChange={(e) => setGlobalStyles(prev => ({ ...prev, bodyFont: e.target.value }))}
                    >
                      <option>Inter</option>
                      <option>Roboto</option>
                      <option>Open Sans</option>
                      <option>Lato</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Layout & Spacing</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Container Width</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={globalStyles.containerWidth}
                    onChange={(e) => setGlobalStyles(prev => ({ ...prev, containerWidth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Border Radius</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={globalStyles.borderRadius}
                    onChange={(e) => setGlobalStyles(prev => ({ ...prev, borderRadius: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                onClick={() => alert('Global styles saved successfully!')}
              >
                Save Global Styles
              </button>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="max-w-4xl animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user.avatar
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                  <p className="text-sm text-slate-500 mb-6">{user.role}</p>
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAvatarUpload} 
                    />
                    <button 
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Upload Image
                    </button>
                    <button 
                      className="w-full py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      onClick={() => {
                        const newAvatar = prompt('Enter new avatar initials (max 2 chars):', user.avatar);
                        if (newAvatar) {
                          setUser(prev => ({ ...prev, avatar: newAvatar.substring(0, 2).toUpperCase(), avatarUrl: undefined }));
                          setProfileData(prev => ({ ...prev, avatar: newAvatar.substring(0, 2).toUpperCase(), avatarUrl: undefined }));
                        }
                      }}
                    >
                      Set Initials
                    </button>
                    <button 
                      className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest"
                      onClick={() => {
                        const initials = profileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        setUser(prev => ({ ...prev, avatar: initials, avatarUrl: undefined }));
                        setProfileData(prev => ({ ...prev, avatar: initials, avatarUrl: undefined }));
                      }}
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Account Status</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Plan</span>
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Professional</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Member Since</span>
                      <span className="text-sm font-medium text-slate-900">Oct 2023</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-8">Profile Details</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                        <input 
                          type="email" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Location</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bio</label>
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px]"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                        onClick={() => {
                          setUser(profileData);
                          alert('Profile updated successfully!');
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Security</h2>
                  <div className="space-y-4">
                    <button 
                      className="flex items-center justify-between w-full p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group"
                      onClick={() => {
                        const newPass = prompt('Enter new password:');
                        if (newPass) alert('Password updated successfully!');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
                          <Lock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Change Password</p>
                          <p className="text-xs text-slate-500">Update your account password regularly</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>
                    <button 
                      className="flex items-center justify-between w-full p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group"
                      onClick={() => {
                        alert('Two-Factor Authentication has been enabled for your account.');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                          <p className="text-xs text-slate-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">Enable</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Globe className="text-white" size={20} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">DevInquire</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem 
            icon={<BarChart3 size={18} />} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')}
          />
          <NavItem 
            icon={<FileText size={18} />} 
            label="Pages" 
            active={activeView === 'pages'} 
            onClick={() => setActiveView('pages')}
          />
          <NavItem 
            icon={<Layout size={18} />} 
            label="Templates" 
            active={activeView === 'templates'} 
            onClick={() => setActiveView('templates')}
          />
          <NavItem 
            icon={<FolderOpen size={18} />} 
            label="Media Library" 
            active={activeView === 'media'} 
            onClick={() => setActiveView('media')}
          />
          
          <div className="pt-6 pb-2">
            <span className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Configuration</span>
          </div>
          
          <NavItem 
            icon={<Palette size={18} />} 
            label="Global Styles" 
            active={activeView === 'global-styles'} 
            onClick={() => setActiveView('global-styles')}
          />
          <NavItem 
            icon={<Settings size={18} />} 
            label="Site Settings" 
            active={activeView === 'settings'} 
            onClick={() => setActiveView('settings')}
          />
          <NavItem 
            icon={<Activity size={18} />} 
            label="SEO & Analytics" 
            active={activeView === 'seo'} 
            onClick={() => setActiveView('seo')}
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="My Profile" 
            active={activeView === 'profile'} 
            onClick={() => setActiveView('profile')}
          />
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Plan: Professional</p>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
              <div className="bg-blue-500 h-1.5 rounded-full w-3/4"></div>
            </div>
            <p className="text-[10px] text-slate-400">75% of resources used</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header / Search */}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={`Search ${activeView}...`} 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Clock size={20} />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-all" onClick={() => setActiveView('profile')}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.avatar
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700">{user.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 flex-1">
          {/* Page Title & Main Action */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeView.replace('-', ' ')}</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your site's {activeView} and core functionality.</p>
            </div>
            {activeView === 'pages' && (
              <div className="flex gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportSite} 
                  accept=".json,.html" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Upload size={18} />
                  <span>Import Site</span>
                </button>
                <button 
                  onClick={downloadFullSite}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Download size={18} />
                  <span>Export Site</span>
                </button>
                <button 
                  onClick={() => createPage()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <Plus size={18} />
                  <span>Create Page</span>
                </button>
              </div>
            )}
          </div>

          {renderView()}
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <Trash2 size={24} />
                <h3 className="text-xl font-bold text-slate-900">{confirmModal.title}</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --- UI Subcomponents --- */

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}
  >
    {icon}
    <span>{label}</span>
    {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
  </button>
);

const StatCard: React.FC<{ label: string; value: string | number; trend: string; icon: React.ReactNode }> = ({ label, value, trend, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-50 rounded-xl">{icon}</div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        trend.startsWith('+') || trend === 'Live' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
      }`}>
        {trend}
      </span>
    </div>
    <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
    <p className="text-xs font-medium text-slate-400 mt-2">{label}</p>
  </div>
);

const FilterTab: React.FC<{ active: boolean; onClick: () => void; label: string; count: number }> = ({ active, onClick, label, count }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
      active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    {label}
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>
      {count}
    </span>
  </button>
);

const ColorInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <div className="flex items-center gap-3">
      <input 
        type="color" 
        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer overflow-hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input 
        type="text" 
        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; color: 'blue' | 'red' | 'slate', onClick: (e: React.MouseEvent) => void }> = ({ icon, label, color, onClick }) => {
  const colors = {
    blue: 'hover:bg-blue-50 hover:text-blue-600',
    red: 'hover:bg-red-50 hover:text-red-600',
    slate: 'hover:bg-slate-100 hover:text-slate-600'
  };
  
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`p-2 rounded-lg text-slate-400 transition-all flex items-center gap-2 ${colors[color]} relative group/btn`}
    >
      {icon}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
        {label}
      </span>
    </button>
  );
};

// Additional Icons for SEO view
const CheckCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ImageIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);

export default Dashboard;
