import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FileText,
  FolderOpen,
  Layers,
  X,
  ArrowRight,
  Globe,
  Edit3,
  ExternalLink,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { Page, MediaItem, Collection, CollectionEntry } from '../types';

export type SearchCategory = 'all' | 'pages' | 'media' | 'entries';

export interface GlobalSearchResult {
  id: string;
  category: 'pages' | 'media' | 'entries';
  title: string;
  subtitle: string;
  snippet: string;
  matchLocation: string;
  status?: string;
  updatedAt?: string;
  thumbnailUrl?: string;
  page?: Page;
  mediaItem?: MediaItem;
  collection?: Collection;
  entry?: CollectionEntry;
}

const stripHtml = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractObjectStrings = (val: any): string[] => {
  if (!val) return [];
  if (typeof val === 'string') {
    if (val.startsWith('data:image/')) return [];
    return [stripHtml(val)];
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return [String(val)];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractObjectStrings);
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .filter(([key]) => !['id', 'styles', 'settings', 'src', 'avatar', 'imageUrl'].includes(key))
      .flatMap(([, v]) => extractObjectStrings(v));
  }
  return [];
};

const buildSnippetAroundMatch = (fullText: string, query: string, maxLen = 130): string => {
  const clean = stripHtml(fullText);
  if (!clean) return '';
  if (!query.trim()) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trim()}...` : clean;
  }

  const lowerText = clean.toLowerCase();
  const lowerQuery = query.trim().toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trim()}...` : clean;
  }

  const padding = Math.floor((maxLen - lowerQuery.length) / 2);
  const start = Math.max(0, idx - Math.max(20, padding));
  const end = Math.min(clean.length, idx + lowerQuery.length + Math.max(40, padding));

  let snippet = clean.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < clean.length) snippet = `${snippet}...`;
  return snippet;
};

