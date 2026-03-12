
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { Page, Template, GlobalStyles, User, MediaItem } from './types';
import { SAMPLE_PAGES, SAMPLE_TEMPLATES } from './sampleData';

const socket = io();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = localStorage.getItem('devinquire_auth') === 'true';
  if (!isAuth) {
    return <Navigate to="/landing" replace />;
  }
  return <>{children}</>;
};

const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  containerWidth: '1200px',
  borderRadius: '8px',
};

const DEFAULT_USER: User = {
  name: 'Admin User',
  email: 'admin@devinquire.com',
  role: 'Administrator',
  avatar: 'AD',
  avatarUrl: undefined,
  bio: 'Lead developer and site administrator for DevInquire CMS.',
  location: 'San Francisco, CA'
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
  socket: Socket;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) throw new Error("useCMS must be used within CMSProvider");
  return context;
};

const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>(() => {
    const saved = localStorage.getItem('devinquire_pages');
    return saved ? JSON.parse(saved) : SAMPLE_PAGES;
  });

  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('devinquire_templates');
    let parsed = saved ? JSON.parse(saved) : [];
    
    // Ensure all sample templates are present
    const existingIds = new Set(parsed.map((t: any) => t.id));
    const missingSamples = SAMPLE_TEMPLATES.filter(t => !existingIds.has(t.id));
    
    if (missingSamples.length > 0) {
      parsed = [...parsed, ...missingSamples];
    }
    
    return parsed.length > 0 ? parsed : SAMPLE_TEMPLATES;
  });

  const [globalStyles, setGlobalStyles] = useState<GlobalStyles>(() => {
    const saved = localStorage.getItem('devinquire_global_styles');
    return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_STYLES;
  });

  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('devinquire_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [media, setMedia] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('devinquire_media');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('devinquire_pages', JSON.stringify(pages));
  }, [pages]);

  useEffect(() => {
    localStorage.setItem('devinquire_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('devinquire_global_styles', JSON.stringify(globalStyles));
  }, [globalStyles]);

  useEffect(() => {
    localStorage.setItem('devinquire_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('devinquire_media', JSON.stringify(media));
  }, [media]);

  return (
    <CMSContext.Provider value={{ pages, setPages, templates, setTemplates, globalStyles, setGlobalStyles, user, setUser, media, setMedia, socket }}>
      <HashRouter>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/editor/:id" element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </CMSContext.Provider>
  );
};

export default App;
