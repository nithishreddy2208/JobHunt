import ClamScan from 'clamscan';
import fs from 'fs/promises';
import path from 'path';

let clamscan;

export const initClamAV = async () => {
    clamscan = await new ClamScan().init({
        clamdscan: {
            host: '127.0.0.1',
            port: 3310,
            timeout: 60000
        }
    });
};

export const scanFile = async (file) => {
    if (!clamscan) {
        console.warn("ClamAV not initialized, skipping scan");
        return { isInfected: false };
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