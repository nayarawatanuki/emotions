export type ImageProcessingCode =
  'invalid_image' | 'unsupported_image' | 'image_too_large' | 'image_capacity';

const messages: Record<ImageProcessingCode, string> = {
  invalid_image: 'Não foi possível validar a imagem.',
  unsupported_image: 'Envie uma imagem estática JPEG, PNG ou WebP.',
  image_too_large: 'A imagem excede os limites permitidos.',
  image_capacity: 'O processamento de imagens está ocupado. Tente mais tarde.',
};

export class ImageProcessingError extends Error {
  constructor(readonly code: ImageProcessingCode) {
    super(messages[code]);
    this.name = 'ImageProcessingError';
  }
}
