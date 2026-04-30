const crypto = require('crypto');

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

const stripQuizAnswerKeys = (quizzes = []) => (quizzes || []).map((quiz) => ({
  title: quiz.title,
  questions: (quiz.questions || []).map((question) => ({
    text: question.text,
    options: (question.options || []).map((option) => option.text).filter(Boolean)
  }))
}));

const textBuffer = (text) => Buffer.from(String(text || ''), 'utf8');

const buildModuleMetadataText = (module) => {
  const lines = [
    `Training module: ${module.title || 'Untitled module'}`,
    module.description ? `Description: ${module.description}` : null,
    '',
    'Videos:',
    ...(module.videos || []).map((video, index) => `- ${index + 1}. ${video.title || 'Untitled video'} — ${video.url || 'no URL'}`),
    '',
    'Quizzes and questions (answer keys intentionally omitted):',
    JSON.stringify(stripQuizAnswerKeys(module.quizzes || []), null, 2)
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

const documentToMaterial = (moduleId, moduleDocument) => {
  const document = moduleDocument.document || {};
  const fallbackText = `Document linked to module ${moduleId}: ${moduleDocument.title || document.name || `Document ${document.id}`}`;
  const buffer = document.data ? Buffer.from(document.data) : textBuffer(fallbackText);
  const filename = document.name || buildMaterialFilename('Document', document.id || moduleDocument.id, moduleDocument.title || 'document');
  const material = {
    sourceType: 'Document',
    sourceId: document.id || moduleDocument.documentId || moduleDocument.id,
    filename,
    mimeType: document.type || 'text/plain',
    buffer,
    updatedAt: document.updatedAt || moduleDocument.updatedAt,
    storageKey: document.storageKey,
    sizeBytes: document.sizeBytes || buffer.length
  };
  material.sourceHash = hashMaterial(material);
  return material;
};

const moduleToMaterials = (module) => {
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

  const documents = (module.documents || []).map((doc) => documentToMaterial(module.id, doc));
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
        documents: { include: { document: true }, orderBy: { order: 'asc' } },
        quizzes: {
          orderBy: { order: 'asc' },
          include: {
            questions: { orderBy: { order: 'asc' }, include: { options: true } }
          }
        }
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
    ...modules.flatMap(moduleToMaterials),
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
  moduleToMaterials,
  stripQuizAnswerKeys
};
