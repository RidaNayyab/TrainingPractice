import {
  IndicatorRubric,
  IndicatorTraining,
  PracticeQuestion,
} from '../types/index';

export const indicatorRubrics: IndicatorRubric[] = [
  {
    code: 'SI1',
    name: 'Clarity',
    description: 'Teacher clearly states the lesson goal',
    yesPoint: 'Teacher states "Today we are learning..."',
    partialPoint: 'Goal mentioned but vague or unclear',
    noPoint: 'No explicit goal statement',
  },
  {
    code: 'SI2',
    name: 'Logical Flow',
    description: 'Lesson progresses with clear structure',
    yesPoint: 'Clear opening, middle, end with smooth transitions',
    partialPoint: 'Basic structure present but transitions unclear',
    noPoint: 'Disjointed lesson flow',
  },
  {
    code: 'SI3',
    name: 'Content Accuracy',
    description: 'Teacher delivers stated learning accurately',
    yesPoint: 'All content is factually accurate',
    partialPoint: 'Some factual errors present',
    noPoint: 'Significant factual errors',
  },
];

export const indicatorTrainings: IndicatorTraining[] = [
  {
    indicatorCode: 'SI1',
    priority: 1,
    trainings: [
      {
        code: 'PP_00_01',
        title: '5 Step Lesson Plan',
        domain: 'Pedagogical Practice',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/PP_00_01',
      },
      {
        code: 'AF_00_03',
        title: 'Quick Checks for Understanding',
        domain: 'Assessment and Feedback',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/AF_00_03',
      },
      {
        code: 'PP_01_02',
        title: 'Blooms Taxonomy',
        domain: 'Pedagogical Practice',
        level: 'L1',
        url: 'https://assetmanager.example.com/training/PP_01_02',
      },
    ],
  },
  {
    indicatorCode: 'SI2',
    priority: 1,
    trainings: [
      {
        code: 'PP_00_01',
        title: '5 Step Lesson Plan',
        domain: 'Pedagogical Practice',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/PP_00_01',
      },
      {
        code: 'PP_02_07',
        title: 'Using Varied Strategies to Build Understanding',
        domain: 'Pedagogical Practice',
        level: 'L2',
        url: 'https://assetmanager.example.com/training/PP_02_07',
      },
    ],
  },
  {
    indicatorCode: 'SI3',
    priority: 1,
    trainings: [
      {
        code: 'CE_00_01',
        title: 'Number Sense',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_01',
      },
      {
        code: 'CE_00_07',
        title: 'Phonic Strategies Part 1',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_07',
      },
      {
        code: 'CE_00_14',
        title: 'بھاری اور ہلکی آوازیں (Heavy and Light Sounds)',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_14',
      },
    ],
  },
];

export const practiceQuestions: PracticeQuestion[] = [
  {
    id: 'PQ_SI1_01',
    indicatorCode: 'SI1',
    scenario:
      'You have 5 minutes to teach a lesson on fractions. How would you state a clear learning goal for your students?',
    inputType: 'text',
    rubricCriteria: [
      'Goal starts with "Today we are learning..." or similar',
      'Goal is specific and measurable',
      'Goal is stated within first 2 minutes',
    ],
  },
  {
    id: 'PQ_SI1_02',
    indicatorCode: 'SI1',
    scenario:
      'You need to teach students about the water cycle. Record or describe how you would introduce the lesson goal to your class.',
    inputType: 'text',
    rubricCriteria: [
      'Clear statement of what students will learn',
      'Connected to prior knowledge',
      'Engaging language that helps students understand why it matters',
    ],
  },
  {
    id: 'PQ_SI2_01',
    indicatorCode: 'SI2',
    scenario:
      'You are teaching a 20-minute lesson. Describe how you would structure it with a clear beginning, middle, and end.',
    inputType: 'text',
    rubricCriteria: [
      'Hook or engagement at the beginning',
      'Clear main teaching activities in the middle',
      'Closure or check for understanding at the end',
      'Smooth transitions between sections',
    ],
  },
  {
    id: 'PQ_SI2_02',
    indicatorCode: 'SI2',
    scenario:
      'Teach a concept of your choice while thinking aloud about your transitions. How do you move from one part of the lesson to the next?',
    inputType: 'text',
    rubricCriteria: [
      'Uses temporal markers (first, then, finally)',
      'Signals connection between activities',
      'Students understand where they are in the lesson',
    ],
  },
  {
    id: 'PQ_SI3_01',
    indicatorCode: 'SI3',
    scenario:
      'Explain the concept of place value in mathematics. Make sure your explanation is factually accurate.',
    inputType: 'text',
    rubricCriteria: [
      'Mathematical concepts are correct',
      'Examples are accurate',
      'No misconceptions introduced',
    ],
  },
  {
    id: 'PQ_SI3_02',
    indicatorCode: 'SI3',
    scenario:
      'Teach a short lesson on a subject of your choice. Ensure all content you share is accurate.',
    inputType: 'text',
    rubricCriteria: [
      'Facts and concepts are accurate',
      'Examples support the content correctly',
      'No contradictions or errors',
    ],
  },
];

export const feedbackMessages = {
  escalation: {
    1: {
      tone: 'instructional',
      prefix:
        'Here is something to focus on in your next lesson:',
    },
    2: {
      tone: 'supportive',
      prefix:
        'We noticed this is happening consistently. Here is a more targeted approach:',
    },
    3: {
      tone: 'encouraging',
      prefix:
        'You are building towards this. Take a look at this training to unlock it fully:',
    },
    4: {
      tone: 'intensified',
      prefix:
        "This is critical for your growth. Let's dig deeper with this strategy:",
    },
    5: {
      tone: 'coaching',
      prefix:
        'This needs focused support. A coach will reach out to help you master this.',
    },
  },
  byIndicator: {
    SI1: {
      1: 'Your lesson goal was not clearly stated at the start. Try using "Today we are learning..." and say it in the first 2 minutes.',
      2: 'Goals are still not being clearly communicated. Practice stating goals in one clear sentence that students can remember.',
      3: 'Clarity is essential - students need to know what they are learning. Watch this training on 5-step lesson planning.',
      SI1_feedback:
        'When your lesson goal is clear from the start, students find their own words for it — not just yours.',
    },
    SI2: {
      1: 'Your lesson felt disjointed. Plan your lesson with a clear opening, middle, and end before you teach.',
      2: 'Transitions between activities are still unclear. Use temporal markers like "First," "Then," and "Finally."',
      3: 'Logical flow helps students stay engaged. This training shows how to structure lessons for clarity.',
      SI2_feedback:
        'When your lesson has a clear structure, students stay attentive and on task throughout.',
    },
    SI3: {
      1: 'There were factual errors in your content. Check your subject knowledge before teaching.',
      2: 'Content accuracy is still inconsistent. Review the subject matter carefully before your next lesson.',
      3: 'Accurate content is non-negotiable. This training will strengthen your subject knowledge.',
      SI3_feedback:
        'When content is accurate, students build correct understanding from the start.',
    },
  },
};
