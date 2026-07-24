function getDailyRequestState_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), CONFIG.REQUEST_TIME_ZONE, 'yyyy-MM-dd');
  const saved = props.getProperty('gemini_rpd_date');
  let count = Number(props.getProperty('gemini_rpd_count') || 0);
  if (saved !== today) {
    props.setProperties({ gemini_rpd_date: today, gemini_rpd_count: '0' });
    count = 0;
  }
  return { today, count };
}

function canMakeGeminiRequestToday_() {
  return getDailyRequestState_().count < CONFIG.MAX_REQUESTS_PER_DAY;
}

function incrementDailyRequestCount_() {
  const props = PropertiesService.getScriptProperties();
  const state = getDailyRequestState_();
  const count = state.count + 1;
  props.setProperties({
    gemini_rpd_date: state.today,
    gemini_rpd_count: String(count)
  });
  return count;
}

function extractGeminiOutputText_(json) {
  const candidates = json.candidates || [];
  const parts = candidates[0] && candidates[0].content
    ? candidates[0].content.parts || []
    : [];
  return parts.map(part => part.text || '').join('');
}

function shouldForceReview_(parsed) {
  return !parsed.company || !parsed.role ||
    Number(parsed.parserConfidence) < CONFIG.MIN_CONFIDENCE_WITHOUT_REVIEW ||
    parsed.needsReview === 'TRUE';
}

function buildKey_(company, role) {
  const parts = [company, role].map(normalizeKeyPart_);
  return parts.every(Boolean) ? parts.join('||') : '';
}

function normalizeKeyPart_(value) {
  return safeText_(value).toLowerCase()
    .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanNullableText_(value) {
  const text = value == null ? '' : String(value).trim();
  return text.toLowerCase() === 'null' ? '' : text;
}

function normalizeConfidence_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function normalizeDateOrNull_(value) {
  const date = new Date(cleanNullableText_(value));
  return Number.isNaN(date.getTime()) ? '' :
    Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function extractEmailOnly_(from) {
  const match = safeText_(from).match(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );
  return match ? match[1] : '';
}

function extractNameOnly_(from) {
  return safeText_(from).replace(/<.*?>/g, '').replace(/["']/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractFirstJobUrl_(body) {
  const urls = safeText_(body).match(/https?:\/\/[^\s)>\]]+/g) || [];
  return urls.find(url =>
    /ashbyhq|greenhouse|lever|workday|smartrecruiters|icims|jobs|careers/i.test(url)
  ) || urls[0] || '';
}

function safePermalink_(thread) {
  try { return thread.getPermalink(); } catch (error) { return ''; }
}

function truncateText_(text, maxLength) {
  return safeText_(text).slice(0, maxLength);
}

function safeText_(value) {
  return String(value || '').trim();
}

function formatDateTime_(date) {
  return Utilities.formatDate(
    new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
  );
}

function chunkArray_(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
