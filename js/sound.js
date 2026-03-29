"use strict";
const Sound = (() => {
    let ctx = null;
    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }
    function play(type) {
        try {
            const ac = getCtx();
            const t = ac.currentTime;
            switch (type) {
                case "move": {
                    const o = ac.createOscillator(), g = ac.createGain();
                    o.type = "sine"; o.connect(g); g.connect(ac.destination);
                    o.frequency.setValueAtTime(660, t);
                    o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
                    g.gain.setValueAtTime(0.1, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                    o.start(t); o.stop(t + 0.08); break;
                }
                case "win": {
                    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                        const o = ac.createOscillator(), g = ac.createGain();
                        o.type = "sine"; o.connect(g); g.connect(ac.destination);
                        o.frequency.value = f;
                        const s = t + i * 0.12;
                        g.gain.setValueAtTime(0.07, s);
                        g.gain.exponentialRampToValueAtTime(0.001, s + 0.45);
                        o.start(s); o.stop(s + 0.45);
                    }); break;
                }
                case "draw": {
                    const o = ac.createOscillator(), g = ac.createGain();
                    o.type = "triangle"; o.connect(g); g.connect(ac.destination);
                    o.frequency.setValueAtTime(440, t);
                    o.frequency.exponentialRampToValueAtTime(220, t + 0.3);
                    g.gain.setValueAtTime(0.06, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                    o.start(t); o.stop(t + 0.3); break;
                }
                case "click": {
                    const o = ac.createOscillator(), g = ac.createGain();
                    o.type = "sine"; o.connect(g); g.connect(ac.destination);
                    o.frequency.setValueAtTime(1200, t);
                    g.gain.setValueAtTime(0.04, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                    o.start(t); o.stop(t + 0.04); break;
                }
            }
        } catch (_) { /* audio not supported */ }
    }
    return Object.freeze({ play });
})();
