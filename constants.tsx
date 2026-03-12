
import React from 'react';
import { 
  Type, Image as ImageIcon, MousePointer2, Play, 
  SeparatorVertical, Code, Columns, LayoutPanelLeft, Menu,
  Smile, List, DollarSign, Share2, ClipboardList
} from 'lucide-react';
import { BlockType } from './types';

export const BLOCK_DEFS: Array<{ type: BlockType; icon: React.ReactNode; label: string; preview: React.ReactNode }> = [
  { 
    type: 'nav', 
    icon: <Menu size={18} />, 
    label: 'Navigation Bar',
    preview: (
      <div className="w-full h-full flex flex-col p-2 gap-2">
        <div className="w-full h-4 bg-slate-900 rounded flex items-center justify-between px-2">
          <div className="w-4 h-2 bg-blue-500 rounded-sm" />
          <div className="flex gap-1">
            <div className="w-3 h-1 bg-slate-400 rounded-full" />
            <div className="w-3 h-1 bg-slate-400 rounded-full" />
            <div className="w-3 h-1 bg-slate-400 rounded-full" />
          </div>
        </div>
        <div className="flex-1 bg-slate-800/50 rounded border border-dashed border-slate-700" />
      </div>
    )
  },
  { 
    type: 'form', 
    icon: <ClipboardList size={18} />, 
    label: 'Contact Form',
    preview: (
      <div className="w-full h-full flex flex-col gap-1.5 p-2">
        <div className="h-2 w-full bg-slate-200 rounded" />
        <div className="h-2 w-full bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-blue-500 rounded" />
      </div>
    )
  },
  { 
    type: 'text', 
    icon: <Type size={18} />, 
    label: 'Text Editor',
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-2">
        <div className="h-1.5 w-full bg-slate-300 rounded-full" />
        <div className="h-1.5 w-5/6 bg-slate-300 rounded-full" />
        <div className="h-1.5 w-4/6 bg-slate-300 rounded-full" />
      </div>
    )
  },
  { 
    type: 'image', 
    icon: <ImageIcon size={18} />, 
    label: 'Image',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-full h-full bg-slate-200 rounded-md flex items-center justify-center">
          <ImageIcon size={24} className="text-slate-400" />
        </div>
      </div>
    )
  },
  { 
    type: 'button', 
    icon: <MousePointer2 size={18} />, 
    label: 'Button',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-16 h-6 bg-blue-500 rounded-md shadow-sm" />
      </div>
    )
  },
  { 
    type: 'video', 
    icon: <Play size={18} />, 
    label: 'Video',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-full h-full bg-slate-900 rounded-md flex items-center justify-center relative">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <Play size={12} className="text-white fill-white" />
          </div>
        </div>
      </div>
    )
  },
  { 
    type: 'spacer', 
    icon: <SeparatorVertical size={18} />, 
    label: 'Spacer',
    preview: (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-1">
        <div className="h-1 w-full border-t border-dashed border-slate-400" />
        <div className="text-[8px] text-slate-400 font-bold">SPACER</div>
        <div className="h-1 w-full border-b border-dashed border-slate-400" />
      </div>
    )
  },
  { 
    type: 'html', 
    icon: <Code size={18} />, 
    label: 'HTML Embed',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-full h-full bg-slate-800 rounded-md flex items-center justify-center">
          <Code size={20} className="text-yellow-500" />
        </div>
      </div>
    )
  },
  { 
    type: 'icon', 
    icon: <Smile size={18} />, 
    label: 'Icon',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <Smile size={24} className="text-blue-500" />
      </div>
    )
  },
  { 
    type: 'accordion', 
    icon: <List size={18} />, 
    label: 'Accordion',
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-2">
        <div className="h-3 w-full bg-slate-200 rounded flex items-center px-1">
          <div className="w-full h-1 bg-slate-400 rounded-full" />
        </div>
        <div className="h-3 w-full bg-slate-200 rounded flex items-center px-1">
          <div className="w-full h-1 bg-slate-400 rounded-full" />
        </div>
      </div>
    )
  },
  { 
    type: 'pricing', 
    icon: <DollarSign size={18} />, 
    label: 'Pricing Card',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-full h-full bg-white border border-slate-200 rounded flex flex-col items-center p-1 gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded-full" />
          <div className="w-8 h-1 bg-slate-300 rounded-full" />
          <div className="w-6 h-2 bg-blue-500 rounded-sm" />
        </div>
      </div>
    )
  },
  { 
    type: 'social', 
    icon: <Share2 size={18} />, 
    label: 'Social Links',
    preview: (
      <div className="w-full h-full flex items-center justify-center gap-1 p-2">
        <div className="w-4 h-4 bg-slate-200 rounded-full" />
        <div className="w-4 h-4 bg-slate-200 rounded-full" />
        <div className="w-4 h-4 bg-slate-200 rounded-full" />
      </div>
    )
  },
  { 
    type: 'code', 
    icon: <LayoutPanelLeft size={18} />, 
    label: 'Custom Widget',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-full h-full bg-slate-900 rounded-md flex flex-col items-center justify-center gap-1 border border-slate-700">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <Code size={16} className="text-blue-400" />
        </div>
      </div>
    )
  },
];

export const COLUMN_LAYOUTS = [
  { label: '1 Column', widths: [100] },
  { label: '2 Columns', widths: [50, 50] },
  { label: '3 Columns', widths: [33.33, 33.33, 33.33] },
  { label: '4 Columns', widths: [25, 25, 25, 25] },
  { label: '2/3 - 1/3', widths: [66.66, 33.33] },
  { label: '1/3 - 2/3', widths: [33.33, 66.66] },
];
