import React from 'react';
import styles from '../../styles/shared.module.css';
import { BsTelegram, BsCheckCircle, BsArrowRepeat, BsKey } from 'react-icons/bs';

const TelegramVerification = ({ 
  user, 
  verificationCode, 
  remainingTime, 
  telegramError, 
  telegramLoading, 
  requestTelegramCode,
  getRemainingTime,
  refreshUserData
}) => {
  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2><BsTelegram /> Telegram</h2>
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
                        href="https://t.me/PlanejadorDasGalaxiasBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.botLink}
                      >
                        @PlanejadorDasGalaxiasBot
                      </a>
                    </span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>2</span>
                    <span className={styles.stepText}>Envie /start para o bot</span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>3</span>
                    <span className={styles.stepText}>Gere seu código de verificação abaixo</span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>4</span>
                    <span className={styles.stepText}>Envie /verificar para o bot</span>
                  </div>
                  <div className={styles.instructionStep}>
                    <span className={styles.stepNumber}>5</span>
                    <span className={styles.stepText}>Quando solicitado, envie apenas o código</span>
                  </div>
                </div>
                <div className={styles.telegramButtons}>
                  <a
                    href="https://t.me/PlanejadorDasGalaxiasBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.telegramButton}
                  >
                    <BsTelegram /> ABRIR BOT NO TELEGRAM
                  </a>
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
                      : <><BsKey /> GERAR CÓDIGO DE VERIFICAÇÃO</>}
                  </button>
                  <button
                    type="button"
                    onClick={refreshUserData}
                    className={styles.verifiedButton}
                  >
                    <BsCheckCircle /> JÁ VERIFIQUEI MEU TELEGRAM
                  </button>
                </div>
                {telegramError && <p className={styles.telegramError}>{telegramError}</p>}
                {verificationCode && (
                  <div className={styles.verificationCode}>
                    <span className={styles.code}>{verificationCode}</span>
                    {remainingTime > 0 && (
                      <span className={styles.codeTimer}><BsArrowRepeat /> Expira em {getRemainingTime()}</span>
                    )}
                  </div>
                )}
              </>
            )}
            {user?.telegram_verified && (
              <div className={styles.telegramConnected}>
                <p>Seu Telegram está conectado! Agora você pode:</p>
                <ul className={styles.telegramFeatures}>
                  <li>Registrar despesas pelo bot</li>
                  <li>Receber lembretes de pagamentos</li>
                  <li>Consultar seu orçamento a qualquer momento</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramVerification; 