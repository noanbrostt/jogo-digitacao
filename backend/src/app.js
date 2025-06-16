// backend/src/app.js
const express = require('express');
const session = require('express-session'); // Para gerenciar sessões
const axios = require('axios'); // Para fazer requisições à API externa
const { db, findUserByMatricula, insertNewUser } = require('./database'); // Importa o db e as novas funções
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Carrega as variáveis do .env principal

const app = express();
const port = process.env.PORT || 3000;

// Variáveis de ambiente para as APIs externas
const EXTERNAL_AUTH_API_URL = process.env.EXTERNAL_AUTH_API_URL;
const EXTERNAL_RESET_PASSWORD_API_URL = process.env.EXTERNAL_RESET_PASSWORD_API_URL;
const API_KEY = process.env.API_KEY;

if (!EXTERNAL_AUTH_API_URL || !EXTERNAL_RESET_PASSWORD_API_URL || !API_KEY) {
    console.error('ERRO: Uma ou mais variáveis de ambiente críticas (EXTERNAL_AUTH_API_URL, EXTERNAL_RESET_PASSWORD_API_URL, ou API_KEY) não estão definidas. Verifique seu arquivo .env.');
    process.exit(1);
}

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

// --- FUNÇÃO PARA INTERAGIR COM A API EXTERNA DE AUTENTICAÇÃO ---
const callExternalAuthApi = async (matricula, senha) => {
    try {
        const response = await axios.post(EXTERNAL_AUTH_API_URL, {
            matricula: matricula,
            senha: senha,
            api_key: API_KEY
        });
        
        if (response.status === 200) {
            const data = response.data;
            if (data && data.status === 'success') {
                return { success: true, nome: data.usuario.nome, matricula: matricula }; // Assume que a API retorna 'nome'
            } else {
                return { success: false, message: data.message || 'Não autorizado pela API externa.' };
            }
        } else {
            // Este bloco será geralmente acionado por um catch se o status não for 2xx
            // Mas, para simular o comportamento de Laravel Http::post que captura status, mantemos aqui
            console.warn(`API externa de autenticação retornou status ${response.status} para ${matricula}.`);
            // Lógica de erro similar ao Laravel
            if (response.status === 401) {
                return { success: false, message: 'Senha incorreta.' };
            } else {
                // Qualquer outro status de erro da API
                return { success: false, message: 'Matrícula não encontrada, cadastra-se em "Criar Senha".' };
            }
        }
    } catch (error) {
        // Erros de rede, timeouts ou respostas com status de erro (4xx, 5xx)
        if (error.response) {
            // A requisição foi feita e o servidor respondeu com um status code
            // que está fora do range de 2xx
            console.error('Erro de resposta da API externa de autenticação:', error.response.status, error.response.data);
            if (error.response.status === 401) {
                // Adaptando a mensagem do Laravel
                return { success: false, message: 'Senha incorreta.' };
            } else {
                // Outros erros como matrícula não encontrada, etc.
                return { success: false, message: error.response.data.message || 'Matrícula não encontrada, cadastra-se em "Criar Senha".' };
            }
        } else if (error.request) {
            // A requisição foi feita, mas nenhuma resposta foi recebida
            console.error('Nenhuma resposta recebida da API externa de autenticação:', error.request);
            return { success: false, message: 'Não foi possível conectar à API de autenticação. Verifique sua conexão.' };
        } else {
            // Algo aconteceu na configuração da requisição que disparou um erro
            console.error('Erro ao configurar requisição para API externa de autenticação:', error.message);
            return { success: false, message: 'Erro interno ao processar requisição de autenticação.' };
        }
    }
};
// --- Fim da função da API externa de autenticação ---

