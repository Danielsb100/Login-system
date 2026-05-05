const crypto = require('crypto');
const fs = require('fs');
const env = require('../config/env');
const { createLocalAssetStorage } = require('./assetStorage');

const assetStorage = createLocalAssetStorage({ rootDir: env.upload.storageDir });

const sanitizePart = (value) => String(value || 'item')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'item';

const buildMaterialFilename = (sourceType, sourceId, label = 'metadata') => (
  `${sanitizePart(sourceType)}-${sanitizePart(sourceId)}-${sanitizePart(label)}.txt`
);

const hashMaterial = ({ sourceType, sourceId, text, buffer, updatedAt, storageKey, sizeBytes }) => {
  const hash = crypto.createHash('sha256');
  hash.update(String(sourceType || ''));
  hash.update(':');
  hash.update(String(sourceId || ''));
  hash.update(':');
  hash.update(String(updatedAt || ''));
  hash.update(':');
  hash.update(String(storageKey || ''));
  hash.update(':');
  hash.update(String(sizeBytes || ''));
  if (buffer) hash.update(buffer);
  if (text) hash.update(String(text));
  return hash.digest('hex');
};

const textBuffer = (text) => Buffer.from(String(text || ''), 'utf8');

const buildModuleMetadataText = (module) => {
  const lines = [
    `Training module: ${module.title || 'Untitled module'}`,
    module.description ? `Description: ${module.description}` : null,
    '',
    'Videos:',
    ...(module.videos || []).map((video, index) => `- ${index + 1}. ${video.title || 'Untitled video'} — ${video.url || 'no URL'}`)
  ].filter((line) => line !== null);
  return lines.join('\n');
};

const buildCourseMetadataText = (course) => {
  const modules = (course.courseModules || [])
    .slice()
    .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
    .map((entry, index) => `- Step ${index + 1}: ${entry.module?.title || `Module ${entry.moduleId}`} ${entry.isRequired ? '(required)' : '(optional)'}`);
  return [
    `Training course: ${course.title || 'Untitled course'}`,
    course.description ? `Description: ${course.description}` : null,
    '',
    'Course trail order:',
    ...modules
  ].filter((line) => line !== null).join('\n');
};

const resolveDocumentBuffer = async (document, fallbackText) => {
  if (document.data) return Buffer.from(document.data);
  if (document.storageProvider === 'local' && document.storageKey) {
    return fs.promises.readFile(assetStorage.resolvePath(document.storageKey));
  }
  return textBuffer(fallbackText);
};

const resolveDocumentUpdatedAt = async (document, moduleDocument) => {
  if (document.updatedAt) return document.updatedAt;
  if (document.storageProvider === 'local' && document.storageKey) {
    try {
      const stats = await assetStorage.stat(document.storageKey);
      return stats.updatedAt || moduleDocument.updatedAt || document.createdAt;
    } catch (error) {
      return moduleDocument.updatedAt || document.createdAt;
    }
  }
  return moduleDocument.updatedAt || document.createdAt;
};

const documentToMaterial = async (moduleId, moduleDocument) => {
  const document = moduleDocument.document || {};
  const fallbackText = `Document linked to module ${moduleId}: ${moduleDocument.title || document.name || `Document ${document.id}`}`;
  const buffer = await resolveDocumentBuffer(document, fallbackText).catch(() => textBuffer(fallbackText));
  const filename = document.name || buildMaterialFilename('Document', document.id || moduleDocument.id, moduleDocument.title || 'document');
  const material = {
    sourceType: 'Document',
    sourceId: document.id || moduleDocument.documentId || moduleDocument.id,
    filename,
    mimeType: document.type || 'text/plain',
    buffer,
    updatedAt: await resolveDocumentUpdatedAt(document, moduleDocument),
    storageKey: document.storageKey,
    sizeBytes: document.sizeBytes || buffer.length
  };
  material.sourceHash = hashMaterial(material);
  return material;
};

const moduleToMaterials = async (module) => {
  const metadataText = buildModuleMetadataText(module);
  const metadata = {
    sourceType: 'TrainingModule',
    sourceId: module.id,
    filename: buildMaterialFilename('TrainingModule', module.id, 'metadata'),
    mimeType: 'text/plain',
    text: metadataText,
    buffer: textBuffer(metadataText),
    updatedAt: module.updatedAt
  };
  metadata.sourceHash = hashMaterial(metadata);

  const documents = await Promise.all((module.documents || []).map((doc) => documentToMaterial(module.id, doc)));
  return [metadata, ...documents];
};

const courseToMaterial = (course) => {
  const text = buildCourseMetadataText(course);
  const material = {
    sourceType: 'Course',
    sourceId: course.id,
    filename: buildMaterialFilename('Course', course.id, 'trail'),
    mimeType: 'text/plain',
    text,
    buffer: textBuffer(text),
    updatedAt: course.updatedAt
  };
  material.sourceHash = hashMaterial(material);
  return material;
};

const buildTrainingMaterialList = async (prisma) => {
  const [modules, courses] = await Promise.all([
    prisma.trainingModule.findMany({
      include: {
        videos: { orderBy: { order: 'asc' } },
        documents: { include: { document: true }, orderBy: { order: 'asc' } }
      }
    }),
    prisma.course.findMany({
      include: {
        courseModules: {
          orderBy: { orderIndex: 'asc' },
          include: { module: { select: { id: true, title: true } } }
        }
      }
    })
  ]);

  return [
    ...(await Promise.all(modules.map(moduleToMaterials))).flat(),
    ...courses.map(courseToMaterial)
  ];
};

module.exports = {
  buildCourseMetadataText,
  buildMaterialFilename,
  buildModuleMetadataText,
  buildTrainingMaterialList,
  courseToMaterial,
  documentToMaterial,
  hashMaterial,
  moduleToMaterials
};
