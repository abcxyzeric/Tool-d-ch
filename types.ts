
export interface Language {
  code: string;
  name: string;
}

export interface TranslationHistoryItem {
  id: string;
  name?: string;
  inputText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  folderId?: string | null;
}

export interface AnalysisHistoryItem {
  id: string;
  fileName: string;
  originalContent: string;
  analysisResult: string;
  timestamp: number;
  folderId?: string | null;
}

// Interface mới cho dữ liệu RPG Maker đã tách
export interface RpgMakerEntry {
  id: string; // ID duy nhất để định danh vị trí (VD: EventID_PageID_CmdIdx)
  originalText: string;
  translatedText: string;
  type: 'dialogue' | 'choice' | 'other';
  speaker?: string; // Tên nhân vật (nếu có)
  status: 'pending' | 'translating' | 'done' | 'error';
  context?: string; // Thông tin ngữ cảnh (Event Name, Map ID...)
}

export interface RpgMakerFile {
  id: string;
  fileName: string;
  entries: RpgMakerEntry[];
  status: 'loaded' | 'processing' | 'done';
}

// Interface mới cho dữ liệu Ren'Py
export interface RenpyEntry {
  id: string; // Line index or unique ID
  lineIndex: number; // Dòng thứ mấy trong file gốc
  originalText: string; // Nội dung trong ngoặc kép
  translatedText: string;
  type: 'dialogue' | 'narration' | 'choice' | 'string';
  speaker?: string; // Mã nhân vật (vd: 'e', 'g')
  status: 'pending' | 'translating' | 'done' | 'error';
  indentation: string; // Giữ nguyên khoảng trắng đầu dòng
  isQuoteBlock: boolean; // Có nằm trong block """...""" hay không (advanced)
  quoteChar: string; // Dấu ' hay "
}

export interface RenpyFile {
  id: string;
  fileName: string;
  rawLines: string[]; // Lưu toàn bộ nội dung file gốc theo dòng
  entries: RenpyEntry[]; // Chỉ lưu các dòng cần dịch
  status: 'loaded' | 'processing' | 'done';
}

export interface HistoryFolder {
  id: string;
  name: string;
  type: 'translation' | 'analysis' | 'rpg_data'; 
  parentId?: string | null;
}

export interface Keyword {
  id: string;
  value: string;
  enabled: boolean;
}

export interface ProperNoun {
  id: string;
  source: string;
  translation: string;
  enabled: boolean;
}

export interface Rule {
  id: string;
  text: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export interface ProcessingFile {
  id: string;
  name: string;
  status: 'loading' | 'success' | 'error';
  error?: string;
}