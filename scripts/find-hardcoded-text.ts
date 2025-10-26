#!/usr/bin/env node
/**
 * Hardcoded Text Finder
 *
 * Scans Svelte files for hardcoded English text that should be moved to translation files.
 * Helps identify strings that need internationalization.
 *
 * Usage:
 *   npm run find-hardcoded
 *   npm run find-hardcoded -- --path=src/routes/settings
 *   npm run find-hardcoded -- --min-length=10
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, resolve, normalize } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const DEFAULT_SCAN_PATH = join(PROJECT_ROOT, 'src');

interface HardcodedText {
  file: string;
  line: number;
  text: string;
  context: string;
}

/**
 * Patterns to detect hardcoded text in Svelte files
 */
const TEXT_PATTERNS = [
  // HTML text content: >Text<
  />([A-Z][^<>{}\n]{3,})</g,

  // Attribute values: title="Text", placeholder="Text", etc.
  /(?:title|placeholder|aria-label|alt|label)=["']([A-Z][^"']{3,})["']/g,

  // String literals in script: 'Text' or "Text"
  /['"]([A-Z][A-Za-z\s]{4,})["']/g,
];

/**
 * Patterns to exclude (these are likely not user-facing text)
 */
const EXCLUDE_PATTERNS = [
  /^\d+$/,                           // Just numbers
  /^[A-Z]+$/,                        // All caps (likely constants)
  /^[a-z-]+$/,                       // kebab-case (likely CSS/HTML)
  /^[A-Z][a-z]+$/,                   // Single word capitalized (might be component names)
  /^\$[a-z]/,                        // Svelte store references
  /^var\(/,                          // CSS variables
  /^#[0-9a-fA-F]{3,6}$/,            // Color codes
  /^\//,                             // Paths
  /^http/,                           // URLs
  /\{.*\}/,                          // Template expressions
  /^\w+\(/,                          // Function calls
  /^[A-Z][a-z]+[A-Z]/,              // PascalCase (component names)
];

/**
 * Check if text should be excluded
 */
function shouldExclude(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length < 3) return true;
  if (trimmed.length > 100) return true; // Too long, likely not a translation

  return EXCLUDE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Extract hardcoded text from file content
 */
function findHardcodedText(filePath: string, content: string): HardcodedText[] {
  const results: HardcodedText[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Safe array access - i is controlled loop variable within bounds
    const line = String(lines[i] || '');
    const lineNumber = i + 1;

    // Skip script/style blocks content (rough heuristic)
    // Safe string check - line is a string from split operation
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('<script') || lowerLine.includes('<style')) {
      continue;
    }

    // Skip lines with translation helpers
    if (line.includes('$t(') || line.includes('t(')) {
      continue;
    }

    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    for (const pattern of TEXT_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1];

        if (!shouldExclude(text)) {
          results.push({
            file: relative(PROJECT_ROOT, filePath),
            line: lineNumber,
            text: text.trim(),
            context: line.trim().substring(0, 80),
          });
        }
      }
    }
  }

  return results;
}

/**
 * Recursively scan directory for Svelte files
 * Only scans within PROJECT_ROOT to prevent path traversal
 */
