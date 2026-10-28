
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Smile, Facebook, Twitter, Instagram, Linkedin, ExternalLink, 
  Play, Code, MapPin, Quote, Grid, Minus, Hash, Activity, 
  Trello, CheckSquare, Check, AlertCircle, Mail, Info, 
  CheckCircle, AlertTriangle, Star, Heart, ArrowRight, X, Plus,
  ChevronDown, Home, FileText, ChevronRight, Columns
} from 'lucide-react';
import { Block, GlobalStyles, Page } from '../types';

interface BlockRendererProps {
  block: Block;
  onUpdate?: (updates: any) => void;
  onRemove?: () => void;
  globalStyles: GlobalStyles;
  pages: Page[];
  readOnly?: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, onUpdate, onRemove, globalStyles, pages, readOnly = false 
}) => {
  const alignClass =
    block.styles?.textAlign === "center"
      ? "text-center"
      : block.styles?.textAlign === "right"
        ? "text-right"
        : "text-left";

  const getIcon = (name: string) => {
    const icons: Record<string, any> = {
      Smile, Facebook, Twitter, Instagram, Linkedin, LinkedIn: Linkedin,
      Github: Linkedin, GitHub: Linkedin, ExternalLink, Play, Code, MapPin,
      Quote, Grid, Minus, Hash, Activity, Trello, CheckSquare, Check,
      AlertCircle, Mail, Info, CheckCircle, AlertTriangle, Star, Heart, ArrowRight,
    };
    const IconComp = icons[name] || Smile;
    return (
      <IconComp
        size={block.type === "icon" ? block.content.size : 20}
        color={block.type === "icon" ? block.content.color : undefined}
      />
    );
  };

  const handleUpdate = (updates: any) => {
    if (!readOnly && onUpdate) {
      onUpdate(updates);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    handleUpdate({ content: e.currentTarget.innerHTML });
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLElement>) => {
    handleUpdate({ content: e.currentTarget.innerHTML });
  };

  const handleButtonBlur = (e: React.FocusEvent<HTMLElement>) => {
    handleUpdate({ content: e.currentTarget.innerText });
  };

  switch (block.type) {
    case "text":
      return (
        <div
          className={`text-slate-800 prose max-w-none outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1 ${alignClass}`}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onBlur={handleTextBlur}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case "image":
      return (
        <div 
          className="relative group/img transition-all"
          onDragOver={(e) => {
            if (!readOnly && (e.dataTransfer.types.includes('mediaurl') || e.dataTransfer.types.includes('application/json'))) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDrop={(e) => {
            if (readOnly) return;
            const mediaUrl = e.dataTransfer.getData('mediaUrl');
            if (mediaUrl) {
              e.preventDefault();
              e.stopPropagation();
              handleUpdate({ content: mediaUrl });
            }
          }}
        >
          <img
            src={block.content}
            className="max-w-full h-auto rounded shadow-sm mx-auto select-none transition-transform group-hover/img:scale-[1.005]"
            alt="Widget"
            draggable={false}
          />
          {!readOnly && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded gap-2 p-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = prompt("Enter Image URL:", block.content);
                  if (url) handleUpdate({ content: url });
                }}
                className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-slate-100 transition-all"
              >
                Change Image URL
              </button>
              <span className="text-[10px] text-white/90 bg-black/60 px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                or drop asset here
              </span>
            </div>
          )}
        </div>
      );
    case "button":
      return (
        <div className={alignClass}>
          <button
            type="button"
            contentEditable={!readOnly}
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
          {!readOnly && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = prompt(
                    "Enter YouTube/Vimeo Embed URL:",
                    block.content,
                  );
                  if (url) handleUpdate({ content: url });
                }}
                className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              >
                Change Video
              </button>
            </div>
          )}
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
                      {!readOnly && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = prompt(
                                "Enter Logo Image URL:",
                                navContent.logoUrl,
                              );
                              if (url)
                                handleUpdate({
                                  content: { ...navContent, logoUrl: url },
                                });
                            }}
                            className="bg-white text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                {(navContent.logoType === "text" ||
                  navContent.logoType === "both" ||
                  !navContent.logoType) && (
                  <div
                    data-heading="true"
                    className="text-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1"
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdate({
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
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newLinks = [...navContent.links];
                    newLinks[idx] = {
                      ...newLinks[idx],
                      label: e.currentTarget.innerText,
                    };
                    handleUpdate({ content: { ...navContent, links: newLinks } });
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
                {!readOnly && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newLinks = [...navContent.links];
                        newLinks.splice(idx, 1);
                        handleUpdate({ content: { ...navContent, links: newLinks } });
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
                          handleUpdate({ content: { ...navContent, links: newLinks } });
                        }
                      }}
                      className="absolute -top-4 right-3 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/link:opacity-100 transition-opacity hover:bg-blue-600 z-10"
                      title="Edit URL"
                    >
                      <ExternalLink size={10} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newLinks = [
                    ...(navContent.links || []),
                    { label: "New Link", url: "#" },
                  ];
                  handleUpdate({ content: { ...navContent, links: newLinks } });
                }}
                className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-all opacity-0 group-hover/nav:opacity-100"
                title="Add Link"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </nav>
      );
    case "icon":
      return (
        <div className={alignClass}>{getIcon(block.content.iconName)}</div>
      );
    case "accordion":
      const accItems = Array.isArray(block.content) ? block.content : [];
      return (
        <div className="space-y-2">
          {accItems.map((item: any, idx: number) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <span
                  data-heading="true"
                  className="font-semibold text-slate-800 flex-1 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newContent = [...accItems];
                    newContent[idx] = { ...newContent[idx], title: e.currentTarget.innerText };
                    handleUpdate({ content: newContent });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                >
                  {item.title}
                </span>
                <div className="flex items-center gap-1.5 ml-2">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newContent = accItems.filter((_: any, i: number) => i !== idx);
                        handleUpdate({ content: newContent });
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      title="Remove Item"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const newContent = [...accItems];
                      newContent[idx] = {
                        ...newContent[idx],
                        isOpen: !newContent[idx].isOpen,
                      };
                      handleUpdate({ content: newContent });
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${item.isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>
              {item.isOpen && (
                <div 
                  className="px-4 py-3 text-sm text-slate-600 border-t border-slate-100 bg-slate-50/30 outline-none focus:ring-1 focus:ring-blue-500/20"
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newContent = [...accItems];
                    newContent[idx] = { ...newContent[idx], content: e.currentTarget.innerText };
                    handleUpdate({ content: newContent });
                  }}
                >
                  {item.content}
                </div>
              )}
            </div>
          ))}

          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const newContent = [
                  ...accItems,
                  { title: "New Question Title", content: "Detailed explanation or answer goes here.", isOpen: true }
                ];
                handleUpdate({ content: newContent });
              }}
              className="w-full py-2 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-center gap-1 transition-colors"
            >
              <Plus size={13} />
              <span>Add FAQ Item</span>
            </button>
          )}
        </div>
      );
    case "pricing":
      const p = block.content || {};
      const features = Array.isArray(p.features) ? p.features : [];
      return (
        <div
          className={`p-8 rounded-2xl border ${p.isFeatured ? "border-blue-500 shadow-xl ring-4 ring-blue-500/10 bg-white scale-105" : "border-slate-200 bg-white shadow-md"} flex flex-col items-center text-center relative group/pricing`}
        >
          {!readOnly && (
            <div className="absolute top-3 right-3 opacity-0 group-hover/pricing:opacity-100 transition-opacity flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdate({ content: { ...p, isFeatured: !p.isFeatured } });
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${p.isFeatured ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
              >
                {p.isFeatured ? '★ Featured' : 'Make Featured'}
              </button>
            </div>
          )}

          <h3 
            className="text-lg font-bold text-slate-900 mb-2 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onBlur={(e) => handleUpdate({ content: { ...p, plan: e.currentTarget.innerText } })}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          >
            {p.plan || "Pro Plan"}
          </h3>

          <div data-heading="true" className="flex items-baseline gap-1 mb-6">
            <span 
              className="text-2xl font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-0.5"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => handleUpdate({ content: { ...p, currency: e.currentTarget.innerText } })}
            >
              {p.currency || "$"}
            </span>
            <span 
              className="text-5xl font-black text-slate-900 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => handleUpdate({ content: { ...p, price: e.currentTarget.innerText } })}
            >
              {p.price || "29"}
            </span>
            <span className="text-slate-500">/{p.period || "month"}</span>
          </div>

          <ul className="space-y-3 mb-6 w-full">
            {features.map((f: string, i: number) => (
              <li
                key={i}
                className="text-sm text-slate-600 flex items-center justify-between gap-2 group/feat px-2 py-0.5 rounded hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: globalStyles.primaryColor }}
                  />
                  <span
                    className="flex-1 text-left outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newFeats = [...features];
                      newFeats[i] = e.currentTarget.innerText;
                      handleUpdate({ content: { ...p, features: newFeats } });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  >
                    {f}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newFeats = features.filter((_: any, idx: number) => idx !== i);
                      handleUpdate({ content: { ...p, features: newFeats } });
                    }}
                    className="opacity-0 group-hover/feat:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const newFeats = [...features, "New Included Feature"];
                handleUpdate({ content: { ...p, features: newFeats } });
              }}
              className="mb-4 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-3 rounded-full hover:bg-blue-50 transition-colors"
            >
              <Plus size={12} />
              <span>Add Feature</span>
            </button>
          )}

          <button
            type="button"
            className={`w-full py-3 rounded-xl font-bold transition-all ${p.isFeatured ? "text-white hover:opacity-90 shadow-lg shadow-blue-500/25 btn-primary" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onBlur={(e) => handleUpdate({ content: { ...p, buttonText: e.currentTarget.innerText } })}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          >
            {p.buttonText || "Choose Plan"}
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
    case "embed":
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
    case "sitemap":
      const sm = block.content;
      const displayPages = (pages || []).filter(p => {
        if (!sm.showDrafts && p.status === 'draft') return false;
        if (!sm.showHome && p.slug === 'home') return false;
        return true;
      });

      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          {sm.title && <h3 className="text-xl font-bold text-slate-900 mb-6">{sm.title}</h3>}
          <div className={sm.layout === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}>
            {displayPages.map(p => (
              <Link 
                key={p.id} 
                to={readOnly ? `/${p.slug}` : `/editor/${p.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group/sm-item ${sm.layout === 'grid' ? 'flex-col text-center' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${p.slug === 'home' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover/sm-item:bg-white group-hover/sm-item:text-blue-600'}`}>
                  {p.slug === 'home' ? <Home size={20} /> : <FileText size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-800">{p.title}</p>
                    {p.status === 'draft' && (
                      <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">Draft</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono italic">/{p.slug}</p>
                </div>
                {sm.layout === 'list' && <ChevronRight size={14} className="text-slate-300 group-hover/sm-item:text-blue-400" />}
              </Link>
            ))}
            {displayPages.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                No pages to display
              </div>
            )}
          </div>
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
            {(f.fields || []).map((field: any, fIdx: number) => (
              <div key={field.id || field.label || `form-field-${fIdx}`} className="space-y-1.5">
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
    case "map":
      return (
        <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative group/map">
          <div className="absolute inset-0 flex items-center justify-center bg-slate-200/50">
            <div className="text-center">
              <MapPin size={32} className="text-red-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {block.content.address}
              </p>
              <p className="text-[10px] text-slate-500">
                Zoom: {block.content.zoom}
              </p>
            </div>
          </div>
          {!readOnly && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/map:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const address = prompt("Enter Address:", block.content.address);
                  if (address) handleUpdate({ content: { ...block.content, address } });
                }}
                className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg"
              >
                Change Address
              </button>
            </div>
          )}
        </div>
      );
    case "testimonial":
      const t = block.content || {};
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative group/testim">
          <Quote
            size={40}
            className="absolute top-4 right-4 text-slate-100 -z-0"
          />
          <div className="relative z-10">
            <p 
              className="text-lg text-slate-700 italic mb-6 leading-relaxed outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => handleUpdate({ content: { ...t, quote: e.currentTarget.innerText } })}
            >
              {t.quote ? `"${t.quote.replace(/^"|"$/g, '')}"` : '"This builder is ridiculously fast and easy to use."'}
            </p>
            <div className="flex items-center gap-4">
              {t.avatar && (
                <div className="relative group/avatar">
                  <img
                    src={t.avatar}
                    alt={t.author || "Avatar"}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newUrl = prompt("Enter Avatar Image URL:", t.avatar);
                        if (newUrl) handleUpdate({ content: { ...t, avatar: newUrl } });
                      }}
                      className="absolute inset-0 bg-black/60 rounded-full text-[9px] text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center font-bold"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1">
                <h4 
                  className="font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-0.5"
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => handleUpdate({ content: { ...t, author: e.currentTarget.innerText } })}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                >
                  {t.author || "Jane Doe"}
                </h4>
                <p 
                  className="text-xs text-slate-500 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-0.5"
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => handleUpdate({ content: { ...t, role: e.currentTarget.innerText } })}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                >
                  {t.role || "Founder & CEO"}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(block.content || []).map((img: string, idx: number) => (
            <div key={idx} className="aspect-square relative group/gal">
              <img
                src={img}
                alt={`Gallery ${idx}`}
                className="w-full h-full object-cover rounded-xl shadow-sm"
              />
              {!readOnly && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/gal:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = prompt("Enter Image URL:", img);
                      if (url) {
                        const newGallery = [...block.content];
                        newGallery[idx] = url;
                        handleUpdate({ content: newGallery });
                      }
                    }}
                    className="bg-white text-slate-900 px-2 py-1 rounded-full text-[10px] font-bold shadow-lg"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "divider":
      const d = block.content;
      return (
        <div className={alignClass}>
          <div
            style={{
              backgroundColor: d.color,
              height: `${d.thickness}px`,
              width: d.width,
              borderStyle: d.style,
              display: "inline-block",
            }}
            className="rounded-full"
          />
        </div>
      );
    case "counter":
      const c = block.content;
      return (
        <div className="text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div
            className="text-4xl font-black mb-1"
            style={{ color: globalStyles.primaryColor }}
          >
            {c.prefix}
            {c.number}
            {c.suffix}
          </div>
          <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            {c.label}
          </div>
        </div>
      );
    case "progress":
      const pr = block.content;
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-700">{pr.label}</span>
            <span className="text-xs font-bold text-slate-500">
              {pr.percentage}%
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{
                width: `${pr.percentage}%`,
                backgroundColor: pr.color || globalStyles.primaryColor,
              }}
            />
          </div>
        </div>
      );
    case "tabs":
      const tabs = Array.isArray(block.content?.tabs) ? block.content.tabs : [];
      const activeIdx = block.content?.activeTab || 0;
      return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            {tabs.map((tab: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center border-b-2 transition-all ${activeIdx === idx ? "border-blue-600 bg-white" : "border-transparent"}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate({ content: { ...block.content, activeTab: idx } })
                  }
                  className={`px-5 py-3 text-sm font-bold outline-none ${activeIdx === idx ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                  contentEditable={!readOnly && activeIdx === idx}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newTabs = [...tabs];
                    newTabs[idx] = { ...newTabs[idx], title: e.currentTarget.innerText };
                    handleUpdate({ content: { ...block.content, tabs: newTabs } });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                >
                  {tab.title}
                </button>
                {!readOnly && tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTabs = tabs.filter((_: any, i: number) => i !== idx);
                      handleUpdate({
                        content: {
                          ...block.content,
                          tabs: newTabs,
                          activeTab: Math.max(0, activeIdx - 1)
                        }
                      });
                    }}
                    className="pr-2 text-slate-300 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  const newTabs = [...tabs, { title: `Tab ${tabs.length + 1}`, content: 'Content for the new tab.' }];
                  handleUpdate({ content: { ...block.content, tabs: newTabs, activeTab: newTabs.length - 1 } });
                }}
                className="px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg m-1 flex items-center gap-1 shrink-0"
              >
                <Plus size={12} />
                <span>Add Tab</span>
              </button>
            )}
          </div>
          <div 
            className="p-6 text-slate-600 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-blue-500/20"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onBlur={(e) => {
              const newTabs = [...tabs];
              if (newTabs[activeIdx]) {
                newTabs[activeIdx] = { ...newTabs[activeIdx], content: e.currentTarget.innerText };
                handleUpdate({ content: { ...block.content, tabs: newTabs } });
              }
            }}
          >
            {tabs[activeIdx]?.content || "Enter tab content here..."}
          </div>
        </div>
      );
    case "list":
      const items = Array.isArray(block.content?.items) ? block.content.items : [];
      return (
        <div className="space-y-3">
          <ul className="space-y-2">
            {items.map((item: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-3 group/li p-1.5 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="flex-shrink-0"
                    style={{ color: globalStyles.primaryColor }}
                  >
                    {getIcon(item.icon || "Check")}
                  </div>
                  <span 
                    className="text-slate-700 text-sm flex-1 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1"
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newItems = [...items];
                      newItems[idx] = { ...newItems[idx], text: e.currentTarget.innerText };
                      handleUpdate({ content: { ...block.content, items: newItems } });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  >
                    {item.text}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = items.filter((_: any, i: number) => i !== idx);
                      handleUpdate({ content: { ...block.content, items: newItems } });
                    }}
                    className="opacity-0 group-hover/li:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"
                  >
                    <X size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                const newItems = [...items, { icon: 'Check', text: 'New feature benefit point' }];
                handleUpdate({ content: { ...block.content, items: newItems } });
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus size={12} />
              <span>Add List Item</span>
            </button>
          )}
        </div>
      );
    case "alert":
      const alert = block.content || {};
      const alertStyles: Record<string, string> = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        success: "bg-green-50 border-green-200 text-green-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        error: "bg-red-50 border-red-200 text-red-800",
      };
      const alertIcons: Record<string, any> = {
        info: <Info size={18} />,
        success: <CheckCircle size={18} />,
        warning: <AlertTriangle size={18} />,
        error: <AlertCircle size={18} />,
      };
      return (
        <div
          className={`p-4 rounded-xl border flex gap-3 ${alertStyles[alert.type || "info"]}`}
        >
          <div className="flex-shrink-0">{alertIcons[alert.type || "info"]}</div>
          <div className="flex-1">
            <h4 
              className="font-bold text-sm mb-0.5 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-0.5"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => handleUpdate({ content: { ...alert, title: e.currentTarget.innerText } })}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            >
              {alert.title || "Notice"}
            </h4>
            <p 
              className="text-xs opacity-90 outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-0.5"
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={(e) => handleUpdate({ content: { ...alert, message: e.currentTarget.innerText } })}
            >
              {alert.message || "Important announcement content goes here."}
            </p>
          </div>
        </div>
      );
    case "newsletter":
      const n = block.content;
      return (
        <div className="bg-slate-900 p-8 rounded-2xl text-white text-center">
          <Mail size={32} className="mx-auto mb-4 text-blue-400" />
          <h3 className="text-xl font-bold mb-2">{n.title}</h3>
          <p className="text-sm text-slate-400 mb-6">{n.description}</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder={n.placeholder}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              style={{ backgroundColor: globalStyles.primaryColor }}
              className="px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
            >
              {n.buttonText}
            </button>
          </div>
        </div>
      );
    case "columns":
      return (
        <div className="p-6 bg-blue-50/50 border border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Columns size={20} />
          </div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Columns Layout
          </div>
        </div>
      );
    default:
      return null;
  }
};
