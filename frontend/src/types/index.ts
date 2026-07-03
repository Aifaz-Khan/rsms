export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'RESEARCHER' | 'PARTICIPANT';
  avatar?: string;
  phone?: string;
  organization?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  slug: string;
  logo?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CLOSED';
  startDate?: string;
  endDate?: string;
  isPublic: boolean;
  allowAnonymous: boolean;
  maxResponses?: number;
  version: number;
  createdById: string;
  settings?: SurveySettings;
  theme?: SurveyTheme;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string; email: string };
  sections?: Section[];
  surveyLogic?: SurveyLogic[];
  _count?: { sections: number; responses: number };
}

export interface SurveySettings {
  showProgressBar?: boolean;
  allowBack?: boolean;
  autoSaveInterval?: number;
  tokenExpiryDays?: number;
  showSectionTitles?: boolean;
  randomizeQuestions?: boolean;
}

export interface SurveyTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

export interface Section {
  id: string;
  surveyId: string;
  title: string;
  description?: string;
  order: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  _count?: { questions: number };
}

export type QuestionType =
  | 'SHORT_TEXT' | 'LONG_TEXT' | 'EMAIL' | 'PHONE' | 'NUMBER'
  | 'DATE' | 'TIME' | 'RADIO' | 'CHECKBOX' | 'DROPDOWN'
  | 'MULTIPLE_SELECT' | 'RATING' | 'LIKERT_SCALE' | 'YES_NO'
  | 'FILE_UPLOAD' | 'SLIDER' | 'IMAGE_CHOICE';

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  title: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  tooltip?: string;
  isRequired: boolean;
  order: number;
  defaultValue?: string;
  validation?: QuestionValidation;
  settings?: QuestionSettings;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  options?: QuestionOption[];
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface QuestionSettings {
  scale?: number;
  labels?: string[];
  maxRating?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  allowMultiple?: boolean;
  acceptedFileTypes?: string[];
}

export interface QuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  order: number;
  imageUrl?: string;
}

export interface SurveyLogic {
  id: string;
  surveyId: string;
  conditionQuestionId: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
  conditionValue: string;
  action: 'JUMP_TO_SECTION' | 'JUMP_TO_QUESTION' | 'SHOW_SECTION' | 'HIDE_SECTION' | 'SHOW_QUESTION' | 'HIDE_QUESTION' | 'END_SURVEY';
  targetSectionId?: string;
  targetQuestionId?: string;
  order: number;
}

export interface Response {
  id: string;
  surveyId: string;
  participantTokenId?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  currentSectionId?: string;
  currentQuestionOrder?: number;
  startedAt: string;
  completedAt?: string;
  lastSavedAt: string;
  completionTime?: number;
  survey?: { title: string; slug: string };
  participantToken?: { email?: string; metadata?: Record<string, unknown>; createdAt: string };
  answers?: Answer[];
  _count?: { answers: number };
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  value: unknown;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
  question?: { title: string; type: QuestionType };
}

export interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  totalParticipants: number;
  completedResponses: number;
  incompleteResponses: number;
  completionRate: number;
  avgCompletionTime: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}
