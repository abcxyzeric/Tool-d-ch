
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
  analysisResult: string;
  originalContent: string;
  timestamp: number;
  folderId?: string | null;
}

export interface HistoryFolder {
  id: string;
  name: string;
  type: 'translation' | 'analysis';
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