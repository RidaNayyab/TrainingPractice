const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

export interface FlaggedIndicator {
  teacher_id: string;
  indicator_code: string;
  subject: string;
  grade: string | null;
  region: string;
  rubric_type: string;
  flag_count: number;
  priority: number;
  escalation_level: number;
  last_flagged_at: string;
}

export interface Observation {
  id: string;
  teacher_id: string;
  transcription: string;
  results_json: Record<string, any>;
  subject: string;
  grade: string | null;
  region: string;
  rubric_type: string;
  created_at: string;
  feedback_english: string;
  improvement_areas: Array<{
    indicator_code: string;
    indicator_name: string;
    score: string;
    priority: number;
    escalation_level: number;
  }>;
}

export interface TrainingResource {
  name: string;
  description: string;
  videoUrl: string;
  resources: Array<{
    code: string;
    title: string;
    domain: string;
    level: string;
    url: string;
    rationale?: string;
  }>;
  selectedResourceIndex?: number;
  selectedResource?: any;
  teacherFeedback?: string;
  currentResourceIndex?: number;
  totalResources?: number;
  allCompleted?: boolean;
}

export interface PracticeQuestion {
  id: string;
  indicatorCode: string;
  scenario: string;
  inputType: 'text' | 'audio';
  rubricCriteria: string[];
}

export const apiService = {
  async getFlaggedIndicators(teacherId: string): Promise<FlaggedIndicator[]> {
    const response = await fetch(`${API_BASE_URL}/teacher/${teacherId}/flagged-indicators`);
    if (!response.ok) throw new Error('Failed to fetch flagged indicators');
    return response.json();
  },

  async getObservation(teacherId: string): Promise<Observation> {
    const response = await fetch(`${API_BASE_URL}/teacher/${teacherId}/observations`);
    if (!response.ok) throw new Error('Failed to fetch observations');
    const observations = await response.json();
    // Return most recent observation
    return observations[0] || null;
  },

  async getTraining(indicatorCode: string, teacherId?: string): Promise<TrainingResource> {
    const url = teacherId
      ? `${API_BASE_URL}/training/${indicatorCode}/for-teacher/${teacherId}`
      : `${API_BASE_URL}/training/${indicatorCode}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch training');
    return response.json();
  },

  async completeTraining(teacherId: string, indicatorCode: string, resourceIndex: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/training/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, indicatorCode, resourceIndex }),
    });
    if (!response.ok) throw new Error('Failed to mark training as complete');
    return response.json();
  },

  async getPracticeQuestions(indicatorCode: string): Promise<PracticeQuestion[]> {
    const response = await fetch(`${API_BASE_URL}/practice/${indicatorCode}`);
    if (!response.ok) throw new Error('Failed to fetch practice questions');
    return response.json();
  },

  async savePracticeResponse(
    teacherId: string,
    questionId: string,
    indicatorCode: string,
    response: string,
    score: number,
    feedback: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/practice/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        questionId,
        indicatorCode,
        response,
        score,
        feedback,
      }),
    });
    if (!res.ok) throw new Error('Failed to save practice response');
    return res.json();
  },
};
