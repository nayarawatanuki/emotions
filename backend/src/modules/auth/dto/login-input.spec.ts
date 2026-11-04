import { parseLoginInput } from './login-input.js';
describe('login input', () => {
  const password = ' Uma frase bem longa 🎀 ';
  it('normalizes only the username and preserves password bytes', () =>
    expect(parseLoginInput({ username: ' ADMIN ', password })).toEqual({
      username: 'admin',
      password,
    }));
  it.each([
    null,
    [],
    {},
    { username: 1, password },
    { username: 'admin', password: 'short' },
    { username: 'admin', password, role: 'administrator' },
    { username: 'admin', password, extra: 1 },
    { username: 'a'.repeat(256), password },
    { username: 'admin\nother', password },
    { username: '\ud800', password },
    { username: 'admin', password: '\ud800'.repeat(15) },
  ])('rejects invalid input without consulting accounts: %j', (body) =>
    expect(() => parseLoginInput(body)).toThrow(),
  );
});
