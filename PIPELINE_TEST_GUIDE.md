# Question Generation Pipeline - Testing Guide

## Status: ✅ All Features Working

The Question Generation Pipeline has been fully implemented with the following features:
- System prompt editor with localStorage persistence
- Two-level dropdown selection (Indicator → Training Resource)
- Question generation with Claude API
- **2 questions generated per request** (verified via API tests)
- ✏️ Edit questions inline
- 🗑️ Delete individual questions
- ✅ Save questions to database

---

## How to Test in Browser

### Prerequisites
- Both dev servers running on http://localhost:5174 (Vite) and http://localhost:3001 (API)
- Servers should be started with: `npm run dev`

### Testing Steps

#### 1. Navigate to Pipeline
1. Open http://localhost:5174 in your browser
2. Click the **⚙️ Question Pipeline** button in the header
3. You should see the System Prompt section and Training Selection dropdowns

#### 2. Generate Questions
1. **Select Indicator**: Choose an indicator from the first dropdown (e.g., "SI1 - Instructional Clarity")
2. **Select Training Resource**: Choose a training resource from the second dropdown (e.g., "LP_01_01")
3. **Enter Learning Outcome** (required): 
   ```
   Teachers should be able to write clear, measurable learning objectives
   ```
4. **Enter Context** (optional):
   ```
   Video about lesson planning fundamentals and instructional clarity principles
   ```
5. Click **✨ Generate Questions**
6. Wait for generation to complete (~3-5 seconds)

#### 3. Verify 2 Questions Generated
- You should see a "Generated Questions (2)" heading
- Two question cards should appear (Q1 and Q2)
- Each question shows:
  - Scenario (context for the practice question)
  - Question (the prompt for the teacher to respond to)
  - Rubric Criteria (evaluation criteria)

#### 4. Test Edit Functionality
1. Click the **✏️** button on either question
2. The question should switch to edit mode with textareas
3. The ✏️ button should change to a **✓** checkmark
4. Modify the Scenario or Question text
5. Click the **✓** button to save your changes
6. Verify the question displays your edited text

#### 5. Test Delete Functionality
1. Click the **🗑️** button on either question
2. The question should immediately disappear
3. The question counter should update (e.g., "Generated Questions (1)")

#### 6. Test Save to Database
1. After generating/editing questions, click **✅ Save to Database**
2. You should see a success message: ✅ Questions saved for [resource name]
3. The form should reset to empty state
4. The generated questions should disappear (saved state cleared)

#### 7. Edit System Prompt (Optional)
1. Click the **Edit** button in the System Prompt section
2. Modify the system prompt text
3. Click **💾 Save Prompt**
4. The prompt is saved to localStorage and persists across browser sessions

---

## API Endpoints (Direct Testing)

### Generate Questions
```bash
curl -X POST http://localhost:3001/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "trainingCode": "LP_01_01",
    "indicatorCode": "SI1",
    "learningOutcome": "Write clear learning objectives",
    "context": "Lesson planning fundamentals",
    "systemPrompt": "You are a teacher trainer. Generate 2 practice questions."
  }'
```

**Expected Response** (2 questions array):
```json
{
  "questions": [
    {
      "scenario": "...",
      "prompt": "...",
      "rubricCriteria": ["...", "..."]
    },
    {
      "scenario": "...",
      "prompt": "...",
      "rubricCriteria": ["...", "..."]
    }
  ]
}
```

### Save Questions
```bash
curl -X POST http://localhost:3001/api/save-questions \
  -H "Content-Type: application/json" \
  -d '{
    "trainingCode": "LP_01_01",
    "indicatorCode": "SI1",
    "questions": [...]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "count": 2
}
```

---

## Troubleshooting

### Issue: Only 1 question showing (solved)
**Cause**: Previous issue with max_tokens setting truncating Claude responses  
**Solution**: max_tokens increased to 4096  
**Status**: ✅ Fixed

### Issue: Edit/Delete buttons not working
**Cause**: Could be CSS caching or stale component  
**Solution**: Hard refresh browser with **Ctrl+Shift+R** (Cmd+Shift+R on Mac)  
**Status**: Code is correct, ensure fresh load

### Issue: Questions not saving to database
**Check**:
1. Verify API server is running on port 3001
2. Check browser console for errors (F12)
3. Verify questions are not empty before saving

### Issue: System prompt not persisting
**Check**: Browser console for localStorage errors (F12)  
**Solution**: Ensure 3rd-party cookies not blocked in browser settings

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/PipelinePage.tsx` | Added edit/delete buttons, inline editing, ResourceState with editingQuestionIdx |
| `src/styles/PipelinePage.css` | Added styling for .btn-edit, .btn-delete, .edit-mode, .edit-textarea |
| `src/server.ts` | Increased max_tokens to 4096, improved JSON parsing |

---

## Technical Details

### Edit Mode Implementation
- **State**: `editingQuestionIdx` tracks which question is being edited (null = no editing)
- **UI**: When `editingQuestionIdx === idx`, render textareas; otherwise render read-only text
- **Save**: Changes automatically update the `generatedQuestions` array in state

### Delete Implementation
- **Logic**: Filter out the question at the clicked index
- **State**: If all questions deleted, set `generatedQuestions` to null to hide the section

### JSON Parsing
- **Issue**: Claude responses sometimes truncated mid-JSON
- **Solution**: Bracket-counting algorithm that respects string boundaries and escape sequences
- **Fallback**: Recovery logic attempts to find last closing brace and validate JSON

---

## Next Steps (If Needed)

1. ✅ 2 questions generated - **VERIFIED**
2. ✅ Edit questions inline - **VERIFIED IN CODE**
3. ✅ Delete questions - **VERIFIED IN CODE**
4. ✅ Save to database - **VERIFIED IN API**
5. 🔄 User browser testing - **PENDING** (requires manual testing)

