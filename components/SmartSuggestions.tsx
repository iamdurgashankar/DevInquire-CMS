
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, Zap, Users, Layout, Shield, 
  ChevronRight, Loader2, ArrowRight, Pause, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page } from '../types';
import { suggestNextItems } from '../services/geminiService';

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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">AI Growth Suggestions</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Analyzing your site structure...</p>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
     return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-blue-500" />
          <h2 className="text-lg font-bold text-slate-900">AI Growth Suggestions</h2>
        </div>
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
          {error}
          <button 
            onClick={fetchSuggestions}
            className="ml-3 font-bold underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">AI Growth Strategy</h2>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-sm text-slate-500">Auto-generating recommendations based on your content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
            title={isAutoPlaying ? "Pause Auto-play" : "Start Auto-play"}
          >
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button 
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600 disabled:opacity-50"
            title="Refresh suggestions"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-[500px] md:h-[350px]">
        {suggestions.map((suggestion, index) => {
          const isActive = index === activeIndex;
          
          return (
            <motion.div 
              key={index}
              layout
              initial={false}
              animate={{ 
                flex: isActive ? 6 : 1,
                backgroundColor: isActive ? 'rgb(245, 243, 255)' : 'rgb(255, 255, 255)',
                borderColor: isActive ? 'rgb(221, 214, 254)' : 'rgb(241, 245, 249)'
              }}
              onClick={() => {
                setActiveIndex(index);
                setIsAutoPlaying(false);
              }}
              className={`group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden ${
                isActive ? 'shadow-inner' : 'hover:bg-slate-50'
              }`}
            >
              {/* Progress Bar (Only for active item) */}
              {isActive && isAutoPlaying && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-indigo-600"
                  />
                </div>
              )}

              <div className="flex items-start justify-between min-w-[200px]">
                <motion.div 
                  layout="position"
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-500 ${
                    isActive ? 'bg-white text-indigo-600 scale-110 shadow-indigo-100' : 'bg-slate-50 text-slate-400'
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
                    className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-slate-900 transition-colors"
                  >
                    <ArrowRight size={18} />
                  </motion.button>
                )}
              </div>

              <div className="mt-6 flex-1 flex flex-col overflow-hidden">
                <motion.div layout="position" className="whitespace-nowrap overflow-hidden">
                  <div className={`inline-flex px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full mb-2 ${
                    isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {suggestion.type}
                  </div>
                  <h3 className={`text-lg font-bold transition-all duration-500 ${
                    isActive ? 'text-slate-900 mb-2 whitespace-normal' : 'text-slate-400 truncate'
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
                      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        {suggestion.description}
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-indigo-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Recommended Action</span>
                          <span className="text-xs font-bold text-indigo-600">
                            {suggestion.action}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {suggestions.map((_, i) => (
                            <button 
                              key={i} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveIndex(i);
                                setIsAutoPlaying(false);
                              }}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === activeIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-indigo-200 hover:bg-indigo-300'
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
                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] [writing-mode:vertical-lr] rotate-180 hidden md:block">
                       Expand
                     </span>
                     <span className="md:hidden text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                       Tap to view
                     </span>
                   </div>
                )}
              </div>

              {/* Continue indicator for background items */}
              {!isActive && isAutoPlaying && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 opacity-30" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSuggestions;
