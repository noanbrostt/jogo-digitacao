// backend/src/app.js
const express = require('express');
const session = require('express-session'); // Para gerenciar sessões
const axios = require('axios'); // Para fazer requisições à API externa
const {
    db,
    insertNewUser
} = require('./database'); // Importa o db e as novas funções
const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
}); // Carrega as variáveis do .env principal

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
                return {
                    success: true,
                    nome: data.usuario.nome,
                    matricula: matricula
                }; // Assume que a API retorna 'nome'
            } else {
                return {
                    success: false,
                    message: data.message || 'Não autorizado pela API externa.'
                };
            }
        } else {
            // Este bloco será geralmente acionado por um catch se o status não for 2xx
            // Mas, para simular o comportamento de Laravel Http::post que captura status, mantemos aqui
            console.warn(`API externa de autenticação retornou status ${response.status} para ${matricula}.`);
            // Lógica de erro similar ao Laravel
            if (response.status === 401) {
                return {
                    success: false,
                    message: 'Senha incorreta.'
                };
            } else {
                // Qualquer outro status de erro da API
                return {
                    success: false,
                    message: 'Matrícula não encontrada, cadastra-se em "Criar Senha".'
                };
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
                return {
                    success: false,
                    message: 'Senha incorreta.'
                };
            } else {
                // Outros erros como matrícula não encontrada, etc.
                return {
                    success: false,
                    message: error.response.data.message || 'Matrícula não encontrada, cadastra-se em "Criar Senha".'
                };
            }
        } else if (error.request) {
            // A requisição foi feita, mas nenhuma resposta foi recebida
            console.error('Nenhuma resposta recebida da API externa de autenticação:', error.request);
            return {
                success: false,
                message: 'Não foi possível conectar à API de autenticação. Verifique sua conexão.'
            };
        } else {
            // Algo aconteceu na configuração da requisição que disparou um erro
            console.error('Erro ao configurar requisição para API externa de autenticação:', error.message);
            return {
                success: false,
                message: 'Erro interno ao processar requisição de autenticação.'
            };
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
                return {
                    success: true,
                    message: data.message || 'Senha resetada com sucesso!'
                };
            } else {
                // API retornou 200, mas com status 'error' ou sem 'status'
                return {
                    success: false,
                    message: data.message || 'Erro ao resetar senha na API externa.'
                };
            }
        } else {
            console.warn(`API externa de reset de senha retornou status ${response.status} para CPF ${cpf}.`);
            if (response.status === 401) {
                return {
                    success: false,
                    message: 'Não autorizado pela API.'
                };
            } else {
                return {
                    success: false,
                    message: 'CPF não encontrado.'
                }; // Padrão baseado no seu Laravel
            }
        }
    } catch (error) {
        if (error.response) {
            console.error('Erro de resposta da API externa de reset de senha:', error.response.status, error.response.data);
            if (error.response.status === 401) {
                return {
                    success: false,
                    message: 'Não autorizado pela API.'
                };
            } else {
                return {
                    success: false,
                    message: error.response.data.message || 'CPF não encontrado.'
                };
            }
        } else if (error.request) {
            console.error('Nenhuma resposta recebida da API externa de reset de senha:', error.request);
            return {
                success: false,
                message: 'Não foi possível conectar à API de reset de senha. Verifique sua conexão.'
            };
        } else {
            console.error('Erro ao configurar requisição para API externa de reset de senha:', error.message);
            return {
                success: false,
                message: 'Erro interno ao processar requisição de reset de senha.'
            };
        }
    }
};
// --- Fim da função da API externa de resetar senha ---

const loginSucedido = async (req, res, nome, matricula) => {

    const getUserScore = () => {
        return new Promise((resolve, reject) => {
            db.get('SELECT score FROM scores WHERE matricula = ?', [matricula], (err, row) => {
                if (err) {
                    console.error('Erro ao obter pontuação ao fazer loginSucedido:', err.message);
                    return reject(err);
                }
                resolve(row);
            });
        });
    };

    // Checa se o usuário existe na tabela 'scores'
    let userInScores = await getUserScore(); // Usa matricula
    let currentTotalScore = 0;

    if (!userInScores) {
        // Se não existir, insere na tabela 'scores' com score 0
        await insertNewUser(matricula, nome); // Assumindo insertNewUser insere com score inicial 0
        console.log(`Novo usuário inserido na tabela scores: ${matricula} - ${nome}`);

    } else {
        currentTotalScore = userInScores.score || 0; // Obtém o score existente, padrão para 0
        console.log(`Usuário ${matricula} já existe e possui score ${currentTotalScore}.`);
    }

    // Define a sessão do usuário
    req.session.matricula = matricula;
    req.session.nome = nome;
    req.session.score = currentTotalScore;
};

