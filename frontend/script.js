// script.js - Expert Polyhomes Complete JavaScript Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initApp();
});

// API base URL - Detect environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://expert-polyhomes-backend.onrender.com/api';

function initApp() {
    console.log('🚀 Initializing Expert Polyhomes App...');
    
    // Initialize components in order of priority
    initModals();
    initNavigation();
    initStickyBanner();
    initUtilityBar();
    initAnimations();
    initUserAuth(); // Initialize auth early

    // Initialize non-critical components after page load
    setTimeout(() => {
        initARMeasurement();
        initQuoteGenerator();
        initReviews();
        initBeforeAfterSlider();
        initDesignExplorer();
        initServiceMap();
        initFormValidation();
        initMpesaIntegration();
        init3DModel();
        loadUserDashboard(); // Load dashboard if on dashboard page
    }, 1000);
}

// Navigation functionality
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navLinksItems = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    navLinksItems.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    // Close mobile menu if open
                    if (navLinks.classList.contains('active')) {
                        navLinks.classList.remove('active');
                        navToggle.classList.remove('active');
                    }
                    
                    // Scroll to section
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Active section highlighting
    window.addEventListener('scroll', throttle(highlightActiveSection, 100));
}

// Modal management system
function initModals() {
    console.log('🔧 Initializing modals...');

    // All modals are hidden on startup
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });

    // Modal triggers mapping
    const modalTriggers = {
        'arView': 'arModal',
        'signInLink': 'signInModal',
        'showRegisterModal': 'registerModal',
        'showSignInModal': 'signInModal'
    };

    // Initialize modal triggers
    Object.keys(modalTriggers).forEach(triggerId => {
        const trigger = document.getElementById(triggerId);
        const modalId = modalTriggers[triggerId];
        
        if (trigger) {
            trigger.addEventListener('click', function(e) {
                e.preventDefault();
                if (modalId) {
                    openModal(modalId);
                }
            });
        }
    });

    // Close modals 
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal.id));
        }

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Escape key support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.style.display === 'flex') {
                    closeModal(modal.id);
                }
            });
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        const focusableElements = modal.querySelectorAll('button, input, select, textarea, a');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Enhanced Authentication System
function initUserAuth() {
    const signInForm = document.getElementById('signInForm');
    const registerForm = document.getElementById('registerForm');
    const logoutLink = document.getElementById('logoutLink');
    
    // Check authentication state on load
    checkAuthState();
    
    // Sign In
    if (signInForm) {
        signInForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('signInEmail').value;
            const password = document.getElementById('signInPassword').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('expertPolyhomes_token', data.token);
                    localStorage.setItem('expertPolyhomes_user', JSON.stringify(data.user));
                    updateUserGreeting();
                    closeModal('signInModal');
                    showNotification('Successfully signed in!', 'success');
                    loadUserDashboard();
                } else {
                    showNotification(data.error || 'Invalid email or password', 'error');
                }
            } catch (error) {
                showNotification('Login failed. Please try again.', 'error');
            }
        });
    }
    
    // Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const phone = document.getElementById('registerPhone').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('expertPolyhomes_token', data.token);
                    localStorage.setItem('expertPolyhomes_user', JSON.stringify(data.user));
                    updateUserGreeting();
                    closeModal('registerModal');
                    showNotification('Account created successfully!', 'success');
                    loadUserDashboard();
                } else {
                    showNotification(data.error || 'Registration failed', 'error');
                }
            } catch (error) {
                showNotification('Registration failed. Please try again.', 'error');
            }
        });
    }
    
    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('expertPolyhomes_token');
            localStorage.removeItem('expertPolyhomes_user');
            updateUserGreeting();
            showNotification('Successfully signed out', 'info');
            
            // Redirect to home if on dashboard
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'index.html';
            }
        });
    }
}

// Check authentication state
function checkAuthState() {
    const token = localStorage.getItem('expertPolyhomes_token');
    if (token) {
        verifyToken(token);
    }
}

// Verify token with backend
async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/verify-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Token invalid');
        }
        
        updateUserGreeting();
        loadUserDashboard();
    } catch (error) {
        localStorage.removeItem('expertPolyhomes_token');
        localStorage.removeItem('expertPolyhomes_user');
    }
}