export const HighlightMatch: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = ''
}) => {
  const trimmed = query.trim();
  if (!trimmed || !text) {
    return <span className={className}>{text}</span>;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-200/80 text-slate-900 font-semibold rounded px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};

export function searchCMSContent(
  rawQuery: string,
  data: {
    pages: Page[];
    media: MediaItem[];
    collections: Collection[];
    entries: CollectionEntry[];
  }
): GlobalSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  const results: GlobalSearchResult[] = [];

  // 1. Search Pages
  for (const page of data.pages) {
    const title = page.title || 'Untitled Page';
    const slug = page.slug || '';
    const seoTitle = page.seo?.metaTitle || '';
    const seoDesc = page.seo?.metaDescription || '';
    const seoKeywords = page.seo?.keywords || '';

    const blockSnippets: string[] = [];
    if (page.isCustomSite && page.customHTML) {
      blockSnippets.push(stripHtml(page.customHTML));
    } else if (page.layoutJSON?.sections) {
      for (const section of page.layoutJSON.sections) {
        for (const col of section.columns || []) {
          for (const block of col.blocks || []) {
            const extracted = extractObjectStrings(block.content)
              .map(s => s.trim())
              .filter(Boolean);
            blockSnippets.push(...extracted);
          }
        }
      }
    }

    const bodyText = blockSnippets.join(' · ');
    const defaultPreview =
      seoDesc ||
      bodyText ||
      (page.isCustomSite ? 'Custom HTML site template' : `${page.layoutJSON?.sections?.length || 0} layout sections`);

    if (!query) {
      results.push({
        id: `page-${page.id}`,
        category: 'pages',
        title,
        subtitle: `/${slug}`,
        snippet: buildSnippetAroundMatch(defaultPreview, ''),
        matchLocation: page.isCustomSite ? 'Custom HTML Page' : 'Visual Page',
        status: page.status,
        updatedAt: page.updatedAt,
        page
      });
      continue;
    }

    const titleMatch = title.toLowerCase().includes(query);
    const slugMatch = slug.toLowerCase().includes(query);
    const seoMatch =
      seoTitle.toLowerCase().includes(query) ||
      seoDesc.toLowerCase().includes(query) ||
      seoKeywords.toLowerCase().includes(query);
    const matchedBlockText = blockSnippets.find(s => s.toLowerCase().includes(query));
    const bodyMatch = Boolean(matchedBlockText) || bodyText.toLowerCase().includes(query);

    if (titleMatch || slugMatch || seoMatch || bodyMatch) {
      let matchLocation = 'Title';
      let sourceForSnippet = defaultPreview;

      if (bodyMatch && matchedBlockText) {
        matchLocation = 'Content Snippet';
        sourceForSnippet = matchedBlockText;
      } else if (bodyMatch) {
        matchLocation = 'Content Snippet';
        sourceForSnippet = bodyText;
      } else if (seoMatch) {
        matchLocation = 'SEO Metadata';
        sourceForSnippet = `${seoTitle} ${seoDesc} ${seoKeywords}`.trim();
      } else if (slugMatch && !titleMatch) {
        matchLocation = 'URL Slug';
        sourceForSnippet = `/${slug} — ${defaultPreview}`;
      }

      results.push({
        id: `page-${page.id}`,
        category: 'pages',
        title,
        subtitle: `/${slug}`,
        snippet: buildSnippetAroundMatch(sourceForSnippet, query),
        matchLocation,
        status: page.status,
        updatedAt: page.updatedAt,
        page
      });
    }
  }

  // 2. Search Media Assets
  for (const item of data.media) {
    const name = item.name || 'Untitled Asset';
    const category = item.category || 'Upload';
    const mimeType = item.type || 'image';
    const dimensions = item.dimensions || '';
    const sizeKb = item.size ? `${(Number(item.size) / 1024).toFixed(1)} KB` : '';
    const readableUrl = item.url && !item.url.startsWith('data:') ? item.url : '';

    const metaSummary = [
      category,
      mimeType,
      dimensions ? `${dimensions}px` : '',
      sizeKb,
      readableUrl
    ]
      .filter(Boolean)
      .join(' · ');

    if (!query) {
      results.push({
        id: `media-${item.id}`,
        category: 'media',
        title: name,
        subtitle: `${category} · ${mimeType}`,
        snippet: metaSummary || 'Media library file asset',
        matchLocation: 'Media Asset',
        updatedAt: item.createdAt || item.date,
        thumbnailUrl: item.url,
        mediaItem: item
      });
      continue;
    }

    const nameMatch = name.toLowerCase().includes(query);
    const categoryMatch = category.toLowerCase().includes(query);
    const typeMatch = mimeType.toLowerCase().includes(query);
    const dimMatch = dimensions.toLowerCase().includes(query);
    const urlMatch = readableUrl.toLowerCase().includes(query);

    if (nameMatch || categoryMatch || typeMatch || dimMatch || urlMatch) {
      let matchLocation = 'Asset Title';
      let snippetSource = metaSummary;

      if (urlMatch && !nameMatch) {
        matchLocation = 'Asset Source URL';
        snippetSource = readableUrl;
      } else if (categoryMatch && !nameMatch) {
        matchLocation = 'Category';
      } else if (dimMatch && !nameMatch) {
        matchLocation = 'Dimensions';
      } else if (typeMatch && !nameMatch) {
        matchLocation = 'File Type';
      }

      results.push({
        id: `media-${item.id}`,
        category: 'media',
        title: name,
        subtitle: `${category} · ${sizeKb || mimeType}`,
        snippet: buildSnippetAroundMatch(snippetSource, query),
        matchLocation,
        updatedAt: item.createdAt || item.date,
        thumbnailUrl: item.url,
        mediaItem: item
      });
    }
  }

  // 3. Search Collection Entries
  for (const entry of data.entries) {
    const parentCollection = data.collections.find(c => c.id === entry.collectionId);
    const primaryFieldSlug = parentCollection?.fields?.[0]?.slug;
    const rawPrimaryTitle =
      (primaryFieldSlug && entry.data?.[primaryFieldSlug]) ||
      entry.data?.title ||
      entry.data?.name ||
      'Untitled Entry';
    const entryTitle = String(rawPrimaryTitle);
    const collectionName = parentCollection?.name || 'Collection';
    const collectionSlug = parentCollection?.slug || 'items';

    const fieldPairs: { label: string; slug: string; text: string }[] = [];
    if (entry.data && typeof entry.data === 'object') {
      for (const [key, rawVal] of Object.entries(entry.data)) {
        if (rawVal === null || rawVal === undefined) continue;
        const strVal = stripHtml(String(rawVal));
        if (!strVal || strVal.startsWith('data:image/')) continue;
        const fieldDef = parentCollection?.fields?.find(f => f.slug === key);
        fieldPairs.push({
          label: fieldDef?.name || key,
          slug: key,
          text: strVal
        });
      }
    }

    const defaultEntryPreview =
      fieldPairs
        .filter(fp => fp.slug !== primaryFieldSlug)
        .map(fp => `${fp.label}: ${fp.text}`)
        .join(' · ') ||
      fieldPairs.map(fp => `${fp.label}: ${fp.text}`).join(' · ') ||
      `Entry in ${collectionName}`;

    if (!query) {
      results.push({
        id: `entry-${entry.id}`,
        category: 'entries',
        title: entryTitle,
        subtitle: `${collectionName} · /${collectionSlug}`,
        snippet: buildSnippetAroundMatch(defaultEntryPreview, ''),
        matchLocation: collectionName,
        status: entry.status,
        updatedAt: entry.updatedAt,
        collection: parentCollection,
        entry
      });
      continue;
    }

    const titleMatch = entryTitle.toLowerCase().includes(query);
    const collectionMatch =
      collectionName.toLowerCase().includes(query) ||
      collectionSlug.toLowerCase().includes(query);
    const matchedField = fieldPairs.find(
      fp =>
        fp.text.toLowerCase().includes(query) ||
        fp.label.toLowerCase().includes(query)
    );

    if (titleMatch || collectionMatch || matchedField) {
      let matchLocation = 'Entry Title';
      let snippetSource = defaultEntryPreview;

      if (matchedField && (!titleMatch || matchedField.slug !== primaryFieldSlug)) {
        matchLocation = `Field · ${matchedField.label}`;
        snippetSource = `${matchedField.label}: ${matchedField.text}`;
      } else if (collectionMatch && !titleMatch) {
        matchLocation = `Collection · ${collectionName}`;
      }

      results.push({
        id: `entry-${entry.id}`,
        category: 'entries',
        title: entryTitle,
        subtitle: `${collectionName} · /${collectionSlug}`,
        snippet: buildSnippetAroundMatch(snippetSource, query),
        matchLocation,
        status: entry.status,
        updatedAt: entry.updatedAt,
        collection: parentCollection,
        entry
      });
    }
  }

  return results;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  pages: Page[];
  media: MediaItem[];
  collections: Collection[];
  entries: CollectionEntry[];
  onSelectResult: (result: GlobalSearchResult, action?: 'primary' | 'secondary') => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  pages,
  media,
  collections,
  entries,
  onSelectResult
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [isOpen, initialQuery]);

  const allResults = useMemo(
    () => searchCMSContent(query, { pages, media, collections, entries }),
    [query, pages, media, collections, entries]
  );

  const counts = useMemo(() => {
    return {
      all: allResults.length,
      pages: allResults.filter(r => r.category === 'pages').length,
      media: allResults.filter(r => r.category === 'media').length,
      entries: allResults.filter(r => r.category === 'entries').length
    };
  }, [allResults]);

  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return allResults;
    return allResults.filter(r => r.category === activeCategory);
  }, [allResults, activeCategory]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev =>
          filteredResults.length > 0
            ? (prev - 1 + filteredResults.length) % filteredResults.length
            : 0
        );
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        onSelectResult(filteredResults[selectedIndex], 'primary');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose, onSelectResult]);

  if (!isOpen) return null;

  const categories: { id: SearchCategory; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Content', count: counts.all, icon: <Sparkles size={14} /> },
    { id: 'pages', label: 'Pages', count: counts.pages, icon: <FileText size={14} /> },
    { id: 'media', label: 'Media Assets', count: counts.media, icon: <FolderOpen size={14} /> },
    { id: 'entries', label: 'Collection Entries', count: counts.entries, icon: <Layers size={14} /> }
  ];

  return (
    <div
      className="fixed inset-0 z-[250] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl rounded-[24px] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.35)] border border-black/[0.08] dark:border-white/[0.12] w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-3.5 bg-transparent">
          <Search className="text-[#4e45e1] dark:text-[#6B63F2] shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Spotlight Search — pages, media assets, or collection entries..."
            className="flex-1 text-[16px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-semibold text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-lg transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-6 py-2.5 bg-[#F5F5F7]/70 dark:bg-[#1C1C1E]/60 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 overflow-x-auto">
          {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#4e45e1] dark:bg-[#6B63F2] text-white shadow-xs'
                    : 'text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] font-semibold ${
                    isActive ? 'text-white/80' : 'text-[#86868B]'
                  }`}
                >
                  ({cat.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {filteredResults.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B] flex items-center justify-center mx-auto mb-3">
                <Search size={22} />
              </div>
              <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                No matching content found for "{query}"
              </p>
              <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1 max-w-md mx-auto">
                Try searching for a page title, section copy, image filename, or collection field value.
              </p>
            </div>
          ) : (
            filteredResults.map((result, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={result.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => onSelectResult(result, 'primary')}
                  className={`px-6 py-3.5 flex items-start gap-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#4e45e1]/[0.08] dark:bg-[#6B63F2]/[0.15]'
                      : 'hover:bg-[#F5F5F7]/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Thumbnail or Category Icon */}
                  {result.category === 'media' && result.thumbnailUrl ? (
                    <div className="w-11 h-11 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#1C1C1E] overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={result.thumbnailUrl}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        result.category === 'pages'
                          ? 'bg-[#4e45e1]/10 text-[#4e45e1] dark:text-[#6B63F2]'
                          : result.category === 'media'
                          ? 'bg-[#AF52DE]/10 text-[#AF52DE]'
                          : 'bg-[#34C759]/10 text-[#34C759]'
                      }`}
                    >
                      {result.category === 'pages' && <FileText size={20} />}
                      {result.category === 'media' && <ImageIcon size={20} />}
                      {result.category === 'entries' && <Layers size={20} />}
                    </div>
                  )}

                  {/* Main Result Copy */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        <HighlightMatch text={result.title} query={query} />
                      </h4>
                      <span className="text-xs text-[#86868B]">·</span>
                      <span className="text-xs font-mono text-[#86868B] truncate">
                        <HighlightMatch text={result.subtitle} query={query} />
                      </span>
                      {result.status && (
                        <>
                          <span className="text-xs text-[#86868B]">·</span>
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-wider ${
                              result.status === 'published'
                                ? 'text-[#34C759]'
                                : 'text-[#FF9500]'
                            }`}
                          >
                            {result.status}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Content Snippet */}
                    {result.snippet && (
                      <p className="text-xs text-[#86868B] dark:text-[#98989D] mt-1 line-clamp-2 leading-relaxed">
                        <HighlightMatch text={result.snippet} query={query} />
                      </p>
                    )}

                    {/* Match Metadata */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#86868B] font-medium">
                      <span className="uppercase tracking-wider font-semibold text-[#1D1D1F]/70 dark:text-[#F5F5F7]/70">
                        {result.category === 'pages'
                          ? 'Page'
                          : result.category === 'media'
                          ? 'Media Asset'
                          : 'Collection Entry'}
                      </span>
                      <span>·</span>
                      <span>Matched in {result.matchLocation}</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {result.category === 'pages' && result.page && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectResult(result, 'secondary');
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] hover:bg-white dark:hover:bg-[#1C1C1E] rounded-lg border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08] transition-all cursor-pointer"
                        title="Show in Pages list"
                      >
                        Locate
                      </button>
                    )}
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-[#4e45e1] dark:bg-[#6B63F2] text-white shadow-xs'
                          : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'
                      }`}
                    >
                      <span>
                        {result.category === 'pages'
                          ? 'Edit Page'
                          : result.category === 'media'
                          ? 'View Asset'
                          : 'Edit Entry'}
                      </span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-6 py-3 bg-[#F5F5F7]/80 dark:bg-[#1C1C1E]/80 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-[#86868B]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded text-[10px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs">
                <ArrowUp size={10} className="inline" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded text-[10px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs">
                <ArrowDown size={10} className="inline" />
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded text-[10px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xs">
                <CornerDownLeft size={10} className="inline" />
              </kbd>
              <span>Open Selected</span>
            </span>
          </div>
          <div className="font-medium text-[#86868B]">
            {pages.length} Pages · {media.length} Media Assets · {entries.length} Entries indexed
          </div>
        </div>
      </div>
    </div>
  );
};
