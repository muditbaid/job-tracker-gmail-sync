const CONFIG = {
  SHEET_NAME: 'Tracker',
  INPUT_LABEL: 'Jobs_inbox',
  PROCESSED_LABEL: 'Jobs_processed',
  REVIEW_LABEL: 'Jobs_review',
  SEARCH_BATCH_SIZE: 40,
  GEMINI_BATCH_SIZE: 5,
  MAX_BATCH_REQUESTS_PER_RUN: 15,
  MIN_MS_BETWEEN_BATCH_REQUESTS: 5000,
  MAX_REQUESTS_PER_DAY: 450,
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  REQUEST_TIME_ZONE: 'America/Los_Angeles',
  MIN_CONFIDENCE_WITHOUT_REVIEW: 0.8,
  REQUIRED_HEADERS: [
    'Role', 'Company', 'Industry', 'Location', 'Job URL', 'Status',
    'Apply Date', 'Deadline', 'Interview Date', 'HR Contact',
    'Contact Email', 'Needs Review', 'Gmail Link', 'Match Key',
    'Thread ID', 'Last Updated', 'Parser Confidence', 'Raw Status',
    'Last Message ID', 'Last Gmail Message Date'
  ],
  STATUS_ORDER: {
    'Not Started': 0,
    'Applied': 1,
    'OA / Assessment': 2,
    'Interview': 3,
    'Offer': 4,
    'Rejected': 5
  }
};
