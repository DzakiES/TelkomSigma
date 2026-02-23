const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data", "users.db");
let db;

const initialize = () => {
  return new Promise((resolve, reject) => {
    // Pastikan folder data ada
    const fs = require("fs");
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Buat tabel users
      db.run(
        `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE,
                    gender TEXT,
                    title TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone TEXT,
                    cell TEXT,
                    date_of_birth DATE,
                    age INTEGER,
                    nationality TEXT,
                    city TEXT,
                    state TEXT,
                    country TEXT,
                    postcode TEXT,
                    picture_large TEXT,
                    picture_medium TEXT,
                    picture_thumbnail TEXT,
                    registered_date DATE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `,
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Buat tabel sync_log
          db.run(
            `
                    CREATE TABLE IF NOT EXISTS sync_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sync_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        records_added INTEGER DEFAULT 0,
                        records_updated INTEGER DEFAULT 0,
                        status TEXT
                    )
                `,
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log("Database berhasil diinisialisasi");
              resolve();
            },
          );
        },
      );
    });
  });
};

const getDb = () => db;

// Helper functions untuk query database
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

module.exports = {
  initialize,
  getDb,
  all,
  run,
  get,
};
