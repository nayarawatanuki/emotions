import { BadRequestException } from '@nestjs/common';
import { parseUpdateChildInput } from './update-child-input.js';
const input = {
  name: 'Synthetic',
  username: ' FIXTURE ',
  dateOfBirth: '2020-02-29',
  guardianName: 'Synthetic guardian',
  treatmentActive: false,
  reportedLevel: null,
  notes: null,
  revision: 'a'.repeat(64),
};
describe('child update input', () => {
  it('reuses the full registration validation and requires a bounded revision', () =>
    expect(parseUpdateChildInput(input)).toMatchObject({
      username: 'fixture',
      revision: input.revision,
    }));
  it.each([
    null,
    {},
    { ...input, revision: '' },
    { ...input, revision: 'A'.repeat(64) },
    { ...input, professionalId: 'forged' },
    { ...input, password: 'forged' },
    { ...input, archived: true },
    { ...input, status: 'active' },
  ])('rejects invalid or privileged changes %j', (value) =>
    expect(() => parseUpdateChildInput(value)).toThrow(BadRequestException),
  );
});
