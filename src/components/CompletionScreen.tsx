import React from 'react';
import { IndicatorCode } from '../types/index';
import styles from './CompletionScreen.module.css';

interface CompletionScreenProps {
  indicatorCode: IndicatorCode;
  onClose: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  indicatorCode,
  onClose,
}) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <div className={styles.celebration}>
            <div className={styles.icon}>🎉</div>
            <h2>Thank You!</h2>
          </div>

          <p className={styles.message}>
            You've completed 2 practice questions for <strong>{indicatorCode}</strong>.
          </p>

          <div className={styles.summary}>
            <h3>What You Learned:</h3>
            <ul>
              <li>How to apply this indicator in your teaching</li>
              <li>What high-quality implementation looks like</li>
              <li>How to evaluate your own practice</li>
            </ul>
          </div>

          <p className={styles.nextSteps}>
            Keep practicing these skills in your lessons. Your next recording will show your progress!
          </p>

          <button className={styles.closeBtn} onClick={onClose}>
            Close Practice & Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
