#!/usr/bin/env node
/**
 * Translation Extraction Helper
 * Helps identify and extract hardcoded strings from Svelte files
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface StringMatch {
  line: number;
  original: string;
  suggested Key: string;
  context: string;
}

/**
 * Extract hardcoded strings from a file and suggest translation keys
 */
function extractStrings(filePath: string): StringMatch[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: StringMatch[] = [];

  const patterns = [
    // String in quotes
    /'([^']{5,})'/g,
    /"([^"]{5,})"/g,
    // JSX text content
    />([A-Z][^<>{}]{4,})</g,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    // Skip translation calls and imports
    if (line.includes('$t(') || line.includes('import')) continue;

    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern);
      while ((match = regex.exec(line)) !== null) {
        const text = match[1];

        // Skip if looks like code
        if (/^[a-z_]+$/.test(text) || /^\d+$/.test(text)) continue;

        const suggestedKey = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 40);

        matches.push({
          line: i + 1,
          original: text,
          suggestedKey,
          context: line.trim().substring(0, 80),
        });
      }
    }
  }

  return matches;
}

// Example usage
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: tsx extract-to-translations.ts <file-path>');
  process.exit(1);
}

const filePath = args[0];
const matches = extractStrings(filePath);

console.log(`\nFound ${matches.length} potential strings in ${filePath}\n`);

for (const match of matches.slice(0, 20)) {
  console.log(`Line ${match.line}: "${match.original}"`);
  console.log(`  Suggested key: ${match.suggestedKey}`);
  console.log(`  Context: ${match.context}\n`);
}

if (matches.length > 20) {
  console.log(`... and ${matches.length - 20} more`);
}
