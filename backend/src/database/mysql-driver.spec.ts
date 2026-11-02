import mysql from 'mysql2';
import { mysqlDriver } from './mysql-driver.js';

describe('MySQL session timezone', () => {
  afterEach(() => vi.restoreAllMocks());

  it('queues UTC initialization on every newly created connection', () => {
    const pool = mysql.createPool({});
    vi.spyOn(mysql, 'createPool').mockReturnValue(pool);
    mysqlDriver.createPool({});
    const query = vi.fn(
      (_sql: string, callback: (error: Error | null) => void) => callback(null),
    );
    const first = { query, destroy: vi.fn() };
    const second = { query, destroy: vi.fn() };
    pool.emit('connection', first);
    pool.emit('connection', second);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toBe("SET SESSION time_zone = '+00:00'");
    expect(first.destroy).not.toHaveBeenCalled();
    expect(second.destroy).not.toHaveBeenCalled();
    pool.end();
  });

  it('discards a connection if UTC initialization fails', () => {
    const pool = mysql.createPool({});
    vi.spyOn(mysql, 'createPool').mockReturnValue(pool);
    mysqlDriver.createPool({});
    const connection = {
      query: vi.fn((_sql: string, callback: (error: Error | null) => void) =>
        callback(new Error('private driver failure')),
      ),
      destroy: vi.fn(),
    };
    pool.emit('connection', connection);
    expect(connection.destroy).toHaveBeenCalledOnce();
    pool.end();
  });
});
