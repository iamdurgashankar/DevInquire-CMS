
import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useCMS } from '../App';
import { BlockRenderer } from '../components/BlockRenderer';
import { Page } from '../types';

const PublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { pages, rewrites, globalStyles } = useCMS();
  const [targetPage, setTargetPage] = useState<Page | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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

    // 2. Find the page
    const page = pages.find(p => p.slug === currentSlug && p.status === 'published');
    if (page) {
      setTargetPage(page);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }, [slug, pages, rewrites]);

  if (redirectUrl) {
    return <Navigate to={redirectUrl.startsWith('/') ? redirectUrl : `/p/${redirectUrl}`} replace />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h1 className="text-6xl font-black text-slate-200 mb-4">404</h1>
        <p className="text-xl font-bold text-slate-800 mb-2">Page Not Found</p>
        <p className="text-slate-500 mb-8">The page you are looking for doesn't exist or has been moved.</p>
        <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
          Back to Dashboard
        </a>
      </div>
    );
  }

  if (!targetPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
      className="min-h-screen"
      style={{ 
        backgroundColor: globalStyles.backgroundColor,
        color: globalStyles.textColor,
        fontFamily: globalStyles.bodyFont
      }}
    >
      {targetPage.layoutJSON.sections.map((section) => (
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
    </div>
  );
};

export default PublicPage;
