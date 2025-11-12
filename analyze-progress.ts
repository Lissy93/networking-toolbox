#!/usr/bin/env tsx

/**
 * Analyze progress on i18n extraction and provide systematic approach
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface StringCount {
  file: string;
  count: number;
  category: string;
}

console.log('🔍 Analyzing hardcoded string extraction progress...\n');

// Get current hardcoded strings output
const output = execSync('npm run i18n:find-hardcoded 2>/dev/null', { encoding: 'utf-8' });
const lines = output.split('\n');

// Extract summary info
const summaryMatch = lines.find(line => line.includes('Found') && line.includes('potential hardcoded strings'));
if (summaryMatch) {
  const match = summaryMatch.match(/Found (\d+) potential hardcoded strings in (\d+) files/);
  if (match) {
    console.log(`📊 Current status: ${match[1]} strings in ${match[2]} files\n`);
  }
}

// Parse files and their string counts
const fileCounts: StringCount[] = [];
const filePattern = /📄\s+(.+?)\s+\((\d+)\s+items?\)$/;

for (const line of lines) {
  const match = line.match(filePattern);
  if (match) {
    const filePath = match[1];
    const count = parseInt(match[2]);

    let category = 'Other';

    if (filePath.includes('/diagnostics/')) {
      category = 'Diagnostics';
    } else if (filePath.includes('/dns/')) {
      category = 'DNS Tools';
    } else if (filePath.includes('/cidr/')) {
      category = 'CIDR Tools';
    } else if (filePath.includes('/subnetting/')) {
      category = 'Subnetting';
    } else if (filePath.includes('/ip-address-convertor/')) {
      category = 'IP Conversion';
    } else if (filePath.includes('/dhcp/')) {
      category = 'DHCP';
    } else if (filePath.includes('/reference/')) {
      category = 'Reference';
    } else if (filePath.includes('/components/')) {
      category = 'Components';
    } else if (filePath.includes('/routes/')) {
      category = 'Pages';
    }

    fileCounts.push({
      file: filePath,
      count,
      category
    });
  }
}

// Sort by count descending
fileCounts.sort((a, b) => b.count - a.count);

console.log('📈 Files with most hardcoded strings:');
console.log('=' .repeat(60));
for (const item of fileCounts.slice(0, 15)) {
  console.log(`${item.count.toString().padStart(3)} strings - ${item.category} - ${item.file.replace('src/routes/', '')}`);
}

// Categorize by type
const categoryTotals = new Map<string, number>();
const categoryFiles = new Map<string, number>();

for (const item of fileCounts) {
  categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + item.count);
  categoryFiles.set(item.category, (categoryFiles.get(item.category) || 0) + 1);
}

console.log('\n📋 Breakdown by category:');
console.log('=' .repeat(60));
for (const [category, total] of Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])) {
  const fileCount = categoryFiles.get(category) || 0;
  console.log(`${category.padEnd(15)} - ${total.toString().padStart(4)} strings in ${fileCount.toString().padStart(2)} files`);
}

// Check existing translation files
console.log('\n📁 Existing diagnostic translation files:');
const diagnosticTranslations = fs.readdirSync(
  '/Users/alicia.sykes/Documents/alicia-code/webmono69/src/lib/i18n/translations/en/diagnostics'
).length;
console.log(`   ${diagnosticTranslations} translation files already exist`);

console.log('\n🎯 Recommended next steps:');
console.log('1. Focus on files with highest string counts (40+ strings)');
console.log('2. Prioritize diagnostic pages that already have translation files');
console.log('3. Extract common patterns to common.json');
console.log('4. Create translation files for high-volume pages without existing translations');

// Show top diagnostic files that likely have translations
console.log('\n🔧 High-priority diagnostic pages to process next:');
const diagnosticFiles = fileCounts
  .filter(f => f.category === 'Diagnostics' && f.count > 20)
  .slice(0, 8);

for (const file of diagnosticFiles) {
  // Check if translation file exists
  const basename = path.basename(path.dirname(file.file));
  const translationPath = `/Users/alicia.sykes/Documents/alicia-code/webmono69/src/lib/i18n/translations/en/diagnostics/${basename}.json`;
  const hasTranslation = fs.existsSync(translationPath);
  const indicator = hasTranslation ? '✓' : '✗';

  console.log(`   ${indicator} ${file.count.toString().padStart(2)} strings - ${file.file.replace('src/routes/', '')}`);
}