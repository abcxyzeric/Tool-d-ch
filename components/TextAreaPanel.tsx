import React, { useState, useEffect } from 'react';
import { CopyIcon, ClearIcon, CheckIcon } from './icons';

interface TextAreaPanelProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  isReadOnly: boolean;
  charCount: number;
  onScroll?: (event: React.UIEvent<HTMLTextAreaElement>) => void;
}

const TextAreaPanel = React.forwardRef<HTMLTextAreaElement, TextAreaPanelProps>(
  ({ id, label, value, onChange, placeholder, isReadOnly, charCount, onScroll }, ref) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
        <label htmlFor={id} className="font-semibold text-gray-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {!isReadOnly && onChange && (
            <button
              onClick={handleClear}
              className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Xóa văn bản"
              disabled={!value}
            >
              <ClearIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Sao chép văn bản"
            disabled={!value}
          >
            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="relative flex-grow min-h-0">
        <textarea
          ref={ref}
          onScroll={onScroll}
          id={id}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className="w-full h-full p-4 bg-transparent text-gray-200 resize-none focus:outline-none placeholder-gray-500 overflow-y-auto"
        />
      </div>
      <div className="flex-shrink-0 p-2 border-t border-gray-700 text-right text-xs text-gray-500">
        {charCount} ký tự
      </div>
    </div>
  );
});

export default TextAreaPanel;