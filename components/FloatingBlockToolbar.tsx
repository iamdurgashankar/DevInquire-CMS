import React, { useState } from 'react';
import { 
  Copy, Trash2, ArrowUp, ArrowDown, Plus, AlignLeft, 
  AlignCenter, AlignRight, Sparkles, Sliders, Palette,
  X, Check, ChevronDown
} from 'lucide-react';
import { Block, BlockType } from '../types';

interface FloatingBlockToolbarProps {
  block: Block;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAddBelow: () => void;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onOpenSettings: () => void;
  onAiEnhance?: () => void;
  onQuickStyleChange?: (styles: Partial<Block['styles']>) => void;
}

export const FloatingBlockToolbar: React.FC<FloatingBlockToolbarProps> = ({
  block,
  canMoveUp,
  canMoveDown,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddBelow,
  onAlignChange,
  onOpenSettings,
  onAiEnhance,
  onQuickStyleChange,
}) => {
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const getFriendlyName = (type: BlockType): string => {
    switch (type) {
      case 'text': return 'Text / Typography';
      case 'button': return 'Button';
      case 'image': return 'Image';
      case 'video': return 'Video Player';
      case 'form': return 'Contact Form';
      case 'nav': return 'Navigation Bar';
      case 'accordion': return 'FAQ Accordion';
      case 'pricing': return 'Pricing Card';
      case 'testimonial': return 'Testimonial';
      case 'gallery': return 'Image Gallery';
      case 'newsletter': return 'Newsletter';
      case 'social': return 'Social Links';
      case 'counter': return 'Stat Counter';
      case 'progress': return 'Progress Bar';
      case 'tabs': return 'Content Tabs';
      case 'list': return 'Feature List';
      case 'alert': return 'Alert Banner';
      case 'map': return 'Google Map';
      case 'spacer': return 'Spacer';
      case 'divider': return 'Divider';
      case 'embed':
      case 'code':
      case 'html': return 'Custom Code';
      default: return type.toUpperCase();
    }
  };

  const colors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', 
    '#1e293b', '#0f172a', '#2563eb', '#3b82f6', 
    '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
  ];

  return (
    <div 
      className="absolute -top-11 left-0 z-40 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl border border-slate-700/80 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Block Type Tag */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/30 border border-blue-500/40 rounded-lg text-[11px] font-bold text-blue-300">
        <span className="capitalize">{getFriendlyName(block.type)}</span>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5" />

      {/* Alignment Controls */}
      <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
        <button
          type="button"
          onClick={() => onAlignChange('left')}
          title="Align Left"
          className={`p-1 rounded hover:bg-slate-700 transition-colors ${block.styles?.textAlign === 'left' || !block.styles?.textAlign ? 'text-blue-400 bg-slate-700/60' : 'text-slate-400'}`}
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          onClick={() => onAlignChange('center')}
          title="Align Center"
          className={`p-1 rounded hover:bg-slate-700 transition-colors ${block.styles?.textAlign === 'center' ? 'text-blue-400 bg-slate-700/60' : 'text-slate-400'}`}
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          onClick={() => onAlignChange('right')}
          title="Align Right"
          className={`p-1 rounded hover:bg-slate-700 transition-colors ${block.styles?.textAlign === 'right' ? 'text-blue-400 bg-slate-700/60' : 'text-slate-400'}`}
        >
          <AlignRight size={13} />
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-0.5" />

      {/* Quick Move Up / Down */}
      <button
        type="button"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        title="Move Up"
        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ArrowUp size={13} />
      </button>
      <button
        type="button"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        title="Move Down"
        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ArrowDown size={13} />
      </button>

      {/* Duplicate */}
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate Element"
        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
      >
        <Copy size={13} />
      </button>

      {/* Insert Below */}
      <button
        type="button"
        onClick={onAddBelow}
        title="Add Widget Below"
        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 transition-colors flex items-center gap-1 font-semibold text-[11px]"
      >
        <Plus size={13} />
        <span>Add Below</span>
      </button>

      <div className="h-4 w-px bg-slate-700 mx-0.5" />

      {/* Quick Styling Dropdown */}
      {onQuickStyleChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Quick Color & Background"
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 ${showStyleMenu ? 'bg-slate-800 text-blue-400' : ''}`}
          >
            <Palette size={13} />
            <ChevronDown size={10} />
          </button>

          {showStyleMenu && (
            <div 
              className="absolute top-full left-0 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-60 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Styling</span>
                <button 
                  type="button" 
                  onClick={() => setShowStyleMenu(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Background Color Swatches */}
              <div className="mb-3">
                <label className="text-[10px] text-slate-400 block mb-1.5">Background Color</label>
                <div className="grid grid-cols-6 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ backgroundColor: 'transparent' })}
                    title="Transparent"
                    className="w-6 h-6 rounded border border-slate-700 flex items-center justify-center text-[9px] text-slate-400 hover:border-slate-500"
                  >
                    ∅
                  </button>
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onQuickStyleChange({ backgroundColor: c })}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded border border-slate-700 hover:scale-110 transition-transform shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Text Color Swatches */}
              <div className="mb-3">
                <label className="text-[10px] text-slate-400 block mb-1.5">Text Color</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {['#ffffff', '#f8fafc', '#94a3b8', '#1e293b', '#0f172a', '#2563eb'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onQuickStyleChange({ color: c })}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded border border-slate-700 hover:scale-110 transition-transform shadow-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Quick Padding Presets */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5">Padding Preset</label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '6px' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '16px' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '32px' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Spacious
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Assistant */}
      {onAiEnhance && (
        <button
          type="button"
          onClick={onAiEnhance}
          title="AI Smart Assist / Enhance"
          className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-800/40 transition-colors"
        >
          <Sparkles size={13} />
        </button>
      )}

      {/* Edit Design Tab in Sidebar */}
      <button
        type="button"
        onClick={onOpenSettings}
        title="Open Full Style & Settings Panel"
        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Sliders size={13} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        title="Delete Element"
        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors ml-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};
