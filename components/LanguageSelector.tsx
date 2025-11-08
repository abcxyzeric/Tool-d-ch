
import React from 'react';
import type { Language } from '../types';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Language[];
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ label, value, onChange, options }) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
      >
        {options.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
