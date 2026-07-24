# 🚀 Job Tracker Gmail Sync (Powered by Gemini AI)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Gemini API](https://img.shields.io/badge/Gemini%20API-8E75B2?style=flat&logo=googlebard&logoColor=white)](https://aistudio.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A lightweight, zero-cost Google Apps Script pipeline that turns your cluttered Gmail inbox of job applications into a neatly organized Google Sheet using the Gemini API. 

Stop manually entering application statuses. Let AI read your recruiting emails and build your tracker for you.

> **📸 Add a screenshot or GIF here showing the Google Sheet populating!**
> *(Tip: Take a screenshot of your working tracker, upload it to this repo, and link it here to show off the final result.)*

---

## ✨ Features

* **🧠 AI-Powered Classification:** Automatically detects and categorizes Application Confirmations, Assessments/OAs, Interviews, Offers, and Rejections.
* **🔍 Deep Extraction:** Pulls out the real company name, role, location, recruiter details, dates, and ATS job URLs directly from the email body.
* **🔄 Smart Syncing:** Updates existing rows dynamically when a Gmail thread receives a new message (e.g., moving an "Applied" status to "Interview").
* **⚙️ Context-Aware:** Sends up to three recent messages to Gemini for highly accurate conversational context.
* **✅ Confidence Flagging:** Marks low-confidence parsing results for manual review, so nothing slips through the cracks.
* **🧹 Inbox Cleanup:** Automatically applies a `Jobs_processed` label and removes it from the intake queue to prevent duplicate API calls.
* **🔒 Secure by Design:** Keeps your API keys and Spreadsheet IDs strictly out of source control.

---

## 🛠️ Setup & Installation

### 1. Prepare Your Sheet
1. Create a new Google Sheet and import the `tracker-template.csv` from this repository.
2. Rename the tab exactly to **`Tracker`**.

### 2. Configure Apps Script
1. Go to **Extensions > Apps Script** in your Google Sheet.
2. Replace the generated code with the files found in the `src/` directory.
3. Replace the generated `appsscript.json` manifest with the one provided in this repo.

### 3. Add Environment Variables
In your Apps Script editor, navigate to **Project Settings** (the gear icon ⚙️) → **Script Properties**, and add the following:
* `GEMINI_API_KEY`: Your Gemini API key from [Google AI Studio](https://aistudio.google.com/).
* `SPREADSHEET_ID`: The ID of your Google Sheet (found in the URL between `/d/` and `/edit`).

### 4. Initialize & Authorize
1. Select the `setupLabels` function from the toolbar dropdown and hit **Run**. 
2. Grant the required permissions when Google prompts you. 
3. Run `testGeminiBatchConnection` to verify your API key is working.
4. Finally, run `createHourlyTrigger` to set the script to run automatically every hour in the background.

---

## 🚀 How to Use It

1. Go to your Gmail inbox.
2. Apply the label **`Jobs_inbox`** to any recruiting thread you want tracked.
3. Relax. The script runs hourly, batches the emails, asks Gemini to extract the data, drops it into your Sheet, and swaps the label to **`Jobs_processed`**. 
*(Note: You can also manually run `runJobSync` from the Apps Script editor to process them instantly).*

---

## 📊 Output Data Columns

The script automatically maps extracted data to these required columns:

| Core Info | Dates | Contact & Tracking | System (Hidden/Auto) |
| :--- | :--- | :--- | :--- |
| Role | Apply Date | HR Contact | Match Key |
| Company | Deadline | Contact Email | Thread ID |
| Industry | Interview Date | Needs Review | Last Updated |
| Location | | Gmail Link | Parser Confidence |
| Job URL | | | Raw Status |
| Status | | | Last Message ID |

---

## ⚙️ Configuration

Want to tweak the limits? Edit `src/config.gs` to change labels, batch sizes, the model name (defaults to `gemini-3.5-flash-lite`), time zones, or confidence thresholds. 

> **Note:** The request limits set in this project are local Apps Script timeout safety limits (e.g., 15 batches per run), not a reflection of your actual Google AI Studio quota.

---

## 🛡️ Privacy Warning

This script sends email subjects, sender details, and up to 10,000 characters of recent message content to the external Gemini API. **Review your personal privacy requirements before using it.**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
