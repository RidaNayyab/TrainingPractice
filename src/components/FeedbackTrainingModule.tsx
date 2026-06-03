import React, { useState, useEffect } from 'react';
import { IndicatorCode } from '../types/index';
import { apiService, Observation } from '../services/api';
import { TrainingVideo } from './TrainingVideo';
import { PracticeFlow } from './PracticeFlow';
import { CompletionScreen } from './CompletionScreen';
import styles from './FeedbackTrainingModule.module.css';

interface FeedbackTrainingModuleProps {
  teacherId: string;
  indicatorCode: IndicatorCode;
  onClose?: () => void;
}

type ModuleState = 'feedback' | 'training' | 'practice' | 'completion';

export const FeedbackTrainingModule: React.FC<FeedbackTrainingModuleProps> = ({
  teacherId,
  indicatorCode,
  onClose,
}) => {
  const [state, setState] = useState<ModuleState>('feedback');
  const [loading, setLoading] = useState(true);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [training, setTraining] = useState<any>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [obs, train, questions] = await Promise.all([
          apiService.getObservation(teacherId),
          apiService.getTraining(indicatorCode, teacherId),
          apiService.getPracticeQuestions(indicatorCode),
        ]);
        setObservation(obs);
        setTraining(train);
        setPracticeQuestions(questions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teacherId, indicatorCode]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <p>Loading feedback and resources...</p>
        </div>
      </div>
    );
  }

  // Validate that the observation contains the indicator
  const hasIndicatorInObservation = observation && (
    (observation.improvement_areas?.some(a => a.indicator_code === indicatorCode)) ||
    (observation.results_json && (
      (observation.results_json.section_b?.[indicatorCode] === 'NO') ||
      (observation.results_json.section_c?.[indicatorCode] === 'NO')
    ))
  );

  if (error || !observation) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h3>⚠️ Error</h3>
          <p>{error || 'Failed to load observation data'}</p>
          {onClose && <button onClick={onClose}>Close</button>}
        </div>
      </div>
    );
  }

  if (!hasIndicatorInObservation) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h3>⚠️ Indicator Not Found</h3>
          <p>This observation does not contain feedback about {indicatorCode}. Please select a different observation that highlights this improvement area.</p>
          {onClose && <button onClick={onClose}>← Back to Selection</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {onClose && (
        <div className={styles.topNav}>
          <button className={styles.closeBtn} onClick={onClose}>
            ← Back to Selection
          </button>
        </div>
      )}
      {state === 'feedback' && (
        <div className={styles.feedbackSection}>
          <div className={styles.header}>
            <h2>Your Feedback - {indicatorCode}</h2>
            <p className={styles.subtitle}>Flagged 3+ times - Let's improve together</p>
          </div>

          <div className={styles.feedbackContent}>
            <div className={styles.transcription}>
              <h3>Lesson Recording Notes</h3>
              <p>{observation.transcription?.substring(0, 500)}...</p>
            </div>

            <div className={styles.feedback}>
              <h3>Personalized Feedback</h3>
              <p>{observation.feedback_english}</p>
            </div>

            {observation.improvement_areas && observation.improvement_areas.length > 0 && (
              <div className={styles.improvementAreas}>
                <h3>Focus Areas</h3>
                <ul>
                  {observation.improvement_areas.map((area) => (
                    <li key={area.indicator_code}>
                      <strong>{area.indicator_name}</strong>
                      <span className={styles.score}>{area.score}</span>
                      <p>Priority: {area.priority} | Level: {area.escalation_level}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              onClick={() => setState('training')}
            >
              View Training Resources →
            </button>
            {onClose && (
              <button className={styles.secondaryBtn} onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'training' && training && (
        <TrainingVideo
          indicatorCode={indicatorCode}
          teacherId={teacherId}
          resourceIndex={training.currentResourceIndex ?? 0}
          totalResources={training.totalResources ?? 1}
          onPracticeClick={async () => {
            // Mark current training as complete before moving to practice
            try {
              await apiService.completeTraining(teacherId, indicatorCode, training.currentResourceIndex ?? 0);
            } catch (err) {
              console.error('Failed to mark training complete:', err);
            }
            setState('practice');
          }}
          onBack={() => setState('feedback')}
          training={training}
          allCompleted={training.allCompleted}
        />
      )}

      {state === 'practice' && (
        <PracticeFlow
          indicatorCode={indicatorCode}
          questions={practiceQuestions}
          onComplete={async () => {
            // Fetch next training to see if there are more
            try {
              const nextTraining = await apiService.getTraining(indicatorCode, teacherId);
              if (nextTraining.allCompleted) {
                setState('completion');
              } else {
                // Show next training instead
                setTraining(nextTraining);
                setState('training');
              }
            } catch {
              setState('completion');
            }
          }}
        />
      )}

      {state === 'completion' && (
        <CompletionScreen
          indicatorCode={indicatorCode}
          onClose={() => onClose?.()}
        />
      )}
    </div>
  );
};
