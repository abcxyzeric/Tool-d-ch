// This file implements a "Lexical Obfuscation" technique.
// The goal is to slightly alter the input text to bypass naive, keyword-based
// safety filters, while remaining easily reversible by the advanced AI model.
// It works by replacing common Latin characters with visually similar characters
// from other alphabets (e.g., Greek, Cyrillic).

const substitutionMap: { [key: string]: string } = {
  // Vowels
  'a': 'а', // Cyrillic Small Letter A
  'e': 'е', // Cyrillic Small Letter E
  'o': 'ο', // Greek Small Letter Omicron
  'i': 'і', // Cyrillic Small Letter Dotted I
  'u': 'у', // Cyrillic Small Letter U
  
  // Consonants
  'c': 'с', // Cyrillic Small Letter Es
  'p': 'р', // Cyrillic Small Letter Er
  's': 'ѕ', // Macedonian Small Letter Dze
  'x': 'х', // Cyrillic Small Letter Ha
  'd': 'ԁ', // Cyrillic Small Letter Komi De
  'l': 'ӏ', // Cyrillic Small Letter Palochka
  'r': 'г', // Cyrillic Small Letter Ghe

  // Capitals (less common but good to have)
  'A': 'А', // Cyrillic Capital Letter A
  'B': 'В', // Cyrillic Capital Letter Ve
  'E': 'Е', // Cyrillic Capital Letter E
  'H': 'Н', // Cyrillic Capital Letter En
  'I': 'І', // Cyrillic Capital Letter Dotted I
  'K': 'К', // Cyrillic Capital Letter Ka
  'M': 'М', // Cyrillic Capital Letter Em
  'O': 'О', // Cyrillic Capital Letter O
  'P': 'Р', // Cyrillic Capital Letter Er
  'S': 'Ѕ', // Macedonian Capital Letter Dze
  'T': 'Т', // Cyrillic Capital Letter Te
  'X': 'Х', // Cyrillic Capital Letter Ha
  'Y': 'Ү', // Cyrillic Capital Letter Ue
  'D': 'Ꭰ', // Cherokee Letter Da
  'L': 'Ⅼ', // Roman Numeral Fifty
  'U': 'У', // Cyrillic Capital Letter U
  'R': 'Г', // Cyrillic Capital Letter Ghe
};

/**
 * Obfuscates a string by replacing common Latin characters with visually
 * similar characters from other alphabets.
 * @param text The input string to obfuscate.
 * @returns The obfuscated string.
 */
export function obfuscateText(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Always substitute the character if it exists in the map.
    if (substitutionMap[char]) {
      result += substitutionMap[char];
    } else {
      result += char;
    }
  }
  return result;
}