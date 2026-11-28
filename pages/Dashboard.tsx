
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Joyride, Step, STATUS } from 'react-joyride';
import { useCMS } from '../App';
import { 
  Plus, Search, Edit3, Trash2, Globe, FileText, 
  Copy, Eye, Upload, Download, Layout, LayoutDashboard, Settings, BarChart3, 
  FolderOpen, Clock, Filter, Palette, Type,
  ChevronRight, ExternalLink, Activity, Repeat, X,
  ChevronUp, ChevronDown, TrendingUp, Users, Zap, LogOut, Lock, Sparkles, Loader2,
  Database, Code, Terminal, Link as LinkIcon, Layers, List,
  PanelLeftClose, PanelLeftOpen, ChevronsLeft, ChevronsRight, Menu, HelpCircle, Shield, FolderTree, Monitor, History
} from 'lucide-react';
import { Page, Template, LayoutJSON, Section, MediaItem, URLRewrite, Collection, CollectionEntry, CollectionField, UserManagementItem, AccessLevel, getPermissionsForRole } from '../types';
import { SAMPLE_TEMPLATES } from '../sampleData';
import { generatePageIdea, generateCollectionSchema, smartSearchPages } from '../services/geminiService';
import { toast } from 'sonner';

type DashboardView = 'dashboard' | 'activity' | 'pages' | 'experience' | 'templates' | 'media' | 'settings' | 'seo' | 'global-styles' | 'profile' | 'page-settings' | 'rewrites' | 'users' | 'headless-api' | 'collections';

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
import { ExperienceManager } from '../components/ExperienceManager';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { CsvPageAutomation } from '../components/CsvPageAutomation';
import { AppleThemeSwitcher } from '../components/AppleThemeSwitcher';

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
    activityLogs, clearActivityLogs,
    logoutDemoUser,
    theme
  } = useCMS();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>('dashboard');
  const [renameModalPage, setRenameModalPage] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('ALL');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [versionHistoryPageId, setVersionHistoryPageId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const isAdminAccess = simulatedUser
    ? simulatedUser.role === 'Administrator'
    : (matchedDirectoryUser?.role || user?.role) === 'Administrator' || activePermissions.settings === 'manage';

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
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'site' | 'hosting' | 'styles' | 'pages' | 'automation'>('site');
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
  const [experiencePageId, setExperiencePageId] = useState<string | null>(null);
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

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  };

  const [cookieConsentAccepted, setCookieConsentAccepted] = useState<boolean>(() => {
    return getCookie('devinquire_cms_cookie_consent') === '1';
  });

  const handleAcceptCookies = () => {
    setCookie('devinquire_cms_cookie_consent', '1', 365);
    setCookieConsentAccepted(true);
    toast.success('Preferences saved.');
  };

  const [runTour, setRunTour] = useState(false);

  const startTourGuide = () => {
    setActiveView('dashboard');
    setIsSidebarCollapsed(false);
    setRunTour(false);
    setTimeout(() => {
      setRunTour(true);
    }, 150);
  };

  // Launch startup navigation tour ONLY for newly created accounts (marked on signup)
  useEffect(() => {
    const rawKey = user?.email || user?.name || 'default_user';
    const safeUserKey = rawKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const cookieKey = `devinquire_cms_tour_seen_${safeUserKey}`;
    const hasSeenTourCookie =
      getCookie('devinquire_cms_tour_seen') === '1' ||
      getCookie(cookieKey) === '1';
    const hasSeenUserTour =
      localStorage.getItem(`hasSeenOnboardingTour_${rawKey}`) === 'true' ||
      localStorage.getItem('hasSeenOnboardingTour') === 'true';
    const isNewAccount =
      getCookie('devinquire_cms_new_account') === '1' ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('devinquire_cms_new_account') === '1');

    if (isNewAccount && !hasSeenTourCookie && !hasSeenUserTour) {
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
    const { status, action } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any) || action === 'close') {
      setRunTour(false);
      const rawKey = user?.email || user?.name || 'default_user';
      const safeUserKey = rawKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      setCookie('devinquire_cms_tour_seen', '1', 365);
      setCookie(`devinquire_cms_tour_seen_${safeUserKey}`, '1', 365);
      if (typeof document !== 'undefined') {
        document.cookie = 'devinquire_cms_new_account=; max-age=0; path=/; SameSite=Lax';
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('devinquire_cms_new_account');
      }
      localStorage.setItem(`hasSeenOnboardingTour_${rawKey}`, 'true');
      localStorage.setItem('hasSeenOnboardingTour', 'true');
      if (status === STATUS.FINISHED) {
        toast.success('Tour completed! You can replay it anytime from Quick Actions.');
      }
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
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'entries' ? 'bg-white text-[#4e45e1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Database size={14} />
                Entries
              </button>
              <button 
                onClick={() => setActiveCollectionTab('schema')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'schema' ? 'bg-white text-[#4e45e1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Settings size={14} />
                Schema
                {!canEditSchema && <Lock size={12} className="text-slate-400" />}
              </button>
              <button 
                onClick={() => setActiveCollectionTab('api')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeCollectionTab === 'api' ? 'bg-white text-[#4e45e1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                      ? 'bg-[#4e45e1] text-white hover:bg-[#4139BF] shadow-lg shadow-blue-500/10'
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
                                <button onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setIsEditingEntry(true); }} className="p-2 text-slate-400 hover:text-[#4e45e1] rounded-lg hover:bg-[#4e45e1]/10 transition-all"><Edit3 size={16} /></button>
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
                      className="text-xs font-bold text-[#4e45e1] hover:text-[#4139BF] flex items-center gap-1"
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
                                className="w-4 h-4 rounded border-slate-300 text-[#4e45e1]"
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
                    className="px-8 py-3 bg-[#4e45e1] text-white rounded-xl font-bold hover:bg-[#4139BF] transition-all shadow-xl shadow-blue-500/20"
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
                       <div className="flex items-center gap-3 text-[#6B63F2]">
                          <Code size={24} />
                          <span className="text-xs font-black uppercase tracking-widest">Headless API v1</span>
                       </div>
                       <h3 className="text-2xl font-black text-white">Project Connection Details</h3>
                       <p className="text-sm text-slate-400 max-w-xl">Every collection you create is instantly available via our Headless API. Access your data from any platform using these standardized endpoints.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Primary Endpoint</label>
                        <div className="flex bg-black/40 border border-slate-700 rounded-2xl overflow-hidden group hover:border-[#4e45e1]/50 transition-all">
                           <div className="bg-[#4e45e1] text-white px-5 py-4 text-xs font-black flex items-center">GET</div>
                           <div className="flex-1 px-5 py-4 font-mono text-xs text-[#8179FF] truncate">
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
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${selectedEntry.data[field.slug] ? 'bg-[#4e45e1]' : 'bg-slate-200'}`}
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
                      className="px-10 py-2.5 bg-[#4e45e1] text-white rounded-xl font-bold hover:bg-[#4139BF] transition-all shadow-lg shadow-blue-500/20 text-sm"
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
              <Database className="text-[#4e45e1]" size={24} />
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
                  ? 'bg-white border-2 border-slate-100 text-slate-600 hover:border-[#4e45e1] hover:text-[#4e45e1]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {canEditSchema ? (
                <Sparkles size={18} className="text-[#6B63F2] group-hover:scale-110 transition-transform" />
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
                  ? 'bg-[#4e45e1] text-white shadow-lg shadow-blue-500/20 hover:bg-[#4139BF] active:scale-95'
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
                  className="inline-flex items-center gap-2 bg-[#4e45e1] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4139BF] transition-all shadow-xl shadow-blue-500/10"
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
                  <div className="w-14 h-14 bg-[#4e45e1]/10 text-[#4e45e1] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <Layers size={28} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEditSchema && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCollection(collection); setIsEditingCollection(true); setActiveCollectionTab('schema'); }}
                        className="p-2 text-slate-400 hover:text-[#4e45e1] rounded-lg hover:bg-[#4e45e1]/10"
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
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#4139BF] transition-colors">{collection.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-2 leading-relaxed line-clamp-2">{collection.description}</p>
                  <p className="text-[11px] text-slate-500 mb-5">
                    By <span className="font-semibold text-slate-700">{collection.createdBy || 'Team'}</span>
                    {collection.updatedBy && collection.updatedBy !== collection.createdBy ? ` · Updated by ${collection.updatedBy}` : ''}
                  </p>
                </div>
                
                <div className="mt-auto flex items-center gap-4 pt-4 border-t border-slate-50">
                   <div className="flex-1">
                     <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">Entries</span>
                     <span className="text-sm font-black text-slate-700">{entries.filter(e => e.collectionId === collection.id).length}</span>
                   </div>
                   <button 
                    onClick={() => setSelectedCollection(collection)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#4e45e1] transition-all"
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
      toast.error('Image size should be less than 2MB');
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
            toast.success('Full site imported successfully!');
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
            toast.success('Page imported successfully!');
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
          toast.success('HTML file imported as a Custom Site!');
        }
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Failed to import file. Please ensure it is a valid JSON or HTML file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const [newDomainInput, setNewDomainInput] = useState('');
  const [newProviderInput, setNewProviderInput] = useState('Hostinger');
  const [newDomainSiteName, setNewDomainSiteName] = useState('');

  const connectedDomains = siteConfig.domains || [];
  const activeDomain =
    connectedDomains.find((d) => d.id === siteConfig.activeDomainId) ||
    connectedDomains[0] ||
    null;
  const isDomainHostingConnected = Boolean(activeDomain || siteConfig.hostingConnected);

  const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

  const fetchHostingApi = async (path: string, init?: RequestInit) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}${path}`, init);
        if (res.ok || res.status < 500) return res;
      } catch {
        // Fall back to local Node /cms/api/hosting endpoint
      }
    }
    return fetch(`/cms${path}`, init);
  };

  useEffect(() => {
    fetchHostingApi('/api/hosting/status')
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.data) {
          const { domains = [], activeDomainId = '', activeDomain: srvActive } = json.data;
          if (domains.length > 0) {
            setSiteConfig((prev) => ({
              ...prev,
              domains,
              activeDomainId,
              customDomain: srvActive?.domain || prev.customDomain,
              baseUrl: srvActive?.baseUrl || prev.baseUrl,
              hostingProvider: srvActive?.hostingProvider || prev.hostingProvider,
              hostingConnected: true,
              resolvedIps: srvActive?.resolvedIps || [],
              verifiedAt: srvActive?.verifiedAt,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleConnectDomainAndHosting = async (e?: React.FormEvent, customOverride?: { domain?: string; provider?: string; siteName?: string }) => {
    if (e) e.preventDefault();
    const rawInput = (customOverride?.domain || newDomainInput || siteConfig.customDomain || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();

    if (!rawInput || (rawInput !== 'localhost' && !rawInput.startsWith('localhost:') && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(rawInput))) {
      toast.error('Please enter a valid domain name (e.g., devinquire.com or localhost).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchHostingApi('/api/hosting/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: rawInput,
          hostingProvider: customOverride?.provider || newProviderInput || siteConfig.hostingProvider || 'Hostinger',
          siteName: customOverride?.siteName || newDomainSiteName || rawInput,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Could not connect domain and hosting.');
      }

      const { domains = [], activeDomainId = '', activeDomain: srvActive } = json.data || {};
      const nextConfig = {
        ...siteConfig,
        domains,
        activeDomainId,
        customDomain: srvActive?.domain || rawInput,
        baseUrl: srvActive?.baseUrl || `https://${rawInput}`,
        hostingProvider: srvActive?.hostingProvider || newProviderInput,
        hostingConnected: true,
        resolvedIps: srvActive?.resolvedIps || [],
        verifiedAt: srvActive?.verifiedAt,
      };
      setSiteConfig(nextConfig);
      await syncSiteConfig(nextConfig);
      setNewDomainInput('');
      setNewDomainSiteName('');
      toast.success(
        `Connected ${nextConfig.customDomain} (${nextConfig.hostingProvider})! You can now build pages for this domain.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to connect domain & hosting.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDomain = async (domainId: string) => {
    try {
      const res = await fetchHostingApi('/api/hosting/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json.data) {
        const { domains = [], activeDomainId = '', activeDomain: srvActive } = json.data;
        const nextConfig = {
          ...siteConfig,
          domains,
          activeDomainId,
          customDomain: srvActive?.domain || siteConfig.customDomain,
          baseUrl: srvActive?.baseUrl || siteConfig.baseUrl,
          hostingProvider: srvActive?.hostingProvider || siteConfig.hostingProvider,
          hostingConnected: true,
        };
        setSiteConfig(nextConfig);
        await syncSiteConfig(nextConfig);
        toast.success(`Switched active website to ${srvActive?.domain}`);
      }
    } catch {
      toast.error('Failed to switch active domain.');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      const res = await fetchHostingApi('/api/hosting/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json.data) {
        const { domains = [], activeDomainId = '', activeDomain: srvActive } = json.data;
        const nextConfig = {
          ...siteConfig,
          domains,
          activeDomainId,
          customDomain: srvActive?.domain || '',
          baseUrl: srvActive?.baseUrl || 'https://devinquire.com',
          hostingProvider: srvActive?.hostingProvider || 'Hostinger',
          hostingConnected: domains.length > 0,
        };
        setSiteConfig(nextConfig);
        await syncSiteConfig(nextConfig);
        toast.success('Domain removed.');
      }
    } catch {
      toast.error('Failed to remove domain.');
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await syncGlobalStyles(globalStyles);
      if (user) await syncUser(user);
      await syncSiteConfig(siteConfig);
      toast.success('Site settings saved successfully!');
      setConfirmModal({
        show: true,
        title: 'Settings Saved',
        message: 'Your site configuration has been updated successfully.',
        confirmLabel: 'Great',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, show: false }))
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error('Failed to save site settings.');
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
          toast.success('Template imported successfully!');
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
          toast.success('HTML file imported as a Template!');
        }
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Failed to import template. Please ensure it is a valid JSON or HTML file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const createPage = (template?: Template) => {
    if (!isDomainHostingConnected) {
      toast.error('Connect your domain and hosting first to start creating websites.');
      setActiveView('dashboard');
      return;
    }
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
      domainId: activeDomain?.id,
      domain: activeDomain?.domain,
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
      toast.error('Failed to perform smart search. Please try again.');
    } finally {
      setIsSmartSearching(false);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateData.name) {
      toast.error('Please enter a template name');
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

  const domainPages = activeDomain
    ? pages.filter((p) => p.domainId === activeDomain.id)
    : pages;

  const filteredPages = domainPages.filter(p => {
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
    total: domainPages.length,
    published: domainPages.filter(p => p.status === 'published').length,
    drafts: domainPages.filter(p => p.status === 'draft').length,
    views: domainPages.length * 124 
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
      experience: {
        level: activePermissions.pages,
        title: 'Experience Manager & Sitemap',
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
      seo: {
        level: activePermissions.seo,
        title: 'SEO & Search Console',
        cap: 'SEO & Analytics: View or Manage',
      },
    };

    const isContentHubView =
      activeView === 'pages' ||
      activeView === 'templates' ||
      activeView === 'media';

    const currentSectionRule = sectionAccessMap[activeView];
    if (!isContentHubView && currentSectionRule && currentSectionRule.level === 'none') {
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

    if (activeView === 'experience') {
      if (!isDomainHostingConnected) {
        return (
          <div className="apple-card rounded-[26px] p-10 text-center max-w-xl mx-auto my-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/15 text-[#FF9500] flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Connect Domain &amp; Hosting First
            </h3>
            <p className="text-sm text-[#86868B] dark:text-[#98989D]">
              Connect a domain in Site Settings → Domain &amp; Hosting to manage its visual experience and sitemap.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveView('settings');
                setActiveSettingsTab('hosting');
              }}
              className="apple-pill-btn px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Globe size={14} />
              <span>Connect Domain &amp; Hosting</span>
            </button>
          </div>
        );
      }
      return (
        <ExperienceManager
          pages={domainPages}
          rewrites={rewrites}
          globalStyles={globalStyles}
          siteConfig={siteConfig}
          accessLevel={activePermissions.pages}
          initialPageId={experiencePageId}
          onSavePage={async updatedPage => {
            setPages(prev =>
              prev.map(p => (p.id === updatedPage.id ? updatedPage : p))
            );
            await syncPage(updatedPage);
          }}
          onCreatePage={() => createPage()}
          onDeletePage={pageId => deletePage(pageId)}
          onOpenFullEditor={pageId => navigate(`/editor/${pageId}`)}
        />
      );
    }

    if (isContentHubView) {
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
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Per-Tab RBAC Access Check */}
          {currentSectionRule && currentSectionRule.level === 'none' ? (
            <SectionAccessDenied
              sectionTitle={currentSectionRule.title}
              requiredCapability={currentSectionRule.cap}
              activeRoleName={activeRoleLabel}
              isSimulating={Boolean(simulatedUser)}
              onExitSimulation={() => setSimulatedUser(null)}
              onBackToDashboard={() => setActiveView('dashboard')}
            />
            ) : activeView === 'pages' && !isDomainHostingConnected ? (
            <div className="apple-card rounded-[26px] p-10 text-center max-w-xl mx-auto my-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/15 text-[#FF9500] flex items-center justify-center mx-auto">
                <Lock size={22} />
              </div>
              <h3 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Connect Domain &amp; Hosting First
              </h3>
              <p className="text-sm text-[#86868B] dark:text-[#98989D]">
                To start creating website pages, please verify and connect your domain and hosting provider first.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="apple-pill-btn px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Globe size={14} />
                <span>Go to Domain &amp; Hosting Setup</span>
              </button>
            </div>
          ) : activeView === 'pages' ? (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Total Pages" value={stats.total} trend="+2 this week" icon={<FileText className="text-[#4e45e1] dark:text-[#6B63F2]" size={20} />} />
                <StatCard label="Published" value={stats.published} trend="Live" icon={<Globe className="text-[#34C759]" size={20} />} />
                <StatCard label="Drafts" value={stats.drafts} trend="In Progress" icon={<Edit3 className="text-[#FF9500]" size={20} />} />
                <StatCard label="Page Views" value={stats.views.toLocaleString()} trend="+12.5%" icon={<Eye className="text-[#AF52DE]" size={20} />} />
              </div>

              {/* Filters & View Controls */}
              <div className="apple-card rounded-[18px] p-2 flex flex-wrap items-center gap-2">
                <FilterTab active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} label="All Pages" count={stats.total} />
                <FilterTab active={activeFilter === 'published'} onClick={() => setActiveFilter('published')} label="Published" count={stats.published} />
                <FilterTab active={activeFilter === 'draft'} onClick={() => setActiveFilter('draft')} label="Drafts" count={stats.drafts} />
                <div className="ml-auto flex items-center gap-2 px-4">
                  <span className="text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider mr-1">Sort By</span>
                  <select className="text-xs font-semibold bg-transparent outline-none cursor-pointer text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <option>Last Modified</option>
                    <option>A-Z</option>
                    <option>Creation Date</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedPageIds.length > 0 && (
                <div className="bg-[#1D1D1F] dark:bg-[#2C2C2E] text-white rounded-[20px] shadow-xl p-4 flex flex-wrap items-center justify-between gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 border border-white/[0.1]">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#4e45e1] dark:bg-[#6B63F2] flex items-center justify-center text-xs font-bold">
                        {selectedPageIds.length}
                      </div>
                      <span className="text-sm font-semibold text-white">Pages Selected</span>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={handleBulkPublish}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-white/10 transition-all text-xs font-semibold text-[#30D158] cursor-pointer"
                      >
                        <Globe size={14} />
                        Publish
                      </button>
                      <button 
                        onClick={handleBulkUnpublish}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-white/10 transition-all text-xs font-semibold text-[#FF9F0A] cursor-pointer"
                      >
                        <Edit3 size={14} />
                        Unpublish
                      </button>
                      <button 
                        onClick={handleBulkDownload}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-white/10 transition-all text-xs font-semibold text-[#6B63F2] cursor-pointer"
                      >
                        <Download size={14} />
                        Export
                      </button>
                      <button 
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-[#FF453A]/20 transition-all text-xs font-semibold text-[#FF453A] cursor-pointer"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPageIds([])}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-[#98989D] hover:text-white cursor-pointer"
                    title="Clear Selection"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Page List */}
              <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
                {filteredPages.length === 0 ? (
                  <div className="px-6 py-24 text-center">
                    <div className="w-20 h-20 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText size={36} className="text-[#86868B] dark:text-[#98989D]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">No pages found</h3>
                    <p className="text-[#86868B] dark:text-[#98989D] text-sm max-w-xs mx-auto mb-8">
                      {searchQuery ? "We couldn't find anything matching your search." : "Ready to launch your site? Create your first page to get started."}
                    </p>
                    {!searchQuery && (
                      <button 
                        onClick={() => createPage()}
                        className="inline-flex items-center gap-2 bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-7 py-3 rounded-full font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm cursor-pointer"
                      >
                        <Plus size={18} />
                        Start Creating
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F5F5F7]/70 dark:bg-[#1C1C1E]/60 border-b border-black/[0.06] dark:border-white/[0.08]">
                        <tr>
                          <th className="px-6 py-4 w-10">
                            <div className="flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-[#4e45e1] focus:ring-[#4e45e1] cursor-pointer transition-all"
                                checked={selectedPageIds.length === filteredPages.length && filteredPages.length > 0}
                                onChange={() => toggleSelectAll(filteredPages)}
                              />
                            </div>
                          </th>
                          <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Page Details</th>
                          <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Live Path</th>
                          <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {filteredPages.map(page => (
                          <tr 
                            key={page.id} 
                            className={`group hover:bg-[#4e45e1]/[0.04] dark:hover:bg-[#6B63F2]/[0.08] transition-all duration-200 cursor-pointer relative ${selectedPageIds.includes(page.id) ? 'bg-[#4e45e1]/[0.06] dark:bg-[#6B63F2]/[0.12]' : ''}`}
                            onClick={() => navigate(`/editor/${page.id}`)}
                          >
                            <td className="px-6 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-[#4e45e1] focus:ring-[#4e45e1] cursor-pointer transition-all"
                                  checked={selectedPageIds.includes(page.id)}
                                  onChange={() => toggleSelectPage(page.id)}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 ${
                                  page.isCustomSite ? 'bg-[#AF52DE]/12 text-[#AF52DE]' :
                                  page.status === 'published' ? 'bg-[#34C759]/12 text-[#34C759]' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B] dark:text-[#98989D] group-hover:bg-[#4e45e1]/12 group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2]'
                                }`}>
                                  {page.isCustomSite ? <Globe size={19} /> : <FileText size={19} />}
                                </div>
                                <div>
                                  <span className="block font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] transition-colors">{page.title}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-[#86868B] dark:text-[#98989D] font-medium">
                                      By {page.author}{page.updatedBy && page.updatedBy !== page.author ? ` · Updated by ${page.updatedBy}` : ''} • {page.isCustomSite ? 'Custom Code' : `${page.layoutJSON.sections.length} Sections`} • {page.versions?.length || 1} {(page.versions?.length || 1) === 1 ? 'Version' : 'Versions'}
                                    </span>
                                    {globalActivity[page.id]?.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                                        <span className="text-[10px] text-[#34C759] font-semibold uppercase tracking-wider">
                                          {globalActivity[page.id].length} Editing Now
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <code className="text-xs font-mono bg-[#F5F5F7] dark:bg-[#1C1C1E] px-2.5 py-1 rounded-lg text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.05] dark:border-white/[0.06]">/{page.slug}</code>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                                page.status === 'published' ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' : 'bg-[#FF9500]/12 text-[#C93400] dark:text-[#FF9F0A]'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${page.status === 'published' ? 'bg-[#34C759]' : 'bg-[#FF9500]'}`} />
                                {page.status}
                              </span>
                            </td>
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <ActionButton
                                  onClick={() => setVersionHistoryPageId(page.id)}
                                  icon={<History size={16} />}
                                  label="Version History"
                                  color="blue"
                                />
                                <ActionButton
                                  onClick={() => {
                                    setExperiencePageId(page.id);
                                    setActiveView('experience');
                                  }}
                                  icon={<FolderTree size={16} />}
                                  label="Experience & Sitemap"
                                  color="blue"
                                />
                                <ActionButton
                                  onClick={() =>
                                    setRenameModalPage({
                                      id: page.id,
                                      title: page.title,
                                      slug: page.slug,
                                    })
                                  }
                                  icon={<Type size={16} />}
                                  label="Rename"
                                  color="blue"
                                />
                                <ActionButton onClick={() => navigate(`/editor/${page.id}`)} icon={<Edit3 size={16} />} label="Edit" color="blue" />
                                <ActionButton onClick={() => window.open(`/cms/p/${page.slug}`, '_blank')} icon={<Eye size={16} />} label="View" color="blue" />
                                <ActionButton onClick={() => duplicatePage(page)} icon={<Copy size={16} />} label="Copy" color="slate" />
                                <ActionButton onClick={() => downloadPage(page)} icon={<Download size={16} />} label="Download" color="slate" />
                                <ActionButton onClick={() => deletePage(page.id)} icon={<Trash2 size={16} />} label="Delete" color="red" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rename Page Modal */}
              {renameModalPage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                  <div className="bg-white dark:bg-[#2C2C2E] rounded-[28px] shadow-2xl border border-black/[0.08] dark:border-white/[0.1] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                      <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Rename Page</h3>
                      <button onClick={() => setRenameModalPage(null)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer">
                        <X size={20} />
                      </button>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const target = pages.find((p) => p.id === renameModalPage.id);
                        if (!target) return;
                        const cleanTitle = renameModalPage.title.trim() || target.title;
                        const cleanSlug =
                          renameModalPage.slug
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9-]+/g, '-')
                            .replace(/^-|-$/g, '') || target.slug;
                        const updated: Page = {
                          ...target,
                          title: cleanTitle,
                          slug: cleanSlug,
                          updatedAt: new Date().toISOString(),
                        };
                        await syncPage(updated);
                        toast.success(`Renamed to "${cleanTitle}"`);
                        setRenameModalPage(null);
                      }}
                      className="p-6 space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Page Title</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={renameModalPage.title}
                          onChange={(e) => {
                            const nextTitle = e.target.value;
                            setRenameModalPage((prev) => {
                              if (!prev) return null;
                              const isAuto =
                                prev.slug.startsWith('new-page-') ||
                                prev.slug === prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                              const nextSlug = isAuto
                                ? nextTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || prev.slug
                                : prev.slug;
                              return { ...prev, title: nextTitle, slug: nextSlug };
                            });
                          }}
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:ring-2 focus:ring-[#4e45e1] outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">URL Slug</label>
                        <div className="flex items-center bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-3">
                          <span className="text-xs font-mono text-[#86868B] mr-1">/</span>
                          <input
                            type="text"
                            required
                            value={renameModalPage.slug}
                            onChange={(e) =>
                              setRenameModalPage((prev) =>
                                prev
                                  ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }
                                  : null
                              )
                            }
                            className="w-full bg-transparent text-sm font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setRenameModalPage(null)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] hover:opacity-80 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#4e45e1] dark:bg-[#6B63F2] text-white hover:opacity-90 transition cursor-pointer"
                        >
                          Save Name
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : activeView === 'templates' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="apple-card rounded-[24px] overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-0.5">
                    <div className="aspect-video bg-[#F5F5F7] dark:bg-[#1C1C1E] flex items-center justify-center relative overflow-hidden">
                      <Layout size={44} className="text-[#86868B]/50 dark:text-[#98989D]/50 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-[#4e45e1]/0 group-hover:bg-[#4e45e1]/[0.05] transition-colors" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] uppercase tracking-wider">{template.type}</span>
                        <span className="text-[11px] text-[#86868B] dark:text-[#98989D] font-medium">By {template.createdBy}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4">{template.name}</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => createPage(template)}
                          className="flex-1 bg-[#F5F5F7] dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] py-2.5 rounded-xl text-xs font-semibold hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-all cursor-pointer"
                        >
                          Use Template
                        </button>
                        <button 
                          onClick={() => navigate(`/editor/${template.id}`)}
                          className="flex-1 bg-[#4e45e1] dark:bg-[#6B63F2] text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteTemplate(template.id)}
                          className="p-2.5 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setShowCreateTemplateModal(true)}
                  className="border-2 border-dashed border-black/[0.12] dark:border-white/[0.14] rounded-[24px] flex flex-col items-center justify-center gap-4 p-8 hover:bg-white/60 dark:hover:bg-[#2C2C2E]/60 hover:border-[#4e45e1] dark:hover:border-[#6B63F2] transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-xs flex items-center justify-center text-[#86868B] group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] transition-all">
                    <Plus size={24} />
                  </div>
                  <div className="text-center">
                    <span className="block font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Create New Template</span>
                    <span className="text-xs text-[#86868B] dark:text-[#98989D]">Save your custom designs</span>
                  </div>
                </button>
              </div>

              {/* Create Template Modal */}
              {showCreateTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                  <div className="bg-white dark:bg-[#2C2C2E] rounded-[28px] shadow-2xl border border-black/[0.08] dark:border-white/[0.1] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                      <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Create New Template</h3>
                      <button onClick={() => setShowCreateTemplateModal(false)} className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Template Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-[#4e45e1] outline-none transition-all"
                          placeholder="e.g. My Custom Section"
                          value={newTemplateData.name}
                          onChange={(e) => setNewTemplateData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">Template Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setNewTemplateData(prev => ({ ...prev, type: 'section' }))}
                            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all cursor-pointer ${newTemplateData.type === 'section' ? 'border-[#4e45e1] bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]' : 'border-black/[0.08] dark:border-white/[0.1] text-[#86868B] hover:border-black/20'}`}
                          >
                            Section
                          </button>
                          <button 
                            onClick={() => setNewTemplateData(prev => ({ ...prev, type: 'page' }))}
                            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all cursor-pointer ${newTemplateData.type === 'page' ? 'border-[#4e45e1] bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]' : 'border-black/[0.08] dark:border-white/[0.1] text-[#86868B] hover:border-black/20'}`}
                          >
                            Full Page
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={handleCreateTemplate}
                        className="w-full bg-[#4e45e1] dark:bg-[#6B63F2] text-white py-3.5 rounded-xl font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-md shadow-[#4e45e1]/20 cursor-pointer"
                      >
                        Create Template
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Media Library Access</span>
                  <AccessLevelPill level={activePermissions.media.level} />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">RBAC Policy:</span>
                  <span className={`px-2.5 py-0.5 rounded-md ${canUploadMedia ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'}`}>
                    Upload: {canUploadMedia ? 'Allowed' : 'Restricted'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md ${canDeleteMedia ? 'bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF453A]' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'}`}>
                    Delete: {canDeleteMedia ? 'Allowed' : 'Restricted'}
                  </span>
                </div>
              </div>

              {filteredMedia.length === 0 ? (
                <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border-2 border-dashed border-black/[0.1] dark:border-white/[0.12] p-12 text-center">
                  <div className="w-16 h-16 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen size={30} className="text-[#86868B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">No media found</h3>
                  <p className="text-sm text-[#86868B] dark:text-[#98989D] mb-6">Upload your first image to get started</p>
                  {canUploadMedia && (
                    <button 
                      onClick={() => mediaInputRef.current?.click()}
                      className="text-[#4e45e1] dark:text-[#6B63F2] font-semibold text-sm hover:underline cursor-pointer"
                    >
                      Click here to upload
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                  {filteredMedia.map(item => (
                    <div
                      id={`media-card-${item.id}`}
                      key={item.id}
                      className={`group relative bg-white dark:bg-[#2C2C2E] rounded-[20px] border overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5 ${
                        highlightedMediaId === item.id
                          ? 'border-[#4e45e1] ring-4 ring-[#4e45e1]/25 shadow-xl'
                          : 'border-black/[0.06] dark:border-white/[0.08]'
                      }`}
                    >
                      <div className="aspect-square bg-[#F5F5F7] dark:bg-[#1C1C1E] flex items-center justify-center relative overflow-hidden">
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(item.url);
                              toast.success('Media URL copied to clipboard!');
                            }}
                            className="p-2.5 bg-white/95 rounded-xl text-[#1D1D1F] hover:text-[#4e45e1] transition-all cursor-pointer"
                            title="Copy URL"
                          >
                            <Copy size={15} />
                          </button>
                          {canDeleteMedia && (
                            <button 
                              onClick={() => deleteMedia(item.id)}
                              className="p-2.5 bg-white/95 rounded-xl text-[#1D1D1F] hover:text-[#FF3B30] transition-all cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3.5 border-t border-black/[0.05] dark:border-white/[0.06]">
                        <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate" title={item.name}>{item.name}</p>
                        <p className="text-[10px] text-[#86868B] dark:text-[#98989D] mt-0.5 truncate">
                          Uploaded by <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{item.uploadedBy || 'Team'}</span> · {(Number(item.size || 0) / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Premium DevInquire Studio Hero */}
            <section className="apple-card rounded-[28px] p-7 sm:p-9 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#4e45e1]/[0.10] dark:bg-[#6B63F2]/[0.18] blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-6">
                {!isDomainHostingConnected ? (
                  <form onSubmit={handleConnectDomainAndHosting} className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#4e45e1] dark:text-[#6B63F2] font-semibold">
                          <span className="w-2 h-2 rounded-full bg-[#FF9500]" />
                          Step 1 · Connect Domain &amp; Hosting Required
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-2 tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                          Connect Domain &amp; Hosting to Start
                        </h1>
                        <p className="text-[#86868B] dark:text-[#98989D] text-sm sm:text-base max-w-2xl leading-relaxed">
                          Link your domain and hosting provider first. Once connected, website creation, templates, and Experience Manager unlock automatically.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startTourGuide}
                        className="apple-secondary-btn h-10 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 self-start cursor-pointer"
                      >
                        <HelpCircle size={14} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                        <span>Startup Guide</span>
                      </button>
                    </div>

                    <div className="apple-subcard rounded-[22px] p-5 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Domain Name</label>
                        <input
                          type="text"
                          placeholder="e.g., devinquire.com"
                          value={siteConfig.customDomain || ''}
                          onChange={(e) => setSiteConfig(prev => ({ ...prev, customDomain: e.target.value.toLowerCase() }))}
                          className="w-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/40"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Hosting Provider</label>
                        <select
                          value={siteConfig.hostingProvider || 'Hostinger'}
                          onChange={(e) => setSiteConfig(prev => ({ ...prev, hostingProvider: e.target.value }))}
                          className="w-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/40"
                        >
                          <option value="Hostinger">Hostinger</option>
                          <option value="WordPress">WordPress (Existing / Managed)</option>
                          <option value="Web Application">Web Application (React / Next.js / SPA)</option>
                          <option value="Vercel">Vercel</option>
                          <option value="Netlify">Netlify</option>
                          <option value="Cloudflare Pages">Cloudflare Pages</option>
                          <option value="cPanel / Shared Hosting">cPanel / Shared Hosting</option>
                          <option value="AWS / GCP / OCI">AWS / Google Cloud / OCI</option>
                          <option value="Custom Node.js / VPS">Custom Node.js / VPS</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="w-full apple-pill-btn h-[42px] px-5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                          <span>Verify &amp; Connect</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#86868B]">
                      <Lock size={13} className="text-[#FF9500]" />
                      <span>Website creation (Pages, Templates &amp; Experience Manager) is locked until domain &amp; hosting are connected.</span>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#4e45e1] dark:text-[#6B63F2] font-semibold">
                          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                          Connected: {siteConfig.customDomain || siteConfig.baseUrl.replace(/^https?:\/\//, '')} · {siteConfig.hostingProvider || 'Hostinger'}
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-2 tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                          Ready to craft something extraordinary, {user.name.split(' ')[0]}?
                        </h1>
                        <p className="text-[#86868B] dark:text-[#98989D] text-sm sm:text-base max-w-2xl leading-relaxed">
                          Your domain &amp; hosting are connected. Create visual pages, organize your site hierarchy, and publish effortlessly.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 self-start flex-wrap">
                        <button
                          type="button"
                          onClick={startTourGuide}
                          className="apple-secondary-btn h-10 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <HelpCircle size={14} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                          <span>Startup Guide</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => createPage()}
                          className="apple-pill-btn h-10 px-5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>New Page</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        id="tour-create-page"
                        onClick={() => createPage()}
                        className="apple-subcard p-6 rounded-[22px] hover:-translate-y-0.5 hover:border-[#4e45e1]/45 transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm shadow-[#4e45e1]/25">
                          <Zap size={22} />
                        </div>
                        <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">Instant Page</h3>
                        <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed mb-3">Launch a blank canvas or start from a curated layout.</p>
                        <span className="text-[11px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] inline-flex items-center gap-1">
                          Create Page <ChevronRight size={13} />
                        </span>
                      </div>

                      <div 
                        onClick={() => setActiveView('templates')}
                        className="apple-subcard p-6 rounded-[22px] hover:-translate-y-0.5 hover:border-[#4e45e1]/45 transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm shadow-[#4e45e1]/25">
                          <Layout size={22} />
                        </div>
                        <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">Browse Templates</h3>
                        <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed mb-3">Explore reusable sections and page blueprints.</p>
                        <span className="text-[11px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] inline-flex items-center gap-1">
                          Open Templates <ChevronRight size={13} />
                        </span>
                      </div>

                      <div 
                        onClick={() => setActiveView('experience')}
                        className="apple-subcard p-6 rounded-[22px] hover:-translate-y-0.5 hover:border-[#4e45e1]/45 transition-all cursor-pointer group"
                      >
                        <div className="w-11 h-11 bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm shadow-[#4e45e1]/25">
                          <FolderTree size={22} />
                        </div>
                        <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">Experience Manager</h3>
                        <p className="text-xs text-[#86868B] dark:text-[#98989D] leading-relaxed mb-3">Manage your sitemap hierarchy and live page preview.</p>
                        <span className="text-[11px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] inline-flex items-center gap-1">
                          Open Experience <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Live Pages" value={stats.published} trend="+12%" icon={<Globe className="text-[#4e45e1] dark:text-[#6B63F2]" size={20} />} />
              <StatCard label="Monthly Visitors" value="4,290" trend="+5.4%" icon={<Users className="text-[#5856D6]" size={20} />} />
              <StatCard label="Media Assets" value={media.length} trend="Active" icon={<Eye className="text-[#AF52DE]" size={20} />} />
              <StatCard label="API Requests" value="1.2k" trend="Stable" icon={<Activity className="text-[#34C759]" size={20} />} />
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#2C2C2E] rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-black/[0.08] dark:border-white/[0.1]">
              <div className="p-8 sm:p-10 space-y-6">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                       <div className="flex items-center gap-2 text-[#4e45e1] dark:text-[#6B63F2]">
                          <Sparkles size={20} />
                          <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em]">AI Content Architect</span>
                       </div>
                       <h3 className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">What are we building?</h3>
                       <p className="text-sm text-[#86868B] dark:text-[#98989D] leading-relaxed">Describe the data you want to manage, and we'll architect the collection schema for you.</p>
                    </div>
                    <button onClick={() => setShowAIArchitectModal(false)} className="p-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-full text-[#86868B] transition-all cursor-pointer"><X size={20} /></button>
                 </div>

                 <div className="space-y-4">
                    <div className="relative group">
                       <textarea 
                          rows={4}
                          placeholder="e.g., A blog with title, featured image, content, and categories..."
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-5 text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-[#4e45e1] transition-all outline-none resize-none text-sm leading-relaxed"
                          value={collectionPrompt}
                          onChange={(e) => setCollectionPrompt(e.target.value)}
                       />
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                       <button 
                          onClick={() => setCollectionPrompt("A restaurant menu with dish name, price, ingredients, and dietary tags.")}
                          className="px-3.5 py-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#4e45e1] transition-all cursor-pointer"
                       >
                          Restaurant Menu
                       </button>
                       <button 
                          onClick={() => setCollectionPrompt("An e-commerce product catalog with name, price, stock level, and gallery.")}
                          className="px-3.5 py-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-[#4e45e1] transition-all cursor-pointer"
                       >
                          Product Catalog
                       </button>
                    </div>
                 </div>

                 <button 
                    disabled={!collectionPrompt || isArchitecting}
                    onClick={handleGenerateCollectionAI}
                    className="w-full bg-[#4e45e1] dark:bg-[#6B63F2] text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2.5 hover:bg-[#4139BF] dark:hover:bg-[#5850EB] disabled:opacity-50 transition-all shadow-lg shadow-[#4e45e1]/20 active:scale-[0.99] cursor-pointer"
                 >
                    {isArchitecting ? (
                       <>
                          <Loader2 size={20} className="animate-spin" />
                          Architecting Schema...
                       </>
                    ) : (
                       <>
                          <Zap size={20} />
                          Build Collection Schema
                       </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}

            <div className={`grid grid-cols-1 ${isAdminAccess ? 'lg:grid-cols-2' : ''} gap-6`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Recent Pages</h2>
                  <button onClick={() => setActiveView('pages')} className="text-xs font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline cursor-pointer">See All</button>
                </div>
                <div className="apple-card rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {pages.slice(0, 4).map(page => (
                      <div 
                        key={page.id} 
                        onClick={() => navigate(`/editor/${page.id}`)}
                        className="p-4 flex items-center justify-between hover:bg-[#F5F5F7]/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-xl flex items-center justify-center text-[#86868B] dark:text-[#98989D] group-hover:bg-[#4e45e1]/12 group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] transition-colors">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] transition-colors">{page.title}</h4>
                            <p className="text-[11px] text-[#86868B] dark:text-[#98989D]">
                              <span className="font-mono">/{page.slug}</span> · By <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{page.author || 'Admin'}</span>
                              {page.updatedBy && page.updatedBy !== page.author ? ` · Updated by ${page.updatedBy}` : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-[#86868B] group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                    {pages.length === 0 && (
                      <div className="p-12 text-center">
                        <p className="text-[#86868B] text-sm">No pages created yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Activity Tracker (Admin Only) */}
              {isAdminAccess && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Activity Tracker</h2>
                    {Object.values(globalActivity).flat().length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                        {Object.values(globalActivity).flat().length} Live
                      </span>
                    )}
                  </div>
                  <button onClick={() => setActiveView('activity')} className="text-xs font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline cursor-pointer">View All</button>
                </div>
                <div className="apple-card rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {activityLogs.slice(0, 5).map(act => (
                      <div key={act.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#F5F5F7]/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#4e45e1]/12 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                            {(act.userName || 'U').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug">
                              <span className="font-semibold">{act.userName}</span>{' '}
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                act.action === 'deleted' ? 'bg-[#FF3B30]/12 text-[#FF3B30]' :
                                act.action === 'published' ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' :
                                act.action === 'created' || act.action === 'uploaded' ? 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]' :
                                'bg-[#FF9500]/12 text-[#FF9500]'
                              }`}>
                                {act.action}
                              </span>{' '}
                              <span className="text-[#86868B] dark:text-[#98989D]">{act.category}</span>{' '}
                              <span className="font-semibold truncate">{act.targetName}</span>
                            </p>
                            <p className="text-[10px] text-[#86868B] dark:text-[#98989D] mt-0.5">
                              {new Date(act.timestamp).toLocaleString()}{act.details ? ` · ${act.details}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {activityLogs.length === 0 && (
                      <div className="p-10 text-center space-y-1">
                        <Activity size={22} className="mx-auto text-[#86868B]/60 mb-2" />
                        <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">No activity recorded yet</p>
                        <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                          Create or edit a page, media, template, or collection to track who updated what.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Studio Tools</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setActiveView('experience')}
                  className="flex items-center justify-between p-6 bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#4e45e1]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 rounded-2xl text-[#4e45e1] dark:text-[#6B63F2]">
                      <FolderTree size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Experience Manager &amp; Sitemap</h3>
                      <p className="text-xs text-[#86868B] dark:text-[#98989D]">Visual inline page canvas &amp; interactive hierarchy</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#86868B] group-hover:text-[#4e45e1] group-hover:translate-x-0.5 transition-all" />
                </div>

                <div 
                  onClick={() => setActiveView('headless-api')}
                  className="flex items-center justify-between p-6 bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#4e45e1]/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl text-[#1D1D1F] dark:text-[#F5F5F7]">
                      <Terminal size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Headless Content API</h3>
                      <p className="text-xs text-[#86868B] dark:text-[#98989D]">REST endpoints &amp; interactive JSON console</p>
                    </div>
                  </div>
                  <ExternalLink size={18} className="text-[#86868B] group-hover:text-[#4e45e1] transition-colors" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'activity': {
        if (!isAdminAccess) {
          return (
            <SectionAccessDenied
              sectionTitle="Team Activity Tracker"
              requiredCapability="Administrator Access"
              activeRoleName={activeRoleLabel}
              isSimulating={Boolean(simulatedUser)}
              onExitSimulation={() => setSimulatedUser(null)}
              onBackToDashboard={() => setActiveView('dashboard')}
            />
          );
        }

        const filteredActivity = activityLogs.filter((act) => {
          if (activityCategoryFilter !== 'ALL' && act.category !== activityCategoryFilter) return false;
          if (activitySearch.trim()) {
            const q = activitySearch.toLowerCase();
            return (
              act.userName?.toLowerCase().includes(q) ||
              act.targetName?.toLowerCase().includes(q) ||
              act.action?.toLowerCase().includes(q) ||
              act.details?.toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Team Activity Tracker</h2>
                <p className="text-sm text-[#86868B] dark:text-[#98989D]">
                  Real-time audit trail of which user created, updated, published, or deleted items across every section.
                </p>
              </div>
              {activityLogs.length > 0 && (
                <button
                  onClick={() => {
                    clearActivityLogs();
                    toast.success('Activity log cleared');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] hover:text-[#FF3B30] transition cursor-pointer"
                >
                  <Trash2 size={13} />
                  Clear Log
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter by user name, item title, or action..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] text-xs outline-none focus:border-[#4e45e1]"
                />
              </div>
              <select
                value={activityCategoryFilter}
                onChange={(e) => setActivityCategoryFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold outline-none"
              >
                <option value="ALL">All Sections</option>
                <option value="page">Pages</option>
                <option value="collection">Collections</option>
                <option value="entry">Collection Entries</option>
                <option value="media">Media Library</option>
                <option value="template">Templates</option>
                <option value="rewrite">URL Rewrites</option>
                <option value="user">Team &amp; RBAC</option>
                <option value="styles">Global Styles</option>
                <option value="settings">Site Settings</option>
              </select>
            </div>

            <div className="apple-card rounded-[24px] overflow-hidden">
              <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {filteredActivity.map((act) => (
                  <div key={act.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[#F5F5F7]/60 dark:hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#4e45e1]/12 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                        {(act.userName || 'U').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{act.userName}</span>
                          {act.userRole && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-[#86868B] dark:text-[#98989D]">
                              {act.userRole}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            act.action === 'deleted' ? 'bg-[#FF3B30]/12 text-[#FF3B30]' :
                            act.action === 'published' ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' :
                            act.action === 'created' || act.action === 'uploaded' ? 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]' :
                            'bg-[#FF9500]/12 text-[#FF9500]'
                          }`}>
                            {act.action}
                          </span>
                          <span className="text-xs text-[#86868B] dark:text-[#98989D] capitalize">{act.category}</span>
                          <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{act.targetName}</span>
                        </div>
                        {act.details && (
                          <p className="text-[11px] text-[#86868B] dark:text-[#98989D] mt-0.5">{act.details}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-[#86868B] dark:text-[#98989D] font-mono shrink-0">
                      {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
                {filteredActivity.length === 0 && (
                  <div className="p-14 text-center text-sm text-[#86868B]">
                    No matching activity records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'rewrites':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">URL Rewrites & Redirects</h2>
                <p className="text-sm text-[#86868B] dark:text-[#98989D]">Manage how your URLs are handled and redirected.</p>
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
                className="bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-5 py-2.5 rounded-full font-semibold text-xs flex items-center gap-2 shadow-sm shadow-[#4e45e1]/20 hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all cursor-pointer"
              >
                <Plus size={16} />
                Add Rewrite Rule
              </button>
            </div>

            <div className="apple-card rounded-[24px] overflow-hidden shadow-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F5F5F7]/70 dark:bg-[#1C1C1E]/60 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Source URL</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Target URL / Slug</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {rewrites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#86868B] italic text-sm">
                        No rewrite rules defined yet.
                      </td>
                    </tr>
                  ) : (
                    rewrites.map(rewrite => (
                      <tr key={rewrite.id} className="hover:bg-[#F5F5F7]/50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            className="bg-transparent border-b border-transparent hover:border-black/15 dark:hover:border-white/20 focus:border-[#4e45e1] outline-none text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] w-full"
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
                            className="bg-transparent border-b border-transparent hover:border-black/15 dark:hover:border-white/20 focus:border-[#4e45e1] outline-none text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] w-full"
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
                            className="bg-transparent text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] outline-none cursor-pointer"
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
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${rewrite.isActive ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'}`}
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
                            className="p-2 text-[#86868B] hover:text-[#FF3B30] transition-colors cursor-pointer"
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
            <div className="apple-card rounded-[24px] p-8 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2] rounded-2xl">
                    <Terminal size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Headless API Documentation</h2>
                    <p className="text-sm text-[#86868B] dark:text-[#98989D]">Expose your content to any frontend or application via our high-performance REST API.</p>
                  </div>
                </div>
                <Link 
                  to="/headless-demo" 
                  className="px-5 py-2.5 bg-[#4e45e1] dark:bg-[#6B63F2] text-white rounded-full font-semibold text-xs flex items-center gap-2 hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm shadow-[#4e45e1]/20"
                >
                  <Globe size={16} />
                  View Live Demo
                </Link>
              </div>

              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-[#4e45e1] dark:bg-[#6B63F2] rounded-full" />
                    <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Content Endpoints</h3>
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

                <section className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2 mb-4">
                    <Code size={18} className="text-[#86868B]" />
                    <h3 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] uppercase tracking-wider">Example Usage (JavaScript)</h3>
                  </div>
                  <pre className="bg-[#1D1D1F] text-[#F5F5F7] p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`// 1. Fetch Page Layout
const pageRes = await fetch('/api/v1/content/pages/home');
const { data: homePage } = await pageRes.json();

// 2. Fetch Blog Collection Data
const blogRes = await fetch('/api/v1/content/collections/blog/items');
const { data: posts } = await blogRes.json();

console.log('Posts:', posts.map(p => p.title));`}
                  </pre>
                </section>

                <div className="flex items-center gap-4 p-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl">
                  <Activity size={20} className="text-[#FF9500]" />
                  <p className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Site Settings</h2>
                <p className="text-sm text-[#86868B] dark:text-[#98989D]">Configure your global site preferences, styles, page SEO, and UTF-8 CSV page automation.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-black/[0.05] dark:bg-white/[0.08] p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveSettingsTab('site')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSettingsTab === 'site' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'}`}
              >
                Site Config
              </button>
              <button 
                onClick={() => setActiveSettingsTab('hosting')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${activeSettingsTab === 'hosting' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'}`}
              >
                <Globe size={13} />
                <span>Domain &amp; Hosting</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]">
                  {connectedDomains.length}
                </span>
              </button>
              <button 
                onClick={() => setActiveSettingsTab('styles')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSettingsTab === 'styles' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'}`}
              >
                Global Styles
              </button>
              <button 
                onClick={() => setActiveSettingsTab('pages')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSettingsTab === 'pages' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'}`}
              >
                Page SEO
              </button>
              <button 
                id="tab-settings-automation"
                onClick={() => setActiveSettingsTab('automation')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'automation' ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs' : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'}`}
              >
                <Zap size={14} />
                <span>CSV Page Automation</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-semibold ${activeSettingsTab === 'automation' ? 'bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]' : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#86868B]'}`}>
                  UTF-8
                </span>
              </button>
            </div>

            {activePermissions.settings === 'none' ? (
              <SectionAccessDenied
                sectionTitle="Site Settings & Global Styles"
                requiredCapability="Site Settings: View or Manage"
                activeRoleName={activeRoleLabel}
                isSimulating={Boolean(simulatedUser)}
                onExitSimulation={() => setSimulatedUser(null)}
                onBackToDashboard={() => setActiveView('dashboard')}
              />
            ) : (
              <>
                {activeSettingsTab === 'site' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-7 apple-card rounded-[24px] p-8 shadow-xs">
                  <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">General Configuration</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Site Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all" 
                        value={siteConfig.siteName}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, siteName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Base URL</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all" 
                        value={siteConfig.baseUrl}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      />
                    </div>
                    <button 
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="w-full apple-pill-btn py-3.5 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 apple-card rounded-[24px] p-8 flex flex-col justify-between space-y-6 shadow-xs">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2] flex items-center justify-center">
                      <Zap size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">UTF-8 CSV Page Automation</h3>
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]">
                        Bulk Builder
                      </span>
                    </div>
                    <p className="text-sm text-[#86868B] dark:text-[#98989D] leading-relaxed">
                      Automate page creation from a UTF-8 CSV file. Define page hierarchy, assemble component sections (Hero, Features, Pricing, FAQ, Forms, Sitemap), and auto-link pages together in one click.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab('automation')}
                    className="w-full py-3.5 px-4 rounded-full bg-[#4e45e1] dark:bg-[#6B63F2] hover:bg-[#4139BF] dark:hover:bg-[#5850EB] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#4e45e1]/20 cursor-pointer"
                  >
                    <Zap size={15} />
                    <span>Open CSV Page Automation</span>
                  </button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'styles' && (
              <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="apple-card rounded-[24px] p-8 space-y-6 shadow-xs">
                    <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
                      <Palette size={20} className="text-[#4e45e1] dark:text-[#6B63F2]" />
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

                  <div className="apple-card rounded-[24px] p-8 space-y-6 shadow-xs">
                    <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
                      <Type size={20} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                      Typography
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Primary Font (Headings)</label>
                        <select 
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/30"
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
                        <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Secondary Font (Body)</label>
                        <select 
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/30"
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

                <div className="apple-card rounded-[24px] p-8 space-y-6 shadow-xs">
                  <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Layout & Spacing</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Max Container Width</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/30"
                        value={globalStyles.containerWidth}
                        onChange={(e) => setGlobalStyles(prev => ({ ...prev, containerWidth: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Global Border Radius</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/30"
                        value={globalStyles.borderRadius}
                        onChange={(e) => setGlobalStyles(prev => ({ ...prev, borderRadius: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    className="bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-md shadow-[#4e45e1]/20 cursor-pointer"
                    onClick={() => {
                      syncGlobalStyles(globalStyles);
                      toast.success('Global styles saved successfully!');
                    }}
                  >
                    Save Global Styles
                  </button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'pages' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="apple-card rounded-[24px] overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7]/70 dark:bg-[#1C1C1E]/60">
                    <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">SEO Configuration</h2>
                    <p className="text-xs text-[#86868B] dark:text-[#98989D]">Manage meta titles and descriptions for all your pages.</p>
                  </div>
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {pages.map(page => (
                      <div key={page.id} className="p-6 hover:bg-[#F5F5F7]/40 dark:hover:bg-white/[0.02] transition-colors group">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${page.status === 'published' ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'}`}>
                                {page.isCustomSite ? <Globe size={16} /> : <FileText size={16} />}
                              </div>
                              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">{page.title}</span>
                            </div>
                            <code className="text-[11px] bg-[#F5F5F7] dark:bg-[#1C1C1E] px-2 py-0.5 rounded-md text-[#86868B] font-mono">/{page.slug}</code>
                            <div className="mt-4">
                              <button 
                                onClick={() => navigate(`/editor/${page.id}`)}
                                className="text-[11px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 size={12} />
                                Open in Editor
                              </button>
                            </div>
                          </div>
                          
                          <div className="lg:col-span-9 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">URL Slug</label>
                                <div className="flex items-center">
                                  <span className="text-xs text-[#86868B] mr-1">/</span>
                                  <input 
                                    type="text" 
                                    className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
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
                                <label className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Meta Title</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
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
                                <label className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Keywords</label>
                                <input 
                                  type="text" 
                                  className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
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
                              <label className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">Meta Description</label>
                              <textarea 
                                className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all min-h-[80px] resize-none"
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
                  <div className="max-w-5xl space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <form onSubmit={(e) => handleConnectDomainAndHosting(e)} className="apple-card rounded-[24px] p-7 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Add Domain &amp; Hosting</h3>
                          <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-0.5">
                            Connect multiple domains and hosting providers. Each connected domain gets its own isolated website &amp; pages.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]">
                          {connectedDomains.length} Connected
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Domain Name</label>
                          <input
                            type="text"
                            placeholder="e.g., clientwebsite.com"
                            value={newDomainInput}
                            onChange={(e) => setNewDomainInput(e.target.value.toLowerCase())}
                            className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/40"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Website Label</label>
                          <input
                            type="text"
                            placeholder="e.g., Client Brand"
                            value={newDomainSiteName}
                            onChange={(e) => setNewDomainSiteName(e.target.value)}
                            className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/40"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Hosting Provider</label>
                          <select
                            value={newProviderInput}
                            onChange={(e) => setNewProviderInput(e.target.value)}
                            className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]/40"
                          >
                            <option value="Hostinger">Hostinger</option>
                            <option value="WordPress">WordPress (Existing / Managed)</option>
                            <option value="Web Application">Web Application (React / Next.js / SPA)</option>
                            <option value="Vercel">Vercel</option>
                            <option value="Netlify">Netlify</option>
                            <option value="Cloudflare Pages">Cloudflare Pages</option>
                            <option value="cPanel / Shared Hosting">cPanel / Shared Hosting</option>
                            <option value="AWS / GCP / OCI">AWS / Google Cloud / OCI</option>
                            <option value="Custom Node.js / VPS">Custom Node.js / VPS</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full apple-pill-btn h-[42px] px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            <span>Verify &amp; Add</span>
                          </button>
                        </div>
                      </div>
                    </form>

                    <div className="apple-card rounded-[24px] p-7 space-y-4">
                      <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Connected Domains &amp; Websites
                      </h3>
                      {connectedDomains.length === 0 ? (
                        <p className="text-xs text-[#86868B] py-4">
                          No domains connected yet. Add your first domain above to start creating websites.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {connectedDomains.map((dom) => {
                            const isActive = activeDomain?.id === dom.id;
                            const countForDomain = pages.filter((p) => p.domainId === dom.id).length;
                            return (
                              <div
                                key={dom.id}
                                className={`apple-subcard rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-4 border ${
                                  isActive ? 'border-[#4e45e1]/45 bg-[#4e45e1]/[0.06]' : 'border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white flex items-center justify-center shrink-0">
                                    <Globe size={18} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                        {dom.domain}
                                      </span>
                                      {isActive && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158]">
                                          Active
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B]">
                                        {dom.hostingProvider}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#86868B] mt-0.5">
                                      {countForDomain} page{countForDomain === 1 ? '' : 's'} ·{' '}
                                      {dom.resolvedIps && dom.resolvedIps.length > 0
                                        ? `DNS ${dom.resolvedIps[0]}`
                                        : 'Connected'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {!isActive && (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectDomain(dom.id)}
                                      className="apple-secondary-btn px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                                    >
                                      Switch Here
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleSelectDomain(dom.id);
                                      const id = Math.random().toString(36).substr(2, 9);
                                      const newPage: Page = {
                                        id,
                                        title: `${dom.siteName || dom.domain} Page`,
                                        slug: `new-page-${id}`,
                                        status: 'draft',
                                        seo: { metaTitle: '', metaDescription: '', keywords: '', ogImage: '' },
                                        layoutJSON: { sections: [], layoutVersion: '1.0' },
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                        author: user?.name || 'Admin',
                                        domainId: dom.id,
                                        domain: dom.domain,
                                      };
                                      await syncPage(newPage);
                                      navigate(`/editor/${id}`);
                                    }}
                                    className="apple-pill-btn px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Build Page</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectDomain(dom.id);
                                      setActiveView('pages');
                                    }}
                                    className="apple-pill-btn px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                                  >
                                    Manage Pages
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDomain(dom.id)}
                                    className="p-2 rounded-xl text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer"
                                    title="Remove domain"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'automation' && (
                  <CsvPageAutomation
                    pages={pages}
                    setPages={setPages}
                    syncPage={syncPage}
                    rewrites={rewrites}
                    setRewrites={setRewrites}
                    syncRewrite={syncRewrite}
                    globalStyles={globalStyles}
                    authorName={user?.name || 'Administrator'}
                    siteName={siteConfig?.siteName || 'DevInquire'}
                    canManage={
                      activePermissions.settings === 'manage' ||
                      activePermissions.pages.level === 'manage'
                    }
                    onOpenEditor={(pageId) => navigate(`/editor/${pageId}`)}
                    onOpenExperienceManager={(pageId) => {
                      setExperiencePageId(pageId);
                      setActiveView('experience');
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      case 'seo':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <div className="apple-card rounded-[24px] p-8 shadow-xs">
                <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 flex items-center gap-2"><Activity size={20} className="text-[#4e45e1] dark:text-[#6B63F2]" /> SEO Health</h2>
                <div className="flex items-center gap-4 py-6 border-b border-black/[0.06] dark:border-white/[0.08]">
                   <div className="text-4xl font-semibold text-[#34C759]">88</div>
                   <div className="text-sm font-medium text-[#86868B] dark:text-[#98989D]">Site-wide SEO score based on content analysis and metadata completeness.</div>
                </div>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-center gap-3 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"><CheckCircle size={16} className="text-[#34C759]" /> Meta titles optimized</li>
                  <li className="flex items-center gap-3 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"><CheckCircle size={16} className="text-[#34C759]" /> Alt texts present on all images</li>
                  <li className="flex items-center gap-3 text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"><AlertCircle size={16} className="text-[#FF9500]" /> 2 pages missing meta descriptions</li>
                </ul>
             </div>
             <div className="bg-[#1D1D1F] dark:bg-[#2C2C2E] rounded-[24px] p-8 text-white border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
                <h2 className="text-xl font-semibold mb-4">Google Search Console</h2>
                <p className="text-[#86868B] dark:text-[#98989D] text-sm mb-8">Connect your site to track impressions and search ranking data directly in your CMS.</p>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all cursor-pointer"
                >
                  Connect Site
                </button>
             </div>
          </div>
        );
      case 'users':
        return activePermissions.users === 'none' && !simulatedUser ? (
          <SectionAccessDenied
            sectionTitle="User Management & RBAC"
            requiredCapability="User Management: View or Manage"
            activeRoleName={activeRoleLabel}
            isSimulating={Boolean(simulatedUser)}
            onExitSimulation={() => setSimulatedUser(null)}
            onBackToDashboard={() => setActiveView('dashboard')}
          />
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">User Management</h2>
                <p className="text-sm text-[#86868B] dark:text-[#98989D]">Manage team members, roles, and section-level access permissions.</p>
              </div>
              {activePermissions.users === 'manage' && (
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="apple-pill-btn flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Quick Add Member</span>
                </button>
              )}
            </div>
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
          </div>
        );
      case 'profile':
        return (
          <div className="max-w-4xl animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-1 space-y-6">
                <div className="apple-card rounded-[24px] p-6 text-center shadow-xs">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#4e45e1] to-[#5856D6] mx-auto flex items-center justify-center text-white text-3xl font-semibold shadow-lg mb-4 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user.avatar
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{user.name}</h3>
                  <p className="text-sm text-[#86868B] dark:text-[#98989D] mb-6">{user.role}</p>
                  <div className="space-y-2.5">
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAvatarUpload} 
                    />
                    <button 
                      className="w-full py-2.5 bg-[#4e45e1] dark:bg-[#6B63F2] text-white rounded-full text-xs font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm shadow-[#4e45e1]/20 cursor-pointer"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      Upload Image
                    </button>
                    <button 
                      className="w-full py-2.5 border border-black/[0.08] dark:border-white/[0.1] rounded-full text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-all cursor-pointer"
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
                      className="w-full py-2 text-[10px] font-semibold text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] transition-all uppercase tracking-widest cursor-pointer"
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

                <div className="apple-card rounded-[24px] p-6 shadow-xs">
                  <h4 className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-4">Account Status</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#86868B] dark:text-[#98989D]">Plan</span>
                      <span className="text-xs font-semibold text-[#4e45e1] dark:text-[#6B63F2] bg-[#4e45e1]/10 px-2.5 py-1 rounded-full">Professional</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#86868B] dark:text-[#98989D]">Member Since</span>
                      <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Oct 2023</span>
                    </div>
                  </div>
                </div>

                <div className="apple-card rounded-[24px] p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                    <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] uppercase tracking-wider">CMS Tour Guide</h4>
                  </div>
                  <p className="text-xs text-[#86868B] dark:text-[#98989D] mb-4 leading-relaxed">
                    New here or want a quick interactive walkthrough of all DevInquire CMS capabilities?
                  </p>
                  <button 
                    onClick={startTourGuide}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4e45e1] dark:bg-[#6B63F2] hover:bg-[#4139BF] dark:hover:bg-[#5850EB] text-white rounded-full text-xs font-semibold transition-all shadow-sm shadow-[#4e45e1]/20 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    Restart Tour Guide
                  </button>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="apple-card rounded-[24px] p-8 shadow-xs">
                  <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-8">Profile Details</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Full Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Location</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Bio</label>
                      <textarea 
                        className="w-full bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1]/30 outline-none transition-all min-h-[120px]"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        className="bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-md shadow-[#4e45e1]/20 cursor-pointer"
                        onClick={() => {
                          setUser(profileData);
                          syncUser(profileData);
                          toast.success('Profile updated successfully!');
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="apple-card rounded-[24px] p-8">
                  <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-6">Security</h2>
                  <div className="space-y-4">
                    <button 
                      className="flex items-center justify-between w-full p-4 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-all group cursor-pointer"
                      onClick={() => {
                        const newPass = prompt('Enter new password:');
                        if (newPass) toast.success('Password updated successfully!');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-[#4e45e1]/10 flex items-center justify-center text-[#4e45e1] dark:text-[#6B63F2]">
                          <Lock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Change Password</p>
                          <p className="text-xs text-[#86868B] dark:text-[#98989D]">Update your account password regularly</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-[#86868B]" />
                    </button>
                    <button 
                      className="flex items-center justify-between w-full p-4 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-all group cursor-pointer"
                      onClick={() => {
                        setRunTour(true);
                        setActiveView('dashboard');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-[#4e45e1]/10 flex items-center justify-center text-[#4e45e1] dark:text-[#6B63F2]">
                          <Repeat size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Restart Onboarding Tour</p>
                          <p className="text-xs text-[#86868B] dark:text-[#98989D]">Re-watch the guided tour of key features</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-[#86868B]" />
                    </button>
                    <button 
                      className="flex items-center justify-between w-full p-4 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] transition-all group cursor-pointer"
                      onClick={() => {
                        toast.success('Two-Factor Authentication has been enabled for your account.');
                      }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-full bg-[#4e45e1]/10 flex items-center justify-center text-[#4e45e1] group-hover:bg-blue-100 transition-all">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                          <p className="text-xs text-slate-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#4e45e1] bg-[#4e45e1]/10 px-2 py-1 rounded uppercase tracking-widest">Enable</span>
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
    <div className="min-h-screen bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7] flex transition-colors duration-300">
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
            primaryColor: '#4e45e1',
            textColor: theme === 'dark' ? '#F5F5F7' : '#1D1D1F',
            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
            arrowColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
            overlayColor: 'rgba(0, 0, 0, 0.55)',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '22px',
            padding: '18px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
          },
          tooltipContainer: {
            textAlign: 'left',
            fontSize: '14px',
            lineHeight: '1.6',
          },
          tooltipTitle: {
            fontSize: '16px',
            fontWeight: '700',
            color: theme === 'dark' ? '#F5F5F7' : '#1D1D1F',
            marginBottom: '6px',
          },
          buttonNext: {
            borderRadius: '999px',
            fontWeight: '600',
            fontSize: '13px',
            padding: '8px 18px',
            backgroundColor: '#4e45e1',
          },
          buttonBack: {
            fontWeight: '600',
            fontSize: '13px',
            marginRight: '8px',
            color: '#86868B',
          },
          buttonSkip: {
            fontWeight: '600',
            fontSize: '13px',
            color: '#86868B',
          }
        } as any}
      />

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* macOS Vibrancy Sidebar Navigation */}
      <aside 
        className={`apple-glass-sidebar text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col fixed h-full z-40 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-[76px]' : 'w-64'
        } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Fixed-position Collapse / Expand Edge Pill (Desktop) */}
        <button
          id="btn-collapse-sidebar-toggle"
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.14] shadow-md items-center justify-center text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] transition-all cursor-pointer"
          title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>

        {/* Sidebar Brand Header */}
        <div className={`px-4 h-16 flex items-center border-b border-black/[0.06] dark:border-white/[0.08] ${
          isSidebarCollapsed ? 'justify-center' : 'justify-start'
        }`}>
          <div
            onClick={() => {
              setActiveView('dashboard');
              setIsMobileSidebarOpen(false);
            }}
            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#4e45e1] flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(78,69,225,0.35)] relative overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <div className="absolute inset-0 bg-white/20 opacity-50"></div>
              <div className="relative z-10 flex items-center justify-center text-white font-bold text-[12px] tracking-tight">
                <span className="text-white/80 mr-0.5 text-[11px]">&#123;</span>
                <span className="text-white font-bold">DI</span>
                <span className="text-white/80 ml-0.5 text-[11px]">&#125;</span>
              </div>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[16px] tracking-tight text-[#4e45e1] dark:text-[#8179FF] leading-none truncate">
                  DevInquire
                </span>
                <span className="text-[10px] text-[#86868B] dark:text-[#98989D] font-medium tracking-wider uppercase mt-1">
                  Studio CMS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {/* Group 1: Workspace */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#98989D]">
                Workspace
              </div>
            )}
            <div id="tour-dashboard">
              <NavItem 
                id="nav-dashboard"
                icon={<LayoutDashboard size={18} />} 
                label="Dashboard" 
                active={activeView === 'dashboard'} 
                onClick={() => {
                  setActiveView('dashboard');
                  setIsMobileSidebarOpen(false);
                }}
                collapsed={isSidebarCollapsed}
              />
            </div>
            {isAdminAccess && (
              <NavItem 
                id="nav-activity"
                icon={<Activity size={18} />} 
                label="Activity Tracker" 
                active={activeView === 'activity'} 
                onClick={() => {
                  setActiveView('activity');
                  setIsMobileSidebarOpen(false);
                }}
                collapsed={isSidebarCollapsed}
              />
            )}
            <div id="tour-pages">
              <NavItem 
                id="nav-content-studio"
                icon={<FileText size={18} />} 
                label="Content Studio" 
                active={activeView === 'pages' || activeView === 'templates' || activeView === 'media'} 
                onClick={() => {
                  if (activeView !== 'pages' && activeView !== 'templates' && activeView !== 'media') {
                    setActiveView('pages');
                  }
                  setIsMobileSidebarOpen(false);
                }}
                collapsed={isSidebarCollapsed}
                accessLevel={activePermissions.pages}
              />
            </div>
            <NavItem 
              id="nav-experience"
              icon={<FolderTree size={18} />} 
              label="Experience" 
              active={activeView === 'experience'} 
              onClick={() => {
                setActiveView('experience');
                setIsMobileSidebarOpen(false);
              }}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.pages}
            />
          </div>

          {/* Group 2: Manage */}
          <div className="space-y-1">
            {!isSidebarCollapsed ? (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#98989D]">
                Manage
              </div>
            ) : (
              <div className="w-8 h-[1px] bg-black/[0.06] dark:bg-white/[0.08] mx-auto my-2" />
            )}
            <div id="tour-collections">
              <NavItem 
                id="nav-data-api-seo"
                icon={<Database size={18} />} 
                label="Data, API & SEO" 
                active={
                  activeView === 'collections' ||
                  activeView === 'headless-api' ||
                  activeView === 'seo' ||
                  activeView === 'rewrites'
                } 
                onClick={() => {
                  if (
                    activeView !== 'collections' &&
                    activeView !== 'headless-api' &&
                    activeView !== 'seo' &&
                    activeView !== 'rewrites'
                  ) {
                    setActiveView('collections');
                  }
                  setIsMobileSidebarOpen(false);
                }}
                collapsed={isSidebarCollapsed}
                accessLevel={activePermissions.collections.level}
              />
            </div>
            <NavItem 
              id="nav-site-settings"
              icon={<Globe size={18} />} 
              label="Site Settings" 
              active={activeView === 'settings'} 
              onClick={() => {
                setActiveView('settings');
                setIsMobileSidebarOpen(false);
              }}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.settings}
            />
            <NavItem 
              id="nav-user-management"
              icon={<Users size={18} />} 
              label="User Management" 
              active={activeView === 'users'} 
              onClick={() => {
                setActiveView('users');
                setIsMobileSidebarOpen(false);
              }}
              collapsed={isSidebarCollapsed}
              accessLevel={activePermissions.users}
            />
            {(user?.role === 'Administrator' || activePermissions.settings === 'manage') && (
              <NavItem 
                id="nav-admin-console"
                icon={<Terminal size={18} />} 
                label="System Console" 
                active={false} 
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  navigate('/console');
                }}
                collapsed={isSidebarCollapsed}
              />
            )}
          </div>
        </nav>

        {/* Compact Bottom User Profile Bar */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className={`apple-subcard rounded-2xl p-2 flex items-center ${
            isSidebarCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between gap-2'
          }`}>
            <button
              type="button"
              onClick={() => {
                setActiveView('profile');
                setIsMobileSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer group"
              title="Open Profile Settings"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] flex items-center justify-center text-white text-xs font-semibold shadow-sm overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.avatar
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#34C759] border-2 border-white dark:border-[#1C1C1E] rounded-full"></div>
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2] transition-colors">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-[#86868B] dark:text-[#98989D] truncate">{user.role}</p>
                </div>
              )}
            </button>

            <button 
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#86868B] hover:bg-[#FF3B30]/12 hover:text-[#FF3B30] transition-all cursor-pointer shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'
      }`}>
        {/* macOS Frosted Top Header / Spotlight Search */}
        <header className="h-16 apple-glass-header px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-xl lg:hidden transition-all cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={19} />
            </button>

            {/* Active Website / Domain Switcher */}
            {connectedDomains.length > 0 && (
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] rounded-full px-3 py-1.5">
                  <Globe size={13} className="text-[#4e45e1] dark:text-[#6B63F2] shrink-0" />
                  <select
                    value={activeDomain?.id || ''}
                    onChange={(e) => handleSelectDomain(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] outline-none cursor-pointer pr-1"
                    title="Switch active website domain"
                  >
                    {connectedDomains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.domain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div ref={headerSearchContainerRef} className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={15} />
                <input 
                  type="text" 
                  placeholder="Spotlight search pages, media, or entries..." 
                  className="w-full pl-9 pr-20 py-2 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] rounded-full text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#4e45e1] transition-all outline-none"
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
                      className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white rounded-md cursor-pointer"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderSearchDropdownOpen(false);
                      setIsGlobalSearchOpen(true);
                    }}
                    className="px-2 py-0.5 bg-white dark:bg-[#1C1C1E] hover:bg-black/[0.04] border border-black/[0.08] dark:border-white/[0.1] rounded-full text-[10px] font-semibold text-[#86868B] dark:text-[#98989D] transition-colors cursor-pointer"
                    title="Open Global Search Command Palette (Ctrl+K / Cmd+K)"
                  >
                    ⌘K
                  </button>
                </div>

                {/* Instant Global Search Results Popover */}
                {isHeaderSearchDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl rounded-[22px] shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Popover Category Filter Bar */}
                    <div className="px-3.5 py-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
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
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              headerSearchCategory === tab.id
                                ? 'bg-[#4e45e1] text-white'
                                : 'text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={
                                headerSearchCategory === tab.id
                                  ? 'text-white/80'
                                  : 'text-[#86868B]'
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
                        className="text-[11px] font-semibold text-[#4e45e1] dark:text-[#6B63F2] shrink-0 cursor-pointer"
                      >
                        Expand ⌘K
                      </button>
                    </div>

                    {/* Popover Results List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {filteredHeaderSearchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            No matches for "{searchQuery}"
                          </p>
                          <p className="text-[11px] text-[#86868B] mt-0.5">
                            No pages, media assets, or collection entries matched that title or content snippet.
                          </p>
                        </div>
                      ) : (
                        filteredHeaderSearchResults.slice(0, 8).map(result => (
                          <div
                            key={result.id}
                            onClick={() => handleSelectGlobalSearchResult(result, 'primary')}
                            className="px-4 py-3 hover:bg-[#4e45e1]/[0.06] dark:hover:bg-[#6B63F2]/[0.12] cursor-pointer transition-colors flex items-start gap-3 group"
                          >
                            {result.category === 'media' && result.thumbnailUrl ? (
                              <img
                                src={result.thumbnailUrl}
                                alt={result.title}
                                className="w-9 h-9 rounded-lg object-cover border border-black/[0.08] shrink-0 mt-0.5"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  result.category === 'pages'
                                    ? 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]'
                                    : result.category === 'media'
                                    ? 'bg-[#AF52DE]/12 text-[#AF52DE]'
                                    : 'bg-[#34C759]/12 text-[#34C759]'
                                }`}
                              >
                                {result.category === 'pages' && <FileText size={16} />}
                                {result.category === 'media' && <FolderOpen size={16} />}
                                {result.category === 'entries' && <Layers size={16} />}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate group-hover:text-[#4e45e1] dark:group-hover:text-[#6B63F2]">
                                  <HighlightMatch text={result.title} query={searchQuery} />
                                </span>
                                <span className="text-[10px] text-[#86868B]">·</span>
                                <span className="text-[11px] font-mono text-[#86868B] truncate">
                                  <HighlightMatch text={result.subtitle} query={searchQuery} />
                                </span>
                              </div>
                              {result.snippet && (
                                <p className="text-[11px] text-[#86868B] line-clamp-1 mt-0.5">
                                  <HighlightMatch text={result.snippet} query={searchQuery} />
                                </p>
                              )}
                            </div>

                            <ChevronRight
                              size={15}
                              className="text-[#86868B] group-hover:text-[#4e45e1] self-center shrink-0 transition-colors"
                            />
                          </div>
                        ))
                      )}
                    </div>

                    {/* Popover Footer */}
                    <div className="px-4 py-2 bg-[#F5F5F7] dark:bg-[#1C1C1E] border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868B]">
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
                        className="font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline cursor-pointer"
                      >
                        View all in Spotlight →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {activeView === 'pages' && (
                <button 
                  onClick={handleSmartSearch}
                  disabled={isSmartSearching || !searchQuery.trim()}
                  className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shrink-0 cursor-pointer ${
                    smartSearchResults 
                      ? 'bg-[#34C759] text-white' 
                      : 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.03]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="AI Smart Search"
                >
                  {isSmartSearching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} className={smartSearchResults ? 'text-white' : 'text-[#4e45e1] dark:text-[#6B63F2]'} />
                  )}
                  <span>{smartSearchResults ? 'Smart Results' : 'Smart Search'}</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Apple Light / Dark Theme Switcher */}
            <AppleThemeSwitcher variant="segmented" />

            <button 
              id="btn-header-tour"
              onClick={startTourGuide}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4e45e1]/10 hover:bg-[#4e45e1]/15 text-[#4e45e1] dark:text-[#6B63F2] text-xs font-semibold rounded-full transition-all cursor-pointer"
              title="Start Interactive Tour Guide"
            >
              <Sparkles size={13} />
              <span>Tour</span>
            </button>
          </div>
        </header>

        {/* Active RBAC Simulation Banner */}
        {simulatedUser && (
          <div className="bg-[#FF9500] text-black px-6 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs z-10">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <Shield size={16} className="shrink-0" />
              <span>
                RBAC Role Preview Active: Viewing CMS as{' '}
                <strong className="underline">{simulatedUser.name}</strong> ({simulatedUser.role})
              </span>
              <span className="hidden md:inline text-black/75">
                · Media Library: {activePermissions.media.level.toUpperCase()} · Collections:{' '}
                {activePermissions.collections.level.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveView('users');
                }}
                className="px-3 py-1 bg-black/15 hover:bg-black/25 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Edit Permissions
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedUser(null);
                  toast.success('Restored Administrator permissions');
                }}
                className="px-3 py-1 bg-[#1D1D1F] text-white hover:bg-black rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Exit Role Preview
              </button>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-8 flex-1 max-w-[1440px] w-full mx-auto">
          {/* Page Title & Main Action */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
            <div>
              {activeView === 'pages' ||
              activeView === 'templates' ||
              activeView === 'media' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      Content Studio
                    </h1>
                    <span className="px-3 py-1 rounded-full bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] text-[11px] font-semibold">
                      Pages, Templates &amp; Media
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setActiveView('pages')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'pages'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Pages ({domainPages.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('templates')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'templates'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Layout size={13} />
                      <span>Templates ({templates.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('media')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'media'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <FolderOpen size={13} />
                      <span>Media Library ({media.length})</span>
                    </button>
                  </div>
                </div>
              ) : activeView === 'experience' ? (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      Experience Manager
                    </h1>
                    <span className="px-3 py-1 rounded-full bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] text-[11px] font-semibold">
                      Visual Editor & Sitemap
                    </span>
                  </div>
                  <p className="text-[#86868B] dark:text-[#98989D] text-sm mt-1">
                    Visually preview and edit pages inline or navigate your interactive site hierarchy.
                  </p>
                </>
              ) : activeView === 'collections' ||
                activeView === 'headless-api' ||
                activeView === 'seo' ||
                activeView === 'rewrites' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      Data, API &amp; SEO
                    </h1>
                    <span className="px-3 py-1 rounded-full bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] text-[11px] font-semibold">
                      Collections, Headless API &amp; Analytics
                    </span>
                  </div>
                  <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setActiveView('collections')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'collections'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Layers size={13} />
                      <span>Collections ({collections.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('headless-api')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'headless-api'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Database size={13} />
                      <span>Headless API</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('seo')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'seo'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Activity size={13} />
                      <span>SEO &amp; Analytics</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('rewrites')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                        activeView === 'rewrites'
                          ? 'bg-white dark:bg-[#2C2C2E] text-[#4e45e1] dark:text-[#6B63F2] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Repeat size={13} />
                      <span>URL Rewrites ({rewrites.length})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight capitalize">{activeView.replace('-', ' ')}</h1>
                  <p className="text-[#86868B] dark:text-[#98989D] text-sm mt-1">Manage your site's {activeView.replace('-', ' ')} and studio preferences.</p>
                </>
              )}
            </div>
            {activeView === 'experience' && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => createPage()}
                  className="flex items-center gap-2 bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create Page</span>
                </button>
              </div>
            )}
            {activeView === 'pages' && (
              <div className="flex flex-wrap gap-2.5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportSite} 
                  accept=".json,.html" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload size={15} />
                  <span>Import Page</span>
                </button>
                <button 
                  onClick={downloadFullSite}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors shadow-2xs cursor-pointer"
                >
                  <Download size={15} />
                  <span>Export Site</span>
                </button>
                <button 
                  id="tour-create-page"
                  onClick={() => createPage()}
                  className="flex items-center gap-2 bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create Page</span>
                </button>
              </div>
            )}
            {activeView === 'templates' && (
              <div className="flex flex-wrap gap-2.5">
                <input 
                  type="file" 
                  ref={templateInputRef} 
                  onChange={handleImportTemplate} 
                  accept=".json,.html" 
                  className="hidden" 
                />
                <button 
                  onClick={() => templateInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload size={15} />
                  <span>Import Template</span>
                </button>
                <button 
                  onClick={restoreSampleTemplates}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors shadow-2xs cursor-pointer"
                >
                  <Repeat size={15} />
                  <span>Restore Samples</span>
                </button>
                <button 
                  onClick={() => setShowCreateTemplateModal(true)}
                  className="flex items-center gap-2 bg-[#4e45e1] dark:bg-[#6B63F2] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-[#4139BF] dark:hover:bg-[#5850EB] transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Create Template</span>
                </button>
              </div>
            )}
            {activeView === 'media' && (
              <div className="flex flex-wrap gap-2.5">
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
                    const canUploadMedia =
                      activePermissions.media.level === 'manage' && activePermissions.media.canUpload;
                    if (!canUploadMedia) {
                      toast.error('Uploading media assets is restricted by your role permissions.');
                      return;
                    }
                    mediaInputRef.current?.click();
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activePermissions.media.level === 'manage' && activePermissions.media.canUpload
                      ? 'bg-[#4e45e1] dark:bg-[#6B63F2] text-white shadow-sm hover:bg-[#4139BF] dark:hover:bg-[#5850EB] active:scale-95'
                      : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B] cursor-not-allowed'
                  }`}
                >
                  {activePermissions.media.level === 'manage' && activePermissions.media.canUpload ? (
                    <Upload size={16} />
                  ) : (
                    <Lock size={15} />
                  )}
                  <span>Upload Media</span>
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
                  className="w-full bg-[#4e45e1] text-white py-4 rounded-xl font-bold hover:bg-[#4139BF] transition-all shadow-lg shadow-blue-500/20 mt-4"
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
                <div className="w-16 h-16 bg-[#4e45e1]/10 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="text-[#4e45e1]" size={32} />
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

      {/* Page Version History Modal */}
      {versionHistoryPageId && pages.some(p => p.id === versionHistoryPageId) && (
        <VersionHistoryModal
          isOpen={Boolean(versionHistoryPageId)}
          onClose={() => setVersionHistoryPageId(null)}
          page={pages.find(p => p.id === versionHistoryPageId)!}
          globalStyles={globalStyles}
          currentUser={user?.name || 'Admin'}
          canEdit={activePermissions.pages.level === 'manage'}
          onUpdatePage={async updatedPage => {
            setPages(prev => prev.map(p => (p.id === updatedPage.id ? updatedPage : p)));
            await syncPage(updatedPage);
          }}
        />
      )}
      {/* Cookie Preference Banner (collected once per browser) */}
      {!cookieConsentAccepted && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm apple-card p-4 rounded-[20px] flex items-start gap-3 animate-in">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Workspace Cookies
            </p>
            <p className="text-[11px] text-[#86868B] dark:text-[#98989D] mt-0.5 leading-relaxed">
              We use essential cookies to remember your theme and show the startup guide only on your first visit.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptCookies}
                className="apple-pill-btn px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
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
    className={`w-full flex items-center cursor-pointer ${
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'
    } rounded-[14px] text-[13px] font-semibold transition-all relative group ${
      active
        ? 'bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_18px_-4px_rgba(78,69,225,0.38)]'
        : accessLevel === 'none'
        ? 'text-[#86868B]/60 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
        : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
    }`}
  >
    <div className="shrink-0 flex items-center justify-center">{icon}</div>
    {!collapsed && <span className="truncate">{label}</span>}
    {!collapsed && accessLevel === 'none' && (
      <Lock size={12} className="ml-auto text-[#FF9500] shrink-0" />
    )}
    {!collapsed && accessLevel === 'view' && !active && (
      <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B] shrink-0">
        View
      </span>
    )}
    {!collapsed && active && accessLevel !== 'none' && (
      <ChevronRight size={14} className="ml-auto opacity-70 shrink-0" />
    )}

    {/* Floating Tooltip in Collapsed Mode */}
    {collapsed && (
      <div className="fixed left-[74px] px-3 py-1.5 bg-[#1D1D1F] dark:bg-[#2C2C2E] text-white text-xs font-semibold rounded-xl shadow-xl border border-white/10 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 -translate-x-1 transition-all duration-150 z-50 whitespace-nowrap flex items-center gap-2">
        <span>{label}</span>
        {accessLevel === 'none' && <Lock size={11} className="text-[#FF9500]" />}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-[#6B63F2]"></span>}
      </div>
    )}
  </button>
);

const ApiEndpoint: React.FC<{ method: string; path: string; description: string }> = ({ method, path, description }) => (
  <div className="apple-card rounded-[18px] p-4 flex items-center gap-6 group hover:border-[#4e45e1]/40 transition-all">
    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
      method === 'GET' ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' : 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]'
    }`}>
      {method}
    </div>
    <div className="flex-1">
      <code className="text-sm font-mono font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{path}</code>
      <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1">{description}</p>
    </div>
    <button 
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}${path}`);
        toast.success('Endpoint URL copied!');
      }}
      className="p-2 text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] transition-colors cursor-pointer"
      title="Copy Endpoint"
    >
      <LinkIcon size={16} />
    </button>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; trend: string; icon: React.ReactNode }> = ({ label, value, trend, icon }) => (
  <div className="apple-card p-6 rounded-[22px] transition-all hover:-translate-y-0.5 group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 apple-subcard rounded-2xl group-hover:scale-105 transition-all">{icon}</div>
      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
        trend.startsWith('+') || trend === 'Live' ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]' : 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]'
      }`}>
        {trend}
      </span>
    </div>
    <h3 className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] leading-none tabular-nums tracking-tight">{value}</h3>
    <p className="text-xs font-medium text-[#86868B] dark:text-[#98989D] mt-2">{label}</p>
  </div>
);

const FilterTab: React.FC<{ active: boolean; onClick: () => void; label: string; count: number }> = ({ active, onClick, label, count }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 text-xs font-semibold rounded-[12px] transition-all flex items-center gap-2 cursor-pointer ${
      active ? 'bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white shadow-sm shadow-[#4e45e1]/30' : 'text-[#86868B] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
    }`}
  >
    {label}
    <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'}`}>
      {count}
    </span>
  </button>
);

const DnsRecordRow: React.FC<{ type: string; host: string; value: string }> = ({ type, host, value }) => (
  <div className="grid grid-cols-12 gap-4 p-4 bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl items-center group">
    <div className="col-span-2">
      <span className="px-2 py-1 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded text-[10px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{type}</span>
    </div>
    <div className="col-span-3">
      <span className="font-mono text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">{host}</span>
    </div>
    <div className="col-span-5 relative">
       <span className="font-mono text-xs text-[#86868B] truncate block">{value}</span>
       <button 
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${type} value copied!`);
        }}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#86868B] hover:text-[#4e45e1] opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-[#2C2C2E] cursor-pointer"
       >
          <Copy size={14} />
       </button>
    </div>
    <div className="col-span-2 text-right">
       <span className="text-[10px] font-semibold text-[#86868B]">3600</span>
    </div>
  </div>
);

const ColorInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-3">
      <input 
        type="color" 
        className="w-10 h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] cursor-pointer overflow-hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input 
        type="text" 
        className="flex-1 bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#4e45e1]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; color: 'blue' | 'red' | 'slate', onClick: (e: React.MouseEvent) => void }> = ({ icon, label, color, onClick }) => {
  const colors = {
    blue: 'hover:bg-[#4e45e1]/10 hover:text-[#4e45e1] dark:hover:text-[#6B63F2]',
    red: 'hover:bg-[#FF3B30]/10 hover:text-[#FF3B30]',
    slate: 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-white'
  };
  
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`p-2 rounded-xl text-[#86868B] dark:text-[#98989D] transition-all flex items-center gap-2 cursor-pointer ${colors[color]} relative group/btn`}
    >
      {icon}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#1D1D1F] dark:bg-[#2C2C2E] text-white text-[10px] font-medium rounded-lg shadow-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-20">
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
