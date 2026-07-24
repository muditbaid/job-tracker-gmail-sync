function callGeminiBatchClassifier_(emailBatch) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in Script Properties.');

  const resultSchema = {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      is_job_related: { type: 'BOOLEAN' },
      email_type: {
        type: 'STRING',
        enum: ['Applied', 'OA / Assessment', 'Interview', 'Offer', 'Rejected', 'Ignore']
      },
      raw_status: { type: 'STRING', nullable: true },
      company: { type: 'STRING', nullable: true },
      role: { type: 'STRING', nullable: true },
      industry: { type: 'STRING', nullable: true },
      location: { type: 'STRING', nullable: true },
      job_url: { type: 'STRING', nullable: true },
      hr_contact: { type: 'STRING', nullable: true },
      contact_email: { type: 'STRING', nullable: true },
      event_date: { type: 'STRING', nullable: true },
      confidence: { type: 'NUMBER' },
      needs_review: { type: 'BOOLEAN' }
    },
    required: [
      'id', 'is_job_related', 'email_type', 'company', 'role',
      'confidence', 'needs_review'
    ],
    additionalProperties: false
  };
  const schema = {
    type: 'OBJECT',
    properties: { results: { type: 'ARRAY', items: resultSchema } },
    required: ['results']
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
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };
  const endpoint = `${CONFIG.GEMINI_URL}/${CONFIG.GEMINI_MODEL}:generateContent`;
  const response = UrlFetchApp.fetch(endpoint, {
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
