import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { initializeDataSource } from './database.module.js';

describe('database initialization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts the API without opening connections when persistence is disabled', async () => {
    const initialize = vi.spyOn(DataSource.prototype, 'initialize');
    const module = await Test.createTestingModule({
      imports: [AppModule.register({ DB_ENABLED: 'false' })],
    }).compile();
    await module.init();
    expect(initialize).not.toHaveBeenCalled();
    await module.close();
  });

  it('rejects invalid configuration before connecting', () => {
    const initialize = vi.spyOn(DataSource.prototype, 'initialize');
    expect(() => AppModule.register({ DB_ENABLED: 'true' })).toThrow('DB_HOST');
    expect(initialize).not.toHaveBeenCalled();
  });

  it('removes private details from connection failures', async () => {
    const initialize = vi
      .spyOn(DataSource.prototype, 'initialize')
      .mockRejectedValue(
        new Error('Access denied: private-user private-host private-password'),
      );
    await expect(initializeDataSource({ type: 'mysql' })).rejects.toThrow(
      /^Não foi possível conectar ao banco de dados\.$/,
    );
    expect(initialize).toHaveBeenCalledOnce();
  });

  it('returns the initialized connection for Nest to manage its lifecycle', async () => {
    const dataSource = new DataSource({ type: 'mysql' });
    vi.spyOn(DataSource.prototype, 'initialize').mockResolvedValue(dataSource);
    await expect(initializeDataSource({ type: 'mysql' })).resolves.toBe(
      dataSource,
    );
  });
});
