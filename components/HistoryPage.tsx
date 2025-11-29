

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TranslationHistoryItem, AnalysisHistoryItem, HistoryFolder } from '../types';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES_WITH_AUTO } from '../constants';
import { TrashIcon, SwitchIcon, XIcon, PencilIcon, FolderIcon, FolderPlusIcon, FolderArrowDownIcon, DotsVerticalIcon, DownloadIcon, ChevronRightIcon } from './icons';
import HistoryDetailModal from './HistoryDetailModal';

const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Sub-components ---

const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/80 transition-colors"
            >
                <DotsVerticalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-20">
                    <ul className="text-sm text-gray-200" onClick={() => setIsOpen(false)}>
                        {children}
                    </ul>
                </div>
            )}
        </div>
    );
};

const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md">Hủy</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Xác nhận</button>
                </div>
            </div>
        </div>
    );
};

const TranslationHistoryListItem: React.FC<{
    item: TranslationHistoryItem;
    isSelected: boolean;
    onToggleSelect: () => void;
    onRename: (id: string, newName: string) => void;
    onViewDetail: () => void;
}> = ({ item, isSelected, onToggleSelect, onRename, onViewDetail }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name || '');
    const inputRef = useRef<HTMLInputElement>(null);

    const displayName = item.name || item.inputText;

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleRenameSubmit = () => {
        if (name.trim() !== (item.name || '')) {
            onRename(item.id, name.trim());
        }
        setIsEditing(false);
    };

    const sourceLangName = SOURCE_LANGUAGES_WITH_AUTO.find(l => l.code === item.sourceLang)?.name || item.sourceLang;
    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === item.targetLang)?.name || item.targetLang;

    return (
        <li className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-[var(--primary-600)] transition-colors relative group cursor-pointer" onClick={onViewDetail}>
            <div className="flex justify-between items-start">
                <div className="flex-grow min-w-0 pr-16">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-sm w-full mb-2"
                        />
                    ) : (
                        <p className="font-semibold text-gray-200 truncate" title={displayName}>
                            {displayName}
                        </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{sourceLangName}</span>
                        <SwitchIcon className="w-3 h-3 text-gray-400" />
                        <span>{targetLangName}</span>
                        <span className="mx-1">·</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                 <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-2">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Đổi tên"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        onClick={(e) => e.stopPropagation()}
                        className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-[var(--primary-500)] focus:ring-[var(--primary-500)] transition-all"
                    />
                </div>
            </div>
            <p className="text-sm text-gray-400 truncate mt-2">
                <span className="font-semibold text-[var(--primary-400)]">Dịch:</span> {item.translatedText}
            </p>
        </li>
    );
};

const AnalysisHistoryListItem: React.FC<{
    item: AnalysisHistoryItem;
    isSelected: boolean;
    onToggleSelect: () => void;
    onRename: (id: string, newName: string) => void;
    onViewDetail: () => void;
}> = ({ item, isSelected, onToggleSelect, onRename, onViewDetail }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [fileName, setFileName] = useState(item.fileName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleRenameSubmit = () => {
        if (fileName.trim() && fileName.trim() !== item.fileName) {
            onRename(item.id, fileName.trim());
        }
        setIsEditing(false);
    };

    return (
        <li className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-[var(--primary-600)] transition-colors relative group cursor-pointer" onClick={onViewDetail}>
            <div className="flex justify-between items-start">
                <div className="flex-grow min-w-0 pr-16">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={fileName}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setFileName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-sm w-full mb-2"
                        />
                    ) : (
                        <p className="font-semibold text-gray-200 truncate" title={item.fileName}>
                            {item.fileName}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item.originalContent, item.fileName);
                        }}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xuất tệp gốc"
                    >
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Đổi tên"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        onClick={(e) => e.stopPropagation()}
                        className="form-checkbox h-5 w-5 rounded bg-gray-700 border-gray-600 text-[var(--primary-500)] focus:ring-[var(--primary-500)] transition-all"
                    />
                </div>
            </div>
             <p className="text-sm text-gray-400 truncate mt-2">
                {item.analysisResult.split('\n')[1] || 'Nhấp để xem chi tiết...'}
            </p>
        </li>
    );
};

const FolderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    title: string;
    initialValue?: string;
}> = ({ isOpen, onClose, onSubmit, title, initialValue = '' }) => {
    const [name, setName] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(initialValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Tên thư mục..."
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md">Hủy</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const FolderTreeItem: React.FC<{
    folder: HistoryFolder;
    allFolders: HistoryFolder[];
    level: number;
    selectedFolderId: string | null;
    expandedFolderIds: string[];
    onSelectFolder: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onOpenModal: (mode: 'rename' | 'create_sub' | 'delete', folder: HistoryFolder) => void;
}> = ({ folder, allFolders, level, selectedFolderId, expandedFolderIds, onSelectFolder, onToggleExpand, onOpenModal }) => {
    const children = useMemo(() => allFolders.filter(f => f.parentId === folder.id), [allFolders, folder.id]);
    const isExpanded = expandedFolderIds.includes(folder.id);
    const hasChildren = children.length > 0;

    return (
        <>
            <div
                onClick={() => onSelectFolder(folder.id)}
                title={folder.name}
                className={`w-full flex items-center gap-2 rounded-md text-sm transition-colors group cursor-pointer ${selectedFolderId === folder.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                style={{ paddingLeft: `${level * 16}px` }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) onToggleExpand(folder.id);
                    }}
                    className={`p-1 rounded-md ${!hasChildren ? 'opacity-0 cursor-default' : ''}`}
                >
                    <ChevronRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <div className="flex items-center gap-2 py-2 flex-grow min-w-0">
                    <FolderIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{folder.name}</span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-1 flex-shrink-0">
                    <DropdownMenu>
                         <li className="px-3 py-2 hover:bg-gray-700/80 cursor-pointer flex items-center gap-2"
                            onClick={(e) => { e.stopPropagation(); onOpenModal('create_sub', folder)}}>
                            <FolderPlusIcon className="w-4 h-4" /> Thêm thư mục con
                        </li>
                        <li className="px-3 py-2 hover:bg-gray-700/80 cursor-pointer flex items-center gap-2"
                            onClick={(e) => { e.stopPropagation(); onOpenModal('rename', folder)}}>
                            <PencilIcon className="w-4 h-4" /> Đổi tên
                        </li>
                        <li className="px-3 py-2 hover:bg-gray-700/80 cursor-pointer flex items-center gap-2 text-red-400"
                            onClick={(e) => { e.stopPropagation(); onOpenModal('delete', folder)}}>
                            <TrashIcon className="w-4 h-4" /> Xóa
                        </li>
                    </DropdownMenu>
                </div>
            </div>
            {isExpanded && hasChildren && (
                <div className="space-y-1">
                    {children.map(child => (
                        <FolderTreeItem
                            key={child.id}
                            folder={child}
                            allFolders={allFolders}
                            level={level + 1}
                            selectedFolderId={selectedFolderId}
                            expandedFolderIds={expandedFolderIds}
                            onSelectFolder={onSelectFolder}
                            onToggleExpand={onToggleExpand}
                            onOpenModal={onOpenModal}
                        />
                    ))}
                </div>
            )}
        </>
    );
};


// --- Main Page Component ---
interface HistoryPageProps {
  translationHistory: TranslationHistoryItem[];
  analysisHistory: AnalysisHistoryItem[];
  folders: HistoryFolder[];
  onFolderAction: {
    add: (name: string, type: 'translation' | 'analysis', parentId?: string | null) => HistoryFolder | undefined;
    rename: (id: string, newName: string) => void;
    delete: (id: string) => void;
    moveTranslations: (itemIds: string[], folderId: string | null) => void;
    moveAnalyses: (itemIds: string[], folderId: string | null) => void;
  };
  onRenameTranslationItem: (id: string, newName: string) => void;
  onRenameAnalysisItem: (id: string, newName: string) => void;
  onDeleteTranslationItems: (ids: string[]) => void;
  onDeleteAnalysisItems: (ids: string[]) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  translationHistory,
  analysisHistory,
  folders,
  onFolderAction,
  onRenameTranslationItem,
  onRenameAnalysisItem,
  onDeleteTranslationItems,
  onDeleteAnalysisItems,
}) => {
  type Tab = 'translation' | 'analysis';
  const [activeTab, setActiveTab] = useState<Tab>('translation');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<TranslationHistoryItem | AnalysisHistoryItem | null>(null);
  
  // Modal states
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean, mode: 'create' | 'rename' | 'create_sub' | 'bulk_create', folder?: HistoryFolder }>({ isOpen: false, mode: 'create' });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, type: 'items' | 'folder', id?: string }>({ isOpen: false, type: 'items' });
  
  const [isMoveToOpen, setIsMoveToOpen] = useState(false);
  const moveToRef = useRef<HTMLDivElement>(null);

  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (moveToRef.current && !moveToRef.current.contains(event.target as Node)) {
            setIsMoveToOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moveToRef]);


  const handleFolderSubmit = (name: string) => {
      if (folderModal.mode === 'create') {
          onFolderAction.add(name, activeTab, null);
      } else if (folderModal.mode === 'create_sub' && folderModal.folder) {
          onFolderAction.add(name, activeTab, folderModal.folder.id);
          setExpandedFolderIds(prev => [...prev, folderModal.folder!.id]);
      } else if (folderModal.mode === 'rename' && folderModal.folder) {
          onFolderAction.rename(folderModal.folder.id, name);
      } else if (folderModal.mode === 'bulk_create') {
          const newFolder = onFolderAction.add(name, activeTab, null);
          if (newFolder) {
              if (activeTab === 'translation') onFolderAction.moveTranslations(selectedItemIds, newFolder.id);
              else onFolderAction.moveAnalyses(selectedItemIds, newFolder.id);
              setSelectedFolderId(newFolder.id);
              setSelectedItemIds([]);
          }
      }
      setFolderModal({ isOpen: false, mode: 'create' });
  };

  const handleDeleteFolder = () => {
    if (confirmDelete.type === 'folder' && confirmDelete.id) {
        if (selectedFolderId === confirmDelete.id) {
            setSelectedFolderId(null);
        }
        onFolderAction.delete(confirmDelete.id);
    }
    setConfirmDelete({ isOpen: false, type: 'items' });
  };

  const handleDeleteItems = () => {
    if (activeTab === 'translation') onDeleteTranslationItems(selectedItemIds);
    else onDeleteAnalysisItems(selectedItemIds);
    setSelectedItemIds([]);
    setConfirmDelete({ isOpen: false, type: 'items' });
  };

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolderIds(prev =>
        prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleFolderModalOpen = (mode: 'rename' | 'create_sub' | 'delete', folder: HistoryFolder) => {
    if (mode === 'delete') {
      setConfirmDelete({ isOpen: true, type: 'folder', id: folder.id });
    } else {
      setFolderModal({ isOpen: true, mode, folder });
    }
  };

  const currentFolders = useMemo(() => folders.filter(f => f.type === activeTab), [folders, activeTab]);
  const rootFolders = useMemo(() => currentFolders.filter(f => !f.parentId), [currentFolders]);

  const displayedTranslations = useMemo(() => {
    return translationHistory.filter(item => item.folderId === selectedFolderId)
  }, [translationHistory, selectedFolderId]);
  
  const displayedAnalyses = useMemo(() => {
    return analysisHistory.filter(item => item.folderId === selectedFolderId)
  }, [analysisHistory, selectedFolderId]);

  useEffect(() => {
    setSelectedFolderId(null);
    setSelectedItemIds([]);
  }, [activeTab]);

  useEffect(() => {
    setSelectedItemIds([]);
  }, [selectedFolderId]);

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleMoveToFolder = (folderId: string | null) => {
    if (activeTab === 'translation') {
      onFolderAction.moveTranslations(selectedItemIds, folderId);
    } else {
      onFolderAction.moveAnalyses(selectedItemIds, folderId);
    }
    setSelectedItemIds([]);
    setIsMoveToOpen(false);
  };

  
  const renderContent = () => {
    const items = activeTab === 'translation' ? displayedTranslations : displayedAnalyses;
    
    if (items.length === 0) {
        const folderName = selectedFolderId ? currentFolders.find(f => f.id === selectedFolderId)?.name : 'Chưa phân loại';
        return <p className="text-center text-gray-500 py-20">{`Thư mục "${folderName}" trống.`}</p>;
    }

    if (activeTab === 'translation') {
        return (
            <ul className="space-y-4">
                {items.map(item => (
                    <TranslationHistoryListItem 
                        key={item.id} 
                        item={item} 
                        isSelected={selectedItemIds.includes(item.id)}
                        onToggleSelect={() => handleToggleSelect(item.id)}
                        onRename={onRenameTranslationItem} 
                        onViewDetail={() => setSelectedItemForDetail(item)} />
                ))}
            </ul>
        );
    }

    return (
        <ul className="space-y-4">
            {items.map(item => (
                <AnalysisHistoryListItem 
                    key={item.id} 
                    item={item}
                    isSelected={selectedItemIds.includes(item.id)}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onRename={onRenameAnalysisItem} 
                    onViewDetail={() => setSelectedItemForDetail(item)} />
            ))}
        </ul>
    );
  };


  return (
    <>
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8 flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Lịch sử</h1>
        <p className="mt-2 text-gray-400">Xem lại và sắp xếp các bản dịch, phân tích của bạn.</p>
      </header>

      <div className="border-b border-gray-700 mb-6 flex-shrink-0">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => setActiveTab('translation')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'translation' ? 'border-[var(--primary-500)] text-[var(--primary-400)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
            Lịch sử dịch
          </button>
          <button onClick={() => setActiveTab('analysis')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'analysis' ? 'border-[var(--primary-500)] text-[var(--primary-400)]' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
            Lịch sử phân tích
          </button>
        </nav>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        {/* Folder Sidebar */}
        <aside className="md:col-span-1 bg-gray-800/30 p-4 rounded-lg border border-gray-700/30 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Thư mục</h2>
            <div className="flex-grow space-y-1 overflow-y-auto pr-1">
                <div 
                    onClick={() => setSelectedFolderId(null)}
                    title="Chưa phân loại"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group cursor-pointer ${selectedFolderId === null ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    <FolderIcon className="w-5 h-5" />
                    <span className="truncate">Chưa phân loại</span>
                </div>
                 <div className="border-t border-gray-700 my-2"></div>
                {rootFolders.map(folder => (
                    <FolderTreeItem
                        key={folder.id}
                        folder={folder}
                        allFolders={currentFolders}
                        level={0}
                        selectedFolderId={selectedFolderId}
                        expandedFolderIds={expandedFolderIds}
                        onSelectFolder={setSelectedFolderId}
                        onToggleExpand={handleToggleExpand}
                        onOpenModal={handleFolderModalOpen}
                    />
                ))}
            </div>
            <div className="flex-shrink-0 mt-4">
                 <button onClick={() => setFolderModal({ isOpen: true, mode: 'create' })} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors">
                    <FolderPlusIcon className="w-5 h-5"/>
                    Tạo thư mục mới
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3 overflow-y-auto pr-2 relative">
            {renderContent()}
        </main>
      </div>
    </div>
    
    {/* Bulk Actions Bar */}
    {selectedItemIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-auto bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-full shadow-lg z-40">
            <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-sm font-medium text-white">{selectedItemIds.length} mục đã chọn</span>
                <div className="h-5 w-px bg-gray-600"></div>
                <div ref={moveToRef} className="relative">
                    <button onClick={() => setIsMoveToOpen(prev => !prev)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                        <FolderArrowDownIcon className="w-5 h-5" />
                        Di chuyển tới...
                    </button>
                    {isMoveToOpen && (
                        <div className="absolute bottom-full mb-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                            <ul className="text-sm text-gray-200 max-h-48 overflow-y-auto">
                                <li className="px-3 py-2 hover:bg-gray-700 cursor-pointer" onClick={() => handleMoveToFolder(null)}>Chưa phân loại</li>
                                {currentFolders.map(folder => (
                                    <li key={folder.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer" onClick={() => handleMoveToFolder(folder.id)}>
                                        {folder.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                 <button onClick={() => setFolderModal({ isOpen: true, mode: 'bulk_create' })} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                    <FolderPlusIcon className="w-5 h-5" />
                    Tạo thư mục mới
                </button>
                <button onClick={() => setConfirmDelete({ isOpen: true, type: 'items' })} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                    Xóa
                </button>
                <div className="h-5 w-px bg-gray-600"></div>
                <button onClick={() => setSelectedItemIds([])} className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-full">
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    )}

    <HistoryDetailModal
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
    />
    <FolderModal 
        isOpen={folderModal.isOpen}
        onClose={() => setFolderModal({ isOpen: false, mode: 'create' })}
        onSubmit={handleFolderSubmit}
        title={
            folderModal.mode === 'create' ? 'Tạo thư mục gốc' : 
            folderModal.mode === 'create_sub' ? `Tạo thư mục con trong "${folderModal.folder?.name}"` :
            folderModal.mode === 'rename' ? 'Đổi tên thư mục' : 
            `Tạo thư mục mới & di chuyển ${selectedItemIds.length} mục`
        }
        initialValue={folderModal.mode === 'rename' ? folderModal.folder?.name : ''}
    />
    <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, type: 'items' })}
        onConfirm={confirmDelete.type === 'items' ? handleDeleteItems : handleDeleteFolder}
        title={confirmDelete.type === 'items' ? `Xóa ${selectedItemIds.length} mục?` : 'Xóa thư mục?'}
        message={
            confirmDelete.type === 'items' 
            ? 'Hành động này không thể hoàn tác. Các mục đã chọn sẽ bị xóa vĩnh viễn.' 
            : 'Tất cả thư mục con cũng sẽ bị xóa. Các mục bên trong sẽ được chuyển về "Chưa phân loại".'
        }
    />
    </>
  );
};

export default HistoryPage;