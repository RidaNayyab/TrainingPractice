import React, { useState, useRef } from 'react';
import { apiService } from '../services/api';
import simulationsData from '../data/simulations.json';
import { IndicatorCode } from '../types/index';
import styles from './SimulationFlow.module.css';

interface ConversationMessage {
  role: 'student' | 'teacher';
  message: string;
}

interface SimulationFlowProps {
  indicatorCode: IndicatorCode;
  onComplete: () => void;
}

export const SimulationFlow: React.FC<SimulationFlowProps> = ({
  indicatorCode,
  onComplete,
}) => {
  const simulation = (simulationsData as any)[indicatorCode];

  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([
    { role: 'student', message: simulation.initialStudentMessage },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [turnNumber, setTurnNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenarioCollapsed, setScenarioCollapsed] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [conversationHistory, isLoading]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstart = () => setIsRecording(true);
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setError(null);

      // Upload audio
      const uploadResponse = await fetch('http://localhost:3001/api/upload-audio', {
        method: 'POST',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { fileId } = await uploadResponse.json();

      // Create transcription job
      const transcribeResponse = await fetch('http://localhost:3001/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Failed to start transcription');
      }

      const { transcriptionId } = await transcribeResponse.json();

      // Poll for transcription
      let transcript = '';
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(
          `http://localhost:3001/api/transcription/${transcriptionId}/status`
        );
        const { status } = await statusResponse.json();

        if (status === 'completed') {
          const transcriptResponse = await fetch(
            `http://localhost:3001/api/transcription/${transcriptionId}/transcript`
          );
          const { transcript: transcribedText } = await transcriptResponse.json();
          transcript = transcribedText;
          break;
        }

        if (status === 'error') {
          throw new Error('Transcription failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!transcript) {
        throw new Error('Transcription timeout');
      }

      setCurrentInput(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio processing failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentInput.trim() || isLoading) return;

    const teacherMessage = currentInput.trim();
    setCurrentInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Add teacher message to history
      const updatedHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'teacher', message: teacherMessage },
      ];
      setConversationHistory(updatedHistory);

      // Get AI student response and evaluation if final turn
      const response = await fetch('http://localhost:3001/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorCode,
          conversationHistory: updatedHistory,
          turnNumber,
          maxTurns: simulation.maxTurns,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get student response');
      }

      const data = await response.json();

      // Add student response
      setConversationHistory((prev) => [
        ...prev,
        { role: 'student', message: data.studentMessage },
      ]);

      if (data.isComplete && data.evaluation) {
        setEvaluation(data.evaluation);
      } else {
        setTurnNumber(turnNumber + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue conversation');
      setConversationHistory((prev) => prev.slice(0, -1)); // Remove the message we just added
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = evaluation !== null;
  const canSubmit = currentInput.trim().length > 0 && !isLoading && !isRecording;

  return (
    <div className={styles.simulationFlow}>
      {/* Scenario Card */}
      {!scenarioCollapsed && (
        <div className={styles.scenarioCard}>
          <div className={styles.scenarioHeader}>
            <h3>{simulation.title}</h3>
            <button
              className={styles.collapseBtn}
              onClick={() => setScenarioCollapsed(true)}
            >
              ×
            </button>
          </div>
          <div className={styles.scenarioContent}>
            <p className={styles.setup}>{simulation.setup}</p>
            <div className={styles.focus}>
              <strong>Focus:</strong> {simulation.indicatorFocus}
            </div>
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {!isComplete && (
        <div className={styles.turnIndicator}>
          Turn {turnNumber} of {simulation.maxTurns}
        </div>
      )}

      {/* Chat Container */}
      <div className={styles.chatContainer}>
        {conversationHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.messageBubble} ${styles[msg.role]}`}
          >
            {msg.role === 'student' && <span className={styles.speaker}>🧑‍🎓 Student</span>}
            {msg.role === 'teacher' && <span className={styles.speaker}>👨‍🏫 You</span>}
            <p className={styles.messageText}>{msg.message}</p>
          </div>
        ))}

        {isLoading && (
          <div className={styles.messageBubble + ' ' + styles.student}>
            <span className={styles.speaker}>🧑‍🎓 Student</span>
            <p className={styles.messageText}>
              <span className={styles.typing}>thinking...</span>
            </p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Evaluation */}
      {isComplete && evaluation && (
        <div className={styles.evaluationCard}>
          <h4>Session Evaluation</h4>
          <div className={`${styles.scoreSection} ${styles[evaluation.score.toLowerCase()]}`}>
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>{evaluation.score}</span>
          </div>
          <div className={styles.feedback}>
            <p>{evaluation.feedback}</p>
          </div>
          {evaluation.rubric_criteria_met && evaluation.rubric_criteria_met.length > 0 && (
            <div className={styles.criteria}>
              <h5>✅ Well Done:</h5>
              <ul>
                {evaluation.rubric_criteria_met.map((criterion: string, i: number) => (
                  <li key={i}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.rubric_criteria_missed &&
            evaluation.rubric_criteria_missed.length > 0 && (
              <div className={styles.criteria}>
                <h5>💡 Next Time:</h5>
                <ul>
                  {evaluation.rubric_criteria_missed.map((criterion: string, i: number) => (
                    <li key={i}>{criterion}</li>
                  ))}
                </ul>
              </div>
            )}
          <button className={styles.finishBtn} onClick={onComplete}>
            ← Back to Observations
          </button>
        </div>
      )}

      {/* Input Area */}
      {!isComplete && (
        <div className={styles.inputArea}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.inputContainer}>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your response..."
              className={styles.textarea}
              rows={2}
              disabled={isLoading || isRecording}
            />
            <button
              className={`${styles.recordBtn} ${isRecording ? styles.recording : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              title="Record audio response"
            >
              {isRecording ? '⏹️ Stop' : '🎤'}
            </button>
          </div>

          {isTranscribing && <p className={styles.status}>🔄 Transcribing...</p>}

          <div className={styles.buttonGroup}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmitResponse}
              disabled={!canSubmit}
            >
              {isLoading ? '⏳ Waiting...' : 'Send Response →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
