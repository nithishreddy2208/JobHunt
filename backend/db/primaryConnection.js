/**
 * Primary MongoDB connection.
 * --------------------------------------------------
 * This is the default `mongoose` connection used for:
 *   - All writes (Mongoose drives writes to the replica-set primary
 *     automatically; this connection just makes that explicit).
 *   - Reads that need read-your-write consistency (auth checks,
 *     existence checks before a write, etc.).
 *
 * Replica-set background:
 *   A MongoDB Atlas cluster is a replica set with one primary node and
 *   N secondary nodes. The driver discovers the topology from the SRV
 *   URI and routes operations based on the connection's read preference.
 *   With `readPreference: 'primary'` every read on this connection
 *   targets the primary, guaranteeing the freshest data.
 *
 * Failover handling:
 *   If the primary steps down, the driver detects the new primary via
 *   the SDAM (Server Discovery and Monitoring) loop and automatically
 *   re-routes operations. `serverSelectionTimeoutMS` caps how long the
 *   driver waits for a suitable server during a failover.
 */

import mongoose from 'mongoose';

const buildOptions = () => ({
    maxPoolSize: Number(process.env.DB_POOL_SIZE_MAX || 20),
    minPoolSize: Number(process.env.DB_POOL_SIZE_MIN || 2),
    serverSelectionTimeoutMS: Number(process.env.DB_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.DB_SOCKET_TIMEOUT_MS || 45000),
    retryWrites: true,
    readPreference: 'primary'
});

let connected = false;

const wireListeners = () => {
    const conn = mongoose.connection;
    conn.on('connected', () => {
        connected = true;
        console.log(`[db:primary] connected host=${conn.host} db=${conn.name} readPreference=primary`);
    });
    conn.on('disconnected', () => {
        connected = false;
        console.warn('[db:primary] disconnected');
    });
    conn.on('reconnected', () => {
        connected = true;
        console.log('[db:primary] reconnected');
    });
    conn.on('error', (err) => {
        console.error('[db:primary] error:', err?.message || err);
    });
};

let listenersWired = false;

export const connectPrimary = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set');

    if (!listenersWired) {
        wireListeners();
        listenersWired = true;
    }

    await mongoose.connect(uri, buildOptions());
    return mongoose.connection;
};

export const getPrimaryConnection = () => mongoose.connection;

export const getPrimaryHealth = () => {
    const conn = mongoose.connection;
    return {
        ok: conn.readyState === 1,
        readyState: conn.readyState, // 0=disconnected,1=connected,2=connecting,3=disconnecting
        host: conn.host || null,
        db: conn.name || null,
        readPreference: 'primary',
        connectedFlag: connected
    };
};
