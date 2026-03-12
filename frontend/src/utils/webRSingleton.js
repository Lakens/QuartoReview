/**
 * Lazily initialises a single shared WebR instance for the entire app session.
 *
 * WebR boots an R interpreter compiled to WebAssembly (~50 MB download on first
 * use, then cached by the browser).  We keep one instance alive for the whole
 * session so that:
 *   - The global R environment persists between chunk runs (variables, loaded
 *     packages, etc.)
 *   - We only pay the start-up cost once.
 *
 * Call getWebR() to obtain the ready instance; it returns a promise so the
 * caller can await initialisation without blocking.
 */

let _instance = null;
let _initPromise = null;

/**
 * Returns a promise that resolves to the ready WebR instance.
 * Calling it multiple times is safe – initialisation only runs once.
 */
export async function getWebR() {
  if (!_initPromise) {
    _initPromise = (async () => {
      // Dynamic import keeps the large WebR bundle out of the initial chunk.
      const { WebR } = await import('@r-wasm/webr');
      const webR = new WebR();
      await webR.init();
      _instance = webR;
      return webR;
    })();
  }
  return _initPromise;
}

/**
 * Synchronous status check – useful for rendering a label before awaiting.
 * Returns 'idle' | 'loading' | 'ready'.
 */
export function getWebRStatus() {
  if (!_initPromise) return 'idle';
  if (!_instance) return 'loading';
  return 'ready';
}

/**
 * Convert an ImageBitmap (returned by WebR canvas messages) to a base64-
 * encoded PNG string suitable for use in an <img> src or Jupyter image output.
 */
export function imageBitmapToBase64(bitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  // Remove the "data:image/png;base64," prefix
  return canvas.toDataURL('image/png').split(',')[1];
}
