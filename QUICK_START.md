# ⚡ Quick Start Guide

## 1️⃣ Start the Backend API (Required)

```bash
npm run dev:api
```

**Expected output:**
```
✅ Connected to database
🚀 Server running on http://localhost:3001
```

✅ **Keep this running in the background!**

---

## 2️⃣ Start the Frontend Dev Server (Optional - for testing UI)

In a new terminal:
```bash
npm run dev
```

Opens at `http://localhost:5173`

---

## 3️⃣ Test the API is Working

```bash
# Check health
curl http://localhost:3001/api/health

# Get flagged indicators for teacher 12711
curl http://localhost:3001/api/teacher/12711/flagged-indicators

# Get feedback for the teacher
curl http://localhost:3001/api/teacher/12711/indicator/SI1/observation
```

---

## 4️⃣ Integrate into niete app

```tsx
import { FeedbackTrainingModule } from './components/FeedbackTrainingModule';

// In your niete app's teacher dashboard:
<FeedbackTrainingModule 
  teacherId="12711"
  indicatorCode="SI1"
  onClose={() => {
    console.log('Teacher completed training!');
  }}
/>
```

---

## ✅ That's it!

Your training module is now:
- ✅ Connected to your real database
- ✅ Showing real feedback to teachers
- ✅ Ready to integrate into niete app
- ✅ Scalable for production

---

## 📚 More Info

- **Integration details** → See `INTEGRATION_GUIDE.md`
- **Full documentation** → See `IMPLEMENTATION_SUMMARY.md`
- **API details** → See `src/server.ts`
- **Component props** → See `src/components/FeedbackTrainingModule.tsx`

---

## 🧪 Test Data

**Teacher 12711** has multiple flagged indicators ready for testing:
- SI1 (Instructional Clarity) - Flag count: 3
- SI2 (Logical Flow) - Flag count: 3  
- SI3 (Content Accuracy) - Flag count: 4
- PIC-3, PIC-4, PIC-5 - Higher escalation levels

Perfect for testing the full feedback → training → practice flow!

---

## 🚀 Ready to Deploy?

For production:
1. Deploy API server to Railway/Heroku/AWS
2. Update `API_BASE_URL` in `src/services/api.ts`
3. Build frontend: `npm run build`
4. Embed component in niete app

That's all! 🎉
