
import type { Language } from './types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'ja', name: 'Tiếng Nhật' },
  { code: 'en', name: 'Tiếng Anh' },
  { code: 'zh-CN', name: 'Tiếng Trung (Giản thể)' },
  { code: 'ko', name: 'Tiếng Hàn' },
  { code: 'vi', name: 'Tiếng Việt' },
];

export const SOURCE_LANGUAGES_WITH_AUTO: Language[] = [
    { code: 'auto', name: 'Tự động phát hiện' },
    ...SUPPORTED_LANGUAGES,
];
