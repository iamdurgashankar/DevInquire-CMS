import React, { useState, useRef } from 'react';
import { 
  Upload, Search, Plus, Trash2, Copy, Eye, ExternalLink, 
  Image as ImageIcon, FileText, Check, Database, Sparkles, 
  RefreshCw, Grid, List as ListIcon, X, ArrowUpRight, 
  Download, Layers, AlertCircle, HardDrive, File, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { MediaItem } from '../types';

interface AssetLibrarySidebarProps {
  media: MediaItem[];
  onDragStartAsset: (e: React.DragEvent, asset: MediaItem) => void;
  onInsertAsset: (asset: MediaItem) => void;
  onSetAsBackground?: (asset: MediaItem) => void;
  onUploadMedia: (files: FileList | File[]) => void;
  onDeleteMedia: (id: string) => void;
  onAddFromUrl?: (url: string, name: string, category?: string) => void;
  selectedBlockId?: string | null;
}

export const AssetLibrarySidebar: React.FC<AssetLibrarySidebarProps> = ({
  media,
  onDragStartAsset,
  onInsertAsset,
  onSetAsBackground,
  onUploadMedia,
  onDeleteMedia,
  onAddFromUrl,
  selectedBlockId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'image' | 'banner' | 'illustration' | 'document'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [previewAsset, setPreviewAsset] = useState<MediaItem | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'image' | 'banner' | 'illustration' | 'document'>('image');
  const [isDraggingOverSidebar, setIsDraggingOverSidebar] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter media based on search query and category
  const filteredMedia = media.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.type && item.type.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeCategory === 'all') return true;
    if (activeCategory === 'document') {
      return item.type?.includes('pdf') || item.type?.includes('document') || item.category === 'document' || item.name.endsWith('.pdf');
    }
    if (activeCategory === 'banner') {
      return item.category === 'banner';
    }
    if (activeCategory === 'illustration') {
      return item.category === 'illustration';
    }
    if (activeCategory === 'image') {
      return item.category === 'image' || (!item.category && item.type?.startsWith('image'));
    }
    return true;
  });

  const formatFileSize = (size: number | string | undefined) => {
    if (!size) return 'Unknown size';
    if (typeof size === 'string') return size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileBadge = (item: MediaItem) => {
    if (item.type?.includes('pdf') || item.name.endsWith('.pdf')) {
      return { label: 'PDF', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
    }
    if (item.type?.includes('png') || item.name.endsWith('.png')) {
      return { label: 'PNG', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (item.type?.includes('svg') || item.name.endsWith('.svg')) {
      return { label: 'SVG', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    if (item.type?.includes('webp') || item.name.endsWith('.webp')) {
      return { label: 'WEBP', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    return { label: 'JPG', color: 'bg-slate-700/80 text-slate-300 border-slate-600' };
  };

  const handleCopyUrl = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    toast.success('Asset URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverSidebar(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadMedia(e.dataTransfer.files);
    }
  };

  const handleAddUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      toast.error('Please provide a valid URL');
      return;
    }
    const finalName = nameInput.trim() || urlInput.split('/').pop()?.split('?')[0] || 'Web Asset';
    if (onAddFromUrl) {
      onAddFromUrl(urlInput.trim(), finalName, categoryInput);
    }
    setUrlInput('');
    setNameInput('');
    setShowUrlModal(false);
    toast.success('Asset added to library and synced to Firestore');
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-800 text-slate-200 relative select-none"
      onDragOver={(e) => {
        // Only trigger drop zone if dragging files from OS
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingOverSidebar(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOverSidebar(false);
        }
      }}
      onDrop={handleSidebarDrop}
    >
      {/* File Drop Overlay */}
      {isDraggingOverSidebar && (
        <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-sm border-2 border-dashed border-white/60 m-2 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <Upload size={36} className="text-white mb-3 animate-bounce" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Drop files here</h4>
          <p className="text-xs text-blue-100 mt-1">Files will automatically upload and sync with Firestore</p>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        accept="image/*,application/pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadMedia(e.target.files);
          }
        }} 
      />

      {/* Top Header */}
      <div className="p-4 border-b border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <HardDrive size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Asset Library</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="flex items-center gap-1">
                  <Database size={10} /> Firestore Live ({media.length})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowUrlModal(true)}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Add from URL"
            >
              <Link2 size={15} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Upload local files"
            >
              <Upload size={13} />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Drag Guidance Banner */}
        <div className="bg-slate-900/70 border border-blue-500/20 rounded-lg p-2.5 flex items-start gap-2.5">
          <div className="p-1 rounded bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Layers size={13} />
          </div>
          <div className="text-[10px] leading-relaxed text-slate-300">
            <span className="font-bold text-blue-300">Drag & Drop:</span> Pull any asset directly into a column or between sections on the canvas.
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Pills & View Mode */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
            {(['all', 'image', 'banner', 'illustration', 'document'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat === 'banner' ? 'Hero' : cat === 'illustration' ? '3D' : cat === 'document' ? 'Docs' : 'Images'}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-700/60 shrink-0">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1 rounded ${viewLayout === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid View"
            >
              <Grid size={12} />
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`p-1 rounded ${viewLayout === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              title="List View"
            >
              <ListIcon size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Media Assets List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {filteredMedia.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-600">
              <ImageIcon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">No assets found</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {searchQuery ? 'Try matching another name or filter' : 'Upload an image or add from URL'}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <Upload size={12} /> Upload Asset
            </button>
          </div>
        ) : viewLayout === 'grid' ? (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredMedia.map(item => {
              const badge = getFileBadge(item);
              const isPdf = item.type?.includes('pdf') || item.name.endsWith('.pdf');

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => onDragStartAsset(e, item)}
                  className="group relative bg-slate-900 border border-slate-700/80 hover:border-blue-500/80 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="aspect-[4/3] bg-slate-950/60 relative overflow-hidden flex items-center justify-center">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center p-3 text-red-400">
                        <FileText size={32} />
                        <span className="text-[9px] font-mono mt-1 text-slate-400">PDF Document</span>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    )}

                    {/* Format Badge */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Drag Hint on hover */}
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-2 z-20">
                      <div className="w-full flex items-center justify-between">
                        <button
                          onClick={(e) => handleCopyUrl(e, item)}
                          className="p-1 rounded bg-slate-800/90 text-slate-300 hover:text-white hover:bg-blue-600 transition-colors"
                          title="Copy direct URL"
                        >
                          {copiedId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAsset(item);
                          }}
                          className="p-1 rounded bg-slate-800/90 text-slate-300 hover:text-white hover:bg-blue-600 transition-colors"
                          title="Preview Full Image"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMedia(item.id);
                          }}
                          className="p-1 rounded bg-slate-800/90 text-slate-300 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Delete from Library"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex flex-col items-center gap-1 w-full">
                        <button
                          onClick={() => onInsertAsset(item)}
                          className="w-full py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <Plus size={12} /> Insert
                        </button>
                        {onSetAsBackground && !isPdf && selectedBlockId && (
                          <button
                            onClick={() => onSetAsBackground(item)}
                            className="w-full py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-medium flex items-center justify-center gap-1 transition-all"
                          >
                            Set as Background
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Caption Info */}
                  <div className="p-2 border-t border-slate-800/80 bg-slate-900/90 flex flex-col justify-between">
                    <p className="text-[11px] font-medium text-slate-300 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500 font-mono">
                      <span>{formatFileSize(item.size)}</span>
                      {item.dimensions && <span>{item.dimensions}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredMedia.map(item => {
              const badge = getFileBadge(item);
              const isPdf = item.type?.includes('pdf') || item.name.endsWith('.pdf');

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => onDragStartAsset(e, item)}
                  className="group bg-slate-900 border border-slate-700/80 hover:border-blue-500 rounded-lg p-2 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing transition-all hover:bg-slate-850"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800">
                      {isPdf ? (
                        <FileText size={18} className="text-red-400" />
                      ) : (
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <p className="text-[11px] font-medium text-slate-200 truncate" title={item.name}>
                          {item.name}
                        </p>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {formatFileSize(item.size)} {item.dimensions ? `• ${item.dimensions}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => onInsertAsset(item)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                      title="Insert block"
                    >
                      <Plus size={11} /> Add
                    </button>
                    <button
                      onClick={(e) => handleCopyUrl(e, item)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Copy URL"
                    >
                      {copiedId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => onDeleteMedia(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Asset from URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-850">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white">Add Asset from Web URL</h3>
              </div>
              <button 
                onClick={() => setShowUrlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUrlSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Asset URL *
                </label>
                <input 
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/... or https://domain.com/file.png"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Asset Name (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g., Hero Background Banner"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['image', 'banner', 'illustration', 'document'] as const).map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategoryInput(cat)}
                      className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        categoryInput === cat
                          ? 'bg-blue-600/30 text-blue-400 border-blue-500'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview if URL valid */}
              {urlInput.startsWith('http') && (
                <div className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700/80">
                  <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Live URL Preview</p>
                  <div className="h-28 rounded overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img 
                      src={urlInput} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/40"
                >
                  <Plus size={14} /> Add Asset & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Full Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate">{previewAsset.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {previewAsset.type} • {formatFileSize(previewAsset.size)} {previewAsset.dimensions ? `• ${previewAsset.dimensions}` : ''}
                </p>
              </div>
              <button 
                onClick={() => setPreviewAsset(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto">
              {previewAsset.type?.includes('pdf') || previewAsset.name.endsWith('.pdf') ? (
                <div className="text-center p-8 space-y-3">
                  <FileText size={48} className="text-red-400 mx-auto" />
                  <p className="text-sm font-bold text-white">{previewAsset.name}</p>
                  <a 
                    href={previewAsset.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                  >
                    <ExternalLink size={14} /> Open PDF in New Tab
                  </a>
                </div>
              ) : (
                <img 
                  src={previewAsset.url} 
                  alt={previewAsset.name} 
                  className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-2xl border border-slate-800"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopyUrl(e, previewAsset)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy size={13} /> Copy Direct URL
                </button>
                <a
                  href={previewAsset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Open
                </a>
              </div>

              <button
                onClick={() => {
                  onInsertAsset(previewAsset);
                  setPreviewAsset(null);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/40"
              >
                <Plus size={14} /> Insert into Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
