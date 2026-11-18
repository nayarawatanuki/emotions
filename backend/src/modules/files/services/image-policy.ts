// Bounds apply per singleton instance; HTTP upload limits remain necessary.
export const imagePolicy = Object.freeze({
  maxInputBytes: 5 * 1024 * 1024,
  maxOutputBytes: 5 * 1024 * 1024,
  maxInputPixels: 12_000_000,
  maxInputSide: 8192,
  maxOutputSide: 2048,
  maxConcurrent: 2,
  timeoutSeconds: 5,
});

export const uploadImageMediaTypes = ['image/jpeg', 'image/png', 'image/webp'];
