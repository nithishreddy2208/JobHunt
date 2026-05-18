/**
 * Back-compat shim for the original `connectDb()` import path.
 * The real implementation now lives under `backend/db/` so we can
 * support primary + read-replica connections cleanly.
 */
import { connectAll } from '../db/index.js';

export const connectDb = async () => {
    await connectAll();
};
