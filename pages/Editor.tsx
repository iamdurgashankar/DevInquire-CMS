import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useCMS } from "../App";
import {
  ChevronLeft,
  Save,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Layers,
  Plus,
  X,
  Search,
  ChevronRight,
  Palette,
  Type,
  Image as ImageIcon,
  MousePointer2,
  Play,
  SeparatorVertical,
  Code,
  Columns,
  LayoutPanelLeft,
  Trash2,
  GripVertical,
  Eye,
  Box,
  ListTree,
  FileText,
  Home,
  Download,
  Maximize2,
  Move,
  Repeat,
  Undo2,
  Redo2,
  Copy,
  ExternalLink,
  FolderOpen,
  Smile,
  List,
  DollarSign,
  Share2,
  ChevronDown,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  LogOut,
  Pipette,
  MapPin,
  Quote,
  Grid,
  Minus,
  Hash,
  Activity,
  Trello,
  CheckSquare,
  Check,
  AlertCircle,
  Mail,
  Info,
  CheckCircle,
  AlertTriangle,
  Star,
  Heart,
  ArrowRight,
  Sparkles,
  Wand2,
  BrainCircuit,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  Page,
  Section,
  Column,
  Block,
  BlockType,
  LayoutJSON,
  Template,
  GlobalStyles,
  URLRewrite,
  MediaItem,
} from "../types";
import { BLOCK_DEFS, COLUMN_LAYOUTS } from "../constants";
import { generatePageIdea, refineContent, suggestColorPalette, suggestBlockStyles, suggestNextItems } from "../services/geminiService";

import { BlockRenderer } from '../components/BlockRenderer';
import { QuickInserterModal, PREBUILT_SECTION_KITS, SectionKit } from '../components/QuickInserterModal';
import { FloatingBlockToolbar } from '../components/FloatingBlockToolbar';
import { FloatingSectionToolbar } from '../components/FloatingSectionToolbar';
import { BlockInsertionDivider } from '../components/BlockInsertionDivider';
import { AssetLibrarySidebar } from '../components/AssetLibrarySidebar';

