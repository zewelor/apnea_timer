let audioCtx;

const TimerStates = {
  STOPPED: 'stopped',
  COUNTDOWN: 'countdown',
  RUNNING: 'running'
};

// Function to get URL parameters
function getUrlParams() {
  const params = {};
  window.location.search.substring(1).split('&').forEach(function (item) {
    const pair = item.split('=');
    if (pair[0]) {
      params[pair[0]] = decodeURIComponent(pair[1] || '');
    }
  });
  return params;
}

// Get parameters
const params = getUrlParams();

// Set default values if parameters are not provided
const countdownTime = params.countdown ? parseInt(params.countdown) : 5; // Countdown time in seconds

let timerDisplay = document.getElementById('timer');
let startButton = document.getElementById('startButton');
let countdownMessage = document.getElementById('countdownMessage');
let countdownInterval;
let apneaInterval;
let currentTimerValue = countdownTime;
timerDisplay.textContent = formatTime(currentTimerValue);

let timerState = TimerStates.STOPPED;

startButton.addEventListener('click', handleButtonClick);

function handleButtonClick() {
  if (timerState === TimerStates.STOPPED) {
    startCountdown();
  } else if (timerState === TimerStates.COUNTDOWN) {
    stopCountdown();
  } else if (timerState === TimerStates.RUNNING) {
    stopApneaTimer();
  }
}

function startCountdown() {
  startButton.textContent = "Stop";
  currentTimerValue = countdownTime;
  // Initialize AudioContext on user interaction
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  countdownMessage.textContent = "Countdown started...";
  timerDisplay.textContent = formatTime(currentTimerValue);
  countdownInterval = setInterval(() => {
    currentTimerValue--;
    timerDisplay.textContent = formatTime(currentTimerValue);
    if (currentTimerValue <= 0) {
      clearInterval(countdownInterval);
      countdownMessage.textContent = ""; // Clear countdown message
      startApneaTimer();
    } else if (currentTimerValue <= 5) {
      playBeep({ duration: 200, frequency: 1000 });
    }
  }, 1000);
}

function startApneaTimer() {
  startButton.textContent = "Stop";
  playBeep({ duration: 1000, frequency: 1000 });
  timerState = TimerStates.RUNNING;
  currentTimerValue = 0; // Start from 0 for stopwatch
  timerDisplay.textContent = formatTime(currentTimerValue);

  apneaInterval = setInterval(() => {
    currentTimerValue++;
    timerDisplay.textContent = formatTime(currentTimerValue);

    let elapsedTime = currentTimerValue;

    if (elapsedTime % 60 === 0) {
      playMultipleBeeps(elapsedTime % 60, { frequency: 700 });
    }
  }, 1000);
}

function stopApneaTimer() {
  startButton.textContent = "Restart";
  clearInterval(apneaInterval);
  timerState = TimerStates.STOPPED;
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
