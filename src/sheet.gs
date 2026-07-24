function processBatchResults_(sheet, headers, index, batch, results, labels) {
  const byId = {};
  results.forEach(result => byId[String(result.id)] = result);
  batch.forEach(item => {
    const thread = GmailApp.getThreadById(item.threadId);
    const result = byId[item.id];
    if (!result) {
      safeAddLabel_(thread, labels.review);
      return;
    }
    if (!result.is_job_related || result.email_type === 'Ignore') {
      safeAddLabel_(thread, labels.processed);
      safeRemoveLabel_(thread, labels.input);
      return;
    }
    const parsed = normalizeParsedResult_(result, item);
    const forceReview = shouldForceReview_(parsed);
    const existing = index.byThreadId[item.threadId];
    const rowIndex = existing
      ? updateApplication_(sheet, headers, existing.rowIndex, parsed, forceReview)
      : appendApplication_(sheet, headers, parsed, forceReview);
    index.byThreadId[item.threadId] = {
      rowIndex,
      lastMessageId: parsed.lastMessageId
    };
    if (forceReview) safeAddLabel_(thread, labels.review);
    safeAddLabel_(thread, labels.processed);
    safeRemoveLabel_(thread, labels.input);
  });
}

function normalizeParsedResult_(result, item) {
  const company = cleanNullableText_(result.company);
  const role = cleanNullableText_(result.role);
  const status = cleanNullableText_(result.email_type);
  const eventDate = normalizeDateOrNull_(result.event_date);
  const confidence = normalizeConfidence_(result.confidence);
  return {
    role, company,
    industry: cleanNullableText_(result.industry),
    location: cleanNullableText_(result.location),
    jobUrl: cleanNullableText_(result.job_url) || extractFirstJobUrl_(item.body),
    status,
    applyDate: status === 'Applied' ? eventDate || item.lastMessageDate.slice(0, 10) : '',
    deadline: '',
    interviewDate: status === 'Interview' ? eventDate : '',
    hrContact: cleanNullableText_(result.hr_contact) || extractNameOnly_(item.from),
    contactEmail: cleanNullableText_(result.contact_email) || extractEmailOnly_(item.from),
    needsReview: result.needs_review ? 'TRUE' : 'FALSE',
    gmailLink: item.gmailLink,
    matchKey: buildKey_(company, role),
    threadId: item.threadId,
    lastUpdated: formatDateTime_(new Date()),
    parserConfidence: String(confidence),
    rawStatus: cleanNullableText_(result.raw_status) || status,
    lastMessageId: item.lastMessageId,
    lastGmailMessageDate: item.lastMessageDate
  };
}

function getTrackerSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = id
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Set SPREADSHEET_ID in Script Properties.');
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found.`);
  return sheet;
}

function getHeaderMap_(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = sheet.getRange(1, 1, Math.min(lastRow, 30), sheet.getLastColumn())
    .getDisplayValues();
  const rowOffset = values.findIndex(row =>
    row.includes('Role') && row.includes('Company') && row.includes('Status')
  );
  if (rowOffset < 0) throw new Error('Could not find the header row.');
  const map = { __HEADER_ROW__: rowOffset + 1 };
  values[rowOffset].forEach((value, index) => {
    const header = safeText_(value);
    if (header) map[header] = index + 1;
  });
  return map;
}

function validateHeaders_(headers, required) {
  const missing = required.filter(header => !headers[header]);
  if (missing.length) throw new Error(`Missing headers: ${missing.join(', ')}`);
}

function buildSheetIndex_(sheet, headers) {
  const index = { byThreadId: {} };
  const firstRow = headers.__HEADER_ROW__ + 1;
  if (sheet.getLastRow() < firstRow) return index;
  const rows = sheet.getRange(
    firstRow, 1, sheet.getLastRow() - headers.__HEADER_ROW__, sheet.getLastColumn()
  ).getValues();
  rows.forEach((row, offset) => {
    const threadId = safeText_(row[headers['Thread ID'] - 1]);
    if (threadId) {
      index.byThreadId[threadId] = {
        rowIndex: firstRow + offset,
        lastMessageId: safeText_(row[headers['Last Message ID'] - 1])
      };
    }
  });
  return index;
}

function appendApplication_(sheet, headers, parsed, forceReview) {
  const row = new Array(sheet.getLastColumn()).fill('');
  writeParsedToRow_(row, headers, parsed, forceReview, false);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateApplication_(sheet, headers, rowIndex, parsed, forceReview) {
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const oldKey = safeText_(row[headers['Match Key'] - 1]);
  if (oldKey && parsed.matchKey && oldKey !== parsed.matchKey) {
    forceReview = true;
  }
  writeParsedToRow_(row, headers, parsed, forceReview, true);
  sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).setValues([row]);
  return rowIndex;
}

function writeParsedToRow_(row, h, p, review, preserve) {
  const set = (name, value) => {
    if (!preserve || !safeText_(row[h[name] - 1])) row[h[name] - 1] = value;
  };
  set('Role', p.role); set('Company', p.company); set('Industry', p.industry);
  set('Location', p.location); set('Job URL', p.jobUrl);
  set('Apply Date', p.applyDate); set('Deadline', p.deadline);
  set('HR Contact', p.hrContact); set('Contact Email', p.contactEmail);
  set('Gmail Link', p.gmailLink); set('Match Key', p.matchKey);
  if (p.interviewDate) row[h['Interview Date'] - 1] = p.interviewDate;
  const current = safeText_(row[h.Status - 1]);
  row[h.Status - 1] = chooseBetterStatus_(current, p.status);
  row[h['Needs Review'] - 1] =
    review || p.needsReview === 'TRUE' ? 'TRUE' : row[h['Needs Review'] - 1];
  row[h['Thread ID'] - 1] = p.threadId;
  row[h['Last Updated'] - 1] = p.lastUpdated;
  row[h['Parser Confidence'] - 1] = p.parserConfidence;
  row[h['Raw Status'] - 1] = p.rawStatus;
  row[h['Last Message ID'] - 1] = p.lastMessageId;
  row[h['Last Gmail Message Date'] - 1] = p.lastGmailMessageDate;
}

function chooseBetterStatus_(current, incoming) {
  if (!current) return incoming || '';
  if (!incoming) return current;
  if (incoming === 'Rejected' && current === 'Offer') return current;
  return (CONFIG.STATUS_ORDER[incoming] ?? -1) >=
    (CONFIG.STATUS_ORDER[current] ?? -1) ? incoming : current;
}

