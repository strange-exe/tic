"use strict";
const App = (() => {
    let mode = "pvp";
    let pendingJoinCode = null;

    function init() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
        }

        const savedName = localStorage.getItem("ttt-username") || "";
        const nameInput = document.getElementById("username-input");
        const joinNameInput = document.getElementById("join-username-input");
        if (nameInput && savedName) nameInput.value = savedName;
        if (joinNameInput && savedName) joinNameInput.value = savedName;

        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get("game");

        if (joinCode) {
            pendingJoinCode = joinCode.trim().toUpperCase();
            mode = "online";
            // FIX #2: bind before showing screen so buttons are live
            bindAll();
            UI.showScreen("join");
            if (joinNameInput) joinNameInput.focus();
            return;
        }

        // FIX #2: load state, then bind, then show — correct order
        Game.loadState();
        bindAll();
        UI.showScreen("menu");
    }

    function getUsername() {
        // FIX #1: respect which screen is active instead of always preferring joinInput
        const joinInput  = document.getElementById("join-username-input");
        const menuInput  = document.getElementById("username-input");

        const joinScreen = document.getElementById("join-screen");
        const onJoinScreen = joinScreen && !joinScreen.classList.contains("hidden");

        const name = (onJoinScreen
            ? joinInput?.value.trim()
            : menuInput?.value.trim()
        ) || "Player";

        localStorage.setItem("ttt-username", name);
        // Keep both inputs in sync
        if (menuInput) menuInput.value = name;
        if (joinInput) joinInput.value = name;
        return name;
    }

    function validateUsername(inputEl) {
        if (!inputEl) return false;
        const name = inputEl.value.trim();
        if (!name) {
            inputEl.classList.add("input-error");
            inputEl.setAttribute(
                "placeholder",
                inputEl.id === "join-username-input" ? "Please enter your name!" : "Please enter your name!"
            );
            inputEl.focus();
            const handler = () => {
                inputEl.classList.remove("input-error");
                inputEl.setAttribute(
                    "placeholder",
                    inputEl.id === "join-username-input" ? "Your name" : "Enter your name"
                );
                inputEl.removeEventListener("input", handler);
            };
            inputEl.addEventListener("input", handler);
            return false;
        }
        inputEl.classList.remove("input-error");
        return true;
    }

    function bindAll() {
        // Menu
        document.getElementById("btn-pvp").addEventListener("click", () => {
            mode = "pvp"; Game.reset(); UI.requestBoardAnimation();
            UI.showScreen("game"); UI.render(); Sound.play("click");
        });
        document.getElementById("btn-ai").addEventListener("click", () => {
            mode = "ai"; Game.reset(); UI.requestBoardAnimation();
            UI.showScreen("game"); UI.render(); Sound.play("click");
        });
        document.getElementById("btn-online").addEventListener("click", () => {
            const nameInput = document.getElementById("username-input");
            if (!validateUsername(nameInput)) return;
            mode = "online"; UI.showScreen("lobby"); Sound.play("click");
        });

        // Lobby
        document.getElementById("btn-create").addEventListener("click", createMP);
        document.getElementById("btn-join").addEventListener("click", () => {
            const code = document.getElementById("join-code").value.trim().toUpperCase();
            if (code) joinMP(code);
        });
        document.getElementById("btn-copy").addEventListener("click", () => {
            const el = document.getElementById("invite-link");
            // FIX #5: support both plain elements (innerText) and inputs (value)
            const text = el.tagName === "INPUT" ? el.value : el.innerText || el.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const b = document.getElementById("btn-copy");
                b.textContent = "Copied!";
                setTimeout(() => b.textContent = "Copy", 2000);
            });
        });
        document.getElementById("btn-back-lobby").addEventListener("click", () => {
            Multiplayer.destroy(); UI.showScreen("menu"); Sound.play("click");
        });

        // Join screen (invite link landing)
        document.getElementById("btn-join-game").addEventListener("click", () => {
            const nameInput = document.getElementById("join-username-input");
            if (!validateUsername(nameInput)) return;
            Sound.play("click");
            joinFromInvite();
        });
        document.getElementById("join-username-input").addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                const nameInput = document.getElementById("join-username-input");
                if (!validateUsername(nameInput)) return;
                Sound.play("click");
                joinFromInvite();
            }
        });

        // Game controls
        document.getElementById("restart").addEventListener("click", () => {
            if (mode === "online") { Multiplayer.sendRematchReq(); return; }
            Game.reset(); UI.requestBoardAnimation(); UI.render(); Sound.play("click");
        });
        document.getElementById("btn-menu").addEventListener("click", () => {
            if (mode === "online") Multiplayer.destroy();
            Game.reset(); Game.resetScores(); UI.showScreen("menu"); Sound.play("click");
            window.history.replaceState({}, "", window.location.pathname);
        });

        // Chat
        const chatInput = document.getElementById("chat-input");
        const sendChat = () => {
            // FIX #4: guard against missing input or wrong mode
            if (!chatInput) return;
            const text = chatInput.value.trim();
            if (!text || mode !== "online") return;
            Multiplayer.sendChat(text);
            UI.addChatMessage(text, true, getUsername());
            chatInput.value = "";
        };
        document.getElementById("btn-send").addEventListener("click", sendChat);
        if (chatInput) {
            chatInput.addEventListener("keydown", e => {
                if (e.key === "Enter") { e.preventDefault(); sendChat(); }
            });
        }

        // Chat toggle
        document.getElementById("chat-toggle").addEventListener("click", () => {
            const panel = document.getElementById("chat-panel");
            panel.classList.toggle("chat-collapsed");
            document.getElementById("chat-toggle").classList.remove("has-unread");
        });
    }

    async function joinFromInvite() {
        if (!pendingJoinCode) return;
        const st  = document.getElementById("join-status");
        const btn = document.getElementById("btn-join-game");
        st.textContent  = "Connecting…";
        btn.disabled    = true;
        btn.textContent = "Connecting…";

        try {
            // FIX #3: explicitly read from the join input before getUsername() normalises it
            Multiplayer.setMyName(getUsername());
            await Multiplayer.joinGame(pendingJoinCode, mpCallbacks());
            pendingJoinCode = null;
        } catch (e) {
            st.textContent  = "Error: " + e.message;
            btn.disabled    = false;
            btn.textContent = "Join Game";
        }
    }

    function mpCallbacks() {
        return {
            onConnected: () => {
                Game.reset(); UI.clearChat(); UI.requestBoardAnimation();
                UI.showScreen("game"); UI.render();
                UI.addSystemMessage("Connected! Game started.");
                window.history.replaceState({}, "", window.location.pathname);
            },
            onMoveReceived: i => { Game.makeMove(i); Sound.play("move"); UI.render(); },
            onDisconnected: () => {
                const s = document.getElementById("status");
                s.textContent = "Opponent disconnected";
                s.className   = "status draw-text";
                UI.addSystemMessage("Opponent left the game.");
            },
            onRematchReq: () => {
                if (confirm("Opponent wants a rematch! Accept?")) {
                    Multiplayer.sendRematchOk();
                    Game.reset(); UI.requestBoardAnimation(); UI.render();
                    UI.addSystemMessage("Rematch started!");
                }
            },
            onRematchOk: () => {
                Game.reset(); UI.requestBoardAnimation(); UI.render();
                UI.addSystemMessage("Rematch started!");
            },
            onChat: (text, senderName) => {
                UI.addChatMessage(text, false, senderName);
                Sound.play("click");
            },
            onOpponentName: name => {
                UI.setOpponentName(name);
                UI.addSystemMessage(name + " joined the game.");
            }
        };
    }

    async function createMP() {
        const nameInput = document.getElementById("username-input");
        if (!validateUsername(nameInput)) return;
        Multiplayer.setMyName(getUsername());
        const st = document.getElementById("lobby-status");
        st.textContent = "Creating game…";
        try {
            const code = await Multiplayer.createGame(mpCallbacks());
            UI.showInviteLink(code);
            st.textContent = "Waiting for opponent…";
        } catch (e) { st.textContent = "Error: " + e.message; }
    }

    async function joinMP(code) {
        try {
            Multiplayer.setMyName(getUsername());
            await Multiplayer.joinGame(code, mpCallbacks());
        } catch (e) {
            alert(e.message);
            window.history.replaceState({}, "", window.location.pathname);
            UI.showScreen("menu");
        }
    }

    function getMode() { return mode; }
    return Object.freeze({ init, getMode });
})();

App.init();