// Update user interface based on auth state
function updateUserGreeting() {
    const userGreeting = document.getElementById('user-greeting');
    const signInLink = document.getElementById('signInLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const logoutLink = document.getElementById('logoutLink');
    const adminLink = document.getElementById('adminLink');
    
    const user = JSON.parse(localStorage.getItem('expertPolyhomes_user'));
    const token = localStorage.getItem('expertPolyhomes_token');
    
    if (user && token) {
        if (userGreeting) userGreeting.textContent = `Hello, ${user.name.split(' ')[0]}!`;
        if (signInLink) signInLink.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'inline';
        if (logoutLink) logoutLink.style.display = 'inline';
        
        // Show admin link if user is admin
        if (adminLink && user.role === 'admin') {
            adminLink.style.display = 'inline';
        }
    } else {
        if (userGreeting) userGreeting.textContent = '';
        if (signInLink) signInLink.style.display = 'inline';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

// User Dashboard
function loadUserDashboard() {
    const dashboardSection = document.getElementById('userDashboard');
    if (!dashboardSection) return;
    
    const token = localStorage.getItem('expertPolyhomes_token');
    const user = JSON.parse(localStorage.getItem('expertPolyhomes_user'));
    
    if (!token || !user) {
        dashboardSection.innerHTML = `
            <div class="auth-required">
                <h3>Welcome to Your Dashboard</h3>
                <p>Please sign in to view your quotes and orders</p>
                <button class="btn-primary" onclick="openModal('signInModal')">Sign In</button>
            </div>
        `;
        return;
    }
    
    fetchUserQuotes(token)
        .then(quotes => {
            dashboardSection.innerHTML = `
                <div class="dashboard-header">
                    <h2>Welcome, ${user.name}!</h2>
                    <p>Manage your quotes and track orders</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>${quotes.length}</h3>
                        <p>Total Quotes</p>
                    </div>
                    <div class="stat-card">
                        <h3>${quotes.filter(q => q.status === 'completed').length}</h3>
                        <p>Completed</p>
                    </div>
                    <div class="stat-card">
                        <h3>${quotes.filter(q => q.status === 'paid').length}</h3>
                        <p>Paid</p>
                    </div>
                    <div class="stat-card">
                        <h3>KES ${quotes.reduce((sum, q) => sum + (q.totalPrice || 0), 0).toLocaleString()}</h3>
                        <p>Total Value</p>
                    </div>
                </div>
                
                <div class="quotes-list">
                    <h3>Your Quotes</h3>
                    ${renderQuotesList(quotes)}
                </div>
            `;
        })
        .catch(error => {
            dashboardSection.innerHTML = '<p>Error loading dashboard. Please try again.</p>';
        });
}

// Fetch user quotes from backend
async function fetchUserQuotes(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/my-quotes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch quotes');
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching quotes:', error);
        return [];
    }
}

// Render quotes list for dashboard
function renderQuotesList(quotes) {
    if (quotes.length === 0) {
        return '<p>No quotes yet. <a href="#quote-generator" style="color: var(--primary-500);">Create your first quote!</a></p>';
    }
    
    return `
        <div class="quotes-grid">
            ${quotes.map(quote => `
                <div class="quote-card" data-status="${quote.status}">
                    <div class="quote-header">
                        <h4>Quote #${quote._id ? quote._id.slice(-6) : 'N/A'}</h4>
                        <span class="status-badge ${quote.status}">${quote.status}</span>
                    </div>
                    <div class="quote-details">
                        <p><strong>Dimensions:</strong> ${quote.windowWidth}m × ${quote.windowHeight}m</p>
                        <p><strong>Type:</strong> ${quote.meshType} - ${quote.materialType}</p>
                        <p><strong>Windows:</strong> ${quote.windowCount}</p>
                        <p><strong>Total:</strong> KES ${quote.totalPrice?.toLocaleString() || 'Calculating...'}</p>
                        <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="quote-actions">
                        ${quote.status === 'pending' || quote.status === 'confirmed' ? 
                            `<button class="btn-primary" onclick="initiatePayment('${quote._id}', ${quote.totalPrice})">
                                Pay Deposit
                            </button>` : 
                            ''
                        }
                        <button class="btn-secondary" onclick="viewQuoteDetails('${quote._id}')">
                            View Details
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// View quote details
function viewQuoteDetails(quoteId) {
    showNotification(`Quote details for ${quoteId}`, 'info');
    // Implement detailed quote view
}

// AR Measurement functionality
function initARMeasurement() {
    const arButton = document.getElementById('arView');
    if (!arButton) return;

    arButton.addEventListener('click', function() {
        openModal('arModal');
    });
}

// Quote Generator functionality
function initQuoteGenerator() {
    const quoteForm = document.getElementById('smartQuoteForm');
    const quoteSteps = document.querySelectorAll('.form-step');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const mpesaPayButton = document.getElementById('mpesapay');
    const detectLocationButton = document.getElementById('detectLocation');

    let currentStep = 1;
    let quoteData = {};

    // Step navigation
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (validateStep(currentStep)) {
                goToStep(currentStep + 1);
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            goToStep(currentStep - 1);
        });
    });

    // Location detection
    if (detectLocationButton) {
        detectLocationButton.addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const locationInput = document.getElementById('installLocation');
                        locationInput.value = 'Location detected - please enter your address manually';
                        showNotification('Location detected! Please verify your address.', 'info');
                    },
                    function(error) {
                        showNotification('Unable to detect location. Please enter manually.', 'error');
                    }
                );
            }
        });
    }

    // Enhanced form submission with backend integration
    if (quoteForm) {
        quoteForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const token = localStorage.getItem('expertPolyhomes_token');
            const user = JSON.parse(localStorage.getItem('expertPolyhomes_user'));
            
            if (!token || !user) {
                showNotification('Please sign in to submit a quote', 'error');
                openModal('signInModal');
                return;
            }
            
            const formData = {
                windowWidth: parseFloat(document.getElementById('windowWidth').value) || 1,
                windowHeight: parseFloat(document.getElementById('windowHeight').value) || 1,
                windowCount: parseInt(document.getElementById('windowCount').value) || 1,
                meshType: document.getElementById('meshType').value,
                materialType: document.getElementById('materialType').value,
                installLocation: document.getElementById('installLocation').value
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/quotes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showNotification('Quote submitted successfully!', 'success');
                    closeModal('quoteModal');
                    
                    // Refresh dashboard if on dashboard page
                    loadUserDashboard();
                } else {
                    showNotification(data.error || 'Quote submission failed', 'error');
                }
            } catch (error) {
                showNotification('Failed to submit quote. Please try again.', 'error');
            }
        });
    }

    function goToStep(step) {
        if (step < 1 || step > quoteSteps.length) return;
        
        // Hide current step
        document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
        
        // Show new step
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
        currentStep = step;
    }

    function validateStep(step) {
        const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
        const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
        
        let isValid = true;
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'var(--error)';
            } else {
                input.style.borderColor = '';
            }
        });
        
        if (!isValid) {
            showNotification('Please fill in all required fields', 'error');
        }
        
        return isValid;
    }
}

