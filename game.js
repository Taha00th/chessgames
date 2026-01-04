class ChessGame {
    constructor() {
        // Backend yeni Render URL'i
        const serverUrl = 'https://chessgameserver-yflk.onrender.com';
            
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });
        
        this.gameState = null;
        this.selectedSquare = null;
        this.playerColor = null;
        this.playerName = '';
        this.playerAvatar = '👤';
        
        // LocalStorage'dan profil bilgilerini yükle
        this.loadProfile();
        
        // Bağlantı durumunu kontrol et
        this.socket.on('connect', () => {
            console.log('✅ Sunucuya bağlandı:', this.socket.id);
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Sunucu bağlantısı kesildi');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('🔥 Bağlantı hatası:', error);
        });
        
        this.initializeEventListeners();
        this.setupSocketListeners();
    }

    loadProfile() {
        const savedProfile = localStorage.getItem('chessProfile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            this.playerName = profile.name || '';
            this.playerAvatar = profile.avatar || '👤';
        }
    }

    saveProfile() {
        const profile = {
            name: this.playerName,
            avatar: this.playerAvatar
        };
        localStorage.setItem('chessProfile', JSON.stringify(profile));
    }

    initializeEventListeners() {
        // Play button - profil kontrolü
        document.getElementById('playBtn').addEventListener('click', () => {
            if (this.playerName) {
                this.showLoginForm();
            } else {
                this.showProfileForm();
            }
        });

        // Profile form buttons
        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            this.handleProfileSave();
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.hideProfileForm();
        });

        // Avatar değiştirme
        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            this.changeAvatar();
        });

        // Edit profile button
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.showProfileForm();
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.hideLoginForm();
        });

        // Login
        document.getElementById('findGameBtn').addEventListener('click', () => {
            if (this.playerName) {
                this.socket.emit('findGame', this.playerName);
                this.showScreen('waitingScreen');
            }
        });

        // Enter tuşu ile profil kaydetme
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (document.getElementById('profileForm').classList.contains('hidden')) {
                    document.getElementById('findGameBtn').click();
                } else {
                    document.getElementById('saveProfileBtn').click();
                }
            }
        });
    }

    showProfileForm() {
        document.querySelector('.play-section').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('profileForm').classList.remove('hidden');
        
        // Mevcut profil bilgilerini doldur
        document.getElementById('playerName').value = this.playerName;
        document.getElementById('avatarPreview').textContent = this.playerAvatar;
        
        setTimeout(() => {
            document.getElementById('playerName').focus();
        }, 100);
    }

    hideProfileForm() {
        document.querySelector('.play-section').classList.remove('hidden');
        document.getElementById('profileForm').classList.add('hidden');
    }

    handleProfileSave() {
        const name = document.getElementById('playerName').value.trim();
        if (name) {
            this.playerName = name;
            this.playerAvatar = document.getElementById('avatarPreview').textContent;
            this.saveProfile();
            this.updateUserDisplay();
            this.showLoginForm();
        }
    }

    changeAvatar() {
        const avatars = ['👤', '🤴', '👑', '🎭', '🎪', '🎨', '🎯', '🎲', '🎮', '🚀', '⭐', '🔥', '💎', '🏆', '👨‍💻', '🧙‍♂️'];
        const currentIndex = avatars.indexOf(this.playerAvatar);
        const nextIndex = (currentIndex + 1) % avatars.length;
        this.playerAvatar = avatars[nextIndex];
        document.getElementById('avatarPreview').textContent = this.playerAvatar;
    }

    showLoginForm() {
        document.querySelector('.play-section').classList.add('hidden');
        document.getElementById('profileForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        this.updateUserDisplay();
    }

    hideLoginForm() {
        document.querySelector('.play-section').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    }

    updateUserDisplay() {
        document.getElementById('userAvatar').textContent = this.playerAvatar;
        document.getElementById('welcomeText').textContent = `Hoş geldin, ${this.playerName}!`;
        document.getElementById('userNameDisplay').textContent = this.playerName;
    }

    setupSocketListeners() {
        this.socket.on('waiting', () => {
            this.showScreen('waitingScreen');
        });

        this.socket.on('gameStart', (gameState) => {
            this.gameState = gameState;
            this.playerColor = gameState.players.white.id === this.socket.id ? 'white' : 'black';
            
            this.showScreen('gameScreen');
            this.updateGameUI();
            this.renderBoard();
        });

        this.socket.on('moveMade', (data) => {
            this.gameState.board = data.board;
            this.gameState.currentTurn = data.currentTurn;
            this.selectedSquare = null;
            
            this.renderBoard();
            this.updateTurnIndicator();
        });

        this.socket.on('playerDisconnected', () => {
            document.getElementById('statusText').textContent = 'Rakibiniz oyundan ayrıldı.';
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    updateGameUI() {
        const opponent = this.playerColor === 'white' ? this.gameState.players.black : this.gameState.players.white;
        
        document.getElementById('yourName').textContent = this.playerName;
        document.getElementById('opponentName').textContent = opponent.name;
        
        document.getElementById('yourColor').className = `color-indicator ${this.playerColor}`;
        document.getElementById('opponentColor').className = `color-indicator ${this.playerColor === 'white' ? 'black' : 'white'}`;
        
        this.updateTurnIndicator();
    }

    updateTurnIndicator() {
        const isMyTurn = this.gameState.currentTurn === this.playerColor;
        const turnText = isMyTurn ? 'Sizin sıranız' : 'Rakibinizin sırası';
        document.getElementById('turnText').textContent = turnText;
    }

    renderBoard() {
        const boardElement = document.getElementById('chessboard');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.gameState.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}`;
                    pieceElement.textContent = this.getPieceSymbol(piece.type, piece.color);
                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }
    }

    getPieceSymbol(type, color) {
        const symbols = {
            white: {
                king: '♔',
                queen: '♕',
                rook: '♖',
                bishop: '♗',
                knight: '♘',
                pawn: '♙'
            },
            black: {
                king: '♚',
                queen: '♛',
                rook: '♜',
                bishop: '♝',
                knight: '♞',
                pawn: '♟'
            }
        };
        return symbols[color][type];
    }

    handleSquareClick(row, col) {
        // Sıra kontrolü
        if (this.gameState.currentTurn !== this.playerColor) {
            return;
        }

        const piece = this.gameState.board[row][col];
        
        if (this.selectedSquare) {
            // Hamle yapma
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                // Aynı kareye tıklandı, seçimi kaldır
                this.selectedSquare = null;
                this.clearHighlights();
            } else {
                // Hamle yap
                this.socket.emit('makeMove', {
                    gameId: this.gameState.id,
                    from: this.selectedSquare,
                    to: { row, col }
                });
                this.clearHighlights();
            }
        } else if (piece && piece.color === this.playerColor) {
            // Taş seçme
            this.selectedSquare = { row, col };
            this.highlightSquare(row, col);
        }
    }

    highlightSquare(row, col) {
        this.clearHighlights();
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move');
        });
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
