# Job Tracker Gmail Sync

A reusable Google Apps Script that turns labeled recruiting emails into structured rows in Google Sheets using Gemini.

## Features

- Classifies application confirmations, assessments, interviews, offers, and rejections.
- Extracts company, role, location, recruiter details, dates, and job URLs.
- Updates an existing row when a Gmail thread receives a new message.
- Sends up to three recent messages for better conversational context.
- Marks uncertain results for review.
- Removes the intake label after handling, preventing repeated API calls.
- Keeps API keys and spreadsheet IDs out of source control.

## Privacy

The script sends email subjects, sender details, and up to 10,000 characters of recent message content to the Gemini API. Review your privacy requirements before using it.

## Setup

1. Create a Google Sheet and import `tracker-template.csv`.
2. Rename its tab to `Tracker`.
3. Create a standalone Apps Script project and add the files under `src/`.
4. Replace the generated manifest with `appsscript.json`.
5. In **Project Settings → Script Properties**, add:
   - `GEMINI_API_KEY`: your Gemini API key.
   - `SPREADSHEET_ID`: the ID between `/d/` and `/edit` in the Sheet URL.
6. Run `setupLabels()` once and authorize the requested access.
7. Run `testGeminiBatchConnection()`.
8. Run `runJobSync()` or `createHourlyTrigger()`.
9. Apply the Gmail label `Jobs_inbox` to recruiting threads you want processed.

The script adds `Jobs_processed` after handling a thread and `Jobs_review` when the extracted result needs attention. It removes `Jobs_inbox` after successful handling. A future email can be processed by applying `Jobs_inbox` again.

## Configuration

Edit `src/config.gs` to change labels, batching, model name, time zone, or confidence threshold. Request limits in this project are local safety limits, not a guarantee of your Gemini account quota.

## Spreadsheet columns

The template contains all required columns:

`Role`, `Company`, `Industry`, `Location`, `Job URL`, `Status`, `Apply Date`, `Deadline`, `Interview Date`, `HR Contact`, `Contact Email`, `Needs Review`, `Gmail Link`, `Match Key`, `Thread ID`, `Last Updated`, `Parser Confidence`, `Raw Status`, `Last Message ID`, and `Last Gmail Message Date`.

## Notes

- Low-confidence results are written but flagged for review.
- `Rejected` is terminal except that an existing `Offer` is preserved.
- The Gemini Interactions endpoint is beta and may require maintenance if its response shape changes.
- Never commit `.clasp.json`, API keys, or a live spreadsheet export.

## License

MIT

