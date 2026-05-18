/**
 * Read-replica MongoDB connection.
 * --------------------------------------------------
 * A *separate* Mongoose connection to the same Atlas cluster, configured
 * with `readPreference: 'secondaryPreferred'`. Heavy/analytics reads
 * registered against this connection are routed to a secondary node
 * (when one is healthy), offloading work from the primary.
 *
 * Why a separate connection?
 *   Mongoose attaches read preference at the connection level, so a
 *   dedicated read connection lets us:
 *     - Use a different pool size tuned for reads.
 *     - Keep write traffic on the primary connection's pool.
 *     - Disable the read connection independently (e.g. during incidents).
 *
 * Read preference semantics:
 *   - `secondary`           -> only secondaries (reads fail if all are down)
 *   - `secondaryPreferred`  -> secondaries when available, otherwise primary
 *   - `nearest`             -> lowest-latency node regardless of role
 *   We default to `secondaryPreferred` so a single secondary outage never
 *   takes the read path down.
 *
 * Fallback:
 *   If this connection itself fails to connect, `getReadConnection()`
 *   returns null and the `ReadModels` proxy in db/models.js transparently
 *   falls back to the primary connection. APIs never crash because the
 *   replica is unreachable.
 */

import mongoose from 'mongoose';

const DEFAULT_READ_PREFERENCE = 'secondaryPreferred';

let readConnection = null;
let attempted = false;

const buildOptions = () => ({
    maxPoolSize: Number(process.env.DB_READ_POOL_SIZE_MAX || process.env.DB_POOL_SIZE_MAX || 20),
    minPoolSize: Number(process.env.DB_READ_POOL_SIZE_MIN || process.env.DB_POOL_SIZE_MIN || 2),
    serverSelectionTimeoutMS: Number(process.env.DB_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.DB_SOCKET_TIMEOUT_MS || 45000),
    retryWrites: false, // reads only; retryWrites has no effect on reads anyway
    readPreference: process.env.READ_PREFERENCE || DEFAULT_READ_PREFERENCE
});

const wireListeners = (conn) => {
    conn.on('connected', () => {
        console.log(`[db:replica] connected host=${conn.host} readPreference=${buildOptions().readPreference}`);
    });
    conn.on('disconnected', () => {
        console.warn('[db:replica] disconnected (reads will fall back to primary)');
    });
    conn.on('reconnected', () => {
        console.log('[db:replica] reconnected');
    });
    conn.on('error', (err) => {
        console.error('[db:replica] error:', err?.message || err);
    });
};

/**
 * Attempts to open the read-replica connection. Never throws — a failure
 * here is logged and reads transparently fall back to primary.
 */
export const connectReadReplica = async () => {
    attempted = true;

    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.warn('[db:replica] MONGO_URI not set, skipping replica connection');
        return null;
    }

    try {
        const conn = mongoose.createConnection(uri, buildOptions());
        wireListeners(conn);
        await conn.asPromise();
        readConnection = conn;
        return conn;
    } catch (err) {
        console.warn(
            '[db:replica] initial connect failed, reads will use primary:',
            err?.message || err
        );
        readConnection = null;
        return null;
    }
};

export const getReadConnection = () => readConnection;

export const isReadReplicaHealthy = () =>
    Boolean(readConnection && readConnection.readyState === 1);

export const getReplicaHealth = () => {
    if (!readConnection) {
        return {
            ok: false,
            readyState: 0,
            host: null,
            readPreference: buildOptions().readPreference,
            attempted,
            fallbackActive: true
        };
    }
    return {
        ok: readConnection.readyState === 1,
        readyState: readConnection.readyState,
        host: readConnection.host || null,
        readPreference: buildOptions().readPreference,
        attempted,
        fallbackActive: readConnection.readyState !== 1
    };
};

export const closeReadReplica = async () => {
    if (readConnection) {
        try {
            await readConnection.close();
        } catch (err) {
            console.warn('[db:replica] close error:', err?.message || err);
        }
        readConnection = null;
    }
};
