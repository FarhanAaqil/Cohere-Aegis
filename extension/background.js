import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

let session = null;
let clockedIn = false;
let historyBuffer = [];
let currentFocus = { url: null, title: null, startedAt: null };
let lastScreenshotAt = null;
let lastScreenshotError = null;

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const SCREENSHOT_MINUTES = 15;
const INITIAL_SCREENSHOT_DELAY_MINUTES = 0.1;

chrome.storage.local.get(['session', 'clockedIn', 'lastScreenshotAt'], (data) => {
  if (data.session) session = data.session;
  clockedIn = !!data.clockedIn;
  lastScreenshotAt = data.lastScreenshotAt || null;
  if (session && clockedIn) resumeMonitoring(false);
});

chrome.runtime.onInstalled.addListener(() => injectIntoOpenTabs());
chrome.runtime.onStartup.addListener(() => injectIntoOpenTabs());

async function injectIntoOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch {
        /* chrome:// or no permission */
      }
    }
  } catch {
    /* scripting not available */
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_STATUS') {
    sendResponse({
      ok: true,
      hasSession: !!session,
      clockedIn,
      lastScreenshotAt,
      lastScreenshotError,
    });
    return false;
  }

  if (msg.type === 'LOGIN_SUCCESS') {
    chrome.storage.local.get('session', (data) => {
      session = data.session;
      sendResponse?.({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SAVE_SESSION' || msg.type === 'ACTIVATE_MONITORING') {
    applySession(msg.token, msg.user);
    if (clockedIn) resumeMonitoring(false);
    sendResponse?.({ ok: true });
    return false;
  }

  if (msg.type === 'CLOCKED_IN') {
    applySession(msg.token, msg.user);
    setClockedIn(true);
    sendResponse?.({ ok: true });
    return false;
  }

  if (msg.type === 'CLOCKED_OUT') {
    setClockedIn(false);
    sendResponse?.({ ok: true });
    return false;
  }

  if (msg.type === 'LOGOUT_SUCCESS' || msg.type === 'DEACTIVATE_MONITORING') {
    stopMonitoring();
    chrome.storage.local.remove(['session', 'clockedIn']);
    sendResponse?.({ ok: true });
  }
});

function applySession(token, user) {
  if (!token) return;
  session = {
    access_token: token,
    user: user || session?.user || {},
  };
  chrome.storage.local.set({ session });
}

function resumeMonitoring(resetScreenshotTimer) {
  if (!session || !clockedIn) return;
  chrome.alarms.create('history_flush', { delayInMinutes: 1, periodInMinutes: 1 });
  captureActiveTab();
  armScreenshotAlarm(resetScreenshotTimer);
  scheduleInitialScreenshot(resetScreenshotTimer);
}

function pauseMonitoring() {
  commitCurrentFocus();
  flushHistoryBuffer();
  currentFocus = { url: null, title: null, startedAt: null };
  chrome.alarms.clear('screenshot_alarm');
  chrome.alarms.clear('screenshot_initial');
  chrome.alarms.clear('history_flush');
  chrome.alarms.clear('status_poll');
  historyBuffer = [];
}

function stopMonitoring() {
  pauseMonitoring();
  session = null;
  clockedIn = false;
}

function setClockedIn(next) {
  const turningOn = !!next && !clockedIn;
  const turningOff = !next && clockedIn;
  clockedIn = !!next;
  chrome.storage.local.set({ clockedIn });
  if (turningOn) {
    console.log('Clocked in — monitoring started');
    resumeMonitoring(true);
  } else if (clockedIn) {
    resumeMonitoring(false);
  } else if (turningOff) {
    console.log('Clocked out — monitoring stopped');
    pauseMonitoring();
  }
}

function armScreenshotAlarm(reset = false) {
  chrome.alarms.get('screenshot_alarm', (alarm) => {
    if (alarm && !reset) return;
    chrome.alarms.create('screenshot_alarm', {
      delayInMinutes: SCREENSHOT_MINUTES,
      periodInMinutes: SCREENSHOT_MINUTES,
    });
    console.log(`Screenshot alarm armed: first scheduled capture in ${SCREENSHOT_MINUTES} minutes, then every ${SCREENSHOT_MINUTES} minutes`);
  });
}

function scheduleInitialScreenshot(force = false) {
  const last = lastScreenshotAt ? Date.parse(lastScreenshotAt) : 0;
  const due = !last || Date.now() - last >= SCREENSHOT_MINUTES * 60 * 1000;
  if (!force && !due) return;
  chrome.alarms.create('screenshot_initial', { delayInMinutes: INITIAL_SCREENSHOT_DELAY_MINUTES });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!session || !clockedIn) return;
  if (alarm.name === 'screenshot_alarm' || alarm.name === 'screenshot_initial') takeScreenshot();
  if (alarm.name === 'history_flush') {
    commitCurrentFocus(true);
    flushHistoryBuffer();
  }
});

