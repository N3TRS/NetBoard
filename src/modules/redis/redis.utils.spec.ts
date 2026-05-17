import { whiteboardStateKey } from './redis.utils';

describe('whiteboardStateKey', () => {
  it('builds correct Redis key', () => {
    expect(whiteboardStateKey('abc123')).toBe('whiteboard:abc123:elements');
  });

  it('handles empty string session id', () => {
    expect(whiteboardStateKey('')).toBe('whiteboard::elements');
  });
});
