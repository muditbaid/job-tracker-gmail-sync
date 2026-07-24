function callGeminiBatchClassifier_(emailBatch) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in Script Properties.');

  const resultSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      is_job_related: { type: 'boolean' },
      email_type: {
        type: 'string',
        enum: ['Applied', 'OA / Assessment', 'Interview', 'Offer', 'Rejected', 'Ignore']
      },
      raw_status: { type: ['string', 'null'] },
      company: { type: ['string', 'null'] },
      role: { type: ['string', 'null'] },
      industry: { type: ['string', 'null'] },
      location: { type: ['string', 'null'] },
      job_url: { type: ['string', 'null'] },
      hr_contact: { type: ['string', 'null'] },
      contact_email: { type: ['string', 'null'] },
      event_date: { type: ['string', 'null'] },
      confidence: { type: 'number' },
      needs_review: { type: 'boolean' }
    },
    required: [
      'id', 'is_job_related', 'email_type', 'company', 'role',
      'confidence', 'needs_review'
    ],
    additionalProperties: false
  };
  const schema = {
    type: 'object',
    properties: { results: { type: 'array', items: resultSchema } },
    required: ['results'],
    additionalProperties: false
  };
  const prompt = [
    'Classify Gmail messages for a job application tracker.',
    'Return only JSON matching the supplied schema.',
    'Preserve each input id exactly and treat each thread independently.',
    'Use Applied for application receipts; OA / Assessment for tests;',
    'Interview for interviews or recruiter screens; Offer for offers;',
    'Rejected when the employer is not moving forward; otherwise Ignore.',
    'Extract the hiring company rather than an ATS vendor. Use null when unknown.',
    'Do not infer facts that the email does not support.',
    `Emails:\n${JSON.stringify(emailBatch)}`
  ].join('\n');
  const payload = {
    model: CONFIG.GEMINI_MODEL,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema
    }
  };
  const response = UrlFetchApp.fetch(CONFIG.GEMINI_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(`Gemini API error ${code}: ${text}`);
  }
  const outputText = extractGeminiOutputText_(JSON.parse(text));
  if (!outputText) throw new Error('Gemini response did not contain output text.');
  return JSON.parse(outputText).results || [];
}

