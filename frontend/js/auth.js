// frontend/js/auth.js

// Função para verificar o status do login no backend
async function checkLoginStatus() {
    $('body').hide();

    try {
        const response = await fetch('/api/status'); // Chama o endpoint de status do backend
        const data = await response.json();

        if (!data.loggedIn) {
            // Se não estiver logado, redireciona para a página de login
            window.location.href = '/login.html';
        } else {
            // Se estiver logado, você pode atualizar a UI com as informações do usuário
            console.log(`Usuário logado: ${data.matricula} - ${data.nome}, score ${data.score}`);
            // Exemplo: Atualizar um elemento na página principal

            let nomes = data.nome.split(" ");
            let primeiroNome = nomes[0].charAt(0).toUpperCase() + nomes[0].slice(1).toLowerCase();
            let ultimoNome = nomes[nomes.length - 1].charAt(0).toUpperCase() + nomes[nomes.length - 1].slice(1).toLowerCase();
            let nomeFormatado = primeiroNome + " " + ultimoNome;

            const userInfoElement = document.getElementById('nome_usuario');
            if (userInfoElement) {
                userInfoElement.textContent = `Olá, ${nomeFormatado}`;
            }

            const fases = [
                { score: 300, ids: ["btnFase2", "btnFase3", "btnFase4"] },
                { score: 150, ids: ["btnFase2", "btnFase3"] },
                { score: 50,  ids: ["btnFase2"] },
                { score: 0,  ids: [] }
            ];

            for (const fase of fases) {
                if (data.score >= fase.score) {
                    fase.ids.forEach(id => {
                        document.getElementById(id).disabled = false;
                    });
                    break; // achou o maior nível possível, para aqui
                }
            }

            // Opcional: Salvar no localStorage também para consistência, embora a sessão seja o principal
            localStorage.setItem('userMatricula', data.matricula);
            localStorage.setItem('userName', data.nome);
            localStorage.setItem('userScore', data.score);
        }
        
        $('body').show();

    } catch (error) {
        console.error('Erro ao verificar status de login:', error);
        // Em caso de erro na requisição (servidor fora do ar, etc.), redirecionar para login
        window.location.href = '/login.html';
    }
}

// Função para fazer logout
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (response.ok) {
            console.log(data.message);
            localStorage.removeItem('userMatricula'); // Limpa do localStorage
            localStorage.removeItem('userName');
            window.location.href = '/login.html'; // Redireciona para a página de login
        } else {
            console.error('Erro ao fazer logout:', data.message);
            alert('Não foi possível fazer logout. Tente novamente.'); // Substitua por uma modal se quiser
        }
    } catch (error) {
        console.error('Erro de rede ao fazer logout:', error);
        alert('Erro de conexão ao tentar fazer logout.'); // Substitua por uma modal
    }
}

// Executar a verificação de login assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', checkLoginStatus);
