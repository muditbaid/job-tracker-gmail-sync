function buildThreadPayload_(thread) {
  const messages = thread.getMessages();
  if (!messages.length) return null;
  const recent = messages.slice(-3);
  const body = recent.map(message => [
    `From: ${safeText_(message.getFrom())}`,
    `Date: ${formatDateTime_(message.getDate())}`,
    `Subject: ${safeText_(message.getSubject())}`,
    truncateText_(safeText_(message.getPlainBody()), 4000)
  ].join('\n')).join('\n\n---\n\n');
  const last = messages[messages.length - 1];
  return {
    id: thread.getId(),
    threadId: thread.getId(),
    gmailLink: safePermalink_(thread),
    lastMessageId: last.getId(),
    lastMessageDate: formatDateTime_(last.getDate()),
    subject: safeText_(last.getSubject()),
    from: safeText_(last.getFrom()),
    date: formatDateTime_(last.getDate()),
    body: truncateText_(body, 10000)
  };
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function safeAddLabel_(thread, label) {
  try {
    if (thread && label) thread.addLabel(label);
  } catch (error) {
    Logger.log(`Could not add label: ${error}`);
  }
}

function safeRemoveLabel_(thread, label) {
  try {
    if (thread && label) thread.removeLabel(label);
  } catch (error) {
    Logger.log(`Could not remove label: ${error}`);
  }
}

