const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const safeExtension = (filename = '') => {
  const ext = path.extname(String(filename)).toLowerCase();
  return /^[a-z0-9.]{1,16}$/.test(ext) ? ext : '';
};

const buildStoredFileName = (originalName = '') => {
  const ext = safeExtension(originalName);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = crypto.randomBytes(12).toString('hex');
  return `${stamp}-${random}${ext}`;
};

const ensureInsideRoot = (rootDir, storageKey) => {
  const normalizedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(normalizedRoot, storageKey);
  if (!resolvedPath.startsWith(`${normalizedRoot}${path.sep}`) && resolvedPath !== normalizedRoot) {
    throw new Error('Invalid asset storage key.');
  }
  return resolvedPath;
};

const createLocalAssetStorage = ({ rootDir }) => {
  if (!rootDir) {
    throw new Error('Local asset storage rootDir is required.');
  }

  const resolvedRoot = path.resolve(rootDir);
  fs.mkdirSync(resolvedRoot, { recursive: true });

  const resolvePath = (storageKey) => ensureInsideRoot(resolvedRoot, storageKey);

  return {
    provider: 'local',
    rootDir: resolvedRoot,
    resolvePath,

    async saveUploadedFile({ tempPath, originalName, mimeType }) {
      if (!tempPath) {
        throw new Error('Temporary upload path is required.');
      }

      const now = new Date();
      const storageKey = path.posix.join(
        String(now.getUTCFullYear()),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        buildStoredFileName(originalName)
      );
      const destinationPath = resolvePath(storageKey);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      await fs.promises.rename(tempPath, destinationPath);
      const stats = await fs.promises.stat(destinationPath);

      return {
        provider: 'local',
        storageKey,
        sizeBytes: stats.size,
        mimeType
      };
    },

    createReadStream(storageKey) {
      return fs.createReadStream(resolvePath(storageKey));
    },

    async stat(storageKey) {
      const stats = await fs.promises.stat(resolvePath(storageKey));
      return { sizeBytes: stats.size, updatedAt: stats.mtime };
    },

    async remove(storageKey) {
      if (!storageKey) return;
      await fs.promises.rm(resolvePath(storageKey), { force: true });
    }
  };
};

module.exports = {
  buildStoredFileName,
  createLocalAssetStorage
};