// M-Pesa Integration
function initMpesaIntegration() {
    const confirmMpesa = document.getElementById('confirmMpesa');
    const cancelMpesa = document.getElementById('cancelMpesa');

    if (confirmMpesa) {
        confirmMpesa.addEventListener('click', function() {
            const mpesaPhone = document.getElementById('mpesaPhone');
            const phone = mpesaPhone.value.trim();
            
            if (!isValidKenyanPhone(phone)) {
                showNotification('Please enter a valid Kenyan phone number', 'error');
                return;
            }

            // Get quote details from form
            const width = parseFloat(document.getElementById('windowWidth').value) || 1;
            const height = parseFloat(document.getElementById('windowHeight').value) || 1;
            const count = parseInt(document.getElementById('windowCount').value) || 1;
            const meshType = document.getElementById('meshType').value;
            
            // Calculate deposit (50%)
            const priceMatrix = {
                'fixed': 1500, 'roller': 2800, 'slider': 2600, 'magnetic': 1800
            };
            const area = width * height;
            const total = area * priceMatrix[meshType] * count;
            const deposit = Math.round(total * 0.5);

            initiatePayment('temp_quote', deposit, phone);
        });
    }

    if (cancelMpesa) {
        cancelMpesa.addEventListener('click', function() {
            closeModal('mpesaModal');
        });
    }
}