const Editor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    pages,
    setPages,
    templates,
    setTemplates,
    globalStyles,
    setGlobalStyles,
    socket,
    syncPage,
    syncTemplate,
    deletePageOnServer,
    rewrites,
    setRewrites,
    syncRewrite,
    deleteRewriteOnServer,
    media,
    setMedia,
    syncMedia,
    deleteMediaOnServer,
  } = useCMS();
  const [page, setPage] = useState<Page | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [otherCursors, setOtherCursors] = useState<Record<string, { x: number, y: number }>>({});
  const isRemoteUpdate = React.useRef(false);

  // Real-time collaboration
  useEffect(() => {
    if (!id || !socket) return;

    const user = {
      id: socket.id,
      name: `User ${socket.id?.substring(0, 4)}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    };

    socket.emit("join-page", { pageId: id, user });

    socket.on("page-updated", (updatedPage: Page) => {
      isRemoteUpdate.current = true;
      setPage(updatedPage);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 100);
    });

    socket.on("page-state", (initialPage: Page) => {
      isRemoteUpdate.current = true;
      setPage(initialPage);
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 100);
    });

    socket.on("users-updated", (users: any[]) => {
      setActiveUsers(users);
    });

    socket.on("cursor-updated", ({ socketId, cursor }: any) => {
      setOtherCursors(prev => ({ ...prev, [socketId]: cursor }));
    });

    const handleMouseMove = (e: MouseEvent) => {
      socket.emit("cursor-move", {
        pageId: id,
        cursor: { x: e.clientX, y: e.clientY }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      socket.off("page-updated");
      socket.off("users-updated");
      socket.off("cursor-updated");
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [id, socket]);

  useEffect(() => {
    if (!page || !id || isRemoteUpdate.current || isInternalChange.current) return;

    const timer = setTimeout(() => {
      socket.emit("update-page", { pageId: id, pageData: page });
    }, 500);

    return () => clearTimeout(timer);
  }, [page, id, socket]);

  const [template, setTemplate] = useState<Template | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "blocks" | "settings" | "layers" | "code" | "pages" | "templates" | "ai" | "media"
  >("blocks");
  const [pickerTab, setPickerTab] = useState<"structure" | "templates">(
    "structure",
  );
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    // Clear AI vibe suggestions when changing blocks
    setStyleVibe("");
  }, [selectedBlockId]);

  const [showLayoutPicker, setShowLayoutPicker] = useState<{
    index: number;
    position: "above" | "below" | "end";
  } | null>(null);
  const [quickInserter, setQuickInserter] = useState<{
    isOpen: boolean;
    columnId?: string;
    sectionIndex?: number;
    blockIndex?: number;
    title?: string;
  }>({
    isOpen: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(
    null,
  );
  const [draggedBlockType, setDraggedBlockType] = useState<BlockType | null>(
    null,
  );
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(
    null,
  );
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [draggedAsset, setDraggedAsset] = useState<MediaItem | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // AI Style Vibe States
  const [styleVibe, setStyleVibe] = useState("");
  const [isGeneratingStyles, setIsGeneratingStyles] = useState(false);

  // AI Architect State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);

  // Undo/Redo State
  const [history, setHistory] = useState<Page[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isInternalChange = React.useRef(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "resize-iframe" &&
        event.data.blockId
      ) {
        const iframe = document.getElementById(
          `iframe-${event.data.blockId}`,
        ) as HTMLIFrameElement;
        if (iframe) {
          // Only apply if the height is set to auto
          if (!iframe.style.height || iframe.style.height === "auto") {
            iframe.style.height = `${event.data.height}px`;
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const foundPage = pages.find((p) => p.id === id);
    if (foundPage) {
      setPage({ ...foundPage });
      setTemplate(null);
      return;
    }

    const foundTemplate = templates.find((t) => t.id === id);
    if (foundTemplate) {
      setTemplate({ ...foundTemplate });
      // Create a mock page object for the editor to work with
      const mockPage: Page = {
        id: foundTemplate.id,
        title: foundTemplate.name,
        slug: `template-${foundTemplate.id}`,
        status: "draft",
        seo: { metaTitle: "", metaDescription: "", keywords: "", ogImage: "" },
        layoutJSON:
          foundTemplate.type === "page"
            ? (foundTemplate.layoutJSON as LayoutJSON)
            : {
                sections: [foundTemplate.layoutJSON as Section],
                layoutVersion: "1.0",
              },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: foundTemplate.createdBy,
        isCustomSite: foundTemplate.isCustomSite,
        customHTML: foundTemplate.customHTML,
        customCSS: foundTemplate.customCSS,
        customJS: foundTemplate.customJS,
      };
      setPage(mockPage);
      return;
    }

    navigate("/");
  }, [id, pages, templates, navigate]);

  // Auto-save logic
  useEffect(() => {
    if (!page) return;
    const timer = setInterval(() => {
      handleSave(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [page]);

  const handleSaveTemplate = () => {
    if (!page) return;
    const name = prompt("Enter template name:", `${page.title} Template`);
    if (!name) return;

    const id = `tpl_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: Template = {
      id,
      name,
      type: "page",
      createdBy: "Admin",
      layoutJSON: JSON.parse(JSON.stringify(page.layoutJSON)),
      isCustomSite: !!page.isCustomSite,
      ...(page.customHTML ? { customHTML: page.customHTML } : {}),
      ...(page.customCSS ? { customCSS: page.customCSS } : {}),
      ...(page.customJS ? { customJS: page.customJS } : {}),
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    syncTemplate(newTemplate);
    alert("Template saved successfully!");
  };

  const handleSave = (silent = false) => {
    if (!page) return;
    if (!silent) setIsSaving(true);

    try {
      if (template) {
        // Saving a template
        const updatedTemplate: Template = {
          ...template,
          name: page.title,
          layoutJSON:
            template.type === "page"
              ? page.layoutJSON
              : page.layoutJSON.sections[0],
          isCustomSite: !!page.isCustomSite,
          ...(page.customHTML ? { customHTML: page.customHTML } : {}),
          ...(page.customCSS ? { customCSS: page.customCSS } : {}),
          ...(page.customJS ? { customJS: page.customJS } : {}),
        };
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? updatedTemplate : t)),
        );
        syncTemplate(updatedTemplate);
      } else {
        // Saving a page
        const updatedPage: Page = {
          ...page,
          updatedAt: new Date().toISOString(),
          isCustomSite: !!page.isCustomSite,
          ...(page.customHTML ? { customHTML: page.customHTML } : {}),
          ...(page.customCSS ? { customCSS: page.customCSS } : {}),
          ...(page.customJS ? { customJS: page.customJS } : {}),
        };
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? updatedPage : p)),
        );
        syncPage(updatedPage);
      }

      if (!silent) {
        setTimeout(() => {
          setIsSaving(false);
          setShowSuccess(true);
          toast.success("Changes saved successfully!");
          setTimeout(() => setShowSuccess(false), 2000);
        }, 800);
      }
    } catch (error) {
      console.error("Save error:", error);
      if (!silent) {
        setIsSaving(false);
        toast.error("Failed to save changes. Please try again.");
      }
    }
  };

  const downloadPage = () => {
    if (!page) return;
    let content = "";
    let filename = "";
    let mimeType = "";

    if (page.isCustomSite) {
      // For custom sites, download the HTML
      content = page.customHTML || "";
      filename = `${page.slug || "site"}.html`;
      mimeType = "text/html";
    } else {
      // For CMS pages, download the JSON
      content = JSON.stringify(page, null, 2);
      filename = `${page.slug || "page"}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  // Undo/Redo Logic
  useEffect(() => {
    if (page && history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(page))]);
      setHistoryIndex(0);
    }
  }, [page, history.length]);

  useEffect(() => {
    if (!page || isInternalChange.current) return;

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        const lastState = newHistory[newHistory.length - 1];

        if (lastState && JSON.stringify(lastState) === JSON.stringify(page)) {
          return prev;
        }

        const updatedHistory = [
          ...newHistory,
          JSON.parse(JSON.stringify(page)),
        ];
        if (updatedHistory.length > 50) updatedHistory.shift();

        setHistoryIndex(updatedHistory.length - 1);
        return updatedHistory;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [page, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      isInternalChange.current = true;
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setPage(JSON.parse(JSON.stringify(prevState)));
      setHistoryIndex(prevIndex);
      setTimeout(() => {
        isInternalChange.current = false;
      }, 100);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isInternalChange.current = true;
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setPage(JSON.parse(JSON.stringify(nextState)));
      setHistoryIndex(nextIndex);
      setTimeout(() => {
        isInternalChange.current = false;
      }, 100);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  const updateLayout = (newLayout: LayoutJSON) => {
    if (!page) return;
    setPage({ ...page, layoutJSON: newLayout });
  };

  const addSection = (layout: number[] | Section, atIndex: number) => {
    if (!page) return;

    let newSection: Section;

    if (Array.isArray(layout)) {
      newSection = {
        id: `sec_${Math.random().toString(36).substr(2, 5)}`,
        columns: layout.map((width) => ({
          id: `col_${Math.random().toString(36).substr(2, 5)}`,
          width,
          blocks: [],
        })),
        styles: { padding: "40px 0" },
      };
    } else {
      // It's a template section
      newSection = JSON.parse(JSON.stringify(layout));
      newSection.id = `sec_${Math.random().toString(36).substr(2, 5)}`;
    }

    const newSections = [...page.layoutJSON.sections];
    newSections.splice(atIndex, 0, newSection);
    updateLayout({ ...page.layoutJSON, sections: newSections });
    setShowLayoutPicker(null);
  };

  const removeSection = (sectionId: string) => {
    setConfirmModal({
      show: true,
      title: "Delete Section",
      message: "Are you sure you want to delete this section? This action cannot be undone.",
      onConfirm: () => {
        if (!page) return;
        const newSections = page.layoutJSON.sections.filter(
          (s) => s.id !== sectionId,
        );
        updateLayout({ ...page.layoutJSON, sections: newSections });
        if (selectedBlockId === sectionId) setSelectedBlockId(null);
        setConfirmModal((prev) => ({ ...prev, show: false }));
      },
    });
  };

  const addBlockToColumn = (columnId: string, type: BlockType) => {
    addBlockToColumnAtIndex(columnId, type);
  };

  const addBlockToColumnAtIndex = (columnId: string, type: BlockType, index?: number) => {
    if (!page) return;
    const newBlock: Block = {
      id: `blk_${Math.random().toString(36).substr(2, 5)}`,
      type,
      content: getDefaultContent(type),
      styles: { padding: "10px", textAlign: "left" },
      settings: {},
    };

    const newSections = page.layoutJSON.sections
      .filter((s) => !!s)
      .map((sec) => ({
        ...sec,
        columns: sec.columns.map((col) => {
          if (col.id !== columnId) return col;
          const blocks = [...col.blocks];
          if (index !== undefined && index >= 0 && index <= blocks.length) {
            blocks.splice(index, 0, newBlock);
          } else {
            blocks.push(newBlock);
          }
          return { ...col, blocks };
        }),
      }));
    updateLayout({ ...page.layoutJSON, sections: newSections });
    setSelectedBlockId(newBlock.id);
    toast.success(`Added ${type.toUpperCase()} block`);
  };

  const duplicateBlock = (blockId: string) => {
    if (!page) return;
    let duplicatedId = '';
    const newSections = page.layoutJSON.sections.map((sec) => ({
      ...sec,
      columns: sec.columns.map((col) => {
        const idx = col.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) return col;
        const orig = col.blocks[idx];
        const clone: Block = {
          ...JSON.parse(JSON.stringify(orig)),
          id: `blk_${Math.random().toString(36).substr(2, 5)}`,
        };
        duplicatedId = clone.id;
        const blocks = [...col.blocks];
        blocks.splice(idx + 1, 0, clone);
        return { ...col, blocks };
      }),
    }));
    updateLayout({ ...page.layoutJSON, sections: newSections });
    if (duplicatedId) {
      setSelectedBlockId(duplicatedId);
      toast.success("Block duplicated");
    }
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!page) return;
    const newSections = page.layoutJSON.sections.map((sec) => ({
      ...sec,
      columns: sec.columns.map((col) => {
        const idx = col.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) return col;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= col.blocks.length) return col;
        const blocks = [...col.blocks];
        const [moved] = blocks.splice(idx, 1);
        blocks.splice(targetIdx, 0, moved);
        return { ...col, blocks };
      }),
    }));
    updateLayout({ ...page.layoutJSON, sections: newSections });
  };

  const duplicateSection = (sectionId: string) => {
    if (!page) return;
    const secIdx = page.layoutJSON.sections.findIndex((s) => s.id === sectionId);
    if (secIdx === -1) return;
    const orig = page.layoutJSON.sections[secIdx];
    const clone: Section = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `sec_${Math.random().toString(36).substr(2, 5)}`,
      columns: orig.columns.map((c) => ({
        ...JSON.parse(JSON.stringify(c)),
        id: `col_${Math.random().toString(36).substr(2, 5)}`,
        blocks: c.blocks.map((b) => ({
          ...JSON.parse(JSON.stringify(b)),
          id: `blk_${Math.random().toString(36).substr(2, 5)}`,
        })),
      })),
    };
    const newSections = [...page.layoutJSON.sections];
    newSections.splice(secIdx + 1, 0, clone);
    updateLayout({ ...page.layoutJSON, sections: newSections });
    setSelectedBlockId(clone.id);
    toast.success("Section duplicated");
  };

  const moveSection = (sectionIndex: number, direction: 'up' | 'down') => {
    if (!page) return;
    const targetIdx = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    if (targetIdx < 0 || targetIdx >= page.layoutJSON.sections.length) return;
    const newSections = [...page.layoutJSON.sections];
    const [moved] = newSections.splice(sectionIndex, 1);
    newSections.splice(targetIdx, 0, moved);
    updateLayout({ ...page.layoutJSON, sections: newSections });
  };

  const addColumnToSection = (sectionId: string) => {
    if (!page) return;
    const newSections = page.layoutJSON.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const count = sec.columns.length + 1;
      const width = Math.floor(100 / count);
      const newCol: Column = {
        id: `col_${Math.random().toString(36).substr(2, 5)}`,
        width,
        blocks: [],
      };
      return {
        ...sec,
        columns: [...sec.columns.map((c) => ({ ...c, width })), newCol],
      };
    });
    updateLayout({ ...page.layoutJSON, sections: newSections });
    toast.success("Column added");
  };

  const setSectionColumnLayout = (sectionId: string, widths: number[]) => {
    if (!page) return;
    const newSections = page.layoutJSON.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const currentCols = [...sec.columns];
      const newCols: Column[] = widths.map((w, idx) => {
        if (currentCols[idx]) {
          return { ...currentCols[idx], width: w };
        }
        return {
          id: `col_${Math.random().toString(36).substr(2, 5)}`,
          width: w,
          blocks: [],
        };
      });
      return { ...sec, columns: newCols };
    });
    updateLayout({ ...page.layoutJSON, sections: newSections });
    toast.success("Layout grid updated");
  };

  const insertSectionKit = (kit: SectionKit, atIndex?: number) => {
    if (!page) return;
    const newSec: Section = {
      id: `sec_${Math.random().toString(36).substr(2, 5)}`,
      styles: { ...kit.section.styles },
      columns: kit.section.columns.map((c) => ({
        id: `col_${Math.random().toString(36).substr(2, 5)}`,
        width: c.width,
        blocks: c.blocks.map((b) => ({
          ...b,
          id: `blk_${Math.random().toString(36).substr(2, 5)}`,
        })),
      })),
    };
    const targetIdx = atIndex !== undefined ? atIndex : page.layoutJSON.sections.length;
    const newSections = [...page.layoutJSON.sections];
    newSections.splice(targetIdx, 0, newSec);
    updateLayout({ ...page.layoutJSON, sections: newSections });
    setSelectedBlockId(newSec.id);
    toast.success(`Inserted ${kit.name}`);
  };

  const saveSectionAsTemplate = (sectionId: string) => {
    if (!page) return;
    const sec = page.layoutJSON.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const name = prompt("Enter a name for this Section Template:", "Custom Section");
    if (!name) return;
    const tpl: Template = {
      id: `tpl_${Math.random().toString(36).substr(2, 5)}`,
      name,
      description: "Saved from page editor",
      type: "section",
      layoutJSON: JSON.parse(JSON.stringify(sec)),
      category: "custom",
      preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400",
      createdAt: new Date().toISOString(),
      author: "Editor User",
      createdBy: "Editor User",
    };
    setTemplates((prev) => [...prev, tpl]);
    syncTemplate(tpl);
    toast.success(`Saved "${name}" as template!`);
  };

  const updateBlockQuickStyles = (blockId: string, styleUpdates: Partial<Block['styles']>) => {
    if (!page) return;
    const newSections = page.layoutJSON.sections.map((sec) => ({
      ...sec,
      columns: sec.columns.map((col) => ({
        ...col,
        blocks: col.blocks.map((blk) =>
          blk.id === blockId ? { ...blk, styles: { ...blk.styles, ...styleUpdates } } : blk,
        ),
      })),
    }));
    updateLayout({ ...page.layoutJSON, sections: newSections });
  };

  const updateSectionQuickStyles = (sectionId: string, styleUpdates: Partial<Section['styles']>) => {
    if (!page) return;
    const newSections = page.layoutJSON.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, styles: { ...sec.styles, ...styleUpdates } } : sec,
    );
    updateLayout({ ...page.layoutJSON, sections: newSections });
  };

  const handleGenerateBlueprint = async () => {
    if (!aiPrompt || !page) return;
    setIsGeneratingBlueprint(true);
    try {
      const idea = await generatePageIdea(aiPrompt);
      
      const newSections = idea.sections.map((sec: any) => ({
        id: `sec_${Math.random().toString(36).substr(2, 5)}`,
        columns: [
          {
            id: `col_${Math.random().toString(36).substr(2, 5)}`,
            width: 100,
            blocks: sec.suggestedBlocks.map((block: any) => ({
              id: `blk_${Math.random().toString(36).substr(2, 5)}`,
              type: block.type as BlockType,
              content: block.content || getDefaultContent(block.type as BlockType),
              styles: { padding: "10px", textAlign: "left" },
              settings: {},
            }))
          }
        ],
        styles: { padding: "60px 0" },
      }));

      const updatedPage = {
        ...page,
        layoutJSON: {
          ...page.layoutJSON,
          sections: [...page.layoutJSON.sections, ...newSections]
        }
      };
      
      setPage(updatedPage);
      syncPage(updatedPage);
      setAiPrompt("");
      toast.success(`AI Blueprint generated: ${idea.title}`);
    } catch (error) {
      toast.error("Failed to generate blueprint.");
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const updateElement = (id: string, updates: any) => {
    if (!page) return;
    const newSections = page.layoutJSON.sections
      .filter((s) => !!s)
      .map((sec) => {
        if (sec.id === id) {
          return { ...sec, ...updates };
        }
        return {
          ...sec,
          columns: sec.columns.map((col) => ({
            ...col,
            blocks: col.blocks.map((blk) =>
              blk.id === id ? { ...blk, ...updates } : blk,
            ),
          })),
        };
      });
    updateLayout({ ...page.layoutJSON, sections: newSections });
  };

  const handleGenerateVibeStyles = async () => {
    const currentId = selectedBlockId;
    if (!styleVibe || !currentId) {
      toast.error("Please enter a vibe first");
      return;
    }
    
    const element = getSelectedBlock();
    if (!element) return;

    setIsGeneratingStyles(true);
    try {
      const contentStr = typeof element.content === 'string' 
        ? element.content 
        : JSON.stringify(element.content);
        
      const response = await suggestBlockStyles(element.type, contentStr, styleVibe);
      
      // Check if we still have the same element selected
      if (response && response.styles && selectedBlockId === currentId) {
        updateElement(currentId, {
          styles: {
            ...element.styles,
            ...response.styles
          }
        });
        toast.success(`Applied ${styleVibe} styles!`);
      }
    } catch (err) {
      console.error("AI Styling Error:", err);
      toast.error("Failed to generate AI styles. Please try again.");
    } finally {
      setIsGeneratingStyles(false);
    }
  };

  const removeBlock = (blockId: string) => {
    setConfirmModal({
      show: true,
      title: "Delete Block",
      message: "Are you sure you want to delete this block? This action cannot be undone.",
      onConfirm: () => {
        if (!page) return;
        const newSections = page.layoutJSON.sections
          .filter((s) => !!s)
          .map((sec) => ({
            ...sec,
            columns: sec.columns.map((col) => ({
              ...col,
              blocks: col.blocks.filter((blk) => blk.id !== blockId),
            })),
          }));
        updateLayout({ ...page.layoutJSON, sections: newSections });
        setSelectedBlockId(null);
        setConfirmModal((prev) => ({ ...prev, show: false }));
      },
    });
  };

  const getSelectedBlock = () => {
    if (!selectedBlockId || !page) return null;
    for (const sec of page.layoutJSON.sections) {
      if (sec.id === selectedBlockId)
        return {
          id: sec.id,
          type: "section" as any,
          styles: sec.styles,
          content: "",
          settings: {},
        };
      for (const col of sec.columns) {
        const blk = col.blocks.find((b) => b.id === selectedBlockId);
        if (blk) return blk;
      }
    }
    return null;
  };

  const onDragStartSidebar = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("blockType", type);
    setDraggedBlockType(type);
    setDraggedTemplateId(null);
    setDraggedPageId(null);
    setDraggedAsset(null);
  };

  const onDragStartAsset = (e: React.DragEvent, asset: MediaItem) => {
    e.dataTransfer.setData("mediaUrl", asset.url);
    e.dataTransfer.setData("mediaName", asset.name);
    e.dataTransfer.setData("mediaType", asset.type || "image/jpeg");
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    setDraggedAsset(asset);
    setDraggedBlockType(null);
    setDraggedTemplateId(null);
    setDraggedPageId(null);
  };

  const onDragStartTemplate = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData("templateId", templateId);
    setDraggedTemplateId(templateId);
    setDraggedBlockType(null);
    setDraggedPageId(null);
    setDraggedAsset(null);
  };

  const onDragStartPage = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData("pageId", pageId);
    setDraggedPageId(pageId);
    setDraggedBlockType(null);
    setDraggedTemplateId(null);
    setDraggedAsset(null);
  };

  const insertAssetIntoColumn = (
    columnId: string, 
    mediaUrl: string, 
    mediaName: string, 
    mediaType: string, 
    atIndex?: number
  ) => {
    if (!page) return;
    const blockId = `blk_${Math.random().toString(36).substr(2, 5)}`;
    let newBlock: Block;

    if (mediaType.startsWith("video")) {
      newBlock = {
        id: blockId,
        type: "video",
        content: mediaUrl,
        styles: { padding: "10px", width: "100%", borderRadius: "12px" },
        settings: {},
      };
    } else if (mediaType.includes("pdf") || mediaType.includes("document") || mediaUrl.endsWith(".pdf")) {
      newBlock = {
        id: blockId,
        type: "button",
        content: `Download ${mediaName}`,
        styles: {
          textAlign: "center",
          padding: "14px 28px",
          borderRadius: "10px",
          backgroundColor: "#2563eb",
          color: "#ffffff",
        },
        settings: {
          linkUrl: mediaUrl,
          download: true,
        },
      };
    } else {
      newBlock = {
        id: blockId,
        type: "image",
        content: mediaUrl,
        styles: {
          padding: "0px",
          textAlign: "center",
          width: "100%",
          borderRadius: "12px",
        },
        settings: {
          alt: mediaName,
        },
      };
    }

    const newSections = page.layoutJSON.sections
      .filter((s) => !!s)
      .map((sec) => ({
        ...sec,
        columns: sec.columns.map((col) => {
          if (col.id !== columnId) return col;
          const blocks = [...col.blocks];
          if (atIndex !== undefined && atIndex >= 0 && atIndex <= blocks.length) {
            blocks.splice(atIndex, 0, newBlock);
          } else {
            blocks.push(newBlock);
          }
          return { ...col, blocks };
        }),
      }));

    updateLayout({ ...page.layoutJSON, sections: newSections });
    setSelectedBlockId(newBlock.id);
    toast.success(`Inserted ${mediaName} into canvas`);
  };

  const insertAssetIntoCanvas = (asset: MediaItem) => {
    if (!page) return;

    if (page.layoutJSON.sections.length === 0) {
      const sectionId = `sec_${Math.random().toString(36).substr(2, 5)}`;
      const columnId = `col_${Math.random().toString(36).substr(2, 5)}`;
      const blockId = `blk_${Math.random().toString(36).substr(2, 5)}`;
      const newBlock: Block = {
        id: blockId,
        type: (asset.type && asset.type.startsWith("video")) ? "video" : "image",
        content: asset.url,
        styles: { padding: "0px", textAlign: "center", width: "100%", borderRadius: "12px" },
        settings: { alt: asset.name },
      };
      const newSection: Section = {
        id: sectionId,
        columns: [{ id: columnId, width: 100, blocks: [newBlock] }],
        styles: { padding: "40px 0" },
      };
      updateLayout({ ...page.layoutJSON, sections: [newSection] });
      setSelectedBlockId(newBlock.id);
      toast.success(`Added ${asset.name} to page`);
      return;
    }

    let targetColId = '';
    let targetBlockIdx: number | undefined = undefined;

    if (selectedBlockId) {
      const sec = page.layoutJSON.sections.find((s) => s.id === selectedBlockId);
      if (sec && sec.columns.length > 0) {
        targetColId = sec.columns[0].id;
      } else {
        for (const s of page.layoutJSON.sections) {
          for (const c of s.columns) {
            const bIdx = c.blocks.findIndex((b) => b.id === selectedBlockId);
            if (bIdx !== -1) {
              targetColId = c.id;
              targetBlockIdx = bIdx + 1;
              break;
            }
          }
          if (targetColId) break;
        }
      }
    }

    if (!targetColId) {
      const lastSec = page.layoutJSON.sections[page.layoutJSON.sections.length - 1];
      targetColId = lastSec.columns[lastSec.columns.length - 1].id;
    }

    insertAssetIntoColumn(targetColId, asset.url, asset.name, asset.type || 'image/jpeg', targetBlockIdx);
  };

  const setAssetAsBackground = (asset: MediaItem) => {
    if (!page || page.layoutJSON.sections.length === 0) return;
    const targetSectionId = selectedBlockId && page.layoutJSON.sections.some((s) => s.id === selectedBlockId)
      ? selectedBlockId
      : page.layoutJSON.sections[0].id;

    const newSections = page.layoutJSON.sections.map((sec) => {
      if (sec.id === targetSectionId) {
        return {
          ...sec,
          styles: {
            ...sec.styles,
            backgroundImage: asset.url,
            backgroundSize: 'cover' as const,
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat' as const,
          },
        };
      }
      return sec;
    });

    updateLayout({ ...page.layoutJSON, sections: newSections });
    toast.success(`Set ${asset.name} as section background`);
  };

  const handleUploadMedia = (files: FileList | File[]) => {
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newMedia: MediaItem = {
          id: `med_${Math.random().toString(36).substr(2, 9)}`,
          url: base64,
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          createdAt: new Date().toISOString(),
          category: file.type?.includes('pdf') ? 'document' : 'image',
        };
        setMedia((prev) => [newMedia, ...prev]);
        syncMedia(newMedia);
        toast.success(`Uploaded ${file.name} to Firestore`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteMedia = (mediaId: string) => {
    setConfirmModal({
      show: true,
      title: "Delete Media Asset",
      message: "Are you sure you want to delete this asset from Firestore? This action cannot be undone.",
      onConfirm: () => {
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
        deleteMediaOnServer(mediaId);
        setConfirmModal((prev) => ({ ...prev, show: false }));
        toast.success("Asset deleted from Firestore");
      },
    });
  };

  const handleAddFromUrl = (url: string, name: string, category?: string) => {
    const newMedia: MediaItem = {
      id: `med_${Math.random().toString(36).substr(2, 9)}`,
      url,
      name,
      type: url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      size: 150000,
      createdAt: new Date().toISOString(),
      category: (category as any) || 'image',
    };
    setMedia((prev) => [newMedia, ...prev]);
    syncMedia(newMedia);
  };

  const handleDropOnCanvas = (e: React.DragEvent, atIndex?: number) => {
    e.preventDefault();
    if (!page) return;

    const mediaUrl = e.dataTransfer.getData("mediaUrl") || draggedAsset?.url;
    const mediaName = e.dataTransfer.getData("mediaName") || draggedAsset?.name || "Asset";
    const mediaType = e.dataTransfer.getData("mediaType") || draggedAsset?.type || "image/jpeg";

    if (mediaUrl) {
      const sectionId = `sec_${Math.random().toString(36).substr(2, 5)}`;
      const columnId = `col_${Math.random().toString(36).substr(2, 5)}`;
      const blockId = `blk_${Math.random().toString(36).substr(2, 5)}`;

      let newBlock: Block;
      if (mediaType.startsWith("video")) {
        newBlock = {
          id: blockId,
          type: "video",
          content: mediaUrl,
          styles: { padding: "10px", width: "100%", borderRadius: "12px" },
          settings: {},
        };
      } else if (mediaType.includes("pdf") || mediaType.includes("document") || mediaUrl.endsWith(".pdf")) {
        newBlock = {
          id: blockId,
          type: "button",
          content: `Download ${mediaName}`,
          styles: { textAlign: "center", padding: "14px 28px", borderRadius: "10px", backgroundColor: "#2563eb", color: "#ffffff" },
          settings: { linkUrl: mediaUrl, download: true },
        };
      } else {
        newBlock = {
          id: blockId,
          type: "image",
          content: mediaUrl,
          styles: { padding: "0px", textAlign: "center", width: "100%", borderRadius: "12px" },
          settings: { alt: mediaName },
        };
      }

      const newSection: Section = {
        id: sectionId,
        columns: [{ id: columnId, width: 100, blocks: [newBlock] }],
        styles: { padding: "40px 0" },
      };

      const targetIdx = atIndex !== undefined ? atIndex : page.layoutJSON.sections.length;
      const newSections = [...page.layoutJSON.sections];
      newSections.splice(targetIdx, 0, newSection);
      updateLayout({ ...page.layoutJSON, sections: newSections });
      setSelectedBlockId(newBlock.id);
      toast.success(`Inserted ${mediaName} into new section`);
      setDraggedAsset(null);
      return;
    }

    const blockType =
      (e.dataTransfer.getData("blockType") as BlockType) || draggedBlockType;
    const templateId =
      e.dataTransfer.getData("templateId") || draggedTemplateId;
    const pageId = e.dataTransfer.getData("pageId") || draggedPageId;

    if (blockType) {
      onWidgetClick(blockType);
    } else if (templateId) {
      const foundTemplate = templates.find((t) => t.id === templateId);
      if (foundTemplate) {
        if (foundTemplate.type === "section") {
          addSection(
            foundTemplate.layoutJSON as Section,
            atIndex ?? page.layoutJSON.sections.length,
          );
        } else {
          const sections = (foundTemplate.layoutJSON as LayoutJSON).sections;
          const newSections = [...page.layoutJSON.sections];
          newSections.splice(
            atIndex ?? page.layoutJSON.sections.length,
            0,
            ...JSON.parse(JSON.stringify(sections)),
          );
          updateLayout({ ...page.layoutJSON, sections: newSections });
        }
      }
    } else if (pageId) {
      const foundPage = pages.find((p) => p.id === pageId);
      if (foundPage) {
        const sections = foundPage.layoutJSON.sections;
        const newSections = [...page.layoutJSON.sections];
        newSections.splice(
          atIndex ?? page.layoutJSON.sections.length,
          0,
          ...JSON.parse(JSON.stringify(sections)),
        );
        updateLayout({ ...page.layoutJSON, sections: newSections });
      }
    }

    setDraggedBlockType(null);
    setDraggedTemplateId(null);
    setDraggedPageId(null);
    setDraggedAsset(null);
  };

  const handleDeletePage = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (pages.length <= 1) {
      alert("You cannot delete the last page.");
      return;
    }
    setConfirmModal({
      show: true,
      title: "Delete Page",
      message:
        "Are you sure you want to delete this page? This action cannot be undone.",
      onConfirm: () => {
        setPages((prev) => prev.filter((p) => p.id !== pageId));
        deletePageOnServer(pageId);
        if (id === pageId) {
          const otherPage = pages.find((p) => p.id !== pageId);
          if (otherPage) {
            navigate(`/editor/${otherPage.id}`);
          } else {
            navigate("/");
          }
        }
        setConfirmModal((prev) => ({ ...prev, show: false }));
      },
    });
  };

  const onWidgetClick = (type: BlockType) => {
    if (!page) return;

    // If a block is selected, add after it in the same column
    // If a section is selected, add to its first column
    // Otherwise add to the last column of the last section
    // If no sections, create one

    if (page.layoutJSON.sections.length === 0) {
      const sectionId = `sec_${Math.random().toString(36).substr(2, 5)}`;
      const columnId = `col_${Math.random().toString(36).substr(2, 5)}`;
      const newBlock: Block = {
        id: `blk_${Math.random().toString(36).substr(2, 5)}`,
        type,
        content: getDefaultContent(type),
        styles: { padding: "10px", textAlign: "left" },
        settings: {},
      };

      const newSection: Section = {
        id: sectionId,
        columns: [{ id: columnId, width: 100, blocks: [newBlock] }],
        styles: { padding: "40px 0" },
      };

      updateLayout({ ...page.layoutJSON, sections: [newSection] });
      setSelectedBlockId(newBlock.id);
      setActiveTab("settings");
      return;
    }

    // Try to find a suitable column
    let targetColumnId = "";

    if (selectedBlockId) {
      // Check if selected is a section
      const section = page.layoutJSON.sections.find(
        (s) => s.id === selectedBlockId,
      );
      if (section && section.columns.length > 0) {
        targetColumnId = section.columns[0].id;
      } else {
        // Check if selected is a block
        for (const sec of page.layoutJSON.sections) {
          for (const col of sec.columns) {
            if (col.blocks.some((b) => b.id === selectedBlockId)) {
              targetColumnId = col.id;
              break;
            }
          }
          if (targetColumnId) break;
        }
      }
    }

    if (!targetColumnId) {
      // Default to last column of last section
      const lastSection =
        page.layoutJSON.sections[page.layoutJSON.sections.length - 1];
      targetColumnId = lastSection.columns[lastSection.columns.length - 1].id;
    }

    addBlockToColumn(targetColumnId, type);
  };

  const onDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedOverColumn !== columnId) setDraggedOverColumn(columnId);
  };

  const onDropOnColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const mediaUrl = e.dataTransfer.getData("mediaUrl") || draggedAsset?.url;
    const mediaName = e.dataTransfer.getData("mediaName") || draggedAsset?.name || "Asset";
    const mediaType = e.dataTransfer.getData("mediaType") || draggedAsset?.type || "image/jpeg";

    if (mediaUrl) {
      insertAssetIntoColumn(columnId, mediaUrl, mediaName, mediaType);
      setDraggedOverColumn(null);
      setDraggedAsset(null);
      setDraggedBlockType(null);
      return;
    }

    const type =
      (e.dataTransfer.getData("blockType") as BlockType) || draggedBlockType;
    const templateId =
      e.dataTransfer.getData("templateId") || draggedTemplateId;
    const pageId = e.dataTransfer.getData("pageId") || draggedPageId;

    if (type) {
      addBlockToColumn(columnId, type);
    } else if (templateId || pageId) {
      // If dropping a template/page on a column, insert it as a new section after the current section
      const sectionIdx = page?.layoutJSON.sections.findIndex((s) =>
        s.columns.some((c) => c.id === columnId),
      );
      if (sectionIdx !== undefined && sectionIdx !== -1) {
        handleDropOnCanvas(e, sectionIdx + 1);
      }
    }

    setDraggedOverColumn(null);
    setDraggedBlockType(null);
    setDraggedTemplateId(null);
    setDraggedPageId(null);
    setDraggedAsset(null);
  };

  if (!page) return null;

  const selectedElement = getSelectedBlock();

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden text-slate-300 relative">
      {/* Exit Preview Button */}
      {isPreview && (
        <button
          onClick={() => setIsPreview(false)}
          className="fixed top-6 right-6 z-[100] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm transition-all hover:scale-105 active:scale-95"
        >
          <X size={18} />
          <span>Exit Preview</span>
        </button>
      )}

      {/* Top Header */}
      {!isPreview && (
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-400"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">
              {page.title}
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-tight">
              /{page.slug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            className={`p-1.5 rounded transition-colors ${historyIndex > 0 ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 cursor-not-allowed"}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`p-1.5 rounded transition-colors ${historyIndex < history.length - 1 ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 cursor-not-allowed"}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
          {(["desktop", "tablet", "mobile"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`p-1.5 rounded-md transition-all ${viewMode === mode ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              {mode === "desktop" ? (
                <Monitor size={16} />
              ) : mode === "tablet" ? (
                <Tablet size={16} />
              ) : (
                <Smartphone size={16} />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Active Users */}
          <div className="flex -space-x-2 mr-4">
            {activeUsers.filter((u, index, self) => 
              index === self.findIndex((t) => (t.socketId || t.id) === (u.socketId || u.id))
            ).map((u, uIdx) => (
              <div
                key={u.socketId || u.id || `active-user-${uIdx}`}
                className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {(u.name || 'U').substring(0, 2).toUpperCase()}
              </div>
            ))}
          </div>

          {!template && (
            <button
              id="editor-save-template"
              type="button"
              onClick={handleSaveTemplate}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <Copy size={16} />
              <span>Save as Template</span>
            </button>
          )}
          <button
            id="editor-preview"
            type="button"
            onClick={() => setIsPreview(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            id="editor-download"
            type="button"
            onClick={downloadPage}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          <button
            id="editor-publish"
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || showSuccess}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-bold transition-all shadow-lg ${
              showSuccess 
                ? "bg-green-600 text-white shadow-green-900/20" 
                : isSaving 
                  ? "bg-blue-600/70 text-white cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20"
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : showSuccess ? (
              <Check size={16} className="animate-in zoom-in duration-300" />
            ) : (
              <Save size={16} />
            )}
            <span>
              {isSaving ? "Saving..." : showSuccess ? "Saved!" : "Publish"}
            </span>
          </button>
          <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>
          <button 
            id="editor-logout"
            onClick={() => {
              localStorage.removeItem('devinquire_auth');
              navigate('/landing');
            }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
    )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidepanel */}
        {!isPreview && (
          <aside className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-40">
          {/* Tab Navigation */}
          <div className="grid grid-cols-4 border-b border-slate-700 bg-slate-800/80">
            <TabButton
              id="tab-widgets"
              active={activeTab === "blocks"}
              onClick={() => setActiveTab("blocks")}
              icon={<LayoutPanelLeft size={16} />}
              label="Widgets"
            />
            <TabButton
              id="tab-assets"
              active={activeTab === "media"}
              onClick={() => setActiveTab("media")}
              icon={<FolderOpen size={16} className={activeTab === 'media' ? 'text-blue-400' : ''} />}
              label="Assets"
            />
            <TabButton
              id="tab-templates"
              active={activeTab === "templates"}
              onClick={() => setActiveTab("templates")}
              icon={<Copy size={16} />}
              label="Templates"
            />
            <TabButton
              id="tab-pages"
              active={activeTab === "pages"}
              onClick={() => setActiveTab("pages")}
              icon={<FileText size={16} />}
              label="Pages"
            />
            <TabButton
              id="tab-ai"
              active={activeTab === "ai"}
              onClick={() => setActiveTab("ai")}
              icon={<Sparkles size={16} className={activeTab === 'ai' ? 'text-blue-400' : 'text-slate-400'} />}
              label="AI"
            />
            <TabButton
              id="tab-design"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              icon={<Settings size={16} />}
              label="Design"
            />
            <TabButton
              id="tab-layers"
              active={activeTab === "layers"}
              onClick={() => setActiveTab("layers")}
              icon={<ListTree size={16} />}
              label="Layers"
            />
            {page.isCustomSite ? (
              <TabButton
                active={activeTab === "code"}
                onClick={() => setActiveTab("code")}
                icon={<Code size={16} />}
                label="Code"
              />
            ) : (
              <div className="border-t border-slate-700/30 flex items-center justify-center py-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                CMS
              </div>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto custom-scrollbar bg-slate-800 ${activeTab === 'media' ? 'p-0 overflow-hidden' : 'p-4'}`}>
            {/* ASSET LIBRARY PANEL */}
            {activeTab === "media" && (
              <div className="h-full flex flex-col">
                <AssetLibrarySidebar
                  media={media}
                  onDragStartAsset={onDragStartAsset}
                  onInsertAsset={insertAssetIntoCanvas}
                  onSetAsBackground={setAssetAsBackground}
                  onUploadMedia={handleUploadMedia}
                  onDeleteMedia={handleDeleteMedia}
                  onAddFromUrl={handleAddFromUrl}
                  selectedBlockId={selectedBlockId}
                />
              </div>
            )}

            {/* WIDGETS PANEL */}
            {activeTab === "blocks" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Search widgets..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Layouts & Structure
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() =>
                        setShowLayoutPicker({
                          index: page.layoutJSON.sections.length,
                          position: "end",
                        })
                      }
                      className="group flex flex-col gap-2 text-left"
                    >
                      <div className="aspect-video bg-slate-900 border border-slate-700 rounded-lg overflow-hidden group-hover:border-blue-500 transition-all relative flex items-center justify-center">
                        <Columns size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors px-1 uppercase tracking-wider">
                        Columns / Layout
                      </span>
                    </button>
                  </div>

                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Basic Elements
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {BLOCK_DEFS.map((block) => (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={(e) => onDragStartSidebar(e, block.type)}
                        onClick={() => onWidgetClick(block.type)}
                        className="group flex flex-col gap-2 cursor-grab active:cursor-grabbing"
                      >
                        <div className="aspect-video bg-slate-900 border border-slate-700 rounded-lg overflow-hidden group-hover:border-blue-500 transition-all relative">
                          <div className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                            {block.preview}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                          <div className="absolute bottom-2 left-2 text-slate-400 group-hover:text-blue-400 transition-colors">
                            {block.icon}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors px-1 uppercase tracking-wider">
                          {block.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <AIAssistant 
                page={page} 
                selectedBlockId={selectedBlockId}
                onUpdatePage={(updates) => setPage(prev => prev ? { ...prev, ...updates } : null)}
                onUpdateStyles={(styles) => setGlobalStyles(prev => ({ ...prev, ...styles }))}
                onAddSection={(layout, index) => addSection(layout, index)}
                onUpdateElement={updateElement}
              />
            )}

            {/* MEDIA PANEL */}
            {activeTab === "media" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Media Library
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {media.length === 0 ? (
                    <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-700 rounded-xl">
                      <FolderOpen size={32} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-[10px] text-slate-500 italic">No media found</p>
                    </div>
                  ) : (
                    media.map((item) => (
                      <div 
                        key={item.id} 
                        className="group relative aspect-square bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500 transition-all cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          toast.success("Image URL copied to clipboard");
                        }}
                      >
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Copy size={16} className="text-white" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* DESIGN PANEL */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {!selectedBlockId ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <FileText size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Page Settings
                      </h3>
                    </div>

                    <div className="space-y-4 p-1 mb-6">
                      <ControlGroup label="Page Title" tooltip="The title of the page as it appears in the dashboard and browser tab.">
                        <input
                          type="text"
                          value={page.title}
                          onChange={(e) => setPage({ ...page, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                        />
                      </ControlGroup>
                      <ControlGroup label="URL Slug" tooltip="The URL path for this page (e.g., /about-us).">
                        <div className="flex items-center">
                          <span className="text-xs text-slate-500 mr-1">/</span>
                          <input
                            type="text"
                            value={page.slug}
                            onChange={(e) => setPage({ ...page, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                          />
                        </div>
                      </ControlGroup>
                    </div>

                    <div className="flex items-center gap-2 px-1 mb-2">
                      <Palette size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Global Styles
                      </h3>
                    </div>

                    <div className="space-y-4 p-1">
                      <ControlGroup 
                        label="Typography"
                        tooltip="Set the default fonts for your entire website."
                      >
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label 
                              className="text-[10px] font-bold text-slate-500 uppercase cursor-help"
                              title="The font used for all H1-H6 heading elements."
                            >
                              Primary Font (Headings)
                            </label>
                            <select
                              value={globalStyles.headingFont}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  headingFont: e.target.value,
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                            >
                              <option>Inter</option>
                              <option>Playfair Display</option>
                              <option>Space Grotesk</option>
                              <option>Outfit</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label 
                              className="text-[10px] font-bold text-slate-500 uppercase cursor-help"
                              title="The font used for paragraphs and standard UI text."
                            >
                              Secondary Font (Body)
                            </label>
                            <select
                              value={globalStyles.bodyFont}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  bodyFont: e.target.value,
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                            >
                              <option>Inter</option>
                              <option>Roboto</option>
                              <option>Open Sans</option>
                              <option>Lato</option>
                            </select>
                          </div>
                        </div>
                      </ControlGroup>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Palette size={14} className="text-slate-500" />
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Theme Colors
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ColorControl
                            label="Primary"
                            tooltip="The main brand color used for buttons, links, and highlights."
                            value={globalStyles.primaryColor}
                            onChange={(val) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                primaryColor: val,
                              }))
                            }
                          />
                          <ColorControl
                            label="Secondary"
                            tooltip="A supporting color used for secondary actions and UI elements."
                            value={globalStyles.secondaryColor}
                            onChange={(val) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                secondaryColor: val,
                              }))
                            }
                          />
                          <ColorControl
                            label="Accent"
                            tooltip="A high-contrast color for special highlights and call-to-actions."
                            value={globalStyles.accentColor}
                            onChange={(val) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                accentColor: val,
                              }))
                            }
                          />
                          <ColorControl
                            label="Background"
                            tooltip="The default background color for all pages."
                            value={globalStyles.backgroundColor}
                            onChange={(val) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                backgroundColor: val,
                              }))
                            }
                          />
                          <ColorControl
                            label="Text"
                            tooltip="The default color for all body text and content."
                            value={globalStyles.textColor}
                            onChange={(val) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                textColor: val,
                              }))
                            }
                          />
                        </div>
                        <GradientControl
                          label="Global Background Gradient"
                          tooltip="Apply a background gradient across the entire site."
                          value={globalStyles.backgroundGradient || ""}
                          onChange={(val) =>
                            setGlobalStyles((prev) => ({
                              ...prev,
                              backgroundGradient: val,
                            }))
                          }
                        />
                      </div>

                      <ControlGroup 
                        label="Layout"
                        tooltip="Global layout settings for spacing and corners."
                      >
                        <div className="space-y-1">
                          <label 
                            className="text-[10px] font-bold text-slate-500 uppercase cursor-help"
                            title="The default corner roundness for all buttons, cards, and inputs."
                          >
                            Border Radius
                          </label>
                          <input
                            type="text"
                            value={globalStyles.borderRadius}
                            onChange={(e) =>
                              setGlobalStyles((prev) => ({
                                ...prev,
                                borderRadius: e.target.value,
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                            placeholder="8px"
                          />
                        </div>
                      </ControlGroup>
                    </div>

                    <div className="text-center py-6 border-t border-slate-700/50 mt-4">
                      <p className="text-[10px] text-slate-500 italic mb-4 px-4">
                        Select an element on the canvas to edit its unique
                        properties.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("blocks")}
                        className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        Browse Widgets
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Box size={14} className="text-blue-400" />
                        {selectedElement?.type} Settings
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeBlock(selectedBlockId!)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Magic AI Style Generator */}
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-400" />
                        <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                          Magic Vibe Styling
                        </h4>
                      </div>
                      <p className="text-[9px] text-slate-400 italic">
                        Enter a vibe (e.g., "Cyberpunk", "Minimalist Apple", "Retro 80s") and let AI style this element.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={styleVibe}
                          onChange={(e) => setStyleVibe(e.target.value)}
                          placeholder="Style vibe..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && styleVibe && !isGeneratingStyles) {
                              handleGenerateVibeStyles();
                            }
                          }}
                        />
                        <button
                          onClick={handleGenerateVibeStyles}
                          disabled={isGeneratingStyles || !styleVibe}
                          className={`p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed`}
                          title="Apply Vibe"
                        >
                          {isGeneratingStyles ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Wand2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {selectedElement?.type === "section" && (
                        <>
                          <ControlGroup 
                            label="Section Background"
                            tooltip="Customize the background of this entire section."
                          >
                            <div className="space-y-4 pt-2">
                              <ColorControl
                                label="Background Color"
                                tooltip="The solid color that fills the section background."
                                value={selectedElement?.styles?.backgroundColor || "#ffffff"}
                                onChange={(val) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      backgroundColor: val,
                                    },
                                  })
                                }
                              />

                              <GradientControl
                                label="Background Gradient"
                                tooltip="Apply a linear gradient over the section background."
                                value={selectedElement?.styles?.backgroundImage?.startsWith('linear-gradient') ? selectedElement.styles.backgroundImage : ""}
                                onChange={(val) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      backgroundImage: val,
                                    },
                                  })
                                }
                              />

                              <div className="space-y-1">
                                <label 
                                  className="text-[9px] font-bold text-slate-500 uppercase block cursor-help"
                                  title="The URL of an image to use as the section background."
                                >
                                  Background Image URL
                                </label>
                                <div className="relative group">
                                  <input
                                    type="text"
                                    value={
                                      selectedElement?.styles
                                        ?.backgroundImage || ""
                                    }
                                    onChange={(e) =>
                                      updateElement(selectedBlockId!, {
                                        styles: {
                                          ...selectedElement?.styles,
                                          backgroundImage: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all pr-8"
                                    placeholder="https://images.unsplash.com/..."
                                  />
                                  {selectedElement?.styles?.backgroundImage && (
                                    <button
                                      onClick={() =>
                                        updateElement(selectedBlockId!, {
                                          styles: {
                                            ...selectedElement?.styles,
                                            backgroundImage: "",
                                          },
                                        })
                                      }
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {selectedElement?.styles?.backgroundImage && (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label 
                                        className="text-[9px] font-bold text-slate-500 uppercase block cursor-help"
                                        title="How the background image should be resized to fit the section."
                                      >
                                        Size
                                      </label>
                                      <select
                                        value={
                                          selectedElement?.styles
                                            ?.backgroundSize || "cover"
                                        }
                                        onChange={(e) =>
                                          updateElement(selectedBlockId!, {
                                            styles: {
                                              ...selectedElement?.styles,
                                              backgroundSize: e.target
                                                .value as any,
                                            },
                                          })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                                      >
                                        <option value="cover">Cover</option>
                                        <option value="contain">Contain</option>
                                        <option value="auto">Auto</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label 
                                        className="text-[9px] font-bold text-slate-500 uppercase block cursor-help"
                                        title="The starting position of the background image."
                                      >
                                        Position
                                      </label>
                                      <select
                                        value={
                                          selectedElement?.styles
                                            ?.backgroundPosition ||
                                          "center center"
                                        }
                                        onChange={(e) =>
                                          updateElement(selectedBlockId!, {
                                            styles: {
                                              ...selectedElement?.styles,
                                              backgroundPosition:
                                                e.target.value,
                                            },
                                          })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                                      >
                                        <option value="center center">
                                          Center
                                        </option>
                                        <option value="top center">Top</option>
                                        <option value="bottom center">
                                          Bottom
                                        </option>
                                        <option value="center left">
                                          Left
                                        </option>
                                        <option value="center right">
                                          Right
                                        </option>
                                        <option value="top left">
                                          Top Left
                                        </option>
                                        <option value="top right">
                                          Top Right
                                        </option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label 
                                      className="text-[9px] font-bold text-slate-500 uppercase block cursor-help"
                                      title="Whether the background image should repeat if it's smaller than the section."
                                    >
                                      Repeat
                                    </label>
                                    <select
                                      value={
                                        selectedElement?.styles
                                          ?.backgroundRepeat || "no-repeat"
                                      }
                                      onChange={(e) =>
                                        updateElement(selectedBlockId!, {
                                          styles: {
                                            ...selectedElement?.styles,
                                            backgroundRepeat: e.target
                                              .value as any,
                                          },
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                                    >
                                      <option value="no-repeat">
                                        No Repeat
                                      </option>
                                      <option value="repeat">
                                        Repeat Both
                                      </option>
                                      <option value="repeat-x">Repeat X</option>
                                      <option value="repeat-y">Repeat Y</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </ControlGroup>
                        </>
                      )}

                      <ControlGroup 
                        label="Alignment"
                        tooltip="Set the horizontal alignment of the content within this element."
                      >
                        <div className="flex gap-1 bg-slate-900 p-1 rounded-md border border-slate-700">
                          {["left", "center", "right"].map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    textAlign: align as any,
                                  },
                                })
                              }
                              className={`flex-1 py-1.5 px-2 text-[10px] rounded font-bold uppercase transition-all ${selectedElement?.styles?.textAlign === align ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </ControlGroup>

                      <div className="grid grid-cols-2 gap-4">
                        <ControlGroup 
                          label="Padding (px)"
                          tooltip="The space between the element's content and its border."
                        >
                          <input
                            type="text"
                            value={selectedElement?.styles?.padding || "0px"}
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                styles: {
                                  ...selectedElement?.styles,
                                  padding: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          />
                        </ControlGroup>
                        <ControlGroup 
                          label="Border Radius"
                          tooltip="The roundness of the element's corners."
                        >
                          <input
                            type="text"
                            value={
                              selectedElement?.styles?.borderRadius || "0px"
                            }
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                styles: {
                                  ...selectedElement?.styles,
                                  borderRadius: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          />
                        </ControlGroup>
                      </div>

                      <div className="pt-4 border-t border-slate-700/50 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Border Settings
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                          <ControlGroup 
                            label="Border Width"
                            tooltip="The thickness of the element's border."
                          >
                            <input
                              type="text"
                              placeholder="e.g. 1px"
                              value={
                                selectedElement?.styles?.borderWidth || "0px"
                              }
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    borderWidth: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ColorControl
                            label="Border Color"
                            tooltip="The color of the element's border."
                            value={selectedElement?.styles?.borderColor || "#000000"}
                            onChange={(val) =>
                              updateElement(selectedBlockId!, {
                                styles: {
                                  ...selectedElement?.styles,
                                  borderColor: val,
                                },
                              })
                            }
                          />
                        </div>

                        <ControlGroup 
                          label="Border Style"
                          tooltip="The pattern of the element's border (solid, dashed, etc.)."
                        >
                          <select
                            value={
                              selectedElement?.styles?.borderStyle || "none"
                            }
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                styles: {
                                  ...selectedElement?.styles,
                                  borderStyle: e.target.value as any,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                          >
                            <option value="none">None</option>
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                          </select>
                        </ControlGroup>

                        <div className="pt-4 border-t border-slate-700/50 space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Advanced Styles
                          </h4>

                          <div className="grid grid-cols-2 gap-4">
                            <ColorControl
                              label="Text Color"
                              tooltip="The color of the text within this element."
                              value={selectedElement?.styles?.color || "#000000"}
                              onChange={(val) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    color: val,
                                  },
                                })
                              }
                            />
                            <ColorControl
                              label="Background Color"
                              tooltip="The solid background color for this specific element."
                              value={selectedElement?.styles?.backgroundColor || "transparent"}
                              onChange={(val) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    backgroundColor: val,
                                  },
                                })
                              }
                            />

                            <GradientControl
                              label="Background Gradient"
                              tooltip="Apply a linear gradient background to this element."
                              value={selectedElement?.styles?.backgroundImage?.startsWith('linear-gradient') ? selectedElement.styles.backgroundImage : ""}
                              onChange={(val) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    backgroundImage: val,
                                  },
                                })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <ControlGroup 
                              label="Display"
                              tooltip="How the element is treated in the layout flow (e.g. block vs inline)."
                            >
                              <select
                                value={
                                  selectedElement?.styles?.display || "block"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      display: e.target.value as any,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                              >
                                <option value="block">Block</option>
                                <option value="inline-block">Inline-Block</option>
                                <option value="flex">Flex</option>
                                <option value="grid">Grid</option>
                                <option value="none">None</option>
                              </select>
                            </ControlGroup>
                            <OpacitySlider
                              label="Opacity"
                              tooltip="The transparency level of the element (0 is invisible, 100% is solid)."
                              value={Number(selectedElement?.styles?.opacity ?? 1)}
                              onChange={(val) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    opacity: String(val),
                                  },
                                })
                              }
                            />
                            <ControlGroup 
                              label="Z-Index"
                              tooltip="The stack order of the element (higher numbers appear on top)."
                            >
                              <input
                                type="number"
                                value={selectedElement?.styles?.zIndex || 0}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      zIndex: parseInt(e.target.value),
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <ControlGroup 
                              label="Width"
                              tooltip="The horizontal size of the element."
                            >
                              <input
                                type="text"
                                placeholder="e.g. 100% or 200px"
                                value={selectedElement?.styles?.width || "auto"}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      width: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup 
                              label="Height"
                              tooltip="The vertical size of the element."
                            >
                              <input
                                type="text"
                                placeholder="e.g. auto or 300px"
                                value={
                                  selectedElement?.styles?.height || "auto"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      height: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <ControlGroup 
                              label="Margin (px)"
                              tooltip="The space outside the element's border, separating it from others."
                            >
                              <input
                                type="text"
                                placeholder="e.g. 10px"
                                value={selectedElement?.styles?.margin || "0px"}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      margin: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup 
                              label="Box Shadow"
                              tooltip="Apply a shadow effect around the element's frame."
                            >
                              <input
                                type="text"
                                placeholder="e.g. 0 4px 6px rgba(0,0,0,0.1)"
                                value={
                                  selectedElement?.styles?.boxShadow || "none"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      boxShadow: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <ControlGroup 
                              label="Font Size"
                              tooltip="The size of the text within this element."
                            >
                              <input
                                type="text"
                                placeholder="e.g. 16px"
                                value={
                                  selectedElement?.styles?.fontSize || "inherit"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      fontSize: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup 
                              label="Font Weight"
                              tooltip="The thickness or boldness of the text."
                            >
                              <select
                                value={
                                  selectedElement?.styles?.fontWeight ||
                                  "normal"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      fontWeight: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                              >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                                <option value="300">300</option>
                                <option value="400">400</option>
                                <option value="500">500</option>
                                <option value="600">600</option>
                                <option value="700">700</option>
                                <option value="800">800</option>
                                <option value="900">900</option>
                              </select>
                            </ControlGroup>
                          </div>

                          <ControlGroup 
                            label="Custom CSS"
                            tooltip="Add raw CSS properties to this element for advanced styling."
                          >
                            <textarea
                              placeholder="e.g. filter: blur(2px); opacity: 0.8;"
                              value={selectedElement?.styles?.customCSS || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    customCSS: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-20 font-mono"
                            />
                          </ControlGroup>
                        </div>
                      </div>

                      {(selectedElement?.type === "code" || selectedElement?.type === "embed") && (
                        <div className="space-y-4">
                          <ControlGroup 
                            label="Widget Height"
                            tooltip="The fixed height of the code widget container."
                          >
                            <input
                              type="text"
                              value={selectedElement?.content?.height || "200px"}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    height: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              placeholder="e.g. 300px or auto"
                            />
                          </ControlGroup>
                          <ControlGroup 
                            label="HTML Content"
                            tooltip="The raw HTML structure for this widget."
                          >
                            <textarea
                              value={selectedElement?.content?.html || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    html: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-32 font-mono"
                              placeholder="<div>...</div>"
                            />
                          </ControlGroup>
                          <ControlGroup 
                            label="Custom CSS"
                            tooltip="CSS styles specific to this code widget."
                          >
                            <textarea
                              value={selectedElement?.content?.css || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    css: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-32 font-mono"
                              placeholder=".my-class { ... }"
                            />
                          </ControlGroup>
                          <ControlGroup 
                            label="Custom JS"
                            tooltip="JavaScript code to run when this widget is loaded."
                          >
                            <textarea
                              value={selectedElement?.content?.js || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    js: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-32 font-mono"
                              placeholder="console.log('hello');"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "form" && (
                        <div className="space-y-4">
                          <ControlGroup 
                            label="Form Title"
                            tooltip="The main heading displayed at the top of the form."
                          >
                            <input
                              type="text"
                              value={selectedElement?.content?.title || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    title: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup 
                            label="Description"
                            tooltip="Subtext or instructions displayed below the form title."
                          >
                            <textarea
                              value={selectedElement?.content?.description || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    description: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-20"
                            />
                          </ControlGroup>
                          <ControlGroup 
                            label="Submit Button Text"
                            tooltip="The label displayed on the form's submission button."
                          >
                            <input
                              type="text"
                              value={selectedElement?.content?.buttonText || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(selectedElement?.content || {}),
                                    buttonText: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <div className="space-y-2">
                            <label 
                              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-help"
                              title="The individual input fields that make up your form."
                            >
                              Form Fields
                            </label>
                            <div className="space-y-2">
                              {(selectedElement?.content?.fields || []).map(
                                (field: any, index: number) => (
                                  <div
                                    key={field.id || field.label || `form-field-${index}`}
                                    className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        Field #{index + 1}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const newFields = [
                                            ...selectedElement.content.fields,
                                          ];
                                          newFields.splice(index, 1);
                                          updateElement(selectedBlockId!, {
                                            content: {
                                              ...selectedElement.content,
                                              fields: newFields,
                                            },
                                          });
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Label"
                                      value={field.label}
                                      onChange={(e) => {
                                        const newFields = [
                                          ...selectedElement.content.fields,
                                        ];
                                        newFields[index] = {
                                          ...field,
                                          label: e.target.value,
                                        };
                                        updateElement(selectedBlockId!, {
                                          content: {
                                            ...selectedElement.content,
                                            fields: newFields,
                                          },
                                        });
                                      }}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <select
                                        value={field.type}
                                        onChange={(e) => {
                                          const newFields = [
                                            ...selectedElement.content.fields,
                                          ];
                                          newFields[index] = {
                                            ...field,
                                            type: e.target.value,
                                          };
                                          updateElement(selectedBlockId!, {
                                            content: {
                                              ...selectedElement.content,
                                              fields: newFields,
                                            },
                                          });
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                      >
                                        <option value="text">Text</option>
                                        <option value="email">Email</option>
                                        <option value="number">Number</option>
                                        <option value="textarea">Textarea</option>
                                      </select>
                                      <label className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <input
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={(e) => {
                                            const newFields = [
                                              ...selectedElement.content.fields,
                                            ];
                                            newFields[index] = {
                                              ...field,
                                              required: e.target.checked,
                                            };
                                            updateElement(selectedBlockId!, {
                                              content: {
                                                ...selectedElement.content,
                                                fields: newFields,
                                              },
                                            });
                                          }}
                                        />
                                        Required
                                      </label>
                                    </div>
                                  </div>
                                ),
                              )}
                              <button
                                onClick={() => {
                                  const newField = {
                                    id: `field_${Math.random().toString(36).substr(2, 5)}`,
                                    label: "New Field",
                                    type: "text",
                                    placeholder: "",
                                    required: false,
                                  };
                                  updateElement(selectedBlockId!, {
                                    content: {
                                      ...selectedElement.content,
                                      fields: [
                                        ...(selectedElement.content.fields ||
                                          []),
                                        newField,
                                      ],
                                    },
                                  });
                                }}
                                className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all"
                              >
                                + Add Field
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "map" && (
                        <div className="space-y-4">
                          <ControlGroup label="Map Address" tooltip="The location to display on the map.">
                            <input
                              type="text"
                              value={selectedElement?.content?.address || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, address: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              placeholder="e.g. New York, NY"
                            />
                          </ControlGroup>
                          <ControlGroup label="Zoom Level" tooltip="The initial zoom level of the map (1-20).">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={selectedElement?.content?.zoom || 12}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, zoom: parseInt(e.target.value) } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "testimonial" && (
                        <div className="space-y-4">
                          <ControlGroup label="Quote" tooltip="The testimonial text.">
                            <textarea
                              value={selectedElement?.content?.quote || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, quote: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-24"
                            />
                          </ControlGroup>
                          <ControlGroup label="Author Name" tooltip="The name of the person giving the testimonial.">
                            <input
                              type="text"
                              value={selectedElement?.content?.author || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, author: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Role / Company" tooltip="The author's job title or company.">
                            <input
                              type="text"
                              value={selectedElement?.content?.role || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, role: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Avatar URL" tooltip="The URL of the author's profile picture.">
                            <input
                              type="text"
                              value={selectedElement?.content?.avatar || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, avatar: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "gallery" && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gallery Images</label>
                          <div className="space-y-2">
                            {(selectedElement?.content || []).map((img: string, idx: number) => (
                              <div key={idx} className="flex gap-2">
                                <input
                                  type="text"
                                  value={img}
                                  onChange={(e) => {
                                    const newGallery = [...selectedElement.content];
                                    newGallery[idx] = e.target.value;
                                    updateElement(selectedBlockId!, { content: newGallery });
                                  }}
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const newGallery = [...selectedElement.content];
                                    newGallery.splice(idx, 1);
                                    updateElement(selectedBlockId!, { content: newGallery });
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => updateElement(selectedBlockId!, { content: [...(selectedElement.content || []), ""] })}
                              className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all"
                            >
                              + Add Image
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "divider" && (
                        <div className="space-y-4">
                          <ColorControl
                            label="Divider Color"
                            value={selectedElement?.content?.color || "#e2e8f0"}
                            onChange={(val) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, color: val } })}
                          />
                          <ControlGroup label="Thickness (px)" tooltip="The height of the divider line.">
                            <input
                              type="number"
                              value={selectedElement?.content?.thickness || 2}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, thickness: parseInt(e.target.value) } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Width" tooltip="The horizontal width of the divider.">
                            <input
                              type="text"
                              value={selectedElement?.content?.width || "100%"}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, width: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Style" tooltip="The line style (solid, dashed, dotted).">
                            <select
                              value={selectedElement?.content?.style || "solid"}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, style: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                            >
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                            </select>
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "counter" && (
                        <div className="space-y-4">
                          <ControlGroup label="Target Number" tooltip="The number the counter will count up to.">
                            <input
                              type="number"
                              value={selectedElement?.content?.number || 0}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, number: parseInt(e.target.value) } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Label" tooltip="The text displayed below the number.">
                            <input
                              type="text"
                              value={selectedElement?.content?.label || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, label: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <div className="grid grid-cols-2 gap-4">
                            <ControlGroup label="Prefix" tooltip="Text displayed before the number.">
                              <input
                                type="text"
                                value={selectedElement?.content?.prefix || ""}
                                onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, prefix: e.target.value } })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup label="Suffix" tooltip="Text displayed after the number.">
                              <input
                                type="text"
                                value={selectedElement?.content?.suffix || ""}
                                onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, suffix: e.target.value } })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "progress" && (
                        <div className="space-y-4">
                          <ControlGroup label="Label" tooltip="The text displayed above the progress bar.">
                            <input
                              type="text"
                              value={selectedElement?.content?.label || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, label: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Percentage" tooltip="The fill level of the progress bar (0-100).">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selectedElement?.content?.percentage || 0}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, percentage: parseInt(e.target.value) } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ColorControl
                            label="Bar Color"
                            value={selectedElement?.content?.color || globalStyles.primaryColor}
                            onChange={(val) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, color: val } })}
                          />
                        </div>
                      )}

                      {selectedElement?.type === "tabs" && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tabs Content</label>
                          <div className="space-y-3">
                            {(selectedElement?.content?.tabs || []).map((tab: any, idx: number) => (
                              <div key={idx} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400">Tab #{idx + 1}</span>
                                  <button
                                    onClick={() => {
                                      const newTabs = [...selectedElement.content.tabs];
                                      newTabs.splice(idx, 1);
                                      updateElement(selectedBlockId!, { content: { ...selectedElement.content, tabs: newTabs } });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Tab Title"
                                  value={tab.title}
                                  onChange={(e) => {
                                    const newTabs = [...selectedElement.content.tabs];
                                    newTabs[idx] = { ...tab, title: e.target.value };
                                    updateElement(selectedBlockId!, { content: { ...selectedElement.content, tabs: newTabs } });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                />
                                <textarea
                                  placeholder="Tab Content"
                                  value={tab.content}
                                  onChange={(e) => {
                                    const newTabs = [...selectedElement.content.tabs];
                                    newTabs[idx] = { ...tab, content: e.target.value };
                                    updateElement(selectedBlockId!, { content: { ...selectedElement.content, tabs: newTabs } });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none h-16"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newTab = { title: "New Tab", content: "Content for new tab" };
                                updateElement(selectedBlockId!, { content: { ...selectedElement.content, tabs: [...(selectedElement.content.tabs || []), newTab] } });
                              }}
                              className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all"
                            >
                              + Add Tab
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "list" && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">List Items</label>
                          <div className="space-y-3">
                            {(selectedElement?.content?.items || []).map((item: any, idx: number) => (
                              <div key={idx} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400">Item #{idx + 1}</span>
                                  <button
                                    onClick={() => {
                                      const newItems = [...selectedElement.content.items];
                                      newItems.splice(idx, 1);
                                      updateElement(selectedBlockId!, { content: { ...selectedElement.content, items: newItems } });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <select
                                    value={item.icon || "Check"}
                                    onChange={(e) => {
                                      const newItems = [...selectedElement.content.items];
                                      newItems[idx] = { ...item, icon: e.target.value };
                                      updateElement(selectedBlockId!, { content: { ...selectedElement.content, items: newItems } });
                                    }}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                  >
                                    <option value="Check">Check</option>
                                    <option value="Smile">Smile</option>
                                    <option value="Star">Star</option>
                                    <option value="Heart">Heart</option>
                                    <option value="ArrowRight">Arrow</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Item Text"
                                    value={item.text}
                                    onChange={(e) => {
                                      const newItems = [...selectedElement.content.items];
                                      newItems[idx] = { ...item, text: e.target.value };
                                      updateElement(selectedBlockId!, { content: { ...selectedElement.content, items: newItems } });
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none"
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newItem = { icon: "Check", text: "New list item" };
                                updateElement(selectedBlockId!, { content: { ...selectedElement.content, items: [...(selectedElement.content.items || []), newItem] } });
                              }}
                              className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-400 transition-all"
                            >
                              + Add Item
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "alert" && (
                        <div className="space-y-4">
                          <ControlGroup label="Alert Type" tooltip="The visual style of the alert.">
                            <select
                              value={selectedElement?.content?.type || "info"}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, type: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-300"
                            >
                              <option value="info">Info</option>
                              <option value="success">Success</option>
                              <option value="warning">Warning</option>
                              <option value="error">Error</option>
                            </select>
                          </ControlGroup>
                          <ControlGroup label="Title" tooltip="The bold heading of the alert.">
                            <input
                              type="text"
                              value={selectedElement?.content?.title || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, title: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Message" tooltip="The detailed message text.">
                            <textarea
                              value={selectedElement?.content?.message || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, message: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-20"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "newsletter" && (
                        <div className="space-y-4">
                          <ControlGroup label="Title" tooltip="The main heading for the newsletter signup.">
                            <input
                              type="text"
                              value={selectedElement?.content?.title || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, title: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Description" tooltip="Supporting text to encourage signups.">
                            <textarea
                              value={selectedElement?.content?.description || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, description: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-20"
                            />
                          </ControlGroup>
                          <ControlGroup label="Button Text" tooltip="The label for the subscribe button.">
                            <input
                              type="text"
                              value={selectedElement?.content?.buttonText || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, buttonText: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <ControlGroup label="Input Placeholder" tooltip="The hint text inside the email input field.">
                            <input
                              type="text"
                              value={selectedElement?.content?.placeholder || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, placeholder: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "button" && (
                        <ControlGroup 
                          label="Button Label"
                          tooltip="The text displayed inside the button."
                        >
                          <input
                            type="text"
                            value={selectedElement?.content || ""}
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                content: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          />
                        </ControlGroup>
                      )}

                      {selectedElement?.type === "nav" && (
                        <div className="space-y-4">
                          <ControlGroup 
                            label="Logo Visibility"
                            tooltip="Toggle whether the logo is visible in the navigation bar."
                          >
                            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                              <span className="text-xs text-slate-400">
                                Display Logo
                              </span>
                              <button
                                onClick={() =>
                                  updateElement(selectedBlockId!, {
                                    content: {
                                      ...selectedElement?.content,
                                      showLogo:
                                        selectedElement?.content?.showLogo ===
                                        false
                                          ? true
                                          : false,
                                    },
                                  })
                                }
                                className={`w-10 h-5 rounded-full transition-all relative ${selectedElement?.content?.showLogo !== false ? "bg-blue-600" : "bg-slate-700"}`}
                              >
                                <div
                                  className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selectedElement?.content?.showLogo !== false ? "left-6" : "left-1"}`}
                                />
                              </button>
                            </div>
                          </ControlGroup>

                          {selectedElement?.content?.showLogo !== false && (
                            <ControlGroup 
                              label="Logo Type"
                              tooltip="Choose between text-only, image-only, or both for your logo."
                            >
                              <div className="flex gap-1 bg-slate-900 p-1 rounded border border-slate-700">
                                {(["text", "image", "both"] as const).map(
                                  (type) => (
                                    <button
                                      key={type}
                                      onClick={() =>
                                        updateElement(selectedBlockId!, {
                                          content: {
                                            ...selectedElement?.content,
                                            logoType: type,
                                          },
                                        })
                                      }
                                      className={`flex-1 py-1.5 text-[9px] rounded font-bold uppercase transition-all ${selectedElement?.content?.logoType === type || (!selectedElement?.content?.logoType && type === "text") ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                      {type}
                                    </button>
                                  )
                                )}
                              </div>
                            </ControlGroup>
                          )}

                          {selectedElement?.content?.showLogo !== false && (
                            <>
                              {(selectedElement?.content?.logoType === "text" ||
                                selectedElement?.content?.logoType === "both" ||
                                !selectedElement?.content?.logoType) && (
                                <ControlGroup 
                                  label="Logo Text"
                                  tooltip="The text to display as your logo."
                                >
                                  <input
                                    type="text"
                                    value={selectedElement?.content?.logo || ""}
                                    onChange={(e) =>
                                      updateElement(selectedBlockId!, {
                                        content: {
                                          ...selectedElement?.content,
                                          logo: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="Logo Text"
                                  />
                                </ControlGroup>
                              )}

                              {(selectedElement?.content?.logoType ===
                                "image" ||
                                selectedElement?.content?.logoType ===
                                  "both") && (
                                <ControlGroup 
                                  label="Logo Image"
                                  tooltip="The URL of the image to use as your logo."
                                >
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={
                                        selectedElement?.content?.logoUrl || ""
                                      }
                                      onChange={(e) =>
                                        updateElement(selectedBlockId!, {
                                          content: {
                                            ...selectedElement?.content,
                                            logoUrl: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                      placeholder="Logo Image URL"
                                    />
                                    <div className="flex items-center justify-center p-4 bg-slate-900 rounded border border-dashed border-slate-700">
                                      {selectedElement?.content?.logoUrl ? (
                                        <img
                                          src={
                                            selectedElement?.content?.logoUrl
                                          }
                                          alt="Preview"
                                          className="max-h-12 w-auto object-contain"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-slate-600 italic">
                                          No image set
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </ControlGroup>
                              )}
                            </>
                          )}
                          <div className="space-y-2">
                            <label 
                              className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-help"
                              title="The links displayed in your navigation menu."
                            >
                              Navigation Links
                            </label>
                            {(selectedElement?.content?.links || []).map(
                              (link: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="space-y-2 p-2 bg-slate-800/50 rounded border border-slate-700"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-500">
                                      Link {idx + 1}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const newLinks = [
                                          ...selectedElement.content.links,
                                        ];
                                        newLinks.splice(idx, 1);
                                        updateElement(selectedBlockId!, {
                                          content: {
                                            ...selectedElement.content,
                                            links: newLinks,
                                          },
                                        });
                                      }}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Label"
                                    value={link.label}
                                    onChange={(e) => {
                                      const newLinks = [
                                        ...selectedElement.content.links,
                                      ];
                                      newLinks[idx] = {
                                        ...newLinks[idx],
                                        label: e.target.value,
                                      };
                                      updateElement(selectedBlockId!, {
                                        content: {
                                          ...selectedElement.content,
                                          links: newLinks,
                                        },
                                      });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="URL"
                                    value={link.url}
                                    onChange={(e) => {
                                      const newLinks = [
                                        ...selectedElement.content.links,
                                      ];
                                      newLinks[idx] = {
                                        ...newLinks[idx],
                                        url: e.target.value,
                                      };
                                      updateElement(selectedBlockId!, {
                                        content: {
                                          ...selectedElement.content,
                                          links: newLinks,
                                        },
                                      });
                                    }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              ),
                            )}
                            <button
                              onClick={() => {
                                const newLinks = [
                                  ...(selectedElement?.content?.links || []),
                                  { label: "New Link", url: "#" },
                                ];
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    links: newLinks,
                                  },
                                });
                              }}
                              className="w-full py-2 border border-dashed border-slate-700 rounded text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                            >
                              + Add Link
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedElement?.type === "html" && (
                        <ControlGroup 
                          label="HTML Source"
                          tooltip="The raw HTML code to be rendered in this block."
                        >
                          <textarea
                            value={selectedElement?.content || ""}
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                content: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all h-48 font-mono"
                            placeholder="<div class='...'>...</div>"
                          />
                        </ControlGroup>
                      )}

                      {selectedElement?.type === "image" && (
                        <ControlGroup 
                          label="Image Source"
                          tooltip="The URL of the image to display."
                        >
                          <input
                            type="text"
                            value={selectedElement?.content || ""}
                            onChange={(e) =>
                              updateElement(selectedBlockId!, {
                                content: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all"
                            placeholder="https://..."
                          />
                        </ControlGroup>
                      )}

                      {selectedElement?.type === "icon" && (
                        <div className="space-y-4">
                          <ControlGroup 
                            label="Icon Name"
                            tooltip="Select the icon to display from the Lucide library."
                          >
                            <select
                              value={
                                selectedElement?.content?.iconName || "Smile"
                              }
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    iconName: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            >
                              {[
                                "Smile",
                                "Facebook",
                                "Twitter",
                                "Instagram",
                                "Linkedin",
                                "Github",
                                "ExternalLink",
                                "Play",
                                "Code",
                              ].map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </ControlGroup>
                          <ControlGroup 
                            label="Icon Size"
                            tooltip="Adjust the size of the icon in pixels."
                          >
                            <input
                              type="range"
                              min="12"
                              max="120"
                              value={selectedElement?.content?.size || 48}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    size: parseInt(e.target.value),
                                  },
                                })
                              }
                              className="w-full"
                            />
                          </ControlGroup>
                          <ColorControl
                            label="Icon Color"
                            value={selectedElement?.content?.color || "#3b82f6"}
                            onChange={(val) =>
                              updateElement(selectedBlockId!, {
                                content: {
                                  ...(typeof selectedElement?.content === "object"
                                    ? selectedElement.content
                                    : {}),
                                  color: val,
                                },
                              })
                            }
                          />
                        </div>
                      )}

                      {selectedElement?.type === "accordion" && (
                        <div className="space-y-4">
                          <label 
                            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-help"
                            title="The collapsible items that make up your accordion."
                          >
                            Accordion Items
                          </label>
                          {(selectedElement?.content || []).map(
                            (item: any, idx: number) => (
                              <div
                                key={idx}
                                className="space-y-2 p-2 bg-slate-800/50 rounded border border-slate-700"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-slate-500">
                                    Item {idx + 1}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const newContent = [
                                        ...selectedElement.content,
                                      ];
                                      newContent.splice(idx, 1);
                                      updateElement(selectedBlockId!, {
                                        content: newContent,
                                      });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Title"
                                  value={item.title}
                                  onChange={(e) => {
                                    const newContent = [
                                      ...selectedElement.content,
                                    ];
                                    newContent[idx] = {
                                      ...newContent[idx],
                                      title: e.target.value,
                                    };
                                    updateElement(selectedBlockId!, {
                                      content: newContent,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <textarea
                                  placeholder="Content"
                                  value={item.content}
                                  onChange={(e) => {
                                    const newContent = [
                                      ...selectedElement.content,
                                    ];
                                    newContent[idx] = {
                                      ...newContent[idx],
                                      content: e.target.value,
                                    };
                                    updateElement(selectedBlockId!, {
                                      content: newContent,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                                />
                              </div>
                            ),
                          )}
                          <button
                            onClick={() => {
                              const newContent = [
                                ...(selectedElement?.content || []),
                                {
                                  title: "New Question",
                                  content: "New answer content goes here...",
                                  isOpen: false,
                                },
                              ];
                              updateElement(selectedBlockId!, {
                                content: newContent,
                              });
                            }}
                            className="w-full py-2 border border-dashed border-slate-700 rounded text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                          >
                            + Add Item
                          </button>
                        </div>
                      )}

                      {selectedElement?.type === "pricing" && (
                        <div className="space-y-4">
                          <ControlGroup 
                            label="Plan Name"
                            tooltip="The name of the pricing plan (e.g., Basic, Pro, Enterprise)."
                          >
                            <input
                              type="text"
                              value={selectedElement?.content?.plan || ""}
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    plan: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          <div className="flex gap-2">
                            <ControlGroup 
                              label="Currency" 
                              className="w-1/3"
                              tooltip="The currency symbol or code (e.g., $, €, USD)."
                            >
                              <input
                                type="text"
                                value={selectedElement?.content?.currency || ""}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    content: {
                                      ...(typeof selectedElement?.content ===
                                      "object"
                                        ? selectedElement.content
                                        : {}),
                                      currency: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup 
                              label="Price" 
                              className="flex-1"
                              tooltip="The numeric price value for this plan."
                            >
                              <input
                                type="text"
                                value={selectedElement?.content?.price || ""}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    content: {
                                      ...(typeof selectedElement?.content ===
                                      "object"
                                        ? selectedElement.content
                                        : {}),
                                      price: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                          </div>
                          <ControlGroup 
                            label="Featured Plan"
                            tooltip="Highlight this plan as the recommended or most popular option."
                          >
                            <button
                              onClick={() =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    isFeatured:
                                      !selectedElement.content.isFeatured,
                                  },
                                })
                              }
                              className={`w-full py-2 rounded text-[10px] font-bold uppercase transition-all ${selectedElement?.content?.isFeatured ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-500"}`}
                            >
                              {selectedElement?.content?.isFeatured
                                ? "Featured"
                                : "Standard"}
                            </button>
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "social" && (
                        <div className="space-y-4">
                          <label 
                            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-help"
                            title="Links to your social media profiles."
                          >
                            Social Links
                          </label>
                          {(selectedElement?.content || []).map(
                            (s: any, idx: number) => (
                              <div
                                key={idx}
                                className="space-y-2 p-2 bg-slate-800/50 rounded border border-slate-700"
                              >
                                <div className="flex items-center justify-between">
                                  <select
                                    value={s.icon}
                                    onChange={(e) => {
                                      const newContent = [
                                        ...selectedElement.content,
                                      ];
                                      newContent[idx] = {
                                        ...newContent[idx],
                                        icon: e.target.value,
                                        platform: e.target.value,
                                      };
                                      updateElement(selectedBlockId!, {
                                        content: newContent,
                                      });
                                    }}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    {[
                                      "Facebook",
                                      "Twitter",
                                      "Instagram",
                                      "LinkedIn",
                                      "GitHub",
                                    ].map((name) => (
                                      <option key={name} value={name}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      const newContent = [
                                        ...selectedElement.content,
                                      ];
                                      newContent.splice(idx, 1);
                                      updateElement(selectedBlockId!, {
                                        content: newContent,
                                      });
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="URL"
                                  value={s.url}
                                  onChange={(e) => {
                                    const newContent = [
                                      ...selectedElement.content,
                                    ];
                                    newContent[idx] = {
                                      ...newContent[idx],
                                      url: e.target.value,
                                    };
                                    updateElement(selectedBlockId!, {
                                      content: newContent,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            ),
                          )}
                          <button
                            onClick={() => {
                              const newContent = [
                                ...(selectedElement?.content || []),
                                {
                                  platform: "Facebook",
                                  url: "#",
                                  icon: "Facebook",
                                },
                              ];
                              updateElement(selectedBlockId!, {
                                content: newContent,
                              });
                            }}
                            className="w-full py-2 border border-dashed border-slate-700 rounded text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                          >
                            + Add Social Link
                          </button>
                        </div>
                      )}

                      {selectedElement?.type === "sitemap" && (
                        <div className="space-y-4">
                          <ControlGroup label="Widget Title" tooltip="The heading displayed above the site map.">
                            <input
                              type="text"
                              value={selectedElement?.content?.title || ""}
                              onChange={(e) => updateElement(selectedBlockId!, { content: { ...selectedElement.content, title: e.target.value } })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </ControlGroup>
                          
                          <ControlGroup label="Layout Style" tooltip="Choose how the pages are displayed.">
                            <div className="flex gap-1 bg-slate-900 p-1 rounded border border-slate-700">
                              {(["list", "grid"] as const).map((layout) => (
                                <button
                                  key={layout}
                                  onClick={() => updateElement(selectedBlockId!, { content: { ...selectedElement.content, layout } })}
                                  className={`flex-1 py-1.5 text-[9px] rounded font-bold uppercase transition-all ${selectedElement?.content?.layout === layout ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                  {layout}
                                </button>
                              ))}
                            </div>
                          </ControlGroup>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                              <span className="text-xs text-slate-400">Show Home Page</span>
                              <button
                                onClick={() => updateElement(selectedBlockId!, { content: { ...selectedElement.content, showHome: !selectedElement.content.showHome } })}
                                className={`w-10 h-5 rounded-full transition-all relative ${selectedElement?.content?.showHome ? "bg-blue-600" : "bg-slate-700"}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selectedElement?.content?.showHome ? "left-6" : "left-1"}`} />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                              <span className="text-xs text-slate-400">Show Draft Pages</span>
                              <button
                                onClick={() => updateElement(selectedBlockId!, { content: { ...selectedElement.content, showDrafts: !selectedElement.content.showDrafts } })}
                                className={`w-10 h-5 rounded-full transition-all relative ${selectedElement?.content?.showDrafts ? "bg-blue-600" : "bg-slate-700"}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selectedElement?.content?.showDrafts ? "left-6" : "left-1"}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LAYERS PANEL */}
            {activeTab === "pages" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                  All Pages
                </h3>
                <p className="text-[10px] text-slate-500 px-1 mb-2">
                  Drag a page to the canvas to import its layout.
                </p>
                <div className="space-y-2">
                  {pages.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => onDragStartPage(e, p.id)}
                      onClick={() => navigate(`/editor/${p.id}`)}
                      className={`group/page-item w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 transition-all cursor-pointer ${p.id === id ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/20" : "hover:bg-slate-700 text-slate-300 border border-transparent"}`}
                    >
                      <FileText size={14} className="opacity-50" />
                      <span className="flex-1 truncate">{p.title}</span>
                      <div className="flex items-center gap-2">
                        {p.id === id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                        )}
                        <button
                          onClick={(e) => handleDeletePage(e, p.id)}
                          className="opacity-0 group-hover/page-item:opacity-100 p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-all"
                          title="Delete Page"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newPage: Page = {
                      id: newId,
                      title: "New Untitled Page",
                      slug: "new-untitled-page-" + newId,
                      status: "draft",
                      seo: {
                        metaTitle: "",
                        metaDescription: "",
                        keywords: "",
                        ogImage: "",
                      },
                      layoutJSON: { sections: [], layoutVersion: "1.0" },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      author: "Admin",
                    };
                    setPages((prev) => [newPage, ...prev]);
                    navigate(`/editor/${newId}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all mt-4"
                >
                  <Plus size={14} />
                  Create New Page
                </button>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                  Templates
                </h3>
                <p className="text-[10px] text-slate-500 px-1 mb-2">
                  Drag a template to the canvas to add it to your page.
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2 px-1">
                      Section Templates
                    </h4>
                    <div className="space-y-2">
                      {templates
                        .filter((t) => t.type === "section")
                        .map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => onDragStartTemplate(e, t.id)}
                            onClick={() =>
                              addSection(
                                t.layoutJSON as Section,
                                page.layoutJSON.sections.length,
                              )
                            }
                            className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 transition-all cursor-pointer hover:bg-slate-700 text-slate-300 border border-transparent"
                          >
                            <LayoutPanelLeft
                              size={14}
                              className="opacity-50 text-blue-400"
                            />
                            <span className="flex-1 truncate">{t.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2 px-1">
                      Page Templates
                    </h4>
                    <div className="space-y-2">
                      {templates
                        .filter((t) => t.type === "page")
                        .map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => onDragStartTemplate(e, t.id)}
                            onClick={() => {
                              const sections = (t.layoutJSON as LayoutJSON)
                                .sections;
                              const newSections = [
                                ...page.layoutJSON.sections,
                                ...JSON.parse(JSON.stringify(sections)),
                              ];
                              updateLayout({
                                ...page.layoutJSON,
                                sections: newSections,
                              });
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-3 transition-all cursor-pointer hover:bg-slate-700 text-slate-300 border border-transparent"
                          >
                            <Monitor
                              size={14}
                              className="opacity-50 text-purple-400"
                            />
                            <span className="flex-1 truncate">{t.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "layers" && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">
                  Structure Tree
                </h3>
                {page.layoutJSON.sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-600">
                      <LayoutPanelLeft size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-300 font-bold">
                        Canvas is empty
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Switch to the Widgets tab to start building your page.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("blocks")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all"
                    >
                      Go to Widgets
                    </button>
                  </div>
                ) : (
                  page.layoutJSON.sections
                    .filter((s) => !!s)
                    .map((sec, sIdx) => (
                      <div key={sec.id} className="space-y-1 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBlockId(sec.id);
                            setActiveTab("settings");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${selectedBlockId === sec.id ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/20" : "hover:bg-slate-700 text-slate-300 border border-transparent"}`}
                        >
                          <Layers size={14} className="opacity-50" />
                          <span className="flex-1 truncate">
                            Section {sIdx + 1}
                          </span>
                        </button>
                        <div className="pl-4 border-l-2 border-slate-700 ml-3 space-y-1">
                          {sec.columns.map((col, cIdx) => (
                            <div key={col.id} className="space-y-1">
                              <div className="px-3 py-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Column {cIdx + 1}
                              </div>
                              <div className="space-y-1 pl-2">
                                {col.blocks.map((blk) => (
                                  <button
                                    key={blk.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBlockId(blk.id);
                                      setActiveTab("settings");
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-all ${selectedBlockId === blk.id ? "bg-blue-600/30 text-blue-400 font-bold" : "hover:bg-slate-700 text-slate-400"}`}
                                  >
                                    <Box size={13} className="opacity-50" />
                                    <span className="truncate">
                                      {(blk.type || "")
                                        .charAt(0)
                                        .toUpperCase() +
                                        (blk.type || "").slice(1)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {activeTab === "code" && page.isCustomSite && (
              <div className="flex flex-col h-full animate-in fade-in duration-300 gap-6">
                <div className="flex flex-col gap-2">
                  <label 
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
                    title="The raw HTML code for your custom site."
                  >
                    HTML Content
                  </label>
                  <textarea
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none custom-scrollbar"
                    value={page.customHTML || ""}
                    onChange={(e) =>
                      setPage({ ...page, customHTML: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label 
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
                    title="Custom CSS styles to apply to your custom site."
                  >
                    Custom CSS
                  </label>
                  <textarea
                    className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-pink-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none custom-scrollbar"
                    value={page.customCSS || ""}
                    onChange={(e) =>
                      setPage({ ...page, customCSS: e.target.value })
                    }
                    placeholder="/* Add your CSS here */"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label 
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
                    title="Custom JavaScript to run on your custom site."
                  >
                    Custom JS
                  </label>
                  <textarea
                    className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-yellow-400 outline-none focus:ring-1 focus:ring-blue-500 resize-none custom-scrollbar"
                    value={page.customJS || ""}
                    onChange={(e) =>
                      setPage({ ...page, customJS: e.target.value })
                    }
                    placeholder="// Add your JavaScript here"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-800/90">
            <button
              type="button"
              onClick={() => setActiveTab("layers")}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all group"
            >
              <div className="flex items-center gap-2">
                <ListTree size={16} />
                <span>Navigator</span>
              </div>
              <ChevronRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </aside>
      )}

        {/* Center Canvas */}
        <main className={`flex-1 overflow-y-auto relative ${!isPreview ? "builder-canvas px-4 py-8" : "p-0"}`}>
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Playfair+Display:wght@400;700&family=Space+Grotesk:wght@400;700&family=Outfit:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&display=swap');
            
            :root {
              --primary: ${globalStyles.primaryColor};
              --secondary: ${globalStyles.secondaryColor};
              --accent: ${globalStyles.accentColor};
              --bg: ${globalStyles.backgroundColor};
              --text: ${globalStyles.textColor};
            }

            .builder-canvas-content {
              font-family: '${globalStyles.bodyFont}', sans-serif !important;
              color: ${globalStyles.textColor} !important;
              background-color: ${globalStyles.backgroundColor} !important;
              ${globalStyles.backgroundGradient ? `background: ${globalStyles.backgroundGradient} !important;` : ""}
            }
            .builder-canvas-content h1, 
            .builder-canvas-content h2, 
            .builder-canvas-content h3, 
            .builder-canvas-content h4, 
            .builder-canvas-content h5, 
            .builder-canvas-content h6,
            .builder-canvas-content [data-heading="true"] {
              font-family: '${globalStyles.headingFont}', sans-serif !important;
            }
            .builder-canvas-content button, 
            .builder-canvas-content input, 
            .builder-canvas-content select, 
            .builder-canvas-content textarea {
              font-family: inherit;
            }
            .builder-canvas-content .btn-primary {
              background-color: ${globalStyles.primaryColor} !important;
              color: white !important;
            }
            .builder-canvas-content .btn-secondary {
              background-color: ${globalStyles.secondaryColor} !important;
              color: white !important;
            }
            .builder-canvas-content .btn-accent {
              background-color: ${globalStyles.accentColor} !important;
              color: white !important;
            }
            .builder-canvas-content a {
              color: ${globalStyles.primaryColor};
            }
          `,
            }}
          />
          <div
            className={`mx-auto shadow-2xl transition-all border relative builder-canvas-content ${
              !isPreview ? "border-dashed border-slate-200 min-h-[calc(100vh-100px)]" : "border-none shadow-none min-h-screen"
            } ${
              viewMode === "desktop"
                ? "w-full"
                : viewMode === "tablet"
                  ? "max-w-2xl"
                  : "max-w-sm"
            }`}
            style={{ 
              backgroundColor: globalStyles.backgroundColor,
              background: globalStyles.backgroundGradient || undefined
            }}
          >
            {page.isCustomSite ? (
              <div className="p-0 h-full w-full relative">
                <style
                  dangerouslySetInnerHTML={{ __html: page.customCSS || "" }}
                />
                <div
                  dangerouslySetInnerHTML={{ __html: page.customHTML || "" }}
                />
                <script
                  dangerouslySetInnerHTML={{ __html: page.customJS || "" }}
                />

                {/* Overlay to indicate it's a custom site and allow switching to code editor */}
                <div className="absolute top-4 right-4 z-50">
                  <div className="bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-2">
                    <Globe size={14} className="text-blue-400" />
                    Custom Site Mode
                  </div>
                </div>
              </div>
            ) : (
              <>
                {page.layoutJSON.sections
                  .filter((s) => !!s)
                  .map((section, sIdx) => (
                    <div key={section.id} className="relative group/section">
                      {!isPreview && (
                        <div
                          className="absolute top-0 left-0 right-0 h-4 -translate-y-1/2 opacity-0 group-hover/section:opacity-100 flex items-center justify-center z-10 transition-opacity"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnCanvas(e, sIdx)}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setShowLayoutPicker({
                                index: sIdx,
                                position: "above",
                              })
                            }
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      )}

                      <section
                        id={`section-${section.id}`}
                        style={{
                          padding: section.styles?.padding,
                          backgroundColor: section.styles?.backgroundColor,
                          backgroundImage: section.styles?.backgroundImage
                            ? `url(${section.styles.backgroundImage})`
                            : "none",
                          backgroundSize:
                            section.styles?.backgroundSize || "cover",
                          backgroundPosition:
                            section.styles?.backgroundPosition ||
                            "center center",
                          backgroundRepeat:
                            section.styles?.backgroundRepeat || "no-repeat",
                          borderWidth: section.styles?.borderWidth,
                          borderStyle: section.styles?.borderStyle || "none",
                          borderColor: section.styles?.borderColor,
                          borderRadius: section.styles?.borderRadius,
                          margin: section.styles?.margin,
                          boxShadow: section.styles?.boxShadow,
                          fontSize: section.styles?.fontSize,
                          fontWeight: section.styles?.fontWeight,
                          color: section.styles?.color,
                          width: section.styles?.width,
                          height: section.styles?.height,
                          display: section.styles?.display,
                          opacity: section.styles?.opacity,
                          zIndex: section.styles?.zIndex,
                        }}
                        onClick={() => {
                          if (!isPreview) {
                            setSelectedBlockId(section.id);
                            setActiveTab("settings");
                          }
                        }}
                        className={`flex flex-wrap border-2 relative transition-all ${
                          !isPreview && selectedBlockId === section.id 
                            ? "border-blue-500 bg-blue-50/5 ring-4 ring-blue-500/10 shadow-lg" 
                            : !isPreview ? "border-transparent hover:border-blue-300/80" : "border-transparent"
                        }`}
                      >
                        {/* Interactive Floating Section Toolbar */}
                        {!isPreview && selectedBlockId === section.id && (
                          <FloatingSectionToolbar
                            section={section}
                            sectionIndex={sIdx}
                            totalSections={page.layoutJSON.sections.length}
                            onAddColumn={() => addColumnToSection(section.id)}
                            onSetLayout={(widths) => setSectionColumnLayout(section.id, widths)}
                            onMoveUp={() => moveSection(sIdx, 'up')}
                            onMoveDown={() => moveSection(sIdx, 'down')}
                            onDuplicate={() => duplicateSection(section.id)}
                            onSaveTemplate={() => saveSectionAsTemplate(section.id)}
                            onDelete={() => removeSection(section.id)}
                            onOpenSettings={() => {
                              setSelectedBlockId(section.id);
                              setActiveTab("settings");
                            }}
                            onQuickStyleChange={(styles) => updateSectionQuickStyles(section.id, styles)}
                          />
                        )}

                        {section.columns.map((column) => (
                          <div
                            key={column.id}
                            id={`column-${column.id}`}
                            style={{ width: `${column.width}%` }}
                            onDragOver={(e) => !isPreview && onDragOverColumn(e, column.id)}
                            onDrop={(e) => !isPreview && onDropOnColumn(e, column.id)}
                            className={`min-h-[140px] border-r last:border-r-0 p-4 flex flex-col gap-2 relative group/column transition-all ${
                              !isPreview ? "border-dashed border-slate-200" : "border-none"
                            } ${
                              !isPreview && draggedOverColumn === column.id
                                ? "bg-blue-50/60 ring-2 ring-blue-500 ring-inset"
                                : ""
                            }`}
                          >
                            {column.blocks.map((block, bIdx) => (
                              <React.Fragment key={block.id}>
                                {/* Between-block Inserter Divider */}
                                {!isPreview && bIdx > 0 && (
                                  <BlockInsertionDivider
                                    label="Add Block Here"
                                    onInsert={() =>
                                      setQuickInserter({
                                        isOpen: true,
                                        columnId: column.id,
                                        blockIndex: bIdx,
                                        title: `Insert at Slot #${bIdx + 1}`
                                      })
                                    }
                                  />
                                )}

                                <div
                                  id={`block-${block.id}`}
                                  onClick={(e) => {
                                    if (!isPreview) {
                                      e.stopPropagation();
                                      setSelectedBlockId(block.id);
                                    }
                                  }}
                                  style={{
                                    borderWidth: block.styles?.borderWidth,
                                    borderStyle:
                                      block.styles?.borderStyle || "none",
                                    borderColor: block.styles?.borderColor,
                                    borderRadius: block.styles?.borderRadius,
                                    backgroundColor:
                                      block.styles?.backgroundColor,
                                    margin: block.styles?.margin,
                                    boxShadow: block.styles?.boxShadow,
                                    fontSize: block.styles?.fontSize,
                                    fontWeight: block.styles?.fontWeight,
                                    color: block.styles?.color,
                                    width: block.styles?.width,
                                    height: block.styles?.height,
                                    display: block.styles?.display,
                                    opacity: block.styles?.opacity,
                                    zIndex: block.styles?.zIndex,
                                  }}
                                  className={`relative border-2 transition-all rounded-xl p-2 group/block ${
                                    !isPreview && selectedBlockId === block.id 
                                      ? "border-blue-500 bg-blue-50/15 ring-4 ring-blue-500/15 shadow-md" 
                                      : !isPreview ? "border-transparent hover:border-blue-300/80" : "border-transparent"
                                  }`}
                                >
                                  {/* Floating Block Toolbar */}
                                  {!isPreview && selectedBlockId === block.id && (
                                    <FloatingBlockToolbar
                                      block={block}
                                      canMoveUp={bIdx > 0}
                                      canMoveDown={bIdx < column.blocks.length - 1}
                                      onDuplicate={() => duplicateBlock(block.id)}
                                      onMoveUp={() => moveBlock(block.id, 'up')}
                                      onMoveDown={() => moveBlock(block.id, 'down')}
                                      onDelete={() => removeBlock(block.id)}
                                      onAddBelow={() =>
                                        setQuickInserter({
                                          isOpen: true,
                                          columnId: column.id,
                                          blockIndex: bIdx + 1,
                                          title: `Insert Below ${block.type.toUpperCase()}`
                                        })
                                      }
                                      onAlignChange={(align) =>
                                        updateBlockQuickStyles(block.id, { textAlign: align })
                                      }
                                      onOpenSettings={() => {
                                        setSelectedBlockId(block.id);
                                        setActiveTab("settings");
                                      }}
                                      onAiEnhance={() => {
                                        setSelectedBlockId(block.id);
                                        setActiveTab("ai");
                                      }}
                                      onQuickStyleChange={(styles) =>
                                        updateBlockQuickStyles(block.id, styles)
                                      }
                                    />
                                  )}

                                  <BlockRenderer
                                    block={block}
                                    globalStyles={globalStyles}
                                    pages={pages}
                                    onRemove={() => removeBlock(block.id)}
                                    onUpdate={(updates) =>
                                      updateElement(block.id, updates)
                                    }
                                  />
                                </div>
                              </React.Fragment>
                            ))}

                            {/* Column State: Empty vs Populated */}
                            {!isPreview && column.blocks.length === 0 ? (
                              <div className="flex-1 min-h-[160px] border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/60 transition-all group/empty">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickInserter({
                                      isOpen: true,
                                      columnId: column.id,
                                      title: "Add Element to Column"
                                    });
                                  }}
                                  className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 group-hover/empty:bg-blue-600 group-hover/empty:text-white flex items-center justify-center transition-all shadow-sm group-hover/empty:scale-110"
                                >
                                  <Plus size={24} className="stroke-[2.5]" />
                                </button>
                                <div>
                                  <p className="text-xs font-bold text-slate-700">Empty Column</p>
                                  <p className="text-[11px] text-slate-400">Click to insert widgets or choose quick preset below</p>
                                </div>

                                {/* Quick Inserter Presets */}
                                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                                  {[
                                    { label: "+ Heading", type: "text" as BlockType },
                                    { label: "+ Button", type: "button" as BlockType },
                                    { label: "+ Image", type: "image" as BlockType },
                                    { label: "+ Form", type: "form" as BlockType },
                                    { label: "+ Card", type: "pricing" as BlockType },
                                  ].map((p, pIdx) => (
                                    <button
                                      key={pIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addBlockToColumn(column.id, p.type);
                                      }}
                                      className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-blue-600 hover:text-white text-slate-600 border border-slate-200 hover:border-blue-600 rounded-lg shadow-xs transition-colors"
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickInserter({
                                        isOpen: true,
                                        columnId: column.id,
                                        title: "Explore All Widgets"
                                      });
                                    }}
                                    className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition-colors"
                                  >
                                    + More...
                                  </button>
                                </div>
                              </div>
                            ) : !isPreview && (
                              <button
                                id={`add-block-${column.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickInserter({
                                    isOpen: true,
                                    columnId: column.id,
                                    title: "Add Widget to Column"
                                  });
                                }}
                                className={`w-full py-2.5 border border-dashed rounded-xl mt-2 flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                                  draggedOverColumn === column.id
                                    ? "border-blue-500 text-blue-600 bg-blue-100/50"
                                    : "border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/40"
                                }`}
                              >
                                <Plus size={14} className="stroke-[2.5]" />
                                <span>Add Widget</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </section>

                      {!isPreview && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-4 translate-y-1/2 opacity-0 group-hover/section:opacity-100 flex items-center justify-center z-10 transition-opacity"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnCanvas(e, sIdx + 1)}
                        >
                          <button
                            id={`add-section-after-${sIdx}`}
                            type="button"
                            onClick={() =>
                              setShowLayoutPicker({
                                index: sIdx + 1,
                                position: "below",
                              })
                            }
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                {!isPreview && page.layoutJSON.sections.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center min-h-[85vh] text-slate-300 p-8 bg-slate-50/30"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnCanvas(e)}
                  >
                    <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-700">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Option 1: AI Architect */}
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                          <div className="space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                              <BrainCircuit size={32} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">The AI Architect</h3>
                              <p className="text-slate-500 text-sm leading-relaxed">
                                Describe your vision, and I'll build the entire structure with sections and content for you.
                              </p>
                            </div>
                            <div className="relative">
                              <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g., A landing page for a boutique hotel with booking, amenities, and a gallery..."
                                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-inner"
                              />
                              {isGeneratingBlueprint && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
                                  <RefreshCw size={24} className="text-blue-600 animate-spin" />
                                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">Architecting...</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={handleGenerateBlueprint}
                            disabled={!aiPrompt || isGeneratingBlueprint}
                            className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                          >
                            <Sparkles size={20} />
                            <span>Build Blueprint</span>
                          </button>
                        </div>

                        {/* Option 2: Templates & Manual */}
                        <div className="flex flex-col gap-6">
                          <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col justify-between group hover:border-purple-500/30 transition-all">
                            <div className="space-y-4">
                              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:rotate-6 transition-transform">
                                <LayoutPanelLeft size={24} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-lg font-black text-slate-900 tracking-tight">Browse Templates</h4>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                  Start with a professionally crafted layout and customize every pixel.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowLayoutPicker({ index: 0, position: "end" })}
                              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                            >
                              Open Layout Picker
                            </button>
                          </div>

                          <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col justify-between group hover:border-amber-500/30 transition-all">
                            <div className="space-y-4">
                              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:translate-x-1 transition-transform">
                                <Layers size={24} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-lg font-black text-slate-900 tracking-tight">Manual Assembly</h4>
                                <p className="text-slate-500 text-xs leading-relaxed">
                                  Drag and drop widgets from the sidebar to create your unique design.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveTab("blocks")}
                              className="mt-6 w-full py-3 bg-amber-50 rounded-xl text-xs font-bold text-amber-700 flex items-center justify-center gap-2 hover:bg-amber-100 transition-all active:scale-[0.98]"
                            >
                              Explore Widgets
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Pro Tip: You can drag templates from the left sidebar directly here.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Layout Picker Modal */}
        {showLayoutPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex gap-6">
                  <button
                    onClick={() => setPickerTab("structure")}
                    className={`text-lg font-bold transition-colors ${pickerTab === "structure" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Structure
                  </button>
                  <button
                    onClick={() => setPickerTab("templates")}
                    className={`text-lg font-bold transition-colors ${pickerTab === "templates" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Templates
                  </button>
                </div>
                <button
                  id="layout-picker-close"
                  type="button"
                  onClick={() => setShowLayoutPicker(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {pickerTab === "structure" ? (
                  <div className="grid grid-cols-3 gap-6">
                    {COLUMN_LAYOUTS.map((layout, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          addSection(layout.widths, showLayoutPicker.index)
                        }
                        className="group flex flex-col gap-3"
                      >
                        <div className="flex gap-1 h-16 bg-slate-100 p-1 rounded-md group-hover:bg-blue-50 group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                          {layout.widths.map((w, j) => (
                            <div
                              key={j}
                              style={{ width: `${w}%` }}
                              className="bg-slate-300 rounded group-hover:bg-blue-300 transition-colors h-full"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          {layout.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {templates
                      .filter((t) => t.type === "section")
                      .map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() =>
                            addSection(
                              template.layoutJSON as Section,
                              showLayoutPicker.index,
                            )
                          }
                          className="group flex flex-col gap-3 border border-slate-100 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                        >
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                            <LayoutPanelLeft
                              size={32}
                              className="text-slate-300 group-hover:text-blue-400"
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-800">
                            {template.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                            Pre-defined Section
                          </span>
                        </button>
                      ))}
                    {templates.filter((t) => t.type === "section").length ===
                      0 && (
                      <div className="col-span-2 py-12 text-center text-slate-400 italic">
                        No section templates found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <Trash2 size={24} />
                <h3 className="text-xl font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, show: false }))
                }
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
      {/* Quick Inserter Modal */}
      <QuickInserterModal
        isOpen={quickInserter.isOpen}
        onClose={() => setQuickInserter((prev) => ({ ...prev, isOpen: false }))}
        targetInfo={quickInserter}
        onSelectBlock={(type) => {
          if (quickInserter.columnId) {
            addBlockToColumnAtIndex(quickInserter.columnId, type, quickInserter.blockIndex);
          } else {
            onWidgetClick(type);
          }
        }}
        onSelectSectionKit={(kit) => {
          insertSectionKit(kit, quickInserter.sectionIndex);
        }}
      />

      {/* Cursor Overlay */}
      {!isPreview && Object.entries(otherCursors).map(([socketId, cursor], cIdx) => {
        const user = activeUsers.find((u) => (u.socketId || u.id) === socketId);
        if (!user) return null;
        const c = cursor as { x: number; y: number };
        return (
          <div
            key={socketId || `cursor-${cIdx}`}
            className="fixed pointer-events-none z-[9999] transition-all duration-75"
            style={{ left: c.x, top: c.y }}
          >
            <MousePointer2
              size={20}
              style={{ color: user.color, fill: user.color }}
            />
            <div
              className="ml-4 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* --- Internal Sidebar Components --- */

const getDefaultContent = (type: BlockType) => {
  switch (type) {
    case "text":
      return "<h2>New Heading</h2><p>Click here to edit style...</p>";
    case "image":
      return "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800";
    case "button":
      return "Click Me";
    case "video":
      return "https://www.youtube.com/embed/dQw4w9WgXcQ";
    case "spacer":
      return "";
    case "html":
      return '<div style="padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">\n  <h3 style="color: #1e293b; margin-top: 0;">Custom HTML Block</h3>\n  <p style="color: #64748b;">You can add any HTML here. Use the settings panel to edit the source code.</p>\n</div>';
    case "nav":
      return {
        logo: "DevInquire",
        logoType: "text",
        logoUrl: "",
        showLogo: true,
        links: [
          { label: "Home", url: "#" },
          { label: "About", url: "#" },
          { label: "Services", url: "#" },
          { label: "Contact", url: "#" },
        ],
      };
    case "icon":
      return {
        iconName: "Smile",
        size: 48,
        color: "#3b82f6",
      };
    case "accordion":
      return [
        {
          title: "What is DevInquire?",
          content: "DevInquire is a powerful CMS and page builder.",
          isOpen: true,
        },
        {
          title: "How do I use templates?",
          content:
            "You can save any section or page as a template for future use.",
          isOpen: false,
        },
        {
          title: "Can I export my site?",
          content:
            "Yes, you can export your site as a static HTML/CSS bundle.",
          isOpen: false,
        },
      ];
    case "pricing":
      return {
        plan: "Professional",
        price: "29",
        currency: "$",
        period: "month",
        features: [
          "Unlimited Pages",
          "Custom Domain",
          "24/7 Support",
          "Advanced Analytics",
        ],
        buttonText: "Get Started",
        isFeatured: true,
      };
    case "social":
      return [
        { platform: "facebook", url: "#" },
        { platform: "twitter", url: "#" },
        { platform: "instagram", url: "#" },
      ];
    case "form":
      return {
        title: "Contact Us",
        fields: [
          { id: "field_name", label: "Name", type: "text", placeholder: "Your name" },
          { id: "field_email", label: "Email", type: "email", placeholder: "Your email" },
          { id: "field_message", label: "Message", type: "textarea", placeholder: "Your message" },
        ],
        buttonText: "Send Message",
      };
    case "map":
      return {
        address: "San Francisco, CA",
        zoom: 14,
      };
    case "testimonial":
      return {
        quote: "This is the best page builder I have ever used!",
        author: "John Doe",
        role: "Web Designer",
        avatar: "https://i.pravatar.cc/150?u=john",
      };
    case "gallery":
      return [
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=800",
      ];
    case "divider":
      return null;
    case "counter":
      return {
        number: 100,
        suffix: "+",
        label: "Happy Clients",
      };
    case "progress":
      return {
        label: "Design Skills",
        percentage: 85,
      };
    case "tabs":
      return [
        { title: "Tab 1", content: "Content for tab 1" },
        { title: "Tab 2", content: "Content for tab 2" },
      ];
    case "list":
      return [
        { icon: "Check", text: "Feature one" },
        { icon: "Check", text: "Feature two" },
        { icon: "Check", text: "Feature three" },
      ];
    case "alert":
      return {
        type: "info",
        title: "Heads up!",
        message: "This is an important message.",
      };
    case "newsletter":
      return {
        title: "Subscribe to our newsletter",
        description: "Get the latest updates and news.",
        buttonText: "Subscribe",
        placeholder: "Your email address",
      };
    case "embed":
      return {
        html: '<div style="padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">\n  <h3 style="color: #1e293b; margin-top: 0;">Custom Embed Block</h3>\n  <p style="color: #64748b;">You can add any HTML/CSS/JS here.</p>\n</div>',
        css: "",
        js: "",
      };
    case "sitemap":
      return null;
    default:
      return "";
  }
};

const AIAssistant: React.FC<{
  page: Page;
  selectedBlockId: string | null;
  onUpdatePage: (updates: Partial<Page>) => void;
  onUpdateStyles: (styles: Partial<GlobalStyles>) => void;
  onAddSection: (layout: number[] | Section, atIndex: number) => void;
  onUpdateElement: (id: string, updates: any) => void;
}> = ({ page, selectedBlockId, onUpdatePage, onUpdateStyles, onAddSection, onUpdateElement }) => {
  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [styleVibe, setStyleVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [styleSuggestion, setStyleSuggestion] = useState<any>(null);
  const [nextSuggestions, setNextSuggestions] = useState<any[]>([]);
  const { pages } = useCMS();

  useEffect(() => {
    const fetchNextSuggestions = async () => {
      try {
        const suggestions = await suggestNextItems(pages, `Current page: ${page.title}`);
        setNextSuggestions(suggestions);
      } catch (err) {
        console.error("Failed to fetch next suggestions:", err);
      }
    };
    fetchNextSuggestions();
  }, [page.id]);

  const getSelectedBlock = () => {
    if (!selectedBlockId || !page) return null;
    for (const sec of page.layoutJSON.sections) {
      for (const col of sec.columns) {
        const blk = col.blocks.find((b) => b.id === selectedBlockId);
        if (blk) return blk;
      }
    }
    return null;
  };

  const selectedBlock = getSelectedBlock();

  const handleRefineContent = async () => {
    if (!refinePrompt || !selectedBlock) return;
    setLoading(true);
    try {
      const currentContent = typeof selectedBlock.content === 'string' 
        ? selectedBlock.content 
        : JSON.stringify(selectedBlock.content);
      
      const refined = await refineContent(currentContent, refinePrompt);
      
      let newContent = refined;
      if (typeof selectedBlock.content !== 'string') {
        try {
          // If it was an object, try to parse it back or just update a specific field if we knew which one.
          // For simplicity, if it's not a string, we might need more complex logic.
          // But most text-heavy blocks use string content.
          if (selectedBlock.type === 'text') {
            newContent = refined;
          } else {
            // For other types, we might just update the main text field if it exists.
            newContent = { ...selectedBlock.content, text: refined };
          }
        } catch (e) {
          newContent = refined;
        }
      }

      onUpdateElement(selectedBlockId!, { content: newContent });
      setRefinePrompt("");
      toast.success("Content refined successfully!");
    } catch (error) {
      toast.error("Failed to refine content.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestStyles = async () => {
    if (!styleVibe || !selectedBlock) return;
    setLoading(true);
    try {
      const content = typeof selectedBlock.content === 'string' 
        ? selectedBlock.content 
        : JSON.stringify(selectedBlock.content);
      
      const suggestion = await suggestBlockStyles(selectedBlock.type, content, styleVibe);
      setStyleSuggestion(suggestion);
      toast.success("Style suggestions generated!");
    } catch (error) {
      toast.error("Failed to suggest styles.");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedStyles = () => {
    if (!styleSuggestion || !selectedBlockId) return;
    onUpdateElement(selectedBlockId, { styles: { ...selectedBlock.styles, ...styleSuggestion.styles } });
    setStyleSuggestion(null);
    setStyleVibe("");
    toast.success("Applied suggested styles to block!");
  };

  const handleGenerateIdea = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const idea = await generatePageIdea(prompt);
      setSuggestion(idea);
      toast.success("AI generated some ideas for you!");
    } catch (error) {
      toast.error("Failed to generate ideas.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllSections = () => {
    if (!suggestion || !page) return;
    
    const newSections = suggestion.sections.map((sec: any) => ({
      id: `sec_${Math.random().toString(36).substr(2, 5)}`,
      columns: [
        {
          id: `col_${Math.random().toString(36).substr(2, 5)}`,
          width: 100,
          blocks: sec.suggestedBlocks.map((block: any) => ({
            id: `blk_${Math.random().toString(36).substr(2, 5)}`,
            type: block.type as BlockType,
            content: block.content || getDefaultContent(block.type as BlockType),
            styles: { padding: "10px", textAlign: "left" },
            settings: {},
          }))
        }
      ],
      styles: { padding: "40px 0" },
    }));

    const updatedSections = [...page.layoutJSON.sections, ...newSections];
    onUpdatePage({
      layoutJSON: {
        ...page.layoutJSON,
        sections: updatedSections
      }
    });
    toast.success(`Added all ${newSections.length} suggested sections!`);
  };

  const handleApplyPalette = async (vibe: string) => {
    setLoading(true);
    try {
      const palette = await suggestColorPalette(vibe);
      onUpdateStyles({
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        backgroundColor: palette.background,
      });
      toast.success(`Applied ${vibe} color palette!`);
    } catch (error) {
      toast.error("Failed to suggest colors.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-blue-400">
          <Sparkles size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider">AI Assistant</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tell me what kind of page you want to build, and I'll help you with structure and ideas.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A landing page for a modern coffee shop with a cozy vibe..."
          className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
        />
        <button
          onClick={handleGenerateIdea}
          disabled={loading || !prompt}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <BrainCircuit size={16} />}
          <span>Generate Page Ideas</span>
        </button>
      </div>

      {suggestion && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-4 animate-in zoom-in-95 duration-300">
          <div>
            <h4 className="text-xs font-bold text-blue-400 mb-1">{suggestion.title}</h4>
            <p className="text-[10px] text-slate-400 italic">{suggestion.description}</p>
          </div>
          
          <div className="space-y-3">
            {suggestion.sections.map((sec: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 group hover:border-slate-500 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-200">{sec.title}</span>
                  <button 
                    onClick={() => {
                      const newSection: Section = {
                        id: `sec_${Math.random().toString(36).substr(2, 5)}`,
                        columns: [
                          {
                            id: `col_${Math.random().toString(36).substr(2, 5)}`,
                            width: 100,
                            blocks: sec.suggestedBlocks.map((block: any) => ({
                              id: `blk_${Math.random().toString(36).substr(2, 5)}`,
                              type: block.type as BlockType,
                              content: block.content || getDefaultContent(block.type as BlockType),
                              styles: { padding: "10px", textAlign: "left" },
                              settings: {},
                            }))
                          }
                        ],
                        styles: { padding: "40px 0" },
                      };
                      onAddSection(newSection, page.layoutJSON.sections.length);
                      toast.success(`Added ${sec.title} section with suggested widgets!`);
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-blue-400 transition-colors"
                    title="Add this section"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mb-2">{sec.purpose}</p>
                <div className="flex flex-wrap gap-1">
                  {sec.suggestedBlocks.map((b: any, bIdx: number) => (
                    <span key={bIdx} className="text-[8px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-700 uppercase font-bold tracking-tighter">
                      {b.type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddAllSections}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all mt-2"
          >
            <Plus size={12} />
            <span>Add All Suggested Sections</span>
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-purple-400">
          <Wand2 size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Refine Content</h3>
        </div>
        
        {selectedBlock ? (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400">
              Refine the content of the selected <span className="text-blue-400 font-bold">{selectedBlock.type}</span> block.
            </p>
            <textarea
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="e.g., Make this more concise, Add a stronger call to action..."
              className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
            />
            <button
              onClick={handleRefineContent}
              disabled={loading || !refinePrompt}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={16} />}
              <span>Refine with AI</span>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-slate-900/30 border border-dashed border-slate-700 rounded-xl text-center">
            <p className="text-[10px] text-slate-500 italic">
              Select a block on the canvas to refine its content with AI.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-700 space-y-4">
        <div className="flex items-center gap-2 text-pink-400">
          <Palette size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Suggest Styles</h3>
        </div>
        
        {selectedBlock ? (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400">
              Get AI-powered style suggestions for the selected <span className="text-blue-400 font-bold">{selectedBlock.type}</span>.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={styleVibe}
                onChange={(e) => setStyleVibe(e.target.value)}
                placeholder="Vibe (e.g., minimalist, neon, retro)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
              />
              <button
                onClick={handleSuggestStyles}
                disabled={loading || !styleVibe}
                className="px-3 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={16} />}
              </button>
            </div>

            {styleSuggestion && (
              <div className="p-3 bg-slate-900/50 border border-pink-500/30 rounded-lg space-y-2 animate-in zoom-in-95 duration-200">
                <p className="text-[9px] text-slate-400 leading-relaxed italic">
                  "{styleSuggestion.explanation}"
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(styleSuggestion.styles).map(([key, value]: [string, any]) => (
                    <span key={key} className="text-[8px] px-1.5 py-0.5 bg-slate-800 text-pink-400 rounded border border-slate-700">
                      {key}: {value}
                    </span>
                  ))}
                </div>
                <button
                  onClick={applySuggestedStyles}
                  className="w-full py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-500/30 rounded-md text-[10px] font-bold transition-all"
                >
                  Apply Styles
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/30 border border-dashed border-slate-700 rounded-xl text-center">
            <p className="text-[10px] text-slate-500 italic">
              Select a block to get style suggestions.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-700 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Style Suggestions</h4>
        <div className="grid grid-cols-2 gap-2">
          {['Minimalist', 'Vibrant', 'Professional', 'Dark Mode', 'Nature'].map(vibe => (
            <button
              key={vibe}
              onClick={() => handleApplyPalette(vibe)}
              disabled={loading}
              className="py-2 px-3 bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-medium text-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <Palette size={12} className="text-slate-500" />
              {vibe}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-indigo-400 mb-3">
          <Zap size={16} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Next Building Steps</h3>
        </div>
        <div className="space-y-3 pb-4">
          {nextSuggestions.length > 0 ? (
            nextSuggestions.map((item, index) => (
              <div key={index} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all group cursor-pointer" onClick={() => toast.info(`Action suggested: ${item.action}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 mb-0.5 group-hover:text-indigo-300 transition-colors truncate">{item.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-snug mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{item.type}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <span className="text-[9px] text-slate-400 italic truncate opacity-70">{item.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center">
              <RefreshCw className="w-6 h-6 text-slate-700 animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-slate-600 italic">Curating growth ideas...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  id?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ id, active, onClick, icon, label }) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 text-[11px] font-bold uppercase tracking-widest transition-all relative outline-none ${
      active
        ? "text-blue-500 bg-slate-700/50"
        : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/20"
    }`}
  >
    {icon}
    <span>{label}</span>
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_-2px_6_rgba(59,130,246,0.5)]" />
    )}
  </button>
);

const ColorControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tooltip?: string;
}> = ({ label, value, onChange, className = "", tooltip }) => (
  <div className={`space-y-2 ${className}`}>
    <label 
      className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
      title={tooltip}
    >
      {label}
    </label>
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded p-1.5 group hover:border-slate-500 transition-all">
      <div className="relative w-8 h-8 rounded overflow-hidden border border-slate-700 flex-shrink-0">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
        />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none text-[10px] text-slate-300 outline-none font-mono"
          placeholder="#000000"
        />
        <Pipette size={12} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  </div>
);

const OpacitySlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  tooltip?: string;
}> = ({ label, value, onChange, className = "", tooltip }) => (
  <div className={`space-y-2 ${className}`}>
    <div className="flex items-center justify-between px-1">
      <label 
        className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-help"
        title={tooltip}
      >
        {label}
      </label>
      <span className="text-[10px] font-mono text-slate-400">{Math.round((value ?? 1) * 100)}%</span>
    </div>
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded p-2 group hover:border-slate-500 transition-all">
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  </div>
);

const GradientControl: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tooltip?: string;
}> = ({ label, value, onChange, className = "", tooltip }) => {
  const parseGradient = (grad: string) => {
    const match = grad?.match(/linear-gradient\((\d+)deg,\s*(#[a-fA-F0-9]{6}|rgba?\(.*?\)),\s*(#[a-fA-F0-9]{6}|rgba?\(.*?\))\)/);
    if (match) {
      return { angle: match[1], color1: match[2], color2: match[3] };
    }
    return { angle: "180", color1: "#3b82f6", color2: "#8b5cf6" };
  };

  const { angle, color1, color2 } = parseGradient(value);

  const updateGradient = (updates: { angle?: string; color1?: string; color2?: string }) => {
    const newAngle = updates.angle ?? angle;
    const newColor1 = updates.color1 ?? color1;
    const newColor2 = updates.color2 ?? color2;
    onChange(`linear-gradient(${newAngle}deg, ${newColor1}, ${newColor2})`);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label 
        className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
        title={tooltip}
      >
        {label}
      </label>
      <div className="bg-slate-900 border border-slate-700 rounded p-3 space-y-4">
        <div 
          className="h-12 w-full rounded border border-slate-700 shadow-inner" 
          style={{ background: value || `linear-gradient(${angle}deg, ${color1}, ${color2})` }}
        />
        <div className="grid grid-cols-2 gap-3">
          <ColorControl
            label="Start"
            value={color1}
            onChange={(val) => updateGradient({ color1: val })}
          />
          <ColorControl
            label="End"
            value={color2}
            onChange={(val) => updateGradient({ color2: val })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Angle</label>
            <span className="text-[9px] font-mono text-slate-400">{angle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={angle}
            onChange={(e) => updateGradient({ angle: e.target.value })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Raw CSS String</label>
          <input
            type="text"
            value={value || `linear-gradient(${angle}deg, ${color1}, ${color2})`}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            placeholder="linear-gradient(180deg, #3b82f6, #8b5cf6)"
          />
        </div>
      </div>
    </div>
  );
};

const ControlGroup: React.FC<{ 
  label: string; 
  children: React.ReactNode; 
  className?: string;
  tooltip?: string;
}> = ({
  label,
  children,
  className = "",
  tooltip,
}) => (
  <div className={`space-y-2 ${className}`}>
    <label 
      className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 cursor-help"
      title={tooltip}
    >
      {label}
    </label>
    {children}
  </div>
);

export default Editor;
