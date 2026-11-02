import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import type { ReadStream, WriteStream } from 'node:tty';
import type { CreateFirstAdminInput } from '../services/create-first-admin.service.js';

export class AdminInputError extends Error {}

class PrivateOutput extends Writable {
  muted = false;
  constructor(private readonly terminal: WriteStream) {
    super();
  }
  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    if (this.muted) done();
    else this.terminal.write(chunk, done);
  }
}

export async function readAdminInput(
  input: ReadStream,
  output: WriteStream,
): Promise<CreateFirstAdminInput> {
  if (!input.isTTY || !output.isTTY)
    throw new AdminInputError(
      'Use um terminal interativo local; entrada redirecionada não é aceita.',
    );
  const privateOutput = new PrivateOutput(output);
  const reader = createInterface({
    input,
    output: privateOutput,
    terminal: true,
    historySize: 0,
  });
  const cancellation = new AbortController();
  reader.on('SIGINT', () => cancellation.abort());
  reader.on('close', () => cancellation.abort());
  async function question(prompt: string, secret = false): Promise<string> {
    if (secret) output.write(prompt);
    privateOutput.muted = secret;
    try {
      return await reader.question(secret ? '' : prompt, {
        signal: cancellation.signal,
      });
    } finally {
      if (secret) output.write('\n');
      privateOutput.muted = false;
    }
  }
  try {
    const name = await question('Nome do ADM: ');
    const username = await question('Usuário do ADM: ');
    const password = await question('Senha (entrada oculta): ', true);
    const confirmation = await question(
      'Confirme a senha (entrada oculta): ',
      true,
    );
    if (password !== confirmation)
      throw new AdminInputError('As senhas não conferem.');
    return { name, username, password };
  } catch (error) {
    if (cancellation.signal.aborted)
      throw new AdminInputError('Operação cancelada.');
    throw error;
  } finally {
    reader.close();
    privateOutput.destroy();
  }
}
