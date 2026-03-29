"use strict";
const Game = (() => {
    const MARKS = ["X", "O"];
    const WIN_PATTERNS = Object.freeze([
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ]);
    let board = Array(9).fill(null);
    let currentPlayer = "X";
    let gameOver = false;
    let winPattern = [];
    let winner = null;
    let scores = { X: 0, O: 0, draws: 0 };

    function makeMove(idx) {
        if (typeof idx !== "number" || idx < 0 || idx > 8) return false;
        if (board[idx] !== null || gameOver) return false;
        board[idx] = currentPlayer;
        if (checkWin()) {
            gameOver = true; winner = currentPlayer; scores[currentPlayer]++;
        } else if (board.every(c => c !== null)) {
            gameOver = true; winner = "draw"; scores.draws++;
        } else {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
        }
        saveState(); return true;
    }
    function checkWin() {
        for (const p of WIN_PATTERNS) {
            if (p.every(i => board[i] === currentPlayer)) { winPattern = [...p]; return true; }
        }
        return false;
    }
    function reset() {
        board = Array(9).fill(null); currentPlayer = "X";
        gameOver = false; winPattern = []; winner = null; saveState();
    }
    function resetScores() { scores = { X:0, O:0, draws:0 }; saveState(); }
    function saveState() {
        try {
            localStorage.setItem("ttt-v2", JSON.stringify({ board, currentPlayer, gameOver, winPattern, winner, scores }));
        } catch (_) {}
    }
    function loadState() {
        try {
            const raw = localStorage.getItem("ttt-v2");
            if (!raw) return;
            const d = JSON.parse(raw);
            if (!d || typeof d !== "object") return;
            if (!Array.isArray(d.board) || d.board.length !== 9) return;
            if (!d.board.every(c => c === null || MARKS.includes(c))) return;
            if (!MARKS.includes(d.currentPlayer)) return;
            board = d.board; currentPlayer = d.currentPlayer;
            gameOver = !!d.gameOver;
            winPattern = Array.isArray(d.winPattern) ? d.winPattern : [];
            winner = d.winner || null;
            if (d.scores && typeof d.scores === "object") {
                scores = {
                    X: Math.max(0, parseInt(d.scores.X) || 0),
                    O: Math.max(0, parseInt(d.scores.O) || 0),
                    draws: Math.max(0, parseInt(d.scores.draws) || 0)
                };
            }
        } catch (_) {
            board = Array(9).fill(null); currentPlayer = "X"; gameOver = false; winPattern = []; winner = null;
        }
    }
    return Object.freeze({
        makeMove, reset, resetScores, loadState,
        getBoard: () => [...board],
        getPlayer: () => currentPlayer,
        isGameOver: () => gameOver,
        getWinningPattern: () => [...winPattern],
        getWinner: () => winner,
        getScores: () => ({ ...scores }),
        WIN_PATTERNS
    });
})();