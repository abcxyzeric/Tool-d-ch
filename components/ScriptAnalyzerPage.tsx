import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyzeScript, CustomSafetySettings } from '../services/geminiService';
import { DocumentTextIcon, UploadIcon, CheckIcon, XIcon, ChevronRightIcon } from './icons';
import type { AnalysisHistoryItem, Notification, ProcessingFile } from '../types';


interface ScriptAnalyzerPageProps {
  activeApiKey: string | null;
  onOpenApiSettings: () => void;
  onAddAnalysisHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp' | 'folderId'>) => void;
  safetySettings: CustomSafetySettings;
  onShowNotification: (notification: Omit<Notification, 'id'>) => void;
  processingFiles: ProcessingFile[];
  setProcessingFiles: React.Dispatch<React.SetStateAction<ProcessingFile[]>>;
}


const ScriptAnalyzerPage: React.FC<ScriptAnalyzerPageProps> = ({ activeApiKey, onOpenApiSettings, onAddAnalysisHistory, safetySettings, onShowNotification, processingFiles, setProcessingFiles }) => {
  const [error, setError] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const handleAnalysis = useCallback(async (file: File, processId: string) => {
    if (!activeApiKey) {
        setProcessingFiles(prev => prev.map(f => f.id === processId ? { ...f, status: 'error', error: 'API Key không hợp lệ.' } : f));
        onShowNotification({ type: 'error', message: `Phân tích ${file.name} thất bại: API Key không hợp lệ.` });
        onOpenApiSettings();
        return;
    }

    try {
        const content = await file.text();
        const result = await analyzeScript(content, file.name, activeApiKey, safetySettings);
        onAddAnalysisHistory({ fileName: file.name, analysisResult: result, originalContent: content });
        setProcessingFiles(prev => prev.map(f => f.id === processId ? { ...f, status: 'success' } : f));
        onShowNotification({ type: 'success', message: `Phân tích tệp "${file.name}" thành công!` });
    } catch (err: any) {
        const errorMessage = err.message || "Đã xảy ra lỗi không mong muốn.";
        setProcessingFiles(prev => prev.map(f => f.id === processId ? { ...f, status: 'error', error: errorMessage } : f));
        onShowNotification({ type: 'error', message: `Phân tích "${file.name}" thất bại.` });
    }
  }, [activeApiKey, safetySettings, onAddAnalysisHistory, onShowNotification, onOpenApiSettings, setProcessingFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setShowAllFiles(true); // Always expand when new files are added
    const newFilesToProcess: ProcessingFile[] = acceptedFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        status: 'loading'
    }));

    setProcessingFiles(prev => [...newFilesToProcess, ...prev]);
    
    newFilesToProcess.forEach((fileToProcess, index) => {
        handleAnalysis(acceptedFiles[index], fileToProcess.id);
    });

  }, [handleAnalysis, setProcessingFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'text/plain': ['.rpy'],
        'application/json': ['.json']
    },
    multiple: true,
  });

  const dropzoneStyles = useMemo(() => {
    const base = 'border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer transition-colors duration-300 flex flex-col items-center justify-center';
    if (isDragActive) {
      return `${base} bg-gray-700/50 border-[var(--primary-500)]`;
    }
    return `${base} bg-gray-800/50 hover:border-gray-500`;
  }, [isDragActive]);

  const renderStatusIcon = (status: ProcessingFile['status']) => {
    switch(status) {
        case 'loading':
            return <svg className="animate-spin h-5 w-5 text-[var(--primary-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        case 'success':
            return <CheckIcon className="h-5 w-5 text-green-400" />;
        case 'error':
            return <XIcon className="h-5 w-5 text-red-400" />;
    }
  };

  const filesToShow = showAllFiles ? processingFiles : processingFiles.slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
          Phân tích kịch bản
        </h1>
        <p className="mt-2 text-gray-400">
          Tải lên một hoặc nhiều tệp kịch bản (.rpy, .json) để AI phân tích sâu về cốt truyện, nhân vật, vật phẩm và kỹ năng.
        </p>
      </header>
      <main className="space-y-6">
        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Lỗi: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <div {...getRootProps()} className={dropzoneStyles}>
          <input {...getInputProps()} />
          <UploadIcon className="w-12 h-12 text-gray-500 mb-4" />
          {isDragActive ? (
            <p className="text-gray-300">Thả các tệp vào đây...</p>
          ) : (
            <p className="text-gray-400">Kéo và thả các tệp .rpy hoặc .json vào đây, hoặc nhấn để chọn tệp</p>
          )}
        </div>
        
        {processingFiles.length > 0 && (
             <div className="mt-8 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Tiến trình phân tích</h3>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {filesToShow.map(file => (
                        <div key={file.id} className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                                {file.status === 'error' && <p className="text-xs text-red-400 truncate mt-1">{file.error}</p>}
                            </div>
                            <div className="flex-shrink-0 ml-4">
                                {renderStatusIcon(file.status)}
                            </div>
                        </div>
                    ))}
                </div>
                 {processingFiles.length > 10 && (
                    <div className="text-center mt-3">
                        <button onClick={() => setShowAllFiles(!showAllFiles)} className="text-sm text-[var(--primary-400)] hover:text-[var(--primary-300)] flex items-center gap-1 mx-auto">
                            <span>{showAllFiles ? 'Ẩn bớt' : `Hiển thị thêm ${processingFiles.length - 10} tệp`}</span>
                            <ChevronRightIcon className={`w-4 h-4 transition-transform ${showAllFiles ? 'rotate-[-90deg]' : 'rotate-90'}`} />
                        </button>
                    </div>
                )}
             </div>
        )}

      </main>
    </div>
  );
};

export default ScriptAnalyzerPage;
