import { describe, it, expect } from 'vitest';
import { setOperationsContent } from '../../../src/lib/content/cidr-set-operations';

describe('CIDR Set Operations Content', () => {
  it('should have valid structure', () => {
    expect(setOperationsContent).toBeDefined();
    expect(setOperationsContent.title).toBe('Set Operations Reference');
    expect(typeof setOperationsContent.description).toBe('string');
    expect(setOperationsContent.description.length).toBeGreaterThan(0);
  });

  it('should contain all required operations', () => {
    expect(setOperationsContent.operations).toHaveLength(4);

    const operationSymbols = setOperationsContent.operations.map(op => op.symbol);
    expect(operationSymbols).toContain('A ∪ B'); // Union
    expect(operationSymbols).toContain('A ∩ B'); // Intersection
    expect(operationSymbols).toContain('A - B'); // Difference
    expect(operationSymbols).toContain('A ⊆ B'); // Containment
  });

  it('should have valid operation structure', () => {
    setOperationsContent.operations.forEach(operation => {
      expect(operation).toHaveProperty('symbol');
      expect(operation).toHaveProperty('name');
      expect(operation).toHaveProperty('description');
      expect(operation).toHaveProperty('example');

      expect(typeof operation.symbol).toBe('string');
      expect(typeof operation.name).toBe('string');
      expect(typeof operation.description).toBe('string');
      expect(typeof operation.example).toBe('string');

      expect(operation.symbol.length).toBeGreaterThan(0);
      expect(operation.name.length).toBeGreaterThan(0);
      expect(operation.description.length).toBeGreaterThan(0);
      expect(operation.example.length).toBeGreaterThan(0);
    });
  });

  it('should contain expected patterns', () => {
    expect(setOperationsContent.patterns).toHaveLength(4);

    const patternTitles = setOperationsContent.patterns.map(p => p.title);
    expect(patternTitles).toContain('Firewall Management');
    expect(patternTitles).toContain('IP Allocation');
    expect(patternTitles).toContain('Network Analysis');
    expect(patternTitles).toContain('Cloud Networks');
  });

  it('should have valid pattern structure', () => {
    setOperationsContent.patterns.forEach(pattern => {
      expect(pattern).toHaveProperty('icon');
      expect(pattern).toHaveProperty('title');
      expect(pattern).toHaveProperty('items');

      expect(typeof pattern.icon).toBe('string');
      expect(typeof pattern.title).toBe('string');
      expect(Array.isArray(pattern.items)).toBe(true);
      expect(pattern.items.length).toBeGreaterThan(0);

      pattern.items.forEach(item => {
        expect(item).toHaveProperty('term');
        expect(item).toHaveProperty('description');
        expect(typeof item.term).toBe('string');
        expect(typeof item.description).toBe('string');
      });
    });
  });

  it('should contain informative notes', () => {
    expect(setOperationsContent.notes).toHaveLength(4);

    const noteTitles = setOperationsContent.notes.map(n => n.title);
    expect(noteTitles).toContain('IPv4 vs IPv6');
    expect(noteTitles).toContain('CIDR Optimization');
    expect(noteTitles).toContain('Range Normalization');
    expect(noteTitles).toContain('Performance Considerations');
  });

  it('should have valid note structure', () => {
    setOperationsContent.notes.forEach(note => {
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('content');
      expect(typeof note.title).toBe('string');
      expect(typeof note.content).toBe('string');
      expect(note.title.length).toBeGreaterThan(0);
      expect(note.content.length).toBeGreaterThan(0);
    });
  });

  it('should contain best practices', () => {
    expect(setOperationsContent.bestPractices).toHaveLength(4);

    const practiceTerms = setOperationsContent.bestPractices.map(p => p.term);
    expect(practiceTerms).toContain('Validate Inputs');
    expect(practiceTerms).toContain('Document Operations');
    expect(practiceTerms).toContain('Test in Stages');
    expect(practiceTerms).toContain('Monitor Results');
  });

  it('should have valid best practices structure', () => {
    setOperationsContent.bestPractices.forEach(practice => {
      expect(practice).toHaveProperty('term');
      expect(practice).toHaveProperty('description');
      expect(typeof practice.term).toBe('string');
      expect(typeof practice.description).toBe('string');
      expect(practice.term.length).toBeGreaterThan(0);
      expect(practice.description.length).toBeGreaterThan(0);
    });
  });

  it('should contain meaningful examples with IP addresses', () => {
    const examples = setOperationsContent.operations.map(op => op.example);

    // Should contain realistic IP address examples
    expect(examples.some(ex => ex.includes('192.168'))).toBe(true);
    expect(examples.some(ex => ex.includes('/24'))).toBe(true);
    expect(examples.some(ex => ex.includes('/25'))).toBe(true);
  });

  it('should have consistent mathematical notation', () => {
    const symbols = setOperationsContent.operations.map(op => op.symbol);

    // Check for proper mathematical symbols
    expect(symbols).toContain('A ∪ B'); // Union symbol
    expect(symbols).toContain('A ∩ B'); // Intersection symbol
    expect(symbols).toContain('A - B'); // Difference symbol
    expect(symbols).toContain('A ⊆ B'); // Subset symbol
  });
});