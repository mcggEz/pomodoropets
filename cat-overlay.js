const { ipcRenderer } = require('electron');

class PetOverlay {
    constructor() {
        this.pet = document.getElementById('overlayPet');
        this.closeBtn = document.getElementById('closeOverlayBtn');
        this.container = document.querySelector('.pet-overlay-container');
        this.overlayTimer = document.getElementById('overlayTimer');
        
        // Pet variants
        this.catVariant = document.getElementById('overlayCatVariant');
        this.dogVariant = document.getElementById('overlayDogVariant');
        this.birdVariant = document.getElementById('overlayBirdVariant');
        this.rabbitVariant = document.getElementById('overlayRabbitVariant');
        
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initializeEvents();
        this.startIdleBehavior();
        this.applyPetType('cat'); // Set default pet
    }
    
    initializeEvents() {
        // Close button
        this.closeBtn.addEventListener('click', () => {
            ipcRenderer.send('hide-cat-overlay');
        });
        
        // Dragging functionality
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.closeBtn) return;
            
            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            this.container.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Keep cat within screen bounds
            const maxX = window.screen.width - this.container.offsetWidth;
            const maxY = window.screen.height - this.container.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(x, maxX));
            const boundedY = Math.max(0, Math.min(y, maxY));
            
            this.container.style.left = boundedX + 'px';
            this.container.style.top = boundedY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'grab';
            }
        });
        
        // Cat state updates from main window
        ipcRenderer.on('update-cat-state', (event, state) => {
            this.updateCatState(state);
        });
        
        // Listen for theme changes
        ipcRenderer.on('update-cat-theme', (event, theme) => {
            this.applyCatTheme(theme);
        });
        
        ipcRenderer.on('update-overlay-time', (event, timeString) => {
            if (this.overlayTimer) {
                this.overlayTimer.textContent = timeString;
            }
        });
        
        // Click to pet the cat
        this.pet.addEventListener('click', () => {
            this.petCat();
        });
    }
    
    updateCatState(state) {
        // Remove all state classes
        this.pet.classList.remove('working', 'break', 'idle');
        
        // Add appropriate state class
        if (state.isRunning) {
            if (state.mode === 'work') {
                this.pet.classList.add('working');
            } else {
                this.pet.classList.add('break');
            }
        } else {
            this.pet.classList.add('idle');
        }

        // Apply the theme from the state
        if (state.theme) {
            this.applyCatTheme(state.theme);
        }
        
        // Apply the pet type from the state
        if (state.petType) {
            this.applyPetType(state.petType);
        }
    }
    
    petCat() {
        // Add petting animation
        this.pet.classList.add('petting');
        
        // Remove petting class after animation
        setTimeout(() => {
            this.pet.classList.remove('petting');
        }, 500);
    }
    
    applyCatTheme(theme) {
        // Here, `this.container` is the .cat-overlay-container
        this.container.classList.remove('theme-chubby-gray', 'theme-pixel-calico');
        this.container.classList.add(`theme-${theme}`);
    }
    
    applyPetType(type) {
        // Hide all pet variants
        this.catVariant.style.display = 'none';
        this.dogVariant.style.display = 'none';
        this.birdVariant.style.display = 'none';
        this.rabbitVariant.style.display = 'none';
        
        // Show selected pet variant
        switch (type) {
            case 'cat':
                this.catVariant.style.display = 'block';
                break;
            case 'dog':
                this.dogVariant.style.display = 'block';
                break;
            case 'bird':
                this.birdVariant.style.display = 'block';
                break;
            case 'rabbit':
                this.rabbitVariant.style.display = 'block';
                break;
            default:
                this.catVariant.style.display = 'block';
        }
    }
    
    startIdleBehavior() {
        // Random idle behaviors
        setInterval(() => {
            if (!this.pet.classList.contains('working') && !this.pet.classList.contains('break')) {
                // Random chance to do something
                if (Math.random() < 0.1) {
                    this.pet.classList.add('petting');
                    setTimeout(() => {
                        this.pet.classList.remove('petting');
                    }, 500);
                }
            }
        }, 10000); // Every 10 seconds
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PetOverlay();
}); 