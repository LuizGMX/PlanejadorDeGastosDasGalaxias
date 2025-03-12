import express from 'express';
import { promises as fs } from 'fs';
import upload from '../middleware/uploadMiddleware.js';
import spreadsheetProcessor from '../services/spreadsheetProcessorService.js';

const router = express.Router();

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
    }

    const result = await spreadsheetProcessor.processSpreadsheet(req.file.path, req.user.id);
    
    // Remove o arquivo após processamento
    await fs.unlink(req.file.path);
    
    res.json({
      message: 'Planilha processada com sucesso',
      processedItems: result.length,
      data: result
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro ao processar a planilha',
      details: error.message 
    });
  }
});

export default router; 