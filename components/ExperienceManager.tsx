import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe,
  FileText,
  Home,
  Search,
  Plus,
  Edit3,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ExternalLink,
  Check,
  Layout,
  FolderTree,
  Sliders,
  Code,
  Repeat,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  CornerDownRight,
  Maximize2,
  X,
  History,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Page,
  Section,
  Block,
  BlockType,
  GlobalStyles,
  URLRewrite,
  SiteConfig,
  AccessLevel,
} from '../types';
import { BlockRenderer } from './BlockRenderer';
import { VersionHistoryModal, appendPageVersion } from './VersionHistoryModal';

interface ExperienceManagerProps {
  pages: Page[];
  rewrites: URLRewrite[];
  globalStyles: GlobalStyles;
  siteConfig: SiteConfig;
  accessLevel: AccessLevel;
  initialPageId?: string | null;
  onSavePage: (updatedPage: Page) => Promise<void> | void;
  onCreatePage: (parentSlug?: string) => void;
  onDeletePage: (pageId: string) => void;
  onOpenFullEditor: (pageId: string) => void;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type ExperienceMode = 'edit' | 'preview';
type WorkspaceLayout = 'split' | 'sitemap-map' | 'canvas-only';

interface SitemapNode {
  page: Page;
  depth: number;
  parentSlug: string | null;
  children: SitemapNode[];
  attachedRewrites: URLRewrite[];
}

export const ExperienceManager: React.FC<ExperienceManagerProps> = ({
  pages,
  rewrites,
  globalStyles,
  siteConfig,
  accessLevel,
  initialPageId,
  onSavePage,
  onCreatePage,
  onDeletePage,
  onOpenFullEditor,
}) => {
  const canEdit = accessLevel === 'manage';

  const [selectedPageId, setSelectedPageId] = useState<string>(() => {
    if (initialPageId && pages.some(p => p.id === initialPageId)) {
      return initialPageId;
    }
    const homePage = pages.find(p => p.slug === 'home' || p.slug === '');
    return homePage?.id || pages[0]?.id || '';
  });

  useEffect(() => {
    if (initialPageId && pages.some(p => p.id === initialPageId)) {
      setSelectedPageId(initialPageId);
    } else if (!pages.some(p => p.id === selectedPageId) && pages.length > 0) {
      const homePage = pages.find(p => p.slug === 'home' || p.slug === '');
      setSelectedPageId(homePage?.id || pages[0].id);
    }
  }, [initialPageId, pages, selectedPageId]);

  const activePage = useMemo(
    () => pages.find(p => p.id === selectedPageId) || pages[0] || null,
    [pages, selectedPageId]
  );

  const [draftPage, setDraftPage] = useState<Page | null>(activePage);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [mode, setMode] = useState<ExperienceMode>(canEdit ? 'edit' : 'preview');
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>('split');
  const [sitemapSearch, setSitemapSearch] = useState('');
  const [sitemapStatusFilter, setSitemapStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showLeftSitemap, setShowLeftSitemap] = useState(true);
  const [showRightInspector, setShowRightInspector] = useState(false);
  const [isUrlSwitcherOpen, setIsUrlSwitcherOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Sync draftPage whenever activePage changes — keep right panel closed until user clicks a section or component
  useEffect(() => {
    if (activePage) {
      setDraftPage(JSON.parse(JSON.stringify(activePage)));
      setHasUnsavedChanges(false);
      setSelectedSectionId(null);
      setSelectedBlockId(null);
      setShowRightInspector(false);
    } else {
      setDraftPage(null);
      setSelectedSectionId(null);
      setSelectedBlockId(null);
      setShowRightInspector(false);
    }
  }, [activePage?.id]);

  // Build hierarchical Sitemap structure from page slugs
  const sitemapTree = useMemo(() => {
    const filtered = pages.filter(p => {
      if (sitemapStatusFilter !== 'all' && p.status !== sitemapStatusFilter) {
        return false;
      }
      if (!sitemapSearch.trim()) return true;
      const q = sitemapSearch.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.seo?.metaDescription || '').toLowerCase().includes(q)
      );
    });

    // Sort so home is first, then shorter slugs, then alphabetical
    const sorted = [...filtered].sort((a, b) => {
      if (a.slug === 'home' || a.slug === '') return -1;
      if (b.slug === 'home' || b.slug === '') return 1;
      const aParts = a.slug.split('/').filter(Boolean);
      const bParts = b.slug.split('/').filter(Boolean);
      if (aParts.length !== bParts.length) return aParts.length - bParts.length;
      return a.slug.localeCompare(b.slug);
    });

    const nodeMap = new Map<string, SitemapNode>();
    const roots: SitemapNode[] = [];

    sorted.forEach(page => {
      const normalizedTarget = `/${page.slug.replace(/^\/+/, '')}`;
      const attachedRewrites = rewrites.filter(
        r =>
          r.isActive &&
          (r.target === normalizedTarget ||
            r.target === page.slug ||
            r.target === `/p/${page.slug}`)
      );

      nodeMap.set(page.slug, {
        page,
        depth: 0,
        parentSlug: null,
        children: [],
        attachedRewrites,
      });
    });

    const homeNode = nodeMap.get('home') || nodeMap.get('');

    sorted.forEach(page => {
      const node = nodeMap.get(page.slug)!;
      if (homeNode && page.id === homeNode.page.id) {
        roots.push(node);
        return;
      }

      const parts = page.slug.split('/').filter(Boolean);
      let foundParent: SitemapNode | undefined;

      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('/');
        foundParent = nodeMap.get(parentPath);
      }

      if (foundParent && foundParent.page.id !== page.id) {
        node.depth = foundParent.depth + 1;
        node.parentSlug = foundParent.page.slug;
        foundParent.children.push(node);
      } else if (homeNode && homeNode.page.id !== page.id) {
        node.depth = 1;
        node.parentSlug = homeNode.page.slug;
        homeNode.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [pages, rewrites, sitemapSearch, sitemapStatusFilter]);

  const handleSelectPage = (pageId: string) => {
    if (pageId === selectedPageId) return;
    if (hasUnsavedChanges && draftPage) {
      onSavePage(draftPage);
      toast.success(`Auto-saved changes to "${draftPage.title}"`);
    }
    setSelectedPageId(pageId);
    setIsUrlSwitcherOpen(false);
  };

  const handleNavigateBySlugOrUrl = (slugOrUrl: string) => {
    const cleaned = slugOrUrl
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/?#?\/?p\//i, '')
      .replace(/^\/+|\/+$/g, '');

    // Check if there is a rewrite rule matching this path
    const matchingRewrite = rewrites.find(
      r => r.isActive && r.source.replace(/^\/+|\/+$/g, '') === cleaned
    );
    const targetSlug = matchingRewrite
      ? matchingRewrite.target.replace(/^\/?#?\/?p\//i, '').replace(/^\/+|\/+$/g, '')
      : cleaned || 'home';

    const targetPage =
      pages.find(p => p.slug.replace(/^\/+|\/+$/g, '') === targetSlug) ||
      pages.find(p => p.id === slugOrUrl);

    if (targetPage) {
      handleSelectPage(targetPage.id);
      toast.info(`Navigated to /${targetPage.slug}`);
    } else {
      toast.error(`No page found at path "/${cleaned}"`);
    }
  };

  const updateDraftPage = (updater: (prev: Page) => Page) => {
    if (!canEdit) {
      toast.error('Your role has view-only access to pages.');
      return;
    }
    setDraftPage(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      return {
        ...next,
        updatedAt: new Date().toISOString(),
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveCurrentPage = async () => {
    if (!draftPage || !canEdit) return;
    setIsSaving(true);
    try {
      const { updatedPage } = appendPageVersion(draftPage, {
        trigger: draftPage.status === 'published' ? 'publish' : 'save',
        author: draftPage.author || 'Admin',
        skipIfUnchanged: true,
      });
      setDraftPage(updatedPage);
      await onSavePage(updatedPage);
      setHasUnsavedChanges(false);
      toast.success(`Saved "${updatedPage.title}"`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!draftPage || !canEdit) return;
    const nextStatus: 'draft' | 'published' =
      draftPage.status === 'published' ? 'draft' : 'published';
    const baseUpdated: Page = {
      ...draftPage,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    const { updatedPage: updated } = appendPageVersion(baseUpdated, {
      trigger: nextStatus === 'published' ? 'publish' : 'save',
      author: baseUpdated.author || 'Admin',
      skipIfUnchanged: false,
    });
    setDraftPage(updated);
    await onSavePage(updated);
    setHasUnsavedChanges(false);
    toast.success(
      nextStatus === 'published'
        ? `"${updated.title}" is now published`
        : `"${updated.title}" moved to drafts`
    );
  };

  // Section & Block operations in Visual Edit Mode
  const handleUpdateBlock = (
    sectionId: string,
    columnId: string,
    blockId: string,
    updates: Partial<Block>
  ) => {
    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: prev.layoutJSON.sections.map(sec =>
          sec.id !== sectionId
            ? sec
            : {
                ...sec,
                columns: sec.columns.map(col =>
                  col.id !== columnId
                    ? col
                    : {
                        ...col,
                        blocks: col.blocks.map(blk =>
                          blk.id !== blockId ? blk : { ...blk, ...updates }
                        ),
                      }
                ),
              }
        ),
      },
    }));
  };

  const handleRemoveBlock = (sectionId: string, columnId: string, blockId: string) => {
    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: prev.layoutJSON.sections.map(sec =>
          sec.id !== sectionId
            ? sec
            : {
                ...sec,
                columns: sec.columns.map(col =>
                  col.id !== columnId
                    ? col
                    : {
                        ...col,
                        blocks: col.blocks.filter(blk => blk.id !== blockId),
                      }
                ),
              }
        ),
      },
    }));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    toast.success('Block removed from section');
  };

  const [draggedExpBlockId, setDraggedExpBlockId] = useState<string | null>(null);
  const [expDropTarget, setExpDropTarget] = useState<{
    sectionId: string;
    columnId: string;
    blockIndex: number;
    position: 'before' | 'after';
  } | null>(null);

  const handleReorderExpBlock = (
    blockId: string,
    targetSectionId: string,
    targetColumnId: string,
    targetIndex: number,
    position: 'before' | 'after'
  ) => {
    if (!draftPage || !blockId) return;

    let movedBlock: Block | null = null;
    let sourceSectionId = '';
    let sourceColumnId = '';
    let sourceIdx = -1;

    for (const sec of draftPage.layoutJSON?.sections || []) {
      for (const col of sec.columns || []) {
        const bIdx = col.blocks.findIndex(b => b.id === blockId);
        if (bIdx !== -1) {
          movedBlock = col.blocks[bIdx];
          sourceSectionId = sec.id;
          sourceColumnId = col.id;
          sourceIdx = bIdx;
          break;
        }
      }
      if (movedBlock) break;
    }

    if (!movedBlock) return;

    const rawInsertIdx = position === 'after' ? targetIndex + 1 : targetIndex;
    const isSameCol = sourceSectionId === targetSectionId && sourceColumnId === targetColumnId;

    if (isSameCol && (rawInsertIdx === sourceIdx || rawInsertIdx === sourceIdx + 1)) {
      setDraggedExpBlockId(null);
      setExpDropTarget(null);
      return;
    }

    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: prev.layoutJSON.sections.map(sec => ({
          ...sec,
          columns: sec.columns.map(col => {
            if (isSameCol && col.id === sourceColumnId) {
              const nextBlocks = [...col.blocks];
              const [removed] = nextBlocks.splice(sourceIdx, 1);
              const adjIdx = sourceIdx < rawInsertIdx ? rawInsertIdx - 1 : rawInsertIdx;
              nextBlocks.splice(Math.max(0, Math.min(adjIdx, nextBlocks.length)), 0, removed);
              return { ...col, blocks: nextBlocks };
            }
            if (col.id === sourceColumnId) {
              return { ...col, blocks: col.blocks.filter(b => b.id !== blockId) };
            }
            if (col.id === targetColumnId) {
              const nextBlocks = [...col.blocks];
              nextBlocks.splice(Math.max(0, Math.min(rawInsertIdx, nextBlocks.length)), 0, movedBlock!);
              return { ...col, blocks: nextBlocks };
            }
            return col;
          }),
        })),
      },
    }));

    setDraggedExpBlockId(null);
    setExpDropTarget(null);
    setSelectedSectionId(targetSectionId);
    setSelectedBlockId(blockId);
    toast.success('Block reordered');
  };

  const createDefaultBlock = (type: BlockType): Block => {
    const id = `blk_${Math.random().toString(36).slice(2, 9)}`;
    switch (type) {
      case 'text':
        return {
          id,
          type: 'text',
          content: '<h2>New Section Heading</h2><p>Click directly on this text in the Experience Manager to edit your copy inline.</p>',
          styles: { textAlign: 'left', padding: '0.5rem 0' },
          settings: {},
        };
      case 'button':
        return {
          id,
          type: 'button',
          content: 'Explore More',
          styles: { textAlign: 'left' },
          settings: {},
        };
      case 'image':
        return {
          id,
          type: 'image',
          content:
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80',
          styles: { borderRadius: '12px' },
          settings: {},
        };
      case 'sitemap':
        return {
          id,
          type: 'sitemap',
          content: {
            title: 'Interactive Site Directory',
            layout: 'grid',
            showDrafts: true,
            showHome: true,
          },
          styles: { padding: '1rem 0' },
          settings: {},
        };
      case 'accordion':
        return {
          id,
          type: 'accordion',
          content: [
            {
              title: 'How does the visual Experience Manager work?',
              content:
                'Click any text, heading, button, or section to edit content directly on the visual canvas and navigate via the live Sitemap.',
              isOpen: true,
            },
            {
              title: 'Are changes synced with the full page editor?',
              content:
                'Yes. Saving in the Experience Manager updates the exact same page schema used by the full Studio Editor and Headless API.',
              isOpen: false,
            },
          ],
          styles: {},
          settings: {},
        };
      case 'newsletter':
        return {
          id,
          type: 'newsletter',
          content: {
            title: 'Stay in the loop',
            description: 'Get product updates and announcements delivered to your inbox.',
            placeholder: 'Enter your work email...',
            buttonText: 'Subscribe',
          },
          styles: {},
          settings: {},
        };
      default:
        return {
          id,
          type: 'text',
          content: '<p>New content block</p>',
          styles: {},
          settings: {},
        };
    }
  };

  const handleAddBlockToSection = (sectionId: string, type: BlockType) => {
    const newBlock = createDefaultBlock(type);
    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: prev.layoutJSON.sections.map(sec => {
          if (sec.id !== sectionId) return sec;
          const firstCol = sec.columns[0] || { id: `col_${Date.now()}`, width: 100, blocks: [] };
          const updatedFirstCol = {
            ...firstCol,
            blocks: [...firstCol.blocks, newBlock],
          };
          return {
            ...sec,
            columns: [updatedFirstCol, ...sec.columns.slice(1)],
          };
        }),
      },
    }));
    setSelectedSectionId(sectionId);
    setSelectedBlockId(newBlock.id);
    setShowRightInspector(true);
    toast.success(`Added ${type} block`);
  };

  const handleAddSection = (preset: 'content' | 'two-column' | 'sitemap') => {
    const secId = `sec_${Math.random().toString(36).slice(2, 9)}`;
    let newSection: Section;

    if (preset === 'sitemap') {
      newSection = {
        id: secId,
        styles: { padding: '4rem 0', backgroundColor: '#f8fafc' },
        columns: [
          {
            id: `col_${Math.random().toString(36).slice(2, 9)}`,
            width: 100,
            blocks: [createDefaultBlock('sitemap')],
          },
        ],
      };
    } else if (preset === 'two-column') {
      newSection = {
        id: secId,
        styles: { padding: '4rem 0', backgroundColor: '#ffffff' },
        columns: [
          {
            id: `col_${Math.random().toString(36).slice(2, 9)}_1`,
            width: 50,
            blocks: [createDefaultBlock('text'), createDefaultBlock('button')],
          },
          {
            id: `col_${Math.random().toString(36).slice(2, 9)}_2`,
            width: 50,
            blocks: [createDefaultBlock('image')],
          },
        ],
      };
    } else {
      newSection = {
        id: secId,
        styles: { padding: '4rem 0', backgroundColor: '#ffffff' },
        columns: [
          {
            id: `col_${Math.random().toString(36).slice(2, 9)}`,
            width: 100,
            blocks: [createDefaultBlock('text'), createDefaultBlock('button')],
          },
        ],
      };
    }

    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: [...(prev.layoutJSON?.sections || []), newSection],
      },
    }));
    setSelectedSectionId(secId);
    setSelectedBlockId(null);
    setShowRightInspector(true);
    toast.success(
      preset === 'sitemap' ? 'Added Sitemap section to page' : 'Added new section to page'
    );
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    updateDraftPage(prev => {
      const sections = [...(prev.layoutJSON?.sections || [])];
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return prev;
      const [moved] = sections.splice(idx, 1);
      sections.splice(targetIdx, 0, moved);
      return {
        ...prev,
        layoutJSON: {
          ...prev.layoutJSON,
          sections,
        },
      };
    });
  };

  const handleDuplicateSection = (sectionId: string) => {
    updateDraftPage(prev => {
      const sections = [...(prev.layoutJSON?.sections || [])];
      const idx = sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return prev;
      const cloned: Section = JSON.parse(JSON.stringify(sections[idx]));
      cloned.id = `sec_${Math.random().toString(36).slice(2, 9)}`;
      cloned.columns = cloned.columns.map(col => ({
        ...col,
        id: `col_${Math.random().toString(36).slice(2, 9)}`,
        blocks: col.blocks.map(blk => ({
          ...blk,
          id: `blk_${Math.random().toString(36).slice(2, 9)}`,
        })),
      }));
      sections.splice(idx + 1, 0, cloned);
      return {
        ...prev,
        layoutJSON: {
          ...prev.layoutJSON,
          sections,
        },
      };
    });
    toast.success('Duplicated section');
  };

  const handleDeleteSection = (sectionId: string) => {
    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: (prev.layoutJSON?.sections || []).filter(s => s.id !== sectionId),
      },
    }));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setSelectedBlockId(null);
      setShowRightInspector(false);
    }
    toast.success('Deleted section');
  };

  const handleUpdateSectionStyles = (sectionId: string, styleUpdates: Record<string, string>) => {
    updateDraftPage(prev => ({
      ...prev,
      layoutJSON: {
        ...prev.layoutJSON,
        sections: (prev.layoutJSON?.sections || []).map(sec =>
          sec.id !== sectionId
            ? sec
            : {
                ...sec,
                styles: {
                  ...sec.styles,
                  ...styleUpdates,
                },
              }
        ),
      },
    }));
  };

  const handleCopyXmlSitemap = () => {
    const base = (siteConfig.baseUrl || 'https://example.com').replace(/\/+$/, '');
    const xmlEntries = pages
      .filter(p => p.status === 'published')
      .map(
        p =>
          `  <url>\n    <loc>${base}/${p.slug === 'home' ? '' : p.slug}</loc>\n    <lastmod>${
            (p.updatedAt || new Date().toISOString()).split('T')[0]
          }</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
      )
      .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>`;
    navigator.clipboard.writeText(xml);
    toast.success('XML Sitemap copied to clipboard');
  };

  const selectedSection = useMemo(
    () => draftPage?.layoutJSON?.sections?.find(s => s.id === selectedSectionId) || null,
    [draftPage, selectedSectionId]
  );

  const selectedBlockContext = useMemo(() => {
    if (!draftPage || !selectedBlockId) return null;
    for (const sec of draftPage.layoutJSON?.sections || []) {
      for (const col of sec.columns || []) {
        const found = col.blocks.find(b => b.id === selectedBlockId);
        if (found) {
          return { section: sec, column: col, block: found };
        }
      }
    }
    return null;
  }, [draftPage, selectedBlockId]);

  // Recursive Sitemap Tree Node Renderer for Left Sidebar
  const renderSitemapTreeNode = (node: SitemapNode) => {
    const isSelected = draftPage?.id === node.page.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes[node.page.id] ?? true;
    const sectionCount = node.page.layoutJSON?.sections?.length || 0;

    return (
      <div key={node.page.id} className="select-none">
        <div
          onClick={() => handleSelectPage(node.page.id)}
          style={{ paddingLeft: `${Math.min(node.depth * 14 + 10, 52)}px` }}
          className={`group flex items-center justify-between gap-2 pr-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left ${
            isSelected
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setExpandedNodes(prev => ({
                    ...prev,
                    [node.page.id]: !isExpanded,
                  }));
                }}
                className={`p-0.5 rounded transition-colors ${
                  isSelected ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : node.depth > 0 ? (
              <CornerDownRight
                size={12}
                className={isSelected ? 'text-slate-400 shrink-0' : 'text-slate-300 shrink-0'}
              />
            ) : null}

            {node.page.slug === 'home' ? (
              <Home
                size={15}
                className={isSelected ? 'text-blue-400 shrink-0' : 'text-blue-600 shrink-0'}
              />
            ) : (
              <FileText
                size={15}
                className={isSelected ? 'text-slate-300 shrink-0' : 'text-slate-400 shrink-0'}
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold truncate">{node.page.title}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-mono truncate ${
                  isSelected ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                <span>/{node.page.slug}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    node.page.status === 'published'
                      ? isSelected
                        ? 'text-emerald-300 font-sans'
                        : 'text-emerald-700 font-sans'
                      : isSelected
                        ? 'text-amber-300 font-sans'
                        : 'text-amber-700 font-sans'
                  }
                >
                  {node.page.status === 'published' ? 'Live' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <span
            className={`text-[11px] font-mono tabular-nums shrink-0 ${
              isSelected ? 'text-slate-300' : 'text-slate-400'
            }`}
            title={`${sectionCount} sections`}
          >
            {sectionCount}s
          </span>
        </div>

        {/* Attached URL Rewrites indicator */}
        {node.attachedRewrites.length > 0 && (
          <div
            style={{ paddingLeft: `${Math.min((node.depth + 1) * 14 + 16, 64)}px` }}
            className="py-0.5 space-y-0.5"
          >
            {node.attachedRewrites.map(rw => (
              <div
                key={rw.id}
                onClick={() => handleSelectPage(node.page.id)}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-blue-600 cursor-pointer py-0.5 px-2 rounded"
              >
                <Repeat size={10} className="text-indigo-500 shrink-0" />
                <span className="font-mono truncate">{rw.source}</span>
                <span aria-hidden="true">→</span>
                <span className="text-[10px] text-slate-400">{rw.type}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Page Section Outline inside Sitemap */}
        {isSelected && !node.page.isCustomSite && (draftPage?.layoutJSON?.sections?.length || 0) > 0 && (
          <div
            style={{ marginLeft: `${Math.min(node.depth * 14 + 22, 56)}px` }}
            className="my-1.5 pl-2.5 border-l border-slate-200 space-y-1"
          >
            <div className="flex items-center justify-between pr-2 py-0.5">
              <span className="text-[10px] font-semibold text-slate-400">
                Page Sections ({draftPage?.layoutJSON?.sections?.length || 0})
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleAddSection('content');
                  }}
                  className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={10} /> Add
                </button>
              )}
            </div>
            {(draftPage?.layoutJSON?.sections || []).map((sec, idx) => {
              const firstBlock = sec.columns?.[0]?.blocks?.[0];
              const rawLabel =
                firstBlock?.type === 'text'
                  ? String(firstBlock.content || '')
                      .replace(/<[^>]+>/g, ' ')
                      .trim()
                      .slice(0, 26)
                  : firstBlock?.type
                    ? `${firstBlock.type.charAt(0).toUpperCase() + firstBlock.type.slice(1)} Section`
                    : `Section ${idx + 1}`;
              const isSecSelected = selectedSectionId === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedSectionId(sec.id);
                    setSelectedBlockId(null);
                    setShowRightInspector(true);
                    const el = document.getElementById(`exp-sec-${sec.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-left text-[11px] transition-colors ${
                    isSecSelected
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono tabular-nums text-slate-400 mr-1.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {rawLabel || `Section ${idx + 1}`}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                    {sec.columns.reduce((acc, c) => acc + c.blocks.length, 0)}b
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map(child => renderSitemapTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const viewportWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px]'
      : viewport === 'tablet'
        ? 'max-w-[768px]'
        : 'w-full';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[760px]">
      {/* Top Experience Manager Control Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Sitemap Toggle + Workspace Layout Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLeftSitemap(prev => !prev)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title={showLeftSitemap ? 'Hide Sitemap Panel' : 'Show Sitemap Panel'}
          >
            {showLeftSitemap ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setWorkspaceLayout('split')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                workspaceLayout === 'split'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layout size={14} />
              <span>Visual Experience</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceLayout('sitemap-map')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                workspaceLayout === 'sitemap-map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree size={14} />
              <span>Interactive Sitemap ({pages.length})</span>
            </button>
          </div>
        </div>

        {/* Center: Simulated Browser Address Bar & Quick Sitemap Navigator */}
        {activePage && (
          <div className="relative flex-1 max-w-xl min-w-[260px]">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs gap-2">
              <Globe size={14} className="text-slate-400 shrink-0" />
              <button
                type="button"
                onClick={() => setIsUrlSwitcherOpen(prev => !prev)}
                className="flex-1 flex items-center justify-between gap-2 text-left font-mono text-slate-700 hover:text-blue-600 truncate"
                title="Click to switch page via Sitemap"
              >
                <span className="truncate">
                  {(siteConfig.baseUrl || 'https://devinquire.app').replace(/\/+$/, '')}/
                  <strong className="text-slate-900">{draftPage?.slug || activePage.slug}</strong>
                </span>
                <ChevronDown size={13} className="text-slate-400 shrink-0" />
              </button>
              <a
                href={`/#/p/${draftPage?.slug || activePage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-600 p-0.5 shrink-0"
                title="Open live page in new tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            {isUrlSwitcherOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto p-1.5">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Quick Sitemap Jump</span>
                  <span className="font-mono tabular-nums">{pages.length} routes</span>
                </div>
                {pages.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPage(p.id)}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                      p.id === activePage.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {p.slug === 'home' ? (
                        <Home size={14} className="text-blue-600 shrink-0" />
                      ) : (
                        <FileText size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{p.title}</span>
                      <span className="font-mono text-slate-400 truncate">/{p.slug}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {p.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right: Device Viewport, Edit/Preview Mode, Save & Full Studio */}
        <div className="flex items-center gap-2">
          {workspaceLayout !== 'sitemap-map' && (
            <>
              {/* Device Switcher */}
              <div className="hidden sm:flex items-center gap-0.5 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewport === 'desktop'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Desktop Viewport"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewport === 'tablet'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tablet Viewport (768px)"
                >
                  <Tablet size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewport === 'mobile'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Mobile Viewport (375px)"
                >
                  <Smartphone size={14} />
                </button>
              </div>

              {/* Edit vs Preview Mode */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setMode('edit')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    mode === 'edit'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Visual Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('preview');
                    setShowRightInspector(false);
                    setSelectedSectionId(null);
                    setSelectedBlockId(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    mode === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </button>
              </div>
            </>
          )}

          {activePage && (
            <button
              type="button"
              onClick={() => setShowVersionHistory(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title="Page Version History & Snapshots"
            >
              <History size={14} className="text-blue-600" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-600">
                {draftPage?.versions?.length || activePage.versions?.length || 0}
              </span>
            </button>
          )}

          {activePage && canEdit && (
            <button
              type="button"
              onClick={handleSaveCurrentPage}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                hasUnsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-slate-200 text-slate-400'
              }`}
            >
              <Check size={14} />
              <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          )}

          {activePage && (
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges && draftPage) {
                  onSavePage(draftPage);
                }
                onOpenFullEditor(activePage.id);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title="Open in Full Studio Editor"
            >
              <Maximize2 size={13} />
              <span>Full Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Experience Manager Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sitemap & Page Hierarchy Navigator */}
        {showLeftSitemap && (
          <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree size={16} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900">Site Sitemap & Hierarchy</h3>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onCreatePage()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>New Page</span>
                  </button>
                )}
              </div>

              {/* Search Sitemap */}
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={sitemapSearch}
                  onChange={e => setSitemapSearch(e.target.value)}
                  placeholder="Filter sitemap routes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold">
                {(['all', 'published', 'draft'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSitemapStatusFilter(st)}
                    className={`py-1 rounded-md capitalize transition-colors ${
                      sitemapStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sitemap Tree List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {sitemapTree.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <p className="text-xs text-slate-400">No pages match your sitemap filter.</p>
                </div>
              ) : (
                sitemapTree.map(node => renderSitemapTreeNode(node))
              )}
            </div>

            {/* Sitemap Footer Actions */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
              {canEdit && draftPage && !draftPage.isCustomSite && (
                <button
                  type="button"
                  onClick={() => handleAddSection('sitemap')}
                  className="w-full py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Insert Sitemap Block on Page</span>
                </button>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="tabular-nums">
                  {pages.filter(p => p.status === 'published').length} live ·{' '}
                  {pages.filter(p => p.status === 'draft').length} draft
                </span>
                <button
                  type="button"
                  onClick={handleCopyXmlSitemap}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Copy XML
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Center Viewport: Either Interactive Sitemap Architecture Map OR Visual Page Canvas */}
        {workspaceLayout === 'sitemap-map' ? (
          <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Visual Sitemap & Architecture Navigator
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any page node to preview or visually edit it, inspect route hierarchy, or manage URL redirects.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyXmlSitemap}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={14} />
                    <span>Copy sitemap.xml</span>
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onCreatePage()}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Add Page to Sitemap</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Hierarchy Cards */}
              <div className="space-y-4">
                {sitemapTree.map(rootNode => (
                  <div
                    key={rootNode.page.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
                  >
                    {/* Root / Primary Node */}
                    <div
                      onClick={() => {
                        handleSelectPage(rootNode.page.id);
                        setWorkspaceLayout('split');
                      }}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-4 ${
                        activePage?.id === rootNode.page.id
                          ? 'border-blue-600 bg-blue-50/30'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          {rootNode.page.slug === 'home' ? (
                            <Home size={18} />
                          ) : (
                            <FileText size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {rootNode.page.title}
                            </h3>
                            <span className="text-xs text-slate-400">·</span>
                            <span
                              className={`text-xs font-semibold ${
                                rootNode.page.status === 'published'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {rootNode.page.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                            <span>/{rootNode.page.slug}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans tabular-nums">
                              {rootNode.page.layoutJSON?.sections?.length || 0} sections
                            </span>
                            {rootNode.attachedRewrites.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-sans text-indigo-600">
                                  {rootNode.attachedRewrites.length} redirect(s)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPage(rootNode.page.id);
                            setMode('preview');
                            setWorkspaceLayout('split');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPage(rootNode.page.id);
                            setMode('edit');
                            setWorkspaceLayout('split');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Edit3 size={13} />
                          <span>Visual Edit</span>
                        </button>
                      </div>
                    </div>

                    {/* Child Routes in Sitemap */}
                    {rootNode.children.length > 0 && (
                      <div className="pl-6 border-l-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rootNode.children.map(child => (
                          <div
                            key={child.page.id}
                            onClick={() => {
                              handleSelectPage(child.page.id);
                              setWorkspaceLayout('split');
                            }}
                            className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                              activePage?.id === child.page.id
                                ? 'border-blue-600 bg-blue-50/30'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {child.page.title}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold shrink-0 ${
                                    child.page.status === 'published'
                                      ? 'text-emerald-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {child.page.status === 'published' ? 'Live' : 'Draft'}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                                /{child.page.slug}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                              <span className="tabular-nums">
                                {child.page.layoutJSON?.sections?.length || 0} sections
                              </span>
                              <span className="font-semibold text-blue-600 flex items-center gap-0.5">
                                Open in Experience Manager <ChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Visual Page Canvas */
          <div
            onClick={() => {
              setShowRightInspector(false);
              setSelectedSectionId(null);
              setSelectedBlockId(null);
            }}
            className="flex-1 bg-slate-100/80 p-4 sm:p-6 overflow-y-auto flex flex-col items-center"
          >
            {!draftPage ? (
              <div
                onClick={e => e.stopPropagation()}
                className="my-auto text-center p-12 bg-white rounded-2xl border border-slate-200 max-w-md"
              >
                <FileText size={36} className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">No Page Selected</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Select a page from the Sitemap on the left or create a new page to start designing visually.
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onCreatePage()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Create First Page
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={e => e.stopPropagation()}
                className={`${viewportWidthClass} w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200`}
                style={{
                  backgroundColor: globalStyles.backgroundColor,
                  color: globalStyles.textColor,
                  fontFamily: globalStyles.bodyFont,
                }}
              >
                {/* Mode Hint Bar */}
                {mode === 'edit' && canEdit && (
                  <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Edit3 size={13} className="text-blue-400" />
                      <span>
                        <strong>Visual Experience Editor:</strong> Click any component or section to open the right-side inspector and edit inline.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddSection('content')}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Add Section</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSection('sitemap')}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-1"
                      >
                        <FolderTree size={12} />
                        <span>Add Sitemap Section</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom HTML Page Rendering */}
                {draftPage.isCustomSite ? (
                  <div className="p-6">
                    {mode === 'edit' && canEdit && (
                      <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Code size={15} className="text-purple-600" />
                          <span>Custom HTML/CSS Page — Open Full Studio to edit raw code</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenFullEditor(draftPage.id)}
                          className="px-3 py-1 rounded bg-slate-900 text-white font-semibold"
                        >
                          Edit Code in Studio
                        </button>
                      </div>
                    )}
                    <style dangerouslySetInnerHTML={{ __html: draftPage.customCSS || '' }} />
                    <div dangerouslySetInnerHTML={{ __html: draftPage.customHTML || '' }} />
                  </div>
                ) : (draftPage.layoutJSON?.sections || []).length === 0 ? (
                  <div className="py-24 px-6 text-center">
                    <Layout size={40} className="text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      This page has no sections yet
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
                      Add a content section, a two-column layout, or an interactive Sitemap section to start building this page visually.
                    </p>
                    {canEdit && (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddSection('content')}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Add Content Section</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSection('two-column')}
                          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Add 2-Column Section
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSection('sitemap')}
                          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                        >
                          <FolderTree size={14} />
                          <span>Add Sitemap Section</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {(draftPage.layoutJSON?.sections || []).map((section, sIdx) => {
                      const isSectionSelected =
                        mode === 'edit' && selectedSectionId === section.id;
                      return (
                        <section
                          id={`exp-sec-${section.id}`}
                          key={section.id}
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            setSelectedBlockId(null);
                            setShowRightInspector(true);
                          }}
                          style={{
                            ...section.styles,
                            padding: section.styles?.padding || '4rem 0',
                          }}
                          className={`relative group/exp-sec transition-all cursor-pointer ${
                            mode === 'edit'
                              ? isSectionSelected
                                ? 'ring-2 ring-inset ring-blue-600'
                                : 'hover:ring-1 hover:ring-inset hover:ring-blue-400/70'
                              : ''
                          }`}
                        >
                          {/* Floating Section Action Toolbar in Visual Edit Mode */}
                          {mode === 'edit' && canEdit && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className={`absolute top-3 right-3 z-20 flex items-center gap-1 bg-slate-900 text-white px-2 py-1 rounded-lg shadow-md text-xs transition-opacity ${
                                isSectionSelected
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover/exp-sec:opacity-100'
                              }`}
                            >
                              <span className="px-1.5 text-[11px] font-mono tabular-nums text-slate-300">
                                Section {sIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMoveSection(section.id, 'up')}
                                disabled={sIdx === 0}
                                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"
                                title="Move Section Up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSection(section.id, 'down')}
                                disabled={
                                  sIdx === (draftPage.layoutJSON?.sections?.length || 1) - 1
                                }
                                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30"
                                title="Move Section Down"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateSection(section.id)}
                                className="p-1 hover:bg-slate-800 rounded"
                                title="Duplicate Section"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(section.id)}
                                className="p-1 hover:bg-red-600 rounded text-red-300 hover:text-white"
                                title="Delete Section"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}

                          <div
                            className="mx-auto px-6"
                            style={{ maxWidth: globalStyles.containerWidth }}
                          >
                            <div
                              className="grid gap-8"
                              style={{
                                gridTemplateColumns:
                                  viewport === 'mobile'
                                    ? '1fr'
                                    : `repeat(${Math.max(section.columns.length, 1)}, 1fr)`,
                              }}
                            >
                              {section.columns.map(column => (
                                <div key={column.id} className="space-y-6">
                                  {column.blocks.map((block, bIdx) => {
                                    const isBlockSelected = selectedBlockId === block.id;
                                    const isDraggingThis = draggedExpBlockId === block.id;
                                    const showBefore =
                                      mode === 'edit' &&
                                      canEdit &&
                                      expDropTarget?.columnId === column.id &&
                                      expDropTarget?.blockIndex === bIdx &&
                                      expDropTarget?.position === 'before' &&
                                      draggedExpBlockId !== block.id;
                                    const showAfter =
                                      mode === 'edit' &&
                                      canEdit &&
                                      expDropTarget?.columnId === column.id &&
                                      expDropTarget?.blockIndex === bIdx &&
                                      expDropTarget?.position === 'after' &&
                                      draggedExpBlockId !== block.id;

                                    return (
                                      <div
                                        key={block.id}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedSectionId(section.id);
                                          setSelectedBlockId(block.id);
                                          setShowRightInspector(true);
                                        }}
                                        onDragOver={e => {
                                          if (mode !== 'edit' || !canEdit || !draggedExpBlockId) return;
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const pos: 'before' | 'after' =
                                            e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                          setExpDropTarget({
                                            sectionId: section.id,
                                            columnId: column.id,
                                            blockIndex: bIdx,
                                            position: pos,
                                          });
                                        }}
                                        onDrop={e => {
                                          if (mode !== 'edit' || !canEdit) return;
                                          const reorderId =
                                            e.dataTransfer.getData('expReorderBlockId') || draggedExpBlockId;
                                          if (!reorderId) return;
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const pos: 'before' | 'after' =
                                            e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                          handleReorderExpBlock(
                                            reorderId,
                                            section.id,
                                            column.id,
                                            bIdx,
                                            pos
                                          );
                                        }}
                                        className={`relative group/exp-blk cursor-pointer ${
                                          isDraggingThis
                                            ? 'opacity-40 ring-2 ring-dashed ring-blue-500 rounded-lg'
                                            : mode === 'edit' && canEdit
                                              ? isBlockSelected
                                                ? 'rounded-lg ring-2 ring-blue-600 bg-blue-50/10 p-1 -m-1 transition-all'
                                                : 'rounded-lg hover:ring-1 hover:ring-blue-400/60 p-1 -m-1 transition-all'
                                              : ''
                                        }`}
                                      >
                                        {showBefore && (
                                          <div className="h-1 bg-blue-600 rounded-full mb-2 shadow-sm" />
                                        )}
                                        {mode === 'edit' && canEdit && (
                                          <div
                                            className={`absolute -top-2.5 right-1 z-10 transition-opacity flex items-center gap-1 bg-white border border-slate-200 shadow-xs rounded px-1.5 py-0.5 text-[10px] text-slate-500 ${
                                              isBlockSelected
                                                ? 'opacity-100 border-blue-300 text-blue-700'
                                                : 'opacity-0 group-hover/exp-blk:opacity-100'
                                            }`}
                                          >
                                            <div
                                              draggable
                                              onDragStart={e => {
                                                e.stopPropagation();
                                                e.dataTransfer.setData('expReorderBlockId', block.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                                setDraggedExpBlockId(block.id);
                                              }}
                                              onDragEnd={() => {
                                                setDraggedExpBlockId(null);
                                                setExpDropTarget(null);
                                              }}
                                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 p-0.5"
                                              title="Drag to reorder block"
                                            >
                                              <GripVertical size={11} />
                                            </div>
                                            <span className="capitalize font-semibold">
                                              {block.type}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                handleRemoveBlock(
                                                  section.id,
                                                  column.id,
                                                  block.id
                                                );
                                              }}
                                              className="text-slate-400 hover:text-red-600 ml-1"
                                              title="Remove Block"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        )}
                                        <BlockRenderer
                                          block={block}
                                          globalStyles={globalStyles}
                                          pages={pages}
                                          readOnly={mode === 'preview' || !canEdit}
                                          onNavigatePage={handleNavigateBySlugOrUrl}
                                          onUpdate={updates =>
                                            handleUpdateBlock(
                                              section.id,
                                              column.id,
                                              block.id,
                                              updates
                                            )
                                          }
                                          onRemove={() =>
                                            handleRemoveBlock(
                                              section.id,
                                              column.id,
                                              block.id
                                            )
                                          }
                                        />
                                        {showAfter && (
                                          <div className="h-1 bg-blue-600 rounded-full mt-2 shadow-sm" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>

                            {/* Quick Block Inserter Bar inside active section */}
                            {mode === 'edit' && canEdit && isSectionSelected && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="mt-6 pt-4 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-2"
                              >
                                <span className="text-xs font-semibold text-slate-500">
                                  Insert block into section:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {(
                                    [
                                      { type: 'text', label: '+ Text / Heading' },
                                      { type: 'button', label: '+ Button' },
                                      { type: 'image', label: '+ Image' },
                                      { type: 'sitemap', label: '+ Sitemap Directory' },
                                      { type: 'accordion', label: '+ FAQ Accordion' },
                                      { type: 'newsletter', label: '+ Newsletter' },
                                    ] as Array<{ type: BlockType; label: string }>
                                  ).map(item => (
                                    <button
                                      key={item.type}
                                      type="button"
                                      onClick={() =>
                                        handleAddBlockToSection(section.id, item.type)
                                      }
                                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Page, Section & Component Inspector (Opens ONLY when a component or section is clicked) */}
        {showRightInspector &&
          (selectedSectionId || selectedBlockId) &&
          workspaceLayout !== 'sitemap-map' &&
          draftPage && (
            <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sliders size={15} className="text-blue-600 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {selectedBlockContext
                      ? `${selectedBlockContext.block.type.toUpperCase()} Component`
                      : 'Section Inspector'}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleTogglePublish}
                    disabled={!canEdit}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      draftPage.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {draftPage.status === 'published' ? 'Live' : 'Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRightInspector(false);
                      setSelectedSectionId(null);
                      setSelectedBlockId(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close Inspector"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-6 flex-1">
                {/* Selected Component (Block) Inspector */}
                {selectedBlockContext && (
                  <div className="space-y-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 capitalize">
                        Selected {selectedBlockContext.block.type} Settings
                      </h4>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveBlock(
                              selectedBlockContext.section.id,
                              selectedBlockContext.column.id,
                              selectedBlockContext.block.id
                            )
                          }
                          className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      )}
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-500">
                        Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['left', 'center', 'right'] as const).map(align => (
                          <button
                            key={align}
                            type="button"
                            disabled={!canEdit}
                            onClick={() =>
                              handleUpdateBlock(
                                selectedBlockContext.section.id,
                                selectedBlockContext.column.id,
                                selectedBlockContext.block.id,
                                {
                                  styles: {
                                    ...selectedBlockContext.block.styles,
                                    textAlign: align,
                                  },
                                }
                              )
                            }
                            className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                              (selectedBlockContext.block.styles?.textAlign || 'left') === align
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* String content editor for button / image / video */}
                    {(selectedBlockContext.block.type === 'button' ||
                      selectedBlockContext.block.type === 'image' ||
                      selectedBlockContext.block.type === 'video') && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500">
                          {selectedBlockContext.block.type === 'button'
                            ? 'Button Label'
                            : 'Media Source URL'}
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={
                            typeof selectedBlockContext.block.content === 'string'
                              ? selectedBlockContext.block.content
                              : ''
                          }
                          onChange={e =>
                            handleUpdateBlock(
                              selectedBlockContext.section.id,
                              selectedBlockContext.column.id,
                              selectedBlockContext.block.id,
                              { content: e.target.value }
                            )
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Section Styling */}
                {selectedSection && !draftPage.isCustomSite && (
                  <div className="space-y-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">Selected Section Styling</h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {selectedSection.columns.length} col(s)
                      </span>
                    </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Background Surface
                    </label>
                    <div className="flex items-center gap-2">
                      {[
                        { color: '#ffffff', label: 'White' },
                        { color: '#f8fafc', label: 'Slate 50' },
                        { color: '#f1f5f9', label: 'Slate 100' },
                        { color: '#eff6ff', label: 'Blue 50' },
                        { color: '#0f172a', label: 'Dark Slate' },
                      ].map(swatch => (
                        <button
                          key={swatch.color}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            handleUpdateSectionStyles(selectedSection.id, {
                              backgroundColor: swatch.color,
                              color: swatch.color === '#0f172a' ? '#f8fafc' : '#1e293b',
                            })
                          }
                          style={{ backgroundColor: swatch.color }}
                          className={`w-6 h-6 rounded-md border ${
                            selectedSection.styles?.backgroundColor === swatch.color
                              ? 'ring-2 ring-blue-600 border-blue-600'
                              : 'border-slate-300'
                          }`}
                          title={swatch.label}
                        />
                      ))}
                      <input
                        type="color"
                        disabled={!canEdit}
                        value={selectedSection.styles?.backgroundColor || '#ffffff'}
                        onChange={e =>
                          handleUpdateSectionStyles(selectedSection.id, {
                            backgroundColor: e.target.value,
                          })
                        }
                        className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                        title="Custom Background Color"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Vertical Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Compact', value: '2rem 0' },
                        { label: 'Standard', value: '4rem 0' },
                        { label: 'Spacious', value: '6rem 0' },
                      ].map(pad => (
                        <button
                          key={pad.value}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            handleUpdateSectionStyles(selectedSection.id, {
                              padding: pad.value,
                            })
                          }
                          className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                            (selectedSection.styles?.padding || '4rem 0') === pad.value
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {pad.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Page Route & Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Page Identity & Sitemap Path</h4>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Page Title</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draftPage.title}
                    onChange={e =>
                      updateDraftPage(prev => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">
                    URL Slug (Use &quot;/&quot; for nested sitemap paths)
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono">
                    <span className="text-slate-400">/</span>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={draftPage.slug}
                      onChange={e =>
                        updateDraftPage(prev => ({
                          ...prev,
                          slug: e.target.value.replace(/^\/+/, ''),
                        }))
                      }
                      className="w-full bg-transparent text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Quick SEO Metadata */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">SEO & Search Snippet</h4>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Meta Title</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draftPage.seo?.metaTitle || ''}
                    placeholder={draftPage.title}
                    onChange={e =>
                      updateDraftPage(prev => ({
                        ...prev,
                        seo: { ...prev.seo, metaTitle: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    disabled={!canEdit}
                    value={draftPage.seo?.metaDescription || ''}
                    placeholder="Brief summary for search engines and sitemap..."
                    onChange={e =>
                      updateDraftPage(prev => ({
                        ...prev,
                        seo: { ...prev.seo, metaDescription: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Inspector Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDeletePage(draftPage.id)}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete Page</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenFullEditor(draftPage.id)}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Advanced Studio Editor</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Version History Modal */}
      {draftPage && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          page={draftPage}
          globalStyles={globalStyles}
          currentUser={draftPage.author || 'Admin'}
          canEdit={canEdit}
          onUpdatePage={async updatedPage => {
            setDraftPage(JSON.parse(JSON.stringify(updatedPage)));
            setHasUnsavedChanges(false);
            await onSavePage(updatedPage);
          }}
        />
      )}
    </div>
  );
};
