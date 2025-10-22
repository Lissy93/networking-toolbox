import { describe, it, expect } from 'vitest';
import {
	validateGatewayConfig,
	buildGatewayOption,
	decodeGatewayOption,
	type GatewayConfig,
} from '$lib/utils/dhcp-option3-gateway';

describe('dhcp-option3-gateway', () => {
	describe('validateGatewayConfig', () => {
		it('should require at least one gateway', () => {
			const config: GatewayConfig = {
				gateways: [],
			};
			const errors = validateGatewayConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('At least one gateway');
		});

		it('should reject empty gateway entries', () => {
			const config: GatewayConfig = {
				gateways: ['', '  '],
			};
			const errors = validateGatewayConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('At least one gateway');
		});

		it('should validate IPv4 addresses', () => {
			const config: GatewayConfig = {
				gateways: ['not-an-ip'],
			};
			const errors = validateGatewayConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Invalid IPv4 address');
		});

		it('should accept valid IPv4 addresses', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1'],
			};
			const errors = validateGatewayConfig(config);
			expect(errors).toEqual([]);
		});

		it('should validate gateway is within subnet', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.2.1'],
				subnet: '192.168.1.0/24',
			};
			const errors = validateGatewayConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Not within subnet');
		});

		it('should accept gateway within subnet', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1'],
				subnet: '192.168.1.0/24',
			};
			const errors = validateGatewayConfig(config);
			expect(errors).toEqual([]);
		});

		it('should detect duplicate gateways', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1', '192.168.1.1'],
			};
			const errors = validateGatewayConfig(config);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain('Duplicate gateway');
		});

		it('should skip empty entries during validation', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1', '', '192.168.1.2'],
			};
			const errors = validateGatewayConfig(config);
			expect(errors).toEqual([]);
		});

		it('should validate multiple gateways', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1', '192.168.1.2', '192.168.1.3'],
			};
			const errors = validateGatewayConfig(config);
			expect(errors).toEqual([]);
		});
	});

	describe('buildGatewayOption', () => {
		it('should build option for single gateway', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1'],
			};
			const result = buildGatewayOption(config);
			expect(result.gateways).toEqual(['192.168.1.1']);
			expect(result.hexEncoded).toBe('c0a80101');
			expect(result.totalLength).toBe(4);
		});

		it('should build option for multiple gateways', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1', '192.168.1.2'],
			};
			const result = buildGatewayOption(config);
			expect(result.gateways).toEqual(['192.168.1.1', '192.168.1.2']);
			expect(result.hexEncoded).toBe('c0a80101c0a80102');
			expect(result.totalLength).toBe(8);
		});

		it('should encode IP addresses correctly', () => {
			const config: GatewayConfig = {
				gateways: ['10.0.0.1'],
			};
			const result = buildGatewayOption(config);
			expect(result.hexEncoded).toBe('0a000001');
		});

		it('should format wire format with spaces', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1'],
			};
			const result = buildGatewayOption(config);
			expect(result.wireFormat).toBe('c0 a8 01 01');
		});

		it('should skip empty gateway entries', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1', '', '192.168.1.2'],
			};
			const result = buildGatewayOption(config);
			expect(result.gateways).toEqual(['192.168.1.1', '192.168.1.2']);
			expect(result.totalLength).toBe(8);
		});

		it('should generate config examples', () => {
			const config: GatewayConfig = {
				gateways: ['192.168.1.1'],
			};
			const result = buildGatewayOption(config);
			expect(result.configExamples.iscDhcpd).toContain('option routers 192.168.1.1');
			expect(result.configExamples.keaDhcp4).toContain('"name": "routers"');
			expect(result.configExamples.dnsmasq).toContain('dhcp-option=3,192.168.1.1');
		});

		it('should throw error for invalid configuration', () => {
			const config: GatewayConfig = {
				gateways: ['invalid-ip'],
			};
			expect(() => buildGatewayOption(config)).toThrow();
		});
	});

	describe('decodeGatewayOption', () => {
		it('should decode single gateway', () => {
			const result = decodeGatewayOption('c0a80101');
			expect(result.gateways).toEqual(['192.168.1.1']);
			expect(result.totalLength).toBe(4);
		});

		it('should decode multiple gateways', () => {
			const result = decodeGatewayOption('c0a80101c0a80102');
			expect(result.gateways).toEqual(['192.168.1.1', '192.168.1.2']);
			expect(result.totalLength).toBe(8);
		});

		it('should handle hex with spaces', () => {
			const result = decodeGatewayOption('c0 a8 01 01');
			expect(result.gateways).toEqual(['192.168.1.1']);
		});

		it('should handle uppercase hex', () => {
			const result = decodeGatewayOption('C0A80101');
			expect(result.gateways).toEqual(['192.168.1.1']);
		});

		it('should throw error for empty hex', () => {
			expect(() => decodeGatewayOption('')).toThrow('empty');
		});

		it('should throw error for invalid hex characters', () => {
			expect(() => decodeGatewayOption('zzzzz')).toThrow('Invalid hex');
		});

		it('should throw error for incorrect length', () => {
			expect(() => decodeGatewayOption('c0a801')).toThrow('multiple of 8');
		});

		it('should decode and provide config examples', () => {
			const result = decodeGatewayOption('c0a80101');
			expect(result.configExamples.iscDhcpd).toBeDefined();
			expect(result.configExamples.keaDhcp4).toBeDefined();
			expect(result.configExamples.dnsmasq).toBeDefined();
		});
	});
});
