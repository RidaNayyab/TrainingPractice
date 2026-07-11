import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackTrainingModule } from './components/FeedbackTrainingModule';
import './TestPage.css';

interface Region { region_name: string; region_id: string | null; obs_count: number; school_count: number; teacher_count: number; }
interface School { school_id: string; school_name: string; region_name: string; obs_count: number; teacher_count: number; }
interface Teacher { teacher_id: string; teacher_name: string; school_name: string; region_name: string; obs_count: number; }
interface Observation {
  id: string;
  observation_date: string;
  feedback_english: string;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  teacher_name?: string;
  school_name?: string;
  region_name?: string;
  improvement_areas?: { indicator_code: string; indicator_name: string; score: string }[];
}

const API = 'http://localhost:3001';

export default function TestPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [highestPriorityIndicator, setHighestPriorityIndicator] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTrainingModule, setShowTrainingModule] = useState(false);

  // Load regions on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/niete/regions`)
      .then(r => r.json())
      .then(setRegions)
      .catch(err => console.error('Failed to fetch regions:', err))
      .finally(() => setLoading(false));
  }, []);

  // When region changes: load schools + clear downstream
  useEffect(() => {
    setSchools([]);
    setTeachers([]);
    setObservations([]);
    setSelectedSchool('');
    setSelectedTeacher(null);
    setSelectedObservation(null);
    if (!selectedRegion) return;
    fetch(`${API}/api/niete/schools?region=${encodeURIComponent(selectedRegion)}`)
      .then(r => r.json())
      .then(setSchools)
      .catch(err => console.error('Failed to fetch schools:', err));
  }, [selectedRegion]);

  // When school changes: load teachers
  useEffect(() => {
    setTeachers([]);
    setObservations([]);
    setSelectedTeacher(null);
    setSelectedObservation(null);
    if (!selectedSchool) return;
    fetch(`${API}/api/niete/teachers?schoolId=${encodeURIComponent(selectedSchool)}`)
      .then(r => r.json())
      .then(setTeachers)
      .catch(err => console.error('Failed to fetch teachers:', err));
  }, [selectedSchool]);

  // When teacher changes: load their observations
  useEffect(() => {
    setObservations([]);
    setSelectedObservation(null);
    if (!selectedTeacher) return;
    fetch(`${API}/api/niete/teacher/${encodeURIComponent(selectedTeacher.teacher_id)}/observations`)
      .then(r => r.json())
      .then(setObservations)
      .catch(err => console.error('Failed to fetch observations:', err));
  }, [selectedTeacher]);

  const handleSelectObservation = async (obs: Observation) => {
    setSelectedObservation(obs);
    // Ask the server which flagged indicator to open the training module on
    try {
      const r = await fetch(`${API}/api/niete/observation/${obs.id}/highest-priority-indicator`);
      const data = await r.json();
      if (data.indicator) {
        setHighestPriorityIndicator(data.indicator);
        setShowTrainingModule(true);
      } else {
        alert('No flagged indicator with a mapped training was found on this observation.');
      }
    } catch (err) {
      console.error('Failed to get priority indicator:', err);
    }
  };

  return (
    <div className="test-page">
      <header className="test-header">
        <div className="header-top">
          <h1>👨‍🏫 Digital Coach — Teacher Training</h1>
          <Link to="/pipeline" className="pipeline-link">⚙️ Question Pipeline</Link>
        </div>
        <p>Pick a region, a school, a teacher, then an observation — the coaching loop begins.</p>
      </header>

      {!showTrainingModule && (
        <div className="test-controls">
          <div className="teacher-view">
            <h2>Browse observations</h2>

            {/* Region + School + Teacher row */}
            <div className="filter-row">
              <div className="filter-group">
                <label>Region</label>
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  className="teacher-dropdown"
                >
                  <option value="">— select region —</option>
                  {regions.map(r => (
                    <option key={r.region_name} value={r.region_name}>
                      {r.region_name} ({r.school_count} schools · {r.obs_count} obs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>School</label>
                <select
                  value={selectedSchool}
                  onChange={e => setSelectedSchool(e.target.value)}
                  className="teacher-dropdown"
                  disabled={!selectedRegion}
                >
                  <option value="">{selectedRegion ? '— select school —' : '(pick region first)'}</option>
                  {schools.map(s => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name} ({s.teacher_count} teachers · {s.obs_count} obs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Teacher</label>
                <select
                  value={selectedTeacher?.teacher_id || ''}
                  onChange={e => {
                    const t = teachers.find(t => t.teacher_id === e.target.value) || null;
                    setSelectedTeacher(t);
                  }}
                  className="teacher-dropdown"
                  disabled={!selectedSchool}
                >
                  <option value="">{selectedSchool ? '— select teacher —' : '(pick school first)'}</option>
                  {teachers.map(t => (
                    <option key={t.teacher_id} value={t.teacher_id}>
                      {t.teacher_name} ({t.obs_count} obs)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && <p className="loading">Loading regions…</p>}

            {selectedTeacher && (
              <div className="observations-section">
                <h3>{selectedTeacher.teacher_name}'s observations ({observations.length})</h3>
                {observations.length > 0 ? (
                  <div className="observations-list">
                    {observations.map((obs) => {
                      const flagged = obs.improvement_areas?.length || 0;
                      return (
                        <div
                          key={obs.id}
                          className={`observation-card ${selectedObservation?.id === obs.id ? 'selected' : ''}`}
                          onClick={() => handleSelectObservation(obs)}
                        >
                          <div className="obs-date">
                            {obs.observation_date} · {obs.subject || 'subject?'} · Grade {obs.grade || '?'}
                            {flagged > 0 && <span className="obs-flag">{flagged} flagged</span>}
                          </div>
                          <div className="obs-snippet">
                            {obs.feedback_english?.substring(0, 140) || '(no feedback text)'}...
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty">No observations for this teacher.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showTrainingModule && selectedObservation && highestPriorityIndicator && selectedTeacher && (
        <div className="module-container">
          <button className="back-btn" onClick={() => setShowTrainingModule(false)}>
            ← Back to Observations
          </button>
          <FeedbackTrainingModule
            teacherId={selectedTeacher.teacher_id}
            indicatorCode={highestPriorityIndicator as any}
            observationId={selectedObservation.id}
            onClose={() => setShowTrainingModule(false)}
          />
        </div>
      )}
    </div>
  );
}
