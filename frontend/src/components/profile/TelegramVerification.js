import React from 'react';
import styles from '../../styles/shared.module.css';

const TelegramVerification = ({ 
  user, 
  verificationCode, 
  remainingTime, 
  telegramError, 
  telegramLoading, 
  requestTelegramCode,
  getRemainingTime 
}) => {
  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2>Telegram</h2>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.communicationSection}>
          <h3>Usar Telegram para adicionar gastos rapidamente</h3>
          <div className={styles.telegramSection}>
            <div className={styles.telegramHeader}>
              <div className={styles.telegramStatus}>
                <span>Status:</span>
                <span className={user?.telegram_verified ? styles.statusVerified : styles.statusUnverified}>
                  {user?.telegram_verified ? 'Verificado ✓' : 'Não verificado'}
                </span>
              </div>
            </div>
            {!user?.telegram_verified && (
              <>
                <div className={styles.telegramInstructions}>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>1</span>
                    <span className={styles.stepText}>
                      Acesse{' '}
                      <a
                        href="https://t.me/PlanejadorDeGastosBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.botLink}
                      >
                        @PlanejadorDeGastosBot
                      </a>
                    </span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>2</span>
                    <span className={styles.stepText}>Envie /start para o bot</span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>3</span>
                    <span className={styles.stepText}>Gere seu código de verificação</span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>4</span>
                    <span className={styles.stepText}>Envie o código para o bot</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.telegramButton} ${remainingTime > 0 ? styles.waiting : ''}`}
                  onClick={requestTelegramCode}
                  disabled={telegramLoading || remainingTime > 0}
                >
                  {telegramLoading
                    ? 'Gerando código...'
                    : remainingTime > 0
                    ? `Aguarde ${getRemainingTime()}`
                    : 'GERAR CÓDIGO DE VERIFICAÇÃO'}
                </button>
                {telegramError && <p className={styles.telegramError}>{telegramError}</p>}
                {verificationCode && (
                  <div className={styles.verificationCode}>
                    <span className={styles.code}>{verificationCode}</span>
                    {remainingTime > 0 && (
                      <span className={styles.codeTimer}>Expira em {getRemainingTime()}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramVerification; 