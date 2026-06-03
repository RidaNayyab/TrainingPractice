import React from 'react';
import { IndicatorCode, ScoreValue } from '../types/index';
import { indicatorRubrics } from '../data/mockData';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  scores: Record<IndicatorCode, ScoreValue>;
  consecutiveLowScores: Record<IndicatorCode, number>;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  scores,
  consecutiveLowScores,
}) => {
  const getScoreColor = (score: ScoreValue): string => {
    if (score === 1) return 'green';
    if (score === 0.5) return 'orange';
    return 'red';
  };

  const getScoreLabel = (score: ScoreValue): string => {
    if (score === 1) return 'Yes (1)';
    if (score === 0.5) return 'Partial (0.5)';
    return 'No (0)';
  };

  const getScoreText = (
    rubric: typeof indicatorRubrics[0],
    score: ScoreValue
  ): string => {
    if (score === 1) return rubric.yesPoint;
    if (score === 0.5) return rubric.partialPoint;
    return rubric.noPoint;
  };

  return (
    <div className={styles.container}>
      <h2>Lesson Scores</h2>
      <div className={styles.scoresGrid}>
        {indicatorRubrics.map((rubric) => {
          const score = scores[rubric.code];
          const consecutiveCount = consecutiveLowScores[rubric.code] || 0;
          const isLow = score < 1;
          const color = getScoreColor(score);

          return (
            <div key={rubric.code} className={styles.scoreCard}>
              <div className={styles.header}>
                <h3>{rubric.code}</h3>
                <span className={styles.name}>{rubric.name}</span>
              </div>

              <p className={styles.description}>{rubric.description}</p>

              <div className={`${styles.scoreValue} ${styles[color]}`}>
                <span className={styles.score}>{score}</span>
                <span className={styles.label}>{getScoreLabel(score)}</span>
              </div>

              <div className={styles.evidence}>
                <strong>Evidence:</strong>
                <p>{getScoreText(rubric, score)}</p>
              </div>

              {isLow && consecutiveCount > 0 && (
                <div className={styles.escalation}>
                  <p>
                    <strong>
                      Consecutive Low Scores: {consecutiveCount}/3
                    </strong>
                  </p>
                  <div className={styles.escalationBar}>
                    <div
                      className={styles.escalationFill}
                      style={{ width: `${(consecutiveCount / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
