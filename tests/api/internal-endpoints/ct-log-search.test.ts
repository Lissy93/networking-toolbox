import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from '../utils/api-test-helpers';

describe('CT Log Search API', () => {
	async function makeRequest(domain: string) {
		const response = await fetch(`${API_BASE_URL}/api/internal/diagnostics/ct-log-search`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain })
		});
		const data = await response.json();
		return { status: response.status, data };
	}

	describe('Valid Domain Searches', () => {
		it('should search example.com', async () => {
			const { status, data } = await makeRequest('example.com');

			// External service (crt.sh) may be unavailable or rate limiting
			// Accept both success (200) and service error (500)
			if (status === 500) {
				expect(data.message).toMatch(/CT log search failed|timeout|fetch/i);
				return; // Skip remaining assertions when service is unavailable
			}

			expect(status).toBe(200);
			expect(data.domain).toBe('example.com');
			expect(data.certificates).toBeInstanceOf(Array);
			expect(data.totalCertificates).toBeGreaterThanOrEqual(0);
			expect(data.discoveredHostnames).toBeInstanceOf(Array);
			expect(data.issuers).toBeInstanceOf(Array);
			expect(data.validCertificates).toBeGreaterThanOrEqual(0);
			expect(data.expiringSoon).toBeGreaterThanOrEqual(0);
			expect(data.wildcardCertificates).toBeGreaterThanOrEqual(0);
			expect(data.timestamp).toBeDefined();
		});

		it('should include required certificate fields', async () => {
			const { status, data } = await makeRequest('example.com');

			if (status === 500) return; // Skip when service unavailable

			expect(status).toBe(200);
			expect(data.certificates.length).toBeGreaterThan(0);

			const cert = data.certificates[0];
			expect(cert).toHaveProperty('id');
			expect(cert).toHaveProperty('commonName');
			expect(cert).toHaveProperty('sans');
			expect(cert).toHaveProperty('issuer');
			expect(cert).toHaveProperty('issuerId');
			expect(cert).toHaveProperty('entryTimestamp');
			expect(cert).toHaveProperty('notBefore');
			expect(cert).toHaveProperty('notAfter');
			expect(cert).toHaveProperty('serialNumber');
			expect(cert).toHaveProperty('isValid');
			expect(cert).toHaveProperty('daysUntilExpiry');
			expect(cert).toHaveProperty('isWildcard');
			expect(cert).toHaveProperty('ctLogUrl');
		});

		it('should discover hostnames from SANs', async () => {
			const { status, data } = await makeRequest('example.com');

			if (status === 500) return; // Skip when service unavailable

			expect(status).toBe(200);
			expect(data.discoveredHostnames).toBeInstanceOf(Array);
			expect(data.discoveredHostnames.length).toBeGreaterThan(0);
		});

		it('should aggregate issuer statistics', async () => {
			const { status, data } = await makeRequest('example.com');

			if (status === 500) return; // Skip when service unavailable

			expect(status).toBe(200);
			expect(data.issuers).toBeInstanceOf(Array);

			if (data.issuers.length > 0) {
				const issuer = data.issuers[0];
				expect(issuer).toHaveProperty('name');
				expect(issuer).toHaveProperty('count');
				expect(typeof issuer.name).toBe('string');
				expect(typeof issuer.count).toBe('number');
			}
		});
	});

	describe('Error Handling', () => {
		it('should reject empty domain', async () => {
			const { status, data } = await makeRequest('');

			expect(status).toBe(400);
			expect(data.message).toMatch(/domain.*required/i);
		});

		it('should reject missing domain', async () => {
			const response = await fetch(`${API_BASE_URL}/api/internal/diagnostics/ct-log-search`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.message).toMatch(/domain.*required/i);
		});

		it('should reject invalid domain format', async () => {
			const { status, data } = await makeRequest('invalid..domain');

			expect(status).toBe(400);
			expect(data.message).toMatch(/invalid|format/i);
		});

		it('should handle domain with no certificates', async () => {
			const { status, data } = await makeRequest('this-domain-has-no-certificates-123456789.example');

			if (status === 500) return; // Skip when service unavailable

			expect(status).toBe(200);
			expect(data.totalCertificates).toBe(0);
			expect(data.certificates).toHaveLength(0);
			expect(data.discoveredHostnames).toHaveLength(0);
		});
	});
});
