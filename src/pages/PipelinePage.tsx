import React, { useState, useEffect } from 'react';
import trainingsData from '../data/trainings.json';
import questionGenPrompt from '../data/questionGenerationPrompt.json';
import '../styles/PipelinePage.css';

interface TrainingResource {
  code: string;
  title: string;
  domain: string;
  level: string;
  url: string;
  rationale?: string;
}

interface TrainingItem {
  indicator: string;
  name: string;
  resources: TrainingResource[];
}

interface GeneratedQuestion {
  scenario: string;
  prompt: string;
  rubricCriteria: string[];
}

interface ResourceState {
  learningOutcome: string;
  context: string;
  isGenerating: boolean;
  generatedQuestions: GeneratedQuestion[] | null;
  error: string | null;
  isSaving: boolean;
}

export default function PipelinePage() {
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [allResources, setAllResources] = useState<Array<{ resource: TrainingResource; indicator: string; training: TrainingItem }>>([]);
  const [selectedResourceCode, setSelectedResourceCode] = useState<string>('');
  const [resourceStates, setResourceStates] = useState<Map<string, ResourceState>>(new Map());
  const [systemPrompt, setSystemPrompt] = useState<string>(questionGenPrompt.systemPrompt);
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Convert trainingsData to array format
    const trainingsArray = Object.entries(trainingsData).map(([indicator, data]: [string, any]) => ({
      indicator,
      name: data.name,
      resources: data.resources,
    }));
    setTrainings(trainingsArray);

    // Flatten resources with their training info
    const allResourcesFlat: Array<{ resource: TrainingResource; indicator: string; training: TrainingItem }> = [];
    trainingsArray.forEach((training) => {
      training.resources.forEach((resource) => {
        allResourcesFlat.push({ resource, indicator: training.indicator, training });
      });
    });
    setAllResources(allResourcesFlat);

    // Initialize resource states
    const states = new Map();
    allResourcesFlat.forEach(({ resource }) => {
      states.set(resource.code, {
        learningOutcome: '',
        context: '',
        isGenerating: false,
        generatedQuestions: null,
        error: null,
        isSaving: false,
      });
    });
    setResourceStates(states);

    // Set first resource as default
    if (allResourcesFlat.length > 0) {
      setSelectedResourceCode(allResourcesFlat[0].resource.code);
    }

    // Load saved system prompt from localStorage if exists
    const saved = localStorage.getItem('systemPrompt');
    if (saved) {
      setSystemPrompt(saved);
    }
  }, []);

  const updateResourceState = (code: string, field: keyof ResourceState, value: any) => {
    setResourceStates((prev) => {
      const state = { ...prev.get(code) } as ResourceState;
      (state[field] as any) = value;
      return new Map(prev).set(code, state);
    });
  };

  const handleGenerateQuestions = async (resource: TrainingResource, training: TrainingItem) => {
    const code = resource.code;
    const state = resourceStates.get(code);
    if (!state || !state.learningOutcome.trim()) {
      updateResourceState(code, 'error', 'Please enter a learning outcome');
      return;
    }

    updateResourceState(code, 'isGenerating', true);
    updateResourceState(code, 'error', null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingCode: code,
          indicatorCode: training.indicator,
          learningOutcome: state.learningOutcome,
          context: state.context,
          rationale: resource.rationale,
          systemPrompt: systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.statusText}`);
      }

      const data = await response.json();
      updateResourceState(code, 'generatedQuestions', data.questions);
    } catch (err) {
      updateResourceState(code, 'error', err instanceof Error ? err.message : 'Error generating questions');
    } finally {
      updateResourceState(code, 'isGenerating', false);
    }
  };

  const handleSaveQuestions = async (resource: TrainingResource, training: TrainingItem) => {
    const code = resource.code;
    const state = resourceStates.get(code);
    if (!state || !state.generatedQuestions) {
      return;
    }

    updateResourceState(code, 'isSaving', true);
    updateResourceState(code, 'error', null);

    try {
      const response = await fetch('http://localhost:3001/api/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingCode: code,
          indicatorCode: training.indicator,
          questions: state.generatedQuestions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save questions: ${response.statusText}`);
      }

      updateResourceState(code, 'isSaving', false);
      updateResourceState(code, 'generatedQuestions', null);
      updateResourceState(code, 'learningOutcome', '');
      updateResourceState(code, 'context', '');
      alert(`✅ Questions saved for ${resource.title}`);
    } catch (err) {
      updateResourceState(code, 'error', err instanceof Error ? err.message : 'Error saving questions');
      updateResourceState(code, 'isSaving', false);
    }
  };

  const handleSaveSystemPrompt = () => {
    localStorage.setItem('systemPrompt', systemPrompt);
    setIsEditingPrompt(false);
    alert('✅ System prompt saved!');
  };

  const selectedResourceData = allResources.find((r) => r.resource.code === selectedResourceCode);
  const selectedResource = selectedResourceData?.resource;
  const selectedTraining = selectedResourceData?.training;
  const selectedIndicator = selectedResourceData?.indicator;
  const state = selectedResourceCode ? resourceStates.get(selectedResourceCode) : null;

  return (
    <div className="pipeline-page">
      <header className="pipeline-header">
        <h1>📚 Training Questions Generation Pipeline</h1>
        <p>Generate practice questions for training videos using AI</p>
      </header>

      <div className="pipeline-container">
        {/* System Prompt Section */}
        <div className="system-prompt-section">
          <div className="prompt-header">
            <h3>🔧 System Prompt</h3>
            <button
              className="prompt-toggle-btn"
              onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            >
              {isEditingPrompt ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {!isEditingPrompt ? (
            <div className="prompt-display">
              <p>{systemPrompt}</p>
            </div>
          ) : (
            <div className="prompt-edit">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                className="prompt-textarea"
              />
              <button className="btn-save-prompt" onClick={handleSaveSystemPrompt}>
                💾 Save Prompt
              </button>
            </div>
          )}
        </div>

        {/* Training Selection and Generation */}
        <div className="generation-section">
          <div className="training-selector">
            <label>Select Training Resource:</label>
            <select
              value={selectedResourceCode}
              onChange={(e) => setSelectedResourceCode(e.target.value)}
              className="training-dropdown"
            >
              <option value="">-- Choose a training --</option>
              {allResources.map(({ resource, training }) => (
                <option key={resource.code} value={resource.code}>
                  {training.name} → {resource.title}
                </option>
              ))}
            </select>
          </div>

          {selectedResource && selectedTraining && state && (
            <div className="form-container">
              <div className="training-details">
                <h3>{selectedResource.title}</h3>
                <p className="code-label">{selectedResource.code}</p>
                <p className="indicator-label">Indicator: {selectedIndicator}</p>
              </div>

              {selectedResource.rationale && (
                <div className="rationale-box">
                  <strong>📌 Rationale:</strong>
                  <p>{selectedResource.rationale}</p>
                </div>
              )}

              <div className="form-section">
                <label>Learning Outcome *</label>
                <input
                  type="text"
                  placeholder="What should teachers be able to do after this training?"
                  value={state.learningOutcome}
                  onChange={(e) => updateResourceState(selectedResourceCode, 'learningOutcome', e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-section">
                <label>Context Summary</label>
                <textarea
                  placeholder="Brief summary of the training video content (key points, focus areas)"
                  value={state.context}
                  onChange={(e) => updateResourceState(selectedResourceCode, 'context', e.target.value)}
                  className="textarea-field"
                  rows={3}
                />
              </div>

              {state.error && <div className="error-message">{state.error}</div>}

              <button
                className="btn-generate"
                onClick={() => handleGenerateQuestions(selectedResource, selectedTraining)}
                disabled={state.isGenerating}
              >
                {state.isGenerating ? '⏳ Generating...' : '✨ Generate Questions'}
              </button>

              {state.generatedQuestions && (
                <div className="questions-preview">
                  <h4>Generated Questions ({state.generatedQuestions.length})</h4>
                  {state.generatedQuestions.map((q, idx) => (
                    <div key={idx} className="question-preview">
                      <div className="question-number">Q{idx + 1}</div>
                      <div className="scenario">
                        <strong>Scenario:</strong> {q.scenario}
                      </div>
                      <div className="prompt">
                        <strong>Prompt:</strong> {q.prompt}
                      </div>
                      <div className="criteria">
                        <strong>Rubric Criteria:</strong>
                        <ul>
                          {q.rubricCriteria.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  <button
                    className="btn-save"
                    onClick={() => handleSaveQuestions(selectedResource, selectedTraining)}
                    disabled={state.isSaving}
                  >
                    {state.isSaving ? '💾 Saving...' : '✅ Save to Database'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
