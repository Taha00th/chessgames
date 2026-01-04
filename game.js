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
            this.showPossibleMoves(row, col, piece);
        }
    }

    showPossibleMoves(row, col, piece) {
        const possibleMoves = this.getPossibleMoves(row, col, piece);
        possibleMoves.forEach(move => {
            const square = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            square.classList.add('possible-move');
            
            // Eğer hedef karede rakip taş varsa, capture olarak işaretle
            if (this.gameState.board[move.row][move.col]) {
                square.classList.add('capture');
            }
        });
    }

    getPossibleMoves(row, col, piece) {
        const moves = [];
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (r === row && c === col) continue;
                
                if (this.isValidMove(this.gameState.board, {row, col}, {row: r, col: c}, piece)) {
                    moves.push({row: r, col: c});
                }
            }
        }
        
        return moves;
    }

    isValidMove(board, from, to, piece) {
        const targetPiece = board[to.row][to.col];
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        
        switch (piece.type) {
            case 'pawn':
                return this.isValidPawnMove(board, from, to, piece.color);
            case 'rook':
                return this.isValidRookMove(board, from, to);
            case 'knight':
                return this.isValidKnightMove(from, to);
            case 'bishop':
                return this.isValidBishopMove(board, from, to);
            case 'queen':
                return this.isValidQueenMove(board, from, to);
            case 'king':
                return this.isValidKingMove(from, to);
            default:
                return false;
        }
    }

    isValidPawnMove(board, from, to, color) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const rowDiff = to.row - from.row;
        const colDiff = Math.abs(to.col - from.col);
        
        // İleri hareket
        if (colDiff === 0) {
            if (board[to.row][to.col]) return false;
            if (rowDiff === direction) return true;
            if (from.row === startRow && rowDiff === 2 * direction) return true;
        }
        
        // Çapraz alma
        if (colDiff === 1 && rowDiff === direction) {
            return board[to.row][to.col] && board[to.row][to.col].color !== color;
        }
        
        return false;
    }

    isValidRookMove(board, from, to) {
        if (from.row !== to.row && from.col !== to.col) return false;
        return this.isPathClear(board, from, to);
    }

    isValidKnightMove(from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(board, from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        if (rowDiff !== colDiff) return false;
        return this.isPathClear(board, from, to);
    }

    isValidQueenMove(board, from, to) {
        return this.isValidRookMove(board, from, to) || this.isValidBishopMove(board, from, to);
    }

    isValidKingMove(from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return rowDiff <= 1 && colDiff <= 1;
    }

    isPathClear(board, from, to) {
        const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
        const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;
        
        let currentRow = from.row + rowStep;
        let currentCol = from.col + colStep;
        
        while (currentRow !== to.row || currentCol !== to.col) {
            if (board[currentRow][currentCol]) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }

    highlightSquare(row, col) {
        this.clearHighlights();
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'capture');
        });
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
