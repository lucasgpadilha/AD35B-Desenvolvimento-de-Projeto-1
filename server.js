const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database/database.js');
const path = require('path');

const app = express();
const PORT = 3000;

// Configurações
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// --- ROTAS DE CLIENTES ---

// Rota principal: Listar todos os clientes
app.get('/', (req, res) => {
    db.all("SELECT * FROM clients ORDER BY name", [], (err, clients) => {
        if (err) return console.error(err.message);
        res.render('clients', { clients });
    });
});

// Adicionar um novo cliente
app.post('/client/add', (req, res) => {
    const { name, address, contact } = req.body;
    db.run(`INSERT INTO clients (name, address, contact) VALUES (?, ?, ?)`, [name, address, contact], (err) => {
        if (err) return console.error(err.message);
        res.redirect('/');
    });
});

// --- ROTAS DE LOCAIS (Dentro de um Cliente) ---

// Ver detalhes de um cliente e seus locais
app.get('/client/:id', async (req, res) => {

    const clientId = req.params.id;

    // Criamos uma "Promise" para usar await com db.get
    const getClient = new Promise((resolve, reject) => {
        const sql = "SELECT * FROM clients WHERE id = ?";
        db.get(sql, [clientId], (err, client) => {
            if (err) reject(err);
            else resolve(client);
        });
    });

    // Criamos uma "Promise" para usar await com db.all
    const getLocations = new Promise((resolve, reject) => {
        const sql = "SELECT * FROM locations WHERE client_id = ? ORDER BY name";
        db.all(sql, [clientId], (err, locations) => {
            if (err) reject(err);
            else resolve(locations);
        });
    });

    try {
        const client = await getClient;
        if (!client) {
            return res.redirect('/');
        }
        
        const locations = await getLocations;
        res.render('client_detail', { client, locations });

    } catch (err) {
        console.error("Erro ao buscar dados do cliente:", err.message);
        res.redirect('/');
    }
});

// Adicionar um novo local para um cliente
app.post('/client/:id/location/add', (req, res) => {
    const clientId = req.params.id;
    const { name } = req.body;
    db.run(`INSERT INTO locations (client_id, name) VALUES (?, ?)`, [clientId, name], (err) => {
        if (err) return console.error(err.message);
        res.redirect(`/client/${clientId}`);
    });
});

// --- ROTAS DE MEDIÇÕES (Dentro de um Local) ---

// Ver detalhes de um local e suas medições
app.get('/location/:id', (req, res) => {
    const locationId = req.params.id;
    const locationSql = `
        SELECT l.id, l.name, l.client_id, c.name as client_name 
        FROM locations l
        JOIN clients c ON l.client_id = c.id
        WHERE l.id = ?`;
    const measurementsSql = "SELECT *, strftime('%d/%m/%Y %H:%M', timestamp) as formatted_timestamp FROM measurements WHERE location_id = ? ORDER BY timestamp DESC";

    db.get(locationSql, [locationId], (err, location) => {
        if (err || !location) return res.redirect('/');
        db.all(measurementsSql, [locationId], (err, measurements) => {
            if (err) return console.error(err.message);
            res.render('location_detail', { location, measurements });
        });
    });
});

// Adicionar uma nova medição para um local
app.post('/location/:id/measurement/add', (req, res) => {
    const locationId = req.params.id;
    const { signal_2_4ghz, signal_5ghz, speed_2_4ghz, speed_5ghz, interference } = req.body;
    const sql = `INSERT INTO measurements (location_id, signal_2_4ghz, signal_5ghz, speed_2_4ghz, speed_5ghz, interference) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [locationId, signal_2_4ghz, signal_5ghz, speed_2_4ghz, speed_5ghz, interference], (err) => {
        if (err) return console.error(err.message);
        res.redirect(`/location/${locationId}`);
    });
});


// --- ROTAS DO DASHBOARD ---

// Página principal do Dashboard (para selecionar o cliente)
app.get('/dashboard', (req, res) => {
    db.all("SELECT id, name, address FROM clients ORDER BY name", [], (err, clients) => {
        if (err) return console.error(err.message);
        res.render('dashboard', { clients });
    });
});

// API para buscar dados consolidados de um cliente para o dashboard
app.get('/api/dashboard/client/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const sql = `
        SELECT
            l.name AS locationName,
            AVG(m.signal_2_4ghz) AS avg_signal_2_4,
            AVG(m.signal_5ghz) AS avg_signal_5,
            AVG(m.speed_2_4ghz) AS avg_speed_2_4,
            AVG(m.speed_5ghz) AS avg_speed_5,
            AVG(m.interference) AS avg_interference
        FROM measurements m
        JOIN locations l ON m.location_id = l.id
        WHERE l.client_id = ?
        GROUP BY l.name
        ORDER BY l.name
    `;
    db.all(sql, [clientId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});