const fases = {
    1: {
        letras: [
            "a",
            "s",
            "d",
            "f",
            "ç",
            "l",
            "k",
            "j",
            "a",
            "s",
            "d",
            "f",
            "ç",
            "l",
            "k",
            "j",
        ],
        pontos: 50,
        tempo: 15.0,
    },
    2: {
        letras: [
            "a",
            "ç",
            "s",
            "l",
            "e",
            "i",
            "v",
            "n",
            "g",
            "h",
            "a",
            "ç",
            "s",
            "l",
            "e",
            "i",
            "v",
            "n",
            "g",
            "h",
        ],
        pontos: 100,
        tempo: 20.0,
    },
    3: {
        letras: [
            "linha",
            "dados",
            "chat",
            "conta",
            "cliente",
            "setor",
            "turno",
            "contato",
            "rapido",
            "ativo",
            "pausa",
            "ligar",
            "foco",
            "paco",
        ],
        pontos: 150,
        tempo: 25.0,
    },
    4: {
        letras: [
            "Retorno ao cliente a cada cinquenta segundos",
            "Atender sempre com empatia",
            "Lembre de usar a fraseologia correta",
            "Perguntar se pode ajudar em algo mais",
            "Agradecer o cliente pelo contato",
            "Manter um tom de voz calmo e cordial",
            "Registrar corretamente os dados do cliente",
            "Ser claro e objetivo na conversa",
            "Encerrar o atendimento com a fraseologia",
            "Controlar o tma sem apressar o cliente",
            "Revisar os dados antes de transferir",
            "Seguir o script mas com naturalidade",
            "Usar as pausas com responsabilidade",
            "Fechar seus gic no fim do dia",
            "Trocar o lado do headset de tempo em tempo",
        ],
        pontos: 0, // não tem pontuação fixa
        tempo: 30.0,
    },
};

let digitos = ""; // armazena o que o usuário digita
let currentLetter = "";
let score = 0;
let letterIndex = 0;
let timerInterval;
let readyToStart = false;
let hasMistakeInPhrase = false;

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const message = document.getElementById("message");
const backButton = document.getElementById("backButton");
const wordElement = document.getElementById("word");
const inputElement = document.getElementById("input");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const dedos = document.getElementById("dedos");
const teclado = document.getElementById("teclado");

function loadKeyboard() {
    fetch("../templates/teclado.html")
        .then((response) => response.text())
        .then((html) => {
            const container = document.querySelector("#teclado");
            container.innerHTML = html;

            // Executa os scripts dentro do HTML carregado
            container
                .querySelectorAll("script")
                .forEach((script) => {
                    const newScript =
                        document.createElement("script");
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.body.appendChild(newScript);
                });
        })
        .catch((err) => {
            console.error("Erro ao carregar o teclado:", err);
        });
}

function loadFingers() {
    fetch("../templates/dedos.html")
        .then((response) => response.text())
        .then((html) => {
            const container = document.querySelector("#dedos");
            container.innerHTML = html;

            // Executa os scripts dentro do HTML carregado
            container
                .querySelectorAll("script")
                .forEach((script) => {
                    const newScript =
                        document.createElement("script");
                    if (script.src) {
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                    }
                    document.body.appendChild(newScript);
                });
        })
        .catch((err) => {
            console.error("Erro ao carregar os dedos:", err);
        });
}

function returnToMenu() {
    clearInterval(timerInterval);
    readyToStart = false;
    game.classList.add("hidden");
    teclado.classList.add("hidden");
    dedos.classList.add("hidden");
    menu.classList.remove("hidden");
}

function startGame(fase) {
    currentFase = fase;
    letterIndex = 0;

    menu.classList.add("hidden");
    game.classList.remove("hidden");
    dedos.classList.remove("hidden", "small");
    teclado.classList.remove("hidden", "small");
    wordElement.classList.add("hidden");
    inputElement.classList.add("hidden");

    const savedProgress =
        JSON.parse(localStorage.getItem("progresso")) || {};
    const pontuacaoAtual = savedProgress[fase] || 0;

    scoreElement.textContent = "Pontuação: " + pontuacaoAtual;
    scoreElement.classList.remove("hidden");
    timerElement.classList.add("hidden");
    backButton.classList.remove("hidden");
    message.classList.remove("hidden");
    readyToStart = true;
}

