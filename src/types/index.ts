export type IndicatorCode = 'SI1' | 'SI2' | 'SI3';
export type ScoreValue = 0 | 0.5 | 1;
export type EscalationTier = 1 | 2 | 3 | 4 | 5;

export interface IndicatorRubric {
  code: IndicatorCode;
  name: string;
  description: string;
  yesPoint: string;
  partialPoint: string;
  noPoint: string;
}

export interface Training {
  code: string;
  title: string;
  domain: string;
  level: string;
  url: string;
}

export interface IndicatorTraining {
  indicatorCode: IndicatorCode;
  priority: number;
  trainings: Training[];
}

export interface ObservationScore {
  indicatorCode: IndicatorCode;
  score: ScoreValue;
  timestamp: Date;
}

export interface FeedbackSession {
  id: string;
  audioFile: string;
  scores: Record<IndicatorCode, ScoreValue>;
  feedback: string;
  escalationTier: Record<IndicatorCode, EscalationTier>;
  consecutiveLowScores: Record<IndicatorCode, number>;
  createdAt: Date;
}

export interface PracticeQuestion {
  id: string;
  indicatorCode: IndicatorCode;
  scenario: string;
  inputType: 'text' | 'audio';
  rubricCriteria: string[];
}

export interface PracticeResponse {
  questionId: string;
  response: string;
  score: number;
  feedback: string;
}
