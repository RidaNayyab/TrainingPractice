# Question Generation Pipeline - UI Walkthrough

## Opening the Pipeline

**URL**: http://localhost:5174  
Click the **⚙️ Question Pipeline** button in the header

---

## Screen 1: System Prompt Editor

```
┌─────────────────────────────────────────────────────────┐
│  🔧 System Prompt                          [Edit] [Cancel] │
├─────────────────────────────────────────────────────────┤
│  You are an expert teacher trainer...                   │
│  Generate practice questions based on:                  │
│  - Learning outcome: what teachers should be able to do │
│  - Context: key points from the training video          │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Click [Edit] to open system prompt in textarea
- Click [Cancel] to close editor
- Click 💾 Save Prompt to save to browser localStorage
- System prompt persists across browser sessions

---

## Screen 2: Training Selection

```
┌─────────────────────────────────────────────────────────┐
│  1. Select Indicator:                                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │ -- Choose an indicator --                        ▼ ││
│  │ SI1 - Instructional Clarity                       ││
│  │ SI2 - Logical Flow                                ││
│  │ SI3 - Subject Content Accuracy                    ││
│  │ AF1 - Assessment Focused                          ││
│  │ ...                                               ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  2. Select Training Resource:                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ -- Choose a training --                         ▼ ││
│  │ 5 Step Lesson Plan                                ││
│  │ Clear Learning Objectives                         ││
│  │ Using Varied Strategies                           ││
│  │ ...                                               ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Features**:
- First dropdown filters indicators
- Second dropdown shows training resources for selected indicator
- Disabled until indicator selected

---

## Screen 3: Training Details & Form

After selecting a training resource:

```
┌─────────────────────────────────────────────────────────┐
│  5 Step Lesson Plan                                     │
│  PP_00_01                                               │
│  Indicator: SI1                                         │
│                                                          │
│  📌 Rationale:                                          │
│  This video teaches the fundamentals of creating       │
│  structured lesson plans that maximize student        │
│  learning...                                            │
└─────────────────────────────────────────────────────────┘

Learning Outcome *
┌─────────────────────────────────────────────────────────┐
│ Teachers should be able to write clear 5-step...       │
└─────────────────────────────────────────────────────────┘

Context Summary
┌─────────────────────────────────────────────────────────┐
│ This video covers the importance of clear lesson       │
│ planning including the 5-step structure and how to     │
│ write measurable objectives...                          │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ ✨ Generate Questions │
└──────────────────────┘
```

**Features**:
- Training details show title, code, indicator, and rationale
- Learning Outcome is required (red asterisk)
- Context Summary is optional
- Generate button is enabled only when Learning Outcome is filled

---

## Screen 4: Generated Questions (After Clicking Generate)

```
Generated Questions (2)

┌─────────────────────────────────────────────────────────┐
│ Q1                                              [✏️] [🗑️] │
├─────────────────────────────────────────────────────────┤
│ Scenario:                                               │
│ You are teaching Grade 3 students at a government       │
│ school in Punjab. The topic is "Parts of a Plant" in   │
│ Science...                                              │
│                                                          │
│ Question:                                               │
│ Write a 5-step lesson plan for this lesson. Include     │
│ one measurable learning objective. Each step should     │
│ clearly show what you and the students will do.         │
│                                                          │
│ Rubric Criteria:                                        │
│ • The objective is measurable and uses an action verb   │
│ • The plan has exactly 5 clear steps in logical order   │
│ • At least one step involves students physically        │
│   placing name cards on the plant chart                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Q2                                              [✏️] [🗑️] │
├─────────────────────────────────────────────────────────┤
│ Scenario:                                               │
│ You teach Grade 2 English at a rural government school. │
│ Tomorrow's lesson is on "Naming Words (Nouns)"...       │
│                                                          │
│ Question:                                               │
│ Create a 5-step lesson plan with one measurable         │
│ learning objective...                                   │
│                                                          │
│ Rubric Criteria:                                        │
│ • Learning objective is specific and measurable         │
│ • Plan includes 5 sequenced steps with responses        │
│ • Plan includes independent practice                    │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│ ✅ Save to Database      │
└──────────────────────────┘
```

**Features**:
- Shows "Generated Questions (2)" counter
- Each question card has Q1, Q2 numbering
- Edit button (✏️) and Delete button (🗑️) on each card
- Scenario: teaching context
- Question: what the teacher responds to
- Rubric Criteria: evaluation checklist

---

## Screen 5: Edit Mode (Click ✏️ Button)

