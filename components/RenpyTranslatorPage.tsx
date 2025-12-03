
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseRenpyScript, reconstructRenpyScript, translateText, CustomSafetySettings } from '../services/geminiService';
import { UploadIcon, TranslateIcon, DownloadIcon, TrashIcon, ChevronRightIcon, DocumentTextIcon } from './icons';
import type { RenpyFile, Keyword, ProperNoun, Rule, Notification } from '../types';

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
    const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [speakerContext, setSpeakerContext] = useState<string>(''); // Ngữ cảnh nhân vật (g = Gail)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result as string;
                try {
                    const entries = parseRenpyScript(text);
                    if (entries.length === 0) {
                        onShowNotification({ type: 'error', message: `Không tìm thấy thoại nào trong ${file.name}` });
                        return;
                    }
                    
                    const newFile: RenpyFile = {
                        id: crypto.randomUUID(),
                        fileName: file.name,
                        rawLines: text.split('\n'),
                        entries: entries,
                        status: 'loaded'
                    };
                    
                    setFiles(prev => [...prev, newFile]);
                    onShowNotification({ type: 'success', message: `Đã tách ${entries.length} dòng từ ${file.name}` });

                } catch (e) {
                    console.error(e);
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

    // Toggle Collapse
    const toggleCollapse = (id: string) => {
        setCollapsedKeys(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle Selection
    const toggleSelection = (id: string) => {
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    
    // Toggle Group Selection
    const toggleGroupSelection = (ids: string[], shouldSelect: boolean) => {
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => {
                if (shouldSelect) next.add(id);
                else next.delete(id);
            });
            return next;
        });
    };

    const handleRemoveFile = (fileId: string) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleExport = (file: RenpyFile) => {
        const content = reconstructRenpyScript(file);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onShowNotification({ type: 'success', message: `Đã xuất file ${file.fileName}` });
    };

    const translateBatch = async (fileId: string, targetEntryIds?: Set<string>) => {
        if (!activeApiKey) {
            onOpenApiSettings();
            return;
        }

        setIsTranslating(true);
        const file = files.find(f => f.id === fileId);
        if (!file) return;

        // 1. Filter entries
        const entriesToTranslate = file.entries.filter(e => {
            const isPendingOrError = e.status === 'pending' || e.status === 'error';
            const isSelected = targetEntryIds ? targetEntryIds.has(e.id) : true;
            return isPendingOrError && isSelected;
        });

        if (entriesToTranslate.length === 0) {
            onShowNotification({ type: 'success', message: 'Không có dòng nào cần dịch.' });
            setIsTranslating(false);
            return;
        }

        // 2. Mark as translating
        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => entriesToTranslate.some(t => t.id === e.id) ? { ...e, status: 'translating' } : e)
            };
        }));

        // 3. Batch processing (Chunking) - RenPy needs context flow
        const CHUNK_SIZE = 20; // Dịch mỗi lần 20 dòng để đảm bảo ngữ cảnh
        const chunks = [];
        for (let i = 0; i < entriesToTranslate.length; i += CHUNK_SIZE) {
            chunks.push(entriesToTranslate.slice(i, i + CHUNK_SIZE));
        }

        const DELIMITER = '#####';

        try {
            for (const chunk of chunks) {
                const combinedText = chunk.map(e => e.originalText).join(`\n${DELIMITER}\n`);
                
                // Add Speaker Context to the request implicitly via additionalContext param in updated translateText
                const result = await translateText(
                    combinedText,
                    'auto',
                    'vi',
                    activeApiKey,
                    model,
                    safetySettings,
                    { keywords, properNouns },
                    rules,
                    'renpy', // Specific format
                    speakerContext // Passed context
                );

                const segments = result.split(new RegExp(`\\s*${DELIMITER}\\s*`));

                setFiles(prev => prev.map(f => {
                    if (f.id !== fileId) return f;
                    return {
                        ...f,
                        entries: f.entries.map(e => {
                            const index = chunk.findIndex(c => c.id === e.id);
                            if (index !== -1) {
                                const translated = segments[index] ? segments[index].trim() : '';
                                return {
                                    ...e,
                                    translatedText: translated,
                                    status: translated ? 'done' : 'error'
                                };
                            }
                            return e;
                        })
                    };
                }));
            }
            onShowNotification({ type: 'success', message: 'Dịch hoàn tất!' });
        } catch (error) {
             console.error(error);
             setFiles(prev => prev.map(f => {
                if (f.id !== fileId) return f;
                return {
                    ...f,
                    entries: f.entries.map(e => entriesToTranslate.some(t => t.id === e.id) && e.status === 'translating' ? { ...e, status: 'error' } : e)
                };
            }));
            onShowNotification({ type: 'error', message: 'Lỗi khi dịch.' });
        }
        setIsTranslating(false);
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
             <header className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-100">Dịch Ren'Py Script (.rpy)</h1>
                <p className="mt-2 text-gray-400">Tách thoại, giữ nguyên code, và dịch theo ngữ cảnh nhân vật.</p>
            </header>

            {/* Context Injection Panel */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6 flex-shrink-0">
                <h3 className="font-semibold text-gray-200 mb-2">Định nghĩa Nhân vật (Quan trọng cho xưng hô)</h3>
                <p className="text-xs text-gray-400 mb-2">Nhập mã nhân vật và thông tin để AI dịch xưng hô chuẩn xác hơn.</p>
                <textarea 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:ring-purple-500 focus:border-purple-500"
                    rows={2}
                    placeholder="Ví dụ: e = Eileen (Cô giáo, nghiêm khắc), l = Lucy (Học sinh, ngây thơ). e nói chuyện với l xưng cô-em."
                    value={speakerContext}
                    onChange={(e) => setSpeakerContext(e.target.value)}
                />
            </div>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 flex-shrink-0 ${isDragActive ? 'bg-gray-700/50 border-[var(--primary-500)]' : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'}`}>
                <input {...getInputProps()} />
                <DocumentTextIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-300">Kéo thả file <strong>.rpy</strong> vào đây.</p>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 min-h-0">
                 {files.map(file => {
                    const isCollapsed = collapsedKeys.has(file.id);
                    const allIds = file.entries.map(e => e.id);
                    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedEntryIds.has(id));
                    const isPartialSelected = !isAllSelected && allIds.some(id => selectedEntryIds.has(id));

                    return (
                        <div key={file.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                            {/* FILE HEADER */}
                            <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button onClick={() => toggleCollapse(file.id)} className="text-gray-400 hover:text-white">
                                         <ChevronRightIcon className={`w-5 h-5 transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                                    </button>
                                     <input 
                                        type="checkbox" 
                                        checked={isAllSelected} 
                                        ref={input => { if (input) input.indeterminate = isPartialSelected; }}
                                        onChange={(e) => toggleGroupSelection(allIds, e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                    />
                                    <h3 className="font-semibold text-gray-200 truncate">{file.fileName} <span className="text-sm font-normal text-gray-500">({file.entries.length} dòng)</span></h3>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => translateBatch(file.id, selectedEntryIds)}
                                        disabled={isTranslating || !isPartialSelected && !isAllSelected}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <TranslateIcon className="w-4 h-4" /> Dịch Chọn
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
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* FILE CONTENT */}
                            {!isCollapsed && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase">
                                            <tr>
                                                <th className="p-3 w-10"></th>
                                                <th className="p-3 w-20">Speaker</th>
                                                <th className="p-3 w-1/2">Original</th>
                                                <th className="p-3 w-1/2">Translated</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/30">
                                            {file.entries.map(entry => (
                                                <tr key={entry.id} className={`hover:bg-gray-700/30 ${selectedEntryIds.has(entry.id) ? 'bg-purple-900/10' : ''}`}>
                                                     <td className="p-3 align-top">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedEntryIds.has(entry.id)} 
                                                            onChange={() => toggleSelection(entry.id)}
                                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)] mt-1"
                                                        />
                                                    </td>
                                                    <td className="p-3 align-top text-xs font-mono text-blue-300">
                                                        {entry.speaker || <span className="text-gray-600 italic">narrator</span>}
                                                    </td>
                                                    <td className="p-3 text-gray-300 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed border-r border-gray-700/30">
                                                        {entry.originalText}
                                                    </td>
                                                    <td className="p-3 text-gray-200 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed">
                                                         {entry.status === 'translating' ? (
                                                            <span className="text-yellow-400 text-xs animate-pulse">Đang dịch...</span>
                                                        ) : entry.status === 'error' ? (
                                                            <span className="text-red-400 text-xs">Lỗi</span>
                                                        ) : (
                                                            entry.translatedText
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                 })}
                 {files.length === 0 && (
                    <div className="text-center text-gray-500 py-10">Chưa có file nào.</div>
                )}
            </div>
        </div>
    );
};

export default RenpyTranslatorPage;
