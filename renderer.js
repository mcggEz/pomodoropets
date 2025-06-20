const { ipcRenderer } = require('electron');

class PomodoroTimer {
    constructor() {
        this.workTime = 25 * 60; // 25 minutes in seconds
        this.breakTime = 5 * 60; // 5 minutes in seconds
        this.longBreakTime = 15 * 60; // 15 minutes in seconds
        this.sessionsBeforeLongBreak = 4;
        
        this.currentTime = this.workTime;
        this.isRunning = false;
        this.isPaused = false;
        this.currentMode = 'work'; // 'work', 'break', 'longBreak'
        this.sessionCount = 1;
        this.timer = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timerLabel = document.getElementById('timerLabel');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.sessionCountEl = document.getElementById('sessionCount');
        this.totalSessionsEl = document.getElementById('totalSessions');
        this.modeIndicator = document.getElementById('modeIndicator');
        this.progressCircle = document.getElementById('progressCircle');
        this.cat = document.getElementById('cat');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.cancelSettings = document.getElementById('cancelSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.closeBtn = document.getElementById('closeBtn');
        
        // Settings inputs
        this.workTimeInput = document.getElementById('workTime');
        this.breakTimeInput = document.getElementById('breakTime');
        this.longBreakTimeInput = document.getElementById('longBreakTime');
        this.sessionsBeforeLongBreakInput = document.getElementById('sessionsBeforeLongBreak');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettings.addEventListener('click', () => this.saveSettings());
        this.minimizeBtn.addEventListener('click', () => this.minimizeWindow());
        this.closeBtn.addEventListener('click', () => this.closeWindow());
        
        // IPC listeners
        ipcRenderer.on('start-timer', () => this.startTimer());
        ipcRenderer.on('pause-timer', () => this.pauseTimer());
    }
    
    async loadSettings() {
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            this.workTime = settings.workTime * 60;
            this.breakTime = settings.breakTime * 60;
            this.longBreakTime = settings.longBreakTime * 60;
            this.sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
            
            this.currentTime = this.workTime;
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            const settings = {
                workTime: parseInt(this.workTimeInput.value),
                breakTime: parseInt(this.breakTimeInput.value),
                longBreakTime: parseInt(this.longBreakTimeInput.value),
                sessionsBeforeLongBreak: parseInt(this.sessionsBeforeLongBreakInput.value)
            };
            
            await ipcRenderer.invoke('save-settings', settings);
            
            // Update current settings
            this.workTime = settings.workTime * 60;
            this.breakTime = settings.breakTime * 60;
            this.longBreakTime = settings.longBreakTime * 60;
            this.sessionsBeforeLongBreak = settings.sessionsBeforeLongBreak;
            
            this.resetTimer();
            this.closeSettingsModal();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            
            this.timer = setInterval(() => {
                this.currentTime--;
                this.updateDisplay();
                
                if (this.currentTime <= 0) {
                    this.timerComplete();
                }
            }, 1000);
            
            this.updateCatAnimation();
        }
    }
    
    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            
            clearInterval(this.timer);
            this.timer = null;
            
            this.updateCatAnimation();
        }
    }
    
    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        clearInterval(this.timer);
        this.timer = null;
        
        // Reset to current mode's time
        if (this.currentMode === 'work') {
            this.currentTime = this.workTime;
        } else if (this.currentMode === 'break') {
            this.currentTime = this.breakTime;
        } else {
            this.currentTime = this.longBreakTime;
        }
        
        this.updateDisplay();
        this.updateCatAnimation();
    }
    
    timerComplete() {
        clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
        this.isPaused = false;
        
        // Play notification sound or show notification
        ipcRenderer.send('timer-complete');
        
        // Switch modes
        if (this.currentMode === 'work') {
            this.sessionCount++;
            if (this.sessionCount > this.sessionsBeforeLongBreak) {
                this.currentMode = 'longBreak';
                this.currentTime = this.longBreakTime;
                this.sessionCount = 1;
            } else {
                this.currentMode = 'break';
                this.currentTime = this.breakTime;
            }
        } else {
            this.currentMode = 'work';
            this.currentTime = this.workTime;
        }
        
        this.updateDisplay();
        this.updateCatAnimation();
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update timer label
        if (this.currentMode === 'work') {
            this.timerLabel.textContent = 'Work Time';
            this.modeIndicator.textContent = 'Work';
            this.modeIndicator.style.background = '#e8f5e8';
            this.modeIndicator.style.color = '#27ae60';
        } else if (this.currentMode === 'break') {
            this.timerLabel.textContent = 'Break Time';
            this.modeIndicator.textContent = 'Break';
            this.modeIndicator.style.background = '#fff3cd';
            this.modeIndicator.style.color = '#856404';
        } else {
            this.timerLabel.textContent = 'Long Break';
            this.modeIndicator.textContent = 'Long Break';
            this.modeIndicator.style.background = '#d1ecf1';
            this.modeIndicator.style.color = '#0c5460';
        }
        
        // Update session counter
        this.sessionCountEl.textContent = this.sessionCount;
        this.totalSessionsEl.textContent = this.sessionsBeforeLongBreak;
        
        // Update progress ring
        this.updateProgressRing();
    }
    
    updateProgressRing() {
        let totalTime, currentProgress;
        
        if (this.currentMode === 'work') {
            totalTime = this.workTime;
            currentProgress = this.workTime - this.currentTime;
        } else if (this.currentMode === 'break') {
            totalTime = this.breakTime;
            currentProgress = this.breakTime - this.currentTime;
        } else {
            totalTime = this.longBreakTime;
            currentProgress = this.longBreakTime - this.currentTime;
        }
        
        const progress = currentProgress / totalTime;
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress * circumference);
        
        this.progressCircle.style.strokeDashoffset = offset;
        
        // Change progress ring color based on mode
        if (this.currentMode === 'work') {
            this.progressCircle.style.stroke = '#27ae60';
        } else if (this.currentMode === 'break') {
            this.progressCircle.style.stroke = '#f39c12';
        } else {
            this.progressCircle.style.stroke = '#3498db';
        }
    }
    
    updateCatAnimation() {
        this.cat.className = 'cat';
        
        if (this.isRunning) {
            if (this.currentMode === 'work') {
                this.cat.classList.add('working');
            } else {
                this.cat.classList.add('break');
            }
        }
    }
    
    openSettings() {
        // Populate settings form
        this.workTimeInput.value = Math.floor(this.workTime / 60);
        this.breakTimeInput.value = Math.floor(this.breakTime / 60);
        this.longBreakTimeInput.value = Math.floor(this.longBreakTime / 60);
        this.sessionsBeforeLongBreakInput.value = this.sessionsBeforeLongBreak;
        
        this.settingsModal.classList.add('show');
    }
    
    closeSettingsModal() {
        this.settingsModal.classList.remove('show');
    }
    
    minimizeWindow() {
        // This will be handled by the main process
        window.electronAPI?.minimizeWindow();
    }
    
    closeWindow() {
        // This will be handled by the main process
        window.electronAPI?.closeWindow();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});

// Close modal when clicking outside
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        e.target.classList.remove('show');
    }
}); 