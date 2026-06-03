import React, { useState, useEffect } from 'react';
import styles from './AdminValidator.module.css';

interface ValidationResult {
  validation: {
    teacherId: string;
    indicatorCode: string;
    currentTier: string | null;
    indicatorTier: string;
    isTierUnlocked: boolean;
    flagCount: number;
    escalationLevel: number;
    meetsMinimumFlags: boolean;
  };
  observation: {
    id: string;
    transcription: string;
    feedback: string;
    created_at: string;
    subject: string;
  } | null;
  trainingRecommendation: {
    indicatorCode: string;
    trainingTitle: string;
    trainingLevel: string;
    trainingUrl: string;
    aiReasoning: string;
  };
  readyForTraining: boolean;
}

const indicatorOptions = [
  // Tier 1 - Structural
  { code: 'SI1', name: 'SI1 - Instructional Clarity', tier: 'Structural' },
  { code: 'SI2', name: 'SI2 - Logical Flow', tier: 'Structural' },
  { code: 'SI3', name: 'SI3 - Subject Content Accuracy', tier: 'Structural' },
  // Tier 2 - Core
  { code: 'PIC-1', name: 'PIC-1 - Activities & Tasks Alignment', tier: 'Core' },
  { code: 'PIC-2', name: 'PIC-2 - Use of Academic Language', tier: 'Core' },
  { code: 'PIC-3', name: 'PIC-3 - Understanding Student Misconceptions', tier: 'Core' },
  { code: 'PIC-4', name: 'PIC-4 - Quality Questioning', tier: 'Core' },
  { code: 'PIC-5', name: 'PIC-5 - Effective Feedback', tier: 'Core' },
  // Tier 3 - Advanced
  { code: 'PIA-1', name: 'PIA-1 - Prior Knowledge Activation', tier: 'Advanced' },
  { code: 'PIA-2', name: 'PIA-2 - Meaningful Connections', tier: 'Advanced' },
  { code: 'PIA-3', name: 'PIA-3 - Catering to Learning Levels', tier: 'Advanced' },
  { code: 'PIA-4', name: 'PIA-4 - Responsive Re-explanation', tier: 'Advanced' },
  { code: 'PIA-5', name: 'PIA-5 - Student Agency & Participation', tier: 'Advanced' },
  { code: 'MA-0', name: 'MA-0 - Instructional Model Structure (GRR)', tier: 'Advanced' },
  // Tier 4 - Subject-Specific
  { code: 'M1', name: 'M1 - Mathematical Discourse & Reasoning', tier: 'Subject-Specific' },
  { code: 'M2', name: 'M2 - Problem-Solving & Productive Struggle', tier: 'Subject-Specific' },
  { code: 'L1', name: 'L1 - Explicit Phonics / Decoding', tier: 'Subject-Specific' },
  { code: 'L2', name: 'L2 - Comprehension Strategy Instruction', tier: 'Subject-Specific' },
  { code: 'L3', name: 'L3 - Reading-Writing Connections', tier: 'Subject-Specific' },
  { code: 'S1', name: 'S1 - Inquiry-Based Approach', tier: 'Subject-Specific' },
  { code: 'S2', name: 'S2 - Science Talk & Student Sense-Making', tier: 'Subject-Specific' },
];

const testTeachers = ['12711', '12710', '4534', '4582', '12712', '1882'];