function scanDirectory(dirPath: string): HardcodedText[] {
  let results: HardcodedText[] = [];

  // Verify dirPath is within PROJECT_ROOT
  if (!dirPath.startsWith(PROJECT_ROOT)) {
    console.error(`Invalid directory path: ${dirPath}`);
    return results;
  }

  try {
    // Safe read - dirPath already validated to be within PROJECT_ROOT
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Sanitize entry name to prevent directory traversal
      const safeName = entry.name.replace(/\.\./g, '').replace(/^\/+/, '');

      // Skip empty names after sanitization
      if (!safeName) {
        continue;
      }

      // Skip node_modules, .svelte-kit, etc.
      if (safeName.startsWith('.') || safeName === 'node_modules' || safeName === 'build') {
        continue;
      }

      // Validate safeName to prevent path traversal and unsafe characters
      if (safeName.includes('..') || /[^a-zA-Z0-9._-]/.test(safeName)) {
        console.error(`Unsafe file or directory name blocked: ${safeName}`);
        continue;
      }
      // Construct path and verify it stays within PROJECT_ROOT
      const fullPath = join(dirPath, safeName);
      if (!fullPath.startsWith(PROJECT_ROOT)) {
        console.error(`Path traversal attempt blocked: ${safeName}`);
        continue;
      }

      if (entry.isDirectory()) {
        results = results.concat(scanDirectory(fullPath));
      } else if (entry.isFile() && safeName.endsWith('.svelte')) {
        try {
          // Safe read - fullPath already validated to be within PROJECT_ROOT
          const content = readFileSync(fullPath, 'utf-8');
          const found = findHardcodedText(fullPath, content);
          results = results.concat(found);
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error);
  }

  return results;
}

/**
 * Group results by file
 */
function groupByFile(results: HardcodedText[]): Map<string, HardcodedText[]> {
  const grouped = new Map<string, HardcodedText[]>();

  for (const result of results) {
    if (!grouped.has(result.file)) {
      grouped.set(result.file, []);
    }
    const fileGroup = grouped.get(result.file);
    if (fileGroup) {
      fileGroup.push(result);
    }
  }

  return grouped;
}

/**
 * Format results for display
 */
function formatResults(results: HardcodedText[], minLength: number): string {
  const filtered = results.filter(r => r.text.length >= minLength);
  const grouped = groupByFile(filtered);

  let output = '';

  output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `📝 Hardcoded Text Finder\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `Found ${filtered.length} potential hardcoded strings in ${grouped.size} files\n`;
  output += `Minimum length: ${minLength} characters\n\n`;

  if (filtered.length === 0) {
    output += `✅ No hardcoded text found!\n`;
    return output;
  }

  // Sort files by number of issues
  const sortedFiles = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length);

  for (const [file, items] of sortedFiles) {
    output += `\n📄 ${file} (${items.length} items)\n`;
    output += `${'─'.repeat(60)}\n`;

    for (const item of items) {
      output += `  Line ${item.line}: "${item.text}"\n`;
      output += `    Context: ${item.context}\n`;
    }
  }

  output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `Summary: ${filtered.length} strings need translation\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return output;
}

/**
 * Validate and sanitize scan path to prevent directory traversal
 * All paths are resolved to be within PROJECT_ROOT
 */
function validateScanPath(userPath: string): string {
  // Remove any directory traversal attempts
  const sanitized = userPath.replace(/\.\./g, '').replace(/^\/+/, '');

  // Only allow alphanumeric, dash, underscore, and forward slash
  const safePath = sanitized.replace(/[^a-zA-Z0-9/_-]/g, '');

  if (!safePath) {
    throw new Error(`Invalid path: ${userPath} (contains no valid characters)`);
  }

  // Build path components safely
  const normalized = normalize(safePath);

  // Resolve path by manually joining with PROJECT_ROOT to avoid resolve() warning
  const parts = normalized.split('/').filter(p => p && p !== '.');
  let fullPath = PROJECT_ROOT;

  for (const part of parts) {
    // Double-check each part doesn't contain traversal
    if (part === '..' || part.includes('..')) {
      throw new Error(`Invalid path component: ${part}`);
    }
    fullPath = join(fullPath, part);
  }

  // Final verification that path is within PROJECT_ROOT
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error(`Invalid path: ${userPath} (attempts to access outside project root)`);
  }

  return fullPath;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const pathArg = args.find(arg => arg.startsWith('--path='))?.split('=')[1];
  const minLengthArg = args.find(arg => arg.startsWith('--min-length='))?.split('=')[1];

  const scanPath = pathArg ? validateScanPath(pathArg) : DEFAULT_SCAN_PATH;
  const minLength = minLengthArg ? parseInt(minLengthArg, 10) : 3;

  console.log('🔍 Scanning for hardcoded text...\n');
  console.log(`Path: ${relative(PROJECT_ROOT, scanPath)}`);
  console.log(`Min length: ${minLength}\n`);

  try {
    const results = scanDirectory(scanPath);
    const output = formatResults(results, minLength);
    console.log(output);

    // Exit with warning if hardcoded text found
    if (results.length > 0) {
      console.log('\n💡 Tip: Move these strings to translation files in src/lib/i18n/translations/');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