function isTrackableUrl(url) {
  if (!url) return false;
  return !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('about:');
}

function commitCurrentFocus(resetStart = false) {
  if (!session || !currentFocus.url || !currentFocus.startedAt) {
    if (resetStart && currentFocus.url) currentFocus.startedAt = Date.now();
    return;
  }
  const seconds = Math.max(1, Math.round((Date.now() - currentFocus.startedAt) / 1000));
  historyBuffer.push({
    url: currentFocus.url,
    title: currentFocus.title || '',
    visited_at: new Date(currentFocus.startedAt).toISOString(),
    duration_seconds: seconds,
  });
  if (resetStart) currentFocus.startedAt = Date.now();
  else currentFocus = { url: null, title: null, startedAt: null };
  if (historyBuffer.length > 50) flushHistoryBuffer();
}

function switchFocus(tab) {
  commitCurrentFocus();
  if (!tab || !isTrackableUrl(tab.url)) {
    currentFocus = { url: null, title: null, startedAt: null };
    return;
  }
  currentFocus = { url: tab.url, title: tab.title || '', startedAt: Date.now() };
}

function captureActiveTab() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs && tabs[0]) switchFocus(tabs[0]);
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!session || !clockedIn) return;
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    switchFocus(tab);
  });
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!session || !clockedIn || !tab.active) return;
  if (changeInfo.url) switchFocus(tab);
  else if (changeInfo.title && currentFocus.url === tab.url) currentFocus.title = changeInfo.title;
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (!session || !clockedIn) return;
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    commitCurrentFocus();
    return;
  }
  captureActiveTab();
});

async function findCaptureWindowId() {
  try {
    const last = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
    const activeTab = last?.tabs?.find((tab) => tab.active);
    if (last?.id != null && isTrackableUrl(activeTab?.url)) return last.id;
  } catch {
    /* ignore */
  }
  const wins = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const focused = wins.find((w) => w.focused && isTrackableUrl(w.tabs?.find((tab) => tab.active)?.url));
  const trackable = wins.find((w) => isTrackableUrl(w.tabs?.find((tab) => tab.active)?.url));
  return (focused || trackable)?.id ?? null;
}

async function takeScreenshot() {
  if (!session || !clockedIn) {
    console.warn('Screenshot skipped: not clocked in or no session');
    return;
  }
  try {
    const windowId = await findCaptureWindowId();
    if (windowId == null) {
      lastScreenshotError = 'No Chrome window to capture';
      console.warn(lastScreenshotError);
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 50 }, (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(data);
        }
      });
    });

    if (!dataUrl) return;

    const uploadRes = await fetch(`${FUNCTIONS_URL}/work-sessions/screenshots`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: dataUrl,
        taken_at: new Date().toISOString(),
        is_blurred: false,
      }),
    });

    if (!uploadRes.ok) {
      lastScreenshotError = await uploadRes.text();
      console.error('Screenshot upload failed', lastScreenshotError);
      return;
    }

    lastScreenshotAt = new Date().toISOString();
    lastScreenshotError = null;
    chrome.storage.local.set({ lastScreenshotAt });
    const result = await uploadRes.json();
    console.log('Screenshot saved', result?.screenshot?.storage_path);
  } catch (err) {
    lastScreenshotError = err.message || String(err);
    console.error('Screenshot error:', lastScreenshotError);
  }
}

async function flushHistoryBuffer() {
  if (historyBuffer.length === 0 || !session) return;
  const payload = [...historyBuffer];
  historyBuffer = [];
  try {
    const res = await fetch(`${FUNCTIONS_URL}/work-sessions/browser-history`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('History flush failed', await res.text());
      historyBuffer = payload.concat(historyBuffer);
    }
  } catch (err) {
    console.error('History flush error', err);
    historyBuffer = payload.concat(historyBuffer);
  }
}
