const fs = require('fs');
const eurobotClient = require('../services/eurobotClient');
const { chatWithTrainingAi } = require('../services/trainingAiService');
const { isTrainingAiManager } = require('./trainingAiController');

const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio file is required.' });
    const buffer = await fs.promises.readFile(req.file.path);
    const result = await eurobotClient.transcribe({
      fileBuffer: buffer,
      filename: req.file.originalname || 'audio.webm',
      mimeType: req.file.mimetype || 'audio/webm'
    });
    res.json({ text: result.text || '' });
  } catch (error) {
    console.error('Eurobot transcription failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to transcribe audio.' });
  } finally {
    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch(() => {});
    }
  }
};

const textToSpeech = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Text is required.' });
    const result = await eurobotClient.tts({ text });
    res.json(result);
  } catch (error) {
    console.error('Eurobot TTS failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to generate speech.' });
  }
};

const voiceChat = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio file is required.' });
    const buffer = await fs.promises.readFile(req.file.path);
    const transcription = await eurobotClient.transcribe({
      fileBuffer: buffer,
      filename: req.file.originalname || 'audio.webm',
      mimeType: req.file.mimetype || 'audio/webm'
    });
    const text = String(transcription.text || '').trim();
    if (!text) return res.status(422).json({ error: 'Could not transcribe audio.' });
    if (!isTrainingAiManager(req.user)) {
      return res.status(403).json({ error: 'Training-wide voice chat requires manager access. Use module assistant voice inside an accessible module.' });
    }

    const chat = await chatWithTrainingAi({
      message: text,
      conversationId: req.body?.conversationId || `training-voice-${req.user.id}`,
      returnAudio: String(req.body?.returnAudio || '').toLowerCase() === 'true'
    });

    res.json({ text, ...chat });
  } catch (error) {
    console.error('Eurobot voice chat failed:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to process voice chat.' });
  } finally {
    if (req.file?.path) {
      fs.promises.rm(req.file.path, { force: true }).catch(() => {});
    }
  }
};

module.exports = {
  textToSpeech,
  transcribeAudio,
  voiceChat
};
