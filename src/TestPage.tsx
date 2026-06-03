import React, { useState, useEffect } from 'react';
import { FeedbackTrainingModule } from './components/FeedbackTrainingModule';
import './TestPage.css';

interface Observation {
  id: string;
  transcription: string;
  created_at: string;
  feedback_english: string;
}

interface FlaggedIndicator {
  indicator_code: string;
  flag_count: number;
  escalation_level: number;
}

export default function TestPage() {

  // Teacher View state
  const [selectedTeacher, setSelectedTeacher] = useState('12711');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [flaggedIndicators, setFlaggedIndicators] = useState<FlaggedIndicator[]>([]);
  const [highestPriorityIndicator, setHighestPriorityIndicator] = useState<string | null>(null);
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [showTrainingModule, setShowTrainingModule] = useState(false);

  // Fetch all teachers with observations from database
  useEffect(() => {
    fetch('http://localhost:3001/api/teachers-with-observations')
      .then(res => res.json())
      .then(teachers => setAllTeachers(teachers))
      .catch(err => {
        console.error('Failed to fetch teachers:', err);
        setAllTeachers(['12711']); // fallback
      });
  }, []);

  // Load observations and flagged indicators when teacher changes
  useEffect(() => {
    if (!selectedTeacher) return;

    setLoadingObservations(true);
    Promise.all([
      fetch(`http://localhost:3001/api/teacher/${selectedTeacher}/flagged-indicators`),
      fetch(`http://localhost:3001/api/teacher/${selectedTeacher}/observations`)
    ])
      .then(async ([flagsRes, obsRes]) => {
        const flags = await flagsRes.json();
        const obs = await obsRes.json();

        // Get flagged indicators with 2+ flags
        const flagged = flags.filter((f: any) => f.flag_count >= 2);
        setFlaggedIndicators(flagged);

        // Set all observations for this teacher
        if (Array.isArray(obs)) {
          setObservations(obs);
        } else if (obs && obs.id) {
          setObservations([obs]);
        }
      })
      .catch(() => setObservations([]))
      .finally(() => setLoadingObservations(false));
  }, [selectedTeacher]);

  const handleSelectObservation = (obs: Observation) => {
    setSelectedObservation(obs);

    // Find highest priority flagged indicator from this observation
    if (flaggedIndicators.length > 0) {
      // Sort by priority (lower rank = higher priority), then by flag count (descending)
      const sorted = [...flaggedIndicators].sort(
        (a, b) => a.priority - b.priority || b.flag_count - a.flag_count
      );
      setHighestPriorityIndicator(sorted[0].indicator_code);
    }
  };

  const handleStartTraining = () => {
    if (selectedObservation && highestPriorityIndicator) {
      setShowTrainingModule(true);
    }
  };

  return (
    <div className="test-page">
      <header className="test-header">
        <h1>👨‍🏫 Digital Coach - Teacher Training</h1>
        <p>Select observations, start training, practice questions & feedback</p>
      </header>

      {!showTrainingModule && (
        <div className="test-controls">
          <div className="teacher-view">
            <h2>👨‍🏫 Teacher View</h2>
            <p>Select your teacher profile to view observations and feedback</p>

            <div className="teacher-selector-group">
              <label>Select your teacher:</label>
              <select
                value={selectedTeacher}
                onChange={(e) => {
                  setSelectedTeacher(e.target.value);
                  setSelectedObservation(null);
                }}
                className="teacher-dropdown"
              >
                {allTeachers.map(id => (
                  <option key={id} value={id}>
                    Teacher {id}
                  </option>
                ))}
              </select>
            </div>

            {loadingObservations ? (
              <p className="loading">Loading your observations...</p>
            ) : (
              <>
                <div className="observations-section">
                  <h3>Your Recent Observations ({observations.length})</h3>
                  {observations.length > 0 ? (
                    <div className="observations-list">
                      {observations.map((obs) => (
                        <div
                          key={obs.id}
                          className={`observation-card ${
                            selectedObservation?.id === obs.id ? 'selected' : ''
                          }`}
                          onClick={() => handleSelectObservation(obs)}
                        >
                          <div className="obs-date">
                            {new Date(obs.created_at).toLocaleDateString()}
                          </div>
                          <div className="obs-snippet">
                            {obs.transcription?.substring(0, 80)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">No observations found for this teacher</p>
                  )}
                </div>

                {selectedObservation && (
                  <div className="feedback-section">
                    <h3>📝 Your Feedback</h3>
                    <div className="feedback-content">
                      <p className="transcription">
                        <strong>Lesson Recording:</strong>
                        <br />
                        "{selectedObservation.transcription}"
                      </p>
                      <p className="feedback">
                        <strong>Coaching Feedback:</strong>
                        <br />
                        {selectedObservation.feedback_english}
                      </p>

                      {highestPriorityIndicator && flaggedIndicators.length > 0 && (
                        <div className="flagged-indicator">
                          <h4>🎯 Focus Area (Flagged {flaggedIndicators[0]?.flag_count}+ times)</h4>
                          <div className="indicator-badge">
                            {highestPriorityIndicator}
                          </div>
                          <p className="escalation">
                            Escalation Level: {flaggedIndicators[0]?.escalation_level}/5
                          </p>
                          <button
                            className="start-training-btn"
                            onClick={handleStartTraining}
                          >
                            📚 Start Training for {highestPriorityIndicator}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showTrainingModule && selectedObservation && highestPriorityIndicator && (
        <div className="module-container">
          <button
            className="back-btn"
            onClick={() => setShowTrainingModule(false)}
          >
            ← Back to Observations
          </button>
          <FeedbackTrainingModule
            teacherId={selectedTeacher}
            indicatorCode={highestPriorityIndicator as any}
            onClose={() => setShowTrainingModule(false)}
          />
        </div>
      )}
    </div>
  );
}
