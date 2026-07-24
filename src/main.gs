function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Job Tracker AI')
    .addItem('Run Gmail Sync', 'runJobSync')
    .addItem('Setup Labels', 'setupLabels')
    .addItem('Create Trigger (hourly)', 'createHourlyTrigger')
    .addItem('Test Gemini Connection', 'testGeminiBatchConnection')
    .addToUi();
}

function setupLabels() {
  getOrCreateLabel_(CONFIG.INPUT_LABEL);
  getOrCreateLabel_(CONFIG.PROCESSED_LABEL);
  getOrCreateLabel_(CONFIG.REVIEW_LABEL);
}

function createHourlyTrigger() {
  const exists = ScriptApp.getProjectTriggers()
    .some(trigger => trigger.getHandlerFunction() === 'runJobSync');
  if (!exists) {
    ScriptApp.newTrigger('runJobSync').timeBased().everyHours(1).create();
  }
}

function testGeminiBatchConnection() {
  if (!canMakeGeminiRequestToday_()) {
    throw new Error('Daily Gemini request limit reached.');
  }
  const now = formatDateTime_(new Date());
  const result = callGeminiBatchClassifier_([{
    id: 'test_1',
    threadId: 'test_thread_1',
    gmailLink: 'https://mail.google.com',
    lastMessageId: 'msg_1',
    lastMessageDate: now,
    subject: 'Thank you for applying to ExampleAI',
    from: 'Recruiting <jobs@exampleai.com>',
    date: now,
    body: 'We received your application for the Software Engineer role.'
  }]);
  incrementDailyRequestCount_();
  Logger.log(JSON.stringify(result, null, 2));
}

function runJobSync() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    Logger.log('Another sync is already running.');
    return;
  }

  try {
    const sheet = getTrackerSheet_();
    const headerMap = getHeaderMap_(sheet);
    validateHeaders_(headerMap, CONFIG.REQUIRED_HEADERS);
    const index = buildSheetIndex_(sheet, headerMap);
    const labels = {
      input: getOrCreateLabel_(CONFIG.INPUT_LABEL),
      processed: getOrCreateLabel_(CONFIG.PROCESSED_LABEL),
      review: getOrCreateLabel_(CONFIG.REVIEW_LABEL)
    };

    const threads = GmailApp.search(
      `label:${CONFIG.INPUT_LABEL}`,
      0,
      CONFIG.SEARCH_BATCH_SIZE
    );
    const items = [];

    threads.forEach(thread => {
      try {
        const item = buildThreadPayload_(thread);
        if (!item) return;
        const existing = index.byThreadId[item.threadId];
        if (existing && existing.lastMessageId === item.lastMessageId) {
          safeRemoveLabel_(thread, labels.input);
          return;
        }
        items.push(item);
      } catch (error) {
        Logger.log(`Could not prepare ${thread.getId()}: ${error}`);
        safeAddLabel_(thread, labels.review);
      }
    });

    const batches = chunkArray_(items, CONFIG.GEMINI_BATCH_SIZE)
      .slice(0, CONFIG.MAX_BATCH_REQUESTS_PER_RUN);

    for (let i = 0; i < batches.length; i++) {
      if (!canMakeGeminiRequestToday_()) break;
      try {
        const results = callGeminiBatchClassifier_(batches[i]);
        incrementDailyRequestCount_();
        processBatchResults_(sheet, headerMap, index, batches[i], results, labels);
      } catch (error) {
        Logger.log(`Batch failed: ${error}`);
        batches[i].forEach(item => {
          safeAddLabel_(GmailApp.getThreadById(item.threadId), labels.review);
        });
        if (String(error).includes('429')) break;
      }
      if (i < batches.length - 1) {
        Utilities.sleep(CONFIG.MIN_MS_BETWEEN_BATCH_REQUESTS);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

