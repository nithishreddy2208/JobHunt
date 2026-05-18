/**
 * Read-side model registry.
 * --------------------------------------------------
 * Re-registers every schema on the read-replica connection so that
 * controllers can do read-heavy queries against secondaries while
 * still using familiar Mongoose APIs.
 *
 *   import { ReadModels } from '@/db/models.js';
 *   const jobs = await ReadModels.Job.find(query).lean();
 *
 * The `ReadModels` proxy automatically falls back to the primary
 * connection's compiled model when:
 *   - The replica connection failed to initialize, OR
 *   - The replica connection is currently disconnected.
 *
 * This guarantees no API ever crashes because the replica is
 * unavailable; the worst case is reads served by the primary.
 */

import mongoose from 'mongoose';

import { Job } from '../models/job.model.js';
import { Application } from '../models/application.model.js';
import { User } from '../models/user.model.js';
import { Company } from '../models/company.model.js';

import { getReadConnection, isReadReplicaHealthy } from './readReplicaConnection.js';

// Schemas to re-register on the read connection. Pulled from the
// already-compiled primary models so we never duplicate schema definitions.
const SCHEMAS = {
    Job: Job.schema,
    Application: Application.schema,
    User: User.schema,
    Company: Company.schema
};

/**
 * Registers every schema on the read connection. Safe to call multiple
 * times (mongoose throws on duplicate model registration; we guard for it).
 */
export const registerReadModels = () => {
    const conn = getReadConnection();
    if (!conn) return;

    for (const [name, schema] of Object.entries(SCHEMAS)) {
        if (!conn.models[name]) {
            conn.model(name, schema);
        }
    }
};

const primaryModelFor = (name) => mongoose.model(name);

/**
 * Returns the read-connection model when the replica is healthy,
 * otherwise the primary-connection model. Never returns undefined.
 */
const resolveModel = (name) => {
    if (isReadReplicaHealthy()) {
        const conn = getReadConnection();
        if (conn?.models?.[name]) {
            return conn.models[name];
        }
    }
    return primaryModelFor(name);
};

export const ReadModels = new Proxy(
    {},
    {
        get(_, prop) {
            if (typeof prop !== 'string') return undefined;
            if (!SCHEMAS[prop]) {
                throw new Error(`ReadModels: unknown model '${String(prop)}'`);
            }
            return resolveModel(prop);
        }
    }
);
