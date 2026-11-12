import { BadRequestException } from '@nestjs/common';
import { parseDirectoryCursor } from './professional-directory.js';

describe('professional directory cursor', () => {
  it('accepts the first page and canonicalizes a UUID v4 cursor', () => {
    expect(parseDirectoryCursor({})).toBeNull();
    expect(
      parseDirectoryCursor({ after: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA' }),
    ).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });
  it.each([
    null,
    [],
    { after: '' },
    { after: ['a', 'b'] },
    { after: '1 OR 1=1' },
    { extra: 'ignored' },
    { after: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', extra: 'x' },
  ])('rejects invalid or extra query input %j', (value) => {
    expect(() => parseDirectoryCursor(value)).toThrow(BadRequestException);
  });
});