export const AdminValidator: React.FC = () => {
  const [teacherId, setTeacherId] = useState('12711');
  const [indicatorCode, setIndicatorCode] = useState('SI1');
  const [allTeachers, setAllTeachers] = useState<string[]>(testTeachers);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all available teachers
    fetch('http://localhost:3001/api/admin/all-teachers')
      .then(res => res.json())
      .then(teachers => setAllTeachers(teachers || testTeachers))
      .catch(() => setAllTeachers(testTeachers));
  }, []);

  const handleValidate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get flagged indicators
      const flagsResponse = await fetch(
        `http://localhost:3001/api/teacher/${teacherId}/flagged-indicators`
      );
      const flags = await flagsResponse.json();
      const flagged = flags.find((f: any) => f.indicator_code === indicatorCode);

      // Get observation and training
      const [obsResponse, trainResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/teacher/${teacherId}/indicator/${indicatorCode}/observation`),
        fetch(`http://localhost:3001/api/indicator/${indicatorCode}/training?teacherId=${teacherId}`)
      ]);

      const observation = await obsResponse.json();
      const training = await trainResponse.json();

      setResult({
        validation: {
          teacherId,
          indicatorCode,
          currentTier: 'Not available',
          indicatorTier: 'See below',
          isTierUnlocked: !!flagged,
          flagCount: flagged?.flag_count || 0,
          escalationLevel: flagged?.escalation_level || 0,
          meetsMinimumFlags: (flagged?.flag_count || 0) >= 2
        },
        observation: {
          id: observation.id,
          transcription: observation.transcription?.substring(0, 100) || '',
          feedback: observation.feedback_english?.substring(0, 200) || '',
          created_at: observation.created_at,
          subject: observation.subject
        },
        trainingRecommendation: {
          indicatorCode,
          trainingTitle: training.resources?.[0]?.title || 'No training',
          trainingLevel: training.resources?.[0]?.level || 'N/A',
          trainingUrl: training.resources?.[0]?.url || '',
          aiReasoning: 'AI matched based on teacher feedback analysis'
        },
        readyForTraining: (flagged?.flag_count || 0) >= 2
      } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error validating training');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🔧 Admin Training Validator</h2>
        <p>Test the training flow for any teacher, indicator, and scenario</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Select Teacher:</label>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            {allTeachers.map(id => (
              <option key={id} value={id}>
                Teacher {id}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>Select Indicator:</label>
          <select value={indicatorCode} onChange={e => setIndicatorCode(e.target.value)}>
            {indicatorOptions.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.name} ({opt.tier})
              </option>
            ))}
          </select>
        </div>

        <button className={styles.validateBtn} onClick={handleValidate} disabled={loading}>
          {loading ? '⏳ Validating...' : '✅ Validate Training Flow'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className={styles.results}>
          <div className={styles.section}>
            <h3>📊 Validation Status</h3>
            <div className={styles.grid}>
              <div className={styles.item}>
                <span>Teacher ID:</span>
                <strong>{result.validation.teacherId}</strong>
              </div>
              <div className={styles.item}>
                <span>Indicator:</span>
                <strong>{result.validation.indicatorCode}</strong>
              </div>
              <div className={styles.item}>
                <span>Current Tier:</span>
                <strong>{result.validation.currentTier || 'Not Set'}</strong>
              </div>
              <div className={styles.item}>
                <span>Indicator Tier:</span>
                <strong>{result.validation.indicatorTier}</strong>
              </div>
              <div className={styles.item}>
                <span>Tier Unlocked:</span>
                <strong className={result.validation.isTierUnlocked ? styles.success : styles.error}>
                  {result.validation.isTierUnlocked ? '✅ YES' : '❌ NO'}
                </strong>
              </div>
              <div className={styles.item}>
                <span>Flag Count:</span>
                <strong>{result.validation.flagCount}/2+</strong>
              </div>
              <div className={styles.item}>
                <span>Meets Min Flags:</span>
                <strong className={result.validation.meetsMinimumFlags ? styles.success : styles.error}>
                  {result.validation.meetsMinimumFlags ? '✅ YES' : '❌ NO'}
                </strong>
              </div>
              <div className={styles.item}>
                <span>Ready for Training:</span>
                <strong className={result.readyForTraining ? styles.success : styles.error}>
                  {result.readyForTraining ? '✅ YES' : '❌ NO'}
                </strong>
              </div>
            </div>
          </div>

          {result.observation && (
            <div className={styles.section}>
              <h3>📝 Observation & Feedback</h3>
              <div className={styles.content}>
                <p>
                  <strong>Subject:</strong> {result.observation.subject}
                </p>
                <p>
                  <strong>Date:</strong> {new Date(result.observation.created_at).toLocaleDateString()}
                </p>
                <p>
                  <strong>Transcription:</strong>
                  <br />
                  <em>{result.observation.transcription}</em>
                </p>
                <p>
                  <strong>Feedback:</strong>
                  <br />
                  <em>{result.observation.feedback}...</em>
                </p>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3>🎯 AI Training Recommendation</h3>
            <div className={styles.content}>
              <p>
                <strong>Training:</strong> {result.trainingRecommendation.trainingTitle}
              </p>
              <p>
                <strong>Level:</strong> {result.trainingRecommendation.trainingLevel || 'N/A'}
              </p>
              <p>
                <strong>AI Reasoning:</strong>
                <br />
                <em>{result.trainingRecommendation.aiReasoning}</em>
              </p>
              {result.trainingRecommendation.trainingUrl && (
                <p>
                  <a href={result.trainingRecommendation.trainingUrl} target="_blank" rel="noopener noreferrer">
                    📺 View Training Video
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className={`${styles.section} ${result.readyForTraining ? styles.readyBox : styles.notReadyBox}`}>
            <h3>{result.readyForTraining ? '✅ Ready for Training' : '⚠️ Not Ready'}</h3>
            <p>
              {result.readyForTraining
                ? 'This teacher/indicator combination is ready for the full training flow!'
                : 'This combination does not meet the requirements for training. Check tier status and flag count.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
