import {
  parseCreateProfessionalInput,
  assertEmptyInvitationInput,
} from './create-professional-input.js';
describe('professional onboarding input', () => {
  it('preserves the display name and normalizes the username', () =>
    expect(
      parseCreateProfessionalInput({
        name: '  Nome Sintético 🎀  ',
        username: '  PROFESSIONAL  ',
      }),
    ).toEqual({ name: 'Nome Sintético 🎀', username: 'professional' }));
  it.each([
    null,
    [],
    {},
    { name: 'Synthetic', username: '' },
    { name: '', username: 'synthetic' },
    { name: 'a'.repeat(256), username: 'synthetic' },
    { name: 'Synthetic\nOther', username: 'synthetic' },
    { name: 'Synthetic', username: '\ud800' },
    { name: 1, username: 'synthetic' },
    { name: 'Synthetic', username: 'synthetic', role: 'administrator' },
    {
      name: 'Synthetic',
      username: 'synthetic',
      password: 'never accepted here',
    },
    { name: 'Synthetic', username: 'synthetic', status: 'active' },
  ])('rejects invalid input and authority supplied by the client: %j', (body) =>
    expect(() => parseCreateProfessionalInput(body)).toThrow(),
  );
  it('allows only an empty object for reissuing an invitation', () => {
    expect(() => assertEmptyInvitationInput({})).not.toThrow();
    for (const body of [
      undefined,
      null,
      [],
      '',
      { password: 'synthetic' },
      { accountId: 'synthetic' },
    ])
      expect(() => assertEmptyInvitationInput(body)).toThrow();
  });
});
