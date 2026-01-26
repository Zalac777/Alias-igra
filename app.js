// ============================================
// SCREEN WAKE LOCK
// ============================================
let wakeLock = null;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock aktiviran');
            
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock otpušten');
            });
        } catch (err) {
            console.error('Wake Lock greška:', err);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            });
    }
}

// Globalne varijable
let gameState = {
    numTeams: 2,
    numPlayers: 2,
    roundTime: 30,
    winScore: 10,
    difficulty: 'kombinirano',
    selectedCategories: [],
    teams: [],
    currentTeamIndex: 0,
    currentRound: 0,
    availableWords: [],
    usedWords: [],
    currentWord: '',
    roundScore: 0,
    timerInterval: null,
    timeRemaining: 0,
    isPaused: false,
    roundStats: { correct: 0, skipped: 0, totalWords: 0 },
    lastAction: null,
    soundMuted: false  // DODAJ OVO
};

// Inicijalizacija
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadSavedLists();
});

// === NAVIGACIJA IZMEĐU EKRANA ===

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showStart() {
    showScreen('startScreen');
}

function showSetup() {
    showScreen('setupScreen');
}

function showCustomLists() {
    loadSavedLists();
    showScreen('customListsScreen');
}

// === SETUP KONTROLE ===

function changeTeams(delta) {
    gameState.numTeams = Math.max(2, Math.min(4, gameState.numTeams + delta));
    document.getElementById('numTeams').textContent = gameState.numTeams;
}

function changePlayers(delta) {
    gameState.numPlayers = Math.max(2, Math.min(6, gameState.numPlayers + delta));
    document.getElementById('numPlayers').textContent = gameState.numPlayers;
}

function selectTime(seconds) {
    gameState.roundTime = seconds;
    const parentSelector = event.target.parentElement;
    parentSelector.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function selectWinScore(score) {
    gameState.winScore = score;
    const parentSelector = event.target.parentElement;
    parentSelector.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;
    const parentSelector = event.target.parentElement;
    parentSelector.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// === KATEGORIJE ===

function loadCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    dostupneTeme.forEach(tema => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.textContent = tema.naziv;
        item.onclick = () => toggleCategory(tema.naziv, item);
        categoryList.appendChild(item);
    });
    
    const customLists = getCustomLists();
    customLists.forEach(list => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.textContent = list.name;
        item.onclick = () => toggleCategory(list.name, item);
        categoryList.appendChild(item);
    });
}

function toggleCategory(categoryName, element) {
    if (gameState.selectedCategories.includes(categoryName)) {
        gameState.selectedCategories = gameState.selectedCategories.filter(c => c !== categoryName);
        element.classList.remove('selected');
    } else {
        gameState.selectedCategories.push(categoryName);
        element.classList.add('selected');
    }
}

// === IMENA IGRAČA ===

function showPlayerNames() {
    if (gameState.selectedCategories.length === 0) {
        alert('Molimo odaberite barem jednu temu!');
        return;
    }
    
    const container = document.getElementById('playerNamesContainer');
    container.innerHTML = '';
    
    for (let i = 0; i < gameState.numTeams; i++) {
        const teamSection = document.createElement('div');
        teamSection.className = 'team-section';
        
        const teamTitle = document.createElement('h3');
        teamTitle.className = 'team-title';
        teamTitle.textContent = `TIM ${i + 1}`;
        teamSection.appendChild(teamTitle);
        
        for (let j = 0; j < gameState.numPlayers; j++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-input';
            input.placeholder = `Igrač ${j + 1}`;
            input.dataset.team = i;
            input.dataset.player = j;
            teamSection.appendChild(input);
        }
        
        container.appendChild(teamSection);
    }
    
    showScreen('playerNamesScreen');
}

// === POČETAK IGRE ===

