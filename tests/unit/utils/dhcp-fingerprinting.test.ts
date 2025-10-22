import { describe, it, expect } from 'vitest';
import {
	parseParameterList,
	searchFingerprints,
	formatParameterListToHex,
	formatParameterListDisplay,
} from '$lib/utils/dhcp-fingerprinting';

describe('dhcp-fingerprinting', () => {
	describe('parseParameterList', () => {
		it('should parse hex format', () => {
			const result = parseParameterList('0103060f');
			expect(result).toEqual([1, 3, 6, 15]);
		});

		it('should parse hex with spaces', () => {
			const result = parseParameterList('01 03 06 0f');
			expect(result).toEqual([1, 3, 6, 15]);
		});

		it('should parse comma-separated', () => {
			const result = parseParameterList('1,3,6,15');
			expect(result).toEqual([1, 3, 6, 15]);
		});

		it('should parse space-separated', () => {
			const result = parseParameterList('1 3 6 15');
			expect(result).toEqual([1, 3, 6, 15]);
		});

		it('should parse single number', () => {
			const result = parseParameterList('1');
			expect(result).toEqual([1]);
		});

		it('should handle leading zeros in hex', () => {
			const result = parseParameterList('010306');
			expect(result).toEqual([1, 3, 6]);
		});
	});

	describe('formatParameterListToHex', () => {
		it('should format to hex', () => {
			const result = formatParameterListToHex([1, 3, 6, 15]);
			expect(result).toBe('0103060f');
		});

		it('should pad single digit hex', () => {
			const result = formatParameterListToHex([1, 255]);
			expect(result).toBe('01ff');
		});

		it('should handle empty array', () => {
			const result = formatParameterListToHex([]);
			expect(result).toBe('');
		});
	});

	describe('formatParameterListDisplay', () => {
		it('should format with commas', () => {
			const result = formatParameterListDisplay([1, 3, 6, 15]);
			expect(result).toBe('1, 3, 6, 15');
		});

		it('should handle single value', () => {
			const result = formatParameterListDisplay([1]);
			expect(result).toBe('1');
		});

		it('should handle empty array', () => {
			const result = formatParameterListDisplay([]);
			expect(result).toBe('');
		});
	});

	describe('searchFingerprints', () => {
		it('should find Windows 10/11 exact match', () => {
			const params = [1, 3, 6, 15, 31, 33, 43, 44, 46, 47, 119, 121, 249, 252];
			const matches = searchFingerprints(params);

			expect(matches.length).toBeGreaterThan(0);
			const win10Match = matches.find((m) => m.fingerprint.id === 'win10');
			expect(win10Match).toBeDefined();
			expect(win10Match!.matchScore).toBe(100);
		});

		it('should find macOS match', () => {
			const params = [1, 3, 6, 15, 119, 252];
			const matches = searchFingerprints(params);

			expect(matches.length).toBeGreaterThan(0);
			const macMatch = matches.find((m) => m.fingerprint.id === 'macos');
			expect(macMatch).toBeDefined();
			expect(macMatch!.matchScore).toBe(100);
		});

		it('should find Android match with vendor class', () => {
			const params = [1, 3, 6, 15, 26, 28, 51, 58, 59, 43];
			const matches = searchFingerprints(params, 'dhcpcd');

			expect(matches.length).toBeGreaterThan(0);
			const androidMatch = matches.find((m) => m.fingerprint.id === 'android');
			expect(androidMatch).toBeDefined();
			expect(androidMatch!.matchedOn).toContain('Vendor Class');
		});

		it('should find partial match', () => {
			const params = [1, 3, 6, 15]; // Subset of many fingerprints
			const matches = searchFingerprints(params);

			expect(matches.length).toBeGreaterThan(0);
			// Should have at least some matches
			expect(matches.some((m) => m.matchScore >= 50)).toBe(true);
		});

		it('should sort by match score', () => {
			const params = [1, 3, 6, 15, 31, 33, 43, 44, 46, 47, 119, 121, 249, 252];
			const matches = searchFingerprints(params);

			// Verify descending order
			for (let i = 1; i < matches.length; i++) {
				expect(matches[i - 1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore);
			}
		});

		it('should not match with very low score', () => {
			const params = [99, 98, 97]; // Random options unlikely to match
			const matches = searchFingerprints(params);

			// Should have very few or no matches
			expect(matches.length).toBeLessThan(3);
		});

		it('should identify Linux dhclient', () => {
			const params = [1, 3, 6, 15, 26, 28, 42];
			const matches = searchFingerprints(params);

			const linuxMatch = matches.find((m) => m.fingerprint.id === 'linux-dhclient');
			expect(linuxMatch).toBeDefined();
			expect(linuxMatch!.matchScore).toBe(100);
		});

		it('should handle empty parameter list', () => {
			const matches = searchFingerprints([]);
			expect(matches).toEqual([]);
		});

		it('should boost score for vendor class match', () => {
			const params = [1, 3, 6]; // Partial match
			const matchesWithoutVendor = searchFingerprints(params);
			const matchesWithVendor = searchFingerprints(params, 'Cisco');

			// Cisco matches should have higher scores when vendor is provided
			const ciscoWithVendor = matchesWithVendor.find((m) => m.fingerprint.id === 'cisco-phone');
			const ciscoWithoutVendor = matchesWithoutVendor.find((m) => m.fingerprint.id === 'cisco-phone');

			if (ciscoWithVendor && ciscoWithoutVendor) {
				expect(ciscoWithVendor.matchScore).toBeGreaterThan(ciscoWithoutVendor.matchScore);
			}
		});

		it('should indicate exact match in matchedOn', () => {
			const params = [1, 3, 6, 15, 119, 252];
			const matches = searchFingerprints(params);

			const macMatch = matches.find((m) => m.fingerprint.id === 'macos');
			expect(macMatch).toBeDefined();
			expect(macMatch!.matchedOn.some((m) => m.includes('Exact'))).toBe(true);
		});
	});
});
