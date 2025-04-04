import React from 'react';
import styles from '../../styles/shared.module.css';
import { 
  BsTelegram, 
  BsCheckCircle, 
  BsArrowRepeat, 
  BsKey, 
  BsX, 
  BsChat, 
  BsAlarm, 
  BsGraphUp, 
  BsArrowRight,
  BsShieldLock,
  BsExclamationTriangle
} from 'react-icons/bs';

const TelegramVerification = ({ 
  user, 
  verificationCode, 
  remainingTime, 
  telegramError, 
  telegramLoading, 
  requestTelegramCode,
  disconnectTelegram,
  getRemainingTime,
  refreshUserData
}) => {
  // Função para renderizar o badge de status
  const renderStatusBadge = () => (
    <div className={styles.telegramBadge}>
      <span className={user?.telegram_verified ? styles.statusVerified : styles.statusUnverified}>
        {user?.telegram_verified ? 
          <><BsCheckCircle /> Telegram Conectado</> : 
          <><BsX /> Não conectado</>}
      </span>
    </div>
  );

  // Função para renderizar a exibição do código
  const renderVerificationCode = () => {
    if (!verificationCode) return null;
    
    return (
      <div className={styles.verificationCode}>
        <div className={styles.codeHeader}>
          <BsShieldLock size={18} />
          <span>Seu código de verificação</span>
        </div>
        <div className={styles.codeWrapper}>
          <span className={styles.code}>{verificationCode}</span>
        </div>
        {remainingTime > 0 && (
          <div className={styles.codeTimer}>
            <BsAlarm /> 
            <span>Expira em <b>{getRemainingTime()}</b></span>
          </div>
        )}
      </div>
    );
  };

  // Função para renderizar as instruções de conexão
  const renderConnectionInstructions = () => (
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
        <span className={styles.stepText}>Envie <code>/start</code> para o bot</span>
      </div>
      <div className={styles.instructionStep}>
        <span className={styles.stepNumber}>3</span>
        <span className={styles.stepText}>Gere seu código de verificação abaixo</span>
      </div>
      <div className={styles.instructionStep}>
        <span className={styles.stepNumber}>4</span>
        <span className={styles.stepText}>Envie <code>/verificar</code> para o bot</span>
      </div>
      <div className={styles.instructionStep}>
        <span className={styles.stepNumber}>5</span>
        <span className={styles.stepText}>Quando solicitado, envie apenas o código</span>
      </div>
    </div>
  );

  // Função para renderizar as ações do usuário não conectado
  const renderUnconnectedActions = () => (
    <div className={styles.telegramActionButtons}>
      <a
        href="https://t.me/PlanejadorDasGalaxiasBot"
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.telegramButton} ${styles.openBotButton}`}
      >
        <BsTelegram size={20} /> <span>ABRIR BOT</span>
      </a>
      <button
        type="button"
        className={`${styles.telegramButton} ${styles.generateButton} ${remainingTime > 0 ? styles.waiting : ''}`}
        onClick={requestTelegramCode}
        disabled={telegramLoading || remainingTime > 0}
      >
        {telegramLoading
          ? <span className={styles.loadingText}><div className={styles.loadingDots}></div> Gerando...</span>
          : remainingTime > 0
          ? <span><BsAlarm /> Aguarde {getRemainingTime()}</span>
          : <><BsKey /> <span>GERAR CÓDIGO</span></>}
      </button>
      <button
        type="button"
        onClick={refreshUserData}
        className={styles.verifiedButton}
      >
        <BsCheckCircle size={20} /> <span>VERIFICAR STATUS</span>
      </button>
    </div>
  );

  // Função para renderizar a seção de usuário conectado
  const renderConnectedSection = () => (
    <div className={styles.telegramConnected}>
      <div className={styles.connectedHeader}>
        <BsCheckCircle size={20} className={styles.checkIcon} />
        <h3>Telegram conectado com sucesso!</h3>
      </div>

      <div className={styles.featureContainer}>
        <h4>O que você pode fazer:</h4>
        <ul className={styles.telegramFeatures}>
          <li><BsChat className={styles.featureIcon} /> <span>Registrar despesas pelo bot a qualquer momento</span></li>
          <li><BsAlarm className={styles.featureIcon} /> <span>Receber lembretes de pagamentos próximos</span></li>
          <li><BsGraphUp className={styles.featureIcon} /> <span>Consultar seu orçamento e balanço financeiro</span></li>
        </ul>
      </div>

      <div className={styles.commandsContainer}>
        <h4>Comandos disponíveis:</h4>
        <div className={styles.commands}>
          <div className={styles.command}>
            <code>/despesa</code>
            <span>Registrar uma nova despesa</span>
          </div>
          <div className={styles.command}>
            <code>/receita</code>
            <span>Registrar uma nova receita</span>
          </div>
          <div className={styles.command}>
            <code>/resumo</code>
            <span>Ver seu resumo financeiro</span>
          </div>
          <div className={styles.command}>
            <code>/help</code>
            <span>Ver todos os comandos disponíveis</span>
          </div>
          <div className={styles.command}>
            <code>/bancos</code>
            <span>Listar seus bancos ativos</span>
          </div>
        </div>
      </div>

      <div className={styles.telegramButtonGroup}>
        <button
          type="button"
          className={`${styles.telegramButton} ${styles.reconnectButton}`}
          onClick={requestTelegramCode}
          disabled={telegramLoading || remainingTime > 0}
        >
          {telegramLoading
            ? <span className={styles.loadingText}><div className={styles.loadingDots}></div> Gerando...</span>
            : remainingTime > 0
            ? <span><BsAlarm /> Aguarde {getRemainingTime()}</span>
            : <><BsArrowRepeat size={18} /> <span>RECONECTAR</span></>}
        </button>
        <button
          type="button"
          className={`${styles.telegramButton} ${styles.disconnectButton}`}
          onClick={disconnectTelegram}
          disabled={telegramLoading}
        >
          <BsX size={20} /> <span>DESCONECTAR</span>
        </button>
      </div>

      {verificationCode && (
        <div className={styles.reconnectInstructionsContainer}>
          <p className={styles.reconnectInstructions}><BsArrowRepeat /> Para reconectar, siga os passos:</p>
          <ol className={styles.reconnectSteps}>
            <li>Acesse <a href="https://t.me/PlanejadorDasGalaxiasBot" target="_blank" rel="noopener noreferrer" className={styles.botLink}>@PlanejadorDasGalaxiasBot</a></li>
            <li>Envie <code>/start</code> para o bot</li>
            <li>Envie <code>/verificar</code> para o bot</li>
            <li>Quando solicitado, envie este código: <span className={styles.inlineCode}>{verificationCode}</span></li>
          </ol>
        </div>
      )}
    </div>
  );

  // Renderizar mensagem de erro
  const renderError = () => {
    if (!telegramError) return null;
    
    return (
      <div className={styles.telegramError}>
        <BsExclamationTriangle size={18} />
        <span>{telegramError}</span>
      </div>
    );
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2><BsTelegram /> Integração Telegram</h2>
        {renderStatusBadge()}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.communicationSection}>
          <div className={styles.telegramSection}>
            {!user?.telegram_verified ? (
              <>
                <div className={styles.telegramIntro}>
                  <h3>Adicione despesas via Telegram</h3>
                  <p>Conecte sua conta ao Telegram para adicionar despesas rapidamente através do nosso bot, receber lembretes e consultar seu orçamento a qualquer momento.</p>
                </div>
                
                {renderConnectionInstructions()}
                {renderUnconnectedActions()}
                {renderError()}
                {renderVerificationCode()}
              </>
            ) : (
              <>
                {renderConnectedSection()}
                {renderError()}
                {renderVerificationCode()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramVerification; 