async function startGame() {
    try {
        const inputs = document.querySelectorAll('.player-input');
        gameState.teams = [];
        
        for (let i = 0; i < gameState.numTeams; i++) {
            const team = {
                name: `TIM ${i + 1}`,
                players: [],
                score: 0
            };
            
            for (let j = 0; j < gameState.numPlayers; j++) {
                const input = document.querySelector(`[data-team="${i}"][data-player="${j}"]`);
                const playerName = input.value.trim() || `Igrač ${j + 1}`;
                team.players.push(playerName);
            }
            
            gameState.teams.push(team);
        }
        
        await loadWords();
        
        if (gameState.availableWords.length === 0) {
            alert('Greška pri učitavanju riječi. Molimo provjerite jesu li svi fileovi ispravno učitani.');
            return;
        }
        
        gameState.currentTeamIndex = 0;
        gameState.currentRound = 0;
        gameState.usedWords = [];
        
        showBeforeRound();
    } catch (error) {
        console.error('Greška pri pokretanju igre:', error);
        alert('Dogodila se greška pri pokretanju igre. Provjerite konzolu za detalje.');
    }
}

async function loadWords() {
    gameState.availableWords = [];
    
    for (const categoryName of gameState.selectedCategories) {
        try {
            const customLists = getCustomLists();
            const customList = customLists.find(list => list.name === categoryName);
            
            if (customList) {
                gameState.availableWords.push(...customList.words);
                console.log(`Učitana custom lista: ${categoryName} (${customList.words.length} riječi)`);
            } else {
                const tema = dostupneTeme.find(t => t.naziv === categoryName);
                if (tema) {
                    if (gameState.difficulty === 'kombinirano') {
                        const lakoWords = window[tema.variables.lako];
                        const srednjeWords = window[tema.variables.srednje];
                        const teskoWords = window[tema.variables.tesko];
                        
                        if (lakoWords) gameState.availableWords.push(...lakoWords);
                        if (srednjeWords) gameState.availableWords.push(...srednjeWords);
                        if (teskoWords) gameState.availableWords.push(...teskoWords);
                        
                        console.log(`Učitana tema: ${categoryName} - sve težine`);
                    } else {
                        const variableName = tema.variables[gameState.difficulty];
                        const words = window[variableName];
                        
                        if (words && Array.isArray(words) && words.length > 0) {
                            gameState.availableWords.push(...words);
                            console.log(`Učitana tema: ${categoryName} - ${gameState.difficulty} (${words.length} riječi)`);
                        } else {
                            console.error(`Tema ${categoryName} - težina ${gameState.difficulty} ne postoji ili je prazna`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Greška pri učitavanju kategorije ${categoryName}:`, error);
        }
    }
    
    console.log(`Ukupno učitano riječi: ${gameState.availableWords.length}`);
    
    if (gameState.availableWords.length > 0) {
        shuffleArray(gameState.availableWords);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// === PRIJE RUNDE ===

function showBeforeRound() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const playerIndex = gameState.currentRound % gameState.numPlayers;
    const nextPlayerIndex = (playerIndex + 1) % gameState.numPlayers;
    
    const reader = currentTeam.players[playerIndex];
    const explainer = currentTeam.players[nextPlayerIndex];
    
    document.getElementById('currentTeamName').textContent = currentTeam.name;
    document.getElementById('readerName').textContent = `${reader} čita`;
    document.getElementById('explainerName').textContent = `${explainer} objašnjava`;
    
    showScreen('beforeRoundScreen');
}

// === TIJEKOM RUNDE ===

async function startRound() {
    // Wake lock i reset stats
    await requestWakeLock();
    gameState.roundStats = { correct: 0, skipped: 0, totalWords: 0 };
    gameState.isPaused = false;
    
    // Početni setup
    gameState.roundScore = 0;
    gameState.timeRemaining = gameState.roundTime;
    
    document.getElementById('roundScore').textContent = '0';
    updateTimer();
    nextWord();
    
    // Kreiraj ili ažuriraj sticky scoreboard
    updateStickyScoreboard();
    
    showScreen('gameScreen');
    
    // Pokreni tajmer
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimer();
        
        if (gameState.timeRemaining <= 0) {
            endRound();
        }
    }, 1000);
}

function updateStickyScoreboard() {
    const container = document.getElementById('stickyScoreboard');
    container.innerHTML = '';
    
    gameState.teams.forEach((team, index) => {
        const row = document.createElement('div');
        row.className = 'scoreboard-row';
        
        const teamLabel = document.createElement('span');
        teamLabel.className = 'scoreboard-team-label';
        teamLabel.textContent = team.name;
        
        const sep1 = document.createElement('span');
        sep1.className = 'scoreboard-separator';
        sep1.textContent = ':';
        
        const players = document.createElement('span');
        players.className = 'scoreboard-players';
        players.textContent = team.players.join(' / ');
        
        const sep2 = document.createElement('span');
        sep2.className = 'scoreboard-separator';
        sep2.textContent = ':';
        
        const points = document.createElement('span');
        points.className = 'scoreboard-points';
        points.textContent = team.score;
        
        row.appendChild(teamLabel);
        row.appendChild(sep1);
        row.appendChild(players);
        row.appendChild(sep2);
        row.appendChild(points);
        
        container.appendChild(row);
    });
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = gameState.timeRemaining;
    
    // Warning animacija zadnjih 10 sekundi
    if (gameState.timeRemaining <= 10) {
        timerElement.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
    }
    
    // 🎵 TICK ZVUK zadnje 4 sekunde
    if (gameState.timeRemaining <= 4 && gameState.timeRemaining > 0) {
        playTickSound();
        hapticFeedback('light'); // Bonus: vibracija također
    }
}

function nextWord() {
    let word = '';
    let attempts = 0;
    
    while (attempts < 100) {
        const randomIndex = Math.floor(Math.random() * gameState.availableWords.length);
        word = gameState.availableWords[randomIndex];
        
        if (!gameState.usedWords.includes(word)) {
            gameState.usedWords.push(word);
            break;
        }
        
        attempts++;
    }
    
    if (attempts >= 100) {
        gameState.usedWords = [];
        word = gameState.availableWords[Math.floor(Math.random() * gameState.availableWords.length)];
        gameState.usedWords.push(word);
    }
    
    gameState.currentWord = word;
    document.getElementById('currentWord').textContent = word.toUpperCase();
}

function correctWord() {
    if (gameState.isPaused) return;
    
    gameState.lastAction = { type: 'correct', word: gameState.currentWord };
    gameState.roundStats.correct++;
    gameState.roundStats.totalWords++;
    playCorrectSound();
    hapticFeedback('light');
    
    gameState.roundScore++;
    document.getElementById('roundScore').textContent = gameState.roundScore > 0 ? `+${gameState.roundScore}` : gameState.roundScore;
    nextWord();
}

function skipWord() {
    if (gameState.isPaused) return;
    
    gameState.lastAction = { type: 'skip', word: gameState.currentWord };
    gameState.roundStats.skipped++;
    gameState.roundStats.totalWords++;
    playSkipSound();
    hapticFeedback('medium');
    
    gameState.roundScore--;
    document.getElementById('roundScore').textContent = gameState.roundScore > 0 ? `+${gameState.roundScore}` : gameState.roundScore;
    nextWord();
}

function endRound() {
    clearInterval(gameState.timerInterval);
    
    gameState.teams[gameState.currentTeamIndex].score += gameState.roundScore;
    
    updateStickyScoreboard();
    
    releaseWakeLock();
    playTimeUpSound();
    hapticFeedback('heavy');
    
    showAfterRound();
}

// === NAKON RUNDE ===

function showAfterRound() {
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    
    document.getElementById('afterRoundTeam').textContent = currentTeam.name;
    document.getElementById('roundResultScore').textContent = 
        gameState.roundScore > 0 ? `+${gameState.roundScore}` : gameState.roundScore;
    
    updateScoreboard('scoreboardContainer');
    
    showScreen('afterRoundScreen');
}

function updateScoreboard(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);
    
    sortedTeams.forEach((team, index) => {
        const item = document.createElement('div');
        item.className = 'scoreboard-item';
        if (index === 0) item.classList.add('leader');
        
        const teamName = document.createElement('span');
        teamName.className = 'team-name';
        teamName.textContent = team.name;
        
        const teamScore = document.createElement('span');
        teamScore.className = 'team-score';
        teamScore.textContent = team.score;
        
        item.appendChild(teamName);
        item.appendChild(teamScore);
        container.appendChild(item);
    });
}

function nextTeam() {
    const winner = gameState.teams.find(team => team.score >= gameState.winScore);
    
    if (winner) {
        showEndScreen(winner);
        return;
    }
    
    gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.numTeams;
    
    if (gameState.currentTeamIndex === 0) {
        gameState.currentRound++;
    }
    
    showBeforeRound();
}

// === KRAJ IGRE ===

function showEndScreen(winner) {
    document.getElementById('winnerTeam').textContent = winner.name;
    document.getElementById('winnerScore').textContent = `${winner.score} bodova`;
    
    updateScoreboard('finalScoreboardContainer');
    
    showScreen('endScreen');
}

// === CUSTOM LISTE ===

function getCustomLists() {
    const lists = localStorage.getItem('aliasCustomLists');
    return lists ? JSON.parse(lists) : [];
}

function saveCustomListsToStorage(lists) {
    localStorage.setItem('aliasCustomLists', JSON.stringify(lists));
}

function saveCustomList() {
    const nameInput = document.getElementById('customListName');
    const wordsInput = document.getElementById('customListWords');
    
    const name = nameInput.value.trim();
    const wordsText = wordsInput.value.trim();
    
    if (!name) {
        alert('Molimo unesite naziv teme!');
        return;
    }
    
    if (!wordsText) {
        alert('Molimo unesite riječi!');
        return;
    }
    
    const words = wordsText.split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0);
    
    if (words.length === 0) {
        alert('Molimo unesite barem jednu riječ!');
        return;
    }
    
    const customLists = getCustomLists();
    
    const existingIndex = customLists.findIndex(list => list.name === name);
    
    if (existingIndex >= 0) {
        if (!confirm('Lista s tim nazivom već postoji. Želite li je zamijeniti?')) {
            return;
        }
        customLists[existingIndex] = { name, words };
    } else {
        customLists.push({ name, words });
    }
    
    saveCustomListsToStorage(customLists);
    
    nameInput.value = '';
    wordsInput.value = '';
    
    loadSavedLists();
    loadCategories();
    
    alert('Lista uspješno spremljena!');
}

function loadSavedLists() {
    const container = document.getElementById('savedListsList');
    const customLists = getCustomLists();
    
    if (customLists.length === 0) {
        container.innerHTML = '<div class="empty-state">Još nema spremljenih listi</div>';
        return;
    }
    
    container.innerHTML = '';
    
    customLists.forEach((list, index) => {
        const item = document.createElement('div');
        item.className = 'saved-list-item';
        
        const info = document.createElement('div');
        const listName = document.createElement('div');
        listName.className = 'list-name';
        listName.textContent = list.name;
        
        const listCount = document.createElement('div');
        listCount.className = 'list-count';
        listCount.textContent = `${list.words.length} riječi`;
        
        info.appendChild(listName);
        info.appendChild(listCount);
        
        const actions = document.createElement('div');
        actions.className = 'list-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.textContent = 'Uredi';
        editBtn.onclick = () => editCustomList(index);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.textContent = 'Obriši';
        deleteBtn.onclick = () => deleteCustomList(index);
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

function editCustomList(index) {
    const customLists = getCustomLists();
    const list = customLists[index];
    
    document.getElementById('customListName').value = list.name;
    document.getElementById('customListWords').value = list.words.join('\n');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCustomList(index) {
    if (!confirm('Jeste li sigurni da želite obrisati ovu listu?')) {
        return;
    }
    
    const customLists = getCustomLists();
    customLists.splice(index, 1);
    saveCustomListsToStorage(customLists);
    
    loadSavedLists();
    loadCategories();
}

// ============================================
// NOVE FUNKCIJE - POBOLJŠANJA
// ============================================

// PAUZA
function togglePause() {
    if (gameState.isPaused) {
        gameState.isPaused = false;
        
        gameState.timerInterval = setInterval(() => {
            gameState.timeRemaining--;
            updateTimer();
            
            if (gameState.timeRemaining <= 0) {
                endRound();
            }
        }, 1000);
        
        document.getElementById('pauseBtn').textContent = 'PAUZIRAJ';
        document.getElementById('pauseBtn').classList.remove('paused');
    } else {
        gameState.isPaused = true;
        clearInterval(gameState.timerInterval);
        
        document.getElementById('pauseBtn').textContent = 'NASTAVI';
        document.getElementById('pauseBtn').classList.add('paused');
    }
}

// ZVUČNI EFEKTI
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playCorrectSound() {
    if (gameState.soundMuted) return; // DODAJ
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
}

function playSkipSound() {
    if (gameState.soundMuted) return; // DODAJ

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
}

function playTimeUpSound() {
    if (gameState.soundMuted) return; // DODAJ

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.frequency.value = 600;
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0.10, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        }, i * 150);
    }
}

function playTickSound() {
    if (gameState.soundMuted) return; // DODAJ

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Kratak, visok "tik" zvuk (poput drvenih štapića)
    oscillator.frequency.value = 1200; // Visoki ton
    oscillator.type = 'square'; // Oštar zvuk
    
    // Vrlo kratko trajanje (kao klik)
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // Tiši od ostalih
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.05); // Jako kratko (50ms)
}

function toggleSound() {
    gameState.soundMuted = !gameState.soundMuted;
    
    const btn = document.getElementById('soundBtn');
    if (gameState.soundMuted) {
        btn.textContent = '🔇';
        btn.classList.add('muted');
    } else {
        btn.textContent = '🔊';
        btn.classList.remove('muted');
    }
}

// HAPTIC FEEDBACK
function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        switch(type) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'heavy':
                navigator.vibrate(50);
                break;
        }
    }
}

// UNDO - OPCIJA 1: Samo poništi bod, NE vraćaj riječ
function undoLastAction() {
    if (!gameState.lastAction) return;
    
    const action = gameState.lastAction;
    
    // Vrati bod ovisno o akciji
    if (action.type === 'correct') {
        gameState.roundScore--;
        if (gameState.roundStats) gameState.roundStats.correct--;
        if (gameState.roundStats) gameState.roundStats.totalWords--;
    } else if (action.type === 'skip') {
        gameState.roundScore++;
        if (gameState.roundStats) gameState.roundStats.skipped--;
        if (gameState.roundStats) gameState.roundStats.totalWords--;
    }
    
    // Ažuriraj prikaz rezultata
    document.getElementById('roundScore').textContent = 
        gameState.roundScore > 0 ? `+${gameState.roundScore}` : gameState.roundScore;
    
    // Resetiraj last action
    gameState.lastAction = null;
    
    // Opcijski feedback (vibracija)
    hapticFeedback('light');
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('gameScreen').classList.contains('active')) {
        return;
    }
    
    if (gameState.isPaused) {
        return;
    }
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            correctWord();
            break;
        case 'Backspace':
            e.preventDefault();
            skipWord();
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
        case 'z':
        case 'Z':
            e.preventDefault();
            undoLastAction();
            break;
    }
});

// AUTO-PAUZA kad se minimizira app
document.addEventListener('visibilitychange', () => {
    if (document.hidden && !gameState.isPaused && 
        document.getElementById('gameScreen').classList.contains('active')) {
        togglePause();
    }
});
