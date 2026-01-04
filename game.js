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

    initializeEventListeners() {
        // Play button
        document.getElementById('playBtn').addEventListener('click', () => {
            this.showLoginForm();
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.hideLoginForm();
        });

        // Login
        document.getElementById('findGameBtn').addEventListener('click', () => {
            const name = document.getElementById('playerName').value.trim();
            if (name) {
                this.playerName = name;
                this.socket.emit('findGame', name);
                this.showScreen('waitingScreen');
            }
        });

        // Enter tuşu ile oyun bulma
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('findGameBtn').click();
            }
        });
    }

    showLoginForm() {
        document.querySelector('.play-section').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        // Input'a focus ver
        setTimeout(() => {
            document.getElementById('playerName').focus();
        }, 100);
    }

    hideLoginForm() {
        document.querySelector('.play-section').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        // Input'u temizle
        document.getElementById('playerName').value = '';
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
