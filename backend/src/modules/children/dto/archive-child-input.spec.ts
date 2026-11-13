import { BadRequestException } from '@nestjs/common';
import { parseArchiveChildInput } from './archive-child-input.js';
const revision = 'a'.repeat(64);
describe('archive input', () => {
  it.each([true, false])(
    'accepts explicit desired state %s and revision',
    (archived) => {
      expect(parseArchiveChildInput({ archived, revision })).toEqual({
        archived,
        revision,
      });
    },
  );
  it.each([
    null,
    [],
    {},
    { archived: 'true', revision },
    { archived: true },
    { archived: false, revision: 'A'.repeat(64) },
    { archived: true, revision, status: 'active' },
    { archived: true, revision, professionalId: 'forged' },
  ])('rejects malformed or privileged fields %j', (body) => {
    expect(() => parseArchiveChildInput(body)).toThrow(BadRequestException);
  });
});
