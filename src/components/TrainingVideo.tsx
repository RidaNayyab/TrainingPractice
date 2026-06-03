import React from 'react';
import { IndicatorCode } from '../types/index';
import { indicatorTrainings, indicatorRubrics } from '../data/mockData';
import { TrainingResource } from '../services/api';
import styles from './TrainingVideo.module.css';

interface TrainingVideoProps {
  indicatorCode: IndicatorCode;
  onPracticeClick: (indicatorCode: IndicatorCode) => void;
  onBack?: () => void;
  training?: TrainingResource;
  teacherId?: string;
  resourceIndex?: number;
  totalResources?: number;
  allCompleted?: boolean;
}

export const TrainingVideo: React.FC<TrainingVideoProps> = ({
  indicatorCode,
  onPracticeClick,
  onBack,
  training: trainingProp,
  resourceIndex = 0,
  totalResources = 1,
}) => {
  const training = trainingProp || indicatorTrainings.find((t) => t.indicatorCode === indicatorCode);
  const rubric = indicatorRubrics.find((r) => r.code === indicatorCode);

  if (!training && !rubric) {
    return null;
  }

  const trainingName = trainingProp?.name || rubric?.name || 'Training';
  const trainingDesc = trainingProp?.description || rubric?.description || '';

  // Use AI-selected resource if available, otherwise fallback to first resource
  const selectedResource = trainingProp?.selectedResource;
  const mainVideoUrl = selectedResource?.url || trainingProp?.videoUrl || null;
  const currentTitle = selectedResource?.title || 'Training Video';
  const isS3Video = mainVideoUrl?.includes('.mp4');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h2>Training for {trainingName}</h2>
            {totalResources > 1 && (
              <p style={{ color: '#7f8c8d', fontSize: '0.9em', margin: '4px 0 0 0' }}>
                Training {resourceIndex + 1} of {totalResources}
              </p>
            )}
          </div>
          <span className={styles.badge}>{indicatorCode}</span>
        </div>

        <p className={styles.description}>{trainingDesc}</p>

        <div className={styles.videoTitle}>
          Now Playing: <strong>{currentTitle}</strong>
        </div>

        <div className={styles.videoPlaceholder}>
          {isS3Video ? (
            <video
              key={mainVideoUrl}
              width="100%"
              height="400"
              controls
              style={{ backgroundColor: '#000' }}
            >
              <source src={mainVideoUrl!} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              key={mainVideoUrl}
              width="100%"
              height="400"
              src={mainVideoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
              title="Training Video"
              style={{ border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
        </div>

<div className={styles.actions}>
          <button
            className={styles.practiceBtn}
            onClick={() => onPracticeClick(indicatorCode)}
          >
            Start Practice Questions
          </button>
          {onBack && (
            <button
              className={styles.backBtn}
              onClick={onBack}
            >
              ← Back to Feedback
            </button>
          )}
          <p className={styles.hint}>
            Complete 2 practice questions to deepen your mastery
          </p>
        </div>
      </div>
    </div>
  );
};
