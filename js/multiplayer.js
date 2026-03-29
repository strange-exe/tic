"use strict";
const Multiplayer = (() => {
    let peer = null, conn = null, isHost = false, gameCode = "";
    let myName = "Player", opponentName = "Opponent";

    function genCode() {
        const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let c = "ABHI-";
        for (let i = 0; i < 5; i++) c += ch[Math.floor(Math.random() * ch.length)];
        return c;
    }

    function setMyName(name) {
        myName = (name || "").trim().slice(0, 20) || "Player";
    }
    function getMyName() { return myName; }
    function getOpponentName() { return opponentName; }

    function createGame(cb) {
        return new Promise((resolve, reject) => {
            const code = genCode();
            try { peer = new Peer(code); } catch (e) { reject(new Error("PeerJS init failed")); return; }
            peer.on("open", id => { gameCode = id; resolve(id); });
            peer.on("connection", connection => {
                conn = connection; isHost = true;
                wire(cb);
                // Send our name to opponent
                conn.on("open", () => {
                    conn.send({ type: "handshake", name: myName });
                });
            });
            peer.on("error", err => {
                if (err.type === "unavailable-id") {
                    destroy(); createGame(cb).then(resolve).catch(reject);
                } else reject(err);
            });
        });
    }

    function joinGame(code, cb) {
        return new Promise((resolve, reject) => {
            try { peer = new Peer(); } catch (e) { reject(new Error("PeerJS init failed")); return; }
            const timer = setTimeout(() => {
                if (!conn || !conn.open) reject(new Error("Connection timed out."));
            }, 12000);
            peer.on("open", () => {
                conn = peer.connect(code, { reliable: true });
                conn.on("open", () => {
                    clearTimeout(timer); isHost = false;
                    wire(cb);
                    // Send our name to host
                    conn.send({ type: "handshake", name: myName });
                    resolve();
                });
                conn.on("error", e => { clearTimeout(timer); reject(e); });
            });
            peer.on("error", () => { clearTimeout(timer); reject(new Error("Invalid game code or host offline.")); });
        });
    }

    function wire(cb) {
        conn.on("data", d => {
            if (!d || typeof d !== "object") return;
            if (d.type === "handshake" && typeof d.name === "string") {
                opponentName = d.name.trim().slice(0, 20) || "Opponent";
                if (cb.onOpponentName) cb.onOpponentName(opponentName);
                if (cb.onConnected) cb.onConnected();
            }
            if (d.type === "move" && typeof d.index === "number" && d.index >= 0 && d.index <= 8) {
                if (cb.onMoveReceived) cb.onMoveReceived(d.index);
            }
            if (d.type === "rematch-req" && cb.onRematchReq) cb.onRematchReq();
            if (d.type === "rematch-ok" && cb.onRematchOk) cb.onRematchOk();
            if (d.type === "chat" && typeof d.text === "string" && cb.onChat) cb.onChat(d.text, opponentName);
        });
        conn.on("close", () => { if (cb.onDisconnected) cb.onDisconnected(); });
    }

    function sendMove(i) { if (conn && conn.open) conn.send({ type: "move", index: i }); }
    function sendRematchReq() { if (conn && conn.open) conn.send({ type: "rematch-req" }); }
    function sendRematchOk() { if (conn && conn.open) conn.send({ type: "rematch-ok" }); }
    function sendChat(text) { if (conn && conn.open && text) conn.send({ type: "chat", text: String(text).slice(0, 200) }); }
    function isMyTurn() { return isHost ? Game.getPlayer() === "X" : Game.getPlayer() === "O"; }
    function getMyMark() { return isHost ? "X" : "O"; }
    function connected() { return !!(conn && conn.open); }
    function getCode() { return gameCode; }
    function getIsHost() { return isHost; }
    function destroy() {
        if (conn) conn.close(); if (peer) peer.destroy();
        conn = null; peer = null; isHost = false; gameCode = "";
        opponentName = "Opponent";
    }

    return Object.freeze({
        createGame, joinGame, sendMove, sendRematchReq, sendRematchOk, sendChat,
        setMyName, getMyName, getOpponentName,
        isMyTurn, getMyMark, connected, getCode, getIsHost, destroy
    });
})();
