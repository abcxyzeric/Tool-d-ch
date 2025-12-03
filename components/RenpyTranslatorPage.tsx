
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseRenpyScript, reconstructRenpyScript, batchTranslateRenpy } from '../services/renpyService';
import type { RenpyFile, Keyword, ProperNoun, Rule, Notification } from '../types';
import type { CustomSafetySettings } from '../services/geminiService';
import { UploadIcon, TranslateIcon, DownloadIcon, TrashIcon, ChevronRightIcon } from './icons';

interface RenpyTranslatorPageProps {
  activeApiKey: string | null;
  onOpenApiSettings: () => void;
  safetySettings: CustomSafetySettings;
  onShowNotification: (notification: Omit<Notification, 'id'>) => void;
  keywords: Keyword[];
  properNouns: ProperNoun[];
  rules: Rule[];
  model: string;
  files: RenpyFile[];
  setFiles: React.Dispatch<React.SetStateAction<RenpyFile[]>>;
}

const RenpyTranslatorPage: React.FC<RenpyTranslatorPageProps> = ({
    activeApiKey,
    onOpenApiSettings,
    safetySettings,
    onShowNotification,
    keywords,
    properNouns,
    rules,
    model,
    files,
    setFiles
}) => {
    const [isTranslating, setIsTranslating] = useState(false);
    const [collapsedFileIds, setCollapsedFileIds] = useState<Set<string>>(new Set());
    
    // State quản lý việc chọn các dòng để dịch
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                try {
                    const entries = parseRenpyScript(content);
                    const newFile: RenpyFile = {
                        id: crypto.randomUUID(),
                        fileName: file.name,
                        originalContent: content,
                        entries: entries,
                        status: 'loaded'
                    };
                    setFiles(prev => [...prev, newFile]);
                    onShowNotification({ type: 'success', message: `Đã đọc ${file.name} (${entries.length} dòng thoại)` });
                } catch (error) {
                    onShowNotification({ type: 'error', message: `Lỗi đọc file ${file.name}` });
                }
            };
            reader.readAsText(file);
        });
    }, [onShowNotification, setFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/plain': ['.rpy', '.txt'] }, // Chấp nhận .rpy và .txt
        multiple: true,
    });

    // --- UI Helpers ---

    const toggleCollapse = (fileId: string) => {
        setCollapsedFileIds(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return next;
        });
    };

    const toggleSelection = (fileId: string, entryId: number) => {
        const uniqueId = `${fileId}_${entryId}`; // Tạo ID duy nhất kết hợp FileID và EntryID
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            if (next.has(uniqueId)) next.delete(uniqueId);
            else next.add(uniqueId);
            return next;
        });
    };

    const toggleFileSelection = (fileId: string, entries: any[], shouldSelect: boolean) => {
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            entries.forEach(entry => {
                const uniqueId = `${fileId}_${entry.id}`;
                if (shouldSelect) next.add(uniqueId);
                else next.delete(uniqueId);
            });
            return next;
        });
    };

    const handleRemoveFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        // Xóa các selection liên quan (Optional, để tránh memory leak nếu dùng lâu)
    };

    const handleExport = (file: RenpyFile) => {
        const content = reconstructRenpyScript(file.originalContent, file.entries);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${file.fileName.replace('.rpy', '')}_vi.rpy`; // Xuất ra file _vi.rpy hoặc .txt tùy ý
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --- Logic Dịch ---

    const handleTranslate = async (fileId: string) => {
        if (!activeApiKey) {
            onOpenApiSettings();
            return;
        }

        const file = files.find(f => f.id === fileId);
        if (!file) return;

        // Lọc các mục cần dịch: Phải nằm trong danh sách đã chọn VÀ chưa dịch xong (pending/error)
        const entriesToTranslate = file.entries.filter(e => {
            const uniqueId = `${fileId}_${e.id}`;
            const isSelected = selectedEntryIds.has(uniqueId);
            return isSelected && (e.status === 'pending' || e.status === 'error');
        });

        if (entriesToTranslate.length === 0) {
            onShowNotification({ type: 'success', message: 'Vui lòng chọn các dòng chưa dịch để bắt đầu.' });
            return;
        }

        setIsTranslating(true);

        // Đánh dấu trạng thái đang dịch
        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'translating' } : e)
            };
        }));

        try {
            const results = await batchTranslateRenpy(
                entriesToTranslate,
                activeApiKey,
                model,
                safetySettings,
                { keywords, properNouns },
                rules
            );

            // Cập nhật kết quả
            setFiles(prev => prev.map(f => {
                if (f.id !== fileId) return f;
                return {
                    ...f,
                    entries: f.entries.map(e => {
                        const result = results.find(r => r.id === e.id);
                        if (result) {
                            return { ...e, translatedText: result.text, status: 'done' };
                        }
                        // Nếu entry này nằm trong danh sách gửi đi mà không có kết quả trả về -> Error
                        if (entriesToTranslate.some(target => target.id === e.id)) {
                             // Có thể giữ nguyên status translating hoặc chuyển sang error
                             return e.status === 'translating' ? { ...e, status: 'error' } : e;
                        }
                        return e;
                    })
                };
            }));
            onShowNotification({ type: 'success', message: `Đã dịch xong ${results.length} dòng.` });

        } catch (error) {
             onShowNotification({ type: 'error', message: 'Lỗi khi dịch: ' + (error instanceof Error ? error.message : String(error)) });
             // Đánh dấu lỗi
             setFiles(prev => prev.map(f => {
                if (f.id !== fileId) return f;
                return {
                    ...f,
                    entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'error' } : e)
                };
            }));
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            <header className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-100">Dịch Game Ren'Py</h1>
                <p className="mt-2 text-gray-400">Tải lên file script (.rpy), trích xuất hội thoại và tạo file bản dịch.</p>
            </header>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 flex-shrink-0 ${isDragActive ? 'bg-gray-700/50 border-[var(--primary-500)]' : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'}`}>
                <input {...getInputProps()} />
                <UploadIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-300">Kéo thả file <strong>.rpy</strong> vào đây.</p>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 min-h-0">
                {files.map(file => {
                    const isCollapsed = collapsedFileIds.has(file.id);
                    // Tính toán trạng thái checkbox tổng của file
                    const fileEntryIds = file.entries.map(e => `${file.id}_${e.id}`);
                    const selectedCount = fileEntryIds.filter(id => selectedEntryIds.has(id)).length;
                    const isAllSelected = fileEntryIds.length > 0 && selectedCount === fileEntryIds.length;
                    const isIndeterminate = selectedCount > 0 && selectedCount < fileEntryIds.length;

                    return (
                        <div key={file.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                            {/* FILE HEADER */}
                            <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     <button onClick={() => toggleCollapse(file.id)} className="text-gray-400 hover:text-white transition-transform">
                                        <ChevronRightIcon className={`w-5 h-5 transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                                    </button>
                                    <input 
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                        onChange={(e) => toggleFileSelection(file.id, file.entries, e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                    />
                                    <h3 className="font-semibold text-gray-200 truncate" title={file.fileName}>
                                        {file.fileName} <span className="text-sm font-normal text-gray-500">({file.entries.length} dòng)</span>
                                    </h3>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-4">
                                     <button 
                                        onClick={() => handleTranslate(file.id)}
                                        disabled={isTranslating || selectedCount === 0}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <TranslateIcon className="w-4 h-4" /> Dịch {selectedCount > 0 ? `(${selectedCount})` : ''}
                                    </button>
                                     <button 
                                        onClick={() => handleExport(file)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                                        title="Xuất file .rpy"
                                    >
                                        <DownloadIcon className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveFile(file.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg"
                                        title="Xóa file"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* FILE CONTENT (TABLE) */}
                            {!isCollapsed && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase sticky top-0 z-0">
                                            <tr>
                                                <th className="p-3 w-10 text-center">#</th>
                                                <th className="p-3 w-32">Nhân vật</th>
                                                <th className="p-3 w-1/2">Gốc</th>
                                                <th className="p-3 w-1/2">Dịch</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/30">
                                            {file.entries.map((entry) => {
                                                const uniqueId = `${file.id}_${entry.id}`;
                                                const isSelected = selectedEntryIds.has(uniqueId);
                                                return (
                                                    <tr key={uniqueId} className={`hover:bg-gray-700/30 ${isSelected ? 'bg-purple-900/10' : ''}`}>
                                                        <td className="p-3 align-top text-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelection(file.id, entry.id)}
                                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                                            />
                                                        </td>
                                                        <td className="p-3 align-top text-blue-300 font-mono text-sm">
                                                            {entry.speaker || <span className="text-gray-600 italic">Narrator</span>}
                                                        </td>
                                                        <td className="p-3 align-top text-gray-300 text-sm font-sans whitespace-pre-wrap">
                                                            {entry.originalText}
                                                            {entry.context && <div className="text-xs text-gray-500 mt-1 italic">Context: {entry.context}</div>}
                                                        </td>
                                                        <td className="p-3 align-top text-gray-200 text-sm font-sans whitespace-pre-wrap">
                                                             {entry.status === 'translating' ? (
                                                                <span className="text-yellow-400 text-xs animate-pulse">Đang dịch...</span>
                                                            ) : entry.status === 'error' ? (
                                                                <span className="text-red-400 text-xs">Lỗi</span>
                                                            ) : (
                                                                entry.translatedText
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
                 {files.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        Chưa có file nào được tải lên.
                    </div>
                )}
            </div>
        </div>
    );
};

export default RenpyTranslatorPage;
