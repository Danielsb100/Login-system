const fs = require('fs');
const prisma = require('../config/db');
const env = require('../config/env');
const { createLocalAssetStorage } = require('../services/assetStorage');
// SYNC_CHECK: 24/03/2026 16:40

const assetStorage = createLocalAssetStorage({ rootDir: env.upload.storageDir });

const buildDocumentResponse = (document) => ({
    id: document.id,
    name: document.name,
    type: document.type,
    sizeBytes: document.sizeBytes,
    storageProvider: document.storageProvider,
    downloadUrl: `/api/documents/download/${document.id}`,
    createdAt: document.createdAt
});

const cleanupTempUpload = async (file) => {
    if (!file?.path) return;
    await fs.promises.rm(file.path, { force: true }).catch(() => {});
};

exports.uploadDocument = async (req, res) => {
    let storedFile = null;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        storedFile = await assetStorage.saveUploadedFile({
            tempPath: req.file.path,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype
        });

        const document = await prisma.document.create({
            data: {
                userId: req.user.id,
                name: req.file.originalname,
                type: req.file.mimetype,
                storageProvider: storedFile.provider,
                storageKey: storedFile.storageKey,
                sizeBytes: storedFile.sizeBytes
            }
        });

        res.status(201).json({
            message: 'Document uploaded successfully',
            ...buildDocumentResponse(document)
        });
    } catch (err) {
        await cleanupTempUpload(req.file);
        if (storedFile?.provider === 'local' && storedFile.storageKey) {
            await assetStorage.remove(storedFile.storageKey).catch(() => {});
        }
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getUserDocuments = async (req, res) => {
    try {
        let { username } = req.params;
        username = username ? username.trim() : '';
        
        console.log(`[DEBUG] Assets Lookup: username='${username}' (length: ${username.length})`);
        
        let user = await prisma.user.findFirst({
            where: { 
                username: {
                    equals: username,
                    mode: 'insensitive'
                }
            },
            include: {
                documents: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        sizeBytes: true,
                        storageProvider: true,
                        createdAt: true
                    }
                }
            }
        });

        // LAST RESORT FALLBACK: If findFirst fails, scan manually
        if (!user) {
            console.warn(`[REDUNDANCY] findFirst failed for '${username}'. Scanning all users...`);
            const allUsers = await prisma.user.findMany({
                include: {
                    documents: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            sizeBytes: true,
                            storageProvider: true,
                            createdAt: true
                        }
                    }
                }
            });
            user = allUsers.find(u => u.username.toLowerCase().trim() === username.toLowerCase());
            
            if (user) {
                 console.log(`[SUCCESS] Redundancy found user: '${user.username}' (ID: ${user.id})`);
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ documents: user.documents.map(buildDocumentResponse) });
    } catch (err) {
        console.error('Documents list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({
            where: { id: parseInt(id) }
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.set({
            'Content-Type': document.type,
            'Content-Disposition': `attachment; filename="${document.name}"`
        });

        if (document.storageProvider === 'local' && document.storageKey) {
            const stats = await assetStorage.stat(document.storageKey);
            res.set('Content-Length', stats.sizeBytes);
            return assetStorage.createReadStream(document.storageKey).pipe(res);
        }

        if (document.data) {
            res.set('Content-Length', document.data.length);
            return res.send(document.data);
        }

        return res.status(404).json({ error: 'Document file not found' });
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({
            where: { id: parseInt(id) }
        });

        if (!document) return res.status(404).json({ error: 'Not found' });
        if (document.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.document.delete({ where: { id: parseInt(id) } });
        if (document.storageProvider === 'local' && document.storageKey) {
            await assetStorage.remove(document.storageKey);
        }
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
