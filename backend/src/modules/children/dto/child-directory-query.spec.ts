import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { parseChildDirectoryQuery } from './child-directory-query.js';
describe('child directory filter', () => {
  it('defaults to unarchived and accepts canonical filter with cursor', () => {
    const after = randomUUID();
    expect(parseChildDirectoryQuery({})).toEqual({
      after: null,
      archived: false,
    });
    expect(parseChildDirectoryQuery({ archived: 'false' })).toEqual({
      after: null,
      archived: false,
    });
    expect(parseChildDirectoryQuery({ archived: 'true', after })).toEqual({
      after,
      archived: true,
    });
  });
  it.each([
    null,
    [],
    { archived: '' },
    { archived: true },
    { archived: ['true', 'false'] },
    { archived: 'all' },
    { archived: 'true', professionalId: 'forged' },
    { archived: 'true', after: 'bad' },
  ])('rejects invalid filters %j', (query) => {
    expect(() => parseChildDirectoryQuery(query)).toThrow(BadRequestException);
  });
});
