const prisma = require('../config/db');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const document = await prisma.document.create({
            data: {
                userId: req.user.id,
                name: req.file.originalname,
                type: req.file.mimetype,
                data: req.file.buffer // Binary storage
            }
        });

        res.status(201).json({ message: 'Document uploaded successfully', id: document.id });
    } catch (err) {
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
                        createdAt: true
                    }
                }
            }
        });

        // LAST RESORT FALLBACK: If findFirst fails, scan manually
        if (!user) {
            console.warn(`[REDUNDANCY] findFirst failed for '${username}'. Scanning all users...`);
            const allUsers = await prisma.user.findMany({ include: { documents: true } });
            user = allUsers.find(u => u.username.toLowerCase().trim() === username.toLowerCase());
            
            if (user) {
                 console.log(`[SUCCESS] Redundancy found user: '${user.username}' (ID: ${user.id})`);
                 // Re-map documents to safe format (strip binary data)
                 user.documents = user.documents.map(d => ({
                    id: d.id,
                    name: d.name,
                    type: d.type,
                    createdAt: d.createdAt
                 }));
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ documents: user.documents });
    } catch (err) {
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
            'Content-Disposition': `attachment; filename="${document.name}"`,
            'Content-Length': document.data.length
        });

        res.send(document.data);
    } catch (err) {
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
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
