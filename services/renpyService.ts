
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import type { RenpyEntry, Keyword, ProperNoun, Rule } from '../types';
import type { CustomSafetySettings } from './geminiService';

// Cấu hình an toàn (Tương tự geminiService nhưng có thể tùy biến nếu cần)
const buildSafetySettings = (settings: CustomSafetySettings) => {
    if (!settings.enabled) {
        return [
            HarmCategory.HARM_CATEGORY_HARASSMENT,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        ].map(category => ({
            category,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }));
    }
    return [
        HarmCategory.HARM_CATEGORY_HARASSMENT,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    ].map(category => ({
        category,
        threshold: settings.thresholds[category] || HarmBlockThreshold.BLOCK_NONE,
    }));
};

/**
 * 1. Hàm parseRenpyScript
 * Mục đích: Đọc nội dung file .rpy và tách lấy các dòng thoại.
 * Sử dụng Regex để tìm các mẫu hội thoại và lựa chọn, bỏ qua code.
 */
export function parseRenpyScript(content: string): RenpyEntry[] {
    const lines = content.split('\n');
    const entries: RenpyEntry[] = [];
    
    // Regex cho hội thoại: 
    // Group 1 (Optional): Speaker (vd: e, sylvie)
    // Group 2: Nội dung trong ngoặc kép
    // Ví dụ: e "Hello"  hoặc  "Hello world"
    const dialogueRegex = /^(\s*)(?:([a-zA-Z0-9_]+)\s+)?(["'])(.*?)(\3)$/;
    
    // Regex cho Menu Choice:
    // Ví dụ: "Yes, I will go." :
    const choiceRegex = /^(\s*)(["'])(.*?)(\2)\s*:$/;

    // Regex cho chuỗi cần dịch đặc biệt (vd: _("String")) - Tạm thời chưa ưu tiên, tập trung hội thoại
    
    let lastContext = '';

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const originalLineIndex = index; // Sử dụng số dòng (0-based) làm ID

        // Bỏ qua dòng comment (trừ khi nó là comment chỉ dẫn ngữ cảnh ta muốn lấy - ở đây lấy đơn giản)
        if (trimmedLine.startsWith('#')) {
            lastContext = trimmedLine.substring(1).trim();
            return;
        }

        // Bỏ qua dòng trống
        if (!trimmedLine) return;

        // 1. Kiểm tra Choice trước (vì nó thường kết thúc bằng :)
        const choiceMatch = line.match(choiceRegex);
        if (choiceMatch) {
            entries.push({
                id: originalLineIndex,
                speaker: 'Player', // Choice thường là của người chơi
                originalText: choiceMatch[3], // Nội dung bên trong ngoặc kép
                translatedText: '',
                type: 'choice',
                context: lastContext,
                status: 'pending'
            });
            lastContext = ''; // Reset context sau khi dùng
            return;
        }

        // 2. Kiểm tra Dialogue
        // Cần loại trừ các dòng code Renpy bắt đầu bằng $, default, define, v.v. nếu regex quá lỏng
        // Tuy nhiên regex trên yêu cầu bắt đầu bằng khoảng trắng hoặc speaker và ngay sau đó là quote
        const dialogueMatch = line.match(dialogueRegex);
        if (dialogueMatch) {
            // Kiểm tra xem có phải là keywords của python/renpy không để tránh false positive
            const potentialSpeaker = dialogueMatch[2];
            const contentText = dialogueMatch[4];
            
            // Một số từ khóa code dễ bị nhầm là speaker
            const ignoreKeywords = ['image', 'scene', 'show', 'play', 'stop', 'define', 'default', 'return', 'jump', 'call', 'label', 'if', 'else', 'elif', 'while', '$'];
            
            if (potentialSpeaker && ignoreKeywords.includes(potentialSpeaker)) {
                return; 
            }

            entries.push({
                id: originalLineIndex,
                speaker: potentialSpeaker || '', // Nếu không có speaker thì là narration
                originalText: contentText,
                translatedText: '',
                type: 'dialogue',
                context: lastContext,
                status: 'pending'
            });
            lastContext = '';
        }
    });

    return entries;
}

/**
 * 2. Hàm generateRenpySystemInstruction
 * Mục đích: Tạo ra câu lệnh "thần chú" (System Prompt) chuyên biệt cho Visual Novel.
 */
export function generateRenpySystemInstruction(
    role: string = "Bạn là dịch giả game Ren'Py chuyên nghiệp.",
    terminology: { keywords: Keyword[], properNouns: ProperNoun[] }
): string {
    const activeKeywords = terminology.keywords.filter(k => k.enabled).map(k => `"${k.value}"`).join(', ');
    const activeProperNouns = terminology.properNouns.filter(p => p.enabled).map(p => `"${p.source}" -> "${p.translation}"`).join(', ');

    return `
${role}
Nhiệm vụ của bạn là dịch kịch bản Visual Novel sang tiếng Việt một cách tự nhiên, giàu cảm xúc, văn phong Light Novel.

--- QUY TẮC BẮT BUỘC (HARD RULES) ---
1. **Định dạng Ren'Py**: 
   - Giữ nguyên TUYỆT ĐỐI các biến trong ngoặc vuông, ví dụ: [player_name], [score].
   - Giữ nguyên các tag định dạng trong ngoặc nhọn, ví dụ: {i}, {/i}, {size=+10}, {w}.
   - Giữ nguyên các ký tự điều khiển như \\n (xuống dòng), \\" (ngoặc kép escaped).
2. **Không dịch tên file/code**: Nếu trong văn bản có tên file ảnh, âm thanh hoặc lệnh code, hãy giữ nguyên.
3. **Xưng hô**: Dựa vào tên nhân vật (Speaker) được cung cấp ở đầu mỗi dòng (dạng [Speaker]: Text) để chọn ngôi xưng hô phù hợp (Anh-Em, Tớ-Cậu, Hắn-Ta, Tôi-Ông...).
4. **Văn phong**: Tránh dịch máy móc (word-for-word). Hãy sắp xếp lại câu từ cho mượt mà trong tiếng Việt.

--- THUẬT NGỮ & TÊN RIÊNG ---
${activeKeywords ? `- KHÔNG DỊCH các từ sau: ${activeKeywords}` : ''}
${activeProperNouns ? `- DỊCH ĐÚNG các tên riêng sau: ${activeProperNouns}` : ''}

--- ĐỊNH DẠNG ĐẦU VÀO/ĐẦU RA ---
Dữ liệu sẽ được gửi theo định dạng:
[SpeakerName]: Original Text
#####
[SpeakerName]: Original Text 2

Bạn phải trả về đúng định dạng tương ứng:
[SpeakerName]: Translated Text
#####
[SpeakerName]: Translated Text 2
`;
}

/**
 * 3. Hàm reconstructRenpyScript
 * Mục đích: Tạo file translation theo format chuẩn của Ren'Py (old/new).
 * Cách 2: File TL (Translation Language).
 */
export function reconstructRenpyScript(originalContent: string, translatedEntries: RenpyEntry[]): string {
    let output = `# Translation file generated by AI Tool\n\n`;
    
    // Gom nhóm entries để xử lý nếu cần, nhưng format old/new khá độc lập
    translatedEntries.forEach(entry => {
        if (entry.status === 'done' && entry.translatedText.trim() !== '') {
            // Escape double quotes trong text để tránh lỗi cú pháp Renpy
            const oldTextEscaped = entry.originalText.replace(/"/g, '\\"');
            const newTextEscaped = entry.translatedText.replace(/"/g, '\\"');

            output += `# Line ${entry.id + 1}\n`;
            if (entry.context) {
                output += `# Context: ${entry.context}\n`;
            }
            output += `old "${oldTextEscaped}"\n`;
            output += `new "${newTextEscaped}"\n\n`;
        }
    });

    return output;
}

/**
 * 4. Hàm batchTranslateRenpy
 * Mục đích: Gom nhóm các dòng thoại để tiết kiệm token và giữ ngữ cảnh liền mạch.
 */
export async function batchTranslateRenpy(
    entries: RenpyEntry[],
    apiKey: string,
    model: string,
    safetySettings: CustomSafetySettings,
    terminology: { keywords: Keyword[], properNouns: ProperNoun[] },
    rules: Rule[]
): Promise<{ id: number; text: string }[]> {
    if (!apiKey) throw new Error("API Key không hợp lệ");
    
    const ai = new GoogleGenAI({ apiKey });
    const safetyConfig = buildSafetySettings(safetySettings);
    
    // 1. Chuẩn bị prompt system
    const systemInstruction = generateRenpySystemInstruction(
        "Bạn là một dịch giả Visual Novel tài năng, chuyên dịch game Ren'Py sang tiếng Việt.",
        terminology
    );

    // 2. Thêm luật lệ bổ sung (Contextual Rules)
    const activeRules = rules.filter(r => r.enabled).map(r => `- ${r.text}`).join('\n');
    const finalSystemInstruction = activeRules 
        ? `${systemInstruction}\n\n--- LUẬT BỔ SUNG TỪ NGƯỜI DÙNG ---\n${activeRules}`
        : systemInstruction;

    // 3. Chuẩn bị dữ liệu đầu vào (Gom nhóm)
    const DELIMITER = '#####';
    // Format: [Speaker]: Text
    const promptText = entries.map(e => {
        const speakerTag = e.speaker ? `[${e.speaker}]` : '[Narrator]';
        return `${speakerTag}: ${e.originalText}`;
    }).join(`\n${DELIMITER}\n`);

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: promptText,
            config: {
                systemInstruction: finalSystemInstruction,
                temperature: 0.7, // Hơi sáng tạo một chút cho văn học
                safetySettings: safetyConfig,
            },
        });

        const responseText = response.text;
        if (!responseText) throw new Error("AI không trả về kết quả.");

        // 4. Tách phản hồi
        const segments = responseText.split(new RegExp(`\\s*${DELIMITER}\\s*`));
        
        const results: { id: number; text: string }[] = [];

        entries.forEach((entry, index) => {
            if (index < segments.length) {
                let translatedSegment = segments[index].trim();
                
                // Loại bỏ Speaker Tag ở đầu ra (vì ta chỉ cần text dịch)
                // Regex tìm: [Speaker]: Nội dung
                const match = translatedSegment.match(/^\[.*?\]:\s*(.*)$/s);
                if (match) {
                    translatedSegment = match[1];
                }

                results.push({
                    id: entry.id,
                    text: translatedSegment
                });
            }
        });

        return results;

    } catch (error) {
        console.error("Renpy Batch Translate Error:", error);
        throw error;
    }
}
