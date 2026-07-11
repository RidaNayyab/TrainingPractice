import React, { useState, useEffect } from 'react';
import { IndicatorCode } from '../types/index';
import { apiService, Observation } from '../services/api';
import { TrainingVideo } from './TrainingVideo';
import { PracticeFlow } from './PracticeFlow';
import { SimulationFlow } from './SimulationFlow';
import { CompletionScreen } from './CompletionScreen';
import simulationsData from '../data/simulations.json';
import styles from './FeedbackTrainingModule.module.css';

// Indicator name mapping
const indicatorNames: Record<string, string> = {
  'SI1': 'Instructional Clarity',
  'SI2': 'Logical Flow',
  'SI3': 'Subject Content Accuracy',
  'PIC-1': 'Activities & Tasks Alignment',
  'PIC-3': 'Understanding Student Misconceptions',
  'PIC-4': 'Quality Questioning',
  'PIA-3': 'Catering to Learning Levels',
  'PIA-4': 'Responsive Re-explanation',
  'M1': 'Mathematical Discourse & Reasoning',
  'L1': 'Explicit Phonics / Decoding',
  'S1': 'Inquiry-Based Approach',
};

interface FeedbackTrainingModuleProps {
  teacherId: string;
  indicatorCode: IndicatorCode;
  observationId?: string;   // NEW — pins matcher + rendered feedback to this specific observation
  onClose?: () => void;
}

type ModuleState = 'feedback' | 'training' | 'practice' | 'completion';
type PracticeMode = null | 'scenario' | 'roleplay';

export const FeedbackTrainingModule: React.FC<FeedbackTrainingModuleProps> = ({
  teacherId,
  indicatorCode,
  observationId,
  onClose,
}) => {
  const [state, setState] = useState<ModuleState>('feedback');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(null);
  const [loading, setLoading] = useState(true);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [training, setTraining] = useState<any>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get indicator name from mapping
  const indicatorName = indicatorNames[indicatorCode] || indicatorCode;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // If observationId is provided (new landing-page flow), load THAT specific observation
        // from NIETE and pin the matcher's feedback lookup to it. Falls back to most-recent
        // observation (legacy Railway flow) when observationId is absent.
        const obsUrl = observationId
          ? `http://localhost:3001/api/niete/observation/${encodeURIComponent(observationId)}`
          : null;
        const trainUrl = observationId
          ? `http://localhost:3001/api/training/${encodeURIComponent(indicatorCode)}/for-teacher/${encodeURIComponent(teacherId)}?observationId=${encodeURIComponent(observationId)}`
          : `http://localhost:3001/api/training/${encodeURIComponent(indicatorCode)}/for-teacher/${encodeURIComponent(teacherId)}`;

        const [obs, train] = await Promise.all([
          obsUrl
            ? fetch(obsUrl).then(r => r.json())
            : apiService.getObservation(teacherId),
          fetch(trainUrl).then(r => r.json()),
        ]);
        setObservation(obs);
        setTraining(train);
        const trainingCode = train?.selectedResource?.code;
        const questions = await apiService.getPracticeQuestions(indicatorCode, trainingCode);
        setPracticeQuestions(questions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teacherId, indicatorCode, observationId]);

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
            <h2>Your Feedback - {indicatorName}</h2>
            <p className={styles.subtitle}>Focus Area: {indicatorName}</p>
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
                <h3>Focus Area</h3>
                <ul>
                  {observation.improvement_areas
                    .filter((area) => area.indicator_code === indicatorCode)
                    .map((area) => (
                      <li key={area.indicator_code}>
                        <strong>{area.indicator_name}</strong>
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
              Start Training →
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
          onBack={onClose}
          training={training}
          allCompleted={training.allCompleted}
        />
      )}

      {state === 'practice' && practiceMode === null && (() => {
        const hasGeneratedQuestions = Array.isArray(practiceQuestions) && practiceQuestions.length > 0;
        return (
          <div className={styles.practiceChoice}>
            <div className={styles.header}>
              <h2>Choose your practice mode</h2>
              <p className={styles.subtitle}>Both practice the same skill from your training — pick the format that fits you today.</p>
            </div>
            <div className={styles.choiceGrid}>
              <button
                className={styles.choiceCard}
                onClick={() => setPracticeMode('scenario')}
                disabled={!hasGeneratedQuestions}
              >
                <div className={styles.choiceIcon}>📝</div>
                <h3>Scenario Questions</h3>
                <p>Two short classroom scenarios. Read, write your response, get a coaching nudge. One after the other.</p>
                <span className={styles.choiceMeta}>{hasGeneratedQuestions ? `${practiceQuestions.length} questions ready` : 'No questions available'}</span>
              </button>

              <button
                className={styles.choiceCard}
                onClick={() => setPracticeMode('roleplay')}
              >
                <div className={styles.choiceIcon}>🎭</div>
                <h3>Roleplay</h3>
                <p>An AI student talks to you. You reply as the teacher. Up to 3 turns of dynamic back-and-forth shaped by your responses.</p>
                <span className={styles.choiceMeta}>Fresh scene every session</span>
              </button>
            </div>
          </div>
        );
      })()}

      {state === 'practice' && practiceMode === 'scenario' && (
        <PracticeFlow
          indicatorCode={indicatorCode}
          questions={practiceQuestions}
          teacherId={teacherId}
          trainingCode={training?.selectedResource?.code}
          onComplete={() => onClose?.()}
        />
      )}

      {state === 'practice' && practiceMode === 'roleplay' && (
        <SimulationFlow
          indicatorCode={indicatorCode}
          teacherId={teacherId}
          trainingCode={training?.selectedResource?.code}
          onComplete={() => onClose?.()}
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