// Enhanced payment function
async function initiatePayment(quoteId, amount, phone = null) {
    const token = localStorage.getItem('expertPolyhomes_token');
    const user = JSON.parse(localStorage.getItem('expertPolyhomes_user'));
    
    if (!token || !user) {
        showNotification('Please sign in to make payment', 'error');
        openModal('signInModal');
        return;
    }

    if (!phone) {
        phone = prompt('Enter your M-Pesa phone number (format: 2547XXXXXXXX or 07XXXXXXXX):');
        if (!phone || !isValidKenyanPhone(phone)) {
            showNotification('Please enter a valid Kenyan phone number', 'error');
            return;
        }
    }

    showNotification('Initiating M-Pesa payment...', 'info');

    try {
        const response = await fetch(`${API_BASE_URL}/mpesa/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                phone: phone,
                amount: amount,
                quoteId: quoteId
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('M-Pesa prompt sent to your phone', 'info');
            closeModal('mpesaModal');
            
            // Poll for payment status
            checkPaymentStatus(data.paymentId, token);
        } else {
            showNotification(data.error || 'Payment initiation failed', 'error');
        }
    } catch (error) {
        showNotification('Payment service unavailable. Please try again.', 'error');
    }
}

// Check payment status
async function checkPaymentStatus(paymentId, token) {
    const maxAttempts = 30; // 3 minutes max
    let attempts = 0;

    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/payment-status/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.status === 'completed') {
                showNotification('Payment confirmed! Our team will contact you.', 'success');
                loadUserDashboard(); // Refresh dashboard
                return;
            } else if (data.status === 'failed') {
                showNotification('Payment failed. Please try again.', 'error');
                return;
            }
            
            // Continue polling if still pending
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkStatus, 6000); // Check every 6 seconds
            } else {
                showNotification('Payment timeout. Please check your phone or try again.', 'warning');
            }
        } catch (error) {
            console.error('Payment status check error:', error);
        }
    };

    checkStatus();
}

// Reviews System
function initReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    const reviewForm = document.getElementById('reviewForm');
    
    // Sample reviews data
    const sampleReviews = [
        { name: "Sarah K.", rating: 5, comment: "Professional installation and excellent quality nets. My home is now mosquito-free!", date: "2024-01-15" },
        { name: "James M.", rating: 5, comment: "Quick service and reasonable prices. The roller nets are perfect for our sliding doors.", date: "2024-01-10" },
        { name: "Grace W.", rating: 4, comment: "Good quality nets, installation was done professionally. Would recommend!", date: "2024-01-08" }
    ];

    // Load sample reviews
    if (reviewsContainer) {
        displayReviews(sampleReviews);
    }

    // Handle review submission
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const rating = this.rating.value;
            const comment = this.comment.value.trim();
            
            if (!rating || !comment) {
                showNotification('Please provide both rating and comment', 'error');
                return;
            }
            
            const newReview = {
                name: "You",
                rating: parseInt(rating),
                comment: comment,
                date: new Date().toISOString().split('T')[0]
            };
            
            sampleReviews.unshift(newReview);
            displayReviews(sampleReviews);
            this.reset();
            
            showNotification('Thank you for your review!', 'success');
        });
    }

    function displayReviews(reviews) {
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer">${review.name}</div>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                </div>
                <div class="review-comment">"${review.comment}"</div>
                <div class="review-date">${review.date}</div>
            </div>
        `).join('');
    }
}

// Before/After Slider
function initBeforeAfterSlider() {
    const slider = document.querySelector('.comparison-slider');
    if (!slider) return;

    const handle = slider.querySelector('.slider-handle');
    const before = slider.querySelector('.before');
    let isDragging = false;

    function updateSlider(clientX) {
        const rect = slider.getBoundingClientRect();
        const position = ((clientX - rect.left) / rect.width) * 100;
        const boundedPosition = Math.max(0, Math.min(100, position));
        
        before.style.width = boundedPosition + '%';
        handle.style.left = boundedPosition + '%';
    }

    handle.addEventListener('mousedown', function(e) {
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        updateSlider(e.clientX);
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // Touch support
    handle.addEventListener('touchstart', function(e) {
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        updateSlider(e.touches[0].clientX);
    });

    document.addEventListener('touchend', function() {
        isDragging = false;
    });
}

// Design Explorer Tabs
function initDesignExplorer() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.design-tab');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Update panels
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.getAttribute('data-tab') === tabName) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Service Map with Leaflet
function initServiceMap() {
    const serviceMap = document.getElementById('serviceMap');
    if (!serviceMap) return;

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded, skipping map initialization');
        serviceMap.innerHTML = '<div style="padding: 20px; text-align: center;">Map loading...</div>';
        return;
    }

    // Initialize map centered on Nairobi
    const map = L.map('serviceMap').setView([-1.286389, 36.817223], 10);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Service area polygon (simplified Nairobi area)
    const nairobiArea = L.polygon([
        [-1.20, 36.70],
        [-1.20, 36.95],
        [-1.40, 36.95],
        [-1.40, 36.70]
    ], {
        color: 'var(--primary-500)',
        fillColor: 'var(--primary-100)',
        fillOpacity: 0.3,
        weight: 2
    }).addTo(map);

    // Location search functionality
    const locationInput = document.getElementById('locationInput');
    const checkLocation = document.getElementById('checkLocation');
    const installTime = document.getElementById('installTime');

    if (checkLocation) {
        checkLocation.addEventListener('click', function() {
            const location = locationInput.value.trim();
            if (location) {
                // Use backend service check
                fetch(`${API_BASE_URL}/service-check?location=${encodeURIComponent(location)}`)
                    .then(response => response.json())
                    .then(data => {
                        installTime.textContent = data.estimate;
                        showNotification(data.message, data.served ? 'success' : 'info');
                    })
                    .catch(error => {
                        // Fallback to random response
                        const responses = ["Within 24 hours", "1-2 business days", "3-5 business days"];
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        installTime.textContent = randomResponse;
                        showNotification(`Service available! ${randomResponse}`, 'success');
                    });
            } else {
                showNotification('Please enter a location', 'error');
            }
        });
    }
}

