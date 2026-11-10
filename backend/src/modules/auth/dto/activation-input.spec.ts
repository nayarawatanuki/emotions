import { parseActivationInput } from './activation-input.js';
const token = 'A'.repeat(43);
const password = '  Synthetic first-access phrase 🎀  ';
describe('activation input', () => {
  it('preserves password bytes and accepts only a canonical opaque token', () =>
    expect(parseActivationInput({ token, password })).toEqual({
      token,
      password,
    }));
  it.each([
    null,
    [],
    {},
    { token: 'bad', password },
    { token: token + '=', password },
    { token: 'A'.repeat(42) + 'B', password },
    { token, password: 'short' },
    { token, password, role: 'administrator' },
    { token, password, accountId: 'synthetic' },
    { token, password: '\ud800'.repeat(15) },
  ])('rejects malformed or overprivileged requests: %j', (body) =>
    expect(() => parseActivationInput(body)).toThrow(),
  );
});
