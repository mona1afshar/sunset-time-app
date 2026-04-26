class SunsetApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.showWelcomeState();
    }

    bindEvents() {
        const searchBtn = document.getElementById('search-btn');
        const locationInput = document.getElementById('location-input');
        const currentLocationBtn = document.getElementById('current-location-btn');
        const retryBtn = document.getElementById('retry-btn');

        searchBtn.addEventListener('click', () => this.handleSearch());
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        currentLocationBtn.addEventListener('click', () => this.handleCurrentLocation());
        retryBtn.addEventListener('click', () => this.hideError());
    }

    showWelcomeState() {
        this.hideAllSections();
        // Keep search section visible by default
    }

    hideAllSections() {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
    }

    showLoading() {
        this.hideAllSections();
        document.getElementById('loading-section').style.display = 'block';
    }

    showResults() {
        this.hideAllSections();
        document.getElementById('results-section').style.display = 'block';
    }

    showError(message) {
        this.hideAllSections();
        document.getElementById('error-text').textContent = message;
        document.getElementById('error-section').style.display = 'block';
    }

    hideError() {
        this.hideAllSections();
    }

    async handleSearch() {
        const location = document.getElementById('location-input').value.trim();
        if (!location) {
            this.showError('Please enter a location to search for sunset times.');
            return;
        }

        try {
            this.showLoading();
            const coordinates = await this.geocodeLocation(location);
            const sunsetData = await this.getSunsetData(coordinates.lat, coordinates.lng);
            this.displayResults(location, coordinates, sunsetData);
        } catch (error) {
            console.error('Search error:', error);
            this.showError(error.message || 'Unable to find sunset time for this location. Please try a different location.');
        }
    }

    async handleCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            return;
        }

        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const locationName = await this.reverseGeocode(lat, lng);
                    const sunsetData = await this.getSunsetData(lat, lng);
                    this.displayResults(locationName, { lat, lng }, sunsetData);
                } catch (error) {
                    console.error('Current location error:', error);
                    this.showError('Unable to get sunset data for your current location.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let message = 'Unable to access your current location.';
                if (error.code === error.PERMISSION_DENIED) {
                    message = 'Location access denied. Please enable location permissions or enter a location manually.';
                }
                this.showError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    async geocodeLocation(location) {
        // Using OpenStreetMap Nominatim API for geocoding (free, no API key required)
        const encodedLocation = encodeURIComponent(location);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`);
        
        if (!response.ok) {
            throw new Error('Unable to find location. Please check your internet connection.');
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Location not found. Please try a different location or be more specific.');
        }
        
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display_name: data[0].display_name
        };
    }

    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (response.ok) {
                const data = await response.json();
                return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    async getSunsetData(lat, lng) {
        // Using sunrise-sunset.org API (free, no API key required)
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`);
        
        if (!response.ok) {
            throw new Error('Unable to fetch sunset data. Please check your internet connection.');
        }
        
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error('Invalid location coordinates. Please try a different location.');
        }
        
        return data.results;
    }

    displayResults(locationName, coordinates, sunsetData) {
        // Update location info
        document.getElementById('location-name').textContent = locationName;
        document.getElementById('location-coords').textContent = `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
        
        // Parse and format times
        const sunset = new Date(sunsetData.sunset);
        const sunrise = new Date(sunsetData.sunrise);
        const solarNoon = new Date(sunsetData.solar_noon);
        
        // Update sunset time
        document.getElementById('sunset-time').textContent = this.formatTime(sunset);
        document.getElementById('sunset-date').textContent = this.formatDate(sunset);
        
        // Update additional info
        document.getElementById('sunrise-time').textContent = this.formatTime(sunrise);
        document.getElementById('solar-noon').textContent = this.formatTime(solarNoon);
        
        // Calculate day length
        const dayLengthMs = sunset - sunrise;
        const dayLengthHours = Math.floor(dayLengthMs / (1000 * 60 * 60));
        const dayLengthMinutes = Math.floor((dayLengthMs % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('day-length').textContent = `${dayLengthHours}h ${dayLengthMinutes}m`;
        
        // Start countdown
        this.startCountdown(sunset);
        
        this.showResults();
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString([], { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    startCountdown(sunsetTime) {
        const countdownElement = document.getElementById('countdown');
        const countdownSection = document.getElementById('countdown-section');
        
        const updateCountdown = () => {
            const now = new Date();
            const timeDiff = sunsetTime - now;
            
            if (timeDiff <= 0) {
                countdownElement.textContent = 'Sunset has passed';
                countdownSection.style.background = 'linear-gradient(135deg, #4a4a4a, #2a2a2a)';
                return;
            }
            
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            
            countdownElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };
        
        // Update immediately
        updateCountdown();
        
        // Update every second
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SunsetApp();
});