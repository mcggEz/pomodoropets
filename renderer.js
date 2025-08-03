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
        this.breakAccumulated = 0; // Track accumulated break time
        this.isReverseMode = false; // Track timer mode
        this.isDarkMode = false; // Track theme mode
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.timeDisplay = document.getElementById('timeDisplay');
        this.maxTimeDisplay = document.getElementById('maxTime');
        this.breakAccumulatedDisplay = document.getElementById('breakAccumulated');
        this.startBtn = document.getElementById('startBtn');
        this.timerModeToggle = document.getElementById('timerModeToggle');
        this.themeToggle = document.getElementById('themeToggle');
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
        this.catThemeInput = document.getElementById('catTheme');
        this.petTypeInput = document.getElementById('petType');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.timerModeToggle.addEventListener('click', () => this.toggleTimerMode());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettings.addEventListener('click', () => this.saveSettings());
        this.minimizeBtn.addEventListener('click', () => this.minimizeWindow());
        this.closeBtn.addEventListener('click', () => this.closeWindow());
        
        // IPC listeners
        ipcRenderer.on('start-timer', () => this.startTimer());
        ipcRenderer.on('pause-timer', () => this.pauseTimer());
        ipcRenderer.on('settings-updated', () => this.loadSettings());
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
                sessionsBeforeLongBreak: parseInt(this.sessionsBeforeLongBreakInput.value),
                catTheme: this.catThemeInput.value,
                petType: this.petTypeInput.value
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
    
    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }
    
    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            
            this.timer = setInterval(() => {
                if (this.isReverseMode) {
                    this.currentTime++;
                } else {
                    this.currentTime--;
                }
                this.updateDisplay();
                
                if (!this.isReverseMode && this.currentTime <= 0) {
                    this.timerComplete();
                }
            }, 1000);
            
            this.updateTimerState();
        }
    }
    
    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = true;
            
            clearInterval(this.timer);
            this.timer = null;
            
            this.updateTimerState();
        }
    }
    
    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        
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
        this.updateTimerState();
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
            // Add break time to accumulated breaks
            if (this.currentMode === 'break') {
                this.breakAccumulated += this.breakTime;
            } else if (this.currentMode === 'longBreak') {
                this.breakAccumulated += this.longBreakTime;
            }
            
            this.currentMode = 'work';
            this.currentTime = this.workTime;
        }
        
        this.updateDisplay();
        this.updateTimerState();
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Add animation class for smooth updates
        this.timeDisplay.classList.add('updating');
        setTimeout(() => this.timeDisplay.classList.remove('updating'), 300);
        
        this.timeDisplay.textContent = timeString;

        // Update max time display
        let maxTime;
        if (this.currentMode === 'work') {
            maxTime = this.workTime;
        } else if (this.currentMode === 'break') {
            maxTime = this.breakTime;
        } else {
            maxTime = this.longBreakTime;
        }
        
        const maxMinutes = Math.floor(maxTime / 60);
        const maxSeconds = maxTime % 60;
        this.maxTimeDisplay.textContent = `${maxMinutes.toString().padStart(2, '0')}:${maxSeconds.toString().padStart(2, '0')}`;
        
        // Update break accumulated display
        const breakMinutes = Math.floor(this.breakAccumulated / 60);
        this.breakAccumulatedDisplay.textContent = breakMinutes;
    }
    
    updateTimerState() {
        const timerCard = document.querySelector('.timer-card');
        const startButton = this.startBtn;
        const startIcon = startButton.querySelector('i');
        const startText = startButton.querySelector('span');
        
        if (this.isRunning) {
            timerCard.classList.add('running');
            startIcon.className = 'fas fa-pause';
            startText.textContent = 'Pause';
        } else {
            timerCard.classList.remove('running');
            startIcon.className = 'fas fa-play';
            startText.textContent = 'Start';
        }
    }
    
    toggleTimerMode() {
        this.isReverseMode = !this.isReverseMode;
        this.timerModeToggle.classList.toggle('active', this.isReverseMode);
        
        // Update labels
        const labels = document.querySelectorAll('.toggle-label');
        labels.forEach(label => label.classList.remove('active'));
        
        if (this.isReverseMode) {
            labels[0].classList.add('active'); // "Reverse" label
        } else {
            labels[1].classList.add('active'); // "Classic" label
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.themeToggle.classList.toggle('active', this.isDarkMode);
        
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    
    openSettings() {
        // Populate settings form
        this.workTimeInput.value = Math.floor(this.workTime / 60);
        this.breakTimeInput.value = Math.floor(this.breakTime / 60);
        this.longBreakTimeInput.value = Math.floor(this.longBreakTime / 60);
        this.sessionsBeforeLongBreakInput.value = this.sessionsBeforeLongBreak;
        this.catThemeInput.value = 'chubby-gray'; // Default theme
        this.petTypeInput.value = 'cat'; // Default pet type
        
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