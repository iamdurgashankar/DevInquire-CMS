import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useCMS } from '../App';
import { BlockRenderer } from '../components/BlockRenderer';
import { Page } from '../types';
import {
  DEFAULT_I18N_CONFIG,
  I18nConfig,
  detectVisitorLocationAndLocale,
  fetchI18nConfig,
  localizeSections,
  translatePhrase,
} from '../services/i18nService';

const PublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { pages, rewrites, globalStyles } = useCMS();
  const [targetPage, setTargetPage] = useState<Page | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [i18nConfig, setI18nConfig] = useState<I18nConfig>(DEFAULT_I18N_CONFIG);
  const [activeLocale, setActiveLocale] = useState<string>('en');
  const [detectedReason, setDetectedReason] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await fetchI18nConfig();
      if (!mounted) return;
      setI18nConfig(cfg);
      if (cfg.multiLanguageEnabled) {
        const res = await detectVisitorLocationAndLocale(cfg);
        if (!mounted) return;
        setActiveLocale(res.locale);
        setDetectedReason(res.reason);
      } else {
        setActiveLocale(cfg.defaultLocale || 'en');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!slug) return;

    // 1. Check for rewrites/redirects
    const rewrite = rewrites.find(r => r.source === `/${slug}` && r.isActive);
    
    let currentSlug = slug;
    if (rewrite) {
      if (rewrite.type === '301' || rewrite.type === '302') {
        setRedirectUrl(rewrite.target);
        return;
      } else {
        // Internal rewrite
        currentSlug = rewrite.target.startsWith('/') ? rewrite.target.slice(1) : rewrite.target;
      }
    }

    // 2. Find the page locally first (preferring current hostname), then verify/fetch from backend
    const currentHost = window.location.hostname.toLowerCase();
    const localPage =
      pages.find(p => p.slug === currentSlug && p.status === 'published' && p.domain?.toLowerCase() === currentHost) ||
      pages.find(p => p.slug === currentSlug && p.status === 'published');
    if (localPage) {
      setTargetPage(localPage);
      setNotFound(false);
    }

    const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');
    const domainQuery = currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1'
      ? `?domain=${encodeURIComponent(currentHost)}`
      : '';
    const endpoints = apiBase
      ? [`${apiBase}/api/v1/content/pages/${encodeURIComponent(currentSlug)}${domainQuery}`, `/cms/api/v1/content/pages/${encodeURIComponent(currentSlug)}${domainQuery}`]
      : [`/cms/api/v1/content/pages/${encodeURIComponent(currentSlug)}${domainQuery}`];

    (async () => {
      for (const url of endpoints) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const json = await r.json();
          if (json?.success && json.data) {
            setTargetPage((prev) => ({ ...(prev || {}), ...json.data }));
            setNotFound(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }
      if (!localPage) setNotFound(true);
    })();
  }, [slug, pages, rewrites]);

  const activeLocaleObj = useMemo(
    () => i18nConfig.supportedLocales.find((l) => l.code === activeLocale),
    [i18nConfig, activeLocale]
  );

  const localizedSections = useMemo(() => {
    const sections = targetPage?.layoutJSON?.sections || [];
    if (!targetPage) return [];
    if (!i18nConfig.multiLanguageEnabled) return sections;
    return localizeSections(sections, activeLocale);
  }, [targetPage, i18nConfig.multiLanguageEnabled, activeLocale]);

  if (redirectUrl) {
    return <Navigate to={redirectUrl.startsWith('/') ? redirectUrl : `/p/${redirectUrl}`} replace />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] dark:bg-[#1C1C1E] p-6 text-center">
        <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] p-10 max-w-md w-full shadow-sm">
          <h1 className="text-5xl font-bold text-[#86868B] dark:text-[#98989D] mb-3 tabular-nums">404</h1>
          <p className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">Page Not Found</p>
          <p className="text-sm text-[#86868B] dark:text-[#98989D] mb-8 leading-relaxed">
            The page you are looking for doesn&apos;t exist, is currently a draft, or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#4e45e1] hover:bg-[#4139BF] dark:bg-[#6B63F2] dark:hover:bg-[#8179FF] text-white rounded-xl text-sm font-semibold transition-all"
          >
            Back to Studio Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!targetPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="w-8 h-8 border-[3px] border-[#4e45e1] dark:border-[#6B63F2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render Custom Site (HTML)
  if (targetPage.isCustomSite) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: targetPage.customCSS || '' }} />
        <div dangerouslySetInnerHTML={{ __html: targetPage.customHTML || '' }} />
        <script dangerouslySetInnerHTML={{ __html: targetPage.customJS || '' }} />
      </>
    );
  }

  // Render CMS Page
  return (
    <div 
      dir={i18nConfig.multiLanguageEnabled && activeLocaleObj?.rtl ? 'rtl' : 'ltr'}
      className="min-h-screen relative"
      style={{ 
        backgroundColor: globalStyles.backgroundColor,
        color: globalStyles.textColor,
        fontFamily: globalStyles.bodyFont
      }}
    >
      {localizedSections.map((section) => (
        <section 
          key={section.id}
          style={{
            ...section.styles,
            padding: section.styles?.padding || '4rem 0',
          }}
        >
          <div 
            className="mx-auto px-4"
            style={{ maxWidth: globalStyles.containerWidth }}
          >
            <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${section.columns.length}, 1fr)` }}>
              {section.columns.map((column) => (
                <div key={column.id} className="space-y-6">
                  {column.blocks.map((block) => (
                    <BlockRenderer 
                      key={block.id} 
                      block={block} 
                      onUpdate={() => {}} 
                      onRemove={() => {}} 
                      globalStyles={globalStyles}
                      pages={pages}
                      readOnly={true}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {i18nConfig.multiLanguageEnabled && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#2C2C2E]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-lg text-xs">
          <Globe size={14} className="text-[#4e45e1] dark:text-[#6B63F2]" />
          <select
            value={activeLocale}
            onChange={(e) => {
              setActiveLocale(e.target.value);
              setDetectedReason('Manual visitor selection');
            }}
            className="bg-transparent font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] outline-none cursor-pointer"
            title={detectedReason || 'Select Language'}
          >
            {i18nConfig.supportedLocales
              .filter((l) => l.enabled)
              .map((l) => (
                <option key={l.code} value={l.code} className="text-black">
                  {l.nativeName} ({l.code.toUpperCase()})
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default PublicPage;
