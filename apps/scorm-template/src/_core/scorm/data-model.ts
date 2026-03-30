export const SCORM12 = {
  CORE_CHILDREN: "cmi.core._children",
  CORE_STUDENT_ID: "cmi.core.student_id",
  CORE_STUDENT_NAME: "cmi.core.student_name",
  CORE_LESSON_LOCATION: "cmi.core.lesson_location",
  CORE_CREDIT: "cmi.core.credit",
  CORE_LESSON_STATUS: "cmi.core.lesson_status",
  CORE_ENTRY: "cmi.core.entry",
  CORE_SCORE_CHILDREN: "cmi.core.score._children",
  CORE_SCORE_RAW: "cmi.core.score.raw",
  CORE_SCORE_MAX: "cmi.core.score.max",
  CORE_SCORE_MIN: "cmi.core.score.min",
  CORE_TOTAL_TIME: "cmi.core.total_time",
  CORE_LESSON_MODE: "cmi.core.lesson_mode",
  CORE_EXIT: "cmi.core.exit",
  CORE_SESSION_TIME: "cmi.core.session_time",
  SUSPEND_DATA: "cmi.suspend_data",
  LAUNCH_DATA: "cmi.launch_data",
  COMMENTS: "cmi.comments",
  COMMENTS_FROM_LMS: "cmi.comments_from_lms",
  OBJECTIVES_CHILDREN: "cmi.objectives._children",
  OBJECTIVES_COUNT: "cmi.objectives._count",
  STUDENT_DATA_CHILDREN: "cmi.student_data._children",
  STUDENT_DATA_MASTERY_SCORE: "cmi.student_data.mastery_score",
  STUDENT_DATA_MAX_TIME_ALLOWED: "cmi.student_data.max_time_allowed",
  STUDENT_DATA_TIME_LIMIT_ACTION: "cmi.student_data.time_limit_action",
  STUDENT_PREFERENCE_CHILDREN: "cmi.student_preference._children",
  STUDENT_PREFERENCE_AUDIO: "cmi.student_preference.audio",
  STUDENT_PREFERENCE_LANGUAGE: "cmi.student_preference.language",
  STUDENT_PREFERENCE_SPEED: "cmi.student_preference.speed",
  STUDENT_PREFERENCE_TEXT: "cmi.student_preference.text",
  INTERACTIONS_CHILDREN: "cmi.interactions._children",
  INTERACTIONS_COUNT: "cmi.interactions._count",
} as const;

export type Scorm12Element = (typeof SCORM12)[keyof typeof SCORM12];

export const scorm12Objective = (index: number) =>
  ({
    id: `cmi.objectives.${index}.id`,
    scoreChildren: `cmi.objectives.${index}.score._children`,
    scoreRaw: `cmi.objectives.${index}.score.raw`,
    scoreMax: `cmi.objectives.${index}.score.max`,
    scoreMin: `cmi.objectives.${index}.score.min`,
    status: `cmi.objectives.${index}.status`,
  }) as const;

export const scorm12Interaction = (index: number) =>
  ({
    id: `cmi.interactions.${index}.id`,
    objectivesCount: `cmi.interactions.${index}.objectives._count`,
    objectiveId: (objectiveIndex: number) =>
      `cmi.interactions.${index}.objectives.${objectiveIndex}.id`,
    time: `cmi.interactions.${index}.time`,
    type: `cmi.interactions.${index}.type`,
    correctResponsesCount: `cmi.interactions.${index}.correct_responses._count`,
    correctResponsePattern: (responseIndex: number) =>
      `cmi.interactions.${index}.correct_responses.${responseIndex}.pattern`,
    weighting: `cmi.interactions.${index}.weighting`,
    studentResponse: `cmi.interactions.${index}.student_response`,
    result: `cmi.interactions.${index}.result`,
    latency: `cmi.interactions.${index}.latency`,
  }) as const;

