import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WhiteboardGateway } from '../whiteboard/whiteboard.gateway';

type ExcalidrawElement = Record<string, unknown>;

function makeBase(type: string): ExcalidrawElement {
  return {
    id: crypto.randomUUID(),
    type,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1_000_000),
    isDeleted: false,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1_000_000),
    updated: Date.now(),
    link: null,
    locked: false,
    boundElements: null,
  };
}

@Injectable()
export class McpService {
  constructor(private readonly gateway: WhiteboardGateway) {}

  buildServer(): McpServer {
    const server = new McpServer({ name: 'netboard', version: '1.0.0' });
    this.registerTools(server);
    return server;
  }

  private registerTools(server: McpServer): void {
    server.registerTool(
      'get_board_state',
      {
        description: 'Get current Excalidraw elements on the board',
        inputSchema: { sessionId: z.string() },
      },
      async ({ sessionId }) => {
        const elements = await this.gateway.getCurrentElements(sessionId);
        return {
          content: [{ type: 'text', text: JSON.stringify(elements ?? []) }],
        };
      },
    );

    server.registerTool(
      'clear_board',
      {
        description: 'Remove all elements from the board',
        inputSchema: { sessionId: z.string() },
      },
      async ({ sessionId }) => {
        await this.gateway.injectElements(sessionId, []);
        return { content: [{ type: 'text', text: 'Board cleared' }] };
      },
    );

    server.registerTool(
      'add_elements',
      {
        description: 'Add raw Excalidraw elements to the board (merges with existing)',
        inputSchema: {
          sessionId: z.string(),
          elements: z.array(z.record(z.string(), z.unknown())),
        },
      },
      async ({ sessionId, elements }) => {
        const existing = (await this.gateway.getCurrentElements(sessionId)) ?? [];
        await this.gateway.injectElements(sessionId, [...existing, ...elements]);
        return {
          content: [{ type: 'text', text: `Added ${elements.length} element(s)` }],
        };
      },
    );

    server.registerTool(
      'draw_shape',
      {
        description: 'Draw a shape on the board. type: rectangle | ellipse | diamond',
        inputSchema: {
          sessionId: z.string(),
          type: z.enum(['rectangle', 'ellipse', 'diamond']),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          label: z.string().optional(),
          strokeColor: z.string().optional(),
          backgroundColor: z.string().optional(),
        },
      },
      async ({ sessionId, type, x, y, width, height, label, strokeColor, backgroundColor }) => {
        const elements: ExcalidrawElement[] = [];
        const shapeId = crypto.randomUUID();

        elements.push({
          ...makeBase(type),
          id: shapeId,
          x,
          y,
          width,
          height,
          strokeColor: strokeColor ?? '#1e1e2e',
          backgroundColor: backgroundColor ?? 'transparent',
        });

        if (label) {
          elements.push({
            ...makeBase('text'),
            x: x + width / 2,
            y: y + height / 2,
            width: 0,
            height: 0,
            text: label,
            fontSize: 16,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: strokeColor ?? '#1e1e2e',
            backgroundColor: 'transparent',
            containerId: shapeId,
          });
        }

        const existing = (await this.gateway.getCurrentElements(sessionId)) ?? [];
        await this.gateway.injectElements(sessionId, [...existing, ...elements]);
        return {
          content: [{ type: 'text', text: `Drew ${type} at (${x},${y})` }],
        };
      },
    );

    server.registerTool(
      'draw_text',
      {
        description: 'Add a text element to the board',
        inputSchema: {
          sessionId: z.string(),
          x: z.number(),
          y: z.number(),
          text: z.string(),
          fontSize: z.number().optional(),
          strokeColor: z.string().optional(),
        },
      },
      async ({ sessionId, x, y, text, fontSize, strokeColor }) => {
        const el: ExcalidrawElement = {
          ...makeBase('text'),
          x,
          y,
          width: 0,
          height: 0,
          text,
          fontSize: fontSize ?? 20,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          strokeColor: strokeColor ?? '#1e1e2e',
          backgroundColor: 'transparent',
        };
        const existing = (await this.gateway.getCurrentElements(sessionId)) ?? [];
        await this.gateway.injectElements(sessionId, [...existing, el]);
        return {
          content: [{ type: 'text', text: `Added text "${text}" at (${x},${y})` }],
        };
      },
    );

    server.registerTool(
      'draw_arrow',
      {
        description: 'Draw an arrow between two points',
        inputSchema: {
          sessionId: z.string(),
          startX: z.number(),
          startY: z.number(),
          endX: z.number(),
          endY: z.number(),
          label: z.string().optional(),
          strokeColor: z.string().optional(),
        },
      },
      async ({ sessionId, startX, startY, endX, endY, label, strokeColor }) => {
        const elements: ExcalidrawElement[] = [];
        const arrowId = crypto.randomUUID();

        elements.push({
          ...makeBase('arrow'),
          id: arrowId,
          x: startX,
          y: startY,
          width: endX - startX,
          height: endY - startY,
          points: [[0, 0], [endX - startX, endY - startY]],
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: 'arrow',
          strokeColor: strokeColor ?? '#1e1e2e',
          backgroundColor: 'transparent',
        });

        if (label) {
          elements.push({
            ...makeBase('text'),
            x: (startX + endX) / 2,
            y: (startY + endY) / 2,
            width: 0,
            height: 0,
            text: label,
            fontSize: 14,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: strokeColor ?? '#1e1e2e',
            backgroundColor: 'transparent',
          });
        }

        const existing = (await this.gateway.getCurrentElements(sessionId)) ?? [];
        await this.gateway.injectElements(sessionId, [...existing, ...elements]);
        return {
          content: [
            { type: 'text', text: `Drew arrow from (${startX},${startY}) to (${endX},${endY})` },
          ],
        };
      },
    );
  }
}
