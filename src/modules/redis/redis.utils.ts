export function whiteboardStateKey(sessionId: string): string {
  return `whiteboard:${sessionId}:elements`;
}
