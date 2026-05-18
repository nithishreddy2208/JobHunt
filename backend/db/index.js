/**
 * Database orchestrator.
 * --------------------------------------------------
 * Single entry-point that brings up the primary and (best-effort) the
 * read-replica connection, registers read-side models, and exposes a
 * unified health snapshot for the /api/health/db endpoint.
 *
 * Read/write split summary:
 *   WRITES  -> primary connection (default mongoose.*)
 *     - register, login, update profile
 *     - postJob, registerCompany, updateCompany
 *     - applyJob, updateApplicationStatus
 *     - upgradeToPro
 *
 *   READS (latency-tolerant / analytics) -> read-replica connection
 *     - browse jobs, recruiter "my jobs", applicants list
 *     - applied-jobs list, dashboard analytics
 *     - semantic search lookups, AI candidate ranking fetches
 *
 *   READS (read-your-write) -> primary connection
 *     - duplicate-email checks during register/update
 *     - existence checks immediately before a write
 *     - loading the actor right after their own write
 */

import { connectPrimary, getPrimaryHealth } from './primaryConnection.js';
import {
    connectReadReplica,
    getReplicaHealth,
    closeReadReplica
} from './readReplicaConnection.js';
import { registerReadModels } from './models.js';

export const connectAll = async () => {
    // Primary first (required). If this fails the server can't start.
    await connectPrimary();

    // Replica is best-effort. Failure is logged but doesn't block startup.
    await connectReadReplica();
    registerReadModels();
};

export const getDbHealth = () => ({
    primary: getPrimaryHealth(),
    replica: getReplicaHealth()
});

export const closeAll = async () => {
    await closeReadReplica();
    // Primary is closed by the existing process shutdown via mongoose.disconnect()
};

export { ReadModels } from './models.js';
