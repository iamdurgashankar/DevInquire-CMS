
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, Zap, Users, Layout, Shield, 
  ChevronRight, Loader2, ArrowRight, Pause, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page } from '../types';
import { suggestNextItems } from '../services/geminiService';
import { useCMS } from '../App';

interface Suggestion {
  type: string;
  title: string;
  description: string;
  action: string;
  icon: string;
}

interface SmartSuggestionsProps {
  pages: Page[];
  onAction?: (suggestion: Suggestion) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles size={20} />,
  Zap: <Zap size={20} />,
  Users: <Users size={20} />,
  Layout: <Layout size={20} />,
  Shield: <Shield size={20} />,
};

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ pages, onAction }) => {
  const { theme } = useCMS();
  const isDark = theme === 'dark';
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await suggestNextItems(pages);
      setSuggestions(data);
      setActiveIndex(0);
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
      setError('Could not load suggestions right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [pages.length]); // Refresh suggestions if pages change

  const nextSuggestion = useCallback(() => {
    if (suggestions.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % suggestions.length);
  }, [suggestions.length]);

  useEffect(() => {
    if (!isAutoPlaying || suggestions.length === 0 || isLoading) return;
    
    const interval = setInterval(nextSuggestion, 5000); // 5 seconds per suggestion
    return () => clearInterval(interval);
  }, [isAutoPlaying, suggestions.length, isLoading, nextSuggestion]);

  if (isLoading && suggestions.length === 0) {
    return (
      <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] rounded-xl">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">AI Growth Suggestions</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="w-9 h-9 text-[#007AFF] dark:text-[#0A84FF] animate-spin mb-4" />
          <p className="text-[#86868B] dark:text-[#98989D] text-sm font-medium">Analyzing your site structure...</p>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
     return (
      <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <Sparkles size={20} className="text-[#007AFF] dark:text-[#0A84FF]" />
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">AI Growth Suggestions</h2>
        </div>
        <div className="p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] dark:text-[#FF453A] rounded-2xl text-sm">
          {error}
          <button 
            onClick={fetchSuggestions}
            className="ml-3 font-semibold underline cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-xs">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] rounded-2xl">
            <Sparkles size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">AI Growth Strategy</h2>
              <span className="px-2.5 py-0.5 bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-semibold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#007AFF] dark:bg-[#0A84FF] rounded-full animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-[13px] text-[#86868B] dark:text-[#98989D]">Auto-generating recommendations based on your content</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-2 hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] rounded-full transition-colors text-[#86868B] hover:text-[#007AFF] dark:hover:text-[#0A84FF] cursor-pointer"
            title={isAutoPlaying ? "Pause Auto-play" : "Start Auto-play"}
          >
            {isAutoPlaying ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button 
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="p-2 hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] rounded-full transition-colors text-[#86868B] hover:text-[#007AFF] dark:hover:text-[#0A84FF] disabled:opacity-50 cursor-pointer"
            title="Refresh suggestions"
          >
            {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Zap size={17} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-[500px] md:h-[340px]">
        {suggestions.map((suggestion, index) => {
          const isActive = index === activeIndex;
          const activeBg = isDark ? 'rgb(28, 28, 30)' : 'rgb(245, 245, 247)';
          const inactiveBg = isDark ? 'rgb(44, 44, 46)' : 'rgb(255, 255, 255)';
          const activeBorder = isDark ? 'rgba(10, 132, 255, 0.35)' : 'rgba(0, 122, 255, 0.25)';
          const inactiveBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
          
          return (
            <motion.div 
              key={index}
              layout
              initial={false}
              animate={{ 
                flex: isActive ? 6 : 1,
                backgroundColor: isActive ? activeBg : inactiveBg,
                borderColor: isActive ? activeBorder : inactiveBorder
              }}
              onClick={() => {
                setActiveIndex(index);
                setIsAutoPlaying(false);
              }}
              className={`group relative flex flex-col p-6 rounded-[24px] border transition-all duration-500 cursor-pointer overflow-hidden ${
                isActive ? 'shadow-xs' : 'hover:bg-[#F5F5F7]/60 dark:hover:bg-[#1C1C1E]/60'
              }`}
            >
              {/* Progress Bar (Only for active item) */}
              {isActive && isAutoPlaying && (
                <div className="absolute top-0 left-0 w-full h-1 bg-black/[0.05] dark:bg-white/[0.08]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-[#007AFF] dark:bg-[#0A84FF]"
                  />
                </div>
              )}

              <div className="flex items-start justify-between min-w-[200px]">
                <motion.div 
                  layout="position"
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? 'bg-white dark:bg-[#2C2C2E] text-[#007AFF] dark:text-[#0A84FF] scale-105 shadow-xs border border-black/[0.06] dark:border-white/[0.08]'
                      : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'
                  }`}
                >
                  {iconMap[suggestion.icon] || <Sparkles size={20} />}
                </motion.div>
                
                {isActive && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAction) onAction(suggestion);
                    }}
                    className="w-10 h-10 bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-full flex items-center justify-center shadow-md shadow-[#007AFF]/25 hover:bg-[#0071E3] transition-colors cursor-pointer"
                  >
                    <ArrowRight size={18} />
                  </motion.button>
                )}
              </div>

              <div className="mt-6 flex-1 flex flex-col overflow-hidden">
                <motion.div layout="position" className="whitespace-nowrap overflow-hidden">
                  <div className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full mb-2 ${
                    isActive
                      ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF]'
                      : 'bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#86868B]'
                  }`}>
                    {suggestion.type}
                  </div>
                  <h3 className={`text-lg font-semibold transition-all duration-500 ${
                    isActive ? 'text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 whitespace-normal' : 'text-[#86868B] truncate'
                  }`}>
                    {suggestion.title}
                  </h3>
                </motion.div>
                
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="flex flex-col flex-1"
                    >
                      <p className="text-[13px] text-[#86868B] dark:text-[#98989D] mb-6 leading-relaxed">
                        {suggestion.description}
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[#86868B] font-semibold uppercase tracking-widest mb-1">Recommended Action</span>
                          <span className="text-xs font-semibold text-[#007AFF] dark:text-[#0A84FF]">
                            {suggestion.action}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {suggestions.map((_, i) => (
                            <button 
                              key={i} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveIndex(i);
                                setIsAutoPlaying(false);
                              }}
                              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                i === activeIndex
                                  ? 'w-6 bg-[#007AFF] dark:bg-[#0A84FF]'
                                  : 'w-1.5 bg-black/15 dark:bg-white/20 hover:bg-black/30'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {!isActive && (
                   <div className="mt-auto pt-4 flex flex-col items-center">
                     <span className="text-[10px] font-semibold text-[#86868B] uppercase tracking-[0.22em] [writing-mode:vertical-lr] rotate-180 hidden md:block">
                       Expand
                     </span>
                     <span className="md:hidden text-[10px] font-semibold text-[#86868B] uppercase tracking-widest">
                       Tap to view
                     </span>
                   </div>
                )}
              </div>

              {/* Continue indicator for background items */}
              {!isActive && isAutoPlaying && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-black/[0.04] dark:bg-white/[0.05]" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSuggestions;
