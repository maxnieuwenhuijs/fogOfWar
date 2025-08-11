// --- START OF FILE public/js/sp-logger.js ---
(function () {
    const DEFAULT_BATCH_SIZE = 20;
    const DEFAULT_FLUSH_MS = 2000;

    class SingleplayerLogger {
        constructor() {
            this.sessionId = this._createSessionId();
            this.queue = [];
            this.flushTimer = null;
            this.isFlushing = false;
            this.batchSize = DEFAULT_BATCH_SIZE;
            this.flushMs = DEFAULT_FLUSH_MS;
            this.difficulty = 'unknown';
            this.turnCount = 0;
            this.cycleCount = 0;
            this.db = null; // IndexedDB handle
            this.sessionStartMs = Date.now();

            this._openIndexedDb();

            try {
                window.addEventListener("beforeunload", () => {
                    try { this.flush(true); } catch (_) { }
                });
            } catch (_) { }
        }

        _createSessionId() {
            const seed = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            return `sp_${seed}`;
        }

        setSessionId(sessionId) {
            if (sessionId && typeof sessionId === "string") {
                this.sessionId = sessionId;
            }
        }

        setDifficulty(level) {
            if (typeof level === 'string' && level.length > 0) {
                this.difficulty = level;
                this.log('session.meta', { difficulty: level });
            }
        }

        noteTurnSwitch() {
            this.turnCount += 1;
            this.log('turn.count', { totalTurns: this.turnCount });
        }

        noteCycleStart() {
            this.cycleCount += 1;
            this.log('cycle.count', { totalCycles: this.cycleCount });
        }

        endSession(extra = {}) {
            this.log('session.end', {
                difficulty: this.difficulty,
                totalTurns: this.turnCount,
                totalCycles: this.cycleCount,
                elapsedMs: Date.now() - (this.sessionStartMs || Date.now()),
                ...extra,
            });
            this._putSessionSummary({
                sessionId: this.sessionId,
                endedAt: Date.now(),
                difficulty: this.difficulty,
                totalTurns: this.turnCount,
                totalCycles: this.cycleCount,
                elapsedMs: Date.now() - (this.sessionStartMs || Date.now()),
                ...extra,
            });
            this.flush();
        }

        log(eventName, data) {
            try {
                const evt = {
                    ts: Date.now(),
                    event: String(eventName || "unknown"),
                    data: data == null ? null : JSON.parse(JSON.stringify(data)),
                };
                this.queue.push(evt);
                if (this.queue.length >= this.batchSize) {
                    this.flush();
                } else if (!this.flushTimer) {
                    this.flushTimer = setTimeout(() => {
                        this.flushTimer = null;
                        this.flush();
                    }, this.flushMs);
                }
            } catch (err) {
                // swallow
                console.warn("SpLogger log error", err);
            }
        }

        flush(sync = false) {
            if (this.isFlushing || this.queue.length === 0) return;
            const events = this.queue.splice(0, this.queue.length);
            const payload = { sessionId: this.sessionId, events };

            try {
                if (sync && navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                    navigator.sendBeacon("/api/sp-log", blob);
                    this._persistEventsToIndexedDb(events);
                    return;
                }
            } catch (_) { }

            this.isFlushing = true;
            fetch("/api/sp-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            })
                .catch(() => { })
                .finally(() => {
                    this.isFlushing = false;
                });

            // Best-effort local persistence
            this._persistEventsToIndexedDb(events);
        }

        // --- IndexedDB Layer ---
        _openIndexedDb() {
            try {
                const req = indexedDB.open('sp_logs', 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('events')) {
                        const store = db.createObjectStore('events', { keyPath: ['sessionId', 'ts', 'idx'] });
                        store.createIndex('bySession', 'sessionId', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('sessions')) {
                        db.createObjectStore('sessions', { keyPath: 'sessionId' });
                    }
                };
                req.onsuccess = (e) => { this.db = e.target.result; };
                req.onerror = () => { this.db = null; };
            } catch (_) { this.db = null; }
        }

        _persistEventsToIndexedDb(events) {
            if (!this.db || !events || events.length === 0) return;
            try {
                const tx = this.db.transaction('events', 'readwrite');
                const store = tx.objectStore('events');
                let idx = 0;
                for (const ev of events) {
                    store.put({ sessionId: this.sessionId, ts: ev.ts, idx: idx++, event: ev.event, data: ev.data });
                }
            } catch (_) { }
        }

        _putSessionSummary(summary) {
            if (!this.db || !summary) return;
            try {
                const tx = this.db.transaction('sessions', 'readwrite');
                tx.objectStore('sessions').put(summary);
            } catch (_) { }
        }

        async exportSession(sessionId = this.sessionId) {
            const lines = await this._readSessionAsJsonl(sessionId);
            const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${sessionId}.jsonl`;
            a.click();
            URL.revokeObjectURL(a.href);
        }

        async exportAll() {
            if (!this.db) return;
            const tx = this.db.transaction('sessions', 'readonly');
            const store = tx.objectStore('sessions');
            const all = await new Promise((resolve) => {
                const arr = [];
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cur = e.target.result; if (!cur) return resolve(arr);
                    arr.push(cur.value.sessionId); cur.continue();
                };
                req.onerror = () => resolve(arr);
            });
            const chunks = [];
            for (const sid of all) {
                const lines = await this._readSessionAsJsonl(sid);
                chunks.push(...lines, '');
            }
            const blob = new Blob([chunks.join('\n')], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `sp_logs_export.jsonl`;
            a.click();
            URL.revokeObjectURL(a.href);
        }

        async importJsonl(file) {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const eventsBySession = new Map();
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    const sid = obj.sessionId || this.sessionId;
                    if (!eventsBySession.has(sid)) eventsBySession.set(sid, []);
                    eventsBySession.get(sid).push({ ts: obj.ts || Date.now(), event: obj.event, data: obj.data });
                } catch (_) { }
            }
            for (const [sid, evs] of eventsBySession.entries()) {
                const old = this.sessionId; this.setSessionId(sid);
                this._persistEventsToIndexedDb(evs);
                this.setSessionId(old);
            }
        }

        async _readSessionAsJsonl(sessionId) {
            if (!this.db) return [];
            const tx = this.db.transaction('events', 'readonly');
            const idx = tx.objectStore('events').index('bySession');
            const req = idx.getAll(IDBKeyRange.only(sessionId));
            const rows = await new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
            return rows
                .sort((a, b) => (a.ts - b.ts) || (a.idx - b.idx))
                .map(r => JSON.stringify({ sessionId, ts: r.ts, event: r.event, data: r.data }));
        }

        async replay(sessionId = this.sessionId, handler, { speed = 1 } = {}) {
            const events = await this._readSessionAsJsonl(sessionId);
            const parsed = events.map(l => JSON.parse(l));
            for (let i = 0; i < parsed.length; i++) {
                const e = parsed[i];
                const next = parsed[i + 1];
                if (typeof handler === 'function') handler(e);
                if (!next) break;
                const delay = Math.max(0, (next.ts - e.ts) / speed);
                // eslint-disable-next-line no-await-in-loop
                await new Promise(res => setTimeout(res, Math.min(delay, 2000)));
            }
        }
    }

    // Expose globally
    window.SpLogger = new SingleplayerLogger();
})();

// --- END OF FILE public/js/sp-logger.js ---

