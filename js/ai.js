"use strict";
const AI = (() => {
    const memo = new Map();
    const WINS       = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const CENTER     = 4;
    const CORNERS    = [0, 2, 6, 8];
    const EDGES      = [1, 3, 5, 7];
    const MOVE_ORDER = [CENTER, ...CORNERS, ...EDGES];

    /**
     * Always plays optimally — full minimax with alpha-beta pruning
     * and an opening book for the first two moves.
     *
     * @param {Array} boardOrig  9-element array (null | "X" | "O")
     * @returns {number}         Index 0-8 of the best move
     */
    function getBestMove(boardOrig) {
        const b = [...boardOrig];
        const book = openingBook(b);
        return book !== null ? book : fullSearch(b);
    }

    /* ── opening book ──────────────────────────────────────────────────── */
    function openingBook(b) {
        const filled = b.filter(c => c !== null).length;

        // AI moves first — take center
        if (filled === 0) return CENTER;

        // AI moves second
        if (filled === 1) {
            // If player took center, take a random corner
            if (b[CENTER] !== null) {
                return CORNERS[Math.floor(Math.random() * CORNERS.length)];
            }
            // Otherwise take center
            return CENTER;
        }

        // Counter the opposite-corners trap
        if (filled === 3) {
            for (const [a, c] of [[0, 8], [2, 6], [8, 0], [6, 2]]) {
                if (b[a] === "X" && b[c] === "X") {
                    const freeEdges = EDGES.filter(i => b[i] === null);
                    if (freeEdges.length) {
                        return freeEdges[Math.floor(Math.random() * freeEdges.length)];
                    }
                }
            }
        }

        return null; // fall through to full search
    }

    /* ── full minimax search ───────────────────────────────────────────── */
    function fullSearch(b) {
        // Check for immediate win
        const winMove = findWinningMove(b, "O");
        if (winMove !== -1) return winMove;

        // Check for immediate block
        const blockMove = findWinningMove(b, "X");
        if (blockMove !== -1) return blockMove;

        // Full minimax with alpha-beta pruning
        let bestScore = -Infinity;
        let bestMove = -1;
        let alpha = -Infinity;

        memo.clear(); // Clear cache before search

        for (const i of MOVE_ORDER) {
            if (b[i] !== null) continue;
            b[i] = "O";
            const score = minimax(b, 0, false, alpha, Infinity);
            b[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
            alpha = Math.max(alpha, bestScore);
        }
        return bestMove;
    }

    function minimax(b, depth, isMax, alpha, beta) {
        const key = b.join("") + (isMax ? "1" : "0") + alpha + beta;
        if (memo.has(key)) return memo.get(key);

        const w = winner(b);
        if (w === "O") return 10 - depth;
        if (w === "X") return depth - 10;
        if (b.every(c => c !== null)) return 0;

        if (isMax) {
            let best = -Infinity;
            for (const i of MOVE_ORDER) {
                if (b[i] !== null) continue;
                b[i] = "O";
                best = Math.max(best, minimax(b, depth + 1, false, alpha, beta));
                b[i] = null;
                alpha = Math.max(alpha, best);
                if (beta <= alpha) break;
            }
            memo.set(key, best);
            return best;
        } else {
            let best = Infinity;
            for (const i of MOVE_ORDER) {
                if (b[i] !== null) continue;
                b[i] = "X";
                best = Math.min(best, minimax(b, depth + 1, true, alpha, beta));
                b[i] = null;
                beta = Math.min(beta, best);
                if (beta <= alpha) break;
            }
            memo.set(key, best);
            return best;
        }
    }

    /* ── utilities ──────────────────────────────────────────────────────── */
    function findWinningMove(b, player) {
        for (let i = 0; i < 9; i++) {
            if (b[i] !== null) continue;
            b[i] = player;
            const won = winner(b) === player;
            b[i] = null;
            if (won) return i;
        }
        return -1;
    }

    function winner(b) {
        for (const [a, x, c] of WINS) {
            if (b[a] && b[a] === b[x] && b[a] === b[c]) return b[a];
        }
        return null;
    }

    return Object.freeze({ getBestMove });
})();