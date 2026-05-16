import { All, Controller } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Req, Res } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  /**
   * Stateless: new McpServer + transport per request.
   * No session Map, no cleanup needed.
   * Handles GET (SSE stream) and POST (JSON-RPC) per MCP Streamable HTTP spec.
   */
  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = this.mcpService.buildServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
