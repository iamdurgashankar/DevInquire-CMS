
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
          <div className="p-2.5 bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] rounded-xl">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">AI Growth Suggestions</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="w-9 h-9 text-[#4e45e1] dark:text-[#6B63F2] animate-spin mb-4" />
          <p className="text-[#86868B] dark:text-[#98989D] text-sm font-medium">Analyzing your site structure...</p>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
     return (
      <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <Sparkles size={20} className="text-[#4e45e1] dark:text-[#6B63F2]" />
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
          <div className="p-2.5 bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] rounded-2xl">
            <Sparkles size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">AI Growth Strategy</h2>
              <span className="px-2.5 py-0.5 bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] text-[10px] font-semibold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#4e45e1] dark:bg-[#6B63F2] rounded-full animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-[13px] text-[#86868B] dark:text-[#98989D]">Auto-generating recommendations based on your content</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-2 hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] rounded-full transition-colors text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] cursor-pointer"
            title={isAutoPlaying ? "Pause Auto-play" : "Start Auto-play"}
          >
            {isAutoPlaying ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button 
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="p-2 hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E] rounded-full transition-colors text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2] disabled:opacity-50 cursor-pointer"
            title="Refresh suggestions"
          >
            {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Zap size={17} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {suggestions.map((suggestion, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              onClick={() => {
                setActiveIndex(index);
                setIsAutoPlaying(false);
              }}
              className={`group relative flex flex-col p-6 rounded-[22px] border transition-all duration-300 cursor-pointer overflow-hidden ${
                isActive
                  ? 'bg-[#F5F5F7] dark:bg-[#1C1C1E] border-[#4e45e1]/40 dark:border-[#6B63F2]/45 shadow-sm'
                  : 'apple-subcard border-black/[0.06] dark:border-white/[0.08] hover:border-[#4e45e1]/25'
              }`}
            >
              {/* Progress Bar (Only for active item during auto-play) */}
              {isActive && isAutoPlaying && (
                <div className="absolute top-0 left-0 w-full h-1 bg-black/[0.05] dark:bg-white/[0.08]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className="h-full bg-[#4e45e1] dark:bg-[#6B63F2]"
                  />
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white shadow-sm shadow-[#4e45e1]/25'
                      : 'bg-white dark:bg-[#2C2C2E] text-[#86868B] border border-black/[0.06] dark:border-white/[0.08]'
                  }`}
                >
                  {iconMap[suggestion.icon] || <Sparkles size={19} />}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAction) onAction(suggestion);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-b from-[#6B63F2] to-[#4e45e1] text-white shadow-sm shadow-[#4e45e1]/25 hover:opacity-90'
                      : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B] hover:text-[#4e45e1] dark:hover:text-[#6B63F2]'
                  }`}
                  title={suggestion.action}
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="mt-5 flex-1 flex flex-col">
                <div
                  className={`inline-flex w-fit px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full mb-2.5 ${
                    isActive
                      ? 'bg-[#4e45e1]/12 dark:bg-[#6B63F2]/18 text-[#4e45e1] dark:text-[#6B63F2]'
                      : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868B]'
                  }`}
                >
                  {suggestion.type}
                </div>
                <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 leading-snug">
                  {suggestion.title}
                </h3>
                <p className="text-[13px] text-[#86868B] dark:text-[#98989D] mb-5 leading-relaxed flex-1">
                  {suggestion.description}
                </p>

                <div className="mt-auto pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#86868B] font-semibold uppercase tracking-wider">
                    Action
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAction) onAction(suggestion);
                    }}
                    className="text-xs font-semibold text-[#4e45e1] dark:text-[#6B63F2] hover:underline"
                  >
                    {suggestion.action}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSuggestions;
