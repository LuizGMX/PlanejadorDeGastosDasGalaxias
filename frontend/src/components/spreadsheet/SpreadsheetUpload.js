import React, { useState, useContext } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { AuthContext } from '../../contexts/AuthContext';

const SpreadsheetUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { auth } = useContext(AuthContext);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('O arquivo é muito grande. O tamanho máximo é 5MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo para upload.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/spreadsheet/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(`Planilha processada com sucesso! ${response.data.processedItems} itens foram importados.`);
      setFile(null);
      // Limpa o input file
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar a planilha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Upload de Planilha
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Faça upload de uma planilha Excel ou CSV com suas despesas e receitas.
        Nossa IA irá categorizar automaticamente os itens com base nas descrições.
      </Typography>

      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          mb: 2,
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
        onClick={() => document.querySelector('input[type="file"]').click()}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography>
          {file ? file.name : 'Clique ou arraste um arquivo aqui'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!file || loading}
        fullWidth
        sx={{ mt: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Processar Planilha'
        )}
      </Button>
    </Paper>
  );
};

export default SpreadsheetUpload; 