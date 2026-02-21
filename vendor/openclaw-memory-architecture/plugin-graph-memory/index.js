/**
 * openclaw-plugin-graph-memory — Knowledge Graph Memory Search v2
 *
 * Augments OpenClaw's memory pipeline with knowledge graph lookups.
 * v2 adds: activation-based scoring, co-occurrence learning, importance floors.
 *
 * Hook: before_agent_start (priority 5 — runs before continuity plugin)
 *
 * Flow:
 * 1. Extract user's last message
 * 2. Spawn graph-search.py with the query
 * 3. Parse JSON results (now includes fact IDs)
 * 4. Score results using relevance + activation
 * 5. Bump activation on retrieved facts
 * 6. Wire co-occurrences between facts retrieved together
 * 7. Pull in co-occurring facts via spreading activation
 * 8. Format as prependContext block
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
    enabled: true,
    maxResults: 8,
    minScore: 50,
    timeoutMs: 2000,
    activationBump: 0.5,
    activationWeight: 0.3,    // 30% of combined score from activation
    relevanceWeight: 0.7,     // 70% of combined score from search relevance
    coOccurrenceLimit: 4,     // max co-occurring facts to pull in
    coOccurrenceMinWeight: 2, // minimum co-occurrence weight to consider
};

// ---------------------------------------------------------------------------
// SQLite helper — lightweight direct access for activation/co-occurrence
// ---------------------------------------------------------------------------

let _db = null;
let _dbPath = null;

function getDb(dbPath) {
    if (_db) return _db;
    try {
        // Use better-sqlite3 if available (synchronous, fast)
        let Database;
        try {
            Database = require('better-sqlite3');
        } catch {
            // Try common locations
            const locations = [
                path.join(process.env.HOME || '', '.openclaw/extensions/hebbian-hook/node_modules/better-sqlite3'),
                path.join(process.env.HOME || '', 'node_modules/better-sqlite3'),
            ];
            for (const loc of locations) {
                try { Database = require(loc); break; } catch {}
            }
        }
        if (!Database) {
            console.error('[graph-memory] better-sqlite3 not found — activation features disabled');
            return null;
        }
        _db = new Database(dbPath, { readonly: false });
        _db.pragma('journal_mode = WAL');
        _db.pragma('synchronous = NORMAL');
        _dbPath = dbPath;
        return _db;
    } catch (err) {
        console.error(`[graph-memory] SQLite open failed: ${err.message}`);
        return null;
    }
}

function closeDb() {
    if (_db) {
        try { _db.close(); } catch {}
        _db = null;
    }
}

// ---------------------------------------------------------------------------
// Activation & Co-occurrence operations
// ---------------------------------------------------------------------------

function bumpActivations(db, factIds, amount) {
    if (!db || factIds.length === 0) return;
    try {
        const now = new Date().toISOString();
        const stmt = db.prepare(
            'UPDATE facts SET activation = activation + ?, access_count = access_count + 1, last_accessed = ? WHERE id = ?'
        );
        const tx = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(amount, now, id);
            }
        });
        tx(factIds);
    } catch (err) {
        console.error(`[graph-memory] bumpActivations error: ${err.message}`);
    }
}

function wireCoOccurrences(db, factIds) {
    if (!db || factIds.length < 2) return;
    try {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO co_occurrences (fact_a, fact_b, weight, last_wired)
            VALUES (?, ?, 1.0, ?)
            ON CONFLICT(fact_a, fact_b) DO UPDATE SET
                weight = weight + 1.0,
                last_wired = ?
        `);
        const tx = db.transaction((ids) => {
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    stmt.run(ids[i], ids[j], now, now);
                    stmt.run(ids[j], ids[i], now, now);
                }
            }
        });
        tx(factIds);
    } catch (err) {
        console.error(`[graph-memory] wireCoOccurrences error: ${err.message}`);
    }
}

function getCoOccurring(db, factIds, limit, minWeight) {
    if (!db || factIds.length === 0) return [];
    try {
        const placeholders = factIds.map(() => '?').join(',');
        const stmt = db.prepare(`
            SELECT co.fact_b as id, SUM(co.weight) as total_weight,
                   f.entity, f.key, f.value, f.category, f.activation, f.importance
            FROM co_occurrences co
            JOIN facts f ON f.id = co.fact_b
            WHERE co.fact_a IN (${placeholders})
              AND co.fact_b NOT IN (${placeholders})
              AND co.weight >= ?
            GROUP BY co.fact_b
            ORDER BY total_weight DESC
            LIMIT ?
        `);
        return stmt.all(...factIds, ...factIds, minWeight, limit);
    } catch (err) {
        console.error(`[graph-memory] getCoOccurring error: ${err.message}`);
        return [];
    }
}

function getActivations(db, factIds) {
    if (!db || factIds.length === 0) return {};
    try {
        const placeholders = factIds.map(() => '?').join(',');
        const rows = db.prepare(
            `SELECT id, activation FROM facts WHERE id IN (${placeholders})`
        ).all(...factIds);
        const map = {};
        for (const r of rows) map[r.id] = r.activation;
        return map;
    } catch (err) {
        console.error(`[graph-memory] getActivations error: ${err.message}`);
        return {};
    }
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

module.exports = {
    id: 'graph-memory',
    name: 'Knowledge Graph Memory Search v2',

    register(api) {
        const userConfig = api.pluginConfig || {};
        const config = { ...DEFAULTS, ...userConfig };

        if (!config.enabled) {
            api.logger?.info?.('graph-memory: disabled by config');
            return;
        }

        // Resolve paths
        const workspaceDir = process.env.OPENCLAW_WORKSPACE
            || process.env.MOLTBOT_WORKSPACE
            || path.join(process.env.HOME || '/home/coolmann', 'clawd');

        const dbPath = config.dbPath || path.join(workspaceDir, 'memory', 'facts.db');
        const scriptPath = config.scriptPath || path.join(workspaceDir, 'scripts', 'graph-search.py');

        // Verify files exist at startup
        if (!fs.existsSync(dbPath)) {
            api.logger?.warn?.(`graph-memory: facts.db not found at ${dbPath}`);
            return;
        }
        if (!fs.existsSync(scriptPath)) {
            api.logger?.warn?.(`graph-memory: graph-search.py not found at ${scriptPath}`);
            return;
        }

        // Open direct DB connection for activation/co-occurrence
        const db = getDb(dbPath);
        if (db) {
            const stats = db.prepare('SELECT COUNT(*) as cnt FROM co_occurrences').get();
            api.logger?.info?.(`graph-memory v2: armed (db=${dbPath}, co-occurrences=${stats.cnt})`);
        } else {
            api.logger?.info?.(`graph-memory: armed WITHOUT activation (db=${dbPath})`);
        }
        console.log('[plugins] Graph Memory v2 plugin registered — activation + co-occurrence active');

        // -------------------------------------------------------------------
        // HOOK: before_agent_start — Inject graph search results
        // -------------------------------------------------------------------

        api.on('before_agent_start', async (event, ctx) => {
            try {
                const messages = event.messages || [];
                const lastUser = [...messages].reverse().find(m => m?.role === 'user');
                if (!lastUser) return { prependContext: '' };

                const userText = _extractText(lastUser);
                if (!userText || userText.length < 5) return { prependContext: '' };

                const cleanText = _stripContextBlocks(userText).trim();
                if (!cleanText || cleanText.length < 5) {
                    try {
                        require('fs').appendFileSync('/tmp/openclaw/memory-telemetry.jsonl',
                            JSON.stringify({ timestamp: new Date().toISOString(), system: 'graph-memory', query: cleanText?.substring(0, 50) || '(empty)', resultCount: 0, injected: false, reason: 'too-short', rawLen: userText?.length || 0 }) + '\n');
                    } catch (_) {}
                    return { prependContext: '' };
                }

                // Run graph search (returns results with fact_ids now)
                event._graphSearchStart = Date.now();
                const results = await _runGraphSearch(scriptPath, cleanText, config);

                if (!results || results.length === 0) {
                    try {
                        require('fs').appendFileSync('/tmp/openclaw/memory-telemetry.jsonl',
                            JSON.stringify({ timestamp: new Date().toISOString(), system: 'graph-memory', query: cleanText.substring(0, 200), latencyMs: Date.now() - event._graphSearchStart, resultCount: 0, injected: false }) + '\n');
                    } catch (_) {}
                    return { prependContext: '' };
                }

                // Filter: entity-matched (score >= 65) always pass;
                // FTS-only (score < 65) only if entity-matched exists
                const entityMatched = results.filter(r => r.score >= 65);
                const ftsOnly = results.filter(r => r.score < 65 && r.score >= config.minScore);
                const filtered = entityMatched.length > 0
                    ? [...entityMatched, ...ftsOnly]
                    : [];
                if (filtered.length === 0) {
                    try {
                        require('fs').appendFileSync('/tmp/openclaw/memory-telemetry.jsonl',
                            JSON.stringify({ timestamp: new Date().toISOString(), system: 'graph-memory', query: cleanText.substring(0, 200), latencyMs: Date.now() - event._graphSearchStart, resultCount: 0, entityMatched: 0, ftsOnly: ftsOnly.length, injected: false, reason: 'no-entity-match' }) + '\n');
                    } catch (_) {}
                    return { prependContext: '' };
                }

                // Collect fact IDs for activation operations
                const factIds = filtered
                    .map(r => r.fact_id)
                    .filter(id => id != null && id > 0);

                // Get activation scores and apply combined scoring
                let scored = filtered;
                if (db && factIds.length > 0) {
                    const activations = getActivations(db, factIds);

                    // Normalize activations for scoring
                    const actValues = Object.values(activations);
                    const maxAct = Math.max(...actValues, 1);

                    scored = filtered.map(r => {
                        const act = activations[r.fact_id] || 1.0;
                        const normAct = Math.min(act / maxAct, 1.0);
                        const normRelevance = r.score / 100; // search score is 0-100
                        const combinedScore = (normRelevance * config.relevanceWeight)
                                            + (normAct * config.activationWeight);
                        return { ...r, combinedScore, activation: act };
                    });

                    scored.sort((a, b) => b.combinedScore - a.combinedScore);
                }

                const topResults = scored.slice(0, config.maxResults);
                const topFactIds = topResults
                    .map(r => r.fact_id)
                    .filter(id => id != null && id > 0);

                // Bump activations for retrieved facts
                if (db && topFactIds.length > 0) {
                    bumpActivations(db, topFactIds, config.activationBump);
                    wireCoOccurrences(db, topFactIds);
                }

                // Spreading activation: pull in co-occurring facts
                let coOccurring = [];
                if (db && topFactIds.length > 0) {
                    coOccurring = getCoOccurring(
                        db, topFactIds,
                        config.coOccurrenceLimit,
                        config.coOccurrenceMinWeight
                    );
                }

                // Format context block
                const lines = ['[GRAPH MEMORY]'];

                // Group main results by entity
                const byEntity = new Map();
                for (const r of topResults) {
                    const entity = r.entity || 'unknown';
                    if (!byEntity.has(entity)) byEntity.set(entity, []);
                    byEntity.get(entity).push(r);
                }

                for (const [entity, facts] of byEntity) {
                    const seen = new Set();
                    const uniqueFacts = facts.filter(f => {
                        if (seen.has(f.answer)) return false;
                        seen.add(f.answer);
                        return true;
                    });
                    for (const f of uniqueFacts) {
                        lines.push(`• ${f.answer}`);
                    }
                }

                // Add co-occurring facts (clearly marked)
                if (coOccurring.length > 0) {
                    for (const co of coOccurring) {
                        lines.push(`• ${co.entity}.${co.key} = ${co.value} [linked]`);
                    }
                    // Bump co-occurring facts too (lighter bump)
                    const coIds = coOccurring.map(c => c.id);
                    bumpActivations(db, coIds, config.activationBump * 0.3);
                }

                // Telemetry
                try {
                    const telemetry = {
                        timestamp: new Date().toISOString(),
                        system: 'graph-memory',
                        query: cleanText.substring(0, 200),
                        latencyMs: Date.now() - (event._graphSearchStart || Date.now()),
                        resultCount: topResults.length,
                        coOccurring: coOccurring.length,
                        topScore: topResults[0]?.combinedScore,
                        topEntity: topResults[0]?.entity,
                        entityMatched: entityMatched.length,
                        ftsOnly: ftsOnly.length,
                        injected: true
                    };
                    require('fs').appendFileSync('/tmp/openclaw/memory-telemetry.jsonl', JSON.stringify(telemetry) + '\n');
                } catch (_telErr) { /* non-blocking */ }

                return { prependContext: lines.join('\n') };

            } catch (err) {
                console.error(`[graph-memory] before_agent_start failed: ${err.message}`);
                try {
                    require('fs').appendFileSync('/tmp/openclaw/memory-telemetry.jsonl',
                        JSON.stringify({ timestamp: new Date().toISOString(), system: 'graph-memory', query: '(error)', resultCount: 0, injected: false, error: err.message.substring(0, 200) }) + '\n');
                } catch (_) {}
                return { prependContext: '' };
            }
        }, { priority: 5 });

        // -------------------------------------------------------------------
        // HOOK: gateway_stop — Close DB cleanly
        // -------------------------------------------------------------------

        api.on('gateway_stop', async () => {
            closeDb();
            api.logger?.info?.('graph-memory: DB closed');
        }, { priority: 90 });
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _extractText(message) {
    if (!message) return '';
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
        return message.content
            .filter(p => p.type === 'text')
            .map(p => p.text || '')
            .join(' ');
    }
    return '';
}

