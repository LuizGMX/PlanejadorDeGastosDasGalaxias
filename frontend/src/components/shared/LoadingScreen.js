import React from 'react';
import '../../styles/LoadingScreen.css';

const LoadingScreen = ({ message = 'Carregando...' }) => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen; 