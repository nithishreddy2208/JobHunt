import ClamScan from 'clamscan';
import fs from 'fs/promises';
import path from 'path';

let clamscan;

// ClamAV depends on a local clamd daemon (Docker container on port 3310) which
// is not available on managed hosts like Render. We therefore make scanning
// environment-aware:
//   - enabled by default in development
//   - disabled by default in production
//   - overridable explicitly via CLAMAV_ENABLED=true|false
export const isClamAvEnabled = () => {
    const flag = process.env.CLAMAV_ENABLED;
    if (flag !== undefined && flag !== '') {
        return flag.toLowerCase() === 'true';
    }
    return process.env.NODE_ENV !== 'production';
};

export const initClamAV = async () => {
    if (!isClamAvEnabled()) {
        clamscan = null;
        console.log('[clamav] DISABLED (skipping initialization; uploads will not be virus-scanned)');
        return;
    }

    clamscan = await new ClamScan().init({
        clamdscan: {
            host: process.env.CLAMAV_HOST || '127.0.0.1',
            port: Number(process.env.CLAMAV_PORT) || 3310,
            timeout: Number(process.env.CLAMAV_TIMEOUT_MS) || 60000
        }
    });
    console.log('[clamav] ENABLED (uploads will be virus-scanned)');
};

export const scanFile = async (file) => {
    if (!isClamAvEnabled()) {
        return { isInfected: false, skipped: true };
    }

    if (!clamscan) {
        console.warn("ClamAV not initialized, skipping scan");
        return { isInfected: false, skipped: true };
    }

    const tempPath = path.join("temp_" + Date.now() + "_" + file.originalname);

    try {
        await fs.writeFile(tempPath, file.buffer);

        const { isInfected, viruses } = await clamscan.scanFile(tempPath);

        await fs.unlink(tempPath);

        return { isInfected, viruses };

    } catch (err) {
        console.error("ClamAV scan failed:", err);
        return { isInfected: false };
    }
};