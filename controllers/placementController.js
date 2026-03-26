const prisma = require('../config/db');

const createPlacement = async (req, res) => {
    try {
        const { sceneId, objectType, label, position, rotation, scale, moduleId } = req.body;
        const ownerMasterId = req.user.id;

        const placement = await prisma.worldModulePlacement.create({
            data: {
                ownerMasterId,
                moduleId: moduleId ? parseInt(moduleId) : null,
                sceneId,
                objectType,
                label,
                positionX: position.x, positionY: position.y, positionZ: position.z,
                rotationX: rotation.x, rotationY: rotation.y, rotationZ: rotation.z,
                scaleX: scale.x, scaleY: scale.y, scaleZ: scale.z
            }
        });
        res.status(201).json(placement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create placement' });
    }
};

const getPlacementsByScene = async (req, res) => {
    try {
        const { sceneId } = req.query;
        const placements = await prisma.worldModulePlacement.findMany({
            where: { 
                sceneId, 
                status: 'ACTIVE' 
            },
            include: {
                module: {
                    select: { id: true, title: true, status: true }
                }
            }
        });

        // Filter: for non-owners, only show modules that are PUBLISHED
        const filtered = placements.map(p => {
            if (p.module && p.module.status !== 'PUBLISHED' && p.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
                return { ...p, module: null }; // Hide module if not published and user is not owner
            }
            return p;
        });

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch placements' });
    }
};

const getPlacementById = async (req, res) => {
    try {
        const { id } = req.params;
        const placement = await prisma.worldModulePlacement.findUnique({
            where: { id: parseInt(id) },
            include: { module: true }
        });
        if (!placement) return res.status(404).json({ error: 'Placement not found' });
        res.json(placement);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch placement' });
    }
};

const updatePlacement = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const placement = await prisma.worldModulePlacement.findUnique({ where: { id: parseInt(id) } });
        if (!placement) return res.status(404).json({ error: 'Placement not found' });
        if (placement.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Handle nested position/rotation/scale if provided as objects
        const updateData = { ...data };
        if (data.position) {
            updateData.positionX = data.position.x;
            updateData.positionY = data.position.y;
            updateData.positionZ = data.position.z;
            delete updateData.position;
        }
        if (data.rotation) {
            updateData.rotationX = data.rotation.x;
            updateData.rotationY = data.rotation.y;
            updateData.rotationZ = data.rotation.z;
            delete updateData.rotation;
        }
        if (data.scale) {
            updateData.scaleX = data.scale.x;
            updateData.scaleY = data.scale.y;
            updateData.scaleZ = data.scale.z;
            delete updateData.scale;
        }

        const updated = await prisma.worldModulePlacement.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update placement' });
    }
};

const deletePlacement = async (req, res) => {
    try {
        const { id } = req.params;
        const placement = await prisma.worldModulePlacement.findUnique({ where: { id: parseInt(id) } });
        if (!placement) return res.status(404).json({ error: 'Placement not found' });
        if (placement.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.worldModulePlacement.update({
            where: { id: parseInt(id) },
            data: { status: 'DELETED' }
        });
        res.json({ message: 'Placement marked as deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete placement' });
    }
};

const assignModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { moduleId } = req.body;

        const placement = await prisma.worldModulePlacement.findUnique({ where: { id: parseInt(id) } });
        if (!placement) return res.status(404).json({ error: 'Placement not found' });
        if (placement.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.worldModulePlacement.update({
            where: { id: parseInt(id) },
            data: { moduleId: moduleId ? parseInt(moduleId) : null }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign module' });
    }
};

const uploadModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { idleAnim, interactedAnim } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No GLB file provided' });

        const placement = await prisma.worldModulePlacement.findUnique({ where: { id: parseInt(id) } });
        if (!placement) return res.status(404).json({ error: 'Placement not found' });
        if (placement.ownerMasterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.worldModulePlacement.update({
            where: { id: parseInt(id) },
            data: { 
                modelData: file.buffer,
                idleAnim: idleAnim || null,
                interactedAnim: interactedAnim || null
            }
        });

        // Don't send back the buffer in JSON (it's big)
        const { modelData, ...rest } = updated;
        res.json({ ...rest, hasModel: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload model' });
    }
};

const serveModel = async (req, res) => {
    try {
        const { id } = req.params;
        const placement = await prisma.worldModulePlacement.findUnique({
            where: { id: parseInt(id) },
            select: { modelData: true }
        });

        if (!placement || !placement.modelData) {
            return res.status(404).json({ error: 'Model not found' });
        }

        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Content-Disposition', `attachment; filename="placement_${id}.glb"`);
        res.send(placement.modelData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to serve model' });
    }
};

module.exports = {
    createPlacement,
    getPlacementsByScene,
    getPlacementById,
    updatePlacement,
    deletePlacement,
    assignModule,
    uploadModel,
    serveModel
};
