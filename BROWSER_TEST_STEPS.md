# Browser Testing Steps - Question Generation Pipeline

## Prerequisites
- Both servers running: `npm run dev`
- Frontend: http://localhost:5174
- API: http://localhost:3001
- Browser: Any modern browser (Chrome, Firefox, Safari, Edge)

---

## Complete Testing Workflow

### STEP 1: Navigate to Pipeline (15 seconds)

**Action**: Open http://localhost:5174

**What you should see**:
- Navigation header with "Digital Coach - Teacher Feedback System"
- Several buttons including one labeled "⚙️ Question Pipeline"

**Action**: Click the "⚙️ Question Pipeline" button

**What you should see**:
- URL changes to http://localhost:5174/pipeline
- Page title: "📚 Training Questions Generation Pipeline"
- Subtitle: "Generate practice questions for training videos using AI"
- Back link to return home

---

### STEP 2: System Prompt Section (10 seconds)

**What you should see**:
```
🔧 System Prompt                              [Edit]
┌─────────────────────────────────────────────┐
│ You are an expert teacher trainer...        │
│ Generate practice questions based on:       │
│ ...                                          │
└─────────────────────────────────────────────┘
```

**Optional - Test Edit Mode**:
1. Click [Edit] button
2. Textarea appears with system prompt text
3. 💾 Save Prompt button appears
4. Click anywhere outside or the button to toggle

**What to verify**:
- ✅ Edit button works
- ✅ System prompt is readable
- ✅ Can edit and save if desired

---

### STEP 3: Training Selection Dropdowns (20 seconds)

**What you should see**:
```
1. Select Indicator:
   ┌─────────────────────────────────────────┐
   │ -- Choose an indicator --             ▼ │
   └─────────────────────────────────────────┘

2. Select Training Resource:
   [Disabled - appears grayed out]
```

**Action**: Click first dropdown and select an indicator

**Available options** (choose any):
- SI1 - Instructional Clarity
- SI2 - Logical Flow
- SI3 - Subject Content Accuracy
- AF1 - Assessment Focused
- And others...

**Example**: Click "SI1 - Instructional Clarity"

**What happens**:
- First dropdown now shows: "SI1 - Instructional Clarity"
- Second dropdown becomes active/enabled
- Fills with training resources for SI1

**Action**: Click second dropdown

**What you should see** (examples for SI1):
- 5 Step Lesson Plan
- Clear Learning Objectives
- Using Varied Strategies
- And others...

**Example**: Click "5 Step Lesson Plan"

**What happens**:
- Second dropdown shows: "5 Step Lesson Plan"
- Form populates below with:
  - Training title
  - Training code (e.g., "PP_00_01")
  - Indicator info
  - Rationale text (if available)

**What to verify**:
- ✅ First dropdown selects indicators
- ✅ Second dropdown fills with resources
- ✅ Second dropdown disabled until first selected
- ✅ Form populates with training details

---

### STEP 4: Fill Required Fields (30 seconds)

**What you should see**:
```
Learning Outcome *
┌──────────────────────────────────────────────┐
│ [text input field]                           │
└──────────────────────────────────────────────┘

Context Summary
┌──────────────────────────────────────────────┐
│ [textarea field]                             │
│                                              │
└──────────────────────────────────────────────┘
```

**Action**: Click Learning Outcome field and type:
```
Teachers should be able to write clear, measurable 5-step lesson plans with specific learning objectives
```

**Action**: Click Context Summary and type:
```
This video teaches the fundamentals of creating structured lesson plans that maximize student engagement and learning outcomes through clear objectives and varied instructional strategies
```

**What to verify**:
- ✅ Learning Outcome field accepts text
- ✅ Context field accepts text
- ✅ Both fields show placeholder text before typing

---

### STEP 5: Generate Questions (5-10 seconds)

**What you should see**:
```
┌────────────────────────────┐
│ ✨ Generate Questions       │
└────────────────────────────┘
```

**Action**: Click the "✨ Generate Questions" button

**What happens** (visually):
- Button changes to: "⏳ Generating..." (disabled)
- Page might show loading indicator
- **Wait 3-5 seconds** for Claude AI to generate questions
- Page may freeze briefly (this is normal)

