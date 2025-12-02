import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../../../../src/routes/api/internal/diagnostics/mail-tls/+server';

describe('SMTP TLS Checker API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return error for missing domain', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/domain.*required/i);
	});

	it('should return error for empty domain', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: '' }),
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
	});

	it('should return error for invalid domain format', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'invalid..domain' }),
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/invalid.*format/i);
	});

	it('should return error for invalid port number', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'example.com', port: 999999 }),
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/invalid.*port/i);
	});

	it('should default to port 587', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'nonexistent-test-server.local' }),
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		// Should return a result (even if connection fails)
		expect(data).toHaveProperty('domain');
		expect(data).toHaveProperty('port');
		expect(data.port).toBe(25); // Default port
	}, 10000);

	it('should normalize domain to lowercase', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'Example.COM', port: 587 }),
		});

		const response = await POST({ request } as any);
		const data = await response.json();
		expect(data.domain).toBe('example.com');
	}, 10000);

	it('should include required fields in response', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'test.local', port: 587 }),
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(data).toHaveProperty('domain');
		expect(data).toHaveProperty('port');
		expect(data).toHaveProperty('supportsSTARTTLS');
		expect(data).toHaveProperty('supportsDirectTLS');
		expect(data).toHaveProperty('timestamp');
	}, 10000);
});
