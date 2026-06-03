import React from 'react';
import { IndicatorCode, EscalationTier } from '../types/index';
import { feedbackMessages, indicatorRubrics } from '../data/mockData';
import styles from './FeedbackDisplay.module.css';

interface FeedbackDisplayProps {
  escalationTiers: Record<IndicatorCode, EscalationTier>;
  triggeredIndicator?: IndicatorCode;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  escalationTiers,
  triggeredIndicator,
}) => {
  const flaggedIndicators = (
    Object.entries(escalationTiers) as [IndicatorCode, EscalationTier][]
  ).filter(([_, tier]) => tier >= 1 && tier <= 4);

  if (flaggedIndicators.length === 0) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successMessage}>
          <h2>🎉 Great Job!</h2>
          <p>
            All your indicators are strong. Keep maintaining these excellent
            teaching practices!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2>Your Feedback</h2>

      {triggeredIndicator && (
        <div className={styles.alert}>
          <p>
            <strong>⚠️ New Coaching Alert:</strong> The <strong>{triggeredIndicator}</strong> indicator
            needs attention. Training and practice are available below.
          </p>
        </div>
      )}

      <div className={styles.feedbackCards}>
        {flaggedIndicators.map(([code, tier]) => {
          const rubric = indicatorRubrics.find((r) => r.code === code);
          const indicatorFeedback = feedbackMessages.byIndicator[code as IndicatorCode] as any;
          const feedback = indicatorFeedback?.[tier] || '';
          const escalationMsg = feedbackMessages.escalation[tier as EscalationTier];
          const studentImpact = indicatorFeedback?.[`${code}_feedback`] || '';

          return (
            <div key={code} className={`${styles.card} ${styles[`tier${tier}`]}`}>
              <div className={styles.cardHeader}>
                <h3>{rubric?.name}</h3>
                <span className={styles.tier}>Tier {tier}</span>
              </div>

              <div className={styles.escalationLabel}>
                <p className={styles.tone}>{escalationMsg.tone.toUpperCase()}</p>
                <p className={styles.prefix}>{escalationMsg.prefix}</p>
              </div>

              <div className={styles.feedbackContent}>
                <p>{feedback}</p>
              </div>

              {studentImpact && (
                <div className={styles.studentImpact}>
                  <strong>Why this matters:</strong>
                  <p>{studentImpact}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
