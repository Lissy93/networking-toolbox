import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClipboard } from '$lib/composables/useClipboard.svelte';
import { errorManager } from '$lib/utils/error-manager';

// Mock navigator.clipboard
const mockClipboard = {
	writeText: vi.fn(),
};

Object.assign(navigator, {
	clipboard: mockClipboard,
});

// Mock errorManager
vi.mock('$lib/utils/error-manager', () => ({
	errorManager: {
		captureException: vi.fn(),
	},
}));

describe('useClipboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('copy()', () => {
		it('should successfully copy text to clipboard', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard();

			const result = await clipboard.copy('test text');

			expect(result).toBe(true);
			expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
			expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
		});

		it('should set copied state to true after copying', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard();

			expect(clipboard.isCopied()).toBe(false);

			await clipboard.copy('test text');

			expect(clipboard.isCopied()).toBe(true);
		});

		it('should auto-reset copied state after default timeout (1500ms)', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('test text');
			expect(clipboard.isCopied()).toBe(true);

			// Fast-forward time by 1500ms
			vi.advanceTimersByTime(1500);

			expect(clipboard.isCopied()).toBe(false);
		});

		it('should respect custom auto-reset timeout', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard(3000);

			await clipboard.copy('test text');
			expect(clipboard.isCopied()).toBe(true);

			// After 1500ms, should still be copied
			vi.advanceTimersByTime(1500);
			expect(clipboard.isCopied()).toBe(true);

			// After 3000ms total, should be reset
			vi.advanceTimersByTime(1500);
			expect(clipboard.isCopied()).toBe(false);
		});

		it('should handle multiple copy IDs independently', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1', 'id1');
			await clipboard.copy('text 2', 'id2');

			expect(clipboard.isCopied('id1')).toBe(true);
			expect(clipboard.isCopied('id2')).toBe(true);

			// Advance time to reset id1
			vi.advanceTimersByTime(1500);

			expect(clipboard.isCopied('id1')).toBe(false);
			expect(clipboard.isCopied('id2')).toBe(false);
		});

		it('should handle clipboard API failures gracefully', async () => {
			const error = new Error('Clipboard access denied');
			mockClipboard.writeText.mockRejectedValueOnce(error);
			const clipboard = useClipboard();

			const result = await clipboard.copy('test text');

			expect(result).toBe(false);
			expect(clipboard.isCopied()).toBe(false);
			expect(errorManager.captureException).toHaveBeenCalledWith(
				error,
				'warn',
				expect.objectContaining({
					component: 'Clipboard',
					action: 'copy',
					id: 'default',
				})
			);
		});

		it('should log errors with custom ID', async () => {
			const error = new Error('Clipboard error');
			mockClipboard.writeText.mockRejectedValueOnce(error);
			const clipboard = useClipboard();

			await clipboard.copy('test text', 'custom-id');

			expect(errorManager.captureException).toHaveBeenCalledWith(
				error,
				'warn',
				expect.objectContaining({
					component: 'Clipboard',
					action: 'copy',
					id: 'custom-id',
				})
			);
		});
	});

	describe('isCopied()', () => {
		it('should return false by default', () => {
			const clipboard = useClipboard();

			expect(clipboard.isCopied()).toBe(false);
		});

		it('should return false for non-existent ID', () => {
			const clipboard = useClipboard();

			expect(clipboard.isCopied('non-existent')).toBe(false);
		});

		it('should track multiple IDs separately', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1', 'id1');

			expect(clipboard.isCopied('id1')).toBe(true);
			expect(clipboard.isCopied('id2')).toBe(false);
			expect(clipboard.isCopied()).toBe(false);
		});
	});

	describe('reset()', () => {
		it('should manually reset copied state for specific ID', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('test text', 'test-id');
			expect(clipboard.isCopied('test-id')).toBe(true);

			clipboard.reset('test-id');
			expect(clipboard.isCopied('test-id')).toBe(false);
		});

		it('should reset default ID when no ID specified', async () => {
			mockClipboard.writeText.mockResolvedValueOnce(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('test text');
			expect(clipboard.isCopied()).toBe(true);

			clipboard.reset();
			expect(clipboard.isCopied()).toBe(false);
		});

		it('should not affect other IDs', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1', 'id1');
			await clipboard.copy('text 2', 'id2');

			clipboard.reset('id1');

			expect(clipboard.isCopied('id1')).toBe(false);
			expect(clipboard.isCopied('id2')).toBe(true);
		});
	});

	describe('resetAll()', () => {
		it('should reset all copied states', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1', 'id1');
			await clipboard.copy('text 2', 'id2');
			await clipboard.copy('text 3', 'id3');

			expect(clipboard.isCopied('id1')).toBe(true);
			expect(clipboard.isCopied('id2')).toBe(true);
			expect(clipboard.isCopied('id3')).toBe(true);

			clipboard.resetAll();

			expect(clipboard.isCopied('id1')).toBe(false);
			expect(clipboard.isCopied('id2')).toBe(false);
			expect(clipboard.isCopied('id3')).toBe(false);
		});

		it('should clear copiedStates object', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text', 'test');
			clipboard.resetAll();

			expect(clipboard.copiedStates).toEqual({});
		});
	});

	describe('copiedStates getter', () => {
		it('should expose copiedStates as readonly', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1', 'id1');
			await clipboard.copy('text 2', 'id2');

			const states = clipboard.copiedStates;
			expect(states).toEqual({
				id1: true,
				id2: true,
			});
		});
	});

	describe('concurrent copy operations', () => {
		it('should handle rapid successive copies', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await clipboard.copy('text 1');
			await clipboard.copy('text 2');
			await clipboard.copy('text 3');

			expect(clipboard.isCopied()).toBe(true);
			expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
		});

		it('should handle simultaneous copies with different IDs', async () => {
			mockClipboard.writeText.mockResolvedValue(undefined);
			const clipboard = useClipboard();

			await Promise.all([
				clipboard.copy('text 1', 'id1'),
				clipboard.copy('text 2', 'id2'),
				clipboard.copy('text 3', 'id3'),
			]);

			expect(clipboard.isCopied('id1')).toBe(true);
			expect(clipboard.isCopied('id2')).toBe(true);
			expect(clipboard.isCopied('id3')).toBe(true);
		});
	});
});