export const SCORM2004 = {
  VERSION: "cmi._version",
  COMMENTS_FROM_LEARNER_CHILDREN: "cmi.comments_from_learner._children",
  COMMENTS_FROM_LEARNER_COUNT: "cmi.comments_from_learner._count",
  COMMENTS_FROM_LMS_CHILDREN: "cmi.comments_from_lms._children",
  COMMENTS_FROM_LMS_COUNT: "cmi.comments_from_lms._count",
  COMPLETION_STATUS: "cmi.completion_status",
  COMPLETION_THRESHOLD: "cmi.completion_threshold",
  CREDIT: "cmi.credit",
  ENTRY: "cmi.entry",
  EXIT: "cmi.exit",
  INTERACTIONS_CHILDREN: "cmi.interactions._children",
  INTERACTIONS_COUNT: "cmi.interactions._count",
  LAUNCH_DATA: "cmi.launch_data",
  LEARNER_ID: "cmi.learner_id",
  LEARNER_NAME: "cmi.learner_name",
  LEARNER_PREFERENCE_CHILDREN: "cmi.learner_preference._children",
  LEARNER_PREFERENCE_AUDIO_LEVEL: "cmi.learner_preference.audio_level",
  LEARNER_PREFERENCE_LANGUAGE: "cmi.learner_preference.language",
  LEARNER_PREFERENCE_DELIVERY_SPEED: "cmi.learner_preference.delivery_speed",
  LEARNER_PREFERENCE_AUDIO_CAPTIONING:
    "cmi.learner_preference.audio_captioning",
  LOCATION: "cmi.location",
  MAX_TIME_ALLOWED: "cmi.max_time_allowed",
  MODE: "cmi.mode",
  OBJECTIVES_CHILDREN: "cmi.objectives._children",
  OBJECTIVES_COUNT: "cmi.objectives._count",
  PROGRESS_MEASURE: "cmi.progress_measure",
  SCALED_PASSING_SCORE: "cmi.scaled_passing_score",
  SCORE_CHILDREN: "cmi.score._children",
  SCORE_SCALED: "cmi.score.scaled",
  SCORE_RAW: "cmi.score.raw",
  SCORE_MIN: "cmi.score.min",
  SCORE_MAX: "cmi.score.max",
  SESSION_TIME: "cmi.session_time",
  SUCCESS_STATUS: "cmi.success_status",
  SUSPEND_DATA: "cmi.suspend_data",
  TIME_LIMIT_ACTION: "cmi.time_limit_action",
  TOTAL_TIME: "cmi.total_time",
  ADL_NAV_REQUEST: "adl.nav.request",
  ADL_NAV_REQUEST_VALID_CONTINUE: "adl.nav.request_valid.continue",
  ADL_NAV_REQUEST_VALID_PREVIOUS: "adl.nav.request_valid.previous",
} as const;

export type Scorm2004Element = (typeof SCORM2004)[keyof typeof SCORM2004];

export const scorm2004CommentsFromLearner = (index: number) =>
  ({
    comment: `cmi.comments_from_learner.${index}.comment`,
    location: `cmi.comments_from_learner.${index}.location`,
    timestamp: `cmi.comments_from_learner.${index}.timestamp`,
  }) as const;

export const scorm2004CommentsFromLms = (index: number) =>
  ({
    comment: `cmi.comments_from_lms.${index}.comment`,
    location: `cmi.comments_from_lms.${index}.location`,
    timestamp: `cmi.comments_from_lms.${index}.timestamp`,
  }) as const;

export const scorm2004Objective = (index: number) =>
  ({
    id: `cmi.objectives.${index}.id`,
    scoreChildren: `cmi.objectives.${index}.score._children`,
    scoreScaled: `cmi.objectives.${index}.score.scaled`,
    scoreRaw: `cmi.objectives.${index}.score.raw`,
    scoreMin: `cmi.objectives.${index}.score.min`,
    scoreMax: `cmi.objectives.${index}.score.max`,
    successStatus: `cmi.objectives.${index}.success_status`,
    completionStatus: `cmi.objectives.${index}.completion_status`,
    progressMeasure: `cmi.objectives.${index}.progress_measure`,
    description: `cmi.objectives.${index}.description`,
  }) as const;

export const scorm2004Interaction = (index: number) =>
  ({
    id: `cmi.interactions.${index}.id`,
    type: `cmi.interactions.${index}.type`,
    objectivesCount: `cmi.interactions.${index}.objectives._count`,
    objectiveId: (objectiveIndex: number) =>
      `cmi.interactions.${index}.objectives.${objectiveIndex}.id`,
    timestamp: `cmi.interactions.${index}.timestamp`,
    correctResponsesCount: `cmi.interactions.${index}.correct_responses._count`,
    correctResponsePattern: (responseIndex: number) =>
      `cmi.interactions.${index}.correct_responses.${responseIndex}.pattern`,
    weighting: `cmi.interactions.${index}.weighting`,
    learnerResponse: `cmi.interactions.${index}.learner_response`,
    result: `cmi.interactions.${index}.result`,
    latency: `cmi.interactions.${index}.latency`,
    description: `cmi.interactions.${index}.description`,
  }) as const;

export const scorm2004NavChoiceTarget = (target: string) =>
  `adl.nav.request_valid.choice.{target=${target}}`;

export const scorm2004NavJumpTarget = (target: string) =>
  `adl.nav.request_valid.jump.{target=${target}}`;
