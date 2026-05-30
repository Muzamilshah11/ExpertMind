import { describe, it, expect } from 'vitest';
import { MediaHandler } from '../media-handler';

describe('MediaHandler', () => {
  it('should initialize correctly', () => {
    const handler = new MediaHandler();
    expect(handler).toBeInstanceOf(MediaHandler);
    expect(handler.isRecording).toBe(false);
  });
});
