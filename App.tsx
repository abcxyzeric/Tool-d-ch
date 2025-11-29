import React, { useState, useCallback, useEffect, useRef } from 'react';
import { translateText, generateTitleForTranslation, CustomSafetySettings } from './services/geminiService';
import { SUPPORTED_LANGUAGES, SOURCE_LANGUAGES_WITH_AUTO } from './constants';
import { TranslationHistoryItem, AnalysisHistoryItem, HistoryFolder, Keyword, ProperNoun, Rule, Notification, ProcessingFile } from './types';
import LanguageSelector from './components/LanguageSelector';
import TextAreaPanel from './components/TextAreaPanel';
import SettingsModal from './components/SettingsModal';
import SideNav from './components/SideNav';
import ScriptAnalyzerPage from './components/ScriptAnalyzerPage';
import HistoryPage from './components/HistoryPage';
import SafetySettingsPage from './components/SafetySettingsPage';
import { NotificationContainer } from './components/Notification';
import { TranslateIcon, SwitchIcon, PaletteIcon, KeyIcon, ChevronRightIcon, PlusIcon, TrashIcon, BookOpenIcon, ShieldCheckIcon } from './components/icons';
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// Theme configuration
const themes: { [key: string]: { [key: string]: string } } = {
  purple: {
    '--primary-400': '#c084fc',
    '--primary-500': '#a855f7',
    '--primary-600': '#9333ea',
    '--primary-700': '#7e22ce',
    '--secondary-600': '#ec4899',
  },
  blue: {
    '--primary-400': '#60a5fa',
    '--primary-500': '#3b82f6',
    '--primary-600': '#2563eb',
    '--primary-700': '#1d4ed8',
    '--secondary-600': '#22d3ee',
  },
  green: {
    '--primary-400': '#4ade80',
    '--primary-500': '#22c55e',
    '--primary-600': '#16a34a',
    '--primary-700': '#15803d',
    '--secondary-600': '#facc15',
  },
};