function initializeGame() {
    const faseAtual = fases[currentFase];
    score = 0;
    time = faseAtual.tempo;
    updateScore();
    // Randomiza a ordem das frases apenas na fase 4
    if (currentFase === 4) {
        letters = shuffleArray([...faseAtual.letras]);
    } else {
        letters = [...faseAtual.letras];
    }
    currentIndex = 0;
    newLetter();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);
    wordElement.classList.remove("hidden");
    inputElement.classList.remove("hidden");
    if (currentFase !== 4) {
        scoreElement.classList.add("hidden");
    }
    timerElement.classList.remove("hidden");
    message.classList.add("hidden");
    backButton.classList.add("hidden");
    inputElement.focus();
}

function updateScore() {
    scoreElement.textContent = "Pontuação: " + score;
}

function updateTimer() {
    if (time > 0) {
        time -= 0.1;
        timerElement.textContent =
            "Tempo: " + time.toFixed(1) + "s";
    } else {
        clearInterval(timerInterval);
        endGame();
    }
}

function newLetter() {
    inputElement.dataset.lastLength = 0;

    if (currentIndex >= letters.length) {
        endGame();
        return;
    }

    currentLetter = letters[currentIndex];
    currentIndex++;
    inputElement.value = "";

    // Exibir cada letra da palavra em um span para colorir individualmente
    wordElement.innerHTML = "";
    for (let i = 0; i < currentLetter.length; i++) {
        const span = document.createElement("span");
        span.textContent = currentLetter[i];
        span.classList.add("pending"); // cor inicial laranja
        wordElement.appendChild(span);
    }

    // Destacar no teclado e nas mãos a próxima letra
    if (!readyToStart) {
        const nextLetter = getNextLetterToHighlight();
        highlightKey(nextLetter);
        highlightFingerByKey(nextLetter);
    }
}

function getNextLetterToHighlight() {
    const typed = inputElement.value;
    return currentLetter.charAt(typed.length);
}

function endGame() {
    const faseAtual = fases[currentFase];
    let finalScore;

    if (currentFase === 4) {
        finalScore = score;
    } else {
        finalScore =
            score >= faseAtual.letras.length ? faseAtual.pontos : 0;
    }
    highlightKey(""); // Chama a função para destacar a tecla correspondente
    highlightFingerByKey(""); // Chama a função para destacar o dedo correspondente

    alert(
        finalScore > 0 ?
        "Parabéns! Você completou a fase!" :
        "Tempo esgotado!"
    );

    // Atualiza o progresso apenas se a pontuação for maior que a anterior
    if (finalScore > progresso[currentFase]) {
        progresso[currentFase] = finalScore;
        salvarProgresso(currentFase, finalScore);
    }

    // Desbloquear próxima fase se não for a última
    if (finalScore > 0) {
        if (currentFase === 1)
            document.getElementById("btnFase2").disabled = false;
        if (currentFase === 2)
            document.getElementById("btnFase3").disabled = false;
        if (currentFase === 3)
            document.getElementById("btnFase4").disabled = false;
    }

    returnToMenu();
}

