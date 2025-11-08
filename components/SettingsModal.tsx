import React, { useState, useEffect, useRef } from 'react';
import { validateApiKey } from '../services/geminiService';
import { XIcon, EyeIcon, EyeOffIcon, PlusIcon, UploadIcon } from './icons';

interface ApiKey {
  id: string;
  value: string;
  status: 'unchecked' | 'valid' | 'invalid' | 'checking';
  visible: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated: () => void;
  model: string;
  onModelChange: (model: string) => void;
}

const STORAGE_KEY = 'gemini_api_keys_list';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onKeysUpdated, model, onModelChange }) => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const storedKeys = localStorage.getItem(STORAGE_KEY);
        if (storedKeys) {
          setKeys(JSON.parse(storedKeys));
        } else {
          setKeys([{ id: crypto.randomUUID(), value: '', status: 'unchecked', visible: false }]);
        }
      } catch (error) {
        console.error("Failed to load API keys from storage", error);
        setKeys([{ id: crypto.randomUUID(), value: '', status: 'unchecked', visible: false }]);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    onKeysUpdated();
    onClose();
  };
  
  const updateKey = (id: string, newValues: Partial<ApiKey>) => {
    setKeys(prev => prev.map(key => key.id === id ? { ...key, ...newValues } : key));
  };

  const addKey = () => {
    setKeys(prev => [...prev, { id: crypto.randomUUID(), value: '', status: 'unchecked', visible: false }]);
  };

  const removeKey = (id: string) => {
    setKeys(prev => prev.filter(key => key.id !== id));
  };
  
  const handleCheckKeys = async () => {
    setIsChecking(true);
    const keysToValidate = keys.filter(k => k.value.trim() !== '');
    
    // Set status to checking
    setKeys(prev => prev.map(k => k.value.trim() ? { ...k, status: 'checking' } : k));

    await Promise.all(keysToValidate.map(async (key) => {
      const isValid = await validateApiKey(key.value);
      updateKey(key.id, { status: isValid ? 'valid' : 'invalid' });
    }));
    setIsChecking(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newKeys = content.split(/[\n, ]+/).filter(k => k.trim() !== '');
        const newApiKeys = newKeys.map(k => ({ id: crypto.randomUUID(), value: k, status: 'unchecked' as const, visible: false }));
        setKeys(prev => [...prev.filter(k => k.value.trim()), ...newApiKeys]);
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (event.target) {
        event.target.value = '';
    }
  };


  if (!isOpen) return null;

  const getStatusIndicator = (status: ApiKey['status']) => {
    switch(status) {
        case 'valid': return <><span className="w-2 h-2 bg-green-500 rounded-full"></span><span className="text-green-400 truncate">Hợp lệ & Sẵn sàng</span></>;
        case 'invalid': return <><span className="w-2 h-2 bg-red-500 rounded-full"></span><span className="text-red-400 truncate">Không hợp lệ hoặc hết hạn</span></>;
        case 'checking': return <><span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span><span className="text-yellow-400 truncate">Đang kiểm tra...</span></>;
        default: return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="relative bg-[#1e1c32] bg-opacity-80 backdrop-blur-sm border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-purple-900/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-200">Thiết lập API Key</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto space-y-6 text-gray-300">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a> và đăng nhập.</li>
              <li>Nhấn vào "Create API key" và sao chép khóa vừa tạo.</li>
              <li>Dán khóa vào ô bên dưới. Bạn có thể thêm nhiều khóa để dự phòng.</li>
            </ol>
            <p className="mt-3 text-xs text-gray-400">
              <span className="font-semibold">Lưu ý:</span> Công cụ này yêu cầu API Key của Google Gemini để hoạt động.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-200">DANH SÁCH KHÓA API GEMINI CỦA BẠN</h3>
            <div className="space-y-3">
              {keys.map((key, index) => (
                <div key={key.id} className="flex items-center gap-3">
                  <span className="text-gray-400">{index + 1}.</span>
                  <div className="flex-grow relative">
                    <input 
                      type={key.visible ? 'text' : 'password'}
                      value={key.value}
                      onChange={(e) => updateKey(key.id, { value: e.target.value, status: 'unchecked' })}
                      placeholder="Dán API Key của bạn ở đây"
                      className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pr-10"
                    />
                    <button onClick={() => updateKey(key.id, { visible: !key.visible })} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white">
                      {key.visible ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 w-48 text-xs">{getStatusIndicator(key.status)}</div>
                  <button onClick={() => removeKey(key.id)} className="p-1 text-gray-500 hover:text-red-400">
                    <XIcon className="w-5 h-5"/>
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">Mẹo: Bạn có thể dán nhiều khóa cùng lúc (phân tách bằng dấu phẩy, dấu cách hoặc xuống dòng).</p>
            <div className="mt-4 flex items-center gap-4">
              <button onClick={addKey} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors">
                <PlusIcon className="w-4 h-4" /> Thêm khóa API
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors">
                <UploadIcon className="w-4 h-4" /> Tải lên từ tệp (.txt)
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-200">MÔ HÌNH DỊCH THUẬT</h3>
            <p className="text-xs text-gray-400 mb-2">Chọn mô hình AI để sử dụng cho việc dịch. Pro mạnh hơn nhưng có thể chậm hơn.</p>
            <select
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="gemini-2.5-flash" className="bg-gray-800 text-gray-200">Gemini 2.5 Flash (Nhanh, mặc định)</option>
              <option value="gemini-2.5-pro" className="bg-gray-800 text-gray-200">Gemini 2.5 Pro (Chất lượng cao hơn)</option>
            </select>
          </div>

        </div>

        <div className="flex justify-end items-center p-4 border-t border-gray-700/50 gap-4">
          <button 
            onClick={handleCheckKeys} 
            disabled={isChecking}
            className="px-6 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra khóa Gemini'}
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;