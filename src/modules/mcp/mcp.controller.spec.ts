import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

const mockTransportInstance = {
  handleRequest: jest.fn().mockResolvedValue(undefined),
};

const mockServerInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation(() => mockTransportInstance),
}));

const mockMcpService = {
  buildServer: jest.fn().mockReturnValue(mockServerInstance),
};

describe('McpController', () => {
  let controller: McpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [{ provide: McpService, useValue: mockMcpService }],
    }).compile();

    controller = module.get<McpController>(McpController);
    jest.clearAllMocks();
    mockMcpService.buildServer.mockReturnValue(mockServerInstance);
    mockServerInstance.connect.mockResolvedValue(undefined);
    mockTransportInstance.handleRequest.mockResolvedValue(undefined);
  });

  it('builds a new server per request', async () => {
    const req = { body: {} } as any;
    const res = {} as any;

    await controller.handle(req, res);

    expect(mockMcpService.buildServer).toHaveBeenCalledTimes(1);
  });

  it('connects server to transport', async () => {
    const req = { body: {} } as any;
    const res = {} as any;

    await controller.handle(req, res);

    expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransportInstance);
  });

  it('delegates request handling to transport with req body', async () => {
    const req = { body: { method: 'tools/list', params: {} } } as any;
    const res = {} as any;

    await controller.handle(req, res);

    expect(mockTransportInstance.handleRequest).toHaveBeenCalledWith(req, res, req.body);
  });

  it('creates a new server on each request (stateless)', async () => {
    const req = { body: {} } as any;
    const res = {} as any;

    await controller.handle(req, res);
    await controller.handle(req, res);

    expect(mockMcpService.buildServer).toHaveBeenCalledTimes(2);
  });
});
