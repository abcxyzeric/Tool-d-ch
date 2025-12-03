
import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseRpgMakerData, translateText, CustomSafetySettings } from '../services/geminiService';
import { UploadIcon, TranslateIcon, CheckIcon, XIcon, DownloadIcon, TrashIcon, ChevronRightIcon } from './icons';
import type { RpgMakerFile, RpgMakerEntry, Keyword, ProperNoun, Rule, Notification } from '../types';

interface RpgMakerParserPageProps {
  activeApiKey: string | null;
  onOpenApiSettings: () => void;
  safetySettings: CustomSafetySettings;
  onShowNotification: (notification: Omit<Notification, 'id'>) => void;
  keywords: Keyword[];
  properNouns: ProperNoun[];
  rules: Rule[];
  model: string;
  files: RpgMakerFile[]; // Nhận từ props
  setFiles: React.Dispatch<React.SetStateAction<RpgMakerFile[]>>; // Nhận setter từ props
  mapInfos: Record<number, any>; // Nhận từ props
  setMapInfos: React.Dispatch<React.SetStateAction<Record<number, any>>>; // Nhận setter từ props
}

const RpgMakerParserPage: React.FC<RpgMakerParserPageProps> = ({ 
    activeApiKey, 
    onOpenApiSettings, 
    safetySettings, 
    onShowNotification,
    keywords,
    properNouns,
    rules,
    model,
    files, // Sử dụng props
    setFiles, // Sử dụng props
    mapInfos, // Sử dụng props
    setMapInfos // Sử dụng props
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  // Không dùng local state cho files và mapInfos nữa

  // --- State quản lý UI mới ---
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set()); // Lưu các ID của File hoặc Event đang bị đóng
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set()); // Lưu ID các dòng thoại đang được chọn

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Đọc tất cả file trước để tìm MapInfos.json
    const filePromises = acceptedFiles.map(file => 
        file.text().then(text => ({ name: file.name, text }))
    );

    Promise.all(filePromises).then(results => {
        let currentMapInfos = { ...mapInfos };

        // 1. Tìm và xử lý MapInfos.json trước
        const mapInfoFile = results.find(r => r.name === 'MapInfos.json');
        if (mapInfoFile) {
            try {
                const parsed = JSON.parse(mapInfoFile.text);
                // MapInfos trong RPG Maker MZ thường là một mảng object
                if (Array.isArray(parsed)) {
                    parsed.forEach((info: any) => {
                        if (info && info.id) {
                            currentMapInfos[info.id] = info;
                        }
                    });
                }
                setMapInfos(currentMapInfos);
                onShowNotification({ type: 'success', message: 'Đã tải thông tin Map Tree (MapInfos.json)!' });
            } catch (e) {
                onShowNotification({ type: 'error', message: 'Lỗi đọc file MapInfos.json' });
            }
        }

        // 2. Xử lý các file còn lại (MapXXX.json, CommonEvents.json...)
        results.forEach(fileData => {
            if (fileData.name === 'MapInfos.json') return; // Đã xử lý ở trên

            try {
                // Truyền currentMapInfos vào hàm parse để tra cứu tên Map
                const entries = parseRpgMakerData(fileData.text, fileData.name, currentMapInfos);
                
                // Nếu không có entry nào, có thể file rỗng hoặc không đúng định dạng
                if (entries.length === 0) {
                     // Vẫn có thể thông báo nếu muốn, nhưng ở đây ta cứ add vào
                }

                const newFile: RpgMakerFile = {
                    id: crypto.randomUUID(),
                    fileName: fileData.name,
                    entries: entries,
                    status: 'loaded'
                };
                setFiles(prev => [...prev, newFile]);
                onShowNotification({ type: 'success', message: `Đã tách ${entries.length} dòng từ ${fileData.name}` });
            } catch (e) {
                onShowNotification({ type: 'error', message: `Lỗi đọc file ${fileData.name}` });
            }
        });
    });
  }, [onShowNotification, mapInfos, setFiles, setMapInfos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    multiple: true,
  });

  // --- Logic UI Helpers ---

  // Đảo trạng thái đóng/mở
  const toggleCollapse = (key: string) => {
      setCollapsedKeys(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
      });
  };

  // Chọn/Bỏ chọn một dòng
  const toggleSelection = (id: string) => {
      setSelectedEntryIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  // Chọn/Bỏ chọn cả nhóm (File hoặc Event)
  const toggleGroupSelection = (idsToCheck: string[], shouldSelect: boolean) => {
      setSelectedEntryIds(prev => {
          const next = new Set(prev);
          idsToCheck.forEach(id => {
              if (shouldSelect) next.add(id);
              else next.delete(id);
          });
          return next;
      });
  };

  // --- Translation Logic ---

  const handleTranslateEntry = async (fileId: string, entryId: string) => {
    if (!activeApiKey) {
        onOpenApiSettings();
        return;
    }

    setFiles(prev => prev.map(f => {
        if (f.id !== fileId) return f;
        return {
            ...f,
            entries: f.entries.map(e => e.id === entryId ? { ...e, status: 'translating' } : e)
        };
    }));

    const file = files.find(f => f.id === fileId);
    const entry = file?.entries.find(e => e.id === entryId);

    if (!entry) return;

    try {
        const translated = await translateText(
            entry.originalText, 
            'auto', 
            'vi', 
            activeApiKey, 
            model, 
            safetySettings, 
            { keywords, properNouns }, 
            rules
        );

        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => e.id === entryId ? { ...e, translatedText: translated, status: 'done' } : e)
            };
        }));
    } catch (error) {
        setFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                entries: f.entries.map(e => e.id === entryId ? { ...e, status: 'error' } : e)
            };
        }));
    }
  };

  // Hàm dùng chung cho Dịch Tất Cả hoặc Dịch Đã Chọn
  // CẬP NHẬT: GOM TOÀN BỘ CÁC MỤC ĐÃ CHỌN THÀNH 1 REQUEST DUY NHẤT
  const translateBatch = async (fileId: string, targetEntryIds?: Set<string>) => {
      if (!activeApiKey) {
          onOpenApiSettings();
          return;
      }
      setIsTranslating(true);
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // 1. Lọc các entry cần dịch (Status chưa xong/lỗi VÀ nằm trong danh sách chọn)
      const entriesToTranslate = file.entries.filter(e => {
          const isPendingOrError = e.status === 'pending' || e.status === 'error';
          const isSelected = targetEntryIds ? targetEntryIds.has(e.id) : true;
          return isPendingOrError && isSelected;
      });
      
      if (entriesToTranslate.length === 0) {
          onShowNotification({ type: 'success', message: 'Không có dòng nào cần dịch trong phạm vi đã chọn.' });
          setIsTranslating(false);
          return;
      }

      // 2. Gom tất cả thành một chuỗi duy nhất, bất kể event nào, để tiết kiệm request
      // Đánh dấu toàn bộ là đang dịch
      setFiles(prev => prev.map(f => {
          if (f.id !== fileId) return f;
          return {
              ...f,
              entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'translating' } : e)
          };
      }));

      const DELIMITER = '#####'; // Dấu phân cách
      const combinedText = entriesToTranslate.map(e => e.originalText).join(`\n${DELIMITER}\n`);

      try {
          const translatedResult = await translateText(
              combinedText,
              'auto',
              'vi',
              activeApiKey,
              model,
              safetySettings,
              { keywords, properNouns },
              rules
          );

          // 3. Tách kết quả và map ngược lại
          // Sử dụng regex để tách linh hoạt hơn với khoảng trắng
          const translatedSegments = translatedResult.split(new RegExp(`\\s*${DELIMITER}\\s*`));

          setFiles(prev => prev.map(f => {
              if (f.id !== fileId) return f;
              return {
                  ...f,
                  entries: f.entries.map(e => {
                      // Tìm vị trí của entry này trong danh sách gửi đi
                      const index = entriesToTranslate.findIndex(target => target.id === e.id);
                      if (index !== -1) {
                          const segment = translatedSegments[index];
                          return {
                              ...e,
                              translatedText: segment ? segment.trim() : '',
                              status: segment ? 'done' : 'error' // Nếu thiếu segment trả về thì báo lỗi
                          };
                      }
                      return e;
                  })
              };
          }));
          onShowNotification({ type: 'success', message: `Hoàn thành dịch ${entriesToTranslate.length} mục trong 1 lần.` });

      } catch (error) {
          // Nếu request tổng bị lỗi, đánh dấu tất cả là lỗi
           setFiles(prev => prev.map(f => {
              if (f.id !== fileId) return f;
              return {
                  ...f,
                  entries: f.entries.map(e => entriesToTranslate.some(target => target.id === e.id) ? { ...e, status: 'error' } : e)
              };
          }));
          onShowNotification({ type: 'error', message: 'Lỗi khi dịch hàng loạt.' });
      }
      
      setIsTranslating(false);
  };
  
  const handleRemoveFile = (fileId: string) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      // Xóa selection liên quan
      setSelectedEntryIds(prev => {
          const next = new Set(prev);
          // Logic xóa này hơi phức tạp nếu không duyệt qua file, nên ta có thể reset hoặc kệ nó (không ảnh hưởng lắm)
          return next; 
      });
  };

  const handleExportJson = (file: RpgMakerFile) => {
      // Create a simplified export for now, or just the extracted data
      const exportData = JSON.stringify(file.entries, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName}_extracted.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
        <header className="mb-6 flex-shrink-0">
            <h1 className="text-3xl font-bold text-gray-100">Dịch RPG Maker MZ</h1>
            <p className="mt-2 text-gray-400">Tách text từ file Map/CommonEvents JSON và dịch tự động.</p>
        </header>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-6 flex-shrink-0 ${isDragActive ? 'bg-gray-700/50 border-[var(--primary-500)]' : 'bg-gray-800/30 border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <UploadIcon className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-300">Kéo thả file <strong>MapXXX.json</strong> và <strong>MapInfos.json</strong> vào đây.</p>
            <p className="text-xs text-gray-500 mt-2">(Nên thả file MapInfos.json cùng lúc để hiển thị đúng tên Map)</p>
        </div>

        <div className="flex-grow overflow-y-auto space-y-6 min-h-0">
            {files.map(file => {
                const isFileCollapsed = collapsedKeys.has(file.id);
                const fileEntryIds = file.entries.map(e => e.id);
                const isFileAllSelected = fileEntryIds.length > 0 && fileEntryIds.every(id => selectedEntryIds.has(id));
                const isFilePartialSelected = !isFileAllSelected && fileEntryIds.some(id => selectedEntryIds.has(id));

                // Group entries by Context (Event)
                const groupedByContext = file.entries.reduce((acc, entry) => {
                    const key = entry.context || 'Khác';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(entry);
                    return acc;
                }, {} as Record<string, RpgMakerEntry[]>);

                return (
                    <div key={file.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden flex flex-col shadow-lg">
                        {/* HEADER CỦA FILE */}
                        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={() => toggleCollapse(file.id)} className="text-gray-400 hover:text-white transition-transform">
                                    <ChevronRightIcon className={`w-5 h-5 transform transition-transform ${isFileCollapsed ? '' : 'rotate-90'}`} />
                                </button>
                                <input 
                                    type="checkbox" 
                                    checked={isFileAllSelected} 
                                    ref={input => { if (input) input.indeterminate = isFilePartialSelected; }}
                                    onChange={(e) => toggleGroupSelection(fileEntryIds, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                />
                                <h3 className="font-semibold text-gray-200 truncate" title={file.fileName}>
                                    {file.fileName} <span className="text-sm font-normal text-gray-500">({file.entries.length} mục)</span>
                                </h3>
                            </div>
                            
                            <div className="flex gap-2 flex-shrink-0 ml-4">
                                <button 
                                    onClick={() => translateBatch(file.id, selectedEntryIds)}
                                    disabled={isTranslating || !isFilePartialSelected && !isFileAllSelected}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Dịch TẤT CẢ các mục đã chọn trong file này (Gom 1 lần)"
                                >
                                    <TranslateIcon className="w-4 h-4" /> Dịch Đã Chọn (Gom 1 lần)
                                </button>
                                <button 
                                    onClick={() => translateBatch(file.id)}
                                    disabled={isTranslating}
                                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg disabled:opacity-50"
                                    title="Dịch tất cả (bỏ qua những cái đã xong)"
                                >
                                    Dịch Hết
                                </button>
                                <button 
                                    onClick={() => handleExportJson(file)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                                    title="Xuất JSON"
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
                        
                        {/* BODY CỦA FILE (List of Events) */}
                        {!isFileCollapsed && (
                            <div className="bg-gray-900/30 p-2 space-y-2">
                                {Object.entries(groupedByContext).map(([contextName, entries]) => {
                                    const contextKey = `${file.id}_${contextName}`; // Key duy nhất cho Event trong File
                                    const isEventCollapsed = collapsedKeys.has(contextKey);
                                    const eventEntryIds = entries.map(e => e.id);
                                    const isEventAllSelected = eventEntryIds.length > 0 && eventEntryIds.every(id => selectedEntryIds.has(id));
                                    const isEventPartialSelected = !isEventAllSelected && eventEntryIds.some(id => selectedEntryIds.has(id));

                                    return (
                                        <div key={contextKey} className="border border-gray-700/30 rounded-lg bg-gray-800/40 overflow-hidden">
                                            {/* HEADER CỦA EVENT */}
                                            <div 
                                                className="flex items-center gap-3 p-2 bg-gray-800/80 hover:bg-gray-700/50 cursor-pointer select-none border-b border-gray-700/20"
                                                onClick={() => toggleCollapse(contextKey)}
                                            >
                                                 <button className="text-gray-500 hover:text-gray-300">
                                                    <ChevronRightIcon className={`w-4 h-4 transform transition-transform ${isEventCollapsed ? '' : 'rotate-90'}`} />
                                                </button>
                                                <input 
                                                    type="checkbox"
                                                    checked={isEventAllSelected}
                                                    ref={input => { if (input) input.indeterminate = isEventPartialSelected; }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => toggleGroupSelection(eventEntryIds, e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)]"
                                                />
                                                <span className="text-sm font-semibold text-blue-300 truncate">{contextName}</span>
                                                <span className="text-xs text-gray-500 ml-auto">{entries.length} dòng</span>
                                            </div>

                                            {/* BODY CỦA EVENT (Table rows) */}
                                            {!isEventCollapsed && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <tbody className="divide-y divide-gray-700/30">
                                                            {entries.map(entry => (
                                                                <tr key={entry.id} className={`hover:bg-gray-700/30 ${selectedEntryIds.has(entry.id) ? 'bg-purple-900/10' : ''}`}>
                                                                    <td className="p-3 w-10 align-top">
                                                                         <input 
                                                                            type="checkbox" 
                                                                            checked={selectedEntryIds.has(entry.id)} 
                                                                            onChange={() => toggleSelection(entry.id)}
                                                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[var(--primary-600)] focus:ring-[var(--primary-500)] mt-1"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-gray-300 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2 border-r border-gray-700/30">
                                                                        {entry.originalText}
                                                                    </td>
                                                                    <td className="p-3 text-gray-200 text-sm align-top whitespace-pre-wrap font-sans leading-relaxed w-1/2">
                                                                        {entry.status === 'translating' ? (
                                                                            <span className="text-yellow-400 text-xs animate-pulse">Đang dịch...</span>
                                                                        ) : entry.status === 'error' ? (
                                                                            <span className="text-red-400 text-xs">Lỗi</span>
                                                                        ) : (
                                                                            entry.translatedText
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 w-10 align-top">
                                                                        <button 
                                                                            onClick={() => handleTranslateEntry(file.id, entry.id)}
                                                                            className="p-1.5 text-gray-500 hover:text-white bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors"
                                                                            title="Dịch dòng này"
                                                                        >
                                                                            <TranslateIcon className="w-4 h-4" />
                                                                        </button>
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

export default RpgMakerParserPage;
