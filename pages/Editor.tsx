import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Download,
  Maximize2,
  Move,
  Repeat,
  Undo2,
  Redo2,
  Copy,
  ExternalLink,
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
} from "../types";
import { BLOCK_DEFS, COLUMN_LAYOUTS } from "../constants";

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
  const [activeTab, setActiveTab] = useState<
    "blocks" | "settings" | "layers" | "code" | "pages" | "templates"
  >("blocks");
  const [pickerTab, setPickerTab] = useState<"structure" | "templates">(
    "structure",
  );
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showLayoutPicker, setShowLayoutPicker] = useState<{
    index: number;
    position: "above" | "below" | "end";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    alert("Template saved successfully!");
  };

  const handleSave = (silent = false) => {
    if (!page) return;
    if (!silent) setIsSaving(true);

    if (template) {
      // Saving a template
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id === template.id) {
            return {
              ...t,
              name: page.title,
              layoutJSON:
                t.type === "page"
                  ? page.layoutJSON
                  : page.layoutJSON.sections[0],
            };
          }
          return t;
        }),
      );
    } else {
      // Saving a page
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? { ...page, updatedAt: new Date().toISOString() }
            : p,
        ),
      );
    }

    if (!silent) {
      setTimeout(() => setIsSaving(false), 800);
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
    if (!page) return;
    const newSections = page.layoutJSON.sections.filter(
      (s) => s.id !== sectionId,
    );
    updateLayout({ ...page.layoutJSON, sections: newSections });
    if (selectedBlockId === sectionId) setSelectedBlockId(null);
  };

  const addBlockToColumn = (columnId: string, type: BlockType) => {
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
        columns: sec.columns.map((col) =>
          col.id === columnId
            ? { ...col, blocks: [...col.blocks, newBlock] }
            : col,
        ),
      }));
    updateLayout({ ...page.layoutJSON, sections: newSections });
    setSelectedBlockId(newBlock.id);
    setActiveTab("settings");
  };

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
          { platform: "Facebook", url: "#", icon: "Facebook" },
          { platform: "Twitter", url: "#", icon: "Twitter" },
          { platform: "Instagram", url: "#", icon: "Instagram" },
          { platform: "LinkedIn", url: "#", icon: "LinkedIn" },
          { platform: "GitHub", url: "#", icon: "GitHub" },
        ];
      case "code":
        return {
          html: '<div class="custom-widget">\n  <h3>Hello Custom Widget</h3>\n  <button id="myBtn">Click Me</button>\n</div>',
          css: ".custom-widget {\n  padding: 20px;\n  background: #f0f9ff;\n  border-radius: 12px;\n  text-align: center;\n  border: 2px solid #bae6fd;\n}\n.custom-widget h3 {\n  color: #0369a1;\n  margin-bottom: 10px;\n}\n.custom-widget button {\n  background: #0ea5e9;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n}",
          js: 'const btn = document.getElementById("myBtn");\nif (btn) {\n  btn.onclick = () => alert("Hello from Custom JS!");\n}',
          height: "auto",
        };
      case "form":
        return {
          title: "Contact Us",
          description: "We'll get back to you as soon as possible.",
          buttonText: "Send Message",
          successMessage: "Thank you! Your message has been sent.",
          fields: [
            { id: "name", label: "Full Name", type: "text", placeholder: "John Doe", required: true },
            { id: "email", label: "Email Address", type: "email", placeholder: "john@example.com", required: true },
            { id: "subject", label: "Subject", type: "text", placeholder: "How can we help?", required: false },
            { id: "message", label: "Message", type: "textarea", placeholder: "Your message here...", required: true },
          ],
        };
      case "columns":
        return [];
      default:
        return "";
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

  const removeBlock = (blockId: string) => {
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
  };

  const onDragStartTemplate = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData("templateId", templateId);
    setDraggedTemplateId(templateId);
    setDraggedBlockType(null);
    setDraggedPageId(null);
  };

  const onDragStartPage = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData("pageId", pageId);
    setDraggedPageId(pageId);
    setDraggedBlockType(null);
    setDraggedTemplateId(null);
  };

  const handleDropOnCanvas = (e: React.DragEvent, atIndex?: number) => {
    e.preventDefault();
    if (!page) return;

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
          // It's a page template, replace or append? Let's append sections for now
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
  };

  if (!page) return null;

  const selectedElement = getSelectedBlock();

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden text-slate-300">
      {/* Top Header */}
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
            {activeUsers.map((u) => (
              <div
                key={u.socketId}
                className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                style={{ backgroundColor: u.color }}
                title={u.name}
              >
                {u.name.substring(0, 2).toUpperCase()}
              </div>
            ))}
          </div>

          {!template && (
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <Copy size={16} />
              <span>Save as Template</span>
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={downloadPage}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-1.5 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 ${isSaving ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isSaving ? "Saving..." : "Publish"}</span>
          </button>
          <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>
          <button 
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidepanel */}
        <aside className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col z-40">
          {/* Tab Navigation */}
          <div className="grid grid-cols-3 border-b border-slate-700 bg-slate-800/80">
            <TabButton
              active={activeTab === "blocks"}
              onClick={() => setActiveTab("blocks")}
              icon={<LayoutPanelLeft size={18} />}
              label="Widgets"
            />
            <TabButton
              active={activeTab === "pages"}
              onClick={() => setActiveTab("pages")}
              icon={<FileText size={18} />}
              label="Pages"
            />
            <TabButton
              active={activeTab === "templates"}
              onClick={() => setActiveTab("templates")}
              icon={<Copy size={18} />}
              label="Templates"
            />
            <TabButton
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              icon={<Settings size={18} />}
              label="Design"
            />
            <TabButton
              active={activeTab === "layers"}
              onClick={() => setActiveTab("layers")}
              icon={<ListTree size={18} />}
              label="Layers"
            />
            {page.isCustomSite && (
              <TabButton
                active={activeTab === "code"}
                onClick={() => setActiveTab("code")}
                icon={<Code size={18} />}
                label="Code"
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-800">
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

            {/* DESIGN PANEL */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {!selectedBlockId ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <Palette size={16} className="text-blue-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Global Styles
                      </h3>
                    </div>

                    <div className="space-y-4 p-1">
                      <ControlGroup label="Typography">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
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

                      <ControlGroup label="Colors">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Primary
                            </label>
                            <input
                              type="color"
                              value={globalStyles.primaryColor}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  primaryColor: e.target.value,
                                }))
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Secondary
                            </label>
                            <input
                              type="color"
                              value={globalStyles.secondaryColor}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  secondaryColor: e.target.value,
                                }))
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Accent
                            </label>
                            <input
                              type="color"
                              value={globalStyles.accentColor}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  accentColor: e.target.value,
                                }))
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Background
                            </label>
                            <input
                              type="color"
                              value={globalStyles.backgroundColor}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  backgroundColor: e.target.value,
                                }))
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Text
                            </label>
                            <input
                              type="color"
                              value={globalStyles.textColor}
                              onChange={(e) =>
                                setGlobalStyles((prev) => ({
                                  ...prev,
                                  textColor: e.target.value,
                                }))
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </div>
                        </div>
                      </ControlGroup>

                      <ControlGroup label="Layout">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
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

                    <div className="space-y-5">
                      {selectedElement?.type === "section" && (
                        <>
                          <ControlGroup label="Section Background">
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                                    Color
                                  </label>
                                  <input
                                    type="color"
                                    value={
                                      selectedElement?.styles
                                        ?.backgroundColor || "#ffffff"
                                    }
                                    onChange={(e) =>
                                      updateElement(selectedBlockId!, {
                                        styles: {
                                          ...selectedElement?.styles,
                                          backgroundColor: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block">
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
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">
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
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">
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
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block">
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

                      <ControlGroup label="Alignment">
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
                        <ControlGroup label="Padding (px)">
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
                        <ControlGroup label="Border Radius">
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
                          <ControlGroup label="Border Width">
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
                          <ControlGroup label="Border Color">
                            <input
                              type="color"
                              value={
                                selectedElement?.styles?.borderColor ||
                                "#000000"
                              }
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  styles: {
                                    ...selectedElement?.styles,
                                    borderColor: e.target.value,
                                  },
                                })
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </ControlGroup>
                        </div>

                        <ControlGroup label="Border Style">
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
                            <ControlGroup label="Text Color">
                              <input
                                type="color"
                                value={
                                  selectedElement?.styles?.color || "#000000"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      color: e.target.value,
                                    },
                                  })
                                }
                                className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                              />
                            </ControlGroup>
                            <ControlGroup label="Background Color">
                              <input
                                type="color"
                                value={
                                  selectedElement?.styles?.backgroundColor ||
                                  "transparent"
                                }
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      backgroundColor: e.target.value,
                                    },
                                  })
                                }
                                className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                              />
                            </ControlGroup>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <ControlGroup label="Display">
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
                            <ControlGroup label="Opacity">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={selectedElement?.styles?.opacity ?? 1}
                                onChange={(e) =>
                                  updateElement(selectedBlockId!, {
                                    styles: {
                                      ...selectedElement?.styles,
                                      opacity: parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                            </ControlGroup>
                            <ControlGroup label="Z-Index">
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
                            <ControlGroup label="Width">
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
                            <ControlGroup label="Height">
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
                            <ControlGroup label="Margin (px)">
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
                            <ControlGroup label="Box Shadow">
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
                            <ControlGroup label="Font Size">
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
                            <ControlGroup label="Font Weight">
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

                          <ControlGroup label="Custom CSS">
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

                      {selectedElement?.type === "code" && (
                        <div className="space-y-4">
                          <ControlGroup label="Widget Height">
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
                          <ControlGroup label="HTML Content">
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
                          <ControlGroup label="Custom CSS">
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
                          <ControlGroup label="Custom JS">
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
                          <ControlGroup label="Form Title">
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
                          <ControlGroup label="Description">
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
                          <ControlGroup label="Submit Button Text">
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Form Fields
                            </label>
                            <div className="space-y-2">
                              {(selectedElement?.content?.fields || []).map(
                                (field: any, index: number) => (
                                  <div
                                    key={field.id}
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

                      {selectedElement?.type === "button" && (
                        <ControlGroup label="Button Label">
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
                          <ControlGroup label="Logo Visibility">
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
                            <ControlGroup label="Logo Type">
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
                                <ControlGroup label="Logo Text">
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
                                <ControlGroup label="Logo Image">
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                        <ControlGroup label="HTML Source">
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
                        <ControlGroup label="Image Source">
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
                          <ControlGroup label="Icon Name">
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
                          <ControlGroup label="Icon Size">
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
                          <ControlGroup label="Icon Color">
                            <input
                              type="color"
                              value={
                                selectedElement?.content?.color || "#3b82f6"
                              }
                              onChange={(e) =>
                                updateElement(selectedBlockId!, {
                                  content: {
                                    ...(typeof selectedElement?.content ===
                                    "object"
                                      ? selectedElement.content
                                      : {}),
                                    color: e.target.value,
                                  },
                                })
                              }
                              className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                            />
                          </ControlGroup>
                        </div>
                      )}

                      {selectedElement?.type === "accordion" && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                          <ControlGroup label="Plan Name">
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
                            <ControlGroup label="Currency" className="w-1/3">
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
                            <ControlGroup label="Price" className="flex-1">
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
                          <ControlGroup label="Featured Plan">
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
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
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

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto builder-canvas px-4 py-8 relative">
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
            className={`mx-auto shadow-2xl transition-all min-h-[calc(100vh-100px)] border relative border-dashed border-slate-200 builder-canvas-content ${
              viewMode === "desktop"
                ? "w-full"
                : viewMode === "tablet"
                  ? "max-w-2xl"
                  : "max-w-sm"
            }`}
            style={{ backgroundColor: globalStyles.backgroundColor }}
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

                      <section
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
                          setSelectedBlockId(section.id);
                          setActiveTab("settings");
                        }}
                        className={`flex flex-wrap border-2 border-transparent hover:border-blue-400 relative transition-colors ${selectedBlockId === section.id ? "border-blue-500 bg-blue-50/5" : ""}`}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 hidden group-hover/section:flex items-center gap-1 bg-blue-600 rounded-full px-2 py-1 shadow-lg z-20">
                          <div className="p-1 hover:bg-white/20 rounded-full text-white cursor-grab">
                            <GripVertical size={12} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(section.id);
                            }}
                            className="p-1 hover:bg-white/20 rounded-full text-white"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {section.columns.map((column) => (
                          <div
                            key={column.id}
                            style={{ width: `${column.width}%` }}
                            onDragOver={(e) => onDragOverColumn(e, column.id)}
                            onDrop={(e) => onDropOnColumn(e, column.id)}
                            className={`min-h-[120px] border-r last:border-r-0 border-dashed border-slate-200 p-4 flex flex-col gap-4 relative group/column transition-all ${
                              draggedOverColumn === column.id
                                ? "bg-blue-50/50 ring-2 ring-blue-400 ring-inset"
                                : ""
                            }`}
                          >
                            {column.blocks.map((block) => (
                              <div
                                key={block.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBlockId(block.id);
                                  setActiveTab("settings");
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
                                className={`relative border-2 ${selectedBlockId === block.id ? "border-blue-500 bg-blue-50/20 shadow-sm" : "border-transparent hover:border-blue-200"} p-2 group/block transition-all rounded`}
                              >
                                {selectedBlockId === block.id && (
                                  <div className="absolute -top-6 right-0 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold rounded-t-md px-2 py-1 z-30">
                                    <span>
                                      {(block.type || "").toUpperCase()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeBlock(block.id);
                                      }}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                )}
                                <BlockRenderer
                                  block={block}
                                  globalStyles={globalStyles}
                                  onRemove={() => removeBlock(block.id)}
                                  onUpdate={(updates) =>
                                    updateElement(block.id, updates)
                                  }
                                />
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addBlockToColumn(column.id, "text");
                              }}
                              className={`w-full py-4 border-2 border-dashed rounded-lg mt-auto flex flex-col items-center gap-2 transition-all ${
                                draggedOverColumn === column.id
                                  ? "border-blue-500 text-blue-600 bg-blue-100/50"
                                  : "border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400"
                              }`}
                            >
                              <Plus size={16} />
                              <span className="text-[10px] font-bold uppercase">
                                {draggedOverColumn === column.id
                                  ? "Drop to Add"
                                  : "Add Widget"}
                              </span>
                            </button>
                          </div>
                        ))}
                      </section>

                      <div
                        className="absolute bottom-0 left-0 right-0 h-4 translate-y-1/2 opacity-0 group-hover/section:opacity-100 flex items-center justify-center z-10 transition-opacity"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropOnCanvas(e, sIdx + 1)}
                      >
                        <button
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
                    </div>
                  ))}

                {page.layoutJSON.sections.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center min-h-[70vh] text-slate-300 p-8"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnCanvas(e)}
                  >
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 flex flex-col items-center gap-8">
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                          Build your page from scratch
                        </h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                          Click any widget below to add it to your canvas or
                          start with a section layout.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full">
                        {BLOCK_DEFS.filter((b) => b.type !== "columns").map(
                          (block) => (
                            <button
                              key={block.type}
                              onClick={() => onWidgetClick(block.type)}
                              className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                {block.icon}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                                {block.label}
                              </span>
                            </button>
                          ),
                        )}
                      </div>

                      <div className="flex items-center gap-4 w-full">
                        <div className="flex-1 h-[1px] bg-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          OR
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-100" />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowLayoutPicker({ index: 0, position: "end" })
                        }
                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95"
                      >
                        <LayoutPanelLeft size={20} />
                        Choose a Section Layout
                      </button>
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
      {/* Cursor Overlay */}
      {Object.entries(otherCursors).map(([socketId, cursor]) => {
        const user = activeUsers.find((u) => u.socketId === socketId);
        if (!user) return null;
        const c = cursor as { x: number; y: number };
        return (
          <div
            key={socketId}
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

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
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

const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
      {label}
    </label>
    {children}
  </div>
);

const BlockRenderer: React.FC<{
  block: Block;
  onUpdate: (updates: any) => void;
  onRemove: () => void;
  globalStyles: GlobalStyles;
}> = ({ block, onUpdate, onRemove, globalStyles }) => {
  const alignClass =
    block.styles?.textAlign === "center"
      ? "text-center"
      : block.styles?.textAlign === "right"
        ? "text-right"
        : "text-left";

  const getIcon = (name: string) => {
    const icons: Record<string, any> = {
      Smile,
      Facebook,
      Twitter,
      Instagram,
      Linkedin,
      LinkedIn: Linkedin,
      Github,
      GitHub: Github,
      ExternalLink,
      Play,
      Code,
    };
    const IconComp = icons[name] || Smile;
    return (
      <IconComp
        size={block.type === "icon" ? block.content.size : 20}
        color={block.type === "icon" ? block.content.color : undefined}
      />
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onUpdate({ content: e.currentTarget.innerHTML });
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLElement>) => {
    onUpdate({ content: e.currentTarget.innerHTML });
  };

  const handleButtonBlur = (e: React.FocusEvent<HTMLElement>) => {
    onUpdate({ content: e.currentTarget.innerText });
  };

  switch (block.type) {
    case "text":
      return (
        <div
          className={`text-slate-800 prose max-w-none outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1 ${alignClass}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTextBlur}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case "image":
      return (
        <div className="relative group/img">
          <img
            src={block.content}
            className="max-w-full h-auto rounded shadow-sm mx-auto select-none"
            alt="Widget"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = prompt("Enter Image URL:", block.content);
                if (url) onUpdate({ content: url });
              }}
              className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
            >
              Change Image
            </button>
          </div>
        </div>
      );
    case "button":
      return (
        <div className={alignClass}>
          <button
            type="button"
            contentEditable
            suppressContentEditableWarning
            onBlur={handleButtonBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            className="px-6 py-3 text-white font-bold rounded shadow-sm transition-all active:scale-95 outline-none focus:ring-4 focus:ring-blue-500/30 btn-primary"
          >
            {block.content}
          </button>
        </div>
      );
    case "video":
      return (
        <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center relative group/vid">
          <iframe
            src={block.content}
            className="w-full h-full pointer-events-none"
            title="Video"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = prompt(
                  "Enter YouTube/Vimeo Embed URL:",
                  block.content,
                );
                if (url) onUpdate({ content: url });
              }}
              className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
            >
              Change Video
            </button>
          </div>
        </div>
      );
    case "nav":
      const navContent =
        typeof block.content === "object" && block.content !== null
          ? block.content
          : { logo: "DevInquire", links: [], logoType: "text", logoUrl: "" };
      return (
        <nav className="flex items-center justify-between py-4 px-6 bg-white border rounded shadow-sm group/nav">
          <div className="flex items-center gap-4">
            {navContent.showLogo !== false && (
              <div className="flex items-center gap-3">
                {(navContent.logoType === "image" ||
                  navContent.logoType === "both") &&
                  navContent.logoUrl && (
                    <div className="relative group/logo">
                      <img
                        src={navContent.logoUrl}
                        alt="Logo"
                        className="h-8 w-auto object-contain select-none"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = prompt(
                              "Enter Logo Image URL:",
                              navContent.logoUrl,
                            );
                            if (url)
                              onUpdate({
                                content: { ...navContent, logoUrl: url },
                              });
                          }}
                          className="bg-white text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                {(navContent.logoType === "text" ||
                  navContent.logoType === "both" ||
                  !navContent.logoType) && (
                  <div
                    data-heading="true"
                    className="text-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      onUpdate({
                        content: {
                          ...navContent,
                          logo: e.currentTarget.innerText,
                        },
                      })
                    }
                  >
                    {navContent.logo}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {(navContent.links || []).map((link: any, idx: number) => (
              <div key={idx} className="relative group/link flex items-center">
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newLinks = [...navContent.links];
                    newLinks[idx] = {
                      ...newLinks[idx],
                      label: e.currentTarget.innerText,
                    };
                    onUpdate({ content: { ...navContent, links: newLinks } });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  className="text-sm font-medium transition-colors cursor-text outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
                  style={{ color: globalStyles.textColor }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = globalStyles.primaryColor)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = globalStyles.textColor)
                  }
                >
                  {link.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newLinks = [...navContent.links];
                    newLinks.splice(idx, 1);
                    onUpdate({ content: { ...navContent, links: newLinks } });
                  }}
                  className="absolute -top-4 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/link:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  title="Remove Link"
                >
                  <X size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = prompt("Enter Link URL:", link.url);
                    if (url !== null) {
                      const newLinks = [...navContent.links];
                      newLinks[idx] = { ...newLinks[idx], url };
                      onUpdate({ content: { ...navContent, links: newLinks } });
                    }
                  }}
                  className="absolute -top-4 right-3 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/link:opacity-100 transition-opacity hover:bg-blue-600 z-10"
                  title="Edit URL"
                >
                  <ExternalLink size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newLinks = [
                  ...(navContent.links || []),
                  { label: "New Link", url: "#" },
                ];
                onUpdate({ content: { ...navContent, links: newLinks } });
              }}
              className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-all opacity-0 group-hover/nav:opacity-100"
              title="Add Link"
            >
              <Plus size={14} />
            </button>
          </div>
        </nav>
      );
    case "icon":
      return (
        <div className={alignClass}>{getIcon(block.content.iconName)}</div>
      );
    case "accordion":
      return (
        <div className="space-y-2">
          {(block.content || []).map((item: any, idx: number) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <button
                onClick={() => {
                  const newContent = [...block.content];
                  newContent[idx] = {
                    ...newContent[idx],
                    isOpen: !newContent[idx].isOpen,
                  };
                  onUpdate({ content: newContent });
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span
                  data-heading="true"
                  className="font-semibold text-slate-800"
                >
                  {item.title}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform ${item.isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {item.isOpen && (
                <div className="px-4 py-3 text-sm text-slate-600 border-t border-slate-100 bg-slate-50/30">
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "pricing":
      const p = block.content;
      return (
        <div
          className={`p-8 rounded-2xl border ${p.isFeatured ? "border-blue-500 shadow-xl ring-4 ring-blue-500/10 bg-white scale-105" : "border-slate-200 bg-white shadow-md"} flex flex-col items-center text-center`}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-2">{p.plan}</h3>
          <div data-heading="true" className="flex items-baseline gap-1 mb-6">
            <span className="text-2xl font-bold text-slate-900">
              {p.currency}
            </span>
            <span className="text-5xl font-black text-slate-900">
              {p.price}
            </span>
            <span className="text-slate-500">/{p.period}</span>
          </div>
          <ul className="space-y-3 mb-8 w-full">
            {p.features.map((f: string, i: number) => (
              <li
                key={i}
                className="text-sm text-slate-600 flex items-center justify-center gap-2"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: globalStyles.primaryColor }}
                />
                {f}
              </li>
            ))}
          </ul>
          <button
            className={`w-full py-3 rounded-xl font-bold transition-all ${p.isFeatured ? "text-white hover:opacity-90 shadow-lg shadow-blue-500/25 btn-primary" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
          >
            {p.buttonText}
          </button>
        </div>
      );
    case "social":
      return (
        <div
          className={`flex gap-4 ${alignClass === "text-center" ? "justify-center" : alignClass === "text-right" ? "justify-end" : "justify-start"}`}
        >
          {(block.content || []).map((s: any, i: number) => (
            <a
              key={i}
              href={s.url}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              {getIcon(s.icon)}
            </a>
          ))}
        </div>
      );
    case "spacer":
      return (
        <div className="h-10 w-full bg-slate-50/10 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
          Spacer
        </div>
      );
    case "html":
      return (
        <div
          className="text-sm prose max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case "code":
      const codeContent = block.content || {
        html: "",
        css: "",
        js: "",
        height: "auto",
      };
      const combinedCode = `
        <html>
          <head>
            <style>
              body { margin: 0; font-family: sans-serif; overflow: hidden; }
              ${codeContent.css}
            </style>
          </head>
          <body>
            <div id="wrapper">
              ${codeContent.html}
            </div>
            <script>
              try {
                ${codeContent.js}
              } catch (e) {
                console.error("Custom JS Error:", e);
              }
              
              function sendHeight() {
                const wrapper = document.getElementById('wrapper');
                if (wrapper) {
                  const height = wrapper.scrollHeight;
                  window.parent.postMessage({
                    type: 'resize-iframe',
                    blockId: '${block.id}',
                    height: height
                  }, '*');
                }
              }
              
              window.onload = sendHeight;
              if (window.ResizeObserver) {
                new ResizeObserver(sendHeight).observe(document.getElementById('wrapper'));
              }
              // Fallback for dynamic content
              setInterval(sendHeight, 1000);
            </script>
          </body>
        </html>
      `;

      return (
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
          <iframe
            id={`iframe-${block.id}`}
            srcDoc={combinedCode}
            style={{
              height:
                codeContent.height === "auto" ? "auto" : codeContent.height,
              minHeight: codeContent.height === "auto" ? "50px" : undefined,
            }}
            className="w-full border-none"
            title="Custom Widget"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      );
    case "form":
      const f = block.content;
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          {f.title && (
            <h3 className="text-xl font-bold text-slate-900 mb-1">{f.title}</h3>
          )}
          {f.description && (
            <p className="text-sm text-slate-500 mb-6">{f.description}</p>
          )}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {(f.fields || []).map((field: any) => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    placeholder={field.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              style={{ backgroundColor: globalStyles.primaryColor }}
              className="w-full text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 mt-2"
            >
              {f.buttonText}
            </button>
          </form>
        </div>
      );
    case "columns":
      return (
        <div className="p-6 bg-blue-50/50 border border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Columns size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800">
              Legacy Columns Block
            </p>
            <p className="text-[10px] text-slate-500 max-w-[200px]">
              Please use the "Columns / Layout" tool in the Widgets tab to add
              multi-column sections.
            </p>
          </div>
          <button
            onClick={onRemove}
            className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            Remove this block
          </button>
        </div>
      );
    default:
      return (
        <div className="p-4 bg-slate-100 border italic text-slate-400 text-xs">
          Unknown: {block.type}
        </div>
      );
  }
};

export default Editor;
