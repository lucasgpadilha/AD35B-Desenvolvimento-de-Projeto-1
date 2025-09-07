const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/measurements.db', (err) => {
    if (err) {
        return console.error("Erro ao abrir o banco de dados", err.message);
    }
    console.log("Conectado ao banco de dados SQLite.");
});

// Habilitar chaves estrangeiras
db.get("PRAGMA foreign_keys = ON");

db.serialize(() => {
    // Tabela 1: Clientes
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL UNIQUE,
        contact TEXT
    )`, (err) => {
        if (err) return console.error("Erro ao criar tabela clients", err.message);
        console.log("Tabela 'clients' pronta.");
    });

    // Tabela 2: Locais (associados a um cliente)
    db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
        UNIQUE(client_id, name)
    )`, (err) => {
        if (err) return console.error("Erro ao criar tabela locations", err.message);
        console.log("Tabela 'locations' pronta.");
    });

    // Tabela 3: Medições (associadas a um local)
    db.run(`CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        signal_2_4ghz INTEGER NOT NULL,
        signal_5ghz INTEGER NOT NULL,
        speed_2_4ghz REAL NOT NULL,
        speed_5ghz REAL NOT NULL,
        interference INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) return console.error("Erro ao criar tabela measurements", err.message);
        console.log("Tabela 'measurements' pronta.");
    });
});

module.exports = db;