// --- FUNÇÃO PARA INTERAGIR COM A API EXTERNA DE RESETAR SENHA ---
const callExternalResetPasswordApi = async (cpf, nova_senha) => {
    try {
        const response = await axios.post(EXTERNAL_RESET_PASSWORD_API_URL, {
            cpf: cpf,
            nova_senha: nova_senha,
            api_key: API_KEY
        });

        if (response.status === 200) {
            const data = response.data;
            if (data && data.status === 'success') {
                return { success: true, message: data.message || 'Senha resetada com sucesso!' };
            } else {
                // API retornou 200, mas com status 'error' ou sem 'status'
                return { success: false, message: data.message || 'Erro ao resetar senha na API externa.' };
            }
        } else {
            console.warn(`API externa de reset de senha retornou status ${response.status} para CPF ${cpf}.`);
            if (response.status === 401) {
                return { success: false, message: 'Não autorizado pela API.' };
            } else {
                return { success: false, message: 'CPF não encontrado.' }; // Padrão baseado no seu Laravel
            }
        }
    } catch (error) {
        if (error.response) {
            console.error('Erro de resposta da API externa de reset de senha:', error.response.status, error.response.data);
            if (error.response.status === 401) {
                return { success: false, message: 'Não autorizado pela API.' };
            } else {
                return { success: false, message: error.response.data.message || 'CPF não encontrado.' };
            }
        } else if (error.request) {
            console.error('Nenhuma resposta recebida da API externa de reset de senha:', error.request);
            return { success: false, message: 'Não foi possível conectar à API de reset de senha. Verifique sua conexão.' };
        } else {
            console.error('Erro ao configurar requisição para API externa de reset de senha:', error.message);
            return { success: false, message: 'Erro interno ao processar requisição de reset de senha.' };
        }
    }
};
// --- Fim da função da API externa de resetar senha ---

// Rota de Login
app.post('/api/login', async (req, res) => {
    const { matricula, senha } = req.body;

    if (!matricula || !senha) {
        return res.status(400).json({ message: 'Matrícula e senha são obrigatórias.' });
    }

    try {
        // Valida o login com a API externa
        const authResult = await callExternalAuthApi(matricula, senha); // Usa a função auxiliar

        if (authResult.success) {
            const nomeDoUsuario = authResult.nome; // Nome retornado pela API externa
            const matriculaDoUsuario = authResult.matricula; // Matricula garantida pela API externa

            // Checa se o usuário existe na tabela 'scores'
            let userInScores = await findUserByMatricula(matriculaDoUsuario); // Usa matriculaDoUsuario

            if (!userInScores) {
                // Se não existir, insere na tabela 'scores' com score null
                await insertNewUser(matriculaDoUsuario, nomeDoUsuario); // Usa matriculaDoUsuario
                console.log(`Novo usuário inserido na tabela scores: ${matriculaDoUsuario} - ${nomeDoUsuario}`);
            } else {
                console.log(`Usuário ${matriculaDoUsuario} já existe na tabela scores.`);
                // Opcional: Atualizar o nome se a API externa tiver um nome mais recente
                // await db.run('UPDATE scores SET nome = ? WHERE matricula = ?', [nomeDoUsuario, matriculaDoUsuario]);
            }

            // Define a sessão do usuário
            req.session.matricula = matriculaDoUsuario; // Usa matriculaDoUsuario
            req.session.nome = nomeDoUsuario; // Salva o nome também na sessão

            return res.status(200).json({ message: 'Login bem-sucedido!', matricula: matriculaDoUsuario, nome: nomeDoUsuario });
        } else {
            return res.status(401).json({ message: authResult.message || 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        return res.status(500).json({ message: 'Erro interno do servidor durante o login.' });
    }
});

// Rota de Resetar Senha
app.post('/api/reset-password', async (req, res) => {
    const { matricula, cpf, nova_senha } = req.body; // Adicionado matricula aqui, embora seu PHP só use CPF.
                                                    // No frontend Blade, você tem um campo de matrícula para "Criar Senha".
                                                    // Se a API externa não usa matrícula para resetar, você pode ignorá-la aqui.

    if (!cpf || !nova_senha) {
        return res.status(400).json({ message: 'CPF e nova senha são obrigatórios.' });
    }

    try {
        const resetResult = await callExternalResetPasswordApi(cpf, nova_senha); // Usa a função auxiliar

        if (resetResult.success) {
            return res.status(200).json({ message: resetResult.message });
        } else {
            // Adaptando a mensagem de erro do Laravel
            let statusCode = 400; // Padrão para Bad Request
            if (resetResult.message === 'Não autorizado pela API.') {
                statusCode = 401; // Unauthorized
            } else if (resetResult.message === 'CPF não encontrado.') {
                statusCode = 404; // Not Found, se você quiser ser mais específico
            }
            return res.status(statusCode).json({ message: resetResult.message });
        }
    } catch (error) {
        console.error('Erro inesperado no fluxo de reset de senha:', error.message);
        return res.status(500).json({ message: 'Erro interno do servidor durante o reset de senha.' });
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

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
