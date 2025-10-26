#!/usr/bin/env node
/**
 * Translation Validation Script
 *
 * Validates translation files by:
 * - Checking for missing keys compared to English (source)
 * - Detecting extra keys that don't exist in source
 * - Finding empty translation values
 * - Reporting coverage statistics
 *
 * Usage:
 *   npm run check-translations
 *   npm run check-translations -- --verbose
 *   npm run check-translations -- --lang=de
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSLATIONS_DIR = join(__dirname, '../src/lib/i18n/translations');
const SOURCE_LANG = 'en';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

interface ValidationResult {
  lang: string;
  namespace: string;
  missing: string[];
  extra: string[];
  empty: string[];
  total: number;
  translated: number;
}

/**
 * Recursively flatten nested object into dot-notation keys
 */
function flattenKeys(obj: TranslationObject, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    // codacy-disable-next-line
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      // codacy-disable-next-line
      result[fullKey] = String(value);
    }
  }

  return result;
}

/**
 * Sanitize path component to prevent path traversal
 */
function sanitizePathComponent(component: string): string {
  // Remove any path traversal attempts and keep only safe characters
  return component.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Load and parse a translation file
 */
function loadTranslation(lang: string, namespace: string): Record<string, string> | null {
  // Sanitize inputs to prevent path traversal
  const safeLang = sanitizePathComponent(lang);
  const safeNamespace = sanitizePathComponent(namespace);

  const filePath = join(TRANSLATIONS_DIR, safeLang, `${safeNamespace}.json`);

  // codacy-disable-next-line
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    // codacy-disable-next-line
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return flattenKeys(parsed);
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Get all available namespaces from source language
 */
function getNamespaces(): string[] {
  const sourcePath = join(TRANSLATIONS_DIR, SOURCE_LANG);

  if (!existsSync(sourcePath)) {
    throw new Error(`Source language directory not found: ${sourcePath}`);
  }

  return readdirSync(sourcePath)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

/**
 * Get all available languages
 */
function getLanguages(): string[] {
  if (!existsSync(TRANSLATIONS_DIR)) {
    throw new Error(`Translations directory not found: ${TRANSLATIONS_DIR}`);
  }

  return readdirSync(TRANSLATIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

/**
 * Validate a single language namespace against source
 */
function validateNamespace(lang: string, namespace: string): ValidationResult {
  const source = loadTranslation(SOURCE_LANG, namespace);
  const target = loadTranslation(lang, namespace);

  if (!source) {
    throw new Error(`Source translation not found: ${SOURCE_LANG}/${namespace}.json`);
  }

  const result: ValidationResult = {
    lang,
    namespace,
    missing: [],
    extra: [],
    empty: [],
    total: Object.keys(source).length,
    translated: 0,
  };

  if (!target) {
    // Entire namespace is missing
    // codacy-disable-next-line
    result.missing = Object.keys(source);
    return result;
  }

  const sourceKeys = new Set(Object.keys(source));
  const targetKeys = new Set(Object.keys(target));

  // Find missing keys
  for (const key of sourceKeys) {
    if (!targetKeys.has(key)) {
      result.missing.push(key);
    } else if (target[key].trim() === '') {
      result.empty.push(key);
    } else {
      result.translated++;
    }
  }

  // Find extra keys
  for (const key of targetKeys) {
    if (!sourceKeys.has(key)) {
      result.extra.push(key);
    }
  }

  return result;
}

/**
 * Format validation results
 */
function formatResults(results: ValidationResult[], verbose: boolean): string {
  let output = '';

  // Group by language
  const byLang = results.reduce((acc, r) => {
    if (!acc[r.lang]) acc[r.lang] = [];
    acc[r.lang].push(r);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  for (const [lang, langResults] of Object.entries(byLang)) {
    const totalKeys = langResults.reduce((sum, r) => sum + r.total, 0);
    const translatedKeys = langResults.reduce((sum, r) => sum + r.translated, 0);
    const missingKeys = langResults.reduce((sum, r) => sum + r.missing.length, 0);
    const emptyKeys = langResults.reduce((sum, r) => sum + r.empty.length, 0);
    const extraKeys = langResults.reduce((sum, r) => sum + r.extra.length, 0);
    const coverage = totalKeys > 0 ? ((translatedKeys / totalKeys) * 100).toFixed(1) : '0.0';

    output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `📝 Language: ${lang.toUpperCase()}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Coverage: ${coverage}% (${translatedKeys}/${totalKeys} keys)\n`;

    if (missingKeys > 0) {
      output += `❌ Missing: ${missingKeys} keys\n`;
    }
    if (emptyKeys > 0) {
      output += `⚠️  Empty: ${emptyKeys} keys\n`;
    }
    if (extraKeys > 0) {
      output += `🔍 Extra: ${extraKeys} keys\n`;
    }

    if (missingKeys === 0 && emptyKeys === 0 && extraKeys === 0) {
      output += `✅ All translations complete!\n`;
    }

    // Detailed breakdown by namespace
    if (verbose) {
      output += `\nNamespaces:\n`;
      for (const result of langResults) {
        const nsCoverage = result.total > 0
          ? ((result.translated / result.total) * 100).toFixed(1)
          : '0.0';

        output += `  ${result.namespace}: ${nsCoverage}% (${result.translated}/${result.total})`;

        if (result.missing.length > 0) {
          output += ` - Missing: ${result.missing.length}`;
        }
        if (result.empty.length > 0) {
          output += ` - Empty: ${result.empty.length}`;
        }
        if (result.extra.length > 0) {
          output += ` - Extra: ${result.extra.length}`;
        }

        output += '\n';

        // Show missing keys
        if (result.missing.length > 0 && result.missing.length <= 10) {
          output += `    Missing keys:\n`;
          for (const key of result.missing) {
            output += `      - ${key}\n`;
          }
        } else if (result.missing.length > 10) {
          output += `    Missing keys (first 10):\n`;
          for (const key of result.missing.slice(0, 10)) {
            output += `      - ${key}\n`;
          }
          output += `    ... and ${result.missing.length - 10} more\n`;
        }

        // Show empty keys
        if (result.empty.length > 0) {
          output += `    Empty values:\n`;
          for (const key of result.empty) {
            output += `      - ${key}\n`;
          }
        }

        // Show extra keys
        if (result.extra.length > 0) {
          output += `    Extra keys (not in source):\n`;
          for (const key of result.extra) {
            output += `      - ${key}\n`;
          }
        }
      }
    }
  }

  return output;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const langFilter = args.find(arg => arg.startsWith('--lang='))?.split('=')[1];

  console.log('🌍 Translation Validation Script\n');
  console.log(`Source language: ${SOURCE_LANG}`);
  console.log(`Translations directory: ${TRANSLATIONS_DIR}\n`);

  try {
    const namespaces = getNamespaces();
    const languages = getLanguages().filter(lang => lang !== SOURCE_LANG);

    if (languages.length === 0) {
      console.log('No translation languages found.');
      return;
    }

    console.log(`Found ${namespaces.length} namespaces: ${namespaces.join(', ')}`);
    console.log(`Found ${languages.length} languages: ${languages.join(', ')}\n`);

    const results: ValidationResult[] = [];

    for (const lang of languages) {
      if (langFilter && lang !== langFilter) {
        continue;
      }

      for (const namespace of namespaces) {
        const result = validateNamespace(lang, namespace);
        results.push(result);
      }
    }

    const output = formatResults(results, verbose);
    console.log(output);

    // Exit with error if there are missing translations
    const hasMissing = results.some(r => r.missing.length > 0 || r.empty.length > 0);
    if (hasMissing) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
