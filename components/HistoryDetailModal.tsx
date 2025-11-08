import React from 'react';
import type { TranslationHistoryItem, AnalysisHistoryItem } from '../types';
import { XIcon, DownloadIcon } from './icons';

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

interface HistoryDetailModalProps {
  item: TranslationHistoryItem | AnalysisHistoryItem | null;
  onClose: () => void;
}

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isTranslation = 'inputText' in item;

  const renderResult = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mt-4 mb-2 text-gray-100">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold mt-3 mb-1 text-gray-200">{line.substring(4)}</h3>;
      }
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return <p key={index} className="text-gray-300 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-200 truncate pr-8">
            {isTranslation ? (item.name || 'Chi tiết bản dịch') : item.fileName}
          </h2>
          <div className="flex items-center gap-2">
            {!isTranslation && (
              <button
                onClick={() => handleDownload(item.originalContent, item.fileName)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md transition-colors"
                title={`Tải xuống ${item.fileName}`}
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Xuất tệp</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto">
          {isTranslation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-gray-400">Văn bản gốc</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg flex-grow overflow-y-auto max-h-[60vh]">
                        <pre className="text-gray-300 whitespace-pre-wrap font-sans">{item.inputText}</pre>
                    </div>
                </div>
                 <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-gray-400">Bản dịch</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg flex-grow overflow-y-auto max-h-[60vh]">
                        <pre className="text-gray-200 whitespace-pre-wrap font-sans">{item.translatedText}</pre>
                    </div>
                </div>
            </div>
          ) : (
            <div className="space-y-2">
                {renderResult(item.analysisResult)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailModal;