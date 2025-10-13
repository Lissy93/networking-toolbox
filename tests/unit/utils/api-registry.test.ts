import { describe, it, expect } from 'vitest';
import { apiRegistry, getAPIHandler, listCategoryEndpoints } from '../../../src/lib/utils/api-registry';

describe('API Registry', () => {
  describe('Registry Structure', () => {
    it('should have apiRegistry defined', () => {
      expect(apiRegistry).toBeDefined();
      expect(typeof apiRegistry).toBe('object');
    });

    it('should have endpoints with correct structure', () => {
      Object.entries(apiRegistry).forEach(([key, endpoint]) => {
        expect(endpoint).toHaveProperty('handler');
        expect(endpoint).toHaveProperty('category');
        expect(endpoint).toHaveProperty('description');

        expect(typeof endpoint.handler).toBe('function');
        expect(typeof endpoint.category).toBe('string');
        expect(typeof endpoint.description).toBe('string');

        expect(key.length).toBeGreaterThan(0);
        expect(endpoint.category.length).toBeGreaterThan(0);
        expect(endpoint.description.length).toBeGreaterThan(0);
      });
    });

    it('should have expected categories', () => {
      const categories = [...new Set(Object.values(apiRegistry).map(e => e.category))];

      expect(categories).toContain('subnetting');
      expect(categories).toContain('cidr');
      expect(categories).toContain('ip-address-convertor');
      expect(categories).toContain('dns');
    });

    it('should have expected endpoint counts', () => {
      const endpointCount = Object.keys(apiRegistry).length;
      expect(endpointCount).toBeGreaterThan(50); // Registry has many endpoints
    });
  });

  describe('Category Validation', () => {
    it('should have valid subnetting endpoints', () => {
      const subnettingEndpoints = Object.entries(apiRegistry)
        .filter(([_, endpoint]) => endpoint.category === 'subnetting');

      expect(subnettingEndpoints.length).toBeGreaterThan(0);

      const endpointNames = subnettingEndpoints.map(([key]) => key);
      expect(endpointNames).toContain('ipv4-subnet-calculator');
      expect(endpointNames).toContain('ipv6-subnet-calculator');
    });

    it('should have valid CIDR endpoints', () => {
      const cidrEndpoints = Object.entries(apiRegistry)
        .filter(([_, endpoint]) => endpoint.category === 'cidr');

      expect(cidrEndpoints.length).toBeGreaterThan(0);

      const endpointNames = cidrEndpoints.map(([key]) => key);
      expect(endpointNames).toContain('summarize');
      expect(endpointNames).toContain('split');
    });

    it('should have valid IP conversion endpoints', () => {
      const ipEndpoints = Object.entries(apiRegistry)
        .filter(([_, endpoint]) => endpoint.category === 'ip-address-convertor');

      expect(ipEndpoints.length).toBeGreaterThan(0);

      const endpointNames = ipEndpoints.map(([key]) => key);
      expect(endpointNames).toContain('validator');
      expect(endpointNames).toContain('normalize');
    });

    it('should have valid DNS endpoints', () => {
      const dnsEndpoints = Object.entries(apiRegistry)
        .filter(([_, endpoint]) => endpoint.category === 'dns');

      expect(dnsEndpoints.length).toBeGreaterThan(0);

      const endpointNames = dnsEndpoints.map(([key]) => key);
      expect(endpointNames).toContain('ptr-generator');
      expect(endpointNames).toContain('validate-domain');
    });
  });

  describe('getAPIHandler Function', () => {
    it('should find handlers by direct key match', () => {
      const handler = getAPIHandler('subnetting', 'ipv4-subnet-calculator');

      expect(handler).toBeDefined();
      expect(handler?.category).toBe('subnetting');
      expect(typeof handler?.handler).toBe('function');
    });

    it('should find handlers by removing category prefix', () => {
      const handler = getAPIHandler('dns', 'validate-domain');

      expect(handler).toBeDefined();
      expect(handler?.category).toBe('dns');
    });

    it('should return null for non-existent handlers', () => {
      const handler = getAPIHandler('invalid-category', 'non-existent-tool');

      expect(handler).toBeNull();
    });

    it('should respect category filtering', () => {
      const handler = getAPIHandler('cidr', 'ipv4-subnet-calculator');

      expect(handler).toBeNull(); // Wrong category
    });

    it('should handle category prefix removal correctly', () => {
      const handler = getAPIHandler('ip-address-convertor', 'ip-address-convertor-validator');

      expect(handler).toBeDefined();
      expect(handler?.category).toBe('ip-address-convertor');
    });
  });

  describe('listCategoryEndpoints Function', () => {
    it('should list all endpoints for a category', () => {
      const subnettingEndpoints = listCategoryEndpoints('subnetting');

      expect(Array.isArray(subnettingEndpoints)).toBe(true);
      expect(subnettingEndpoints.length).toBeGreaterThan(0);
      expect(subnettingEndpoints).toContain('ipv4-subnet-calculator');
    });

    it('should return empty array for non-existent category', () => {
      const endpoints = listCategoryEndpoints('non-existent');

      expect(Array.isArray(endpoints)).toBe(true);
      expect(endpoints.length).toBe(0);
    });

    it('should list correct number of DNS endpoints', () => {
      const dnsEndpoints = listCategoryEndpoints('dns');

      expect(dnsEndpoints.length).toBeGreaterThan(10); // DNS has many endpoints
    });

    it('should not include duplicates', () => {
      const cidrEndpoints = listCategoryEndpoints('cidr');
      const uniqueEndpoints = [...new Set(cidrEndpoints)];

      expect(cidrEndpoints.length).toBe(uniqueEndpoints.length);
    });
  });

  describe('Handler Execution Tests', () => {
    it('should execute IPv4 subnet calculator', () => {
      const handler = getAPIHandler('subnetting', 'ipv4-subnet-calculator');

      expect(() => {
        const result = handler?.handler({ cidr: '192.168.1.0/24' });
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle invalid CIDR format', () => {
      const handler = getAPIHandler('subnetting', 'ipv4-subnet-calculator');

      expect(() => {
        handler?.handler({ cidr: 'invalid' });
      }).toThrow('Invalid CIDR format');
    });

    it('should execute CIDR summarization', () => {
      const handler = getAPIHandler('cidr', 'summarize');

      expect(() => {
        const result = handler?.handler({ input: '192.168.1.0/24\n192.168.2.0/24', mode: 'summarize' });
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should execute IP validation', () => {
      const handler = getAPIHandler('ip-address-convertor', 'validator');

      expect(() => {
        const result = handler?.handler({ ip: '192.168.1.1' });
        expect(result).toBeDefined();
        expect(result.ipv4).toBeDefined();
      }).not.toThrow();
    });

    it('should handle missing required parameters', () => {
      const handler = getAPIHandler('dns', 'validate-domain');

      expect(() => {
        handler?.handler({});
      }).toThrow('domain parameter is required');
    });
  });

  describe('Error Handling', () => {
    it('should throw errors for missing parameters in IPv6 calculator', () => {
      const handler = getAPIHandler('subnetting', 'ipv6-subnet-calculator');

      expect(() => {
        handler?.handler({ cidr: '2001:db8::/invalid' });
      }).toThrow('Prefix length must be a valid number');
    });

    it('should throw errors for missing input in random IP generator', () => {
      const handler = getAPIHandler('ip-address-convertor', 'random');

      expect(() => {
        handler?.handler({});
      }).toThrow('input parameter is required');
    });

    it('should validate required DNS parameters', () => {
      const handler = getAPIHandler('dns', 'validate-srv-record');

      expect(() => {
        handler?.handler({ service: 'http' });
      }).toThrow('service, protocol, priority, weight, port, and target parameters are required');
    });
  });

  describe('Parameter Handling', () => {
    it('should handle array inputs for CIDR operations', () => {
      const handler = getAPIHandler('cidr', 'diff');

      expect(() => {
        const result = handler?.handler({
          setA: ['192.168.1.0/24'],
          setB: ['192.168.2.0/24']
        });
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle string inputs for CIDR operations', () => {
      const handler = getAPIHandler('cidr', 'overlap');

      expect(() => {
        const result = handler?.handler({
          setA: '192.168.1.0/24',
          setB: '192.168.2.0/24'
        });
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle default values', () => {
      const handler = getAPIHandler('ip-address-convertor', 'random');

      expect(() => {
        const result = handler?.handler({ input: '192.168.1.0/24' });
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});