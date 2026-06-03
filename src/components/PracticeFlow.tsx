import React, { useState, useRef } from 'react';
import { IndicatorCode } from '../types/index';
import { practiceQuestions } from '../data/mockData';
import styles from './PracticeFlow.module.css';

interface PracticeFlowProps {
  indicatorCode: IndicatorCode;
  onComplete: () => void;
  questions?: any[];
}

export const PracticeFlow: React.FC<PracticeFlowProps> = ({
  indicatorCode,
  onComplete,
  questions: providedQuestions,
}) => {
  const questions = providedQuestions || practiceQuestions.filter(
    (q) => q.indicatorCode === indicatorCode
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    questionId: string;
    score: 'YES' | 'PARTIAL' | 'NO';
    feedback: string;
    rubric_criteria_met: string[];
    rubric_criteria_missed: string[];
    rubric_criteria_not_applicable: string[];
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestion.id] || '';

  const handleResponseChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setResponses({
      ...responses,
      [currentQuestion.id]: e.target.value,
    });
  };

  const startRecording = async () => {
    try {
      // Show status
      setResponses({
        ...responses,
        [currentQuestion.id]: '[🎤 Requesting microphone...]',
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('🎙️ Recording stopped, chunks:', audioChunksRef.current.length);
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          setResponses({
            ...responses,
            [currentQuestion.id]: '[❌ No audio recorded - please try again]',
          });
          return;
        }

        setResponses({
          ...responses,
          [currentQuestion.id]: `[⏳ Uploading audio (${Math.round(audioBlob.size / 1024)}KB)...]`,
        });

        try {
          const API_URL = 'http://localhost:3001';
          console.log('🚀 Starting upload to:', API_URL);

          // Step 1: Upload audio - send as raw binary
          const buffer = await audioBlob.arrayBuffer();

          console.log('📤 Uploading audio buffer:', buffer.byteLength, 'bytes');
          const uploadResponse = await fetch(`${API_URL}/api/upload-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'audio/webm' },
            body: buffer,
          });

          console.log('📥 Upload response status:', uploadResponse.status);

          if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            console.error('❌ Upload failed:', uploadResponse.status, error);
            setResponses({
              ...responses,
              [currentQuestion.id]: `[❌ Upload error ${uploadResponse.status}: ${error}]`,
            });
            return;
          }

          const { fileId } = await uploadResponse.json();
          console.log('✅ File uploaded, ID:', fileId);

          // Step 2: Create transcription job
          setResponses({
            ...responses,
            [currentQuestion.id]: '[⏳ Creating transcription job...]',
          });

          const transcribeResponse = await fetch(`${API_URL}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId }),
          });

          if (!transcribeResponse.ok) {
            const error = await transcribeResponse.text();
            setResponses({
              ...responses,
              [currentQuestion.id]: `[❌ Transcription error ${transcribeResponse.status}: ${error}]`,
            });
            return;
          }

          const { transcriptionId } = await transcribeResponse.json();

          // Step 3: Poll for completion
          setResponses({
            ...responses,
            [currentQuestion.id]: '[⏳ Processing audio...]',
          });

          let isComplete = false;
          let attempts = 0;
          const maxAttempts = 120;

          while (!isComplete && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;

            const statusResponse = await fetch(`${API_URL}/api/transcription/${transcriptionId}/status`);
            if (!statusResponse.ok) {
              throw new Error('Failed to check status');
            }

            const { status, error_message } = await statusResponse.json();

            if (status === 'completed') {
              isComplete = true;
            } else if (status === 'error') {
              throw new Error(error_message || 'Transcription failed on server');
            }
          }

          if (!isComplete) {
            throw new Error('Transcription timeout');
          }

          // Step 4: Fetch transcript
          const transcriptResponse = await fetch(`${API_URL}/api/transcription/${transcriptionId}/transcript`);
          if (!transcriptResponse.ok) {
            throw new Error('Failed to fetch transcript');
          }

          const { transcript } = await transcriptResponse.json();

          // Show transcription in field (user can edit before submitting)
          setResponses({
            ...responses,
            [currentQuestion.id]: transcript,
          });
        } catch (error: any) {
          setResponses({
            ...responses,
            [currentQuestion.id]: `[❌ Error: ${error.message}]`,
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      setResponses({
        ...responses,
        [currentQuestion.id]: `[❌ Microphone Error: ${errorMsg}]`,
      });
      alert(`Microphone Error: ${errorMsg}\n\nPlease check:\n1. Microphone is connected\n2. Browser has permission to access microphone\n3. Another app isn't using the microphone`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentResponse || currentResponse.trim().length === 0) {
      alert('Please type or record a response before submitting');
      return;
    }

    setIsEvaluating(true);

    const API_URL = 'http://localhost:3001';

    try {
      console.log('📤 Sending evaluation request:', { response: currentResponse, questionId: currentQuestion.id });

      const response = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: currentResponse,
          questionId: currentQuestion.id,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Evaluation failed:', errorText);
        alert('Evaluation error: ' + errorText);
        setIsEvaluating(false);
        return;
      }

      const result = await response.json();
      console.log('✅ Evaluation result:', result);

      setEvaluation({
        questionId: currentQuestion.id,
        ...result,
      });
      setIsEvaluating(false);
    } catch (error: any) {
      console.error('❌ Evaluation exception:', error);
      alert('Failed to evaluate response: ' + error.message);
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setEvaluation(null);
    } else {
      onComplete();
    }
  };

  if (!currentQuestion) {
    return null;
  }

  if (evaluation) {
    return (
      <div className={styles.container}>
        <div className={styles.evaluationCard}>
          <h3>Feedback for Question {currentQuestionIndex + 1}</h3>

          <div className={styles.feedback}>
            <p>{evaluation.feedback || 'No feedback available'}</p>
          </div>

          <div className={styles.navigation}>
            {currentQuestionIndex < questions.length - 1 ? (
              <button className={styles.nextBtn} onClick={handleNext}>
                Next Question ({currentQuestionIndex + 1}/{questions.length})
              </button>
            ) : (
              <button className={styles.nextBtn} onClick={handleNext}>
                Finish Practice
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{
          width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
        }} />
      </div>
      <span className={styles.progressText}>
        Question {currentQuestionIndex + 1} of {questions.length}
      </span>

      <div className={styles.questionCard}>
        <div className={styles.scenarioBox}>
          <h3>Scenario (Context):</h3>
          <p>{currentQuestion.scenario}</p>
        </div>

        <div className={styles.promptBox}>
          <h3>What to do:</h3>
          <p>{currentQuestion.prompt}</p>
        </div>

        <div className={styles.inputSection}>
          <label>Your Response - Choose Input Type:</label>
          <div className={styles.inputTypeButtons}>
            <button
              className={`${styles.inputTypeBtn} ${!isRecording ? styles.active : ''}`}
              onClick={() => setIsRecording(false)}
              disabled={isEvaluating}
            >
              ✎ Type Your Response
            </button>
            <button
              className={`${styles.inputTypeBtn} ${isRecording ? styles.active : ''}`}
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              disabled={isEvaluating}
            >
              {isRecording ? '⏹ Stop Recording' : '🎤 Record Audio'}
            </button>
          </div>

          {!isRecording ? (
            <textarea
              value={currentResponse}
              onChange={handleResponseChange}
              placeholder="Type your response here..."
              rows={6}
              className={styles.textarea}
              disabled={isEvaluating}
            />
          ) : (
            <div className={styles.recordingBox}>
              <div className={styles.recordingIndicator}>
                <span className={styles.recordingDot}></span>
                Recording...
              </div>
              <p>Speak clearly. You can record up to 3 minutes.</p>
            </div>
          )}
        </div>

        <div className={styles.rubric}>
          <h4>You will be evaluated on (SI1 - Instructional Clarity):</h4>
          <ul>
            {currentQuestion.rubricCriteria.map((criterion: string, idx: number) => (
              <li key={idx}>{criterion}</li>
            ))}
          </ul>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!currentResponse.trim() || currentResponse.trim().length < 20 || isEvaluating}
            title={currentResponse.trim().length < 20 && currentResponse.trim().length > 0 ? `Need at least 20 characters (${currentResponse.trim().length} so far)` : ''}
          >
            {isEvaluating ? 'Evaluating...' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  );
};
