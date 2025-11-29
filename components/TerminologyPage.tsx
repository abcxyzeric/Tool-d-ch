import React, { useState } from 'react';
import type { Keyword, ProperNoun } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface TerminologyPageProps {
    keywords: Keyword[];
    setKeywords: React.Dispatch<React.SetStateAction<Keyword[]>>;
    properNouns: ProperNoun[];
    setProperNouns: React.Dispatch<React.SetStateAction<ProperNoun[]>>;
}

const TerminologyPage: React.FC<TerminologyPageProps> = ({ keywords, setKeywords, properNouns, setProperNouns }) => {

    const [newKeyword, setNewKeyword] = useState('');
    const [newProperNounSource, setNewProperNounSource] = useState('');
    const [newProperNounTranslation, setNewProperNounTranslation] = useState('');

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newKeyword.trim() && !keywords.some(k => k.value.toLowerCase() === newKeyword.trim().toLowerCase())) {
            // FIX: Add missing 'enabled' property to match the Keyword type.
            setKeywords(prev => [...prev, { id: crypto.randomUUID(), value: newKeyword.trim(), enabled: true }]);
            setNewKeyword('');
        }
    };

    const handleDeleteKeyword = (id: string) => {
        setKeywords(prev => prev.filter(k => k.id !== id));
    };

    const handleAddProperNoun = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProperNounSource.trim() && newProperNounTranslation.trim() && !properNouns.some(p => p.source.toLowerCase() === newProperNounSource.trim().toLowerCase())) {
            // FIX: Add missing 'enabled' property to match the ProperNoun type.
            setProperNouns(prev => [...prev, { id: crypto.randomUUID(), source: newProperNounSource.trim(), translation: newProperNounTranslation.trim(), enabled: true }]);
            setNewProperNounSource('');
            setNewProperNounTranslation('');
        }
    };

    const handleDeleteProperNoun = (id: string) => {
        setProperNouns(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Quản lý Thuật ngữ</h1>
                <p className="mt-2 text-gray-400">
                    Thêm các từ khóa không cần dịch và các quy tắc dịch tên riêng để đảm bảo tính nhất quán.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Keywords Section */}
                <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                    <h2 className="text-xl font-semibold mb-4 text-white">Từ khóa (Không dịch)</h2>
                    <p className="text-sm text-gray-400 mb-4">Các từ trong danh sách này sẽ được giữ nguyên trong bản dịch.</p>
                    <form onSubmit={handleAddKeyword} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="Thêm từ khóa mới..."
                            className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                        />
                        <button type="submit" className="p-2.5 text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </form>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                        {keywords.length > 0 ? keywords.map(keyword => (
                            <div key={keyword.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                                <span className="text-gray-200 text-sm">{keyword.value}</span>
                                <button onClick={() => handleDeleteKeyword(keyword.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 text-sm py-4">Chưa có từ khóa nào.</p>
                        )}
                    </div>
                </section>

                {/* Proper Nouns Section */}
                <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                    <h2 className="text-xl font-semibold mb-4 text-white">Tên riêng (Dịch theo quy tắc)</h2>
                    <p className="text-sm text-gray-400 mb-4">AI sẽ luôn dịch "Tên gốc" thành "Bản dịch" tương ứng.</p>
                    <form onSubmit={handleAddProperNoun} className="space-y-2 mb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newProperNounSource}
                                onChange={(e) => setNewProperNounSource(e.target.value)}
                                placeholder="Tên gốc (VD: Luna)"
                                className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                            />
                            <input
                                type="text"
                                value={newProperNounTranslation}
                                onChange={(e) => setNewProperNounTranslation(e.target.value)}
                                placeholder="Bản dịch (VD: Lộ Na)"
                                className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                            />
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 p-2.5 text-sm text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg">
                            <PlusIcon className="w-5 h-5" /> Thêm quy tắc
                        </button>
                    </form>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                        {properNouns.length > 0 ? properNouns.map(noun => (
                             <div key={noun.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-300">{noun.source}</span>
                                    <span className="text-gray-500">→</span>
                                    <span className="text-purple-300 font-semibold">{noun.translation}</span>
                                </div>
                                <button onClick={() => handleDeleteProperNoun(noun.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                             <p className="text-center text-gray-500 text-sm py-4">Chưa có quy tắc nào.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TerminologyPage;