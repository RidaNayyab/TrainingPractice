import React, { useState } from 'react';
import styles from './AudioUpload.module.css';

interface AudioUploadProps {
  onTranscriptionComplete: (transcript: string) => void;
  isLoading: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({
  onTranscriptionComplete,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.includes('audio')) {
      setSelectedFile(file);
      setPreview(file.name);
      await handleTranscribe(file);
    } else {
      alert('Please select a valid audio file');
    }
  };

  const handleTranscribe = async (file: File) => {
    if (!file) return;

    setTranscribing(true);
    setTranscriptionStatus('Uploading audio...');

    try {
      const API_URL = 'http://localhost:3001';

      // Step 1: Upload audio file - send as raw binary
      const buffer = await file.arrayBuffer();

      const uploadResponse = await fetch(`${API_URL}/api/upload-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { fileId } = await uploadResponse.json();
      setTranscriptionStatus('Creating transcription job...');

      // Step 2: Create transcription job
      const transcribeResponse = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Failed to create transcription job');
      }

      const { transcriptionId } = await transcribeResponse.json();
      setTranscriptionStatus('Processing audio...');

      // Step 3: Poll for completion
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`${API_URL}/api/transcription/${transcriptionId}/status`);
        if (!statusResponse.ok) {
          throw new Error('Failed to check transcription status');
        }

        const { status } = await statusResponse.json();
        setTranscriptionStatus(`Processing... (${Math.round(attempts / 2)}s)`);

        if (status === 'completed') {
          isComplete = true;
        } else if (status === 'error') {
          throw new Error('Transcription failed');
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
      setTranscriptionStatus('✅ Complete!');
      onTranscriptionComplete(transcript);
    } catch (error) {
      setTranscriptionStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Transcription error:', error);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadBox}>
        <h2>Upload Your Lesson Recording</h2>
        <p>Supported formats: MP3, WAV, M4A, WebM</p>

        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={isLoading || transcribing}
          className={styles.fileInput}
          id="audio-input"
        />
        <label htmlFor="audio-input" className={styles.uploadLabel}>
          {transcribing ? 'Processing...' : 'Click to upload or drag audio file'}
        </label>

        {preview && (
          <div className={styles.preview}>
            <p>Selected: <strong>{preview}</strong></p>
            {selectedFile && (
              <audio controls className={styles.audioPlayer}>
                <source
                  src={URL.createObjectURL(selectedFile)}
                  type={selectedFile.type}
                />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}

        {transcriptionStatus && (
          <div className={styles.status}>
            <p>{transcriptionStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};
