import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PublicPage from './pages/PublicPage';
import HeadlessClientDemo from './pages/HeadlessClientDemo';
import { Page, Template, GlobalStyles, User, MediaItem, URLRewrite, UserManagementItem, SiteConfig, Collection, CollectionEntry, getPermissionsForRole } from './types';
import { SAMPLE_PAGES, SAMPLE_TEMPLATES, SAMPLE_MEDIA } from './sampleData';

const socket = io();

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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-6">
              {this.state.error?.message?.startsWith('{') 
                ? "A database error occurred. Please check your permissions." 
                : "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
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
  primaryColor: '#4f46e5',
  secondaryColor: '#6366f1',
  accentColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  backgroundGradient: '',
  textColor: '#1e293b',
  headingFont: 'Plus Jakarta Sans',
  bodyFont: 'Inter',
  containerWidth: '1200px',
  borderRadius: '12px',
};

const DEFAULT_USER: User = {
  name: 'Admin User',
  email: 'admin@devinquire.com',
  role: 'Administrator',
  avatar: 'AD',
  avatarUrl: undefined,
  bio: 'Lead developer and site administrator for DevInquire CMS.',
  location: 'San Francisco, CA',
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
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) throw new Error("useCMS must be used within CMSProvider");
  return context;
};

const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>(() => loadFromStorage('devinquire_pages', SAMPLE_PAGES));
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
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces',
      bio: 'Lead developer and site administrator for DevInquire CMS.',
      location: 'San Francisco, CA'
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
        await getDocFromServer(doc(db, 'test', 'connection'));
        firestoreAvailableRef.current = true;
      } catch (_error) {
        firestoreAvailableRef.current = false;
      }

      try {
        unsubscribeAuth = onAuthStateChanged(
          auth,
          (fUser) => {
            setFirebaseUser(fUser);
            if (fUser) {
              setIsDemoMode(false);
              localStorage.removeItem('devinquire_is_demo');
              setUser({
                name: fUser.displayName || 'User',
                email: fUser.email || '',
                avatar: fUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces',
                role: 'admin',
                bio: '',
                location: ''
              });
            } else if (!localStorage.getItem('devinquire_is_demo')) {
              setUser(DEFAULT_USER);
            }
            setLoading(false);
          },
          () => {
            setLoading(false);
          }
        );
      } catch (_authErr) {
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
  useEffect(() => { saveToStorage('devinquire_users', users); }, [users]);

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
      const pagesData = snapshot.docs.map(doc => doc.data() as Page);
      if (pagesData.length === 0) {
        SAMPLE_PAGES.forEach(p => setDoc(doc(db, 'pages', p.id), cleanFirestoreData(p)).catch(() => {}));
        setPages(SAMPLE_PAGES);
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

  // Sync functions (used by components)
  const syncPage = async (page: Page) => {
    setPages(prev => {
      const exists = prev.some(p => p.id === page.id);
      return exists ? prev.map(p => p.id === page.id ? page : p) : [page, ...prev];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'pages', page.id), cleanFirestoreData(page));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pages/${page.id}`);
    }
  };

  const deletePageOnServer = async (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
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
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'config', 'globalStyles'), cleanFirestoreData(styles));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/globalStyles');
    }
  };

  const syncTemplate = async (template: Template) => {
    setTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      return exists ? prev.map(t => t.id === template.id ? template : t) : [template, ...prev];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'templates', template.id), cleanFirestoreData(template));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `templates/${template.id}`);
    }
  };

  const deleteTemplateOnServer = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `templates/${id}`);
    }
  };

  const syncMedia = async (mediaItem: MediaItem) => {
    setMedia(prev => {
      const exists = prev.some(m => m.id === mediaItem.id);
      return exists ? prev.map(m => m.id === mediaItem.id ? mediaItem : m) : [mediaItem, ...prev];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'media', mediaItem.id), cleanFirestoreData(mediaItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `media/${mediaItem.id}`);
    }
  };

  const deleteMediaOnServer = async (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'media', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media/${id}`);
    }
  };

  const syncUserManagement = async (userItem: UserManagementItem) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === userItem.id);
      return exists ? prev.map(u => u.id === userItem.id ? userItem : u) : [...prev, userItem];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'users', userItem.id), cleanFirestoreData(userItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userItem.id}`);
    }
  };

  const deleteUserOnServer = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const syncSiteConfig = async (config: SiteConfig) => {
    setSiteConfig(config);
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'config', 'siteConfig'), cleanFirestoreData(config));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/siteConfig');
    }
  };

  const syncRewrite = async (rewrite: URLRewrite) => {
    setRewrites(prev => {
      const exists = prev.some(r => r.id === rewrite.id);
      return exists ? prev.map(r => r.id === rewrite.id ? rewrite : r) : [...prev, rewrite];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'rewrites', rewrite.id), cleanFirestoreData(rewrite));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rewrites/${rewrite.id}`);
    }
  };

  const deleteRewriteOnServer = async (id: string) => {
    setRewrites(prev => prev.filter(r => r.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'rewrites', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rewrites/${id}`);
    }
  };

  const syncCollection = async (collectionData: Collection) => {
    setCollections(prev => {
      const exists = prev.some(c => c.id === collectionData.id);
      return exists ? prev.map(c => c.id === collectionData.id ? collectionData : c) : [...prev, collectionData];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'collections', collectionData.id), cleanFirestoreData(collectionData));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `collections/${collectionData.id}`);
    }
  };

  const deleteCollectionOnServer = async (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'collections', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `collections/${id}`);
    }
  };

  const syncEntry = async (entry: CollectionEntry) => {
    setEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      return exists ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry];
    });
    if (!canSyncFirestore()) return;
    try {
      await setDoc(doc(db, 'entries', entry.id), cleanFirestoreData(entry));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `entries/${entry.id}`);
    }
  };

  const deleteEntryOnServer = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (!canSyncFirestore()) return;
    try {
      await deleteDoc(doc(db, 'entries', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `entries/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading DevInquire CMS...</p>
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
        syncEntry, deleteEntryOnServer
      }}>
        <Toaster position="top-right" richColors />
        <HashRouter>
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
            <Route path="/p/:slug" element={<PublicPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </CMSContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
