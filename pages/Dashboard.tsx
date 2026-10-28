
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Joyride, Step, STATUS } from 'react-joyride';
import { useCMS } from '../App';
import { 
  Plus, Search, Edit3, Trash2, Globe, FileText, 
  Copy, Eye, Upload, Download, Layout, Settings, BarChart3, 
  FolderOpen, Clock, Filter, Palette, Type,
  ChevronRight, ExternalLink, Activity, Repeat, X,
  ChevronUp, ChevronDown, TrendingUp, Users, Zap, LogOut, Lock, Sparkles, Loader2,
  Database, Code, Terminal, Link as LinkIcon, Layers, List,
  PanelLeftClose, PanelLeftOpen, ChevronsLeft, ChevronsRight, Menu, HelpCircle, Shield
} from 'lucide-react';
import { Page, Template, LayoutJSON, Section, MediaItem, URLRewrite, Collection, CollectionEntry, CollectionField, UserManagementItem, AccessLevel, getPermissionsForRole } from '../types';
import { SAMPLE_TEMPLATES } from '../sampleData';
import { generatePageIdea, generateCollectionSchema, smartSearchPages } from '../services/geminiService';
import { toast } from 'sonner';

type DashboardView = 'dashboard' | 'pages' | 'templates' | 'media' | 'settings' | 'seo' | 'global-styles' | 'profile' | 'page-settings' | 'rewrites' | 'users' | 'headless-api' | 'collections';

import { logout } from '../firebase';
import SmartSuggestions from '../components/SmartSuggestions';
import {
  GlobalSearchModal,
  searchCMSContent,
  HighlightMatch,
  GlobalSearchResult,
  SearchCategory
} from '../components/GlobalSearchModal';
import {
  UserManagementView,
  SectionAccessDenied,
  AccessLevelPill
} from '../components/UserManagementRBAC';