inputElement.addEventListener("beforeinput", (event) => {
    const newChar = event.data;
    const currentInput = inputElement.value;

    // Se for apagar ou algo que não envolva texto, libera
    if (
        event.inputType.startsWith("delete") ||
        event.inputType === "insertLineBreak"
    )
        return;

    const proposedValue = currentInput + newChar;

    if (
        currentFase === 4 &&
        currentLetter.toLowerCase().startsWith(proposedValue)
    ) {
        // Somar 3 pontos para cada letra certa digitada (sem repetir caso digite a mesma letra de novo)
        const letrasDigitadasCertas = proposedValue.length;
        const letrasCertasAnteriores =
            inputElement.dataset.lastLength || 0;
        const novasLetrasCertas =
            letrasDigitadasCertas - letrasCertasAnteriores;

        if (novasLetrasCertas > 0) {
            score += novasLetrasCertas * 3;
            updateScore();
            inputElement.dataset.lastLength = letrasDigitadasCertas;
        }
    }

    if (
        currentLetter
        .toLowerCase()
        .startsWith(proposedValue.toLowerCase())
    ) {
        const nextLetter = currentLetter.charAt(
            proposedValue.length
        );
        highlightKey(nextLetter);
        highlightFingerByKey(nextLetter);

        // Atualiza a cor das letras digitadas corretamente
        const spans = wordElement.querySelectorAll("span");
        spans.forEach((span, index) => {
            if (index < proposedValue.length) {
                span.classList.remove("pending");
                span.classList.add("correct");
            } else {
                span.classList.remove("correct");
                span.classList.add("pending");
            }
        });

        // Se acertou a palavra inteira
        if (
            proposedValue.toLowerCase() ===
            currentLetter.toLowerCase()
        ) {
            if (currentFase === 4) {
                const bonus = hasMistakeInPhrase ?
                    currentLetter.length * 2 :
                    currentLetter.length * 4;
                score += bonus;
                hasMistakeInPhrase = false;
            } else {
                score++;
            }
            updateScore();

            inputElement.classList.add("input-correct");
            setTimeout(() => {
                inputElement.classList.remove("input-correct");
            }, 200);
            setTimeout(() => {
                inputElement.value = ""; // limpa o input após acerto
            }, 2);
            newLetter();
        }
    } else {
        event.preventDefault(); // bloqueia a digitação da letra errada
        hasMistakeInPhrase = true;
        inputElement.classList.add("input-error");
        setTimeout(() => {
            inputElement.classList.remove("input-error");
        }, 200);
    }
});

document.addEventListener("keydown", (event) => {
    if (readyToStart && event.key === "Enter") {
        readyToStart = false;
        if (currentFase === 4) {
            dedos.classList.add("small");
            teclado.classList.add("small");
        }
        initializeGame();
    }
});

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const progressoSalvo =
    JSON.parse(localStorage.getItem("progresso")) || {};
const progresso = {
    1: progressoSalvo[1] || 0,
    2: progressoSalvo[2] || 0,
    3: progressoSalvo[3] || 0,
    4: progressoSalvo[4] || 0,
};

function salvarProgresso(fase, pontuacao) {
    progresso[fase] = Math.max(progresso[fase] || 0, pontuacao);
    localStorage.setItem("progresso", JSON.stringify(progresso));
}

function verificarProgressoSalvo() {
    const progressoSalvo =
        JSON.parse(localStorage.getItem("progresso")) || {};

    if (progressoSalvo[1] > 0) {
        document.getElementById("btnFase2").disabled = false;
    }
    if (progressoSalvo[2] > 0) {
        document.getElementById("btnFase3").disabled = false;
    }
    if (progressoSalvo[3] > 0) {
        document.getElementById("btnFase4").disabled = false;
    }
}

verificarProgressoSalvo();

function showRanking() {
    alert("Ranking ainda não implementado.");
}

document.addEventListener("keydown", (e) => {
    // Só continua se o menu estiver visível (sem a classe 'hidden')
    if (!menu || menu.classList.contains("hidden")) return;

    // ignora se a tecla for algo como Shift, Ctrl etc.
    if (e.key.length === 1) {
        digitos += e.key.toLowerCase(); // adiciona à string, em minúsculo

        // mantém apenas os últimos 20 caracteres (pra evitar string gigante)
        if (digitos.length > 20) {
            digitos = digitos.slice(-20);
        }

        // verifica se a palavra secreta foi digitada
        if (digitos.includes("luizinho")) {
            document
                .querySelector("#resetButton")
                .classList.remove("hidden");
            digitos = ""; // reseta após ativar
        }
    }
});

function resetarProgresso() {
    if (
        confirm("Tem certeza que deseja apagar todo o progresso?")
    ) {
        localStorage.removeItem("progresso");
        location.reload();
    }
}