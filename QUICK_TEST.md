# Quick Test Guide - Question Generation Pipeline

## ✅ Status: Ready to Test

All systems verified and working:
- ✅ Frontend server running on http://localhost:5174
- ✅ API server running on http://localhost:3001
- ✅ API endpoints tested and working
- ✅ Database ready to receive questions
- ✅ UI components complete with styling

---

## 2-Minute Test Workflow

### Step 1: Open Pipeline (15 seconds)
```
1. Open browser: http://localhost:5174
2. Click ⚙️ "Question Pipeline" button in header
3. You should see:
   - System Prompt section at top
   - Two dropdowns (Indicator, Training Resource)
```

### Step 2: Select Training (30 seconds)
```
1. First Dropdown: Select "SI1 - Instructional Clarity"
2. Second Dropdown: Select any training (e.g., "LP_01_01" or "PP_00_01")
3. Form should populate with:
   - Training title
   - Training code
   - Rationale (if available)
```

### Step 3: Fill Form (30 seconds)
```
1. Learning Outcome (required):
   "Teachers should write clear 5-step lesson plans"
   
2. Context Summary (optional):
   "Fundamentals of lesson planning with measurable objectives"
   
3. Click ✨ "Generate Questions"
```

### Step 4: Verify 2 Questions (30 seconds)
```
Wait 3-5 seconds for Claude API to respond.

You should see:
- "Generated Questions (2)" heading
- Question 1 (Q1) card
- Question 2 (Q2) cards
- Each with: Scenario, Question, Rubric Criteria
- Edit (✏️) and Delete (🗑️) buttons on each
```

### Step 5: Test Edit Feature (30 seconds)
```
1. Click ✏️ Edit button on Question 1
2. Scenario field becomes editable textarea
3. Question field becomes editable textarea
4. Button changes to ✓ (checkmark)
5. Type something to modify the text
6. Click ✓ to confirm
7. Question returns to view mode with your changes
```

### Step 6: Test Delete Feature (15 seconds)
```
1. Click 🗑️ Delete button on Question 2
2. Question 2 should disappear
3. Counter should update to "Generated Questions (1)"
```

### Step 7: Save to Database (15 seconds)
```
1. Click ✅ "Save to Database" button
2. You should see: "✅ Questions saved for [training name]"
3. Form clears and resets
4. Questions section disappears
```

---

## What to Look For

### ✅ Things that should work:

1. **Form Validation**
   - Learning Outcome is required (fill it before clicking Generate)
   - Context is optional
   - Generate button disabled if Learning Outcome is empty

2. **Question Generation**
   - Takes 3-5 seconds
   - Returns exactly 2 questions (not 1, not 3)
   - Each question has scenario, prompt, and criteria

3. **Edit Mode**
   - Click ✏️ to enter edit mode
   - Textareas appear with light blue background
   - Can type/modify text
   - Click ✓ to save and return to view mode

4. **Delete**
   - Click 🗑️ removes question immediately
   - Counter updates
   - No confirmation dialog

5. **Save to Database**
   - Click ✅ sends to API
   - Shows success message
   - Form resets

---

## Troubleshooting

### Issue: Button doesn't work
**Solution**: Hard refresh browser
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R

### Issue: Only 1 question shows
**Solution**: This should not happen anymore (max_tokens=4096)
- If it does, check API response in browser console (F12)

### Issue: Edit button doesn't show textarea
**Solution**: 
1. Check browser console (F12) for errors
2. Hard refresh (Ctrl+Shift+R)
3. Try clicking edit button again

### Issue: Generated Questions section not showing
**Solution**: 
1. Make sure Learning Outcome is filled
2. Wait 5+ seconds for API response
3. Check browser console for errors
4. Check API is running on port 3001

### Issue: Save fails
**Solution**:
1. Verify API is running: curl http://localhost:3001/health
2. Check browser console for error details
3. Ensure you have at least 1 question before saving

---

## Browser Console Check

Press F12 in browser to open Developer Tools and check the Console tab.

**Good signs**:
- No red error messages
- POST request to /api/generate-questions succeeds
- POST request to /api/save-questions succeeds

**Things to ignore**:
- Warnings about unused code
- Non-critical messages from vendors

---

## API Direct Test (Optional)

If you want to verify API without browser:

```bash
# Test question generation
curl -X POST http://localhost:3001/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "trainingCode": "PP_00_01",
    "indicatorCode": "SI1",
    "learningOutcome": "Write lesson plans",
    "context": "Video teaching",
    "systemPrompt": "Generate 2 questions"
  }'

# Should return JSON with 2 questions in array
```

---

## Expected Results

| Feature | Expected Behavior |
|---------|-------------------|
| Generate | Returns 2 questions in 3-5 sec |
| Edit | Click ✏️ → textareas appear |
| Delete | Click 🗑️ → question removed |
| Save | Click ✅ → shows success, resets form |
| Counter | Updates when questions added/removed |
| System Prompt | Can edit and save to localStorage |

---

## Known Working Configurations

- ✅ Training: PP_00_01, LP_01_01, AF_00_03, and others
- ✅ Indicators: SI1, SI2, SI3, AF1, AF2, etc.
- ✅ Any Learning Outcome text works
- ✅ Optional Context can be empty

---

## Time Estimates

- **Setup & Navigation**: 15 seconds
- **Form Filling**: 30 seconds
- **Question Generation**: 5 seconds (mostly waiting)
- **Verify UI**: 30 seconds
- **Edit & Delete Testing**: 60 seconds
- **Save**: 15 seconds

**Total**: ~3 minutes for complete test

---

## Next Steps After Testing

1. ✅ Verify 2 questions generate
2. ✅ Test edit on at least 1 question
3. ✅ Test delete on at least 1 question
4. ✅ Save successfully
5. 🔄 Report any issues

If all tests pass: **Pipeline is ready for production use** ✅

---

## Questions?

- Check TEST_REPORT.md for detailed test results
- Check UI_WALKTHROUGH.md for visual walkthrough
- Check PIPELINE_TEST_GUIDE.md for comprehensive guide
