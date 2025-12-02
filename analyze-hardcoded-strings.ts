#!/usr/bin/env tsx

/**
 * Script to analyze and categorize hardcoded strings for i18n extraction
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface HardcodedString {
  file: string;
  line: number;
  text: string;
  context: string;
}

interface CategoryStats {
  count: number;
  files: Set<string>;
  examples: string[];
}

// Get the hardcoded strings output
console.log('🔍 Running hardcoded text detection...');
const output = execSync('npm run i18n:find-hardcoded', {
  encoding: 'utf-8',
  cwd: process.cwd()
});

// Parse the output
const lines = output.split('\n');
const strings: HardcodedString[] = [];
let currentFile = '';

for (const line of lines) {
  // Match file headers: 📄 path/to/file.svelte (XX items)
  const fileMatch = line.match(/^📄\s+(.+?)\s+\(\d+\s+items?\)$/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    continue;
  }

  // Match string entries: Line XX: "text"
  const stringMatch = line.match(/^\s+Line\s+(\d+):\s+"(.+?)"$/);
  if (stringMatch && currentFile) {
    const lineNum = parseInt(stringMatch[1]);
    const text = stringMatch[2];

    // Get context from next line if available
    const contextMatch = lines[lines.indexOf(line) + 1]?.match(/^\s+Context:\s+(.+)$/);
    const context = contextMatch ? contextMatch[1] : '';

    strings.push({
      file: currentFile,
      line: lineNum,
      text,
      context
    });
  }
}

console.log(`\n📊 Found ${strings.length} hardcoded strings in ${new Set(strings.map(s => s.file)).size} files`);

// Categorize strings
const categories = new Map<string, CategoryStats>();

function addToCategory(category: string, str: HardcodedString) {
  if (!categories.has(category)) {
    categories.set(category, {
      count: 0,
      files: new Set(),
      examples: []
    });
  }

  const cat = categories.get(category)!;
  cat.count++;
  cat.files.add(str.file);

  if (cat.examples.length < 5) {
    cat.examples.push(str.text);
  }
}

// Categorization logic
for (const str of strings) {
  const text = str.text.toLowerCase();
  const file = str.file;

  // Common UI actions
  if (['copy', 'copied!', 'save', 'cancel', 'delete', 'edit', 'close', 'back', 'next', 'search', 'clear', 'reset', 'export', 'import', 'download', 'upload', 'refresh', 'apply', 'submit', 'confirm'].some(action => text === action)) {
    addToCategory('actions', str);
  }
  // Loading states
  else if (text.includes('loading') || text.includes('calculating') || text.includes('processing') || text.endsWith('...')) {
    addToCategory('states', str);
  }
  // Error messages
  else if (text.includes('error') || text.includes('failed') || text.includes('invalid') || text.includes('not found') || text.includes('unknown')) {
    addToCategory('errors', str);
  }
  // Form labels
  else if (text.endsWith(':') && text.length < 30) {
    addToCategory('labels', str);
  }
  // Navigation
  else if (file.includes('nav') || file.includes('header') || file.includes('sidebar') || text.match(/^(home|about|settings|help|documentation)$/i)) {
    addToCategory('navigation', str);
  }
  // Tool-specific content
  else if (file.startsWith('src/routes/') && !file.includes('+layout')) {
    const pathParts = file.split('/');
    const toolCategory = pathParts[2]; // diagnostics, dns, cidr, etc.
    addToCategory(`tools.${toolCategory}`, str);
  }
  // Page titles and headings
  else if (str.context.includes('<h1>') || str.context.includes('<h2>') || str.context.includes('<h3>') || str.context.includes('<title>')) {
    addToCategory('headings', str);
  }
  // Educational content
  else if (text.length > 50 && (text.includes('what is') || text.includes('how to') || text.includes('explanation') || text.includes('about'))) {
    addToCategory('educational', str);
  }
  // Validation messages
  else if (text.includes('required') || text.includes('must be') || text.includes('should be') || text.includes('valid')) {
    addToCategory('validation', str);
  }
  // Tooltips and help text
  else if (str.context.includes('tooltip') || str.context.includes('title=')) {
    addToCategory('tooltips', str);
  }
  // Component-specific
  else if (file.includes('/lib/components/')) {
    addToCategory('components', str);
  }
  // Placeholder text
  else if (str.context.includes('placeholder') || text.startsWith('enter ') || text.startsWith('type ')) {
    addToCategory('placeholders', str);
  }
  // Time/date related
  else if (text.includes('seconds') || text.includes('minutes') || text.includes('hours') || text.includes('days') || text.includes('date') || text.includes('time')) {
    addToCategory('time', str);
  }
  // API/technical terms
  else if (text.includes('api') || text.includes('http') || text.includes('dns') || text.includes('ip') || text.includes('tcp') || text.includes('ssl')) {
    addToCategory('technical', str);
  }
  // Generic content
  else {
    addToCategory('content', str);
  }
}

// Generate report
console.log('\n📋 Category Analysis:');
console.log('=' .repeat(80));

const sortedCategories = Array.from(categories.entries()).sort((a, b) => b[1].count - a[1].count);

for (const [category, stats] of sortedCategories) {
  console.log(`\n${category.toUpperCase()}: ${stats.count} strings in ${stats.files.size} files`);
  console.log('Examples:', stats.examples.slice(0, 3).join(', '));
}

console.log('\n📁 Files by hardcoded string count:');
const fileStats = new Map<string, number>();
for (const str of strings) {
  fileStats.set(str.file, (fileStats.get(str.file) || 0) + 1);
}

const sortedFiles = Array.from(fileStats.entries()).sort((a, b) => b[1] - a[1]);
for (const [file, count] of sortedFiles.slice(0, 20)) {
  console.log(`  ${count.toString().padStart(3)} - ${file}`);
}

console.log(`\n🎯 Next steps:`);
console.log(`1. Create translation files for categories with >50 strings`);
console.log(`2. Start with tools.diagnostics (likely largest category)`);
console.log(`3. Extract common strings to reduce duplication`);
console.log(`4. Update source files systematically by category`);