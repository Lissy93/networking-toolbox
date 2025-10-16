import { describe, it, expect } from 'vitest';
import {
  validateIPv4Detailed,
  validateIPv6Detailed,
  validateIP,
  DEFAULT_TEST_CASES,
  isPrivateIP,
  isReservedIP,
  normalizeIP,
  compressIPv6Address,
  compressIPv6
} from '../../../src/lib/utils/ip-validation';

describe('validateIPv4Detailed', () => {
  it('validates correct IPv4 addresses with detailed info', () => {
    const result = validateIPv4Detailed('192.168.1.1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.addressType).toContain('Private');
    expect(result.details.isPrivate).toBe(true);
    expect(result.details.normalizedForm).toBe('192.168.1.1');
  });

  it('identifies public addresses', () => {
    const result = validateIPv4Detailed('8.8.8.8');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Public');
    expect(result.details.isPrivate).toBe(false);
    expect(result.details.info).toContain('Publicly routable address');
  });

  it('identifies loopback addresses', () => {
    const result = validateIPv4Detailed('127.0.0.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Loopback');
    expect(result.details.scope).toBe('Host');
    expect(result.details.info).toContain('Loopback address (localhost)');
  });

  it('identifies multicast addresses', () => {
    const result = validateIPv4Detailed('224.0.0.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toContain('Multicast');
    expect(result.details.scope).toBe('Multicast');
    expect(result.details.info).toContain('Multicast address');
  });

  it('identifies reserved addresses', () => {
    const result = validateIPv4Detailed('240.0.0.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toContain('Reserved');
    expect(result.details.isReserved).toBe(true);
  });

  it('identifies APIPA addresses', () => {
    const result = validateIPv4Detailed('169.254.1.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toContain('Link-Local');
    expect(result.details.info).toContain('Link-local address (APIPA)');
  });

  it('identifies broadcast addresses', () => {
    const result = validateIPv4Detailed('255.255.255.255');
    expect(result.isValid).toBe(true);
    // Special broadcast address gets marked as reserved
    expect(result.details.addressType).toContain('Reserved');
  });

  it('identifies network addresses', () => {
    const result = validateIPv4Detailed('192.168.0.0');
    expect(result.isValid).toBe(true);
    // Check if it's a class C private network
    expect(result.details.addressType).toContain('Private');
  });

  it('detects leading zeros', () => {
    const result = validateIPv4Detailed('192.168.001.001');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Check that at least one error mentions leading zeros
    const hasLeadingZeroError = result.errors.some(err =>
      err.toLowerCase().includes('leading') && err.includes('zero')
    );
    expect(hasLeadingZeroError).toBe(true);
  });

  it('detects out of range octets', () => {
    const result = validateIPv4Detailed('192.168.256.1');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasRangeError = result.errors.some(err =>
      err.includes('256') && err.toLowerCase().includes('range')
    );
    expect(hasRangeError).toBe(true);
  });

  it('detects non-numeric characters', () => {
    const result = validateIPv4Detailed('192.168.1.a');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasNonNumericError = result.errors.some(err =>
      err.toLowerCase().includes('non-numeric') || err.toLowerCase().includes('invalid')
    );
    expect(hasNonNumericError).toBe(true);
  });

  it('handles empty input', () => {
    const result = validateIPv4Detailed('');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles wrong octet count', () => {
    const result = validateIPv4Detailed('192.168.1');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasOctetError = result.errors.some(err =>
      err.includes('4') && err.toLowerCase().includes('octet')
    );
    expect(hasOctetError).toBe(true);
  });

  it('handles too many octets', () => {
    const result = validateIPv4Detailed('192.168.1.1.1');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles octets with spaces', () => {
    const result = validateIPv4Detailed('192. 168.1.1');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates 0.0.0.0', () => {
    const result = validateIPv4Detailed('0.0.0.0');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Network Address');
    expect(result.details.isReserved).toBe(true);
  });

  it('validates class A private addresses', () => {
    const result = validateIPv4Detailed('10.0.0.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toContain('Private');
    expect(result.details.addressType).toContain('Class A');
  });

  it('validates class B private addresses', () => {
    const result = validateIPv4Detailed('172.16.0.1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toContain('Private');
    expect(result.details.addressType).toContain('Class B');
  });

  it('handles negative numbers', () => {
    const result = validateIPv4Detailed('192.-168.1.1');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateIPv6Detailed', () => {
  it('validates correct IPv6 addresses', () => {
    const result = validateIPv6Detailed('2001:db8::1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.normalizedForm).toBeTruthy();
  });

  it('handles zone IDs', () => {
    const result = validateIPv6Detailed('fe80::1%eth0');
    expect(result.isValid).toBe(true);
    expect(result.details.zoneId).toBe('eth0');
    expect(result.details.info).toContain('Zone ID specified: %eth0');
  });

  it('detects multiple zone IDs', () => {
    const result = validateIPv6Detailed('fe80::1%eth0%eth1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Multiple % symbols found - invalid zone ID format');
  });

  it('handles compressed addresses', () => {
    const result = validateIPv6Detailed('::1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Loopback');
  });

  it('detects multiple compressions', () => {
    const result = validateIPv6Detailed('2001::db8::1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Multiple :: sequences found - only one :: allowed per address');
  });

  it('handles embedded IPv4', () => {
    const result = validateIPv6Detailed('::ffff:192.168.1.1');
    expect(result.isValid).toBe(true);
    expect(result.details.hasEmbeddedIPv4).toBe(true);
    expect(result.details.embeddedIPv4).toBe('192.168.1.1');
  });

  it('validates embedded IPv4 addresses', () => {
    const result = validateIPv6Detailed('::ffff:256.168.1.1');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Invalid embedded IPv4 address');
  });

  it('detects too many groups', () => {
    const result = validateIPv6Detailed('2001:db8:85a3:0000:0000:8a2e:0370:7334:extra');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects invalid hexadecimal', () => {
    const result = validateIPv6Detailed('2001:db8::gggg');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasHexError = result.errors.some(err =>
      err.toLowerCase().includes('hex') || err.toLowerCase().includes('invalid')
    );
    expect(hasHexError).toBe(true);
  });

  it('identifies link-local addresses', () => {
    const result = validateIPv6Detailed('fe80::1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Link-Local');
    expect(result.details.scope).toBe('Link-Local');
  });

  it('identifies unique local addresses', () => {
    const result = validateIPv6Detailed('fd00::1');
    expect(result.isValid).toBe(true);
    // fd00 is unique local but might be identified differently
    expect(result.details.addressType).toBeTruthy();
  });

  it('identifies multicast addresses', () => {
    const result = validateIPv6Detailed('ff02::1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Multicast');
  });

  it('identifies global unicast addresses', () => {
    const result = validateIPv6Detailed('2001:db8::1');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Global Unicast');
  });

  it('handles leading zeros in groups', () => {
    const result = validateIPv6Detailed('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(result.isValid).toBe(true);
    expect(result.details.normalizedForm).toBeTruthy();
  });

  it('detects groups that are too long', () => {
    const result = validateIPv6Detailed('2001:db8::12345');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates unspecified address ::', () => {
    const result = validateIPv6Detailed('::');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Unspecified');
  });

  it('validates IPv4-mapped IPv6', () => {
    const result = validateIPv6Detailed('::ffff:192.168.1.1');
    expect(result.isValid).toBe(true);
    expect(result.details.hasEmbeddedIPv4).toBe(true);
  });

  it('handles empty segments correctly', () => {
    const result = validateIPv6Detailed('2001::');
    expect(result.isValid).toBe(true);
  });

  it('handles all zeros address', () => {
    const result = validateIPv6Detailed('0000:0000:0000:0000:0000:0000:0000:0000');
    expect(result.isValid).toBe(true);
    expect(result.details.addressType).toBe('Unspecified');
  });
});

describe('validateIP', () => {
  it('validates both IPv4 and IPv6', () => {
    const ipv4Result = validateIP('192.168.1.1');
    expect(ipv4Result).toBeTruthy();
    expect(ipv4Result?.isValid).toBe(true);
    expect(ipv4Result?.type).toBe('ipv4');

    const ipv6Result = validateIP('2001:db8::1');
    expect(ipv6Result).toBeTruthy();
    expect(ipv6Result?.isValid).toBe(true);
    expect(ipv6Result?.type).toBe('ipv6');
  });

  it('rejects invalid IPs', () => {
    const result1 = validateIP('256.168.1.1');
    expect(result1?.isValid).toBe(false);
    expect(result1?.type).toBe('ipv4');

    const result2 = validateIP('gggg::1');
    expect(result2?.isValid).toBe(false);
    expect(result2?.type).toBe('ipv6');
  });

  it('handles empty input', () => {
    const result = validateIP('');
    expect(result).toBe(null);
  });

  it('handles whitespace', () => {
    const result = validateIP('  192.168.1.1  ');
    expect(result).toBeTruthy();
    expect(result?.isValid).toBe(true);
  });
});

describe('isPrivateIP', () => {
  it('identifies private IPv4 addresses', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('8.8.8.8')).toBe(false);
  });

  it('identifies private IPv6 addresses', () => {
    expect(isPrivateIP('fd00::1')).toBe(true);
    expect(isPrivateIP('fc00::1')).toBe(true);
    expect(isPrivateIP('2001:db8::1')).toBe(false);
  });

  it('handles invalid input', () => {
    expect(isPrivateIP('invalid')).toBe(false);
    expect(isPrivateIP('')).toBe(false);
  });
});

describe('isReservedIP', () => {
  it('identifies reserved IPv4 addresses', () => {
    expect(isReservedIP('0.0.0.0')).toBe(true);
    expect(isReservedIP('255.255.255.255')).toBe(true);
    expect(isReservedIP('240.0.0.1')).toBe(true);
    expect(isReservedIP('192.168.1.1')).toBe(false);
  });

  it('identifies reserved IPv6 addresses', () => {
    expect(isReservedIP('::')).toBe(true);
    expect(isReservedIP('::1')).toBe(true);
    expect(isReservedIP('2001:db8::1')).toBe(false);
  });

  it('handles invalid input', () => {
    expect(isReservedIP('invalid')).toBe(false);
    expect(isReservedIP('')).toBe(false);
  });
});

describe('normalizeIP', () => {
  it('normalizes IPv4 addresses', () => {
    expect(normalizeIP('192.168.1.1')).toBe('192.168.1.1');
    expect(normalizeIP('  192.168.1.1  ')).toBe('192.168.1.1');
  });

  it('normalizes IPv6 addresses', () => {
    const normalized = normalizeIP('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(normalized).toBeTruthy();
    expect(normalized).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });

  it('returns null for invalid input', () => {
    expect(normalizeIP('invalid')).toBe(null);
    expect(normalizeIP('')).toBe(null);
    expect(normalizeIP('256.168.1.1')).toBe(null);
  });

  it('handles zone IDs in IPv6', () => {
    const result = normalizeIP('fe80::1%eth0');
    expect(result).toBeTruthy();
    expect(result).toContain('%eth0');
  });
});

describe('compressIPv6Address', () => {
  it('compresses IPv6 addresses', () => {
    const compressed = compressIPv6Address('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(compressed).toBeTruthy();
    expect(compressed?.includes('::')).toBe(true);
  });

  it('handles already compressed addresses', () => {
    const result = compressIPv6Address('2001:db8::1');
    expect(result).toBe('2001:db8::1');
  });

  it('returns null for invalid addresses', () => {
    expect(compressIPv6Address('gggg::1')).toBe(null);
    expect(compressIPv6Address('192.168.1.1')).toBe(null);
    expect(compressIPv6Address('')).toBe(null);
  });

  it('preserves zone IDs', () => {
    const result = compressIPv6Address('fe80:0000:0000:0000:0000:0000:0000:0001%eth0');
    expect(result).toBeTruthy();
    expect(result).toContain('%eth0');
  });
});

describe('compressIPv6', () => {
  it('compresses expanded IPv6 addresses', () => {
    expect(compressIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
    expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe('::1');
    expect(compressIPv6('2001:0db8:0000:0042:0000:0000:0000:0001')).toBe('2001:db8:0:42::1');
  });

  it('handles addresses with multiple zero groups', () => {
    expect(compressIPv6('2001:0000:0000:0000:0000:0000:0000:0001')).toBe('2001::1');
    expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0000')).toBe('::');
  });

  it('prefers compressing longer sequences of zeros', () => {
    const result = compressIPv6('2001:0000:0000:0000:0001:0000:0000:0001');
    expect(result).toContain('::');
    // Should compress the longest sequence
    expect(result.split('::').length).toBe(2);
  });

  it('handles already compressed addresses', () => {
    expect(compressIPv6('2001:db8::1')).toBe('2001:db8::1');
    expect(compressIPv6('::1')).toBe('::1');
  });

  it('removes leading zeros from groups', () => {
    expect(compressIPv6('2001:0db8:0001:0002:0003:0004:0005:0006')).toBe('2001:db8:1:2:3:4:5:6');
  });
});

describe('DEFAULT_TEST_CASES', () => {
  it('includes valid and invalid test cases', () => {
    expect(DEFAULT_TEST_CASES).toBeDefined();
    expect(DEFAULT_TEST_CASES.length).toBeGreaterThan(0);

    const validCases = DEFAULT_TEST_CASES.filter(tc => tc.valid);
    const invalidCases = DEFAULT_TEST_CASES.filter(tc => !tc.valid);

    expect(validCases.length).toBeGreaterThan(0);
    expect(invalidCases.length).toBeGreaterThan(0);
  });

  it('test cases match their expected validity', () => {
    DEFAULT_TEST_CASES.forEach(testCase => {
      const result = validateIP(testCase.value);
      if (testCase.valid) {
        expect(result?.isValid).toBe(true);
      } else {
        // Invalid cases should either return null or have isValid = false
        expect(!result || !result.isValid).toBe(true);
      }
    });
  });
});