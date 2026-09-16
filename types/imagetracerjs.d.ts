declare module 'imagetracerjs' {
  type ImageTracerOptions = Record<string, unknown>;

  const ImageTracer: {
    imagedataToSVG(imageData: ImageData, options?: ImageTracerOptions | string): string;
  };

  export default ImageTracer;
}