const ThemeButton = ({ themeName, color, currentTheme, setTheme }: any) => (
    <button
        onClick={() => setTheme(themeName)}
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${currentTheme === themeName ? `border-[var(--primary-500)] bg-gray-800` : 'border-gray-700 hover:border-gray-600'}`}
    >
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full" style={{ background: color }}></div>
            <span className="capitalize font-semibold">{themeName}</span>
        </div>
    </button>
);


const SettingsPage = ({ currentTheme, setTheme }: any) => {
  return (
    <div className="max-w-4xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Giao diện</h1>
            <p className="mt-2 text-gray-400">Tùy chỉnh màu sắc giao diện theo ý thích của bạn.</p>
        </header>
        <div className="space-y-8">
             <section className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><PaletteIcon className="w-6 h-6"/>Thay đổi màu giao diện</h2>
                <p className="text-gray-400 mb-4">Chọn một bảng màu phù hợp với sở thích của bạn.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ThemeButton themeName="purple" color="linear-gradient(to right, #c084fc, #ec4899)" currentTheme={currentTheme} setTheme={setTheme} />
                    <ThemeButton themeName="blue" color="linear-gradient(to right, #60a5fa, #22d3ee)" currentTheme={currentTheme} setTheme={setTheme} />
                    <ThemeButton themeName="green" color="linear-gradient(to right, #4ade80, #facc15)" currentTheme={currentTheme} setTheme={setTheme} />
                </div>
            </section>
        </div>
    </div>
  )
};

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void; }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={onChange} className="sr-only peer" />
        <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--primary-700)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-500)]"></div>
    </label>
);

const RulesManager = ({ rules, setRules }: { rules: Rule[], setRules: React.Dispatch<React.SetStateAction<Rule[]>> }) => {
    const [newRule, setNewRule] = useState('');

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRule.trim() && !rules.some((r) => r.text.toLowerCase() === newRule.trim().toLowerCase())) {
            setRules((prev) => [...prev, { id: crypto.randomUUID(), text: newRule.trim(), enabled: true }]);
            setNewRule('');
        }
    };

    const handleDeleteRule = (id: string) => {
        setRules((prev) => prev.filter(r => r.id !== id));
    };

    const handleToggleRule = (id: string) => {
        setRules((prev) => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    };

    return (
        <section>
            <form onSubmit={handleAddRule} className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="VD: Claire xưng 'em' với Lily..."
                    className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                />
                <button type="submit" className="p-2 text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </form>
            <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                {rules.length > 0 ? rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg gap-4">
                        <p className={`text-gray-200 text-sm transition-opacity flex-1 ${!rule.enabled ? 'opacity-50 line-through' : ''}`}>{rule.text}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <ToggleSwitch enabled={rule.enabled} onChange={() => handleToggleRule(rule.id)} />
                            <button onClick={() => handleDeleteRule(rule.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 text-sm py-4">Chưa có luật lệ nào.</p>
                )}
            </div>
        </section>
    );
};


const TerminologyManager = ({ keywords, setKeywords, properNouns, setProperNouns }: any) => {
    const [newKeyword, setNewKeyword] = useState('');
    const [newProperNounSource, setNewProperNounSource] = useState('');
    const [newProperNounTranslation, setNewProperNounTranslation] = useState('');

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newKeyword.trim() && !keywords.some((k: Keyword) => k.value.toLowerCase() === newKeyword.trim().toLowerCase())) {
            setKeywords((prev: Keyword[]) => [...prev, { id: crypto.randomUUID(), value: newKeyword.trim(), enabled: true }]);
            setNewKeyword('');
        }
    };

    const handleDeleteKeyword = (id: string) => {
        setKeywords((prev: Keyword[]) => prev.filter(k => k.id !== id));
    };

    const handleToggleKeyword = (id: string) => {
        setKeywords((prev: Keyword[]) => prev.map(k => k.id === id ? { ...k, enabled: !k.enabled } : k));
    };

    const handleAddProperNoun = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProperNounSource.trim() && newProperNounTranslation.trim() && !properNouns.some((p: ProperNoun) => p.source.toLowerCase() === newProperNounSource.trim().toLowerCase())) {
            setProperNouns((prev: ProperNoun[]) => [...prev, { id: crypto.randomUUID(), source: newProperNounSource.trim(), translation: newProperNounTranslation.trim(), enabled: true }]);
            setNewProperNounSource('');
            setNewProperNounTranslation('');
        }
    };

    const handleDeleteProperNoun = (id: string) => {
        setProperNouns((prev: ProperNoun[]) => prev.filter(p => p.id !== id));
    };
    
    const handleToggleProperNoun = (id: string) => {
        setProperNouns((prev: ProperNoun[]) => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keywords Section */}
            <section>
                <h3 className="text-base font-semibold mb-3 text-gray-300">Từ khóa (Không dịch)</h3>
                <form onSubmit={handleAddKeyword} className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Thêm từ khóa..."
                        className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                    />
                    <button type="submit" className="p-2 text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </form>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                    {keywords.length > 0 ? keywords.map((keyword: Keyword) => (
                        <div key={keyword.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-lg">
                            <span className={`text-gray-200 text-sm transition-opacity ${!keyword.enabled ? 'opacity-50 line-through' : ''}`}>{keyword.value}</span>
                            <div className="flex items-center gap-2">
                                <ToggleSwitch enabled={keyword.enabled} onChange={() => handleToggleKeyword(keyword.id)} />
                                <button onClick={() => handleDeleteKeyword(keyword.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 text-sm py-4">Chưa có từ khóa.</p>
                    )}
                </div>
            </section>

            {/* Proper Nouns Section */}
            <section>
                <h3 className="text-base font-semibold mb-3 text-gray-300">Tên riêng (Dịch theo quy tắc)</h3>
                <form onSubmit={handleAddProperNoun} className="space-y-2 mb-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newProperNounSource}
                            onChange={(e) => setNewProperNounSource(e.target.value)}
                            placeholder="Tên gốc"
                            className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                        />
                        <input
                            type="text"
                            value={newProperNounTranslation}
                            onChange={(e) => setNewProperNounTranslation(e.target.value)}
                            placeholder="Bản dịch"
                            className="flex-grow bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2"
                        />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 p-2 text-sm text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] rounded-lg">
                        <PlusIcon className="w-5 h-5" /> Thêm quy tắc
                    </button>
                </form>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                    {properNouns.length > 0 ? properNouns.map((noun: ProperNoun) => (
                         <div key={noun.id} className={`flex items-center justify-between bg-gray-700/50 p-2 rounded-lg text-sm transition-opacity ${!noun.enabled ? 'opacity-50' : ''}`}>
                            <div className={`flex items-center gap-2 ${!noun.enabled ? 'line-through' : ''}`}>
                                <span className="text-gray-300">{noun.source}</span>
                                <span className="text-gray-500">→</span>
                                <span className="text-purple-300 font-semibold">{noun.translation}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <ToggleSwitch enabled={noun.enabled} onChange={() => handleToggleProperNoun(noun.id)} />
                                <button onClick={() => handleDeleteProperNoun(noun.id)} className="p-1 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                         <p className="text-center text-gray-500 text-sm py-4">Chưa có quy tắc.</p>
                    )}
                </div>
            </section>
        </div>
    );
};


const TranslationPage = ({
    activeApiKey,
    onOpenApiSettings,
    inputText, setInputText,
    translatedText, setTranslatedText,
    sourceLang, setSourceLang,
    targetLang, setTargetLang,
    onAddTranslationHistory,
    model,
    safetySettings,
    keywords, setKeywords,
    properNouns, setProperNouns,
    rules, setRules,
    isAutoSpacingEnabled,
    onAutoSpacingChange,
    onShowNotification,
}: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTerminologyManagerOpen, setIsTerminologyManagerOpen] = useState(false);
  const [isRulesManagerOpen, setIsRulesManagerOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const [textAreaPanelHeight, setTextAreaPanelHeight] = useState<number | null>(null);
  const [isVResizing, setIsVResizing] = useState(false);
  const textAreaContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs for synchronized scrolling
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const mobileOutputRef = useRef<HTMLTextAreaElement>(null);
  const isSyncing = useRef(false);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isAutoSpacingEnabled) {
      return; 
    }

    e.preventDefault(); 

    const pastedText = e.clipboardData.getData('text');
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const textBefore = inputText.substring(0, start);
    const textAfter = inputText.substring(end);

    // LOGIC CHỐNG DÍNH CHỮ:
    // Kiểm tra văn bản phía trước con trỏ (prefix context).
    // Nếu có văn bản phía trước và nó không kết thúc bằng xuống dòng, ta phải chèn xuống dòng.
    let prefix = "";
    if (textBefore.length > 0) {
         if (!textBefore.endsWith('\n')) {
             prefix = "\n\n"; // Cách ra 2 dòng nếu đang dính liền
         } else if (!textBefore.endsWith('\n\n')) {
             prefix = "\n"; // Nếu đã có 1 dòng, thêm 1 dòng nữa cho đủ 2
         }
    }

    // Văn bản chèn vào = (Khoảng cách an toàn) + (Nội dung dán) + (Chuẩn bị 2 dòng cho lần sau)
    const textToInsert = prefix + pastedText + '\n\n';

    const newText = textBefore + textToInsert + textAfter;
    setInputText(newText);

    // Đặt lại vị trí con trỏ và cuộn xuống
    setTimeout(() => {
        if (textarea) {
            // Cập nhật giá trị DOM để đảm bảo tính toán chính xác
            textarea.value = newText;
            const newCursorPosition = start + textToInsert.length;
            textarea.selectionStart = newCursorPosition;
            textarea.selectionEnd = newCursorPosition;
            
            // Tự động cuộn đến vị trí con trỏ
            textarea.blur();
            textarea.focus();
            textarea.scrollTop = textarea.scrollHeight;
        }
    }, 0);
  }, [isAutoSpacingEnabled, inputText, setInputText]);

  // Auto-save input text
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('translation_input_text', inputText);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [inputText]);

  useEffect(() => {
    const savedHeight = localStorage.getItem('translation_text_area_height');
    if (savedHeight) {
        setTextAreaPanelHeight(parseInt(savedHeight, 10));
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleVMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVResizing(true);
  }

  useEffect(() => {
    const handleVMouseMove = (e: MouseEvent) => {
        if (!isVResizing || !textAreaContainerRef.current) return;
        const rect = textAreaContainerRef.current.getBoundingClientRect();
        let newHeight = e.clientY - rect.top;
        if (newHeight < 200) newHeight = 200; // Min height
        setTextAreaPanelHeight(newHeight);
    };
    const handleVMouseUp = () => {
        if (isVResizing) {
            setIsVResizing(false);
            if (textAreaPanelHeight !== null) {
                localStorage.setItem('translation_text_area_height', textAreaPanelHeight.toString());
            }
        }
    };

    if (isVResizing) {
        window.addEventListener('mousemove', handleVMouseMove);
        window.addEventListener('mouseup', handleVMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleVMouseMove);
        window.removeEventListener('mouseup', handleVMouseUp);
    }
  }, [isVResizing, textAreaPanelHeight]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        if (newWidth > 20 && newWidth < 80) {
            setLeftPanelWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleScroll = useCallback((scroller: HTMLTextAreaElement, target: HTMLTextAreaElement | null) => {
    if (!target || isSyncing.current) return;

    isSyncing.current = true;
    
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const scrollRatio = scrollHeight - clientHeight > 0 ? scrollTop / (scrollHeight - clientHeight) : 0;
    
    target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);

    requestAnimationFrame(() => {
        isSyncing.current = false;
    });
  }, []);


  const handleTranslate = useCallback(() => {
    if (!inputText.trim() || isLoading) return;

    if (!activeApiKey) {
        setError('Vui lòng thiết lập một API Key hợp lệ trong phần Cài đặt.');
        onOpenApiSettings(true);
        return;
    }

    setIsLoading(true);
    setError(null);
    setTranslatedText('');

    const terminology = { keywords, properNouns };
    translateText(inputText, sourceLang, targetLang, activeApiKey, model, safetySettings, terminology, rules)
        .then(result => {
            setTranslatedText(result);
            onAddTranslationHistory({ inputText, translatedText: result, sourceLang, targetLang });
            onShowNotification({ type: 'success', message: 'Dịch thành công!' });
        })
        .catch(err => {
            const errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            setError(errorMessage);
            onShowNotification({ type: 'error', message: `Lỗi: ${errorMessage}` });
        })
        .finally(() => {
            setIsLoading(false);
        });
  }, [inputText, sourceLang, targetLang, activeApiKey, model, onOpenApiSettings, onAddTranslationHistory, safetySettings, keywords, properNouns, rules, isLoading, onShowNotification]);

  const handleSwitchLanguages = () => {
    if (sourceLang === 'auto') return;
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);
  };

  return (
     <div className="max-w-7xl mx-auto h-full flex flex-col">
        <header className="text-center mb-4 flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                Bắt đầu Dịch
            </h1>
            <p className="mt-2 text-gray-400">
                Công cụ dịch thuật chuyên dụng cho visual novel và game.
            </p>
        </header>

        <main className="flex-grow flex flex-col min-h-0">
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6 flex-shrink-0" role="alert">
                <strong className="font-bold">Lỗi: </strong>
                <span className="block sm:inline">{error}</span>
                </div>
            )}
             <div className="flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                    <ToggleSwitch 
                        enabled={isAutoSpacingEnabled} 
                        onChange={onAutoSpacingChange} 
                    />
                    <label className="text-xs text-gray-400 cursor-pointer" onClick={onAutoSpacingChange}>
                        Tự động cách dòng
                    </label>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6">
                    <div className="w-full md:w-auto md:flex-1">
                    <LanguageSelector label="Dịch từ" value={sourceLang} onChange={setSourceLang} options={SOURCE_LANGUAGES_WITH_AUTO} />
                    </div>
                    <button onClick={handleSwitchLanguages} disabled={sourceLang === 'auto'} className="p-2 mt-4 md:mt-6 rounded-full bg-gray-700 hover:bg-[var(--primary-600)] text-white transition-all duration-200 ease-in-out transform hover:rotate-180 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none" title="Đảo ngược ngôn ngữ">
                    <SwitchIcon className="w-6 h-6" />
                    </button>
                    <div className="w-full md:w-auto md:flex-1">
                    <LanguageSelector label="Sang" value={targetLang} onChange={setTargetLang} options={SUPPORTED_LANGUAGES} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-shrink-0">
                {/* Terminology Panel */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl self-start">
                    <button
                        onClick={() => setIsTerminologyManagerOpen(!isTerminologyManagerOpen)}
                        className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-200 hover:bg-gray-700/20 rounded-t-xl"
                        aria-expanded={isTerminologyManagerOpen}
                    >
                        <div className="flex items-center gap-2"><BookOpenIcon className="w-5 h-5" /> Quản lý Thuật ngữ</div>
                        <ChevronRightIcon className={`w-5 h-5 transition-transform ${isTerminologyManagerOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isTerminologyManagerOpen && (
                        <div className="p-4 border-t border-gray-700/50">
                            <TerminologyManager
                                keywords={keywords}
                                setKeywords={setKeywords}
                                properNouns={properNouns}
                                setProperNouns={setProperNouns}
                            />
                        </div>
                    )}
                </div>

                {/* Rules Panel */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl self-start">
                    <button
                        onClick={() => setIsRulesManagerOpen(!isRulesManagerOpen)}
                        className="w-full flex justify-between items-center p-4 text-left font-semibold text-gray-200 hover:bg-gray-700/20 rounded-t-xl"
                        aria-expanded={isRulesManagerOpen}
                    >
                        <div className="flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5" /> Luật lệ Ngữ cảnh</div>
                        <ChevronRightIcon className={`w-5 h-5 transition-transform ${isRulesManagerOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isRulesManagerOpen && (
                        <div className="p-4 border-t border-gray-700/50">
                            <RulesManager rules={rules} setRules={setRules} />
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={textAreaContainerRef}
                className={`min-h-0 relative ${!textAreaPanelHeight ? 'flex-grow' : ''}`}
                style={{ height: textAreaPanelHeight ? `${textAreaPanelHeight}px` : undefined }}
            >
                <div className="absolute inset-0 hidden lg:flex" ref={containerRef}>
                    <div style={{ width: `calc(${leftPanelWidth}% - 4px)` }}>
                        <TextAreaPanel ref={inputRef} onScroll={(e) => handleScroll(e.currentTarget, outputRef.current)} onPaste={handlePaste} id="input-text" label={SOURCE_LANGUAGES_WITH_AUTO.find(l => l.code === sourceLang)?.name || 'Văn bản gốc'} value={inputText} onChange={setInputText} placeholder="Nhập văn bản game cần dịch ở đây..." isReadOnly={false} charCount={inputText.length} />
                    </div>
                    <div onMouseDown={handleMouseDown} className="w-2 cursor-col-resize bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors mx-1"></div>
                    <div style={{ width: `calc(${100 - leftPanelWidth}% - 4px)` }} className="relative">
                        <TextAreaPanel ref={outputRef} onScroll={(e) => handleScroll(e.currentTarget, inputRef.current)} id="translated-text" label={SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Bản dịch'} value={translatedText} placeholder="Bản dịch sẽ xuất hiện ở đây..." isReadOnly={true} charCount={translatedText.length} />
                        {isLoading && (
                            <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center rounded-xl">
                                <div className="flex flex-col items-center gap-4">
                                    <svg className="animate-spin h-8 w-8 text-[var(--primary-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-gray-300">Đang dịch...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute inset-0 grid grid-cols-1 lg:hidden gap-6">
                    <TextAreaPanel ref={mobileInputRef} onScroll={(e) => handleScroll(e.currentTarget, mobileOutputRef.current)} onPaste={handlePaste} id="input-text-mobile" label={SOURCE_LANGUAGES_WITH_AUTO.find(l => l.code === sourceLang)?.name || 'Văn bản gốc'} value={inputText} onChange={setInputText} placeholder="Nhập văn bản game cần dịch ở đây..." isReadOnly={false} charCount={inputText.length} />
                    <div className="relative">
                    <TextAreaPanel ref={mobileOutputRef} onScroll={(e) => handleScroll(e.currentTarget, mobileInputRef.current)} id="translated-text-mobile" label={SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Bản dịch'} value={translatedText} placeholder="Bản dịch sẽ xuất hiện ở đây..." isReadOnly={true} charCount={translatedText.length} />
                    {isLoading && (
                        <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center gap-4">
                                <svg className="animate-spin h-8 w-8 text-[var(--primary-400)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-gray-300">Đang dịch...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div onMouseDown={handleVMouseDown} className="h-2 cursor-row-resize bg-gray-700/50 hover:bg-[var(--primary-600)] rounded-md transition-colors my-1 flex-shrink-0"></div>

            <div className="mt-6 flex justify-center flex-shrink-0">
                <button onClick={handleTranslate} disabled={isLoading || !inputText.trim()} className="inline-flex items-center gap-2 justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[var(--primary-500)] transition-all">
                {isLoading ? ( <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Đang xử lý...</>
                ) : ( <> <TranslateIcon className="w-5 h-5" /> Dịch </> )}
                </button>
            </div>
        </main>
    </div>
  );
};


const App: React.FC = () => {
  type Page = 'start' | 'settings' | 'analyzer' | 'history' | 'safetySettings';
  const [currentPage, setCurrentPage] = useState<Page>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [theme, setTheme] = useState('purple');
  const [model, setModel] = useState('gemini-2.5-flash');

  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [buttonY, setButtonY] = useState('50%');
  const resizerRef = useRef<HTMLDivElement>(null);


  // Translator state
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('vi');
  const [isAutoSpacingEnabled, setIsAutoSpacingEnabled] = useState(true);

  // History state
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyFolders, setHistoryFolders] = useState<HistoryFolder[]>([]);

  // Terminology and Rules state
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [properNouns, setProperNouns] = useState<ProperNoun[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  // Script analyzer state
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Safety Settings state
    const [safetySettings, setSafetySettings] = useState<CustomSafetySettings>(() => {
        const thresholds = {} as { [key in HarmCategory]: HarmBlockThreshold };
        for (const category of Object.values(HarmCategory) as HarmCategory[]) {
            thresholds[category] = HarmBlockThreshold.BLOCK_NONE;
        }
        return {
            enabled: false,
            thresholds: thresholds,
        };
    });


  const updateActiveKey = useCallback(() => {
      try {
          const keysData = localStorage.getItem('gemini_api_keys_list');
          if (keysData) {
              const keys = JSON.parse(keysData);
              const validKey = keys.find((k: any) => k.status === 'valid' && k.value);
              setActiveApiKey(validKey ? validKey.value : null);
          } else {
              setActiveApiKey(null);
          }
      } catch (e) {
          console.error("Failed to parse API keys from storage", e);
          setActiveApiKey(null);
      }
  }, []);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = crypto.randomUUID();
        setNotifications(prev => [...prev, { ...notification, id }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);
  
  // Load initial data from localStorage
  useEffect(() => {
    updateActiveKey();
    const savedTheme = localStorage.getItem('app-theme') || 'purple';
    setTheme(savedTheme);
    const savedModel = localStorage.getItem('gemini-model') || 'gemini-2.5-flash';
    setModel(savedModel);
    const savedInputText = localStorage.getItem('translation_input_text') || '';
    setInputText(savedInputText);
    const savedSidebarWidth = localStorage.getItem('sidebar_width');
    if (savedSidebarWidth) {
      setSidebarWidth(Number(savedSidebarWidth));
    }
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed) {
        setIsSidebarCollapsed(JSON.parse(savedCollapsed));
    }
    const savedAutoSpacing = localStorage.getItem('auto_spacing_enabled');
    if (savedAutoSpacing !== null) {
        setIsAutoSpacingEnabled(JSON.parse(savedAutoSpacing));
    }

    try {
        const savedTranslationHistory = localStorage.getItem('translation_history');
        if (savedTranslationHistory) setTranslationHistory(JSON.parse(savedTranslationHistory));

        const savedAnalysisHistory = localStorage.getItem('analysis_history');
        if (savedAnalysisHistory) setAnalysisHistory(JSON.parse(savedAnalysisHistory));
        
        const savedHistoryFolders = localStorage.getItem('history_folders');
        if (savedHistoryFolders) {
            // Backward compatibility for folders without parentId
            const parsedFolders = JSON.parse(savedHistoryFolders);
            setHistoryFolders(parsedFolders.map((f: any) => ({ ...f, parentId: f.parentId || null })));
        }
        
        const savedKeywords = localStorage.getItem('terminology_keywords');
        if (savedKeywords) {
            const parsed = JSON.parse(savedKeywords) as (Omit<Keyword, 'enabled'> & { enabled?: boolean })[];
            setKeywords(parsed.map(k => ({ ...k, enabled: k.enabled !== false })));
        }
        
        const savedProperNouns = localStorage.getItem('terminology_proper_nouns');
        if (savedProperNouns) {
            const parsed = JSON.parse(savedProperNouns) as (Omit<ProperNoun, 'enabled'> & { enabled?: boolean })[];
            setProperNouns(parsed.map(p => ({ ...p, enabled: p.enabled !== false })));
        }

        const savedRules = localStorage.getItem('translation_rules');
        if (savedRules) {
            const parsed = JSON.parse(savedRules) as (Omit<Rule, 'enabled'> & { enabled?: boolean })[];
            setRules(parsed.map(r => ({ ...r, enabled: r.enabled !== false })));
        }

        const savedSafetySettings = localStorage.getItem('safety_settings');
        if (savedSafetySettings) {
            const parsedSettings = JSON.parse(savedSafetySettings);
            if (parsedSettings && typeof parsedSettings === 'object') {
                setSafetySettings(prevSettings => ({
                    ...prevSettings,
                    ...parsedSettings,
                    thresholds: {
                        ...prevSettings.thresholds,
                        ...(parsedSettings.thresholds || {}),
                    },
                }));
            }
        }

    } catch (e) {
        console.error("Failed to load data from storage", e);
    }
  }, [updateActiveKey]);

  // Apply theme
  useEffect(() => {
    const activeTheme = themes[theme as keyof typeof themes];
    if (activeTheme) {
        for (const [key, value] of Object.entries(activeTheme)) {
            document.documentElement.style.setProperty(key, value);
        }
        localStorage.setItem('app-theme', theme);
    }
  }, [theme]);

  // Save data to localStorage
  useEffect(() => {
      localStorage.setItem('translation_history', JSON.stringify(translationHistory));
  }, [translationHistory]);

  useEffect(() => {
      localStorage.setItem('analysis_history', JSON.stringify(analysisHistory));
  }, [analysisHistory]);
  
  useEffect(() => {
      localStorage.setItem('history_folders', JSON.stringify(historyFolders));
  }, [historyFolders]);
  
  useEffect(() => {
      localStorage.setItem('terminology_keywords', JSON.stringify(keywords));
  }, [keywords]);
  
  useEffect(() => {
      localStorage.setItem('terminology_proper_nouns', JSON.stringify(properNouns));
  }, [properNouns]);

  useEffect(() => {
      localStorage.setItem('translation_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
      localStorage.setItem('safety_settings', JSON.stringify(safetySettings));
  }, [safetySettings]);

  useEffect(() => {
      localStorage.setItem('auto_spacing_enabled', JSON.stringify(isAutoSpacingEnabled));
  }, [isAutoSpacingEnabled]);

  
  const handleNavigate = (page: Page) => {
      setCurrentPage(page);
  }

  const handleSetModel = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem('gemini-model', newModel);
  };

  // History handlers
  const addTranslationHistory = useCallback((item: Omit<TranslationHistoryItem, 'id' | 'timestamp' | 'folderId'>) => {
      const newItem: TranslationHistoryItem = { 
          ...item, 
          id: crypto.randomUUID(), 
          timestamp: Date.now(), 
          folderId: null,
          name: 'Đang tạo tên...' // Placeholder name
      };
      setTranslationHistory(prev => [newItem, ...prev].slice(0, 100));

      if (activeApiKey) {
          generateTitleForTranslation(item.inputText, item.translatedText, activeApiKey)
              .then(title => {
                  setTranslationHistory(prev => 
                      prev.map(historyItem => 
                          historyItem.id === newItem.id ? { ...historyItem, name: title } : historyItem
                      )
                  );
              })
              .catch(err => {
                  console.error("Failed to generate title:", err);
                  // Optionally update the name to indicate failure
                  setTranslationHistory(prev => 
                      prev.map(historyItem => 
                          historyItem.id === newItem.id ? { ...historyItem, name: 'Lỗi tạo tên' } : historyItem
                      )
                  );
              });
      } else {
           setTranslationHistory(prev => 
              prev.map(historyItem => 
                  historyItem.id === newItem.id ? { ...historyItem, name: 'Cần API Key để tạo tên' } : historyItem
              )
          );
      }
  }, [activeApiKey]);

  const addAnalysisHistory = (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp' | 'folderId'>) => {
      const newItem: AnalysisHistoryItem = { ...item, id: crypto.randomUUID(), timestamp: Date.now(), folderId: null };
      setAnalysisHistory(prev => [newItem, ...prev].slice(0, 100));
  };
  
  const handleRenameTranslationItem = useCallback((id: string, newName: string) => {
    setTranslationHistory(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
  }, []);
  
  const handleRenameAnalysisItem = useCallback((id: string, newName: string) => {
    setAnalysisHistory(prev => prev.map(item => item.id === id ? { ...item, fileName: newName } : item));
  }, []);
  
  const handleDeleteTranslationItems = useCallback((ids: string[]) => {
      setTranslationHistory(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const handleDeleteAnalysisItems = useCallback((ids: string[]) => {
      setAnalysisHistory(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const handleHistoryFolderAction = {
    add: (name: string, type: 'translation' | 'analysis', parentId: string | null = null): HistoryFolder | undefined => {
        if (!name.trim() || historyFolders.some(f => f.name === name.trim() && f.type === type && f.parentId === parentId)) return;
        const newFolder: HistoryFolder = { id: crypto.randomUUID(), name: name.trim(), type, parentId };
        setHistoryFolders(prev => [...prev, newFolder]);
        return newFolder;
    },
    rename: (id: string, newName: string) => {
        if (!newName.trim()) return;
        setHistoryFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    },
    delete: (id: string) => {
        const foldersToDeleteIds: string[] = [];
        const findDescendants = (folderId: string) => {
            foldersToDeleteIds.push(folderId);
            const children = historyFolders.filter(f => f.parentId === folderId);
            children.forEach(child => findDescendants(child.id));
        };
        findDescendants(id);

        setHistoryFolders(prev => prev.filter(f => !foldersToDeleteIds.includes(f.id)));
        
        // Un-assign items from all deleted folders
        setTranslationHistory(prev => prev.map(item => foldersToDeleteIds.includes(item.folderId || '') ? { ...item, folderId: null } : item));
        setAnalysisHistory(prev => prev.map(item => foldersToDeleteIds.includes(item.folderId || '') ? { ...item, folderId: null } : item));
    },
    moveTranslations: (itemIds: string[], folderId: string | null) => {
        setTranslationHistory(prev => prev.map(item => itemIds.includes(item.id) ? { ...item, folderId } : item));
    },
    moveAnalyses: (itemIds: string[], folderId: string | null) => {
        setAnalysisHistory(prev => prev.map(item => itemIds.includes(item.id) ? { ...item, folderId } : item));
    }
  };

  // Sidebar resizing logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
  }, []);
  
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
      if (resizerRef.current) {
        const rect = resizerRef.current.parentElement!.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const clampedY = Math.max(40, Math.min(y, rect.height - 40));
        setButtonY(`${clampedY}px`);
      }
  }, []);

  const handleResizerMouseEnter = useCallback(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
  }, [handleGlobalMouseMove]);
  
  const handleResizerMouseLeave = useCallback(() => {
    if (!isResizing) {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      setButtonY('50%');
    }
  }, [isResizing, handleGlobalMouseMove]);


  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          let newWidth = e.clientX;
          if (newWidth < 200) newWidth = 200; // min width
          if (newWidth > 500) newWidth = 500; // max width
          setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
          if (isResizing) {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            localStorage.setItem('sidebar_width', String(sidebarWidth));
          }
      };
      
      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
  }, [isResizing, sidebarWidth, handleGlobalMouseMove]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
        const newState = !prev;
        localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
        // When expanding, if sidebar is too small, reset it to a sensible default.
        if (!newState && sidebarWidth < 200) {
            const newWidth = 256;
            setSidebarWidth(newWidth);
            localStorage.setItem('sidebar_width', String(newWidth));
        }
        return newState;
    });
  };


  const renderPage = () => {
    switch (currentPage) {
        case 'start':
            return <TranslationPage 
                activeApiKey={activeApiKey} 
                onOpenApiSettings={() => setIsSettingsOpen(true)}
                inputText={inputText}
                setInputText={setInputText}
                translatedText={translatedText}
                setTranslatedText={setTranslatedText}
                sourceLang={sourceLang}
                setSourceLang={setSourceLang}
                targetLang={targetLang}
                setTargetLang={setTargetLang}
                onAddTranslationHistory={addTranslationHistory}
                model={model}
                safetySettings={safetySettings}
                keywords={keywords}
                setKeywords={setKeywords}
                properNouns={properNouns}
                setProperNouns={setProperNouns}
                rules={rules}
                setRules={setRules}
                isAutoSpacingEnabled={isAutoSpacingEnabled}
                onAutoSpacingChange={() => setIsAutoSpacingEnabled(prev => !prev)}
                onShowNotification={addNotification}
            />;
        case 'analyzer':
            return <ScriptAnalyzerPage 
                activeApiKey={activeApiKey} 
                onOpenApiSettings={() => setIsSettingsOpen(true)}
                onAddAnalysisHistory={addAnalysisHistory}
                safetySettings={safetySettings}
                onShowNotification={addNotification}
                processingFiles={processingFiles}
                setProcessingFiles={setProcessingFiles}
            />;
        case 'history':
            return <HistoryPage
                translationHistory={translationHistory}
                analysisHistory={analysisHistory}
                folders={historyFolders}
                onFolderAction={handleHistoryFolderAction}
                onRenameTranslationItem={handleRenameTranslationItem}
                onRenameAnalysisItem={handleRenameAnalysisItem}
                onDeleteTranslationItems={handleDeleteTranslationItems}
                onDeleteAnalysisItems={handleDeleteAnalysisItems}
            />;
        case 'settings':
            return <SettingsPage 
                currentTheme={theme} 
                setTheme={setTheme} 
            />;
        case 'safetySettings':
            return <SafetySettingsPage
                settings={safetySettings}
                onSettingsChange={setSafetySettings}
            />;
        default:
            return null;
    }
  }

  return (
    <div className="flex min-h-screen">
      <SideNav 
        style={{ width: `${isSidebarCollapsed ? 0 : sidebarWidth}px`, transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        onOpenApiSettings={() => setIsSettingsOpen(true)}
        isCollapsed={isSidebarCollapsed}
      />
      <div
        ref={resizerRef}
        className="relative flex-shrink-0 cursor-col-resize group px-2"
        onMouseDown={handleMouseDown}
        onMouseEnter={handleResizerMouseEnter}
        onMouseLeave={handleResizerMouseLeave}
      >
        <div className={`w-1.5 h-full transition-colors ${isResizing ? 'bg-[var(--primary-600)]' : 'bg-gray-700/20 group-hover:bg-[var(--primary-600)]'}`} />
        <button
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Hiện menu' : 'Ẩn menu'}
            className="absolute -translate-y-1/2 left-1/2 -translate-x-1/2 z-20 w-6 h-10 bg-gray-800 hover:bg-[var(--primary-600)] text-white flex items-center justify-center rounded-md cursor-pointer border-2 border-gray-700 hover:border-[var(--primary-500)] transition-all"
            style={{ top: buttonY, transition: 'top 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
            <ChevronRightIcon className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderPage()}
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onKeysUpdated={updateActiveKey}
        model={model}
        onModelChange={handleSetModel}
       />
       <NotificationContainer 
        notifications={notifications}
        onDismiss={removeNotification}
       />
    </div>
  );
};

export default App;