import { PassThrough, Writable } from 'node:stream';
import type { ReadStream, WriteStream } from 'node:tty';
import { readAdminInput } from './admin-input.js';

describe('interactive administrator input', () => {
  function terminal() {
    const input = Object.assign(new PassThrough(), {
      isTTY: true,
      setRawMode: vi.fn(),
    });
    let captured = '';
    const output = Object.assign(
      new Writable({
        write(chunk: Buffer, _encoding, done) {
          captured += chunk.toString();
          done();
        },
      }),
      { isTTY: true },
    );
    return {
      input,
      output,
      captured: () => captured,
      read: () =>
        readAdminInput(
          input as unknown as ReadStream,
          output as unknown as WriteStream,
        ),
    };
  }

  async function identity(t: ReturnType<typeof terminal>) {
    await vi.waitFor(() => expect(t.captured()).toContain('Nome do ADM:'));
    t.input.write('Synthetic Admin\r');
    await vi.waitFor(() => expect(t.captured()).toContain('Usuário do ADM:'));
    t.input.write('synthetic-admin\r');
    await vi.waitFor(() =>
      expect(t.captured()).toContain('Senha (entrada oculta):'),
    );
  }

  it('hides both secret entries, disables history and restores terminal raw mode', async () => {
    const t = terminal();
    const pending = t.read();
    await identity(t);
    const password = 'synthetic secret phrase';
    t.input.write(`${password}\r`);
    await vi.waitFor(() => expect(t.captured()).toContain('Confirme a senha'));
    t.input.write(`${password}\r`);
    await expect(pending).resolves.toEqual({
      name: 'Synthetic Admin',
      username: 'synthetic-admin',
      password,
    });
    expect(t.captured()).not.toContain(password);
    expect(t.input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it.each(['\u0003', '\u0004'])(
    'cancels on interrupt or EOF and restores the terminal',
    async (key) => {
      const t = terminal();
      const pending = expect(t.read()).rejects.toThrow();
      await identity(t);
      t.input.write(key);
      await pending;
      expect(t.input.setRawMode).toHaveBeenLastCalledWith(false);
    },
  );

  it('rejects mismatched confirmation without showing either secret', async () => {
    const t = terminal();
    const pending = expect(t.read()).rejects.toThrow('não conferem');
    await identity(t);
    t.input.write('first synthetic secret\r');
    await vi.waitFor(() => expect(t.captured()).toContain('Confirme a senha'));
    t.input.write('second synthetic secret\r');
    await pending;
    expect(t.captured()).not.toContain('synthetic secret');
    expect(t.input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('refuses redirected streams before reading input', async () => {
    const t = terminal();
    t.input.isTTY = false;
    await expect(t.read()).rejects.toThrow('terminal interativo');
    expect(t.captured()).toBe('');
  });
});
