let audioCtx;
let wakeLock = null;

const TimerStates = {
  STOPPED: 'stopped',
  COUNTDOWN: 'countdown',
  RUNNING: 'running'
};

// DOM elements
const timerDisplay = document.getElementById('timer');
const startButton = document.getElementById('startButton');
const countdownMessage = document.getElementById('countdownMessage');
const progressBar = document.getElementById('progress-bar');
const countdownTimeInput = document.getElementById('countdownTime');
const audioEnabledCheckbox = document.getElementById('audioEnabled');
const vibrationEnabledCheckbox = document.getElementById('vibrationEnabled');
const historyList = document.getElementById('history-list');

// Default settings
let settings = {
  countdownTime: 10,
  audioEnabled: true,
  vibrationEnabled: true
};

// Timer variables
let countdownInterval;
let apneaInterval;
let currentTimerValue = settings.countdownTime;
let startTime;
let timerState = TimerStates.STOPPED;
let sessionHistory = [];

// Load settings and history from local storage
loadSettings();
loadHistory();
updateUI();

// Event listeners
startButton.addEventListener('click', handleButtonClick);
countdownTimeInput.addEventListener('change', updateCountdownTime);
audioEnabledCheckbox.addEventListener('change', updateAudioSetting);
vibrationEnabledCheckbox.addEventListener('change', updateVibrationSetting);

function updateCountdownTime() {
  settings.countdownTime = parseInt(countdownTimeInput.value) || 10;
  currentTimerValue = settings.countdownTime;
  timerDisplay.textContent = formatTime(currentTimerValue);
  saveSettings();
}

function updateAudioSetting() {
  settings.audioEnabled = audioEnabledCheckbox.checked;
  saveSettings();
}

function updateVibrationSetting() {
  settings.vibrationEnabled = vibrationEnabledCheckbox.checked;
  saveSettings();
}

function saveSettings() {
  localStorage.setItem('apneaTimerSettings', JSON.stringify(settings));
}

function loadSettings() {
  const savedSettings = localStorage.getItem('apneaTimerSettings');
  if (savedSettings) {
    settings = JSON.stringify(JSON.parse(savedSettings));
  }
  updateUI();
}

function updateUI() {
  countdownTimeInput.value = settings.countdownTime;
  audioEnabledCheckbox.checked = settings.audioEnabled;
  vibrationEnabledCheckbox.checked = settings.vibrationEnabled;
  currentTimerValue = settings.countdownTime;
  timerDisplay.textContent = formatTime(currentTimerValue);
}

function loadHistory() {
  const savedHistory = localStorage.getItem('apneaTimerHistory');
  if (savedHistory) {
    sessionHistory = JSON.parse(savedHistory);
    displayHistory();
  }
}

function saveHistory() {
  localStorage.setItem('apneaTimerHistory', JSON.stringify(sessionHistory));
  displayHistory();
}