```
┌─────────────────────────────────────────────────────────┐
│ Q1                                              [✓] [🗑️] │
├─────────────────────────────────────────────────────────┤
│ Scenario:
│ ┌─────────────────────────────────────────────────────┐│
│ │ You are teaching Grade 3 students...               ││
│ │                                                     ││
│ │                                          [editable] ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ Question:
│ ┌─────────────────────────────────────────────────────┐│
│ │ Write a 5-step lesson plan...                      ││
│ │                                                     ││
│ │                                          [editable] ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ Rubric Criteria: (read-only)                            │
│ • The objective is measurable...                        │
│ • The plan has exactly 5 clear steps...                │
│ • At least one step involves students...               │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Edit button (✏️) changes to checkmark (✓)
- Scenario and Question fields become editable textareas
- Light blue background (#f0f7ff) indicates edit mode
- Rubric Criteria remain read-only
- Changes update in state in real-time
- Click ✓ to confirm edits and return to view mode
- Click 🗑️ to delete while editing

---

## Screen 6: After Deleting Q2

```
Generated Questions (1)

┌─────────────────────────────────────────────────────────┐
│ Q1                                              [✏️] [🗑️] │
├─────────────────────────────────────────────────────────┤
│ Scenario:                                               │
│ [edited scenario text here]                             │
│                                                          │
│ Question:                                               │
│ [edited question text here]                             │
│                                                          │
│ Rubric Criteria:                                        │
│ • The objective is measurable...                        │
│ • The plan has exactly 5 clear steps...                │
│ • At least one step involves students...               │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│ ✅ Save to Database      │
└──────────────────────────┘
```

**Features**:
- Question counter updated to "Generated Questions (1)"
- Only Q1 remains (Q2 was deleted)
- Edited text from Step 5 is preserved

---

## Screen 7: After Clicking Save to Database

```
✅ Questions saved for 5 Step Lesson Plan
```

Then the form resets:

```
Learning Outcome *
┌─────────────────────────────────────────────────────────┐
│                                                          │
└─────────────────────────────────────────────────────────┘

Context Summary
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ ✨ Generate Questions │
└──────────────────────┘
```

**Features**:
- Success message displayed as alert
- Learning Outcome field cleared
- Context Summary field cleared
- Generated Questions section hidden (set to null)
- Ready to generate new questions for same or different training

---

## Interactive Elements Summary

| Element | Type | Action | Result |
|---------|------|--------|--------|
| System Prompt [Edit] | Button | Click | Opens textarea for system prompt |
| System Prompt [Cancel] | Button | Click | Closes editor |
| 💾 Save Prompt | Button | Click | Saves to localStorage |
| Indicator Dropdown | Select | Change | Updates training options |
| Training Resource Dropdown | Select | Change | Populates form fields |
| Learning Outcome | Input | Type | Updates state |
| Context Summary | Textarea | Type | Updates state |
| ✨ Generate Questions | Button | Click | Calls API, displays 2 questions |
| ✏️ Edit Button | Button | Click | Toggles edit mode on question |
| ✓ Checkmark Button | Button | Click | Confirms edits, returns to view |
| 🗑️ Delete Button | Button | Click | Removes question from list |
| ✅ Save to Database | Button | Click | Saves questions to database |

---

## Button Styling

### Default State
- Gray/neutral background
- Smooth transitions
- Hover effects scale or change background color

### Edit Button (✏️)
- Transparent background
- Blue hover (#e3f2fd)
- Scales 1.1x on hover

### Delete Button (🗑️)
- Transparent background
- Red hover (#ffe0e0)
- Scales 1.1x on hover

### Generate Button (✨)
- Blue background (#1a5490)
- White text
- Darker on hover (#0f3a6f)
- Disables while generating

### Save Button (✅)
- Green background (#27ae60)
- White text
- Darker on hover (#1e8449)
- Disables while saving

---

## Keyboard Shortcuts (None Currently)

The UI is fully mouse/touch-driven. No keyboard shortcuts are implemented.

---

## Accessibility Notes

- All buttons have visible labels or emoji indicators
- Form fields have descriptive labels
- Textareas have placeholder text
- Success messages are displayed as alerts
- Error messages shown in red boxes

---

## Mobile Responsiveness

The layout uses:
- Responsive grid (2 columns on desktop, 1 on mobile)
- Flexible textareas and inputs
- Touch-friendly button sizes
- Maximum width constraint for readability

---

## Test This in Browser

1. Open http://localhost:5174
2. Click **⚙️ Question Pipeline**
3. Follow the screens above in order
4. Test each interactive element
5. Verify 2 questions are generated
6. Edit, delete, and save

**Expected Time**: 2-3 minutes for complete workflow

