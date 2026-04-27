const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildStoredFileName,
  createLocalAssetStorage
} = require('../services/assetStorage');

async function run() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'training-asset-storage-'));
  const tempFile = path.join(rootDir, 'upload.tmp');
  fs.writeFileSync(tempFile, Buffer.from('large-video-bytes'));

  const storage = createLocalAssetStorage({ rootDir });
  const stored = await storage.saveUploadedFile({
    tempPath: tempFile,
    originalName: 'Safety Intro Video.mp4',
    mimeType: 'video/mp4'
  });

  assert.strictEqual(stored.provider, 'local');
  assert.strictEqual(stored.sizeBytes, Buffer.byteLength('large-video-bytes'));
  assert(stored.storageKey.endsWith('.mp4'));
  assert(!fs.existsSync(tempFile), 'temporary upload file should be moved out of multer temp storage');

  const resolvedPath = storage.resolvePath(stored.storageKey);
  assert(fs.existsSync(resolvedPath), 'stored asset should exist on disk');
  assert.strictEqual(fs.readFileSync(resolvedPath, 'utf8'), 'large-video-bytes');

  const meta = await storage.stat(stored.storageKey);
  assert.strictEqual(meta.sizeBytes, stored.sizeBytes);

  await storage.remove(stored.storageKey);
  assert(!fs.existsSync(resolvedPath), 'remove should delete stored file');

  const safeName = buildStoredFileName('unsafe ../ Video NAME.mp4');
  assert(safeName.endsWith('.mp4'));
  assert(!safeName.includes('..'));
  assert(!safeName.includes('/'));

  fs.rmSync(rootDir, { recursive: true, force: true });
  console.log('assetStorage tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
