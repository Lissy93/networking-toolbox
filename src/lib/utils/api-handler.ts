import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getAPIHandler } from './api-registry.js';
import { logger } from './logger';

export interface APIResponse<T = any> {
  success: boolean;
  tool: string;
  result?: T;
  error?: string;
}

export function createAPIHandler(category: string): {
  POST: RequestHandler;
  GET: RequestHandler;
} {
  const POST: RequestHandler = async ({ params, request }) => {
    const { tool } = params;
    if (!tool) {
      return error(400, 'Tool parameter is required');
    }

    try {
      const endpoint = getAPIHandler(category, tool);
      if (!endpoint) {
        return error(404, `Tool '${tool}' not found in ${category} category`);
      }

      const body = await request.json();
      const result = await endpoint.handler(body);

      return json({
        success: true,
        tool,
        result,
      });
    } catch (err) {
      logger.error(`API Error in ${category}/${tool}`, err, { category, tool, component: 'APIHandler' });
      return json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'An error occurred',
          tool,
        },
        { status: 500 },
      );
    }
  };

  const GET: RequestHandler = async ({ params }) => {
    const { tool } = params;
    if (!tool) {
      return error(400, 'Tool parameter is required');
    }

    const endpoint = getAPIHandler(category, tool);

    if (!endpoint) {
      return error(404, `Tool '${tool}' not found in ${category} category`);
    }

    return json({
      tool,
      category,
      description: endpoint.description,
      method: 'POST',
      message: 'Send a POST request with parameters in the body',
    });
  };

  return { POST, GET };
}
