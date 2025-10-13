import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../../../../src/routes/api/internal/diagnostics/greylist/+server';

// Mock node:net to avoid real TCP connections
const mockSocket = {
	connect: vi.fn(),
	setTimeout: vi.fn(),
	write: vi.fn(),
	destroy: vi.fn(),
	on: vi.fn((event: string, callback: Function) => {
		// Immediately trigger callbacks for successful connection test
		if (event === 'data') {
			// Simulate SMTP greeting
			setTimeout(() => callback(Buffer.from('220 test.local ESMTP ready\r\n')), 10);
		} else if (event === 'error') {
			// Simulate connection error for real tests
			setTimeout(() => callback(new Error('Connection refused')), 10);
		}
		return mockSocket;
	})
};

vi.mock('node:net', () => ({
	default: {
		connect: vi.fn(() => mockSocket)
	},
	connect: vi.fn(() => mockSocket)
}));

describe('Greylisting Tester API', () => {
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
			body: JSON.stringify({})
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
			body: JSON.stringify({ domain: '' })
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
	});

	it('should return error for invalid domain format', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'invalid..domain' })
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
			body: JSON.stringify({ domain: 'example.com', port: 999999 })
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/invalid.*port/i);
	});

	it('should return error for invalid attempts count', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'example.com', attempts: 10 })
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/attempts.*between/i);
	});

	it('should return error for invalid delay', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'example.com', delayBetweenAttempts: 500 })
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.message).toMatch(/delay.*between/i);
	});

	it('should default to port 25 and 3 attempts', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'nonexistent-test-server.local', attempts: 2, delayBetweenAttempts: 1 })
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(data).toHaveProperty('domain');
		expect(data).toHaveProperty('port');
		expect(data.port).toBe(25);
	});

	it('should normalize domain to lowercase', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'Example.COM', attempts: 2, delayBetweenAttempts: 1 })
		});

		const response = await POST({ request } as any);
		const data = await response.json();
		expect(data.domain).toBe('example.com');
	});

	it('should include required fields in response', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'test.local', port: 25, attempts: 2, delayBetweenAttempts: 1 })
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(data).toHaveProperty('domain');
		expect(data).toHaveProperty('port');
		expect(data).toHaveProperty('implementsGreylisting');
		expect(data).toHaveProperty('attempts');
		expect(data).toHaveProperty('analysis');
		expect(data).toHaveProperty('timestamp');

		expect(typeof data.implementsGreylisting).toBe('boolean');
		expect(Array.isArray(data.attempts)).toBe(true);
		expect(data.analysis).toHaveProperty('confidence');
	});

	it('should include attempt details in response', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ domain: 'test.local', attempts: 2, delayBetweenAttempts: 1 })
		});

		const response = await POST({ request } as any);
		const data = await response.json();

		expect(data.attempts.length).toBeGreaterThan(0);
		data.attempts.forEach((attempt: any) => {
			expect(attempt).toHaveProperty('attemptNumber');
			expect(attempt).toHaveProperty('timestamp');
			expect(attempt).toHaveProperty('connected');
			expect(attempt).toHaveProperty('duration');
		});
	});
});
