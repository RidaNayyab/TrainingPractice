import React, { useState, useRef, useEffect } from 'react';
import { IndicatorCode } from '../types/index';
import styles from './SimulationFlow.module.css';

// Roleplay flow driven by the prompt template at .claude/context/roleplay_prompt.md.
// The AI acts as the STUDENT in a Pakistani government-school classroom, dynamically
// setting the scene at turn 0 and playing the student for up to 3 teacher-turns.
// It scores internally against the FICO rubric and steps out to give coaching
// feedback either early (PASS) or after turn 3 (FINAL).

interface ConversationMessage {
  role: 'scene' | 'student' | 'teacher' | 'coach';
  message: string;
}

interface SimulationFlowProps {
  indicatorCode: IndicatorCode;
  onComplete: () => void;
  teacherId?: string;
  trainingCode?: string;
}

export const SimulationFlow: React.FC<SimulationFlowProps> = ({
  indicatorCode,
  onComplete,
  teacherId,
  trainingCode,
}) => {
  // One session_id per roleplay run — sent with every /api/roleplay call so the backend
  // upserts a single row per session and captures every turn (even abandoned mid-sessions).
  const [sessionId] = useState<string>(() =>
    (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  // Dynamic conversation. Starts empty until turn 0 (scene setup) is fetched on mount.
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [turnNumber, setTurnNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(true);   // true during initial scene fetch
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ending, setEnding] = useState<null | { type: 'PASS' | 'FINAL'; feedback: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const MAX_TURNS = 3;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory, isLoading]);

  // On mount: call /api/roleplay with empty history to get the scene setup + first student cue.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      try {
        const r = await fetch('http://localhost:3001/api/roleplay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            indicatorCode, trainingCode, teacherId, sessionId,
            conversationHistory: [],
            turnNumber: 0,
          }),
        });
        if (!r.ok) throw new Error(`Roleplay init failed: ${r.status}`);
        const data = await r.json();
        // Scene appears as the opening message. Immediately advance to turn 1 so the teacher can respond.
        setConversationHistory([{ role: 'scene', message: data.message }]);
        setTurnNumber(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start roleplay');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Add teacher message to history immediately (optimistic)
    const updatedHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'teacher', message: teacherMessage },
    ];
    setConversationHistory(updatedHistory);

    try {
      const response = await fetch('http://localhost:3001/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorCode,
          trainingCode,
          teacherId,
          sessionId,
          conversationHistory: updatedHistory,
          turnNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Roleplay error: ${response.status}`);
      }

      const data = await response.json();

      if (data.isComplete) {
        // AI stepped out of student role — show coaching feedback (PASS or FINAL ending)
        setConversationHistory(prev => [...prev, { role: 'coach', message: data.message }]);
        setEnding({ type: data.ending || 'FINAL', feedback: data.coachingFeedback || data.message });
      } else {
        // Still in student role — append the next student utterance
        setConversationHistory(prev => [...prev, { role: 'student', message: data.message }]);
        setTurnNumber(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue roleplay');
      setConversationHistory(prev => prev.slice(0, -1)); // remove the optimistic teacher message on failure
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = ending !== null;
  const canSubmit = currentInput.trim().length > 0 && !isLoading && !isRecording && turnNumber >= 1 && !isComplete;

  return (
    <div className={styles.simulationFlow}>
      {/* Turn indicator (hidden during initial scene fetch and after completion) */}
      {!isComplete && turnNumber >= 1 && (
        <div className={styles.turnIndicator}>
          Turn {turnNumber} of {MAX_TURNS}
        </div>
      )}

      {/* Chat Container */}
      <div className={styles.chatContainer}>
        {conversationHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.messageBubble} ${styles[msg.role]}`}
          >
            {msg.role === 'scene' && <span className={styles.speaker}>🎬 Scene</span>}
            {msg.role === 'student' && <span className={styles.speaker}>🧑‍🎓 Student</span>}
            {msg.role === 'teacher' && <span className={styles.speaker}>👨‍🏫 You</span>}
            {msg.role === 'coach' && <span className={styles.speaker}>💬 Coach</span>}
            <p className={styles.messageText}>{msg.message}</p>
          </div>
        ))}

        {isLoading && (
          <div className={styles.messageBubble + ' ' + styles.student}>
            <span className={styles.speaker}>{turnNumber === 0 ? '🎬 Setting the scene' : '🧑‍🎓 Student'}</span>
            <p className={styles.messageText}>
              <span className={styles.typing}>thinking...</span>
            </p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Ending / coaching card */}
      {isComplete && ending && (
        <div className={styles.evaluationCard}>
          <h4>{ending.type === 'PASS' ? '✅ Session complete — you nailed it' : '🌱 Session complete — one step further'}</h4>
          <div className={styles.feedback}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{ending.feedback}</p>
          </div>
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