const Dashboard: React.FC = () => {
  const { 
    pages, setPages, 
    templates, setTemplates, 
    globalStyles, setGlobalStyles, 
    user, setUser, 
    media, setMedia, 
    socket,
    syncPage, deletePageOnServer,
    syncUser,
    syncGlobalStyles,
    syncTemplate, deleteTemplateOnServer,
    syncMedia, deleteMediaOnServer,
    users, setUsers,
    syncUserManagement, deleteUserOnServer,
    siteConfig, setSiteConfig,
    syncSiteConfig,
    rewrites, setRewrites,
    syncRewrite, deleteRewriteOnServer,
    collections, setCollections,
    entries, setEntries,
    syncCollection, deleteCollectionOnServer,
    syncEntry, deleteEntryOnServer,
    logoutDemoUser
  } = useCMS();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>('dashboard');

  // Granular RBAC simulation & active permissions resolution
  const [simulatedUser, setSimulatedUser] = useState<UserManagementItem | null>(null);

  const matchedDirectoryUser = React.useMemo(() => {
    if (!user?.email) return undefined;
    return users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
  }, [users, user?.email]);

  const activePermissions = React.useMemo(() => {
    if (simulatedUser) {
      return getPermissionsForRole(simulatedUser.role, simulatedUser.permissions);
    }
    if (matchedDirectoryUser) {
      return getPermissionsForRole(matchedDirectoryUser.role, matchedDirectoryUser.permissions);
    }
    return getPermissionsForRole(user?.role || 'Administrator', user?.permissions);
  }, [simulatedUser, matchedDirectoryUser, user?.role, user?.permissions]);

  const activeRoleLabel = simulatedUser
    ? `${simulatedUser.role} (${simulatedUser.name})`
    : matchedDirectoryUser?.role || user?.role || 'Administrator';

  // Collections state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CollectionEntry | null>(null);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [activeCollectionTab, setActiveCollectionTab] = useState<'entries' | 'schema' | 'api'>('entries');
  const [profileData, setProfileData] = useState(user);
  const [globalActivity, setGlobalActivity] = useState<Record<string, any[]>>({});

  // AI Architect for Collections
  const [collectionPrompt, setCollectionPrompt] = useState("");
  const [isArchitecting, setIsArchitecting] = useState(false);
  const [showAIArchitectModal, setShowAIArchitectModal] = useState(false);

  React.useEffect(() => {
    if (!socket) return;
    socket.on("global-activity", (activity: Record<string, any[]>) => {
      setGlobalActivity(activity);
    });
    return () => {
      socket.off("global-activity");
    };
  }, [socket]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('devinquire_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('devinquire_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse, Ctrl+K or Cmd+K to open Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsHeaderSearchDropdownOpen(false);
        setIsGlobalSearchOpen(prev => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isHeaderSearchDropdownOpen, setIsHeaderSearchDropdownOpen] = useState(false);
  const [headerSearchCategory, setHeaderSearchCategory] = useState<SearchCategory>('all');
  const [highlightedMediaId, setHighlightedMediaId] = useState<string | null>(null);
  const headerSearchContainerRef = useRef<HTMLDivElement>(null);
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [smartSearchResults, setSmartSearchResults] = useState<string[] | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        headerSearchContainerRef.current &&
        !headerSearchContainerRef.current.contains(e.target as Node)
      ) {
        setIsHeaderSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const globalSearchResults = React.useMemo(
    () => searchCMSContent(searchQuery, { pages, media, collections, entries }),
    [searchQuery, pages, media, collections, entries]
  );

  const filteredHeaderSearchResults = React.useMemo(() => {
    if (headerSearchCategory === 'all') return globalSearchResults;
    return globalSearchResults.filter(r => r.category === headerSearchCategory);
  }, [globalSearchResults, headerSearchCategory]);

  const handleSelectGlobalSearchResult = (
    result: GlobalSearchResult,
    action: 'primary' | 'secondary' = 'primary'
  ) => {
    setIsGlobalSearchOpen(false);
    setIsHeaderSearchDropdownOpen(false);

    if (result.category === 'pages' && result.page) {
      if (action === 'secondary') {
        setActiveView('pages');
        setSearchQuery(result.page.title);
      } else {
        navigate(`/editor/${result.page.id}`);
      }
      return;
    }

    if (result.category === 'media' && result.mediaItem) {
      setActiveView('media');
      setSearchQuery('');
      setHighlightedMediaId(result.mediaItem.id);
      toast.success(`Located media asset: ${result.mediaItem.name}`);
      setTimeout(() => {
        const el = document.getElementById(`media-card-${result.mediaItem!.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      setTimeout(() => {
        setHighlightedMediaId(prev => (prev === result.mediaItem?.id ? null : prev));
      }, 4000);
      return;
    }

    if (result.category === 'entries' && result.entry) {
      const targetCol =
        result.collection || collections.find(c => c.id === result.entry!.collectionId) || null;
      setActiveView('collections');
      setSearchQuery('');
      if (targetCol) {
        setSelectedCollection(targetCol);
        setActiveCollectionTab('entries');
      }
      setSelectedEntry(result.entry);
      setIsEditingEntry(true);
    }
  };
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'site' | 'styles' | 'pages' | 'hosting'>('site');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Editor' });
  useEffect(() => {
    setSelectedPageIds([]);
  }, [activeFilter, activeView]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({ name: '', type: 'section' as 'section' | 'page' });
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    icon?: React.ReactNode;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [runTour, setRunTour] = useState(false);

  const startTourGuide = () => {
    setActiveView('dashboard');
    setIsSidebarCollapsed(false);
    setRunTour(false);
    setTimeout(() => {
      setRunTour(true);
    }, 150);
  };

  // Launch tour guide automatically for new users who logged in for the 1st time
  useEffect(() => {
    const userKey = user?.email || user?.name || 'default_user';
    const userTourKey = `hasSeenOnboardingTour_${userKey}`;
    const hasSeenUserTour = localStorage.getItem(userTourKey);
    
    if (!hasSeenUserTour) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user?.email, user?.name]);

  const tourSteps: Step[] = [
    {
      target: '#tour-dashboard',
      content: 'Welcome to DevInquire CMS! This is your command center for tracking live website statistics, recent projects, and quick builder tools.',
      placement: 'right',
    },
    {
      target: '#tour-pages',
      content: 'Manage and edit all your website pages. You can build visual layouts, configure SEO, toggle publish states, or export code.',
      placement: 'right',
    },
    {
      target: '#tour-create-page',
      content: 'Ready to build? Click here to launch a brand new blank page or use our AI Content Generator.',
      placement: 'bottom',
    },
    {
      target: '#tour-templates',
      content: 'Browse our responsive template library with pre-designed heroes, feature blocks, and multi-section layouts.',
      placement: 'right',
    },
    {
      target: '#tour-media',
      content: 'Upload and organize all your images and media assets in the Media Library for easy access in the visual editor.',
      placement: 'right',
    },
    {
      target: '#tour-collections',
      content: 'Build structured headless CMS collections with schemas, custom fields, and auto-generated REST APIs.',
      placement: 'right',
    },
    {
      target: '#tour-profile',
      content: 'Manage your account settings, site branding, SEO, or restart this interactive tour guide anytime. Happy building!',
      placement: 'bottom',
    }
  ];

  const handleTourCallback = (data: any) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);
      const userKey = user?.email || user?.name || 'default_user';
      localStorage.setItem(`hasSeenOnboardingTour_${userKey}`, 'true');
      localStorage.setItem('hasSeenOnboardingTour', 'true');
      toast.success('Tour completed! You can restart the tour anytime from Help or Profile.');
    }
  };

  // --- Collection Actions ---
  const handleCreateCollection = () => {
    const id = `col_${Math.random().toString(36).substr(2, 9)}`;
    const newCollection: Collection = {
      id,
      name: 'New Collection',
      slug: 'new-collection',
      description: 'A new structured content collection',
      icon: 'Layers',
      fields: [
        { id: 'f1', name: 'Title', slug: 'title', type: 'text', required: true }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedCollection(newCollection);
    setIsEditingCollection(true);
    setActiveCollectionTab('schema');
  };

  const handleSaveCollection = async (collectionData: Collection) => {
    setCollections(prev => {
      const exists = prev.find(c => c.id === collectionData.id);
      if (exists) return prev.map(c => c.id === collectionData.id ? collectionData : c);
      return [...prev, collectionData];
    });
    await syncCollection(collectionData);
    setIsEditingCollection(false);
    setSelectedCollection(null);
  };

  const handleDeleteCollection = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and ALL its entries? This cannot be undone.',
      onConfirm: async () => {
        setCollections(prev => prev.filter(c => c.id !== id));
        await deleteCollectionOnServer(id);
        const relatedEntries = entries.filter(e => e.collectionId === id);
        for (const entry of relatedEntries) {
          await deleteEntryOnServer(entry.id);
        }
        setEntries(prev => prev.filter(e => e.collectionId !== id));
        setConfirmModal(prev => ({ ...prev, show: false }));
        if (selectedCollection?.id === id) {
          setSelectedCollection(null);
        }
      }
    });
  };

  const handleCreateEntry = (collectionId: string) => {
    const id = `ent_${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: CollectionEntry = {
      id,
      collectionId,
      data: {},
      status: 'draft',
      author: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedEntry(newEntry);
    setIsEditingEntry(true);
  };

  const handleSaveEntry = async (entry: CollectionEntry) => {
    setEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      if (exists) return prev.map(e => e.id === entry.id ? entry : e);
      return [...prev, entry];
    });
    await syncEntry(entry);
    setIsEditingEntry(false);
    setSelectedEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await deleteEntryOnServer(id);
  };

  const renderCollectionsView = () => {
    if (activePermissions.collections.level === 'none') {
      return (
        <SectionAccessDenied
          sectionTitle="Collection Management"
          requiredCapability="Collections: View or Manage"
          activeRoleName={activeRoleLabel}
          isSimulating={Boolean(simulatedUser)}
          onExitSimulation={() => setSimulatedUser(null)}
          onBackToDashboard={() => setActiveView('dashboard')}
        />
      );
    }

    const canEditEntries =
      activePermissions.collections.level === 'manage' &&
      activePermissions.collections.canEditEntries;
    const canEditSchema =
      activePermissions.collections.level === 'manage' &&
      activePermissions.collections.canEditSchema;
    const canDeleteCollections =
      activePermissions.collections.level === 'manage' &&
      activePermissions.collections.canDelete;

    if (selectedCollection) {
      const collectionEntries = entries.filter(e => {
        if (e.collectionId !== selectedCollection.id) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const valuesText = Object.values(e.data || {})
          .map(v => String(v || ''))
          .join(' ')
          .toLowerCase();
        return valuesText.includes(q) || selectedCollection.name.toLowerCase().includes(q);
      });
      
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCollection(null)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">{selectedCollection.name}</h2>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium italic">/{selectedCollection.slug}</span>
              </div>
              <p className="text-sm text-slate-500">{selectedCollection.description}</p>
            </div>
            <div className="ml-auto flex gap-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveCollectionTab('entries')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'entries' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Database size={14} />
                Entries
              </button>
              <button 
                onClick={() => setActiveCollectionTab('schema')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'schema' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Settings size={14} />
                Schema
                {!canEditSchema && <Lock size={12} className="text-slate-400" />}
              </button>
              <button 
                onClick={() => setActiveCollectionTab('api')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'api' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Code size={14} />
                API
              </button>
            </div>
          </div>

          {activeCollectionTab === 'entries' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-800">Content Entries</h3>
                  {!canEditEntries && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                      <Lock size={12} /> Read-Only Entries Access
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (!canEditEntries) {
                      toast.error('Your role does not have permission to create or edit collection entries.');
                      return;
                    }
                    handleCreateEntry(selectedCollection.id);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    canEditEntries
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {canEditEntries ? <Plus size={18} /> : <Lock size={16} />}
                  Add New Entry
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Entry Data</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Last Updated</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collectionEntries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          No entries found. Start by adding your first content item.
                        </td>
                      </tr>
                    ) : (
                      collectionEntries.map(entry => (
                        <tr
                          key={entry.id}
                          className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (!canEditEntries) {
                              toast.info('Read-only entry access enabled for your current role.');
                              return;
                            }
                            setSelectedEntry(entry);
                            setIsEditingEntry(true);
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">
                                {entry.data[selectedCollection.fields[0].slug] || "Untitled Entry"}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[300px]">
                                {Object.values(entry.data).slice(1, 3).join(' • ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${entry.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {new Date(entry.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEditEntries && (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setIsEditingEntry(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"><Edit3 size={16} /></button>
                              )}
                              {canDeleteCollections && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeCollectionTab === 'schema' ? (
            <div className="max-w-4xl bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              {!canEditSchema && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-semibold">
                  <Lock size={16} className="shrink-0 text-amber-600" />
                  <span>
                    Schema modification is restricted for role <strong>{activeRoleLabel}</strong>. You can inspect field definitions in read-only mode.
                  </span>
                </div>
              )}
              <div className={`space-y-8 ${!canEditSchema ? 'opacity-75 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Collection Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      value={selectedCollection.name}
                      onChange={(e) => setSelectedCollection({ ...selectedCollection, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">URL Slug</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">/</span>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        value={selectedCollection.slug}
                        onChange={(e) => setSelectedCollection({ ...selectedCollection, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fields Definitions</label>
                    <button 
                      onClick={() => {
                        const newField: CollectionField = {
                          id: Math.random().toString(36).substr(2, 5),
                          name: 'New Field',
                          slug: 'new-field',
                          type: 'text',
                          required: false
                        };
                        setSelectedCollection({ ...selectedCollection, fields: [...selectedCollection.fields, newField] });
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Field
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedCollection.fields.map((field, idx) => (
                      <div key={field.id} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl group/field">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <input 
                              type="text" 
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Field Name"
                              value={field.name}
                              onChange={(e) => {
                                const updatedFields = [...selectedCollection.fields];
                                updatedFields[idx] = { ...field, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                                setSelectedCollection({ ...selectedCollection, fields: updatedFields });
                              }}
                            />
                            <select 
                              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                              value={field.type}
                              onChange={(e) => {
                                const updatedFields = [...selectedCollection.fields];
                                updatedFields[idx] = { ...field, type: e.target.value as any };
                                setSelectedCollection({ ...selectedCollection, fields: updatedFields });
                              }}
                            >
                              <option value="text">Text</option>
                              <option value="rich-text">Rich Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="image">Image</option>
                              <option value="boolean">Boolean (Switch)</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                checked={field.required}
                                onChange={(e) => {
                                  const updatedFields = [...selectedCollection.fields];
                                  updatedFields[idx] = { ...field, required: e.target.checked };
                                  setSelectedCollection({ ...selectedCollection, fields: updatedFields });
                                }}
                              />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Required</span>
                            </label>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const updatedFields = selectedCollection.fields.filter(f => f.id !== field.id);
                            setSelectedCollection({ ...selectedCollection, fields: updatedFields });
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors self-start"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    onClick={() => setSelectedCollection(null)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleSaveCollection(selectedCollection)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Save Collection Schema
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
               <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-slate-300 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                    <Terminal size={140} />
                  </div>
                  <div className="relative z-10 space-y-8">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3 text-blue-400">
                          <Code size={24} />
                          <span className="text-xs font-black uppercase tracking-widest">Headless API v1</span>
                       </div>
                       <h3 className="text-2xl font-black text-white">Project Connection Details</h3>
                       <p className="text-sm text-slate-400 max-w-xl">Every collection you create is instantly available via our Headless API. Access your data from any platform using these standardized endpoints.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Primary Endpoint</label>
                        <div className="flex bg-black/40 border border-slate-700 rounded-2xl overflow-hidden group hover:border-blue-500/50 transition-all">
                           <div className="bg-blue-600 text-white px-5 py-4 text-xs font-black flex items-center">GET</div>
                           <div className="flex-1 px-5 py-4 font-mono text-xs text-blue-300 truncate">
                              {window.location.origin}/api/v1/content/collections/{selectedCollection.slug}/items
                           </div>
                           <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/v1/content/collections/${selectedCollection.slug}/items`);
                              toast.success("Endpoint URL copied!");
                            }}
                            className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border-l border-slate-700"
                           >
                              <Copy size={18} />
                           </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Response Structure</label>
                         <div className="bg-black/60 border border-slate-800 rounded-[2rem] p-8 font-mono text-xs text-emerald-400 overflow-auto max-h-[400px] custom-scrollbar shadow-inner">
                            <pre>
{JSON.stringify({
  success: true,
  data: collectionEntries.map(e => ({
    id: e.id,
    ...e.data,
    status: e.status,
    updatedAt: e.updatedAt
  }))
}, null, 2)}
                            </pre>
                         </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* Entry Creation/Editing Modal */}
          {isEditingEntry && selectedEntry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{selectedEntry.id.startsWith('ent_') && !entries.find(e => e.id === selectedEntry.id) ? 'Create Entry' : 'Edit Entry'}</h3>
                      <p className="text-xs text-slate-500 italic">Adding to {selectedCollection.name}</p>
                    </div>
                    <button onClick={() => setIsEditingEntry(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
                    {selectedCollection.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          {field.name}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'text' && (
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={selectedEntry.data[field.slug] || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: e.target.value } })}
                          />
                        )}
                        {field.type === 'number' && (
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={selectedEntry.data[field.slug] || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: e.target.value } })}
                          />
                        )}
                        {field.type === 'boolean' && (
                           <div 
                            onClick={() => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: !selectedEntry.data[field.slug] } })}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${selectedEntry.data[field.slug] ? 'bg-blue-600' : 'bg-slate-200'}`}
                           >
                             <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${selectedEntry.data[field.slug] ? 'translate-x-6' : 'translate-x-0'}`} />
                           </div>
                        )}
                        {field.type === 'rich-text' && (
                          <textarea 
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
                            value={selectedEntry.data[field.slug] || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: e.target.value } })}
                          />
                        )}
                        {field.type === 'date' && (
                          <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={selectedEntry.data[field.slug] || ''}
                            onChange={(e) => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: e.target.value } })}
                          />
                        )}
                        {field.type === 'image' && (
                          <div className="flex gap-4 items-center">
                            {selectedEntry.data[field.slug] && (
                              <img src={selectedEntry.data[field.slug]} className="w-16 h-16 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                            )}
                            <input 
                              type="text" 
                              placeholder="Image URL"
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                              value={selectedEntry.data[field.slug] || ''}
                              onChange={(e) => setSelectedEntry({ ...selectedEntry, data: { ...selectedEntry.data, [field.slug]: e.target.value } })}
                            />
                            <button 
                              onClick={() => setActiveView('media')}
                              className="p-3 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-all"
                              title="Media Library"
                            >
                              <ImageIcon size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-4 flex items-center gap-6">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Status</label>
                       <div className="flex gap-2">
                         <button 
                            onClick={() => setSelectedEntry({ ...selectedEntry, status: 'draft' })}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedEntry.status === 'draft' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                         >
                           DRAFT
                         </button>
                         <button 
                            onClick={() => setSelectedEntry({ ...selectedEntry, status: 'published' })}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedEntry.status === 'published' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                         >
                           PUBLISHED
                         </button>
                       </div>
                    </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      onClick={() => setIsEditingEntry(false)}
                      className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-white hover:shadow-sm transition-all text-sm"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={() => handleSaveEntry(selectedEntry)}
                      className="px-10 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 text-sm"
                    >
                      Save Entry
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="text-blue-600" size={24} />
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Content Collections</h2>
              <AccessLevelPill level={activePermissions.collections.level} />
            </div>
            <p className="text-sm text-slate-500 max-w-xl">Define structured data models for your application. Use collections to power blog posts, products, testimonials, or any recurring content pattern.</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-bold">
              <span className="text-slate-400 uppercase tracking-wider">Active Role Policy:</span>
              <span className={`px-2 py-0.5 rounded ${canEditEntries ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-400'}`}>
                Entries: {canEditEntries ? 'Create & Edit' : 'Read-Only'}
              </span>
              <span className={`px-2 py-0.5 rounded ${canEditSchema ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                Schema: {canEditSchema ? 'Full Architect' : 'Locked'}
              </span>
              <span className={`px-2 py-0.5 rounded ${canDeleteCollections ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                Delete: {canDeleteCollections ? 'Allowed' : 'Restricted'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (!canEditSchema) {
                  toast.error('Schema creation is restricted by your role permissions.');
                  return;
                }
                setShowAIArchitectModal(true);
              }}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all group ${
                canEditSchema
                  ? 'bg-white border-2 border-slate-100 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {canEditSchema ? (
                <Sparkles size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
              ) : (
                <Lock size={16} />
              )}
              AI Architect
            </button>
            <button 
              onClick={() => {
                if (!canEditSchema) {
                  toast.error('Creating new collections requires Schema Architect permissions.');
                  return;
                }
                handleCreateCollection();
              }}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                canEditSchema
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {canEditSchema ? <Plus size={18} /> : <Lock size={16} />}
              New Collection
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No collections yet</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Create a collection to start managing structured content like blogs or products.</p>
              {canEditSchema && (
                <button 
                  onClick={handleCreateCollection}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10"
                >
                  <Plus size={20} />
                  Get Started
                </button>
              )}
            </div>
          ) : (
            collections.map(collection => (
              <div key={collection.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col group hover:border-blue-400 hover:shadow-xl transition-all relative overflow-hidden h-fit">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <Layers size={28} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEditSchema && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCollection(collection); setIsEditingCollection(true); setActiveCollectionTab('schema'); }}
                        className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Settings"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                    {canDeleteCollections && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(collection.id); }}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="cursor-pointer" onClick={() => setSelectedCollection(collection)}>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{collection.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed line-clamp-2">{collection.description}</p>
                </div>
                
                <div className="mt-auto flex items-center gap-4 pt-4 border-t border-slate-50">
                   <div className="flex-1">
                     <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">Entries</span>
                     <span className="text-sm font-black text-slate-700">{entries.filter(e => e.collectionId === collection.id).length}</span>
                   </div>
                   <button 
                    onClick={() => setSelectedCollection(collection)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-blue-600 transition-all"
                   >
                     Manage <ChevronRight size={14} />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Zap size={32} />
            </div>
            <div>
              <h4 className="text-xl font-bold mb-2 tracking-tight">Structured Content for Every Application</h4>
              <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                Define your schema once and let our AI engine help you populate content. Access your data via 
                <code className="mx-2 bg-white/20 px-2 py-0.5 rounded text-white border border-white/20 whitespace-nowrap">/api/v1/content/collections/:slug/items</code>
                or use it within our visual builder to create dynamic apps instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);
  const templateInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    logoutDemoUser();
    try {
      await logout();
    } catch (_error) {
      // ignore if firebase auth is not active
    }
    navigate('/login');
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
      const updatedUser = { ...user, avatarUrl: base64 };
      setUser(updatedUser);
      setProfileData(updatedUser);
      syncUser(updatedUser);
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
        syncMedia(newMedia);
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
        deleteMediaOnServer(id);
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
            // Sync all imported pages and templates
            importedData.pages.forEach((p: Page) => syncPage(p));
            if (importedData.templates) {
              importedData.templates.forEach((t: Template) => syncTemplate(t));
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
            syncPage(newPage);
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
          syncPage(newPage);
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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await syncGlobalStyles(globalStyles);
      await syncUser(user);
      await syncSiteConfig(siteConfig);
      setConfirmModal({
        show: true,
        title: 'Settings Saved',
        message: 'Your site configuration has been updated successfully.',
        confirmLabel: 'Great',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectSite = async () => {
    setIsConnecting(true);
    try {
      // Simulate API call to connect site
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowConnectModal(false);
      setConfirmModal({
        show: true,
        title: 'Site Connected',
        message: 'Your site has been successfully connected to Google Search Console.',
        confirmLabel: 'Awesome',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    } catch (error) {
      console.error("Error connecting site:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    const userToAdd: any = {
      id: Math.random().toString(36).substr(2, 9),
      ...newUser,
      status: 'Active',
      lastActive: 'Just now'
    };
    try {
      await syncUserManagement(userToAdd);
      setUsers(prev => [...prev, userToAdd]);
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', role: 'Editor' });
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const id = Math.random().toString(36).substr(2, 9);
      
      try {
        if (file.name.endsWith('.json')) {
          const importedData = JSON.parse(content);
          const newTemplate: Template = {
            id,
            name: importedData.name || `Imported ${file.name}`,
            type: importedData.type || 'page',
            layoutJSON: importedData.layoutJSON || { sections: [], layoutVersion: '1.0' },
            createdBy: 'Admin',
            isCustomSite: !!importedData.isCustomSite,
            ...(importedData.customHTML ? { customHTML: importedData.customHTML } : {}),
            ...(importedData.customCSS ? { customCSS: importedData.customCSS } : {}),
            ...(importedData.customJS ? { customJS: importedData.customJS } : {})
          };
          setTemplates(prev => [newTemplate, ...prev]);
          syncTemplate(newTemplate);
          alert('Template imported successfully!');
        } else if (file.name.endsWith('.html')) {
          const newTemplate: Template = {
            id,
            name: `HTML Template: ${file.name}`,
            type: 'page',
            layoutJSON: { sections: [], layoutVersion: '1.0' },
            createdBy: 'Admin',
            isCustomSite: true,
            customHTML: content
          };
          setTemplates(prev => [newTemplate, ...prev]);
          syncTemplate(newTemplate);
          alert('HTML file imported as a Template!');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import template. Please ensure it is a valid JSON or HTML file.');
      }
    };
    reader.readAsText(file);
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
      author: 'Admin',
      isCustomSite: !!actualTemplate?.isCustomSite,
      ...(actualTemplate?.customHTML ? { customHTML: actualTemplate.customHTML } : {}),
      ...(actualTemplate?.customCSS ? { customCSS: actualTemplate.customCSS } : {}),
      ...(actualTemplate?.customJS ? { customJS: actualTemplate.customJS } : {})
    };
    setPages(prev => [newPage, ...prev]);
    syncPage(newPage);
    navigate(`/editor/${id}`);
  };

  const deleteTemplate = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      onConfirm: () => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        deleteTemplateOnServer(id);
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
        const existingIds = new Set(templates.map(t => t.id));
        const newSamples = SAMPLE_TEMPLATES.filter(t => !existingIds.has(t.id));
        
        setTemplates(prev => [...prev, ...newSamples]);
        newSamples.forEach(t => syncTemplate(t));
        
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
        deletePageOnServer(id);
        setSelectedPageIds(prev => prev.filter(pId => pId !== id));
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleBulkDownload = () => {
    const selectedPages = pages.filter(p => selectedPageIds.includes(p.id));
    if (selectedPages.length === 0) return;

    if (selectedPages.length === 1) {
      downloadPage(selectedPages[0]);
    } else {
      // Multiple pages: export as a site backup format
      const siteExport = {
        pages: selectedPages,
        templates: [], // Optional: could include templates if needed
        globalStyles: globalStyles,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      const content = JSON.stringify(siteExport, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `site-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    }
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      show: true,
      title: 'Bulk Delete Pages',
      message: `Are you sure you want to delete ${selectedPageIds.length} pages? This action cannot be undone.`,
      onConfirm: () => {
        setPages(prev => prev.filter(p => !selectedPageIds.includes(p.id)));
        selectedPageIds.forEach(id => deletePageOnServer(id));
        setSelectedPageIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleBulkPublish = () => {
    setConfirmModal({
      show: true,
      title: 'Bulk Publish Pages',
      message: `Are you sure you want to publish ${selectedPageIds.length} pages?`,
      confirmLabel: 'Confirm Publish',
      confirmColor: 'bg-green-600 hover:bg-green-700 shadow-green-500/20',
      icon: <Globe size={24} className="text-green-600" />,
      onConfirm: () => {
        const updatedPages = pages.map(p => 
          selectedPageIds.includes(p.id) ? { ...p, status: 'published' as const, updatedAt: new Date().toISOString() } : p
        );
        setPages(updatedPages);
        selectedPageIds.forEach(id => {
          const page = updatedPages.find(p => p.id === id);
          if (page) syncPage(page);
        });
        setSelectedPageIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleBulkUnpublish = () => {
    setConfirmModal({
      show: true,
      title: 'Bulk Unpublish Pages',
      message: `Are you sure you want to unpublish ${selectedPageIds.length} pages?`,
      confirmLabel: 'Confirm Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20',
      icon: <Edit3 size={24} className="text-amber-600" />,
      onConfirm: () => {
        const updatedPages = pages.map(p => 
          selectedPageIds.includes(p.id) ? { ...p, status: 'draft' as const, updatedAt: new Date().toISOString() } : p
        );
        setPages(updatedPages);
        selectedPageIds.forEach(id => {
          const page = updatedPages.find(p => p.id === id);
          if (page) syncPage(page);
        });
        setSelectedPageIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const toggleSelectAll = (filteredPages: Page[]) => {
    if (selectedPageIds.length === filteredPages.length && filteredPages.length > 0) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(filteredPages.map(p => p.id));
    }
  };

  const toggleSelectPage = (id: string) => {
    setSelectedPageIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
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
    syncPage(duplicated);
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

  const getPageTextContent = (page: Page): string => {
    let text = `${page.title} ${page.slug} ${page.seo?.metaTitle || ''} ${page.seo?.metaDescription || ''} ${page.seo?.keywords || ''}`;
    
    if (page.isCustomSite) {
      text += ` ${page.customHTML || ''}`;
    } else {
      page.layoutJSON.sections.forEach(section => {
        section.columns.forEach(column => {
          column.blocks.forEach(block => {
            if (typeof block.content === 'string') {
              text += ` ${block.content}`;
            } else if (typeof block.content === 'object' && block.content !== null) {
              // Extract text from common block content structures
              const content = block.content as any;
              if (content.text) text += ` ${content.text}`;
              if (content.title) text += ` ${content.title}`;
              if (content.description) text += ` ${content.description}`;
              if (content.body) text += ` ${content.body}`;
              if (Array.isArray(content.features)) text += ` ${content.features.join(' ')}`;
              if (Array.isArray(content.links)) text += ` ${content.links.map((l: any) => l.label).join(' ')}`;
            }
          });
        });
      });
    }
    return text.toLowerCase();
  };

  const handleGenerateCollectionAI = async () => {
    if (!collectionPrompt) return;
    setIsArchitecting(true);
    try {
      const schema = await generateCollectionSchema(collectionPrompt);
      const newCollection: Collection = {
        id: Math.random().toString(36).substr(2, 9),
        name: schema.name,
        slug: schema.slug,
        description: schema.description,
        icon: schema.icon || 'Database',
        fields: schema.fields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setCollections([...collections, newCollection]);
      syncCollection(newCollection);
      setCollectionPrompt("");
      setShowAIArchitectModal(false);
      toast.success(`Generated collection: ${schema.name}`);
      setSelectedCollection(newCollection);
      setActiveCollectionTab('schema');
    } catch (error) {
      toast.error("Failed to architect collection.");
    } finally {
      setIsArchitecting(false);
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSmartSearching(true);
    setSmartSearchResults(null);
    
    try {
      const pageDataForAI = pages.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: getPageTextContent(p).substring(0, 500) // Limit content per page for context
      }));

      const result = await smartSearchPages(searchQuery, pageDataForAI);
      setSmartSearchResults(result);
    } catch (error) {
      console.error('Smart search error:', error);
      alert('Failed to perform smart search. Please try again.');
    } finally {
      setIsSmartSearching(false);
    }
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
    syncTemplate(newTemplate);
    setShowCreateTemplateModal(false);
    setNewTemplateData({ name: '', type: 'section' });
    
    // Navigate to editor to design the template
    navigate(`/editor/${id}`);
  };

  const filteredPages = pages.filter(p => {
    const title = (p.title || '').toLowerCase();
    const slug = (p.slug || '').toLowerCase();
    const content = getPageTextContent(p);
    const query = (searchQuery || '').toLowerCase();
    
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    
    // If we have smart search results, use them
    if (smartSearchResults !== null) {
      return smartSearchResults.includes(p.id) && matchesFilter;
    }

    const matchesSearch = title.includes(query) || 
                          slug.includes(query) ||
                          content.includes(query);
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
    const sectionAccessMap: Partial<
      Record<DashboardView, { level: AccessLevel; title: string; cap: string }>
    > = {
      pages: {
        level: activePermissions.pages,
        title: 'Pages & Visual Editor',
        cap: 'Pages: View or Manage',
      },
      templates: {
        level: activePermissions.templates,
        title: 'Template Library',
        cap: 'Templates: View or Manage',
      },
      media: {
        level: activePermissions.media.level,
        title: 'Media Library',
        cap: 'Media Library: View or Manage',
      },
      collections: {
        level: activePermissions.collections.level,
        title: 'Collection Management',
        cap: 'Collections: View or Manage',
      },
      rewrites: {
        level: activePermissions.rewrites,
        title: 'URL Rewrites & Redirects',
        cap: 'URL Rewrites: View or Manage',
      },
      'headless-api': {
        level: activePermissions.headlessApi,
        title: 'Headless API Explorer',
        cap: 'Headless API: View or Manage',
      },
      settings: {
        level: activePermissions.settings,
        title: 'Site Settings & Global Styles',
        cap: 'Site Settings: View or Manage',
      },
      seo: {
        level: activePermissions.seo,
        title: 'SEO & Search Console',
        cap: 'SEO & Analytics: View or Manage',
      },
    };

    const currentSectionRule = sectionAccessMap[activeView];
    if (currentSectionRule && currentSectionRule.level === 'none') {
      return (
        <SectionAccessDenied
          sectionTitle={currentSectionRule.title}
          requiredCapability={currentSectionRule.cap}
          activeRoleName={activeRoleLabel}
          isSimulating={Boolean(simulatedUser)}
          onExitSimulation={() => setSimulatedUser(null)}
          onBackToDashboard={() => setActiveView('dashboard')}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome & Quick Start Flow */}
            <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 pointer-events-none">
                <Sparkles size={120} />
              </div>
              
              <div className="relative z-10 max-w-3xl">
                <h1 className="text-4xl font-black mb-4 tracking-tighter leading-none">
                  Ready to build something <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">amazing</span>, {user.name.split(' ')[0]}?
                </h1>
                <p className="text-slate-400 text-lg mb-10 max-w-xl font-medium">
                  Follow this simple path to launch your new website or app today. 
                  Where would you like to start?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div 
                    id="tour-create-page"
                    onClick={() => createPage()}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-3xl hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/40">
                      <Zap size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Instant Page</h3>
                    <p className="text-xs text-slate-400">Launch a blank canvas or use a pro template.</p>
                  </div>

                  <div 
                    onClick={() => setActiveView('templates')}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-3xl hover:bg-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/40">
                      <Layout size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Browse Templates</h3>
                    <p className="text-xs text-slate-400">Pick from over 50 professional designs.</p>
                  </div>

                  <div 
                    onClick={() => setActiveView('collections')}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-3xl hover:bg-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/40">
                      <Layers size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">The AI Architect</h3>
                    <p className="text-xs text-slate-400">Describe your site and let AI build the schema.</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-4 gap-6">
              <StatCard label="Live Pages" value={stats.published} trend="+12%" icon={<Globe className="text-blue-500" size={20} />} />
              <StatCard label="Monthly Visitors" value="4,290" trend="+5.4%" icon={<Users className="text-indigo-500" size={20} />} />
              <StatCard label="Media Assets" value={media.length} trend="Active" icon={<Eye className="text-purple-500" size={20} />} />
              <StatCard label="API Requests" value="1.2k" trend="Stable" icon={<Activity className="text-cyan-500" size={20} />} />
            </div>

            <SmartSuggestions 
              pages={pages} 
              onAction={(suggestion) => {
                if (suggestion.type === 'page') {
                  createPage();
                } else {
                  setActiveView('pages');
                }
              }}
            />

      {/* AI Architect Modal for Collections */}
      {showAIArchitectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="p-10 space-y-8">
                 <div className="flex justify-between items-start">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-blue-600">
                          <Sparkles size={24} className="animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">AI Content Architect</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-900 tracking-tight">What are we building?</h3>
                       <p className="text-sm text-slate-500 leading-relaxed">Describe the data you want to manage, and I'll architect the perfect collection schema for you.</p>
                    </div>
                    <button onClick={() => setShowAIArchitectModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
                 </div>

                 <div className="space-y-6">
                    <div className="relative group">
                       <textarea 
                          rows={4}
                          placeholder="e.g., A blog with title, featured image, content, and categories..."
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-500 transition-all outline-none resize-none text-sm leading-relaxed"
                          value={collectionPrompt}
                          onChange={(e) => setCollectionPrompt(e.target.value)}
                       />
                       <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Terminal size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Natural Language Engine</span>
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button 
                          onClick={() => setCollectionPrompt("A restaurant menu with dish name, price, ingredients, and dietary tags.")}
                          className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                       >
                          Restaurant Menu
                       </button>
                       <button 
                          onClick={() => setCollectionPrompt("An e-commerce product catalog with name, price, stock level, and gallery.")}
                          className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                       >
                          Product Catalog
                       </button>
                    </div>
                 </div>

                 <button 
                    disabled={!collectionPrompt || isArchitecting}
                    onClick={handleGenerateCollectionAI}
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all shadow-2xl shadow-blue-500/20 active:scale-95"
                 >
                    {isArchitecting ? (
                       <>
                          <Loader2 size={24} className="animate-spin" />
                          Architecting Schema...
                       </>
                    ) : (
                       <>
                          <Zap size={24} />
                          Build Collection Schema
                       </>
                    )}
                 </button>
              </div>
              <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <span>Powered by Gemini 2.0 Flash</span>
                 <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                 </div>
              </div>
           </div>
        </div>
      )}

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Projects</h2>
                  <button onClick={() => setActiveView('pages')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100">
                    {pages.slice(0, 4).map(page => (
                      <div 
                        key={page.id} 
                        onClick={() => navigate(`/editor/${page.id}`)}
                        className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{page.title}</h4>
                            <p className="text-[10px] text-slate-400">Published /{page.slug}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                    {pages.length === 0 && (
                      <div className="p-12 text-center">
                        <p className="text-slate-400 text-sm italic">No pages created yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Ecosystem</h2>
                </div>
                <div className="space-y-4">
                  <Link 
                    to="/editor/ai" 
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold">AI Page Generator</h3>
                        <p className="text-xs text-white/70">Scaffold entire sites with one prompt</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-white/50 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <div 
                    onClick={() => setActiveView('headless-api')}
                    className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-slate-900 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                        <Terminal size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Headless API</h3>
                        <p className="text-xs text-slate-500">Documentation & Live Console</p>
                      </div>
                    </div>
                    <ExternalLink size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </div>
                </div>
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

            {/* Bulk Actions Bar */}
            {selectedPageIds.length > 0 && (
              <div className="bg-slate-900 text-white rounded-xl shadow-xl p-4 flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-2 duration-300 border border-slate-800">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black">
                      {selectedPageIds.length}
                    </div>
                    <span className="text-sm font-bold text-slate-200">Pages Selected</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800 mx-2" />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBulkPublish}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold text-green-400 border border-transparent hover:border-slate-700"
                    >
                      <Globe size={14} />
                      Publish
                    </button>
                    <button 
                      onClick={handleBulkUnpublish}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold text-amber-400 border border-transparent hover:border-slate-700"
                    >
                      <Edit3 size={14} />
                      Unpublish
                    </button>
                    <button 
                      onClick={handleBulkDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-800 transition-all text-xs font-bold text-blue-400 border border-transparent hover:border-slate-700"
                    >
                      <Download size={14} />
                      Export
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-900/20 transition-all text-xs font-bold text-red-400 border border-transparent hover:border-red-900/30"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPageIds([])}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
                  title="Clear Selection"
                >
                  <X size={20} />
                </button>
              </div>
            )}

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
                      <th className="px-6 py-4 w-10">
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                            checked={selectedPageIds.length === filteredPages.length && filteredPages.length > 0}
                            onChange={() => toggleSelectAll(filteredPages)}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Page Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Live Path</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPages.map(page => (
                      <tr 
                        key={page.id} 
                        className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer relative ${selectedPageIds.includes(page.id) ? 'bg-blue-50/50' : ''}`}
                        onClick={() => navigate(`/editor/${page.id}`)}
                      >
                        <td className="px-6 py-5 w-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                              checked={selectedPageIds.includes(page.id)}
                              onChange={() => toggleSelectPage(page.id)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md ${
                              page.isCustomSite ? 'bg-purple-50 text-purple-600' :
                              page.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                            }`}>
                              {page.isCustomSite ? <Globe size={20} /> : <FileText size={20} />}
                            </div>
                              <div>
                                <span className="block font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{page.title}</span>
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
                            <ActionButton onClick={() => window.open(`/#/p/${page.slug}`, '_blank')} icon={<Eye size={16} />} label="View" color="blue" />
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
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => templateInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Upload size={14} />
                  Import Template
                </button>
                <input 
                  type="file" 
                  ref={templateInputRef} 
                  onChange={handleImportTemplate} 
                  accept=".json,.html" 
                  className="hidden" 
                />
                <button 
                  onClick={restoreSampleTemplates}
                  className="text-xs font-bold text-slate-500 hover:text-slate-600 flex items-center gap-1"
                >
                  <Repeat size={14} />
                  Restore Samples
                </button>
              </div>
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
      case 'media': {
        if (activePermissions.media.level === 'none') {
          return (
            <SectionAccessDenied
              sectionTitle="Media Library"
              requiredCapability="Media Library: View or Manage"
              activeRoleName={activeRoleLabel}
              isSimulating={Boolean(simulatedUser)}
              onExitSimulation={() => setSimulatedUser(null)}
              onBackToDashboard={() => setActiveView('dashboard')}
            />
          );
        }

        const canUploadMedia =
          activePermissions.media.level === 'manage' && activePermissions.media.canUpload;
        const canDeleteMedia =
          activePermissions.media.level === 'manage' && activePermissions.media.canDelete;

        const filteredMedia = media.filter(m => {
          const q = searchQuery.toLowerCase().trim();
          if (!q) return true;
          return (
            (m.name || '').toLowerCase().includes(q) ||
            (m.category || '').toLowerCase().includes(q) ||
            (m.type || '').toLowerCase().includes(q) ||
            (m.dimensions || '').toLowerCase().includes(q) ||
            (m.url && !m.url.startsWith('data:') && m.url.toLowerCase().includes(q))
          );
        });

        return (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-800">Media Library</h2>
                  <AccessLevelPill level={activePermissions.media.level} />
                </div>
                <p className="text-sm text-slate-500">Manage your images and assets</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">RBAC Policy:</span>
                  <span className={`px-2 py-0.5 rounded ${canUploadMedia ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    Upload: {canUploadMedia ? 'Allowed' : 'Restricted'}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${canDeleteMedia ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                    Delete: {canDeleteMedia ? 'Allowed' : 'Restricted'}
                  </span>
                </div>
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
                  onClick={() => {
                    if (!canUploadMedia) {
                      toast.error('Uploading media assets is restricted by your role permissions.');
                      return;
                    }
                    mediaInputRef.current?.click();
                  }}
                  className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    canUploadMedia
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {canUploadMedia ? <Upload size={18} /> : <Lock size={16} />}
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
                {canUploadMedia && (
                  <button 
                    onClick={() => mediaInputRef.current?.click()}
                    className="text-blue-600 font-bold text-sm hover:underline"
                  >
                    Click here to upload
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {filteredMedia.map(item => (
                  <div
                    id={`media-card-${item.id}`}
                    key={item.id}
                    className={`group relative bg-white rounded-2xl border overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 ${
                      highlightedMediaId === item.id
                        ? 'border-blue-600 ring-4 ring-blue-500/25 shadow-xl'
                        : 'border-slate-200'
                    }`}
                  >
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
                            toast.success('Media URL copied to clipboard!');
                          }}
                          className="p-2 bg-white rounded-lg text-slate-900 hover:bg-blue-50 hover:text-blue-600 transition-all"
                          title="Copy URL"
                        >
                          <Copy size={16} />
                        </button>
                        {canDeleteMedia && (
                          <button 
                            onClick={() => deleteMedia(item.id)}
                            className="p-2 bg-white rounded-lg text-slate-900 hover:bg-red-50 hover:text-red-600 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-50">
                      <p className="text-xs font-bold text-slate-700 truncate" title={item.name}>{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{(Number(item.size || 0) / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'rewrites':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">URL Rewrites & Redirects</h2>
                <p className="text-sm text-slate-500">Manage how your URLs are handled and redirected.</p>
              </div>
              <button 
                onClick={() => {
                  const newRewrite: URLRewrite = {
                    id: Math.random().toString(36).substring(2, 9),
                    source: '',
                    target: '',
                    type: 'rewrite',
                    isActive: true,
                    createdAt: new Date().toISOString()
                  };
                  setRewrites(prev => [newRewrite, ...prev]);
                  // We'll sync when they edit it
                }}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                <Plus size={18} />
                Add Rewrite Rule
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Source URL</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Target URL / Slug</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewrites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                        No rewrite rules defined yet.
                      </td>
                    </tr>
                  ) : (
                    rewrites.map(rewrite => (
                      <tr key={rewrite.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 w-full"
                            placeholder="/old-path"
                            value={rewrite.source}
                            onChange={(e) => {
                              const updated = { ...rewrite, source: e.target.value };
                              setRewrites(prev => prev.map(r => r.id === rewrite.id ? updated : r));
                              syncRewrite(updated);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 w-full"
                            placeholder="new-slug or /new-path"
                            value={rewrite.target}
                            onChange={(e) => {
                              const updated = { ...rewrite, target: e.target.value };
                              setRewrites(prev => prev.map(r => r.id === rewrite.id ? updated : r));
                              syncRewrite(updated);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer"
                            value={rewrite.type}
                            onChange={(e) => {
                              const updated = { ...rewrite, type: e.target.value as any };
                              setRewrites(prev => prev.map(r => r.id === rewrite.id ? updated : r));
                              syncRewrite(updated);
                            }}
                          >
                            <option value="rewrite">Rewrite (Internal)</option>
                            <option value="301">301 (Permanent Redirect)</option>
                            <option value="302">302 (Found / Temporary Redirect)</option>
                            <option value="303">303 (See Other)</option>
                            <option value="307">307 (Temporary Redirect)</option>
                            <option value="308">308 (Permanent Redirect)</option>
                            <option value="proxy">Proxy (External)</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              const updated = { ...rewrite, isActive: !rewrite.isActive };
                              setRewrites(prev => prev.map(r => r.id === rewrite.id ? updated : r));
                              syncRewrite(updated);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${rewrite.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {rewrite.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setRewrites(prev => prev.filter(r => r.id !== rewrite.id));
                              deleteRewriteOnServer(rewrite.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'headless-api':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Terminal size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Headless API Documentation</h2>
                    <p className="text-sm text-slate-500">Expose your content to any frontend or application via our high-performance REST API.</p>
                  </div>
                </div>
                <Link 
                  to="/headless-demo" 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Globe size={16} />
                  View Live Demo
                </Link>
              </div>

              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    <h3 className="text-lg font-bold text-slate-800">Content Endpoints</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <ApiEndpoint 
                      method="GET" 
                      path="/api/v1/content/pages" 
                      description="List all published pages with their structured layout data." 
                    />
                    <ApiEndpoint 
                      method="GET" 
                      path="/api/v1/content/pages/:slug" 
                      description="Fetch a specific published page by its unique slug." 
                    />
                    <ApiEndpoint 
                      method="GET" 
                      path="/api/v1/content/collections" 
                      description="List all custom content collections definitions." 
                    />
                    <ApiEndpoint 
                      method="GET" 
                      path="/api/v1/content/collections/:slug/items" 
                      description="Fetch published entries for a specific collection (e.g., blog posts)." 
                    />
                    <ApiEndpoint 
                      method="GET" 
                      path="/api/v1/content/config" 
                      description="Get global site configuration, theme colors, and default styles." 
                    />
                  </div>
                </section>

                <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Code size={18} className="text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Example Usage (JavaScript)</h3>
                  </div>
                  <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`// 1. Fetch Page Layout
const pageRes = await fetch('/api/v1/content/pages/home');
const { data: homePage } = await pageRes.json();

// 2. Fetch Blog Collection Data
const blogRes = await fetch('/api/v1/content/collections/blog/items');
const { data: posts } = await blogRes.json();

console.log('Posts:', posts.map(p => p.title));`}
                  </pre>
                </section>

                <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <Activity size={20} className="text-amber-600" />
                  <p className="text-xs text-amber-800 font-medium">
                    The API is currently <strong>Public</strong>. All published content is accessible without an API key. 
                    Production builds will require the X-API-Key header in future updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'collections':
        return renderCollectionsView();
      case 'settings':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Site Settings</h2>
                <p className="text-sm text-slate-500">Configure your global site preferences, styles, and page SEO.</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setActiveSettingsTab('site')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSettingsTab === 'site' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Site Config
              </button>
              <button 
                onClick={() => setActiveSettingsTab('styles')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSettingsTab === 'styles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Global Styles
              </button>
              <button 
                onClick={() => setActiveSettingsTab('pages')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSettingsTab === 'pages' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Page SEO
              </button>
              <button 
                onClick={() => setActiveSettingsTab('hosting')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSettingsTab === 'hosting' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Domain & Hosting
              </button>
            </div>

            {activeSettingsTab === 'site' && (
              <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-8 animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-slate-800 mb-6">General Configuration</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Site Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={siteConfig.siteName}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, siteName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base URL</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      value={siteConfig.baseUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    />
                  </div>
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'styles' && (
              <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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
                    onClick={() => {
                      syncGlobalStyles(globalStyles);
                      alert('Global styles saved successfully!');
                    }}
                  >
                    Save Global Styles
                  </button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'pages' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">SEO Configuration</h2>
                    <p className="text-xs text-slate-500">Manage meta titles and descriptions for all your pages.</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pages.map(page => (
                      <div key={page.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                        <div className="grid grid-cols-12 gap-8">
                          <div className="col-span-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${page.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                {page.isCustomSite ? <Globe size={16} /> : <FileText size={16} />}
                              </div>
                              <span className="font-bold text-slate-800 truncate">{page.title}</span>
                            </div>
                            <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium italic">/{page.slug}</code>
                            <div className="mt-4">
                              <button 
                                onClick={() => navigate(`/editor/${page.id}`)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                              >
                                <Edit3 size={12} />
                                Open in Editor
                              </button>
                            </div>
                          </div>
                          
                          <div className="col-span-9 space-y-4">
                            <div className="grid grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">URL Slug</label>
                                <div className="flex items-center">
                                  <span className="text-xs text-slate-400 mr-1">/</span>
                                  <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="page-url-slug"
                                    value={page.slug}
                                    onChange={(e) => {
                                      const updatedPage = { 
                                        ...page, 
                                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                                        updatedAt: new Date().toISOString()
                                      };
                                      setPages(prev => prev.map(p => p.id === page.id ? updatedPage : p));
                                      syncPage(updatedPage);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Title</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="Enter meta title..."
                                  value={page.seo?.metaTitle || ''}
                                  onChange={(e) => {
                                    const updatedPage = { 
                                      ...page, 
                                      seo: { ...page.seo, metaTitle: e.target.value },
                                      updatedAt: new Date().toISOString()
                                    };
                                    setPages(prev => prev.map(p => p.id === page.id ? updatedPage : p));
                                    syncPage(updatedPage);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keywords</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="e.g. design, portfolio, cms"
                                  value={page.seo?.keywords || ''}
                                  onChange={(e) => {
                                    const updatedPage = { 
                                      ...page, 
                                      seo: { ...page.seo, keywords: e.target.value },
                                      updatedAt: new Date().toISOString()
                                    };
                                    setPages(prev => prev.map(p => p.id === page.id ? updatedPage : p));
                                    syncPage(updatedPage);
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Description</label>
                              <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px] resize-none"
                                placeholder="Enter meta description..."
                                value={page.seo?.metaDescription || ''}
                                onChange={(e) => {
                                  const updatedPage = { 
                                    ...page, 
                                    seo: { ...page.seo, metaDescription: e.target.value },
                                    updatedAt: new Date().toISOString()
                                  };
                                  setPages(prev => prev.map(p => p.id === page.id ? updatedPage : p));
                                  syncPage(updatedPage);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'hosting' && (
              <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Custom Domain Control</h2>
                      <p className="text-sm text-slate-500">Point your own domain name to this CMS project.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl border border-green-100">
                       <Globe size={18} />
                       <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">SSL Active</span>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-10">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Enter Custom Domain</label>
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g., www.mycoolsite.com"
                            value={siteConfig.customDomain || ''}
                            onChange={(e) => setSiteConfig(prev => ({ ...prev, customDomain: e.target.value.toLowerCase() }))}
                          />
                          <button 
                            onClick={handleSaveSettings}
                            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                          >
                            Verify & Connect
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Domain verification may take up to 24-48 hours to propagate globally.</p>
                      </div>

                      {siteConfig.customDomain && (
                        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                               <Settings size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg">Required DNS Records</h3>
                          </div>
                           <p className="text-sm text-slate-500">Update your domain's DNS settings at your registrar (e.g., Namecheap, GoDaddy) with the following values:</p>
                           
                           <div className="space-y-3">
                              <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                 <div className="col-span-2">Type</div>
                                 <div className="col-span-3">Host</div>
                                 <div className="col-span-5">Value / Target</div>
                                 <div className="col-span-2 text-right">TTL</div>
                              </div>
                              <DnsRecordRow type="A" host="@" value="34.102.215.118" />
                              <DnsRecordRow type="CNAME" host="www" value="cname.devinquire-cms.cloud" />
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-10 border-t border-slate-100">
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-4">
                             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                                <Zap size={24} />
                             </div>
                             <h4 className="font-bold text-slate-900">Headless Edge Delivery</h4>
                             <p className="text-sm text-slate-500 leading-relaxed">Your content is globally distributed via our CDN. Accessing your custom domain automatically routes requests to the nearest edge node for sub-100ms latency.</p>
                          </div>
                          <div className="space-y-4">
                             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                                <Activity size={24} />
                             </div>
                             <h4 className="font-bold text-slate-900">Automatic SSL/TLS</h4>
                             <p className="text-sm text-slate-500 leading-relaxed">We automatically provision and renew Let's Encrypt certificates for every custom domain connected to our platform at no extra cost.</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-slate-100 transition-all"
                >
                  Connect Site
                </button>
             </div>
          </div>
        );
      case 'users':
        return (
          <UserManagementView
            users={users}
            setUsers={setUsers}
            syncUserManagement={syncUserManagement}
            deleteUserOnServer={deleteUserOnServer}
            simulatedUser={simulatedUser}
            onSimulateUser={setSimulatedUser}
            openAddModalTrigger={showAddUserModal}
            onCloseAddModalTrigger={() => setShowAddUserModal(false)}
          />
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
                          const updatedUser = { ...user, avatar: newAvatar.substring(0, 2).toUpperCase(), avatarUrl: undefined };
                          setUser(updatedUser);
                          setProfileData(updatedUser);
                          syncUser(updatedUser);
                        }
                      }}
                    >
                      Set Initials
                    </button>
                    <button 
                      className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest"
                      onClick={() => {
                        const initials = profileData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        const updatedUser = { ...user, avatar: initials, avatarUrl: undefined };
                        setUser(updatedUser);
                        setProfileData(updatedUser);
                        syncUser(updatedUser);
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

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">CMS Tour Guide</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    New here or want a quick interactive walkthrough of all DevInquire CMS capabilities?
                  </p>
                  <button 
                    onClick={startTourGuide}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    <Sparkles size={14} />
                    Restart Tour Guide
                  </button>
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
                          syncUser(profileData);
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
                        setRunTour(true);
                        setActiveView('dashboard');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
                          <Repeat size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Restart Onboarding Tour</p>
                          <p className="text-xs text-slate-500">Re-watch the guided tour of key features</p>
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

  const JoyrideAny = Joyride as any;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <JoyrideAny
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose={false}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#2563eb',
            textColor: '#0f172a',
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          },
          tooltipContainer: {
            textAlign: 'left',
            fontSize: '14px',
            lineHeight: '1.6',
          },
          tooltipTitle: {
            fontSize: '16px',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '6px',
          },
          buttonNext: {
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '13px',
            padding: '8px 16px',
            backgroundColor: '#2563eb',
          },
          buttonBack: {
            fontWeight: '700',
            fontSize: '13px',
            marginRight: '8px',
            color: '#64748b',
          },
          buttonSkip: {
            fontWeight: '700',
            fontSize: '13px',
            color: '#94a3b8',
          }
        } as any}
      />
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20 transition-all duration-300 ease-in-out border-r border-slate-800 shadow-2xl ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header with Branding & Collapse Button */}
        <div className={`p-4 flex items-center border-b border-slate-800/80 ${
          isSidebarCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-blue-500 p-2 rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
              <Globe className="text-white" size={20} />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold text-white tracking-tight leading-none truncate">DevInquire</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">CMS Studio</span>
              </div>
            )}
          </div>
          
          <button
            id="btn-collapse-sidebar-toggle"
            onClick={toggleSidebar}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all shrink-0"
            title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div id="tour-dashboard">
            <NavItem 
              id="nav-dashboard"
              icon={<BarChart3 size={18} />} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              onClick={() => setActiveView('dashboard')}
              collapsed={isSidebarCollapsed}
            />
          </div>
          <div id="tour-pages">
            <NavItem 
              id="nav-pages"
              icon={<FileText size={18} />} 
              label="Pages" 
              active={activeView === 'pages'} 
              onClick={() => setActiveView('pages')}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.pages}
            />
          </div>
          <div id="tour-templates">
            <NavItem 
              id="nav-templates"
              icon={<Layout size={18} />} 
              label="Templates" 
              active={activeView === 'templates'} 
              onClick={() => setActiveView('templates')}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.templates}
            />
          </div>
          <div id="tour-media">
            <NavItem 
              id="nav-media"
              icon={<FolderOpen size={18} />} 
              label="Media Library" 
              active={activeView === 'media'} 
              onClick={() => setActiveView('media')}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.media.level}
            />
          </div>
          <NavItem 
            id="nav-rewrites"
            icon={<Repeat size={18} />} 
            label="URL Rewrites" 
            active={activeView === 'rewrites'} 
            onClick={() => setActiveView('rewrites')}
            collapsed={isSidebarCollapsed}
            accessLevel={activePermissions.rewrites}
          />
          <NavItem 
            id="nav-headless"
            icon={<Database size={18} />} 
            label="Headless API" 
            active={activeView === 'headless-api'} 
            onClick={() => setActiveView('headless-api')}
            collapsed={isSidebarCollapsed}
            accessLevel={activePermissions.headlessApi}
          />
          <div id="tour-collections">
            <NavItem 
              id="nav-collections"
              icon={<Layers size={18} />} 
              label="Collections" 
              active={activeView === 'collections'} 
              onClick={() => setActiveView('collections')}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.collections.level}
            />
          </div>
          
          {/* Configuration Section */}
          <div className="pt-3 pb-1">
            {isSidebarCollapsed ? (
              <div className="w-8 h-[1px] bg-slate-800 mx-auto my-2" />
            ) : (
              <button 
                onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                className="w-full px-3 flex items-center justify-between group py-1"
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Configuration</span>
                {isConfigExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
              </button>
            )}
          </div>
          
          {(isConfigExpanded || isSidebarCollapsed) && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
              <NavItem 
                id="nav-site-settings"
                icon={<Settings size={18} />} 
                label="Site Settings" 
                active={activeView === 'settings'} 
                onClick={() => setActiveView('settings')}
                collapsed={isSidebarCollapsed}
                accessLevel={activePermissions.settings}
              />
              <NavItem 
                id="nav-seo"
                icon={<Activity size={18} />} 
                label="SEO & Analytics" 
                active={activeView === 'seo'} 
                onClick={() => setActiveView('seo')}
                collapsed={isSidebarCollapsed}
                accessLevel={activePermissions.seo}
              />
            </div>
          )}
          {(user?.role === 'Administrator' || user?.role === 'admin' || activePermissions.users !== 'none' || simulatedUser !== null) && (
            <NavItem 
              id="nav-users"
              icon={<Users size={18} />} 
              label="User Management" 
              active={activeView === 'users'} 
              onClick={() => setActiveView('users')}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.users}
            />
          )}
        </nav>

        {/* User Control Panel */}
        <div className="px-3 py-3 border-t border-slate-800/80">
          <div className={`bg-slate-800/40 rounded-2xl p-2.5 border border-slate-700/40 group hover:bg-slate-800/70 transition-all ${
            isSidebarCollapsed ? 'flex flex-col items-center' : ''
          }`}>
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center mb-2' : 'mb-3'}`}>
              <div 
                className="relative cursor-pointer" 
                onClick={() => setActiveView('profile')} 
                title={isSidebarCollapsed ? `${user.name} (${user.role})` : undefined}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.avatar
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              )}
            </div>

            {isSidebarCollapsed ? (
              <div className="flex flex-col gap-1 w-full items-center">
                <button 
                  onClick={() => setActiveView('profile')}
                  className={`p-2 rounded-lg transition-all ${activeView === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                  title="Profile Settings"
                >
                  <Users size={14} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                <button 
                  onClick={() => setActiveView('profile')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeView === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                  title="Profile Settings"
                >
                  <Users size={14} />
                  <span className="text-[8px] mt-1 font-bold">Profile</span>
                </button>
                <button 
                  onClick={() => setActiveView('settings')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${activeView === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                  title="Site Settings"
                >
                  <Settings size={14} />
                  <span className="text-[8px] mt-1 font-bold">Settings</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  title="Logout"
                >
                  <LogOut size={14} />
                  <span className="text-[8px] mt-1 font-bold">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Top Header / Search */}
        <header className="h-16 bg-white border-b px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Header sidebar toggle button */}
            <button
              id="header-toggle-sidebar-btn"
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center shrink-0"
              title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>

            <div ref={headerSearchContainerRef} className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search pages, media assets, or collection entries..." 
                  className="w-full pl-10 pr-20 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={searchQuery}
                  onFocus={() => setIsHeaderSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsHeaderSearchDropdownOpen(true);
                    if (smartSearchResults) setSmartSearchResults(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsHeaderSearchDropdownOpen(false);
                    } else if (e.key === 'Enter' && activeView === 'pages' && !isHeaderSearchDropdownOpen) {
                      handleSmartSearch();
                    }
                  }}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSmartSearchResults(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderSearchDropdownOpen(false);
                      setIsGlobalSearchOpen(true);
                    }}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:text-slate-800 shadow-2xs transition-colors"
                    title="Open Global Search Command Palette (Ctrl+K / Cmd+K)"
                  >
                    ⌘K
                  </button>
                </div>

                {/* Instant Global Search Results Popover */}
                {isHeaderSearchDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Popover Category Filter Bar */}
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(
                          [
                            { id: 'all', label: 'All', count: globalSearchResults.length },
                            {
                              id: 'pages',
                              label: 'Pages',
                              count: globalSearchResults.filter(r => r.category === 'pages').length
                            },
                            {
                              id: 'media',
                              label: 'Media',
                              count: globalSearchResults.filter(r => r.category === 'media').length
                            },
                            {
                              id: 'entries',
                              label: 'Entries',
                              count: globalSearchResults.filter(r => r.category === 'entries').length
                            }
                          ] as { id: SearchCategory; label: string; count: number }[]
                        ).map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setHeaderSearchCategory(tab.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                              headerSearchCategory === tab.id
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-200/70'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={
                                headerSearchCategory === tab.id
                                  ? 'text-slate-300'
                                  : 'text-slate-400'
                              }
                            >
                              ({tab.count})
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderSearchDropdownOpen(false);
                          setIsGlobalSearchOpen(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 shrink-0"
                      >
                        Expand ⌘K
                      </button>
                    </div>

                    {/* Popover Results List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {filteredHeaderSearchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-slate-700">
                            No matches for "{searchQuery}"
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            No pages, media assets, or collection entries matched that title or content snippet.
                          </p>
                        </div>
                      ) : (
                        filteredHeaderSearchResults.slice(0, 8).map(result => (
                          <div
                            key={result.id}
                            onClick={() => handleSelectGlobalSearchResult(result, 'primary')}
                            className="px-4 py-3 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-start gap-3 group"
                          >
                            {result.category === 'media' && result.thumbnailUrl ? (
                              <img
                                src={result.thumbnailUrl}
                                alt={result.title}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  result.category === 'pages'
                                    ? 'bg-blue-50 text-blue-600'
                                    : result.category === 'media'
                                    ? 'bg-purple-50 text-purple-600'
                                    : 'bg-cyan-50 text-cyan-600'
                                }`}
                              >
                                {result.category === 'pages' && <FileText size={16} />}
                                {result.category === 'media' && <FolderOpen size={16} />}
                                {result.category === 'entries' && <Layers size={16} />}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700">
                                  <HighlightMatch text={result.title} query={searchQuery} />
                                </span>
                                <span className="text-[10px] text-slate-300">·</span>
                                <span className="text-[11px] font-mono text-slate-500 truncate">
                                  <HighlightMatch text={result.subtitle} query={searchQuery} />
                                </span>
                              </div>
                              {result.snippet && (
                                <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                                  <HighlightMatch text={result.snippet} query={searchQuery} />
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
                                <span className="uppercase tracking-wider font-bold text-slate-500">
                                  {result.category === 'pages'
                                    ? 'Page'
                                    : result.category === 'media'
                                    ? 'Media'
                                    : 'Entry'}
                                </span>
                                <span>·</span>
                                <span>{result.matchLocation}</span>
                              </div>
                            </div>

                            <ChevronRight
                              size={15}
                              className="text-slate-300 group-hover:text-blue-600 self-center shrink-0 transition-colors"
                            />
                          </div>
                        ))
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Showing {Math.min(filteredHeaderSearchResults.length, 8)} of{' '}
                        {filteredHeaderSearchResults.length} matches
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderSearchDropdownOpen(false);
                          setIsGlobalSearchOpen(true);
                        }}
                        className="font-bold text-blue-600 hover:underline"
                      >
                        View all in Global Search →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {activeView === 'pages' && (
                <button 
                  onClick={handleSmartSearch}
                  disabled={isSmartSearching || !searchQuery.trim()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm shrink-0 ${
                    smartSearchResults 
                      ? 'bg-green-600 text-white shadow-green-500/20' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="AI Smart Search with Grounding"
                >
                  {isSmartSearching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className={smartSearchResults ? 'text-white' : 'text-blue-500'} />
                  )}
                  <span>{smartSearchResults ? 'Smart Results' : 'Smart Search'}</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              id="btn-header-tour"
              onClick={startTourGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200/70 transition-all shadow-xs"
              title="Start Interactive Tour Guide"
            >
              <Sparkles size={14} className="text-blue-600" />
              <span className="hidden sm:inline">Tour Guide</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Recent Activity">
              <Clock size={18} />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <div id="tour-profile" className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-all" onClick={() => setActiveView('profile')}>
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

        {/* Active RBAC Simulation Banner */}
        {simulatedUser && (
          <div className="bg-amber-500 text-slate-950 px-6 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm z-10">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <Shield size={16} className="shrink-0" />
              <span>
                RBAC Role Preview Active: Viewing CMS as{' '}
                <strong className="underline">{simulatedUser.name}</strong> ({simulatedUser.role})
              </span>
              <span className="hidden md:inline text-amber-950/80">
                · Media Library: {activePermissions.media.level.toUpperCase()} · Collections:{' '}
                {activePermissions.collections.level.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('users')}
                className="px-3 py-1 bg-slate-900/15 hover:bg-slate-900/25 rounded-lg text-[11px] font-bold transition-colors"
              >
                Edit Permissions
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedUser(null);
                  toast.success('Restored Administrator permissions');
                }}
                className="px-3 py-1 bg-slate-950 text-white hover:bg-slate-800 rounded-lg text-[11px] font-bold transition-colors"
              >
                Exit Role Preview
              </button>
            </div>
          </div>
        )}

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
                  <span>Import Page</span>
                </button>
                <button 
                  onClick={downloadFullSite}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Download size={18} />
                  <span>Export Site</span>
                </button>
                <button 
                  id="tour-create-page"
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
              <div className="flex items-center gap-3 mb-2">
                {confirmModal.icon || <Trash2 size={24} className="text-red-600" />}
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
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${confirmModal.confirmColor || 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
              >
                {confirmModal.confirmLabel || 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Add New User</h3>
                <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="john@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Role</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option>Administrator</option>
                    <option>Editor</option>
                    <option>Viewer</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddUser}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 mt-4"
                >
                  Create User Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Site Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Connect to Search Console</h3>
                <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="text-blue-600" size={32} />
                </div>
                <p className="text-slate-500 text-sm">
                  Click the button below to authorize DevInquire CMS to access your Google Search Console data for <strong>https://devinquire.com</strong>.
                </p>
                <button 
                  onClick={handleConnectSite}
                  disabled={isConnecting}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {isConnecting ? <Loader2 className="animate-spin" size={20} /> : 'Authorize Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        initialQuery={searchQuery}
        pages={pages}
        media={media}
        collections={collections}
        entries={entries}
        onSelectResult={handleSelectGlobalSearchResult}
      />
    </div>
  );
};

/* --- UI Subcomponents --- */

const NavItem: React.FC<{ 
  id?: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick: () => void;
  collapsed?: boolean;
  accessLevel?: AccessLevel;
}> = ({ id, icon, label, active, onClick, collapsed, accessLevel }) => (
  <button 
    id={id}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center ${
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'
    } rounded-xl text-sm font-semibold transition-all relative group ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
        : accessLevel === 'none'
        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
    }`}
  >
    <div className="shrink-0 flex items-center justify-center">{icon}</div>
    {!collapsed && <span className="truncate">{label}</span>}
    {!collapsed && accessLevel === 'none' && (
      <Lock size={13} className="ml-auto text-amber-400/80 shrink-0" />
    )}
    {!collapsed && accessLevel === 'view' && !active && (
      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
        View
      </span>
    )}
    {!collapsed && active && accessLevel !== 'none' && (
      <ChevronRight size={14} className="ml-auto opacity-50 shrink-0" />
    )}

    {/* Floating Tooltip in Collapsed Mode */}
    {collapsed && (
      <div className="fixed left-[74px] px-2.5 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 -translate-x-1 transition-all duration-150 z-50 whitespace-nowrap flex items-center gap-2">
        <span>{label}</span>
        {accessLevel === 'none' && <Lock size={11} className="text-amber-400" />}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
      </div>
    )}
  </button>
);

const ApiEndpoint: React.FC<{ method: string; path: string; description: string }> = ({ method, path, description }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-6 group hover:border-blue-200 hover:shadow-sm transition-all">
    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
      method === 'GET' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
    }`}>
      {method}
    </div>
    <div className="flex-1">
      <code className="text-sm font-bold text-slate-800">{path}</code>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
    <button 
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}${path}`);
        alert('Endpoint URL copied!');
      }}
      className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
      title="Copy Endpoint"
    >
      <LinkIcon size={16} />
    </button>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; trend: string; icon: React.ReactNode }> = ({ label, value, trend, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1 group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-50 rounded-xl group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm transition-all">{icon}</div>
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

const DnsRecordRow: React.FC<{ type: string; host: string; value: string }> = ({ type, host, value }) => (
  <div className="grid grid-cols-12 gap-4 p-4 bg-white border border-slate-200 rounded-2xl items-center group">
    <div className="col-span-2">
      <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-600">{type}</span>
    </div>
    <div className="col-span-3">
      <span className="font-mono text-xs text-slate-900">{host}</span>
    </div>
    <div className="col-span-5 relative">
       <span className="font-mono text-xs text-slate-500 truncate block">{value}</span>
       <button 
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${type} value copied!`);
        }}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all bg-white"
       >
          <Copy size={14} />
       </button>
    </div>
    <div className="col-span-2 text-right">
       <span className="text-[10px] font-bold text-slate-400">3600</span>
    </div>
  </div>
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
