declare module 'heic-convert' {
  interface ConvertOptions {
    buffer: ArrayBuffer | Uint8Array | Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }

  function convert(options: ConvertOptions): Promise<ArrayBuffer>;
  export default convert;
}