function _stripContextBlocks(text) {
    return text
        .replace(/\[CONTINUITY CONTEXT\][\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '')
        .replace(/\[STABILITY CONTEXT\][\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '')
        .replace(/\[GRAPH MEMORY\][\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '')
        .replace(/Conversation info \(untrusted metadata\):[\s\S]*?```\n/g, '')
        .replace(/Replied message \(untrusted[\s\S]*?```\n/g, '')
        .replace(/System:.*?\n/g, '')
        .trim();
}

function _runGraphSearch(scriptPath, query, config) {
    return new Promise((resolve, reject) => {
        const timeout = config.timeoutMs || 2000;

        const child = execFile(
            'python3',
            [scriptPath, query, '--json', '--top-k', String(config.maxResults || 8)],
            {
                timeout,
                maxBuffer: 1024 * 64,
                env: { ...process.env },
            },
            (error, stdout, stderr) => {
                if (error) {
                    if (error.killed) {
                        console.error(`[graph-memory] search timed out after ${timeout}ms`);
                        resolve([]);
                        return;
                    }
                    console.error(`[graph-memory] search error: ${error.message}`);
                    resolve([]);
                    return;
                }

                try {
                    const results = JSON.parse(stdout.trim());
                    resolve(Array.isArray(results) ? results : []);
                } catch (parseErr) {
                    console.error(`[graph-memory] JSON parse error: ${parseErr.message}`);
                    resolve([]);
                }
            }
        );
    });
}
