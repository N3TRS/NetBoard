import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(url = '/test', method = 'GET') {
  const json = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json });
  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => ({ method, url }),
        getResponse: () => ({ status: statusFn }),
      }),
    } as unknown as ArgumentsHost,
    json,
    statusFn,
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('uses HttpException status code', () => {
    const { host, statusFn } = makeHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);
    expect(statusFn).toHaveBeenCalledWith(404);
  });

  it('uses 500 for generic errors', () => {
    const { host, statusFn } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(statusFn).toHaveBeenCalledWith(500);
  });

  it('uses 500 for non-Error exceptions', () => {
    const { host, statusFn } = makeHost();
    filter.catch('unexpected string', host);
    expect(statusFn).toHaveBeenCalledWith(500);
  });

  it('includes statusCode in JSON body', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException('Bad request', 400), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('includes timestamp and path in JSON body', () => {
    const { host, json } = makeHost('/api/test');
    filter.catch(new HttpException('Error', 400), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        path: '/api/test',
      }),
    );
  });

  it('includes HttpException response as message', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException('Custom message', 422), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Custom message' }));
  });

  it('includes "Internal server error" message for non-HttpException', () => {
    const { host, json } = makeHost();
    filter.catch(new Error('unhandled'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
