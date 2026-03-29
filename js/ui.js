"use strict";
const UI = (() => {
    const screens = { menu: document.getElementById("menu-screen"), lobby: document.getElementById("lobby-screen"), join: document.getElementById("join-screen"), game: document.getElementById("game-screen") };
    const boardEl = document.getElementById("game-board");
    const statusEl = document.getElementById("status");
    const celebEl = document.getElementById("celebration");
    const winLineSvg = document.getElementById("win-line");
    const chatPanel = document.getElementById("chat-panel");
    const chatMessages = document.getElementById("chat-messages");
    const chatToggle = document.getElementById("chat-toggle");
    const xWinsEl = document.getElementById("x-wins");
    const oWinsEl = document.getElementById("o-wins");
    const drawsEl = document.getElementById("draws");
    const xLabelEl = document.getElementById("x-label");
    const oLabelEl = document.getElementById("o-label");
    let celebTimer = null;
    let shouldAnimateBoard = true; // only animate on fresh board, not every move

    // Cell center positions for win-line SVG overlay
    const cellCenter = (idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cellSize = (340 - 20) / 3;
        const gap = 10;
        return { x: col * (cellSize + gap) + cellSize / 2, y: row * (cellSize + gap) + cellSize / 2 };
    };

    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove("active"));
        if (screens[name]) screens[name].classList.add("active");
        if (name === "game" && App.getMode() === "online") {
            chatPanel.classList.remove("hidden");
        } else {
            chatPanel.classList.add("hidden");
        }
    }

    function requestBoardAnimation() { shouldAnimateBoard = true; }

    function render() {
        boardEl.innerHTML = "";
        winLineSvg.innerHTML = "";
        boardEl.classList.remove("draw-shake");
        const board = Game.getBoard();
        const mode = App.getMode();
        const online = mode === "online";
        const myTurn = online ? Multiplayer.isMyTurn() : true;
        const animate = shouldAnimateBoard;
        shouldAnimateBoard = false; // only animate once per reset

        board.forEach((cell, i) => {
            const div = document.createElement("div");
            div.classList.add("cell");
            if (animate) {
                div.classList.add("cell-enter");
                div.style.animationDelay = `${i * 25}ms`;
            }
            div.setAttribute("tabindex", "0");
            div.setAttribute("role", "button");
            div.setAttribute("aria-label", `Cell ${Math.floor(i/3)+1}-${i%3+1}${cell ? ", "+cell : ", empty"}`);

            if (cell) {
                div.appendChild(mkMark(cell));
                div.classList.add(cell.toLowerCase());
            } else if (!Game.isGameOver()) {
                div.classList.add("empty");
                if (!online || myTurn) {
                    const ghost = mkMark(Game.getPlayer());
                    ghost.classList.add("ghost");
                    div.appendChild(ghost);
                }
            }

            if (!Game.isGameOver() && !cell) {
                div.addEventListener("click", () => handleClick(i));
                div.addEventListener("keydown", e => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(i); }
                });
            } else {
                div.classList.add("disabled");
            }
            boardEl.appendChild(div);
        });

        highlightWin();
        updateStatus();
        updateScoreboard();
    }

    function mkMark(player) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 50 50");
        svg.classList.add("mark", "mark-" + player.toLowerCase());
        if (player === "X") {
            const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l1.setAttribute("x1","13"); l1.setAttribute("y1","13"); l1.setAttribute("x2","37"); l1.setAttribute("y2","37");
            const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l2.setAttribute("x1","37"); l2.setAttribute("y1","13"); l2.setAttribute("x2","13"); l2.setAttribute("y2","37");
            svg.append(l1, l2);
        } else {
            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx","25"); c.setAttribute("cy","25"); c.setAttribute("r","13");
            svg.appendChild(c);
        }
        return svg;
    }

    function handleClick(index) {
        const mode = App.getMode();
        if (mode === "online") {
            if (!Multiplayer.connected() || !Multiplayer.isMyTurn()) return;
            if (!Game.makeMove(index)) return;
            Multiplayer.sendMove(index);
            Sound.play("move"); render(); return;
        }
        
        // Prevent human from placing moves while AI is thinking
        if (mode === "ai" && Game.getPlayer() === "O") return;

        if (!Game.makeMove(index)) return;
        Sound.play("move"); render();
        if (Game.isGameOver()) return;
        if (mode === "ai" && Game.getPlayer() === "O") {
            boardEl.classList.add("thinking");
            setTimeout(() => {
                const mv = AI.getBestMove(Game.getBoard());
                Game.makeMove(mv); Sound.play("move");
                boardEl.classList.remove("thinking"); render();
            }, 400);
        }
    }

    function highlightWin() {
        const pat = Game.getWinningPattern();
        if (!pat.length) return;
        const cells = document.querySelectorAll(".cell");
        pat.forEach(i => cells[i].classList.add("win"));
        const start = cellCenter(pat[0]);
        const end = cellCenter(pat[2]);
        const winner = Game.getWinner();
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.x); line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x); line.setAttribute("y2", end.y);
        line.classList.add(winner === "X" ? "x-line" : "o-line");
        winLineSvg.appendChild(line);
    }

    function updateNames() {
        const mode = App.getMode();
        let nameX = "Player 1", nameO = "Player 2";
        if (mode === "online") {
            const host = Multiplayer.getIsHost();
            nameX = host ? Multiplayer.getMyName() : Multiplayer.getOpponentName();
            nameO = host ? Multiplayer.getOpponentName() : Multiplayer.getMyName();
        } else if (mode === "ai") {
            nameX = localStorage.getItem("ttt-username") || "You";
            nameO = "AI";
        } else {
            const p1 = localStorage.getItem("ttt-username");
            if (p1) nameX = p1;
        }
        
        if (xLabelEl) xLabelEl.textContent = nameX;
        if (oLabelEl) oLabelEl.textContent = nameO;
        return { nameX, nameO };
    }

    function updateStatus() {
        const w = Game.getWinner(), mode = App.getMode();
        const names = updateNames();

        const xScore = document.querySelector(".x-score");
        const oScore = document.querySelector(".o-score");
        if (xScore && oScore) {
            if (!w) {
                xScore.classList.toggle("active-turn", Game.getPlayer() === "X");
                oScore.classList.toggle("active-turn", Game.getPlayer() === "O");
            } else {
                xScore.classList.remove("active-turn");
                oScore.classList.remove("active-turn");
            }
        }

        if (w === "draw") {
            statusEl.textContent = "It's a Draw!";
            statusEl.className = "status draw-text";
            Sound.play("draw");
            boardEl.classList.add("draw-shake");
        } else if (w) {
            let winText = (w === "X" ? names.nameX : names.nameO) + " Wins!";
            if (mode === "online") {
                winText = w === Multiplayer.getMyMark() ? "Victory!" : "Defeat...";
            } else if (mode === "ai" && w === "X") {
                winText = "You Win!";
            } else if (mode === "ai" && w === "O") {
                winText = "AI Wins!";
            }
            statusEl.textContent = winText;
            statusEl.className = "status win-text " + w.toLowerCase() + "-wins";
            Sound.play("win"); celebrate(w);
        } else {
            const p = Game.getPlayer();
            const activeName = p === "X" ? names.nameX : names.nameO;
            
            if (mode === "online") {
                statusEl.textContent = Multiplayer.isMyTurn() ? "Your Turn" : `Waiting for ${activeName}...`;
            } else if (mode === "ai") {
                statusEl.textContent = p === "X" ? "Your Turn" : "AI Thinking…";
            } else {
                statusEl.textContent = activeName + "'s Turn";
            }
            statusEl.className = "status turn-" + p.toLowerCase();
        }
    }

    function updateScoreboard() {
        const s = Game.getScores();
        xWinsEl.textContent = s.X; oWinsEl.textContent = s.O; drawsEl.textContent = s.draws;
    }

    function celebrate(w) {
        if (celebTimer) clearTimeout(celebTimer);
        celebEl.innerHTML = "";
        const colors = w === "X" ? ["#38bdf8","#0ea5e9","#7dd3fc"] : w === "O" ? ["#f472b6","#ec4899","#f9a8d4"] : ["#eab308","#facc15","#fde68a"];
        for (let i = 0; i < 50; i++) {
            const p = document.createElement("div");
            p.classList.add("particle");
            p.style.left = Math.random()*100+"vw"; p.style.top = "-10px";
            p.style.background = colors[Math.floor(Math.random()*colors.length)];
            p.style.animationDuration = (Math.random()*2+1)+"s";
            p.style.animationDelay = Math.random()*0.5+"s";
            const sz = (Math.random()*8+4)+"px";
            p.style.width = sz; p.style.height = sz;
            p.style.borderRadius = Math.random()>0.5?"50%":"2px";
            celebEl.appendChild(p);
        }
        celebTimer = setTimeout(() => { celebEl.innerHTML = ""; }, 4000);
    }

    function showInviteLink(code) {
        const url = window.location.origin + window.location.pathname + "?game=" + code;
        document.getElementById("invite-link").value = url;
        document.getElementById("invite-section").classList.remove("hidden");
        document.getElementById("waiting-section").classList.remove("hidden");
    }

    /* ── Chat ─────────────────────────────────────────────────────────── */
    function addChatMessage(text, isMine, senderName) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("chat-msg", isMine ? "mine" : "theirs");

        const header = document.createElement("div");
        header.classList.add("chat-msg-header");

        const name = document.createElement("span");
        name.classList.add("chat-sender");
        name.textContent = senderName || (isMine ? "You" : "Opponent");
        header.appendChild(name);

        const time = document.createElement("span");
        time.classList.add("chat-time");
        const now = new Date();
        time.textContent = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
        header.appendChild(time);

        wrapper.appendChild(header);

        const body = document.createElement("div");
        body.classList.add("chat-msg-body");
        body.textContent = text;
        wrapper.appendChild(body);

        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Show unread indicator if chat is collapsed
        if (chatPanel.classList.contains("chat-collapsed") && !isMine) {
            chatToggle.classList.add("has-unread");
        }
    }

    function addSystemMessage(text) {
        const div = document.createElement("div");
        div.classList.add("chat-system");
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function clearChat() {
        chatMessages.innerHTML = "";
    }

    function setOpponentName(name) {
        const el = document.getElementById("opponent-name");
        if (el) el.textContent = name || "Opponent";
    }

    return Object.freeze({
        render, showScreen, showInviteLink, updateScoreboard,
        addChatMessage, addSystemMessage, clearChat, setOpponentName,
        requestBoardAnimation
    });
})();
