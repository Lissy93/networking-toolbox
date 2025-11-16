import { describe, it, expect, beforeEach } from 'vitest';
import { I18n } from '../../../../src/lib/i18n';

describe('I18n Core', () => {
  let i18n: I18n;

  beforeEach(() => {
    i18n = new I18n('en', 'en');
  });

  describe('constructor', () => {
    it('initializes with default locale', () => {
      expect(i18n.getLocale()).toBe('en');
    });

    it('accepts custom locale', () => {
      const customI18n = new I18n('de', 'en');
      expect(customI18n.getLocale()).toBe('de');
    });
  });

  describe('setLocale / getLocale', () => {
    it('sets and retrieves current locale', () => {
      i18n.setLocale('fr');
      expect(i18n.getLocale()).toBe('fr');
    });

    it('changes locale multiple times', () => {
      i18n.setLocale('de');
      expect(i18n.getLocale()).toBe('de');

      i18n.setLocale('es');
      expect(i18n.getLocale()).toBe('es');
    });
  });

  describe('addTranslations', () => {
    it('adds translations for a locale', () => {
      i18n.addTranslations('en', { hello: 'Hello', goodbye: 'Goodbye' });

      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('goodbye')).toBe('Goodbye');
    });

    it('merges translations for same locale', () => {
      i18n.addTranslations('en', { hello: 'Hello' });
      i18n.addTranslations('en', { goodbye: 'Goodbye' });

      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('goodbye')).toBe('Goodbye');
    });

    it('supports multiple locales', () => {
      i18n.addTranslations('en', { greeting: 'Hello' });
      i18n.addTranslations('de', { greeting: 'Hallo' });

      i18n.setLocale('en');
      expect(i18n.t('greeting')).toBe('Hello');

      i18n.setLocale('de');
      expect(i18n.t('greeting')).toBe('Hallo');
    });
  });

  describe('addNamespace', () => {
    it('adds namespaced translations', () => {
      i18n.addNamespace('en', 'common', { hello: 'Hello', goodbye: 'Goodbye' });

      expect(i18n.t('common.hello')).toBe('Hello');
      expect(i18n.t('common.goodbye')).toBe('Goodbye');
    });

    it('supports multiple namespaces', () => {
      i18n.addNamespace('en', 'common', { hello: 'Hello' });
      i18n.addNamespace('en', 'nav', { home: 'Home', settings: 'Settings' });

      expect(i18n.t('common.hello')).toBe('Hello');
      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.settings')).toBe('Settings');
    });

    it('supports nested namespace paths', () => {
      i18n.addNamespace('en', 'tools/ip-converter', {
        title: 'IP Converter',
        description: 'Convert IP addresses',
      });

      expect(i18n.t('tools/ip-converter.title')).toBe('IP Converter');
      expect(i18n.t('tools/ip-converter.description')).toBe('Convert IP addresses');
    });

    it('handles namespace collisions gracefully', () => {
      i18n.addNamespace('en', 'common', { hello: 'Hello' });
      i18n.addNamespace('en', 'common', { hello: 'Hi', goodbye: 'Bye' });

      // Later namespace should override
      expect(i18n.t('common.hello')).toBe('Hi');
      expect(i18n.t('common.goodbye')).toBe('Bye');
    });
  });

  describe('t (translation)', () => {
    beforeEach(() => {
      i18n.addTranslations('en', {
        hello: 'Hello',
        welcome: 'Welcome {name}',
        nested: {
          greeting: 'Hello World',
          deep: {
            message: 'Deep nested message',
          },
        },
      });

      i18n.addTranslations('de', {
        hello: 'Hallo',
      });
    });

    it('returns translation for simple key', () => {
      expect(i18n.t('hello')).toBe('Hello');
    });

    it('returns key if translation not found', () => {
      expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('falls back to English if current locale missing translation', () => {
      i18n.setLocale('fr'); // French not loaded

      expect(i18n.t('hello')).toBe('Hello'); // Falls back to English
    });

    it('handles nested keys with dot notation', () => {
      expect(i18n.t('nested.greeting')).toBe('Hello World');
      expect(i18n.t('nested.deep.message')).toBe('Deep nested message');
    });

    it('interpolates parameters', () => {
      expect(i18n.t('welcome', { name: 'Alice' })).toBe('Welcome Alice');
    });

    it('interpolates multiple parameters', () => {
      i18n.addTranslations('en', {
        greeting: 'Hello {name}, you have {count} messages',
      });

      expect(i18n.t('greeting', { name: 'Bob', count: 5 })).toBe('Hello Bob, you have 5 messages');
    });

    it('leaves unreplaced placeholders if param missing', () => {
      expect(i18n.t('welcome', {})).toBe('Welcome {name}');
    });

    it('works across different locales', () => {
      i18n.setLocale('en');
      expect(i18n.t('hello')).toBe('Hello');

      i18n.setLocale('de');
      expect(i18n.t('hello')).toBe('Hallo');
    });
  });

  describe('interpolation', () => {
    beforeEach(() => {
      i18n.addTranslations('en', {
        simple: 'Hello {name}',
        multiple: '{greeting} {name}, you have {count} items',
        number: 'Price: ${price}',
        special: 'User {user_id} logged in',
      });
    });

    it('replaces single placeholder', () => {
      expect(i18n.t('simple', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple placeholders', () => {
      expect(i18n.t('multiple', { greeting: 'Hi', name: 'Alice', count: 10 })).toBe(
        'Hi Alice, you have 10 items'
      );
    });

    it('handles numeric values', () => {
      expect(i18n.t('number', { price: 99.99 })).toBe('Price: $99.99');
    });

    it('handles underscores in placeholder names', () => {
      expect(i18n.t('special', { user_id: 12345 })).toBe('User 12345 logged in');
    });

    it('converts numbers to strings', () => {
      expect(i18n.t('simple', { name: 42 })).toBe('Hello 42');
    });
  });

  describe('pluralization', () => {
    beforeEach(() => {
      i18n.addTranslations('en', {
        items: {
          zero: 'No items',
          one: '1 item',
          other: '{count} items',
        },
        messages: {
          one: 'One message',
          other: '{count} messages',
        },
      });
    });

    it('uses zero form for count=0', () => {
      expect(i18n.t('items', { count: 0 })).toBe('No items');
    });

    it('uses one form for count=1', () => {
      expect(i18n.t('items', { count: 1 })).toBe('1 item');
    });

    it('uses other form for count>1', () => {
      expect(i18n.t('items', { count: 5 })).toBe('5 items');
    });

    it('falls back to other if zero not defined', () => {
      expect(i18n.t('messages', { count: 0 })).toBe('0 messages');
    });

    it('interpolates count in plural forms', () => {
      expect(i18n.t('items', { count: 42 })).toBe('42 items');
    });
  });

  describe('nested translations', () => {
    beforeEach(() => {
      i18n.addNamespace('en', 'common', {
        greetings: {
          hello: 'Hello',
          goodbye: 'Goodbye',
        },
        messages: {
          welcome: 'Welcome {name}',
          nested: {
            deep: {
              value: 'Deep nested value',
            },
          },
        },
      });
    });

    it('accesses first level nested keys', () => {
      expect(i18n.t('common.greetings.hello')).toBe('Hello');
    });

    it('accesses deeply nested keys', () => {
      expect(i18n.t('common.messages.nested.deep.value')).toBe('Deep nested value');
    });

    it('supports interpolation in nested keys', () => {
      expect(i18n.t('common.messages.welcome', { name: 'User' })).toBe('Welcome User');
    });

    it('returns key for non-existent nested path', () => {
      expect(i18n.t('common.greetings.nonexistent')).toBe('common.greetings.nonexistent');
    });
  });

  describe('fallback behavior', () => {
    beforeEach(() => {
      i18n.addTranslations('en', {
        english_only: 'English Only Text',
        common: 'Common Text',
      });

      i18n.addTranslations('de', {
        common: 'Gemeinsamer Text',
        german_only: 'Nur Deutsch',
      });
    });

    it('uses current locale if translation exists', () => {
      i18n.setLocale('de');
      expect(i18n.t('common')).toBe('Gemeinsamer Text');
    });

    it('falls back to English if translation missing in current locale', () => {
      i18n.setLocale('de');
      expect(i18n.t('english_only')).toBe('English Only Text');
    });

    it('returns key if not found in any locale', () => {
      i18n.setLocale('de');
      expect(i18n.t('nonexistent')).toBe('nonexistent');
    });

    it('falls back for unsupported locale', () => {
      i18n.addTranslations('en', { test: 'Test' });
      i18n.setLocale('xx'); // Unsupported locale

      expect(i18n.t('test')).toBe('Test');
    });
  });

  describe('security', () => {
    it('prevents prototype pollution via __proto__', () => {
      i18n.addTranslations('en', {
        safe: { value: 'Safe value' },
      });

      // Attempt prototype pollution
      expect(i18n.t('__proto__.polluted')).toBe('__proto__.polluted');
      expect(i18n.t('safe.__proto__')).toBe('safe.__proto__');
    });

    it('prevents prototype pollution via constructor', () => {
      i18n.addTranslations('en', { test: { value: 'Test' } });

      expect(i18n.t('constructor.prototype.polluted')).toBe('constructor.prototype.polluted');
      expect(i18n.t('test.constructor')).toBe('test.constructor');
    });

    it('prevents prototype pollution via prototype', () => {
      i18n.addTranslations('en', { test: { value: 'Test' } });

      expect(i18n.t('prototype.polluted')).toBe('prototype.polluted');
      expect(i18n.t('test.prototype')).toBe('test.prototype');
    });
  });

  describe('edge cases', () => {
    it('handles empty string keys gracefully', () => {
      expect(i18n.t('')).toBe('');
    });

    it('handles keys with special characters', () => {
      i18n.addTranslations('en', {
        'special-key': 'Special Value',
        'key_with_underscore': 'Underscore Value',
      });

      expect(i18n.t('special-key')).toBe('Special Value');
      expect(i18n.t('key_with_underscore')).toBe('Underscore Value');
    });

    it('handles translation values with curly braces', () => {
      i18n.addTranslations('en', {
        code: 'Use {variable} like this: {example}',
      });

      expect(i18n.t('code', { variable: 'x', example: '{x}' })).toBe('Use x like this: {x}');
    });

    it('handles null/undefined params gracefully', () => {
      i18n.addTranslations('en', { test: 'Test {value}' });

      // undefined leaves placeholder unreplaced
      expect(i18n.t('test', { value: undefined as any })).toBe('Test {value}');
      // null is converted to string "null"
      expect(i18n.t('test', { value: null as any })).toBe('Test null');
    });

    it('handles numeric zero as interpolation value', () => {
      i18n.addTranslations('en', { count: 'Count: {num}' });

      expect(i18n.t('count', { num: 0 })).toBe('Count: 0');
    });
  });

  describe('real-world scenarios', () => {
    it('supports tool translations with namespaces', () => {
      i18n.addNamespace('en', 'tools/ip-converter', {
        title: 'IP Address Converter',
        description: 'Convert between IPv4 and IPv6',
        button: {
          convert: 'Convert',
          clear: 'Clear',
        },
      });

      expect(i18n.t('tools/ip-converter.title')).toBe('IP Address Converter');
      expect(i18n.t('tools/ip-converter.button.convert')).toBe('Convert');
    });

    it('supports diagnostic translations', () => {
      i18n.addNamespace('en', 'diagnostics/dns-lookup', {
        heading: 'DNS Lookup',
        input: {
          placeholder: 'Enter domain name',
          label: 'Domain',
        },
        results: {
          found: 'Found {count} records',
        },
      });

      expect(i18n.t('diagnostics/dns-lookup.heading')).toBe('DNS Lookup');
      expect(i18n.t('diagnostics/dns-lookup.results.found', { count: 5 })).toBe(
        'Found 5 records'
      );
    });

    it('handles navigation translations', () => {
      i18n.addNamespace('en', 'nav', {
        home: 'Home',
        tools: 'Tools',
        diagnostics: 'Diagnostics',
        settings: 'Settings',
      });

      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.tools')).toBe('Tools');
    });

    it('handles common translations', () => {
      i18n.addNamespace('en', 'common', {
        actions: {
          copy: 'Copy',
          paste: 'Paste',
          save: 'Save',
          cancel: 'Cancel',
        },
        status: {
          success: 'Success',
          error: 'Error',
          loading: 'Loading...',
        },
      });

      expect(i18n.t('common.actions.copy')).toBe('Copy');
      expect(i18n.t('common.status.loading')).toBe('Loading...');
    });
  });
});