**After ~5 seconds, you should see**:
```
Generated Questions (2)

┌─────────────────────────────────────────────┐
│ Q1                                    [✏️] [🗑️] │
├─────────────────────────────────────────────┤
│ Scenario:                                   │
│ You are teaching Grade 3 students at a     │
│ government school in Punjab...             │
│                                             │
│ Question:                                   │
│ Write a complete 5-step lesson plan...     │
│                                             │
│ Rubric Criteria:                            │
│ • Criterion 1                               │
│ • Criterion 2                               │
│ • Criterion 3                               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Q2                                    [✏️] [🗑️] │
├─────────────────────────────────────────────┤
│ [Similar structure to Q1]                   │
└─────────────────────────────────────────────┘

┌────────────────────────────┐
│ ✅ Save to Database        │
└────────────────────────────┘
```

**What to verify**:
- ✅ "Generated Questions (2)" heading appears
- ✅ **2 questions are shown** (not 1, not 3)
- ✅ Each question has Q1, Q2 numbering
- ✅ Each has edit (✏️) and delete (🗑️) buttons
- ✅ Each has Scenario, Question, and Rubric Criteria

---

### STEP 6: Test Edit Functionality (30 seconds)

**Action**: Click the ✏️ (pencil) button on Question 1

**What changes**:
- ✏️ button becomes ✓ (checkmark)
- Scenario becomes editable textarea with light blue background
- Question becomes editable textarea with light blue background
- Rubric Criteria remains read-only
- Both textareas are clickable and editable

**Example of edit mode**:
```
┌─────────────────────────────────────────────┐
│ Q1                                    [✓] [🗑️] │
├─────────────────────────────────────────────┤
│ Scenario:
│ ┌─────────────────────────────────────────┐
│ │ [EDITABLE TEXTAREA]                     │
│ │ You are teaching Grade 3 students...    │
│ │ [cursor can move around, text editable] │
│ └─────────────────────────────────────────┘
│
│ Question:
│ ┌─────────────────────────────────────────┐
│ │ [EDITABLE TEXTAREA]                     │
│ │ Write a complete 5-step lesson plan...  │
│ │ [cursor can move around, text editable] │
│ └─────────────────────────────────────────┘
│
│ Rubric Criteria: (read-only)
│ • Criterion 1
│ • Criterion 2
└─────────────────────────────────────────────┘
```

**Action**: Click in the Scenario textarea and add text:
```
Add to the end: " (EDITED TEST)"
```

**What happens**:
- Text appears in the textarea immediately
- State updates in real-time
- No save button needed yet

**Action**: Click the ✓ (checkmark) button

**What changes**:
- Returns to read-only view mode
- ✓ becomes ✏️ again
- Your edited text is preserved and displayed
- Light blue background gone

**What you should see**:
```
┌─────────────────────────────────────────────┐
│ Q1                                    [✏️] [🗑️] │
├─────────────────────────────────────────────┤
│ Scenario:
│ You are teaching Grade 3 students at a
│ government school in Punjab... (EDITED TEST)
│
│ Question:
│ Write a complete 5-step lesson plan...
│
│ Rubric Criteria:
│ • Criterion 1
│ • Criterion 2
└─────────────────────────────────────────────┘
```

**What to verify**:
- ✅ ✏️ button toggles to ✓
- ✅ Scenario becomes editable textarea
- ✅ Question becomes editable textarea
- ✅ Changes visible immediately
- ✅ ✓ button returns to ✏️
- ✅ Edited text persists

---

### STEP 7: Test Delete Functionality (15 seconds)

**Action**: Click the 🗑️ (trash) button on Question 2

**What happens immediately**:
- Question 2 card disappears
- "Generated Questions (2)" counter changes to "Generated Questions (1)"
- Only Question 1 remains

**What you should see**:
```
Generated Questions (1)

┌─────────────────────────────────────────────┐
│ Q1                                    [✏️] [🗑️] │
├─────────────────────────────────────────────┤
│ [Q1 with your edits from Step 6]            │
└─────────────────────────────────────────────┘

┌────────────────────────────┐
│ ✅ Save to Database        │
└────────────────────────────┘
```