function displayHistory() {
  historyList.innerHTML = '';

  // Show the last 5 sessions
  const recentSessions = sessionHistory.slice(-5).reverse();

  if (recentSessions.length === 0) {
    historyList.innerHTML = '<p>No sessions recorded yet</p>';
    return;
  }

  recentSessions.forEach((session, index) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span>Session #${sessionHistory.length - index}</span>
      <span>${formatTime(session.duration)}</span>
      <span>${new Date(session.date).toLocaleDateString()}</span>
    `;
    historyList.appendChild(item);
  });
}

function handleButtonClick() {
  if (timerState === TimerStates.STOPPED) {
    startCountdown();
  } else if (timerState === TimerStates.COUNTDOWN) {
    stopCountdown();
  } else if (timerState === TimerStates.RUNNING) {
    stopApneaTimer();
  }
}

async function startCountdown() {
  // Request wake lock to prevent screen from sleeping
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.log(`Wake Lock error: ${err.name}, ${err.message}`);
  }

  startButton.textContent = "Cancel";
  startButton.style.backgroundColor = "#f44336";
  timerState = TimerStates.COUNTDOWN;
  currentTimerValue = settings.countdownTime;

  // Initialize AudioContext on user interaction
  if (settings.audioEnabled && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  countdownMessage.textContent = "Get Ready...";
  timerDisplay.textContent = formatTime(currentTimerValue);

  updateProgressBar(currentTimerValue, settings.countdownTime);

  countdownInterval = setInterval(() => {
    currentTimerValue--;
    timerDisplay.textContent = formatTime(currentTimerValue);
    updateProgressBar(currentTimerValue, settings.countdownTime);

    if (currentTimerValue <= 0) {
      clearInterval(countdownInterval);
      countdownMessage.textContent = ""; // Clear countdown message
      startApneaTimer();
    } else if (currentTimerValue <= 5) {
      if (settings.audioEnabled) playBeep({ duration: 200, frequency: 1000 });
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  }, 1000);
}

function startApneaTimer() {
  startButton.textContent = "Stop";
  startButton.style.backgroundColor = "#f44336";
  timerState = TimerStates.RUNNING;
  startTime = Date.now();
  currentTimerValue = 0; // Start from 0 for stopwatch
  timerDisplay.textContent = formatTime(currentTimerValue);

  if (settings.audioEnabled) playBeep({ duration: 1000, frequency: 1000 });
  if (settings.vibrationEnabled && 'vibrate' in navigator) {
    navigator.vibrate([500, 300, 500]);
  }

  progressBar.style.width = "0%";
  progressBar.style.backgroundColor = "#3498db";

  apneaInterval = setInterval(() => {
    currentTimerValue++;
    timerDisplay.textContent = formatTime(currentTimerValue);

    // Update progress bar every 10 seconds (different color bands)
    if (currentTimerValue % 10 === 0) {
      let percentage = (currentTimerValue % 60) / 60 * 100;
      progressBar.style.width = `${percentage}%`;

      // Change color based on time
      if (currentTimerValue >= 180) { // 3+ minutes - impressive
        progressBar.style.backgroundColor = "#8e44ad"; // purple
      } else if (currentTimerValue >= 120) { // 2+ minutes - great
        progressBar.style.backgroundColor = "#2ecc71"; // green
      } else if (currentTimerValue >= 60) { // 1+ minute - good
        progressBar.style.backgroundColor = "#f39c12"; // orange
      }
    }

    if (currentTimerValue % 60 === 0 && settings.audioEnabled) { // Every minute
      playMultipleBeeps(2, { frequency: 700 });
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([300, 200, 300]);
      }
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownMessage.textContent = "";
  resetUI();
}

function stopApneaTimer() {
  clearInterval(apneaInterval);

  // Release wake lock
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
    });
  }

  // Save session
  const duration = currentTimerValue;
  if (duration > 3) { // Only save sessions longer than 3 seconds
    const session = {
      duration: duration,
      date: Date.now()
    };
    sessionHistory.push(session);
    saveHistory();
  }

  resetUI();
}

function resetUI() {
  timerState = TimerStates.STOPPED;
  startButton.textContent = "Start";
  startButton.style.backgroundColor = "#4CAF50";
  currentTimerValue = settings.countdownTime;
  timerDisplay.textContent = formatTime(currentTimerValue);
  progressBar.style.width = "0%";
  progressBar.style.backgroundColor = "#4CAF50";
}

function updateProgressBar(current, total) {
  const percentage = (1 - current / total) * 100;
  progressBar.style.width = `${percentage}%`;
}

function formatTime(seconds) {
  let mins = Math.floor(seconds / 60);
  let secs = seconds % 60;
  return `${pad(mins)}:${pad(secs)}`;
}

function pad(num) {
  return num < 10 ? '0' + num : num;
}

function playBeep(options = {}) {
  if (!settings.audioEnabled) return;

  const {
    duration = 500,
    frequency = 440,
    volume = 1,
    type = 'sine',
    callback = null
  } = options;

  // Ensure AudioContext is initialized
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    if (callback) callback();
  }, duration);
}

function playMultipleBeeps(count, options = {}) {
  if (count <= 0) return;
  playBeep({
    ...options,
    callback: () => setTimeout(() => playMultipleBeeps(count - 1, options), 200)
  });
}
