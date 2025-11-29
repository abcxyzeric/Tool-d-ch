import React from 'react';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';
import type { CustomSafetySettings } from '../services/geminiService';

interface SafetySettingsPageProps {
  settings: CustomSafetySettings;
  onSettingsChange: (settings: CustomSafetySettings) => void;
}

// FIX: Relax the type to `[key: string]: string` to allow a partial set of labels without causing a type error.
const categoryLabels: { [key: string]: string } = {
  [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'Quấy rối',
  [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'Lời nói hận thù',
  [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'Nội dung khiêu dâm',
  [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'Nội dung nguy hiểm',
};

// The @google/genai SDK does not include CIVICS, so we filter it out if present
const categories = (Object.values(HarmCategory) as HarmCategory[]).filter(c => c !== 'HARM_CATEGORY_UNSPECIFIED' && c in categoryLabels);

const thresholdOptions = [
    { value: HarmBlockThreshold.BLOCK_NONE, label: 'Tắt bộ lọc (Không chặn)' },
    { value: HarmBlockThreshold.BLOCK_ONLY_HIGH, label: 'Chỉ chặn mức cao' },
    { value: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, label: 'Chặn từ mức trung bình' },
    { value: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, label: 'Chặn cả mức thấp (Nghiêm ngặt nhất)' },
];

const SafetySettingsPage: React.FC<SafetySettingsPageProps> = ({ settings, onSettingsChange }) => {
    
    const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({ ...settings, enabled: e.target.checked });
    };

    const handleThresholdChange = (category: HarmCategory, threshold: HarmBlockThreshold) => {
        onSettingsChange({
            ...settings,
            thresholds: {
                ...settings.thresholds,
                [category]: threshold,
            },
        });
    };
    
  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Cài đặt an toàn Gemini API</h1>
        <p className="mt-2 text-gray-400">
          Cấu hình mức độ chặn nội dung không an toàn của Gemini API. Ảnh hưởng đến tất cả phản hồi AI.
        </p>
      </header>

      <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700/50 text-sm text-blue-200 mb-6">
        <p className="font-semibold mb-2">Chế độ hoạt động kép</p>
        <p>Công cụ này hoạt động ở hai chế độ dựa trên cài đặt của bạn:</p>
        <ul className="list-disc list-inside mt-2 space-y-2">
            <li>
            <strong>Bật lọc an toàn (Chế độ Tiêu chuẩn):</strong> Văn bản của bạn được gửi trực tiếp đến Gemini API và bộ lọc an toàn sẽ hoạt động theo các mức chặn bạn đã định cấu hình bên dưới. Sử dụng chế độ này cho nội dung thông thường.
            </li>
            <li>
            <strong>Tắt lọc an toàn (Chế độ Vượt qua An toàn):</strong> Để xử lý nội dung nhạy cảm và tránh lỗi "prohibited", công cụ sẽ kích hoạt một giao thức đặc biệt. Văn bản đầu vào của bạn sẽ được làm mờ (obfuscated) và AI sẽ được hướng dẫn theo một "Giao thức Nghiên cứu Học thuật" để giải mã và xử lý nội dung gốc một cách trung thực và không bị kiểm duyệt.
            </li>
        </ul>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Bật lọc an toàn Gemini API</h2>
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={settings.enabled}
                    onChange={handleEnabledChange}
                    className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className={`ml-3 text-sm font-medium ${settings.enabled ? 'text-gray-200' : 'text-gray-400'}`}>
                    {settings.enabled ? 'Đang bật' : 'Đang tắt'}
                </span>
            </label>
        </div>

        <div className={`space-y-4 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <p className="font-semibold text-gray-300">Danh mục</p>
                <p className="font-semibold text-gray-300">Mức chặn</p>
            </div>
            {categories.map((category) => (
                <div key={category} className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 items-center">
                    <label htmlFor={category} className="text-gray-400">
                        {categoryLabels[category]}
                    </label>
                    <select
                        id={category}
                        value={settings.thresholds[category] || HarmBlockThreshold.BLOCK_NONE}
                        onChange={(e) => handleThresholdChange(category, e.target.value as HarmBlockThreshold)}
                        disabled={!settings.enabled}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                    >
                        {thresholdOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>

        <div className="text-xs text-gray-500 p-4 bg-gray-900/50 rounded-lg mt-4">
            <h4 className="font-semibold text-gray-400 mb-2">Thông tin nâng cao về cài đặt an toàn</h4>
            <ul className="list-disc list-inside space-y-1">
                <li><span className="font-semibold">Tắt bộ lọc:</span> Hoàn toàn tắt bộ lọc an toàn cho danh mục này.</li>
                <li><span className="font-semibold">Chỉ chặn mức cao:</span> Chỉ chặn nội dung có xác suất cao là không an toàn.</li>
                <li><span className="font-semibold">Chặn từ mức trung bình:</span> Chặn nội dung có xác suất trung bình trở lên.</li>
                <li><span className="font-semibold">Chặn cả mức thấp:</span> Chặn cả nội dung có xác suất thấp (nghiêm ngặt nhất).</li>
            </ul>
             <p className="mt-3">
                Cài đặt nghiêm ngặt có thể chặn nhiều nội dung hơn, nhưng cũng có thể chặn cả phản hồi vô hại. Mặc định, tất cả bộ lọc đều được tắt để đảm bảo chức năng dịch không kiểm duyệt.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SafetySettingsPage;