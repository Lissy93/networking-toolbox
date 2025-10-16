import { describe, it, expect } from 'vitest';
import {
	formatBytes,
	formatNumber,
	getStatusClass,
	formatMilliseconds,
	formatPercentage,
} from '$lib/utils/formatters';

describe('formatters', () => {
	describe('formatBytes()', () => {
		it('should format zero as "0 B"', () => {
			expect(formatBytes(0)).toBe('0 B');
		});

		it('should format bytes (< 1024)', () => {
			expect(formatBytes(1)).toBe('1 B');
			expect(formatBytes(512)).toBe('512 B');
			expect(formatBytes(1023)).toBe('1023 B');
		});

		it('should format kilobytes', () => {
			expect(formatBytes(1024)).toBe('1 KB');
			expect(formatBytes(1536)).toBe('1.5 KB');
			expect(formatBytes(2048)).toBe('2 KB');
			expect(formatBytes(1048575)).toBe('1024 KB');
		});

		it('should format megabytes', () => {
			expect(formatBytes(1048576)).toBe('1 MB');
			expect(formatBytes(1572864)).toBe('1.5 MB');
			expect(formatBytes(5242880)).toBe('5 MB');
		});

		it('should format gigabytes', () => {
			expect(formatBytes(1073741824)).toBe('1 GB');
			expect(formatBytes(1610612736)).toBe('1.5 GB');
			expect(formatBytes(5368709120)).toBe('5 GB');
		});

		it('should format terabytes', () => {
			expect(formatBytes(1099511627776)).toBe('1 TB');
			expect(formatBytes(1649267441664)).toBe('1.5 TB');
		});

		it('should round to 2 decimal places', () => {
			expect(formatBytes(1234)).toBe('1.21 KB');
			expect(formatBytes(1234567)).toBe('1.18 MB');
			expect(formatBytes(1234567890)).toBe('1.15 GB');
		});

		it('should handle very small values', () => {
			expect(formatBytes(1)).toBe('1 B');
			expect(formatBytes(10)).toBe('10 B');
		});

		it('should handle fractional bytes', () => {
			expect(formatBytes(1024.5)).toBe('1 KB');
			expect(formatBytes(1536.7)).toBe('1.5 KB');
		});
	});

	describe('formatNumber()', () => {
		it('should format zero', () => {
			expect(formatNumber(0)).toBe('0');
		});

		it('should format single digit numbers', () => {
			expect(formatNumber(1)).toBe('1');
			expect(formatNumber(9)).toBe('9');
		});

		it('should format small numbers without separators', () => {
			expect(formatNumber(10)).toBe('10');
			expect(formatNumber(99)).toBe('99');
			expect(formatNumber(999)).toBe('999');
		});

		it('should format thousands with separators', () => {
			expect(formatNumber(1000)).toBe('1,000');
			expect(formatNumber(1234)).toBe('1,234');
			expect(formatNumber(9999)).toBe('9,999');
		});

		it('should format millions with separators', () => {
			expect(formatNumber(1000000)).toBe('1,000,000');
			expect(formatNumber(1234567)).toBe('1,234,567');
		});

		it('should format billions with separators', () => {
			expect(formatNumber(1000000000)).toBe('1,000,000,000');
			expect(formatNumber(1234567890)).toBe('1,234,567,890');
		});

		it('should handle negative numbers', () => {
			expect(formatNumber(-1)).toBe('-1');
			expect(formatNumber(-1000)).toBe('-1,000');
			expect(formatNumber(-1234567)).toBe('-1,234,567');
		});

		it('should handle decimal numbers', () => {
			expect(formatNumber(1234.56)).toBe('1,234.56');
			expect(formatNumber(1000000.123)).toBe('1,000,000.123');
		});

		it('should handle very large numbers', () => {
			expect(formatNumber(1000000000000)).toBe('1,000,000,000,000');
			expect(formatNumber(999999999999999)).toBe('999,999,999,999,999');
		});

		it('should handle fractional values', () => {
			expect(formatNumber(0.5)).toBe('0.5');
			expect(formatNumber(0.123)).toBe('0.123');
			expect(formatNumber(1.5)).toBe('1.5');
		});
	});

	describe('getStatusClass()', () => {
		describe('2xx - Success', () => {
			it('should return "success" for 200 OK', () => {
				expect(getStatusClass(200)).toBe('success');
			});

			it('should return "success" for 201 Created', () => {
				expect(getStatusClass(201)).toBe('success');
			});

			it('should return "success" for 204 No Content', () => {
				expect(getStatusClass(204)).toBe('success');
			});

			it('should return "success" for any 2xx code', () => {
				expect(getStatusClass(299)).toBe('success');
			});
		});

		describe('3xx - Redirection', () => {
			it('should return "warning" for 301 Moved Permanently', () => {
				expect(getStatusClass(301)).toBe('warning');
			});

			it('should return "warning" for 302 Found', () => {
				expect(getStatusClass(302)).toBe('warning');
			});

			it('should return "warning" for 304 Not Modified', () => {
				expect(getStatusClass(304)).toBe('warning');
			});

			it('should return "warning" for any 3xx code', () => {
				expect(getStatusClass(399)).toBe('warning');
			});
		});

		describe('4xx - Client Error', () => {
			it('should return "error" for 400 Bad Request', () => {
				expect(getStatusClass(400)).toBe('error');
			});

			it('should return "error" for 401 Unauthorized', () => {
				expect(getStatusClass(401)).toBe('error');
			});

			it('should return "error" for 403 Forbidden', () => {
				expect(getStatusClass(403)).toBe('error');
			});

			it('should return "error" for 404 Not Found', () => {
				expect(getStatusClass(404)).toBe('error');
			});

			it('should return "error" for any 4xx code', () => {
				expect(getStatusClass(499)).toBe('error');
			});
		});

		describe('5xx - Server Error', () => {
			it('should return "error" for 500 Internal Server Error', () => {
				expect(getStatusClass(500)).toBe('error');
			});

			it('should return "error" for 502 Bad Gateway', () => {
				expect(getStatusClass(502)).toBe('error');
			});

			it('should return "error" for 503 Service Unavailable', () => {
				expect(getStatusClass(503)).toBe('error');
			});

			it('should return "error" for any 5xx code', () => {
				expect(getStatusClass(599)).toBe('error');
			});
		});

		describe('Edge cases', () => {
			it('should return empty string for codes < 200', () => {
				expect(getStatusClass(100)).toBe('');
				expect(getStatusClass(199)).toBe('');
			});

			it('should return empty string for 0', () => {
				expect(getStatusClass(0)).toBe('');
			});

			it('should return empty string for negative codes', () => {
				expect(getStatusClass(-1)).toBe('');
			});

			it('should handle 600+ codes as error', () => {
				expect(getStatusClass(600)).toBe('error');
				expect(getStatusClass(999)).toBe('error');
			});
		});
	});

	describe('formatMilliseconds()', () => {
		it('should format with default 0 decimals', () => {
			expect(formatMilliseconds(0)).toBe('0ms');
			expect(formatMilliseconds(1)).toBe('1ms');
			expect(formatMilliseconds(100)).toBe('100ms');
			expect(formatMilliseconds(1234)).toBe('1234ms');
		});

		it('should format with 1 decimal place', () => {
			expect(formatMilliseconds(1234, 1)).toBe('1234.0ms');
			expect(formatMilliseconds(1234.5, 1)).toBe('1234.5ms');
			expect(formatMilliseconds(1234.56, 1)).toBe('1234.6ms');
		});

		it('should format with 2 decimal places', () => {
			expect(formatMilliseconds(1234, 2)).toBe('1234.00ms');
			expect(formatMilliseconds(1234.5, 2)).toBe('1234.50ms');
			expect(formatMilliseconds(1234.56, 2)).toBe('1234.56ms');
			expect(formatMilliseconds(1234.567, 2)).toBe('1234.57ms');
		});

		it('should format with 3 decimal places', () => {
			expect(formatMilliseconds(1234.567, 3)).toBe('1234.567ms');
			expect(formatMilliseconds(1234.5678, 3)).toBe('1234.568ms');
		});

		it('should handle zero with decimals', () => {
			expect(formatMilliseconds(0, 2)).toBe('0.00ms');
			expect(formatMilliseconds(0, 3)).toBe('0.000ms');
		});

		it('should handle negative values', () => {
			expect(formatMilliseconds(-100)).toBe('-100ms');
			expect(formatMilliseconds(-100, 2)).toBe('-100.00ms');
		});

		it('should handle very small values', () => {
			expect(formatMilliseconds(0.1, 2)).toBe('0.10ms');
			expect(formatMilliseconds(0.001, 3)).toBe('0.001ms');
		});

		it('should handle large values', () => {
			expect(formatMilliseconds(60000)).toBe('60000ms');
			expect(formatMilliseconds(60000, 1)).toBe('60000.0ms');
		});
	});

	describe('formatPercentage()', () => {
		it('should format with default 0 decimals', () => {
			expect(formatPercentage(0)).toBe('0%');
			expect(formatPercentage(0.5)).toBe('50%');
			expect(formatPercentage(0.75)).toBe('75%');
			expect(formatPercentage(1)).toBe('100%');
		});

		it('should format with 1 decimal place', () => {
			expect(formatPercentage(0.5, 1)).toBe('50.0%');
			expect(formatPercentage(0.755, 1)).toBe('75.5%');
			expect(formatPercentage(0.7567, 1)).toBe('75.7%');
		});

		it('should format with 2 decimal places', () => {
			expect(formatPercentage(0.5, 2)).toBe('50.00%');
			expect(formatPercentage(0.7567, 2)).toBe('75.67%');
			expect(formatPercentage(0.123456, 2)).toBe('12.35%');
		});

		it('should format with 3 decimal places', () => {
			expect(formatPercentage(0.123456, 3)).toBe('12.346%');
			expect(formatPercentage(0.999999, 3)).toBe('100.000%');
		});

		it('should handle 0 percent', () => {
			expect(formatPercentage(0)).toBe('0%');
			expect(formatPercentage(0, 2)).toBe('0.00%');
		});

		it('should handle 100 percent', () => {
			expect(formatPercentage(1)).toBe('100%');
			expect(formatPercentage(1, 2)).toBe('100.00%');
		});

		it('should handle values > 1', () => {
			expect(formatPercentage(1.5)).toBe('150%');
			expect(formatPercentage(2)).toBe('200%');
			expect(formatPercentage(2.5, 1)).toBe('250.0%');
		});

		it('should handle negative values', () => {
			expect(formatPercentage(-0.5)).toBe('-50%');
			expect(formatPercentage(-0.25, 2)).toBe('-25.00%');
		});

		it('should handle very small percentages', () => {
			expect(formatPercentage(0.001)).toBe('0%');
			expect(formatPercentage(0.001, 1)).toBe('0.1%');
			expect(formatPercentage(0.001, 2)).toBe('0.10%');
		});

		it('should handle very large percentages', () => {
			expect(formatPercentage(10)).toBe('1000%');
			expect(formatPercentage(100)).toBe('10000%');
		});

		it('should round correctly', () => {
			expect(formatPercentage(0.456, 0)).toBe('46%');
			expect(formatPercentage(0.454, 0)).toBe('45%');
			expect(formatPercentage(0.9999, 2)).toBe('99.99%');
		});
	});

	describe('Integration scenarios', () => {
		it('should format network efficiency metrics consistently', () => {
			const totalAddresses = 256;
			const usableHosts = 254;
			const utilization = usableHosts / totalAddresses;

			expect(formatNumber(totalAddresses)).toBe('256');
			expect(formatNumber(usableHosts)).toBe('254');
			expect(formatPercentage(utilization, 1)).toBe('99.2%');
		});

		it('should format file sizes consistently', () => {
			const sizes = [512, 1536, 5242880];
			const formatted = sizes.map(formatBytes);

			expect(formatted).toEqual(['512 B', '1.5 KB', '5 MB']);
		});

		it('should format HTTP response metrics', () => {
			const statuses = [200, 301, 404, 500];
			const classes = statuses.map(getStatusClass);

			expect(classes).toEqual(['success', 'warning', 'error', 'error']);
		});

		it('should format timing data consistently', () => {
			const responseTime = 1234.567;

			expect(formatMilliseconds(responseTime)).toBe('1235ms');
			expect(formatMilliseconds(responseTime, 2)).toBe('1234.57ms');
		});
	});
});
