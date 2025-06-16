// backend/src/app.js
const express = require('express');
const db = require('./database'); // Importa a conexão com o banco de dados
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Carrega as variáveis do .env principal

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Permite que o Express parseie JSON no corpo das requisições

// Rota para salvar uma nova pontuação
app.post('/api/scores', (req, res) => {
    // Agora esperamos 'nome', 'matricula' e 'score'
    const { nome, matricula, score } = req.body;

    // Validação básica: nome é obrigatório, matricula deve ser uma string de 6 caracteres se fornecida
    if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    if (matricula && (typeof matricula !== 'string' || matricula.length !== 6 || !/^\d{6}$/.test(matricula))) {
        return res.status(400).json({ error: 'Matricula deve ser uma string de 6 números.' });
    }

    // A coluna 'score' agora pode ser NULL, então não precisa de validação de 'undefined' para ela.

    const stmt = db.prepare('INSERT INTO scores (nome, matricula, score) VALUES (?, ?, ?)');
    stmt.run(nome, matricula, score, function(err) { // Passa os novos parâmetros
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Pontuação salva com sucesso!', id: this.lastID });
    });
    stmt.finalize();
});

// Rota para obter as top 10 pontuações (agora com nome e matricula)
app.get('/api/scores', (req, res) => {
    db.all('SELECT nome, matricula, score, timestamp FROM scores ORDER BY score DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Se o frontend for servido pelo Nginx, as linhas abaixo podem ser removidas
// app.use(express.static(path.join(__dirname, '../../frontend')));
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../../frontend/index.html'));
// });

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
