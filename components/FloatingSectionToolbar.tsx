import React, { useState } from 'react';
import { 
  Columns, Plus, Trash2, ArrowUp, ArrowDown, Copy, 
  Palette, BookmarkPlus, Sliders, ChevronDown, X
} from 'lucide-react';
import { Section } from '../types';

interface FloatingSectionToolbarProps {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  onAddColumn: () => void;
  onSetLayout: (widths: number[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onQuickStyleChange?: (styles: Partial<Section['styles']>) => void;
}

export const FloatingSectionToolbar: React.FC<FloatingSectionToolbarProps> = ({
  section,
  sectionIndex,
  totalSections,
  onAddColumn,
  onSetLayout,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onSaveTemplate,
  onDelete,
  onOpenSettings,
  onQuickStyleChange
}) => {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const columnLayoutPresets = [
    { label: '1 Column (100%)', widths: [100] },
    { label: '2 Columns (50 / 50)', widths: [50, 50] },
    { label: '3 Columns (33 / 33 / 33)', widths: [33.33, 33.33, 33.33] },
    { label: '4 Columns (25 / 25 / 25 / 25)', widths: [25, 25, 25, 25] },
    { label: 'Sidebar Left (30 / 70)', widths: [30, 70] },
    { label: 'Sidebar Right (70 / 30)', widths: [70, 30] },
  ];

  const bgColors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
    '#0f172a', '#1e293b', '#1e1b4b', '#172554',
    '#064e3b', '#451a03', '#4c0519', '#3b0764'
  ];

  return (
    <div 
      className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-blue-700 text-white px-3 py-1.5 rounded-full shadow-2xl border border-blue-500 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-bold text-[11px] px-2 py-0.5 bg-blue-800/80 rounded-full mr-1">
        Section #{sectionIndex + 1}
      </span>

      {/* Add Column */}
      <button
        type="button"
        onClick={onAddColumn}
        title="Add Column to Section"
        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full font-semibold text-[11px] flex items-center gap-1 transition-colors"
      >
        <Plus size={13} />
        <span>+ Column</span>
      </button>

      {/* Change Column Layout */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          title="Change Column Grid Layout"
          className={`p-1.5 hover:bg-white/20 rounded-full transition-colors flex items-center gap-0.5 ${showLayoutMenu ? 'bg-white/25' : ''}`}
        >
          <Columns size={13} />
          <ChevronDown size={10} />
        </button>

        {showLayoutMenu && (
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-56 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Column Grid</span>
              <button 
                type="button" 
                onClick={() => setShowLayoutMenu(false)}
                className="text-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
            <div className="space-y-1">
              {columnLayoutPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSetLayout(preset.widths);
                    setShowLayoutMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-medium hover:bg-blue-600 hover:text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  <div className="flex gap-0.5 h-3 w-12 bg-slate-800 p-0.5 rounded">
                    {preset.widths.map((w, j) => (
                      <div key={j} style={{ width: `${w}%` }} className="bg-slate-400 rounded-xs h-full" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Background & Style */}
      {onQuickStyleChange && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Quick Section Background & Padding"
            className={`p-1.5 hover:bg-white/20 rounded-full transition-colors flex items-center gap-0.5 ${showStyleMenu ? 'bg-white/25' : ''}`}
          >
            <Palette size={13} />
            <ChevronDown size={10} />
          </button>

          {showStyleMenu && (
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-60 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section Styling</span>
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
                <label className="text-[10px] text-slate-400 block mb-1.5">Background</label>
                <div className="grid grid-cols-6 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ backgroundColor: 'transparent' })}
                    title="Transparent"
                    className="w-6 h-6 rounded border border-slate-700 flex items-center justify-center text-[9px] text-slate-400 hover:border-slate-500"
                  >
                    ∅
                  </button>
                  {bgColors.map(c => (
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

              {/* Vertical Padding */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5">Vertical Padding</label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '24px 0' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Compact (24px)
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '60px 0' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Default (60px)
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickStyleChange({ padding: '100px 0' })}
                    className="py-1 bg-slate-800 hover:bg-slate-700 rounded text-center text-slate-300 font-medium"
                  >
                    Spacious (100px)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Move Up / Down */}
      <button
        type="button"
        disabled={sectionIndex === 0}
        onClick={onMoveUp}
        title="Move Section Up"
        className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
      >
        <ArrowUp size={13} />
      </button>
      <button
        type="button"
        disabled={sectionIndex === totalSections - 1}
        onClick={onMoveDown}
        title="Move Section Down"
        className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
      >
        <ArrowDown size={13} />
      </button>

      {/* Duplicate Section */}
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate Section"
        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
      >
        <Copy size={13} />
      </button>

      {/* Save Template */}
      <button
        type="button"
        onClick={onSaveTemplate}
        title="Save as Section Template"
        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
      >
        <BookmarkPlus size={13} />
      </button>

      {/* Open Sidebar Settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        title="Open Full Section Settings"
        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
      >
        <Sliders size={13} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        title="Delete Section"
        className="p-1.5 hover:bg-red-500/80 rounded-full transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};
