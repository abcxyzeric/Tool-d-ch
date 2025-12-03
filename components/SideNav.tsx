
import React, { useState } from 'react';
import { HomeIcon, SettingsIcon, KeyIcon, PaletteIcon, DocumentTextIcon, ClockIcon, ShieldCheckIcon } from './icons';

type Page = 'start' | 'settings' | 'rpg_parser' | 'history' | 'safetySettings';

interface SideNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenApiSettings: () => void;
  style?: React.CSSProperties;
  isCollapsed?: boolean;
}

const SideNav: React.FC<SideNavProps> = ({ currentPage, onNavigate, onOpenApiSettings, style, isCollapsed = false }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(['settings', 'safetySettings'].includes(currentPage));

  const navItemClasses = "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 hover:text-white";
  const activeNavItemClasses = "bg-gray-700 text-white";
  const subNavItemClasses = "flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white text-sm";

  return (
    <nav style={style} className={`bg-gray-800/50 border-r border-gray-700/50 flex-shrink-0 overflow-hidden flex flex-col ${isCollapsed ? 'p-0 border-r-0' : 'p-4'}`}>
        <div className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="mb-8 text-center flex-shrink-0">
                 <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-400)] to-[var(--secondary-600)]">
                    Tool dịch game
                </h1>
            </div>
          <ul className="space-y-2 flex-grow">
            <li>
              <button 
                onClick={() => onNavigate('start')}
                className={`${navItemClasses} w-full ${currentPage === 'start' ? activeNavItemClasses : ''}`}
              >
                <HomeIcon className="w-5 h-5" />
                <span className="truncate">Bắt đầu Dịch</span>
              </button>
            </li>
             <li>
              <button 
                onClick={() => onNavigate('rpg_parser')}
                className={`${navItemClasses} w-full ${currentPage === 'rpg_parser' ? activeNavItemClasses : ''}`}
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span className="truncate">Dịch RPG Maker MZ</span>
              </button>
            </li>
            <li>
              <button 
                onClick={() => onNavigate('history')}
                className={`${navItemClasses} w-full ${currentPage === 'history' ? activeNavItemClasses : ''}`}
              >
                <ClockIcon className="w-5 h-5" />
                <span className="truncate">Lịch sử</span>
              </button>
            </li>
            <li>
                <details className="group" open={isSettingsOpen} onToggle={(e) => setIsSettingsOpen(e.currentTarget.open)}>
                    <summary className={`${navItemClasses} w-full cursor-pointer list-none`}>
                         <SettingsIcon className="w-5 h-5" />
                         <span className="truncate">Cài đặt</span>
                         <svg className="w-4 h-4 ml-auto transition-transform group-open:rotate-90 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </summary>
                    <ul className="space-y-1 mt-1">
                        <li>
                            <button onClick={onOpenApiSettings} className={`${subNavItemClasses} w-full`}>
                                <KeyIcon className="w-5 h-5" />
                                <span className="truncate">Thiết lập API</span>
                            </button>
                        </li>
                         <li>
                             <button onClick={() => onNavigate('safetySettings')} className={`${subNavItemClasses} w-full ${currentPage === 'safetySettings' ? 'text-white' : ''}`}>
                                <ShieldCheckIcon className="w-5 h-5" />
                                <span className="truncate">Cài đặt an toàn</span>
                            </button>
                        </li>
                        <li>
                             <button onClick={() => onNavigate('settings')} className={`${subNavItemClasses} w-full ${currentPage === 'settings' ? 'text-white' : ''}`}>
                                <PaletteIcon className="w-5 h-5" />
                                <span className="truncate">Giao diện</span>
                            </button>
                        </li>
                    </ul>
                </details>
            </li>
          </ul>
        </div>
    </nav>
  );
};

export default SideNav;
