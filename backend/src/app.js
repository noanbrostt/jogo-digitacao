// backend/src/app.js
const express = require('express');
const session = require('express-session'); // Para gerenciar sessões
const axios = require('axios'); // Para fazer requisições à API externa
const { db, findUserByMatricula, insertNewUser } = require('./database'); // Importa o db e as novas funções
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Carrega as variáveis do .env principal

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Permite que o Express parseie JSON no corpo das requisições

// Configuração da sessão
// Em um ambiente de produção, o segredo (secret) deve ser uma string longa e aleatória
// e você deve configurar um armazenamento de sessão mais robusto (ex: para banco de dados)
app.use(session({
    secret: process.env.SESSION_SECRET || 'seu_segredo_super_secreto', // Use uma variável de ambiente para isso!
    resave: false, // Não salva a sessão se não houver modificações
    saveUninitialized: false, // Não cria uma sessão para usuários não autenticados
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use cookies seguros em produção (HTTPS)
        maxAge: 1000 * 60 * 60 * 24 // 24 horas de duração
    }
}));

// --- Mock da API Externa de Autenticação ---
// EM UM PROJETO REAL, VOCÊ FARIA UMA REQUISIÇÃO AXIOS PARA A SUA API EXTERNA AQUI.
const mockExternalAuth = (matricula, senha) => {
    return new Promise(resolve => {
        setTimeout(() => { // Simula um atraso de rede
            if (matricula === '123456' && senha === 'senha123') {
                resolve({ success: true, nome: 'João Silva', matricula: '123456' });
            } else if (matricula === '654321' && senha === 'outrasenha') {
                resolve({ success: true, nome: 'Maria Oliveira', matricula: '654321' });
            } else {
                resolve({ success: false, message: 'Matrícula ou senha inválida.' });
            }
        }, 500); // 500ms de atraso
    });
};
// --- Fim do Mock da API Externa ---

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { matricula, senha } = req.body;

    if (!matricula || !senha) {
        return res.status(400).json({ message: 'Matrícula e senha são obrigatórias.' });
    }

    try {
        // Valida o login com a API externa (usando o mock para demonstração)
        const authResult = await mockExternalAuth(matricula, senha);
        // Em um cenário real:
        // const authResult = await axios.post('URL_DA_SUA_API_EXTERNA/login', { matricula, senha });
        // const { success, nome } = authResult.data;

        if (authResult.success) {
            const nomeDoUsuario = authResult.nome; // Nome retornado pela API externa

            // Checa se o usuário existe na tabela 'scores'
            let userInScores = await findUserByMatricula(matricula);

            if (!userInScores) {
                // Se não existir, insere na tabela 'scores' com score null
                await insertNewUser(matricula, nomeDoUsuario);
                console.log(`Novo usuário inserido na tabela scores: ${matricula} - ${nomeDoUsuario}`);
            } else {
                console.log(`Usuário ${matricula} já existe na tabela scores.`);
                // Opcional: Atualizar o nome se a API externa tiver um nome mais recente
                // await db.run('UPDATE scores SET nome = ? WHERE matricula = ?', [nomeDoUsuario, matricula]);
            }

            // Define a sessão do usuário
            req.session.matricula = matricula;
            req.session.nome = nomeDoUsuario; // Salva o nome também na sessão

            return res.status(200).json({ message: 'Login bem-sucedido!', matricula: matricula, nome: nomeDoUsuario });
        } else {
            return res.status(401).json({ message: authResult.message || 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        return res.status(500).json({ message: 'Erro interno do servidor durante o login.' });
    }
});

// Rota de Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir sessão:', err);
            return res.status(500).json({ message: 'Erro ao fazer logout.' });
        }
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão
        res.status(200).json({ message: 'Logout bem-sucedido.' });
    });
});

// Middleware de autenticação: Protege as rotas que exigem login
function isAuthenticated(req, res, next) {
    if (req.session && req.session.matricula) {
        // Usuário autenticado, prossegue para a próxima função da rota
        next();
    } else {
        // Usuário não autenticado
        // Para requisições de API, retorna um erro 401
        if (req.xhr || req.headers.accept.indexOf('json') > -1) { // Verifica se é uma requisição AJAX/API
            res.status(401).json({ message: 'Não autorizado. Por favor, faça login.' });
        } else {
            // Para requisições de página (navegador), redireciona para a tela de login
            res.redirect('/login.html');
        }
    }
}

// Rotas protegidas (apenas usuários logados podem acessá-las)
app.post('/api/scores', isAuthenticated, async (req, res) => {
    // A matrícula agora vem da sessão do usuário logado, não do corpo da requisição
    const matricula = req.session.matricula;
    const nome = req.session.nome; // O nome também pode vir da sessão
    const { score } = req.body;

    // A validação da matrícula já foi feita no login
    // Validação do score
    if (typeof score === 'undefined' || score === null) { // Score pode ser null, mas se enviado, deve ser um número
         // Se você quiser permitir score completamente opcional na inserção inicial, remova esta validação.
         // Aqui, assumimos que score é enviado no POST para uma nova pontuação.
        return res.status(400).json({ error: 'Score é obrigatório para salvar a pontuação.' });
    }
    if (isNaN(score)) {
        return res.status(400).json({ error: 'Score deve ser um número válido.' });
    }


    try {
        const stmt = db.prepare('INSERT INTO scores (matricula, nome, score) VALUES (?, ?, ?)');
        stmt.run(matricula, nome, score, function(err) {
            if (err) {
                console.error('Erro ao salvar pontuação:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Pontuação salva com sucesso!', id: this.lastID });
        });
        stmt.finalize();
    } catch (error) {
        console.error('Erro ao salvar pontuação (try/catch):', error.message);
        res.status(500).json({ error: 'Erro interno ao salvar pontuação.' });
    }
});

app.get('/api/scores', isAuthenticated, (req, res) => {
    // Obter as top 10 pontuações (agora com nome e matricula)
    db.all('SELECT nome, matricula, score, timestamp FROM scores ORDER BY score DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            console.error('Erro ao obter pontuações:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Endpoint para verificar o status do login (útil para o frontend)
app.get('/api/status', (req, res) => {
    if (req.session && req.session.matricula) {
        res.json({ loggedIn: true, matricula: req.session.matricula, nome: req.session.nome });
    } else {
        res.json({ loggedIn: false });
    }
});


// // Serve arquivos estáticos do frontend
// app.use(express.static(path.join(__dirname, '../../frontend')));

// // Rota padrão para servir o index.html, mas com redirecionamento de login
// app.get('/', isAuthenticated, (req, res) => {
//     // Se o middleware isAuthenticated permitir, significa que o usuário está logado
//     res.sendFile(path.join(__dirname, '../../frontend/index.html'));
// });

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
