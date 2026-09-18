import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
  const loginContainer = document.getElementById('login-container');
  const statusContainer = document.getElementById('status-container');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const errorMsg = document.getElementById('error-msg');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const userEmailDisplay = document.getElementById('user-email');

  // Check if already logged in
  const { session } = await chrome.storage.local.get('session');
  if (session && session.user) {
    showStatus(session.user.email);
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (status) => {
      const el = document.getElementById('monitor-detail');
      if (!el || chrome.runtime.lastError || !status) return;
      const badge = document.getElementById('status-badge');
      const title = document.getElementById('status-title');
      if (status.clockedIn) {
        if (title) title.textContent = 'Lemon Host Monitor Active';
        if (badge) {
          badge.textContent = '● Monitoring';
          badge.style.backgroundColor = '#dcfce7';
          badge.style.color = '#166534';
        }
        el.textContent = `Clocked in — screenshots every 15 min. ${
          status.lastScreenshotAt
            ? 'Last screenshot: ' + new Date(status.lastScreenshotAt).toLocaleTimeString()
            : 'No screenshot yet'
        }.${status.lastScreenshotError ? ' Error: ' + status.lastScreenshotError : ''}`;
      } else {
        if (title) title.textContent = 'Lemon Host Monitor';
        if (badge) {
          badge.textContent = 'Idle';
          badge.style.backgroundColor = '#f1f5f9';
          badge.style.color = '#475569';
        }
        el.textContent = 'Logged in. Clock in on the website to start screenshots and history.';
      }
    });
  } else {
    showLogin();
  }

  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }
    
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.msg || 'Login failed');
      }

      const session = {
        access_token: data.token,
        user: data.user
      };

      // Save session to chrome local storage
      await chrome.storage.local.set({ session });
      showStatus(data.user.email);
      
      // Notify background script that login occurred
      chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' });
      
    } catch (err) {
      showError(err.message);
    } finally {
      loginBtn.textContent = 'Login';
      loginBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('session');
    showLogin();
    chrome.runtime.sendMessage({ type: 'LOGOUT_SUCCESS' });
  });

  function showStatus(email) {
    loginContainer.style.display = 'none';
    statusContainer.style.display = 'block';
    userEmailDisplay.textContent = email;
  }

  function showLogin() {
    loginContainer.style.display = 'block';
    statusContainer.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    errorMsg.style.display = 'none';
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }
});
