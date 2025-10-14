import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIHandler, type APIResponse } from '../../../src/lib/utils/api-handler';
import * as apiRegistry from '../../../src/lib/utils/api-registry';

// Mock SvelteKit functions
vi.mock('@sveltejs/kit', () => ({
  json: vi.fn((data, init) => ({
    json: () => Promise.resolve(data),
    status: init?.status || 200
  })),
  error: vi.fn((status, message) => ({
    status,
    text: () => Promise.resolve(message),
    json: () => Promise.resolve({ message })
  }))
}));

// Mock api-registry
vi.mock('../../../src/lib/utils/api-registry', () => ({
  getAPIHandler: vi.fn()
}));

describe('API Handler', () => {
  let mockRequest: any;
  let mockParams: any;
  let handler: { POST: any; GET: any };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      json: vi.fn().mockResolvedValue({ input: 'test' })
    };

    mockParams = {
      tool: 'test-tool'
    };

    handler = createAPIHandler('test-category');
  });

  describe('createAPIHandler', () => {
    it('should return POST and GET handlers', () => {
      expect(handler).toHaveProperty('POST');
      expect(handler).toHaveProperty('GET');
      expect(typeof handler.POST).toBe('function');
      expect(typeof handler.GET).toBe('function');
    });
  });

  describe('POST Handler', () => {
    it('should handle successful requests', async () => {
      const mockEndpoint = {
        handler: vi.fn().mockResolvedValue({ output: 'success' }),
        description: 'Test endpoint',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      const result = await handler.POST({ params: mockParams, request: mockRequest });

      expect(apiRegistry.getAPIHandler).toHaveBeenCalledWith('test-category', 'test-tool');
      expect(mockRequest.json).toHaveBeenCalled();
      expect(mockEndpoint.handler).toHaveBeenCalledWith({ input: 'test' });

      const data = await result.json();
      expect(data).toEqual({
        success: true,
        tool: 'test-tool',
        result: { output: 'success' }
      });
    });

    it('should handle missing tool parameter', async () => {
      const mockParamsNoTool = {};

      const result = await handler.POST({ params: mockParamsNoTool, request: mockRequest });

      expect(result.status).toBe(400);
      const message = await result.text();
      expect(message).toBe('Tool parameter is required');
    });

    it('should handle tool not found', async () => {
      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(null);

      const result = await handler.POST({ params: mockParams, request: mockRequest });

      expect(result.status).toBe(404);
      const message = await result.text();
      expect(message).toBe("Tool 'test-tool' not found in test-category category");
    });

    it('should handle endpoint handler errors', async () => {
      const mockEndpoint = {
        handler: vi.fn().mockRejectedValue(new Error('Handler error')),
        description: 'Test endpoint',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      const result = await handler.POST({ params: mockParams, request: mockRequest });
      const data = await result.json();

      expect(data).toEqual({
        success: false,
        error: 'Handler error',
        tool: 'test-tool'
      });
      expect(result.status).toBe(500);
    });

    it('should handle non-Error exceptions', async () => {
      const mockEndpoint = {
        handler: vi.fn().mockRejectedValue('String error'),
        description: 'Test endpoint',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      const result = await handler.POST({ params: mockParams, request: mockRequest });
      const data = await result.json();

      expect(data).toEqual({
        success: false,
        error: 'An error occurred',
        tool: 'test-tool'
      });
    });

    it('should handle JSON parsing errors', async () => {
      mockRequest.json.mockRejectedValue(new Error('Invalid JSON'));

      const mockEndpoint = {
        handler: vi.fn(),
        description: 'Test endpoint',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      const result = await handler.POST({ params: mockParams, request: mockRequest });
      const data = await result.json();

      expect(data).toEqual({
        success: false,
        error: 'Invalid JSON',
        tool: 'test-tool'
      });
      expect(mockEndpoint.handler).not.toHaveBeenCalled();
    });
  });

  describe('GET Handler', () => {
    it('should return endpoint information', async () => {
      const mockEndpoint = {
        handler: vi.fn(),
        description: 'Test endpoint description',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      const result = await handler.GET({ params: mockParams });
      const data = await result.json();

      expect(data).toEqual({
        tool: 'test-tool',
        category: 'test-category',
        description: 'Test endpoint description',
        method: 'POST',
        message: 'Send a POST request with parameters in the body'
      });
    });

    it('should handle missing tool parameter', async () => {
      const mockParamsNoTool = {};

      const result = await handler.GET({ params: mockParamsNoTool });

      expect(result.status).toBe(400);
      const message = await result.text();
      expect(message).toBe('Tool parameter is required');
    });

    it('should handle tool not found', async () => {
      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(null);

      const result = await handler.GET({ params: mockParams });

      expect(result.status).toBe(404);
      const message = await result.text();
      expect(message).toBe("Tool 'test-tool' not found in test-category category");
    });
  });

  describe('Error Handling', () => {
    it('should log errors via logger', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockEndpoint = {
        handler: vi.fn().mockRejectedValue(new Error('Test error')),
        description: 'Test endpoint',
        category: 'test-category'
      };

      vi.mocked(apiRegistry.getAPIHandler).mockReturnValue(mockEndpoint);

      await handler.POST({ params: mockParams, request: mockRequest });

      // Logger transforms the error and context
      expect(consoleSpy).toHaveBeenCalledWith(
        'API Error in test-category/test-tool',
        expect.objectContaining({
          category: 'test-category',
          tool: 'test-tool',
          component: 'APIHandler',
          errorName: 'Error',
          errorMessage: 'Test error'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for APIResponse', () => {
      // This test ensures the APIResponse interface is properly exported and typed
      const response: APIResponse<{ test: string }> = {
        success: true,
        tool: 'test',
        result: { test: 'value' }
      };

      expect(response.success).toBe(true);
      expect(response.tool).toBe('test');
      expect(response.result?.test).toBe('value');
    });

    it('should handle error responses', () => {
      const errorResponse: APIResponse = {
        success: false,
        tool: 'test',
        error: 'Test error'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Test error');
      expect(errorResponse.result).toBeUndefined();
    });
  });
});