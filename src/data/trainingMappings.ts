// Training Mapped from FICO Observation Framework
// Indicator → Ranked Video Escalation Mapping

export interface Training {
  code: string;
  title: string;
  domain: string;
  level: string;
  url: string;
  rationale: string;
}

export interface IndicatorTraining {
  indicatorCode: string;
  name: string;
  trainings: Training[];
}

export const trainingMappings: IndicatorTraining[] = [
  {
    indicatorCode: 'SI1',
    name: 'Instructional Clarity',
    trainings: [
      {
        code: 'PP_00_01',
        title: '5 step lesson plan',
        domain: 'Pedagogical Practice',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/PP_00_01',
        rationale: 'Root fix for vague or absent goals. If teacher cannot plan, they cannot state goals.'
      },
      {
        code: 'AF_00_03',
        title: 'Quick checks for understanding',
        domain: 'Assessment and Feedback',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/AF_00_03',
        rationale: 'Once planning habit is forming, add quick checks to confirm students understand the goal.'
      },
      {
        code: 'PP_01_02_V2',
        title: 'Blooms Taxonomy',
        domain: 'Pedagogical Practice',
        level: 'L1',
        url: 'https://assetmanager.example.com/training/PP_01_02_V2',
        rationale: 'If SI1 still failing after planning + checks, teacher needs depth in goal-setting.'
      }
    ]
  },
  {
    indicatorCode: 'SI2',
    name: 'Logical Flow',
    trainings: [
      {
        code: 'PP_00_01',
        title: '5 step lesson plan',
        domain: 'Pedagogical Practice',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/PP_00_01',
        rationale: 'No lesson architecture = no flow. Start with basic planning structure.'
      },
      {
        code: 'PP_02_07',
        title: 'Using Varied Strategies to Build Understanding',
        domain: 'Pedagogical Practice',
        level: 'L2',
        url: 'https://assetmanager.example.com/training/PP_02_07',
        rationale: 'If flow is still poor after planning is solid, teacher needs variety in instructional strategies.'
      }
    ]
  },
  {
    indicatorCode: 'SI3',
    name: 'Subject Content Accuracy',
    trainings: [
      {
        code: 'CE_00_01',
        title: 'Number Sense',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_01',
        rationale: 'Number/operations errors — most common in mathematics content.'
      },
      {
        code: 'CE_00_07_V02',
        title: 'Phonic strategies part 1',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_07_V02',
        rationale: 'Phonics errors — most common in literacy content.'
      },
      {
        code: 'CE_00_14',
        title: 'بھاری اور ہلکی آوازیں (Heavy and Light Sounds)',
        domain: 'Content Expertise',
        level: 'L0',
        url: 'https://assetmanager.example.com/training/CE_00_14',
        rationale: 'Letter/sound errors — most common in Urdu language content.'
      }
    ]
  }
];

// Helper function to get trainings for an indicator
export function getTrainingsByIndicator(indicatorCode: string): IndicatorTraining | undefined {
  return trainingMappings.find(t => t.indicatorCode === indicatorCode);
}