// Rota de Login
app.post('/api/login', async (req, res) => {
    const {
        matricula,
        senha
    } = req.body;

    if (!matricula || !senha) {
        return res.status(400).json({
            message: 'Matrícula e senha são obrigatórias.'
        });
    }

    try {
        // Valida o login com a API externa
        const authResult = await callExternalAuthApi(matricula, senha); // Usa a função auxiliar

        if (authResult.success) {
            await loginSucedido(req, res, authResult.nome, authResult.matricula);

            return res.status(200).json({
                message: 'Login bem-sucedido!',
                matricula: authResult.matricula,
                nome: authResult.nome
            });
        } else {
            return res.status(401).json({
                message: authResult.message || 'Credenciais inválidas.'
            });
        }
    } catch (error) {
        console.error('Erro no login:', error.message);
        return res.status(500).json({
            message: 'Erro interno do servidor durante o login.'
        });
    }
});

// Rota de Resetar Senha
app.post('/api/reset-password', async (req, res) => {
    const {
        matricula,
        cpf,
        nova_senha
    } = req.body;

    if (!cpf || !nova_senha) {
        return res.status(400).json({
            message: 'CPF e nova senha são obrigatórios.'
        });
    }

    try {
        const resetResult = await callExternalResetPasswordApi(cpf, nova_senha); // Usa a função auxiliar
        
        if (resetResult.success) {
            const authResult = await callExternalAuthApi(matricula, nova_senha); // Usa a função auxiliar

            if (authResult.success) {
                await loginSucedido(req, res, authResult.nome, authResult.matricula);

                return res.status(200).json({
                    message: 'Reset bem-sucedido!',
                    matricula: matricula,
                    nome: resetResult.nome
                });
            } else {
                return res.status(200).json({
                    message: 'Senha resetada, faça login novamente.'
                });
            }

        } else {
            // Adaptando a mensagem de erro do Laravel
            let statusCode = 400; // Padrão para Bad Request
            if (resetResult.message === 'Não autorizado pela API.') {
                statusCode = 401; // Unauthorized
            } else if (resetResult.message === 'CPF não encontrado.') {
                statusCode = 404; // Not Found, se você quiser ser mais específico
            }
            return res.status(statusCode).json({
                message: resetResult.message
            });
        }
    } catch (error) {
        console.error('Erro inesperado no fluxo de reset de senha:', error.message);
        return res.status(500).json({
            message: 'Erro interno do servidor durante o reset de senha.'
        });
    }
});


// Rota de Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir sessão:', err);
            return res.status(500).json({
                message: 'Erro ao fazer logout.'
            });
        }
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão
        res.status(200).json({
            message: 'Logout bem-sucedido.'
        });
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
            res.status(401).json({
                message: 'Não autorizado. Por favor, faça login.'
            });
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
    const oldScore = req.session.score;
    const {
        score
    } = req.body;

    console.log(score);
    
    // Validação do score
    if (isNaN(score)) {
        return res.status(400).json({
            error: 'Score deve ser um número válido.'
        });
    }

    if (oldScore >= score) {
        return;
    }

    try {
        db.run('UPDATE scores SET score = ? WHERE matricula = ?', [score, matricula], function(err) {
            if (err) {
                res.status(500).json({
                    error: 'Erro interno ao salvar pontuação.'
                });
                return;
            }
            req.session.score = score;
            console.log(`Score atualizado para ${score} na matrícula ${matricula}`);
        });

        return res.status(200).json({
            message: 'Score salvo!'
        });

    } catch (error) {
        console.error('Erro ao salvar pontuação (try/catch):', error.message);
        res.status(500).json({
            error: 'Erro interno ao salvar pontuação.'
        });
    }
});

app.get('/api/scores', isAuthenticated, (req, res) => {
    // Obter as top 10 pontuações (agora com nome e matricula)
    db.all('SELECT nome, matricula, score, timestamp FROM scores ORDER BY score DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            console.error('Erro ao obter pontuações:', err.message);
            return res.status(500).json({
                error: err.message
            });
        }
        res.json(rows);
    });
});

app.get('/api/leaderboard', (req, res) => {
    const minhaMatricula = req.session.matricula;

    if (!minhaMatricula) return res.status(401).json({ error: 'Não autenticado' });

    const queryTop10 = `
        SELECT matricula, nome, score, timestamp
        FROM scores
        ORDER BY score DESC, timestamp ASC
        LIMIT 10
    `;

    const queryUsuario = `
        SELECT
            matricula,
            nome,
            score,
            timestamp,
            (
                SELECT COUNT(*) + 1
                FROM scores s2
                WHERE s2.score > s1.score
                OR (s2.score = s1.score AND s2.timestamp < s1.timestamp)
            ) AS posicao
        FROM scores s1
        WHERE matricula = ?
    `;

    db.all(queryTop10, [], (err, top10) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get(queryUsuario, [minhaMatricula], (err, usuario) => {
            if (err) return res.status(500).json({ error: err.message });

            const jaNoTop10 = top10.some(entry => entry.matricula === minhaMatricula);

            res.json({
                top10,
                minhaMatricula,
                usuario: jaNoTop10 ? null : usuario
            });
        });
    });
});

// Endpoint para verificar o status do login (útil para o frontend)
app.get('/api/status', (req, res) => {
    if (req.session && req.session.matricula) {
        res.json({
            loggedIn: true,
            matricula: req.session.matricula,
            nome: req.session.nome,
            score: req.session.score
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});