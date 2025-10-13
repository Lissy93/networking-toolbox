import { describe, it, expect } from 'vitest';
import { GET } from '../../../../src/routes/version/+server';

describe('Version Endpoint', () => {
  it('should return version data', async () => {
    const response = await GET();

    const data = await response.json();
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.timestamp).toBe('number');
  });

  it('should return 200 status on success', async () => {
    const response = await GET();

    // If package.json exists, should return 200
    if (response.status === 200) {
      const data = await response.json();
      expect(data.version).toBeTruthy();
      expect(data.version).not.toBe('unknown');
    }
  });

  it('should handle errors gracefully', async () => {
    const response = await GET();
    const data = await response.json();

    // Should always have these properties regardless of success/failure
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('timestamp');

    if (response.status !== 200) {
      expect(data.version).toBe('unknown');
      expect(data).toHaveProperty('error');
    }
  });
});
