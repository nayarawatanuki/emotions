import { BadRequestException } from '@nestjs/common';
import { isCivilDate, parseCreateChildInput } from './create-child-input.js';
const valid = {
  name: ' Synthetic child ',
  username: ' FIXTURE-CHILD ',
  dateOfBirth: '2020-02-29',
  guardianName: ' Synthetic guardian ',
  treatmentActive: true,
  reportedLevel: null,
  notes: ' First line\nSecond line ',
};
describe('child registration input', () => {
  it('normalizes identity while preserving a civil date and multiline notes', () => {
    expect(parseCreateChildInput(valid)).toEqual({
      ...valid,
      name: 'Synthetic child',
      username: 'fixture-child',
      guardianName: 'Synthetic guardian',
      notes: 'First line\nSecond line',
    });
  });
  it.each([
    '2021-02-29',
    '2020-02-30',
    '2020-13-01',
    '2020-00-01',
    '2020-1-01',
    '0001-01-01',
    '2020-01-01T00:00:00Z',
  ])('rejects invalid dates %s', (value) =>
    expect(isCivilDate(value)).toBe(false),
  );
  it.each([
    { ...valid, professionalId: 'forged' },
    { ...valid, password: 'forged' },
    { ...valid, role: 'administrator' },
    { ...valid, photoFileId: 'forged' },
    { ...valid, treatmentActive: 'true' },
    { ...valid, name: '' },
    { ...valid, username: '\ud800' },
    { ...valid, guardianName: 'a\u0000b' },
    { ...valid, reportedLevel: 3 },
    { ...valid, notes: 'a'.repeat(2001) },
    { ...valid, notes: 'a\u0000b' },
    null,
    [],
  ])('rejects malformed or forbidden input %j', (value) =>
    expect(() => parseCreateChildInput(value)).toThrow(BadRequestException),
  );
  it('accepts optional empty values and Unicode boundaries', () => {
    expect(
      parseCreateChildInput({
        ...valid,
        name: '🎀'.repeat(255),
        notes: '🎀'.repeat(2000),
        reportedLevel: ' ',
      }),
    ).toMatchObject({ reportedLevel: null });
  });
});
