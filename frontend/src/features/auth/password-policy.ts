export const passwordHint =
  'Use de 15 a 128 caracteres. Uma frase com várias palavras pode ajudar. Espaços e emojis são aceitos.'

export function passwordError(password: string): string | null {
  const length = Array.from(password).length
  return length < 15 ||
    length > 128 ||
    /[\uD800-\uDFFF]/u.test(password) ||
    new TextEncoder().encode(password).length > 512
    ? 'A senha precisa ter de 15 a 128 caracteres válidos, até 512 bytes.'
    : null
}
