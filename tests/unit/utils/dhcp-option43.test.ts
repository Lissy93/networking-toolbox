import { describe, it, expect } from 'vitest';
import {
	ipToHex,
	ipToAsciiHex,
	hexToColonSeparated,
	hexToWindowsBinary,
	generateCiscoOption43,
	generateMerakiOption43,
	generateRuckusOption43,
	generateArubaOption43,
	generateUniFiOption43,
	generateExtremeOption43,
	generateOption43,
	isValidIPv4,
	parseIPList,
	type VendorType,
} from '$lib/utils/dhcp-option43';

describe('dhcp-option43 utilities', () => {
	describe('ipToHex', () => {
		it('should convert IPv4 address to hex', () => {
			expect(ipToHex('192.168.1.10')).toBe('c0a8010a');
			expect(ipToHex('192.168.1.11')).toBe('c0a8010b');
			expect(ipToHex('10.0.0.1')).toBe('0a000001');
			expect(ipToHex('255.255.255.255')).toBe('ffffffff');
			expect(ipToHex('0.0.0.0')).toBe('00000000');
		});

		it('should handle single digit octets correctly', () => {
			expect(ipToHex('1.2.3.4')).toBe('01020304');
			expect(ipToHex('10.20.30.40')).toBe('0a141e28');
		});
	});

	describe('ipToAsciiHex', () => {
		it('should convert IP string to ASCII hex', () => {
			expect(ipToAsciiHex('192.168.10.5')).toBe('3139322e3136382e31302e35');
			expect(ipToAsciiHex('172.16.1.50')).toBe('3137322e31362e312e3530');
		});

		it('should handle different IP lengths', () => {
			expect(ipToAsciiHex('10.0.0.1')).toBe('31302e302e302e31');
			expect(ipToAsciiHex('255.255.255.255')).toBe('3235352e3235352e3235352e323535');
		});
	});

	describe('hexToColonSeparated', () => {
		it('should convert hex to colon-separated format', () => {
			expect(hexToColonSeparated('f108c0a8010ac0a8010b')).toBe('f1:08:c0:a8:01:0a:c0:a8:01:0b');
			expect(hexToColonSeparated('0104c0a80114')).toBe('01:04:c0:a8:01:14');
		});

		it('should handle odd-length hex strings', () => {
			expect(hexToColonSeparated('abc')).toBe('ab:c');
		});

		it('should handle empty string', () => {
			expect(hexToColonSeparated('')).toBe('');
		});
	});

	describe('hexToWindowsBinary', () => {
		it('should convert hex to space-separated format', () => {
			expect(hexToWindowsBinary('f108c0a8010ac0a8010b')).toBe('f1 08 c0 a8 01 0a c0 a8 01 0b');
			expect(hexToWindowsBinary('0104c0a80114')).toBe('01 04 c0 a8 01 14');
		});

		it('should handle empty string', () => {
			expect(hexToWindowsBinary('')).toBe('');
		});
	});

	describe('generateCiscoOption43', () => {
		it('should generate correct hex for single IP', () => {
			const result = generateCiscoOption43(['192.168.1.10']);
			expect(result.hex).toBe('f104c0a8010a');
			expect(result.subOption).toBe(241);
		});

		it('should generate correct hex for dual IPs', () => {
			const result = generateCiscoOption43(['192.168.1.10', '192.168.1.11']);
			expect(result.hex).toBe('f108c0a8010ac0a8010b');
			expect(result.colonHex).toBe('f1:08:c0:a8:01:0a:c0:a8:01:0b');
			expect(result.windowsBinary).toBe('f1 08 c0 a8 01 0a c0 a8 01 0b');
		});

		it('should generate correct hex for multiple IPs', () => {
			const result = generateCiscoOption43(['10.0.0.1', '10.0.0.2', '10.0.0.3']);
			expect(result.hex).toBe('f10c0a0000010a0000020a000003');
		});

		it('should have correct IOS command', () => {
			const result = generateCiscoOption43(['192.168.1.10']);
			expect(result.iosCommand).toContain('ip dhcp pool');
			expect(result.iosCommand).toContain('option 43 hex');
			expect(result.iosCommand).toContain('f104c0a8010a');
			expect(result.commandLabel).toBe('Cisco IOS/IOS-XE DHCP Server');
		});

		it('should have workings array', () => {
			const result = generateCiscoOption43(['192.168.1.10', '192.168.1.11']);
			expect(result.workings).toBeDefined();
			expect(result.workings!.length).toBeGreaterThan(0);
			expect(result.workings![0]).toContain('f1');
			expect(result.workings![2]).toContain('08');
		});

		it('should generate all output formats', () => {
			const result = generateCiscoOption43(['192.168.1.10']);
			expect(result.hex).toBeDefined();
			expect(result.colonHex).toBeDefined();
			expect(result.windowsBinary).toBeDefined();
			expect(result.iscDhcp).toBeDefined();
			expect(result.infoblox).toBeDefined();
			expect(result.mikrotik).toBeDefined();
		});
	});

	describe('generateMerakiOption43', () => {
		it('should generate correct ASCII hex for single IP', () => {
			const result = generateMerakiOption43(['192.168.10.5']);
			expect(result.hex).toBe('3139322e3136382e31302e35');
		});

		it('should generate correct ASCII hex for multiple IPs', () => {
			const result = generateMerakiOption43(['192.168.1.10', '192.168.1.11']);
			// "192.168.1.10,192.168.1.11"
			expect(result.hex).toBe('3139322e3136382e312e31302c3139322e3136382e312e3131');
		});

		it('should have correct IOS command with hex format', () => {
			const result = generateMerakiOption43(['192.168.10.5']);
			expect(result.iosCommand).toContain('option 43 hex');
			expect(result.iosCommand).not.toContain('ascii');
		});

		it('should have workings showing ASCII conversion', () => {
			const result = generateMerakiOption43(['192.168.10.5']);
			expect(result.workings).toBeDefined();
			expect(result.workings!.some((w) => w.includes('ASCII'))).toBe(true);
		});
	});

	describe('generateRuckusOption43', () => {
		it('should generate correct hex for SmartZone', () => {
			const result = generateRuckusOption43(['172.16.1.50'], 'smartzone');
			expect(result.hex).toBe('060b3137322e31362e312e3530');
			expect(result.subOption).toBe(6);
		});

		it('should generate correct hex for ZoneDirector', () => {
			const result = generateRuckusOption43(['10.50.100.200'], 'zonedirector');
			expect(result.hex).toBe('030d31302e35302e3130302e323030');
			expect(result.subOption).toBe(3);
		});

		it('should use different vendor codes', () => {
			const smartzone = generateRuckusOption43(['192.168.1.1'], 'smartzone');
			const zonedirector = generateRuckusOption43(['192.168.1.1'], 'zonedirector');
			expect(smartzone.hex.substring(0, 2)).toBe('06');
			expect(zonedirector.hex.substring(0, 2)).toBe('03');
		});

		it('should have correct command labels', () => {
			const smartzone = generateRuckusOption43(['192.168.1.1'], 'smartzone');
			const zonedirector = generateRuckusOption43(['192.168.1.1'], 'zonedirector');
			expect(smartzone.commandLabel).toBe('Ruckus SmartZone CLI');
			expect(zonedirector.commandLabel).toBe('Ruckus ZoneDirector CLI');
		});

		it('should have Ruckus-specific commands', () => {
			const result = generateRuckusOption43(['172.16.1.50'], 'smartzone');
			expect(result.iosCommand).toContain('dhcp-profile');
			expect(result.iosCommand).toContain('option43 sub-option');
		});

		it('should calculate correct length', () => {
			const result = generateRuckusOption43(['172.16.1.50'], 'smartzone');
			// "172.16.1.50" is 11 characters = 0x0b
			expect(result.hex.substring(2, 4)).toBe('0b');
		});
	});

	describe('generateArubaOption43', () => {
		it('should generate correct ASCII hex', () => {
			const result = generateArubaOption43(['172.16.1.50']);
			expect(result.hex).toBe('3137322e31362e312e3530');
		});

		it('should use only first IP if multiple provided', () => {
			const result = generateArubaOption43(['172.16.1.50', '172.16.1.51']);
			expect(result.hex).toBe('3137322e31362e312e3530');
		});

		it('should have correct command format', () => {
			const result = generateArubaOption43(['172.16.1.50']);
			expect(result.iosCommand).toContain('ip dhcp');
			expect(result.iosCommand).toContain('option 43 hex');
			expect(result.commandLabel).toBe('Aruba OS Switch/Controller');
		});
	});

	describe('generateUniFiOption43', () => {
		it('should generate correct hex with prefix', () => {
			const result = generateUniFiOption43('192.168.1.20');
			expect(result.hex).toBe('0104c0a80114');
			expect(result.subOption).toBe(1);
		});

		it('should start with 0104 prefix', () => {
			const result = generateUniFiOption43('10.0.0.1');
			expect(result.hex.substring(0, 4)).toBe('0104');
		});

		it('should have EdgeRouter command format', () => {
			const result = generateUniFiOption43('192.168.1.20');
			expect(result.iosCommand).toContain('set service dhcp-server');
			expect(result.commandLabel).toBe('UniFi EdgeRouter/USG');
		});

		it('should have correct ISC DHCP format', () => {
			const result = generateUniFiOption43('192.168.1.20');
			expect(result.iscDhcp).toContain('option space ubnt');
			expect(result.iscDhcp).toContain('encapsulate ubnt');
		});
	});

	describe('generateExtremeOption43', () => {
		it('should generate correct ASCII hex', () => {
			const result = generateExtremeOption43(['172.16.1.50']);
			expect(result.hex).toBe('3137322e31362e312e3530');
		});

		it('should have Extreme-specific command', () => {
			const result = generateExtremeOption43(['172.16.1.50']);
			expect(result.iosCommand).toContain('configure dhcp-server');
			expect(result.commandLabel).toBe('Extreme Networks Switch');
		});
	});

	describe('generateOption43', () => {
		it('should route to correct vendor function', () => {
			const cisco = generateOption43('cisco-catalyst', ['192.168.1.10']);
			const meraki = generateOption43('cisco-meraki', ['192.168.10.5']);
			const ruckusSZ = generateOption43('ruckus-smartzone', ['10.0.0.1']);
			const ruckusZD = generateOption43('ruckus-zonedirector', ['10.0.0.1']);
			const aruba = generateOption43('aruba', ['172.16.1.50']);
			const unifi = generateOption43('unifi', ['192.168.1.20']);
			const extreme = generateOption43('extreme', ['10.0.0.1']);

			expect(cisco.hex).toBe('f104c0a8010a');
			expect(meraki.hex).toBe('3139322e3136382e31302e35');
			expect(ruckusSZ.hex.substring(0, 2)).toBe('06');
			expect(ruckusZD.hex.substring(0, 2)).toBe('03');
			expect(aruba.hex).toBe('3137322e31362e312e3530');
			expect(unifi.hex).toBe('0104c0a80114');
			expect(extreme.hex).toBeDefined();
		});

		it('should handle generic vendor type', () => {
			const result = generateOption43('generic', ['192.168.1.10']);
			expect(result.hex).toBe('f104c0a8010a'); // Uses Cisco format
		});

		it('should throw error for empty IP array', () => {
			expect(() => generateOption43('cisco-catalyst', [])).toThrow('At least one IP address is required');
		});

		it('should throw error for unsupported vendor', () => {
			expect(() => generateOption43('invalid-vendor' as VendorType, ['192.168.1.1'])).toThrow(
				'Unsupported vendor'
			);
		});
	});

	describe('isValidIPv4', () => {
		it('should validate correct IPv4 addresses', () => {
			expect(isValidIPv4('192.168.1.1')).toBe(true);
			expect(isValidIPv4('10.0.0.1')).toBe(true);
			expect(isValidIPv4('255.255.255.255')).toBe(true);
			expect(isValidIPv4('0.0.0.0')).toBe(true);
			expect(isValidIPv4('172.16.1.50')).toBe(true);
		});

		it('should reject invalid IPv4 addresses', () => {
			expect(isValidIPv4('256.1.1.1')).toBe(false);
			expect(isValidIPv4('192.168.1')).toBe(false);
			expect(isValidIPv4('192.168.1.1.1')).toBe(false);
			expect(isValidIPv4('192.168.-1.1')).toBe(false);
			expect(isValidIPv4('192.168.1.abc')).toBe(false);
			expect(isValidIPv4('not.an.ip.address')).toBe(false);
		});

		it('should reject leading zeros', () => {
			expect(isValidIPv4('192.168.01.1')).toBe(false);
			expect(isValidIPv4('192.168.001.1')).toBe(false);
		});

		it('should reject empty or invalid formats', () => {
			expect(isValidIPv4('')).toBe(false);
			expect(isValidIPv4('...')).toBe(false);
			expect(isValidIPv4('192.168.1.')).toBe(false);
			expect(isValidIPv4('.192.168.1.1')).toBe(false);
		});
	});

	describe('parseIPList', () => {
		it('should parse comma-separated IPs', () => {
			expect(parseIPList('192.168.1.1,192.168.1.2')).toEqual(['192.168.1.1', '192.168.1.2']);
		});

		it('should parse newline-separated IPs', () => {
			expect(parseIPList('192.168.1.1\n192.168.1.2')).toEqual(['192.168.1.1', '192.168.1.2']);
		});

		it('should parse mixed separators', () => {
			expect(parseIPList('192.168.1.1,192.168.1.2\n192.168.1.3')).toEqual([
				'192.168.1.1',
				'192.168.1.2',
				'192.168.1.3',
			]);
		});

		it('should trim whitespace', () => {
			expect(parseIPList('  192.168.1.1  ,  192.168.1.2  ')).toEqual(['192.168.1.1', '192.168.1.2']);
		});

		it('should filter empty strings', () => {
			expect(parseIPList('192.168.1.1,,192.168.1.2')).toEqual(['192.168.1.1', '192.168.1.2']);
			expect(parseIPList('192.168.1.1\n\n192.168.1.2')).toEqual(['192.168.1.1', '192.168.1.2']);
		});

		it('should handle single IP', () => {
			expect(parseIPList('192.168.1.1')).toEqual(['192.168.1.1']);
		});

		it('should return empty array for empty input', () => {
			expect(parseIPList('')).toEqual([]);
			expect(parseIPList('   ')).toEqual([]);
		});
	});

	describe('Integration tests', () => {
		it('should produce consistent results across formats', () => {
			const result = generateCiscoOption43(['192.168.1.10', '192.168.1.11']);
			const hexPairs = result.hex.match(/.{1,2}/g) || [];

			expect(result.colonHex).toBe(hexPairs.join(':'));
			expect(result.windowsBinary).toBe(hexPairs.join(' '));
			expect(result.infoblox).toBe(hexPairs.join(':'));
		});

		it('should handle real-world example from user', () => {
			// User's example: 192.168.1.10, 192.168.1.11 should produce f108c0a8010ac0a8010b
			const result = generateCiscoOption43(['192.168.1.10', '192.168.1.11']);
			expect(result.hex).toBe('f108c0a8010ac0a8010b');
		});

		it('should handle Ruckus example from user', () => {
			// User's example: 172.16.1.50 for Ruckus should produce 030b3137322e31362e312e3530
			const result = generateRuckusOption43(['172.16.1.50'], 'zonedirector');
			expect(result.hex).toBe('030b3137322e31362e312e3530');
		});
	});
});