// Utility Bar Functions
function initUtilityBar() {
    updateLiveTime();
    updateWeather();
    updateUserGreeting();
    
    // Update time every minute
    setInterval(updateLiveTime, 60000);
}

function updateLiveTime() {
    const liveTime = document.getElementById('live-time');
    if (liveTime) {
        const now = new Date();
        liveTime.textContent = `Nairobi: ${now.toLocaleTimeString('en-KE', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Africa/Nairobi'
        })}`;
    }
}

function updateWeather() {
    const weatherDisplay = document.getElementById('weather-display');
    if (weatherDisplay) {
        // Simulate weather data
        const weatherConditions = ['☀️ 24°C', '⛅ 22°C', '🌧️ 19°C'];
        const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        weatherDisplay.textContent = randomWeather;
    }
}

// Sticky Banner
function initStickyBanner() {
    const stickyBanner = document.getElementById('stickyBanner');
    
    if (stickyBanner) {
        window.addEventListener('scroll', throttle(function() {
            if (window.scrollY > 300) {
                stickyBanner.classList.add('show');
            } else {
                stickyBanner.classList.remove('show');
            }
        }, 100));
    }
}

// Animations
function initAnimations() {
    // Initialize AOS if available
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }

    // Animate counter numbers
    animateCounters();
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count')) || 0;
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    });
}

// Form Validation
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
        });
    });
}

function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    // Clear previous error
    field.style.borderColor = '';
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Validation rules
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        message = 'This field is required';
    } else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }
    } else if (field.type === 'tel' && value) {
        if (!isValidKenyanPhone(value)) {
            isValid = false;
            message = 'Please enter a valid Kenyan phone number';
        }
    }
    
    if (!isValid) {
        field.style.borderColor = 'var(--error)';
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.color = 'var(--error)';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '0.25rem';
        errorElement.textContent = message;
        field.parentNode.appendChild(errorElement);
    }
    
    return isValid;
}

// Utility Functions
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        z-index: 10000;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function highlightActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

function isValidKenyanPhone(phone) {
    const regex = /^(07\d{8}|01\d{8}|\+2547\d{8}|2547\d{8})$/;
    return regex.test(phone.replace(/\s/g, ''));
}

function trackConversion(event) {
    console.log(`Conversion tracked: ${event}`);
    
    // Example: Send to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', event);
    }
}

// Quick order buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('quick-order')) {
        e.preventDefault();
        const type = e.target.getAttribute('data-type');
        openModal('quoteModal');
        showNotification(`Quick order started for ${type} nets`, 'info');
    }
});

// Footer link handlers
document.addEventListener('click', function(e) {
    if (e.target.hasAttribute('data-tab')) {
        e.preventDefault();
        const tabName = e.target.getAttribute('data-tab');
        const designExplorer = document.getElementById('design-explorer');
        
        if (designExplorer) {
            designExplorer.scrollIntoView({ behavior: 'smooth' });
            
            // Activate the corresponding tab
            setTimeout(() => {
                const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
                if (tabButton) tabButton.click();
            }, 500);
        }
    }
});

// 3D Model placeholder
function init3DModel() {
    const container = document.getElementById('product3d');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
            <div style="text-align: center;">
                <i class="fas fa-cube" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>3D Product Visualization</p>
                <small>Interactive net preview coming soon</small>
            </div>
        </div>
    `;
}

// Test backend connection
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ Backend connection successful:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    testBackendConnection();
});

// Export functions for global access
window.ExpertPolyhomes = {
    openModal,
    closeModal,
    showNotification,
    initiatePayment,
    loadUserDashboard
};