**What to verify**:
- ✅ Q2 removed immediately (no confirmation)
- ✅ Counter updated to (1)
- ✅ Q1 remains with your edits
- ✅ Save button still visible

---

### STEP 8: Save to Database (10 seconds)

**Action**: Click ✅ "Save to Database" button

**What happens**:
- Button changes to: "💾 Saving..." (disabled)
- **Wait 1-2 seconds**
- Success message appears: "✅ Questions saved for [Training Name]"
- Alert/notification shows briefly

**After save completes**:
```
Learning Outcome *
┌──────────────────────────────────────────────┐
│ [empty text field]                           │
└──────────────────────────────────────────────┘

Context Summary
┌──────────────────────────────────────────────┐
│ [empty textarea]                             │
│                                              │
└──────────────────────────────────────────────┘

┌────────────────────────────┐
│ ✨ Generate Questions       │
└────────────────────────────┘
```

**What to verify**:
- ✅ Save button shows "Saving..." during request
- ✅ Success message appears
- ✅ Generated Questions section disappears
- ✅ Form clears and resets
- ✅ Ready to generate new questions

---

### STEP 9: Test With Different Training (Optional)

**Action**: Repeat Steps 3-8 with different training resource

**Examples to try**:
- Different indicator (SI2, SI3, AF1)
- Different training resource
- Different learning outcome

**Expected**: Same results with different question content

---

## Summary of What Should Work

| Feature | Status |
|---------|--------|
| System Prompt Edit | ✅ Should toggle edit mode |
| Indicator Dropdown | ✅ Should filter training options |
| Training Dropdown | ✅ Should populate form details |
| Learning Outcome Required | ✅ Should block generate if empty |
| Context Optional | ✅ Should allow empty |
| Generate Button | ✅ Should show loading state |
| 2 Questions | ✅ **Should return exactly 2** |
| Edit Button (✏️) | ✅ Should toggle edit mode |
| Edit Textareas | ✅ Should be editable and update |
| Delete Button (🗑️) | ✅ Should remove question |
| Counter Update | ✅ Should show (1) after delete |
| Save Button | ✅ Should save and reset form |

---

## Troubleshooting During Testing

### If you see an error message:
1. Check browser console (F12)
2. Note the error message
3. Try these fixes:
   - Hard refresh: Ctrl+Shift+R
   - Close and reopen browser
   - Restart npm run dev

### If Generate button doesn't work:
1. Ensure Learning Outcome is filled
2. Wait longer (up to 10 seconds)
3. Check browser console for errors

### If Edit button doesn't work:
1. Hard refresh: Ctrl+Shift+R
2. Try again on a different question
3. Check browser console for errors

### If Delete doesn't work:
1. Hard refresh: Ctrl+Shift+R
2. Try delete on different question
3. Check browser console for errors

### If only 1 question shows instead of 2:
1. This should NOT happen
2. If it does, report with error message from console

---

## Expected Timing

| Step | Time |
|------|------|
| 1. Navigate | 15s |
| 2. System Prompt | 10s |
| 3. Select Training | 20s |
| 4. Fill Fields | 30s |
| 5. Generate | 5s (wait) |
| 6. Edit Test | 30s |
| 7. Delete Test | 15s |
| 8. Save | 10s |
| 9. Optional Repeat | 3min |
| **Total** | **~3 minutes** |

---

## Success Criteria

✅ **Test passes if**:
- 2 questions generated (not 1, not 3)
- Edit button shows textareas
- Delete removes question immediately
- Counter updates correctly
- Save succeeds with success message
- Form resets after save
- No console errors

❌ **Test fails if**:
- Only 1 question generated
- Edit doesn't toggle properly
- Delete doesn't remove question
- Counter doesn't update
- Save shows error
- Console shows errors

---

## Next: Report Results

After testing, check if everything passed:

**If all passed** ✅:
- Feature is complete and working
- Ready for production use

**If something failed** ❌:
- Document which step failed
- Open browser console (F12)
- Copy any error messages
- Report with details

---

## Questions During Testing?

1. Hard refresh browser first: Ctrl+Shift+R
2. Check all 9 steps completed
3. Verify both servers running
4. Check browser console (F12) for errors
5. Review this document for the expected behavior

Good luck! 🎯
