# Digital Coach Training Module - Integration Guide

## Overview
This is a **standalone training & practice module** that integrates into your niete app when an indicator is flagged 3+ times consecutively.

## Architecture

```
Your niete app
    ↓
Detects: indicator escalation_level >= 3
    ↓
Opens FeedbackTrainingModule component
    ↓
Calls backend API (port 3001)
    ↓
Fetches real data from your database
    ↓
Shows: Feedback → Training → Practice → Completion
```

---

## How to Integrate into niete app

### 1. **Import the Component**
```tsx
import { FeedbackTrainingModule } from './src/components/FeedbackTrainingModule';

// In your niete app component:
<FeedbackTrainingModule 
  teacherId="12711"           // From your auth/context
  indicatorCode="SI1"         // From the flagged indicator
  onClose={() => {            // Optional callback when done
    // Close modal, refresh dashboard, etc.
  }}
/>
```

### 2. **Start the Backend API**
Run this in a separate terminal (or deploy to a server):
```bash
npm run dev:api
```

This starts the API server on `http://localhost:3001`

The API will:
- Connect to your PostgreSQL database
- Serve endpoints for teacher data, feedback, training resources, and practice questions
- Track practice completion

### 3. **API Endpoints Available**

```
GET  /api/health
     Check if API is running

GET  /api/teacher/:teacherId/flagged-indicators
     Get all indicators flagged 3+ times for a teacher
     Response: Array of flagged indicators with escalation levels

GET  /api/teacher/:teacherId/indicator/:indicatorCode/observation
     Get the latest observation and feedback for a teacher
     Response: { id, teacher_id, results_json, feedback_english, improvement_areas, ... }

GET  /api/indicator/:indicatorCode/training
     Get training resources for an indicator
     Response: { name, description, videoUrl, resources: [...] }

GET  /api/indicator/:indicatorCode/practice-questions
     Get practice questions for an indicator
     Response: Array of practice questions

POST /api/practice/response
     Save a practice response from a teacher
     Body: { teacherId, questionId, indicatorCode, score }
```

---

## Component Props

```typescript
interface FeedbackTrainingModuleProps {
  teacherId: string;           // Required: Teacher's ID from your system
  indicatorCode: IndicatorCode; // Required: The flagged indicator (SI1, SI2, SI3, etc)
  onClose?: () => void;        // Optional: Called when teacher completes or closes
}
```

---

## Flow Diagram

```
1. FEEDBACK STATE
   ├─ Shows: Transcription of last lesson
   ├─ Shows: Personalized feedback (from your DB)
   └─ Shows: Focus areas flagged

2. TRAINING STATE
   ├─ Shows: Training video
   ├─ Shows: Recommended resources
   └─ Button: "Start Practice Questions"

3. PRACTICE STATE
   ├─ Shows: 1-2 scenario-based questions
   ├─ Teacher: Responds to scenario
   └─ Button: "Complete Practice"

4. COMPLETION STATE
   ├─ Shows: Success message
   ├─ Shows: Summary of what was learned
   └─ Button: "Done" (calls onClose)
```

---

## Data Sources

All data comes from your existing database tables:

| Table | Used For |
|-------|----------|
| `teacher_indicator_flags` | Finding flagged indicators |
| `observations` | Getting transcription & results |
| `observation_feedback_loops` | Getting generated feedback |
| `indicator_flag_audit` | Audit trail (future) |

---

## Example: Adding to your niete Dashboard

```tsx
import { FeedbackTrainingModule } from 'path/to/FeedbackTrainingModule';
import { useAuth } from './hooks/useAuth'; // Your auth context

export function TeacherDashboard() {
  const { user } = useAuth();
  const [showTraining, setShowTraining] = useState(false);
  const [flaggedIndicator, setFlaggedIndicator] = useState<string | null>(null);

  const handleFlaggedIndicator = (indicatorCode: string) => {
    setFlaggedIndicator(indicatorCode);
    setShowTraining(true);
  };

  return (
    <div>
      {/* Your existing dashboard UI */}
      
      {showTraining && flaggedIndicator && (
        <Modal onClose={() => setShowTraining(false)}>
          <FeedbackTrainingModule
            teacherId={user.id}
            indicatorCode={flaggedIndicator as any}
            onClose={() => {
              setShowTraining(false);
              // Refresh observations, etc.
            }}
          />
        </Modal>
      )}
    </div>
  );
}
```

---

## Environment Variables

Create `.env.local` with:
```
PGHOST=maglev.proxy.rlwy.net
PGPORT=53678
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=railway

API_PORT=3001
NODE_ENV=development
```

---

## Deployment

### For Production:
1. Deploy the backend API to a server (Heroku, Railway, Vercel, etc.)
2. Update the `API_BASE_URL` in `src/services/api.ts` to point to your production API
3. Embed the React component in your niete app build

### Database Access:
- The backend API is the only component that needs database credentials
- Your niete app only needs to call the API, no direct DB access needed
- This keeps credentials secure and separates concerns

---

## Next Steps

1. ✅ Backend API is ready - start with `npm run dev:api`
2. ✅ Frontend component is ready - import `FeedbackTrainingModule`
3. ⏳ Connect it to your niete app's detection logic
4. ⏳ Test with real teacher data
5. ⏳ Deploy to production

---

## Support

For issues or questions about integration, check:
- `src/components/FeedbackTrainingModule.tsx` - Main component
- `src/services/api.ts` - API client functions
- `src/server.ts` - Backend API implementation
