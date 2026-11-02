import mysql from 'mysql2';
import type { Pool, PoolOptions } from 'mysql2';

export const mysqlDriver: { createPool(options: PoolOptions): Pool } = {
  createPool(options: PoolOptions): Pool {
    const pool = mysql.createPool(options);
    pool.on('connection', (connection) => {
      // mysql2 queues this before handing the new connection to the caller.
      // Setting the session also covers SQL defaults such as CURRENT_TIMESTAMP.
      connection.query("SET SESSION time_zone = '+00:00'", (error) => {
        if (error) connection.destroy();
      });
    });
    return pool;
  },
};
