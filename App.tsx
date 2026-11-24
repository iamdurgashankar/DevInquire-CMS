import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Toaster } from 'sonner';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, disableFirestoreNetwork, isFirestoreConfigured } from './firebase';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PublicPage from './pages/PublicPage';
import HeadlessClientDemo from './pages/HeadlessClientDemo';
import ConsolePage from './pages/ConsolePage';
import { initGlobalConsoleCapture, reportConsoleEvent } from './services/consoleLogger';
import { Page, Template, GlobalStyles, User, MediaItem, URLRewrite, UserManagementItem, SiteConfig, Collection, CollectionEntry, ActivityLogItem, ActivityAction, ActivityCategory, getPermissionsForRole } from './types';
import { SAMPLE_PAGES, SAMPLE_TEMPLATES, SAMPLE_MEDIA } from './sampleData';
import { ensurePageBaselineVersion } from './components/VersionHistoryModal';

const CMS_BASE_PATH = ((import.meta as any).env?.BASE_URL || '/cms/').replace(/\/+$/, '') || '/cms';
const socket = io({ path: `${CMS_BASE_PATH}/socket.io` });
const JAVA_API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');
initGlobalConsoleCapture();

export type AppleThemeMode = 'light' | 'dark';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("ErrorBoundary caught an error", error, errorInfo);
    reportConsoleEvent({
      level: 'ERROR',
      source: 'FRONTEND',
      category: 'REACT_ERROR_BOUNDARY',
      message: error?.message || 'React ErrorBoundary caught an error',
      stackTrace: error?.stack || errorInfo?.componentStack,
      nodePath: '/client/error-boundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#1C1C1E] p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#2C2C2E] rounded-3xl border border-black/[0.08] dark:border-white/[0.10] shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#FF3B30]/10 text-[#FF3B30] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">Something went wrong</h1>
            <p className="text-[#86868B] dark:text-[#98989D] mb-6 text-sm leading-relaxed">
              {this.state.error?.message?.startsWith('{') 
                ? "A database error occurred. Please check your permissions." 
                : "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#4e45e1] dark:bg-[#6B63F2] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all active:scale-[0.98]"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute = ({ children, firebaseUser, isDemo }: { children: React.ReactNode, firebaseUser: FirebaseUser | null, isDemo?: boolean }) => {
  if (!firebaseUser && !isDemo) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  primaryColor: '#4e45e1',
  secondaryColor: '#5856D6',
  accentColor: '#6B63F2',
  backgroundColor: '#FFFFFF',
  backgroundGradient: '',
  textColor: '#1D1D1F',
  headingFont: 'Plus Jakarta Sans',
  bodyFont: 'Plus Jakarta Sans',
  containerWidth: '1200px',
  borderRadius: '14px',
};

const DEFAULT_USER: User = {
  name: 'Admin User',
  email: 'admin@devinquire.com',
  role: 'Administrator',
  avatar: 'AD',
  avatarUrl: undefined,
  bio: 'Lead developer and site administrator for DevInquire CMS.',
  location: 'Cupertino, CA',
  permissions: getPermissionsForRole('Administrator'),
};

const DEFAULT_TEAM_USERS: UserManagementItem[] = [
  {
    id: 'usr_admin_1',
    name: 'Admin User',
    email: 'admin@devinquire.com',
    role: 'Administrator',
    status: 'Active',
    lastActive: 'Just now',
    permissions: getPermissionsForRole('Administrator'),
  },
  {
    id: 'usr_editor_2',
    name: 'Alex Rivera',
    email: 'alex@devinquire.com',
    role: 'Editor',
    status: 'Active',
    lastActive: '14 mins ago',
    permissions: getPermissionsForRole('Editor'),
  },
  {
    id: 'usr_media_3',
    name: 'Elena Rostova',
    email: 'elena@devinquire.com',
    role: 'Media Manager',
    status: 'Active',
    lastActive: '1 hour ago',
    permissions: getPermissionsForRole('Media Manager'),
  },
  {
    id: 'usr_collections_4',
    name: 'Marcus Vance',
    email: 'marcus@devinquire.com',
    role: 'Collection Architect',
    status: 'Active',
    lastActive: '3 hours ago',
    permissions: getPermissionsForRole('Collection Architect'),
  },
  {
    id: 'usr_viewer_5',
    name: 'Sarah Chen',
    email: 'sarah@devinquire.com',
    role: 'Viewer',
    status: 'Active',
    lastActive: 'Yesterday',
    permissions: getPermissionsForRole('Viewer'),
  },
];

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
};

interface CMSContextType {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  globalStyles: GlobalStyles;
  setGlobalStyles: React.Dispatch<React.SetStateAction<GlobalStyles>>;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  users: UserManagementItem[];
  setUsers: React.Dispatch<React.SetStateAction<UserManagementItem[]>>;
  socket: Socket;
  isDemoMode: boolean;
  loginAsDemoUser: (customUser?: { name?: string; email?: string }) => void;
  logoutDemoUser: () => void;
  syncPage: (page: Page) => Promise<void>;
  deletePageOnServer: (id: string) => Promise<void>;
  syncUser: (updatedUser: User) => Promise<void>;
  syncGlobalStyles: (styles: GlobalStyles) => Promise<void>;
  syncTemplate: (template: Template) => Promise<void>;
  deleteTemplateOnServer: (id: string) => Promise<void>;
  syncMedia: (mediaItem: MediaItem) => Promise<void>;
  deleteMediaOnServer: (id: string) => Promise<void>;
  syncUserManagement: (user: UserManagementItem) => Promise<void>;
  deleteUserOnServer: (id: string) => Promise<void>;
  syncSiteConfig: (config: SiteConfig) => Promise<void>;
  rewrites: URLRewrite[];
  setRewrites: React.Dispatch<React.SetStateAction<URLRewrite[]>>;
  siteConfig: SiteConfig;
  setSiteConfig: React.Dispatch<React.SetStateAction<SiteConfig>>;
  syncRewrite: (rewrite: URLRewrite) => Promise<void>;
  deleteRewriteOnServer: (id: string) => Promise<void>;
  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  entries: CollectionEntry[];
  setEntries: React.Dispatch<React.SetStateAction<CollectionEntry[]>>;
  syncCollection: (collection: Collection) => Promise<void>;
  deleteCollectionOnServer: (id: string) => Promise<void>;
  syncEntry: (entry: CollectionEntry) => Promise<void>;
  deleteEntryOnServer: (id: string) => Promise<void>;
  resyncWithDatabase: (mode?: 'MERGE' | 'PUSH' | 'PULL') => Promise<{ success: boolean; data?: any; error?: string }>;
  activityLogs: ActivityLogItem[];
  logActivity: (entry: {
    action: ActivityAction;
    category: ActivityCategory;
    targetId?: string;
    targetName: string;
    details?: string;
    userName?: string;
  }) => void;
  clearActivityLogs: () => void;
  theme: AppleThemeMode;
  setTheme: (theme: AppleThemeMode) => void;
  toggleTheme: () => void;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) throw new Error("useCMS must be used within CMSProvider");
  return context;
};

const App: React.FC = () => {
  const [theme, setThemeState] = useState<AppleThemeMode>(() => {
    const saved = localStorage.getItem('devinquire_apple_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    localStorage.setItem('devinquire_apple_theme', theme);
  }, [theme]);

  const setTheme = (nextTheme: AppleThemeMode) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [pages, setPages] = useState<Page[]>(() =>
    loadFromStorage('devinquire_pages', SAMPLE_PAGES).map(ensurePageBaselineVersion)
  );
  const [templates, setTemplates] = useState<Template[]>(() => loadFromStorage('devinquire_templates', SAMPLE_TEMPLATES));
  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>(() => loadFromStorage('devinquire_styles', DEFAULT_GLOBAL_STYLES));
  const [user, setUser] = useState<User>(() => loadFromStorage('devinquire_demo_user', DEFAULT_USER));
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => localStorage.getItem('devinquire_is_demo') === 'true');
  const [media, setMedia] = useState<MediaItem[]>(() => loadFromStorage('devinquire_media', SAMPLE_MEDIA));
  const [users, setUsers] = useState<UserManagementItem[]>(() => {
    const stored = loadFromStorage<UserManagementItem[]>('devinquire_users', []);
    const baseList = stored.length > 0 ? stored : DEFAULT_TEAM_USERS;
    return baseList.map(u => ({
      ...u,
      permissions: getPermissionsForRole(u.role, u.permissions),
    }));
  });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => loadFromStorage('devinquire_site_config', { siteName: 'DevInquire Official', baseUrl: 'https://devinquire.com' }));
  const [rewrites, setRewrites] = useState<URLRewrite[]>(() => loadFromStorage('devinquire_rewrites', []));
  const [collections, setCollections] = useState<Collection[]>(() => loadFromStorage('devinquire_collections', []));
  const [entries, setEntries] = useState<CollectionEntry[]>(() => loadFromStorage('devinquire_entries', []));
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => loadFromStorage('devinquire_activity_logs', []));
  const [loading, setLoading] = useState(true);
  const firestoreAvailableRef = useRef<boolean>(false);

  const loginAsDemoUser = (customUser?: { name?: string; email?: string }) => {
    const resolvedEmail = customUser?.email || 'admin@devinquire.com';
    const resolvedName =
      customUser?.name ||
      (customUser?.email ? customUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Demo Administrator');
    const demoProfile: User = {
      name: resolvedName,
      email: resolvedEmail,
      role: 'Administrator',
      avatar: 'AD',
      bio: 'Lead developer and site administrator for DevInquire CMS.',
      location: 'Cupertino, CA'
    };
    setIsDemoMode(true);
    setUser(demoProfile);
    localStorage.setItem('devinquire_is_demo', 'true');
    saveToStorage('devinquire_demo_user', demoProfile);
  };

  const logoutDemoUser = () => {
    setIsDemoMode(false);
    localStorage.removeItem('devinquire_is_demo');
    localStorage.removeItem('devinquire_demo_user');
    setUser(DEFAULT_USER);
  };

  // Auth listener
  useEffect(() => {
    let unsubscribeAuth = () => {};

    const initFirebase = async () => {
      try {
        unsubscribeAuth = onAuthStateChanged(
          auth,
          async (fUser) => {
            if (fUser) {
              if (isFirestoreConfigured) {
                try {
                  await getDocFromServer(doc(db, 'test', 'connection'));
                  firestoreAvailableRef.current = true;
                } catch (_error) {
                  firestoreAvailableRef.current = false;
                  await disableFirestoreNetwork();
                }
              } else {
                firestoreAvailableRef.current = false;
              }
              setFirebaseUser(fUser);
              setIsDemoMode(false);
              localStorage.removeItem('devinquire_is_demo');
              setUser({
                name: fUser.displayName || 'User',
                email: fUser.email || '',
                avatar: (fUser.displayName || 'U').substring(0, 2).toUpperCase(),
                avatarUrl: fUser.photoURL || undefined,
                role: 'Administrator',
                bio: '',
                location: ''
              });
            } else {
              firestoreAvailableRef.current = false;
              setFirebaseUser(null);
              if (!localStorage.getItem('devinquire_is_demo')) {
                setUser(DEFAULT_USER);
              }
            }
            setLoading(false);
          },
          () => {
            firestoreAvailableRef.current = false;
            setLoading(false);
          }
        );
      } catch (_authErr) {
        firestoreAvailableRef.current = false;
        setLoading(false);
      }
    };

    initFirebase();

    return () => {
      try {
        unsubscribeAuth();
      } catch {
        // ignore
      }
    };
  }, []);

  // Keep localStorage synced with state changes
  useEffect(() => { saveToStorage('devinquire_pages', pages); }, [pages]);
  useEffect(() => { saveToStorage('devinquire_templates', templates); }, [templates]);
  useEffect(() => { saveToStorage('devinquire_media', media); }, [media]);
  useEffect(() => { saveToStorage('devinquire_styles', globalStyles); }, [globalStyles]);
  useEffect(() => { saveToStorage('devinquire_site_config', siteConfig); }, [siteConfig]);
  useEffect(() => { saveToStorage('devinquire_rewrites', rewrites); }, [rewrites]);
  useEffect(() => { saveToStorage('devinquire_collections', collections); }, [collections]);
  useEffect(() => { saveToStorage('devinquire_entries', entries); }, [entries]);
  useEffect(() => { saveToStorage('devinquire_activity_logs', activityLogs); }, [activityLogs]);
  useEffect(() => { saveToStorage('devinquire_users', users); }, [users]);

  // Hydrate pages, collections, entries and active hosting domain from Java Spring Boot backend on startup
  useEffect(() => {
    fetch(`${JAVA_API_BASE}/api/v1/content/pages?includeDrafts=true`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setPages((prev) => {
            const byId = new Map<string, Page>();
            prev.forEach((p) => byId.set(p.id, p));
            json.data.forEach((srvPage: Page) => byId.set(srvPage.id, ensurePageBaselineVersion(srvPage)));
            return Array.from(byId.values());
          });
        }
      })
      .catch(() => {});

    fetch(`${JAVA_API_BASE}/api/v1/content/collections`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setCollections((prev) => {
            const byId = new Map<string, Collection>();
            prev.forEach((c) => byId.set(c.id, c));
            json.data.forEach((srvCol: Collection) => byId.set(srvCol.id, srvCol));
            return Array.from(byId.values());
          });
        }
      })
      .catch(() => {});

    fetch(`${JAVA_API_BASE}/api/v1/content/entries`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setEntries((prev) => {
            const byId = new Map<string, CollectionEntry>();
            prev.forEach((e) => byId.set(e.id, e));
            json.data.forEach((srvEntry: CollectionEntry) => byId.set(srvEntry.id, srvEntry));
            return Array.from(byId.values());
          });
        }
      })
      .catch(() => {});

    fetch(`${JAVA_API_BASE}/api/hosting/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success && json.data?.domains?.length > 0) {
          const { domains, activeDomainId, activeDomain } = json.data;
          setSiteConfig((prev) => ({
            ...prev,
            domains,
            activeDomainId: activeDomainId || prev.activeDomainId,
            customDomain: activeDomain?.domain || prev.customDomain,
            baseUrl: activeDomain?.baseUrl || prev.baseUrl,
            hostingProvider: activeDomain?.hostingProvider || prev.hostingProvider,
            hostingConnected: true,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Helper to remove any undefined fields before writing to Firestore
  const cleanFirestoreData = <T,>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => cleanFirestoreData(item)) as unknown as T;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  };

  // Initial data fetch and real-time listeners when authenticated with live Firestore
  useEffect(() => {
    if (!firebaseUser || !firestoreAvailableRef.current) {
      setLoading(false);
      return;
    }

    const unsubPages = onSnapshot(collection(db, 'pages'), (snapshot) => {
      const pagesData = snapshot.docs.map(doc => ensurePageBaselineVersion(doc.data() as Page));
      if (pagesData.length === 0) {
        const seeded = SAMPLE_PAGES.map(ensurePageBaselineVersion);
        seeded.forEach(p => setDoc(doc(db, 'pages', p.id), cleanFirestoreData(p)).catch(() => {}));
        setPages(seeded);
      } else {
        setPages(pagesData);
      }
    }, () => {});

    const unsubTemplates = onSnapshot(collection(db, 'templates'), (snapshot) => {
      const templatesData = snapshot.docs.map(doc => doc.data() as Template);
      if (templatesData.length === 0) {
        SAMPLE_TEMPLATES.forEach(t => setDoc(doc(db, 'templates', t.id), cleanFirestoreData(t)).catch(() => {}));
        setTemplates(SAMPLE_TEMPLATES);
      } else {
        setTemplates(templatesData);
      }
    }, () => {});

    const unsubMedia = onSnapshot(collection(db, 'media'), (snapshot) => {
      const mediaData = snapshot.docs.map(doc => doc.data() as MediaItem);
      if (mediaData.length === 0) {
        SAMPLE_MEDIA.forEach(m => {
          setDoc(doc(db, 'media', m.id), cleanFirestoreData(m)).catch(() => {});
        });
        setMedia(SAMPLE_MEDIA);
      } else {
        setMedia(mediaData);
      }
    }, () => {});

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserManagementItem);
      if (usersData.length === 0) {
        DEFAULT_TEAM_USERS.forEach(u => {
          setDoc(doc(db, 'users', u.id), cleanFirestoreData(u)).catch(() => {});
        });
        setUsers(DEFAULT_TEAM_USERS);
      } else {
        setUsers(
          usersData.map(u => ({
            ...u,
            permissions: getPermissionsForRole(u.role, u.permissions),
          }))
        );
      }
    }, () => {});

    const unsubRewrites = onSnapshot(collection(db, 'rewrites'), (snapshot) => {
      const rewritesData = snapshot.docs.map(doc => doc.data() as URLRewrite);
      setRewrites(rewritesData);
    }, () => {});

    const unsubCollections = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const collectionsData = snapshot.docs.map(doc => doc.data() as Collection);
      setCollections(collectionsData);
    }, () => {});

    const unsubEntries = onSnapshot(collection(db, 'entries'), (snapshot) => {
      const entriesData = snapshot.docs.map(doc => doc.data() as CollectionEntry);
      setEntries(entriesData);
    }, () => {});

    const unsubStyles = onSnapshot(doc(db, 'config', 'globalStyles'), (snapshot) => {
      if (snapshot.exists()) {
        setGlobalStyles(snapshot.data() as GlobalStyles);
      }
    }, () => {});

    const unsubSite = onSnapshot(doc(db, 'config', 'siteConfig'), (snapshot) => {
      if (snapshot.exists()) {
        setSiteConfig(snapshot.data() as SiteConfig);
      }
    }, () => {});

    setLoading(false);

    return () => {
      unsubPages();
      unsubTemplates();
      unsubMedia();
      unsubUsers();
      unsubRewrites();
      unsubCollections();
      unsubEntries();
      unsubStyles();
      unsubSite();
    };
  }, [firebaseUser, isDemoMode]);

  const canSyncFirestore = () => Boolean(firebaseUser && firestoreAvailableRef.current);

  const getActorName = () => user?.name || user?.email || 'Administrator';

  const logActivity: CMSContextType['logActivity'] = ({
    action,
    category,
    targetId,
    targetName,
    details,
    userName,
  }) => {
    const item: ActivityLogItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userName: userName || getActorName(),
      userEmail: user?.email,
      userRole: user?.role || 'Administrator',
      action,
      category,
      targetId,
      targetName,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [item, ...prev].slice(0, 250));
  };

  const clearActivityLogs = () => {
    setActivityLogs([]);
  };

  // Sync functions (used by components)
  const syncPage = async (rawPage: Page) => {
    const actor = getActorName();
    const existingPage = pages.find((p) => p.id === rawPage.id);
    const activeDomainObj = siteConfig.domains?.find((d) => d.id === siteConfig.activeDomainId);
    const enrichedPage: Page = {
      ...rawPage,
      author: rawPage.author || existingPage?.author || actor,
      updatedBy: actor,
      domainId: rawPage.domainId || activeDomainObj?.id || siteConfig.activeDomainId || undefined,
      domain: rawPage.domain || activeDomainObj?.domain || siteConfig.customDomain || undefined,
    };
    const page = enrichedPage.versions === undefined ? ensurePageBaselineVersion(enrichedPage) : enrichedPage;
    setPages(prev => {
      const exists = prev.some(p => p.id === page.id);
      return exists ? prev.map(p => p.id === page.id ? page : p) : [page, ...prev];
    });
    const action: ActivityAction = !existingPage
      ? 'created'
      : page.status === 'published' && existingPage.status !== 'published'
      ? 'published'
      : 'updated';
    logActivity({
      action,
      category: 'page',
      targetId: page.id,
      targetName: page.title || page.slug || 'Untitled Page',
      details: `/${page.slug} (${page.status})`,
    });
    try {
      await fetch(`${JAVA_API_BASE}/api/v1/content/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page),
      });
      if (page.status === 'published') {
        await fetch(`${JAVA_API_BASE}/api/v1/console/replication/replicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetDomain: page.domain || siteConfig.baseUrl || 'all-connected-domains',
            contentType: 'PAGE',
            contentPath: `/content/pages/${page.slug}`,
            actor: user?.email || user?.name || 'cms-publisher',
          }),
        });
      }
    } catch {
      // ignore network errors so local state stays responsive
    }
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'pages', page.id), cleanFirestoreData(page));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pages/${page.id}`);
    }
  };

  const deletePageOnServer = async (id: string) => {
    const target = pages.find((p) => p.id === id);
    setPages(prev => prev.filter(p => p.id !== id));
    logActivity({
      action: 'deleted',
      category: 'page',
      targetId: id,
      targetName: target?.title || id,
      details: target?.slug ? `/${target.slug}` : undefined,
    });
    fetch(`${JAVA_API_BASE}/api/v1/content/pages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'pages', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pages/${id}`);
    }
  };

  const syncUser = async (updatedUser: User) => {
    setUser(updatedUser);
    if (isDemoMode) {
      saveToStorage('devinquire_demo_user', updatedUser);
    }
  };

  const syncGlobalStyles = async (styles: GlobalStyles) => {
    setGlobalStyles(styles);
    logActivity({
      action: 'updated',
      category: 'styles',
      targetName: 'Global Design System',
      details: `Primary ${styles.primaryColor} · Font ${styles.headingFont}`,
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'config', 'globalStyles'), cleanFirestoreData(styles));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/globalStyles');
    }
  };

  const syncTemplate = async (rawTemplate: Template) => {
    const actor = getActorName();
    const existing = templates.find(t => t.id === rawTemplate.id);
    const template: Template = {
      ...rawTemplate,
      createdBy: rawTemplate.createdBy || existing?.createdBy || actor,
      author: actor,
    };
    setTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      return exists ? prev.map(t => t.id === template.id ? template : t) : [template, ...prev];
    });
    logActivity({
      action: existing ? 'updated' : 'created',
      category: 'template',
      targetId: template.id,
      targetName: template.name,
      details: `${template.type} template`,
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'templates', template.id), cleanFirestoreData(template));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `templates/${template.id}`);
    }
  };

  const deleteTemplateOnServer = async (id: string) => {
    const target = templates.find(t => t.id === id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    logActivity({
      action: 'deleted',
      category: 'template',
      targetId: id,
      targetName: target?.name || id,
    });
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `templates/${id}`);
    }
  };

  const syncMedia = async (rawMediaItem: MediaItem) => {
    const actor = getActorName();
    const existing = media.find(m => m.id === rawMediaItem.id);
    const mediaItem: MediaItem = {
      ...rawMediaItem,
      uploadedBy: rawMediaItem.uploadedBy || existing?.uploadedBy || actor,
    };
    setMedia(prev => {
      const exists = prev.some(m => m.id === mediaItem.id);
      return exists ? prev.map(m => m.id === mediaItem.id ? mediaItem : m) : [mediaItem, ...prev];
    });
    logActivity({
      action: existing ? 'updated' : 'uploaded',
      category: 'media',
      targetId: mediaItem.id,
      targetName: mediaItem.name,
      details: mediaItem.type,
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'media', mediaItem.id), cleanFirestoreData(mediaItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `media/${mediaItem.id}`);
    }
  };

  const deleteMediaOnServer = async (id: string) => {
    const target = media.find(m => m.id === id);
    setMedia(prev => prev.filter(m => m.id !== id));
    logActivity({
      action: 'deleted',
      category: 'media',
      targetId: id,
      targetName: target?.name || id,
    });
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'media', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media/${id}`);
    }
  };

  const syncUserManagement = async (userItem: UserManagementItem) => {
    const existing = users.find(u => u.id === userItem.id);
    setUsers(prev => {
      const exists = prev.some(u => u.id === userItem.id);
      return exists ? prev.map(u => u.id === userItem.id ? userItem : u) : [...prev, userItem];
    });
    logActivity({
      action: existing ? 'updated' : 'created',
      category: 'user',
      targetId: userItem.id,
      targetName: userItem.name || userItem.email,
      details: `${userItem.role} (${userItem.status})`,
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'users', userItem.id), cleanFirestoreData(userItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userItem.id}`);
    }
  };

  const deleteUserOnServer = async (id: string) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    logActivity({
      action: 'deleted',
      category: 'user',
      targetId: id,
      targetName: target?.name || target?.email || id,
    });
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const syncSiteConfig = async (config: SiteConfig) => {
    setSiteConfig(config);
    logActivity({
      action: 'updated',
      category: 'settings',
      targetName: config.siteName || config.customDomain || 'Site Configuration',
      details: config.customDomain ? `Domain: ${config.customDomain}` : undefined,
    });
    try {
      localStorage.setItem('devinquire_site_config', JSON.stringify(config));
    } catch {
      // ignore storage quota errors
    }
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'config', 'siteConfig'), cleanFirestoreData(config));
    } catch (err) {
      console.warn('Firestore siteConfig sync skipped:', err);
    }
  };

  const syncRewrite = async (rewrite: URLRewrite) => {
    const existing = rewrites.find(r => r.id === rewrite.id);
    setRewrites(prev => {
      const exists = prev.some(r => r.id === rewrite.id);
      return exists ? prev.map(r => r.id === rewrite.id ? rewrite : r) : [...prev, rewrite];
    });
    logActivity({
      action: existing ? 'updated' : 'created',
      category: 'rewrite',
      targetId: rewrite.id,
      targetName: `${rewrite.source} → ${rewrite.target}`,
      details: `${rewrite.type} redirect`,
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'rewrites', rewrite.id), cleanFirestoreData(rewrite));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rewrites/${rewrite.id}`);
    }
  };

  const deleteRewriteOnServer = async (id: string) => {
    const target = rewrites.find(r => r.id === id);
    setRewrites(prev => prev.filter(r => r.id !== id));
    logActivity({
      action: 'deleted',
      category: 'rewrite',
      targetId: id,
      targetName: target ? `${target.source} → ${target.target}` : id,
    });
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'rewrites', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rewrites/${id}`);
    }
  };

  const syncCollection = async (rawCollectionData: Collection) => {
    const actor = getActorName();
    const existing = collections.find(c => c.id === rawCollectionData.id);
    const collectionData: Collection = {
      ...rawCollectionData,
      createdBy: rawCollectionData.createdBy || existing?.createdBy || actor,
      updatedBy: actor,
    };
    setCollections(prev => {
      const exists = prev.some(c => c.id === collectionData.id);
      return exists ? prev.map(c => c.id === collectionData.id ? collectionData : c) : [...prev, collectionData];
    });
    logActivity({
      action: existing ? 'updated' : 'created',
      category: 'collection',
      targetId: collectionData.id,
      targetName: collectionData.name,
      details: `${collectionData.fields?.length || 0} fields`,
    });
    fetch(`${JAVA_API_BASE}/api/v1/content/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionData),
    }).catch(() => {});
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'collections', collectionData.id), cleanFirestoreData(collectionData));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `collections/${collectionData.id}`);
    }
  };

  const deleteCollectionOnServer = async (id: string) => {
    const target = collections.find(c => c.id === id);
    setCollections(prev => prev.filter(c => c.id !== id));
    logActivity({
      action: 'deleted',
      category: 'collection',
      targetId: id,
      targetName: target?.name || id,
    });
    fetch(`${JAVA_API_BASE}/api/v1/content/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'collections', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `collections/${id}`);
    }
  };

  const syncEntry = async (rawEntry: CollectionEntry) => {
    const actor = getActorName();
    const existing = entries.find(e => e.id === rawEntry.id);
    const entry: CollectionEntry = {
      ...rawEntry,
      author: rawEntry.author || existing?.author || actor,
      updatedBy: actor,
    };
    setEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      return exists ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry];
    });
    const entryTitle = String(
      entry.data?.title || entry.data?.name || entry.data?.slug || Object.values(entry.data || {})[0] || entry.id
    );
    logActivity({
      action: !existing ? 'created' : entry.status === 'published' && existing.status !== 'published' ? 'published' : 'updated',
      category: 'entry',
      targetId: entry.id,
      targetName: entryTitle,
      details: `${entry.status}`,
    });
    fetch(`${JAVA_API_BASE}/api/v1/content/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'entries', entry.id), cleanFirestoreData(entry));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `entries/${entry.id}`);
    }
  };

  const deleteEntryOnServer = async (id: string) => {
    const target = entries.find(e => e.id === id);
    setEntries(prev => prev.filter(e => e.id !== id));
    const targetLabel = target
      ? String(target.data?.title || target.data?.name || Object.values(target.data || {})[0] || id)
      : id;
    logActivity({
      action: 'deleted',
      category: 'entry',
      targetId: id,
      targetName: targetLabel,
    });
    fetch(`${JAVA_API_BASE}/api/v1/content/entries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'entries', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `entries/${id}`);
    }
  };

  const resyncWithDatabase = async (
    mode: 'MERGE' | 'PUSH' | 'PULL' = 'MERGE'
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/database/resync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          pages: mode === 'PULL' ? [] : pages,
          collections: mode === 'PULL' ? [] : collections,
          entries: mode === 'PULL' ? [] : entries,
          actor: user?.email || user?.name || 'Administrator',
        }),
      });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      const json = await res.json();
      if (!json?.success || !json?.data) {
        return { success: false, error: json?.error || 'Database re-sync failed' };
      }

      const snapshot = json.data.snapshot;
      if ((mode === 'PULL' || mode === 'MERGE') && snapshot) {
        if (Array.isArray(snapshot.pages)) {
          const normalized = snapshot.pages.map((p: Page) => ensurePageBaselineVersion(p));
          if (mode === 'PULL') {
            setPages(normalized);
          } else {
            setPages((prev) => {
              const byId = new Map<string, Page>();
              prev.forEach((p) => byId.set(p.id, p));
              normalized.forEach((p: Page) => byId.set(p.id, p));
              return Array.from(byId.values());
            });
          }
        }
        if (Array.isArray(snapshot.collections)) {
          if (mode === 'PULL') {
            setCollections(snapshot.collections);
          } else {
            setCollections((prev) => {
              const byId = new Map<string, Collection>();
              prev.forEach((c) => byId.set(c.id, c));
              snapshot.collections.forEach((c: Collection) => byId.set(c.id, c));
              return Array.from(byId.values());
            });
          }
        }
        if (Array.isArray(snapshot.entries)) {
          if (mode === 'PULL') {
            setEntries(snapshot.entries);
          } else {
            setEntries((prev) => {
              const byId = new Map<string, CollectionEntry>();
              prev.forEach((e) => byId.set(e.id, e));
              snapshot.entries.forEach((e: CollectionEntry) => byId.set(e.id, e));
              return Array.from(byId.values());
            });
          }
        }
        if (Array.isArray(snapshot.domains) && snapshot.domains.length > 0) {
          const activeDomain =
            snapshot.domains.find((d: any) => d.active) || snapshot.domains[0];
          setSiteConfig((prev) => ({
            ...prev,
            domains: snapshot.domains,
            activeDomainId: activeDomain?.id || prev.activeDomainId,
            customDomain: activeDomain?.domain || prev.customDomain,
            baseUrl: activeDomain?.baseUrl || prev.baseUrl,
            hostingProvider: activeDomain?.hostingProvider || prev.hostingProvider,
            hostingConnected: true,
          }));
        }
      }

      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Java backend unreachable' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#4e45e1] dark:border-[#6B63F2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#86868B] dark:text-[#98989D] text-sm font-medium">Loading DevInquire CMS...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CMSContext.Provider value={{ 
        pages, setPages, 
        templates, setTemplates, 
        globalStyles, setGlobalStyles, 
        user, setUser, 
        media, setMedia, 
        users, setUsers,
        socket: socket!, 
        isDemoMode,
        loginAsDemoUser,
        logoutDemoUser,
        syncPage, deletePageOnServer, 
        syncUser, 
        syncGlobalStyles,
        syncTemplate, deleteTemplateOnServer,
        syncMedia, deleteMediaOnServer,
        syncUserManagement, deleteUserOnServer,
        syncSiteConfig,
        rewrites, setRewrites,
        siteConfig, setSiteConfig,
        syncRewrite, deleteRewriteOnServer,
        collections, setCollections,
        entries, setEntries,
        syncCollection, deleteCollectionOnServer,
        syncEntry, deleteEntryOnServer,
        resyncWithDatabase,
        activityLogs,
        logActivity,
        clearActivityLogs,
        theme,
        setTheme,
        toggleTheme
      }}>
        <Toaster position="top-right" theme={theme} richColors />
        <BrowserRouter basename={CMS_BASE_PATH}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/headless-demo" element={<HeadlessClientDemo />} />
            <Route path="/" element={
              <ProtectedRoute firebaseUser={firebaseUser} isDemo={isDemoMode}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/editor/:id" element={
              <ProtectedRoute firebaseUser={firebaseUser} isDemo={isDemoMode}>
                <Editor />
              </ProtectedRoute>
            } />
            <Route path="/console" element={
              <ProtectedRoute firebaseUser={firebaseUser} isDemo={isDemoMode}>
                <ConsolePage />
              </ProtectedRoute>
            } />
            <Route path="/p/:slug" element={<PublicPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CMSContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
