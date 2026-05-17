import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from 'src/modules/mcp/mcp.service';
import { WhiteboardGateway } from 'src/modules/whiteboard/whiteboard.gateway';

const registeredTools: Record<string, (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>> = {};

const mockServerInstance = {
  registerTool: jest.fn((name: string, _schema: unknown, handler: (args: Record<string, unknown>) => Promise<unknown>) => {
    registeredTools[name] = handler as any;
  }),
};

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => mockServerInstance),
}));

const mockGateway = {
  getCurrentElements: jest.fn(),
  injectElements: jest.fn(),
};

describe('McpService', () => {
  let service: McpService;

  beforeEach(async () => {
    Object.keys(registeredTools).forEach((k) => delete registeredTools[k]);
    mockServerInstance.registerTool.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        { provide: WhiteboardGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<McpService>(McpService);
    jest.clearAllMocks();
    mockServerInstance.registerTool.mockImplementation((name: string, _schema: unknown, handler: any) => {
      registeredTools[name] = handler;
    });

    service.buildServer();
  });

  describe('buildServer', () => {
    it('returns a server instance', () => {
      const server = service.buildServer();
      expect(server).toBeDefined();
    });

    it('registers all 6 tools', () => {
      expect(Object.keys(registeredTools)).toEqual(
        expect.arrayContaining(['get_board_state', 'clear_board', 'add_elements', 'draw_shape', 'draw_text', 'draw_arrow']),
      );
    });
  });

  describe('get_board_state tool', () => {
    it('returns JSON-stringified elements', async () => {
      const elements = [{ id: '1' }];
      mockGateway.getCurrentElements.mockResolvedValue(elements);

      const result = await registeredTools['get_board_state']({ sessionId: 'sess1' });

      expect(result.content[0].text).toBe(JSON.stringify(elements));
    });

    it('returns empty array when no elements', async () => {
      mockGateway.getCurrentElements.mockResolvedValue(null);

      const result = await registeredTools['get_board_state']({ sessionId: 'sess1' });

      expect(result.content[0].text).toBe('[]');
    });
  });

  describe('clear_board tool', () => {
    it('injects empty array and returns confirmation', async () => {
      mockGateway.injectElements.mockResolvedValue(undefined);

      const result = await registeredTools['clear_board']({ sessionId: 'sess1' });

      expect(mockGateway.injectElements).toHaveBeenCalledWith('sess1', []);
      expect(result.content[0].text).toBe('Board cleared');
    });
  });

  describe('add_elements tool', () => {
    it('merges new elements with existing', async () => {
      const existing = [{ id: 'e1' }];
      const newEls = [{ id: 'e2' }];
      mockGateway.getCurrentElements.mockResolvedValue(existing);
      mockGateway.injectElements.mockResolvedValue(undefined);

      const result = await registeredTools['add_elements']({ sessionId: 'sess1', elements: newEls });

      expect(mockGateway.injectElements).toHaveBeenCalledWith('sess1', [...existing, ...newEls]);
      expect(result.content[0].text).toBe('Added 1 element(s)');
    });

    it('handles null existing (treats as empty)', async () => {
      mockGateway.getCurrentElements.mockResolvedValue(null);
      mockGateway.injectElements.mockResolvedValue(undefined);
      const newEls = [{ id: 'new' }];

      await registeredTools['add_elements']({ sessionId: 'sess1', elements: newEls });

      expect(mockGateway.injectElements).toHaveBeenCalledWith('sess1', newEls);
    });
  });

  describe('draw_shape tool', () => {
    it('draws rectangle without label (1 element)', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      const result = await registeredTools['draw_shape']({
        sessionId: 'sess1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected).toHaveLength(1);
      expect(injected[0].type).toBe('rectangle');
      expect(result.content[0].text).toContain('rectangle');
    });

    it('draws shape with label (adds bound text element)', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_shape']({
        sessionId: 'sess1',
        type: 'ellipse',
        x: 10,
        y: 10,
        width: 80,
        height: 40,
        label: 'Hello',
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected).toHaveLength(2);
      expect(injected[1].type).toBe('text');
      expect(injected[1].text).toBe('Hello');
      expect(injected[1].containerId).toBe(injected[0].id);
    });

    it('applies custom strokeColor and backgroundColor', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_shape']({
        sessionId: 'sess1',
        type: 'diamond',
        x: 0,
        y: 0,
        width: 60,
        height: 60,
        strokeColor: '#ff0000',
        backgroundColor: '#0000ff',
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected[0].strokeColor).toBe('#ff0000');
      expect(injected[0].backgroundColor).toBe('#0000ff');
    });

    it('merges with existing elements', async () => {
      const existing = [{ id: 'old' }];
      mockGateway.getCurrentElements.mockResolvedValue(existing);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_shape']({
        sessionId: 'sess1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected[0]).toEqual({ id: 'old' });
    });
  });

  describe('draw_text tool', () => {
    it('adds text element at specified position', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      const result = await registeredTools['draw_text']({
        sessionId: 'sess1',
        x: 5,
        y: 10,
        text: 'Hello world',
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      const textEl = injected[injected.length - 1];
      expect(textEl.type).toBe('text');
      expect(textEl.text).toBe('Hello world');
      expect(textEl.x).toBe(5);
      expect(textEl.y).toBe(10);
      expect(result.content[0].text).toContain('Hello world');
    });

    it('applies custom fontSize and strokeColor', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_text']({
        sessionId: 'sess1',
        x: 0,
        y: 0,
        text: 'Test',
        fontSize: 32,
        strokeColor: '#ff0000',
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      const textEl = injected[injected.length - 1];
      expect(textEl.fontSize).toBe(32);
      expect(textEl.strokeColor).toBe('#ff0000');
    });
  });

  describe('draw_arrow tool', () => {
    it('draws arrow without label (1 element)', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      const result = await registeredTools['draw_arrow']({
        sessionId: 'sess1',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected).toHaveLength(1);
      expect(injected[0].type).toBe('arrow');
      expect(injected[0].endArrowhead).toBe('arrow');
      expect(result.content[0].text).toContain('arrow');
    });

    it('draws arrow with label (adds text element)', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_arrow']({
        sessionId: 'sess1',
        startX: 0,
        startY: 0,
        endX: 50,
        endY: 50,
        label: 'Flow',
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected).toHaveLength(2);
      expect(injected[1].text).toBe('Flow');
    });

    it('sets correct arrow dimensions from start/end coords', async () => {
      mockGateway.getCurrentElements.mockResolvedValue([]);
      mockGateway.injectElements.mockResolvedValue(undefined);

      await registeredTools['draw_arrow']({
        sessionId: 'sess1',
        startX: 10,
        startY: 20,
        endX: 110,
        endY: 120,
      });

      const injected = mockGateway.injectElements.mock.calls[0][1] as any[];
      expect(injected[0].x).toBe(10);
      expect(injected[0].y).toBe(20);
      expect(injected[0].width).toBe(100);
      expect(injected[0].height).toBe(100);
    });
  });
});
