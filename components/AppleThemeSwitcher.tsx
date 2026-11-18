import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useCMS } from '../App';

interface AppleThemeSwitcherProps {
  variant?: 'segmented' | 'compact' | 'icon';
  className?: string;
}

export const AppleThemeSwitcher: React.FC<AppleThemeSwitcherProps> = ({
  variant = 'segmented',
  className = '',
}) => {
  const { theme, setTheme, toggleTheme } = useCMS();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to Apple Light theme' : 'Switch to Apple Dark theme'}
        title={theme === 'dark' ? 'Switch to Apple Light (#FFFFFF)' : 'Switch to Apple Dark (#1C1C1E)'}
        className={`w-9 h-9 rounded-full flex items-center justify-center bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.10] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-all duration-150 active:scale-95 shrink-0 ${className}`}
      >
        {theme === 'dark' ? (
          <Sun size={16} className="text-[#FF9F0A]" />
        ) : (
          <Moon size={16} className="text-[#007AFF]" />
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to Apple Light theme' : 'Switch to Apple Dark theme'}
        title="Toggle Apple Light / Dark Appearance"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.10] hover:bg-[#E5E5EA]/80 dark:hover:bg-[#3A3A3C] text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 ${className}`}
      >
        {theme === 'dark' ? (
          <>
            <Moon size={13.5} className="text-[#0A84FF]" />
            <span>Dark</span>
          </>
        ) : (
          <>
            <Sun size={13.5} className="text-[#007AFF]" />
            <span>Light</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Appearance Theme Switcher"
      className={`inline-flex items-center p-0.5 rounded-full bg-[#E5E5EA]/80 dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] shrink-0 select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        title="Apple Light (#FFFFFF / #F5F5F7 / #007AFF)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
          theme === 'light'
            ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
            : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
        }`}
      >
        <Sun size={13} className={theme === 'light' ? 'text-[#007AFF]' : ''} />
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        title="Apple Dark (#1C1C1E / #2C2C2E / #0A84FF)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
          theme === 'dark'
            ? 'bg-[#3A3A3C] text-[#F5F5F7] shadow-[0_1px_4px_rgba(0,0,0,0.35)]'
            : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
        }`}
      >
        <Moon size={13} className={theme === 'dark' ? 'text-[#0A84FF]' : ''} />
        <span>Dark</span>
      </button>
    </div>
  );
};
