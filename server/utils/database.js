const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database.sqlite');
    this.db = null;
    this.connectionPromise = null;
  }

  async getDatabase() {
    if (this.db) {
      return this.db;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          this.db = null;
          this.connectionPromise = null;
          reject(err);
        } else {
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          
          // Set WAL mode for better concurrency
          this.db.run('PRAGMA journal_mode = WAL');
          
          // Set busy timeout
          this.db.run('PRAGMA busy_timeout = 5000');
          
          resolve(this.db);
        }
      });
    });

    return this.connectionPromise;
  }

  closeDatabase() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed successfully');
        }
      });
      this.db = null;
      this.connectionPromise = null;
    }
  }

  // Helper method to run queries with error handling
  async runQuery(query, params = []) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) {
            console.error('Database query error:', err);
            reject(err);
          } else {
            resolve({ lastInsertRowid: this.lastID, changes: this.changes });
          }
        });
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Helper method to get single row
  async getRow(query, params = []) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) {
            console.error('Database query error:', err);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Helper method to get multiple rows
  async getAll(query, params = []) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Database query error:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Helper method to check if table exists
  async tableExists(tableName) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve) => {
        db.get('SELECT name FROM sqlite_master WHERE type=? AND name=?', ['table', tableName], (err, row) => {
          if (err) {
            console.error('Error checking table existence:', err);
            resolve(false);
          } else {
            resolve(!!row);
          }
        });
      });
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  // Helper method to get table info
  async getTableInfo(tableName) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
          if (err) {
            console.error('Error getting table info:', err);
            resolve([]);
          } else {
            resolve(rows);
          }
        });
      });
    } catch (error) {
      console.error('Error getting table info:', error);
      return [];
    }
  }

  // Helper method to execute transactions
  async transaction(callback) {
    try {
      const db = await this.getDatabase();
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          try {
            const result = callback(db);
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
              } else {
                resolve(result);
              }
            });
          } catch (error) {
            db.run('ROLLBACK');
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  dbManager.closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database connection...');
  dbManager.closeDatabase();
  process.exit(0);
});

module.exports = dbManager; 