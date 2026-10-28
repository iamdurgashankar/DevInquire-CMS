import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface BlockInsertionDividerProps {
  onInsert: () => void;
  label?: string;
}

export const BlockInsertionDivider: React.FC<BlockInsertionDividerProps> = ({
  onInsert,
  label = "Add Block"
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative w-full py-1 -my-1 z-20 group/divider flex items-center justify-center transition-all duration-150"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onInsert();
      }}
    >
      <div 
        className={`w-full h-0.5 transition-all duration-200 ${
          isHovered 
            ? 'bg-blue-500 shadow-sm shadow-blue-500/50 opacity-100' 
            : 'bg-transparent opacity-0 group-hover/divider:opacity-100 group-hover/divider:bg-blue-300'
        }`} 
      />
      
      <button
        type="button"
        title="Insert Component Here"
        className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md transition-all duration-200 ${
          isHovered
            ? 'bg-blue-600 text-white scale-100 opacity-100'
            : 'bg-white text-slate-400 border border-slate-200 scale-75 opacity-0 group-hover/divider:opacity-100 group-hover/divider:scale-95 group-hover/divider:text-blue-600 group-hover/divider:border-blue-300'
        }`}
      >
        <Plus size={11} className="stroke-[3]" />
        <span>{label}</span>
      </button>
    </div>
  );
};
