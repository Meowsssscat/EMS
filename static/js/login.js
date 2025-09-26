// BPO Employee Management System - Login Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    
    // Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const passwordToggle = document.getElementById('passwordToggle');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    // Error message elements
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    // Password visibility toggle
    let passwordVisible = false;

    passwordToggle.addEventListener('click', function() {
        passwordVisible = !passwordVisible;
        
        if (passwordVisible) {
            passwordInput.type = 'text';
            passwordToggle.innerHTML = `
                <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            passwordToggle.innerHTML = `
                <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `;
        }
    });

    // Real-time validation
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', clearEmailError);
    passwordInput.addEventListener('blur', validatePassword);
    passwordInput.addEventListener('input', clearPasswordError);

    // Form submission handling
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        
        if (isEmailValid && isPasswordValid) {
            submitForm();
        }
    });

    // Email validation
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showError(emailError, 'Email address is required');
            return false;
        } else if (!emailRegex.test(email)) {
            showError(emailError, 'Please enter a valid email address');
            return false;
        } else {
            clearError(emailError);
            return true;
        }
    }

    // Password validation
    function validatePassword() {
        const password = passwordInput.value;
        
        if (!password) {
            showError(passwordError, 'Password is required');
            return false;
        } else if (password.length < 6) {
            showError(passwordError, 'Password must be at least 6 characters');
            return false;
        } else {
            clearError(passwordError);
            return true;
        }
    }

    // Show error message
    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        errorElement.parentElement.querySelector('.form-input').style.borderColor = '#E74C3C';
    }

    // Clear error message
    function clearError(errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
        errorElement.parentElement.querySelector('.form-input').style.borderColor = '#E8E8E8';
    }

    // Clear email error on input
    function clearEmailError() {
        if (emailError.classList.contains('show')) {
            clearError(emailError);
        }
    }

    // Clear password error on input
    function clearPasswordError() {
        if (passwordError.classList.contains('show')) {
            clearError(passwordError);
        }
    }

    // Submit form with loading state
    function submitForm() {
        // Show loading state
        loginButton.classList.add('loading');
        loginButton.disabled = true;
        
        // Create form data
        const formData = new FormData();
        formData.append('email', emailInput.value.trim());
        formData.append('password', passwordInput.value);
        
        // Store remember me preference
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('rememberEmail', emailInput.value.trim());
        } else {
            localStorage.removeItem('rememberEmail');
        }
        
        // Simulate form submission delay (remove this in production)
        setTimeout(() => {
            // Submit the actual form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = loginForm.action || '';
            
            // Add form fields
            const emailField = document.createElement('input');
            emailField.type = 'hidden';
            emailField.name = 'email';
            emailField.value = emailInput.value.trim();
            form.appendChild(emailField);
            
            const passwordField = document.createElement('input');
            passwordField.type = 'hidden';
            passwordField.name = 'password';
            passwordField.value = passwordInput.value;
            form.appendChild(passwordField);
            
            document.body.appendChild(form);
            form.submit();
        }, 1000);
    }

    // Load saved email if remember me was checked
    function loadSavedEmail() {
        const savedEmail = localStorage.getItem('rememberEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberMeCheckbox.checked = true;
        }
    }

    // Input focus animations
    function addInputAnimations() {
        const inputs = document.querySelectorAll('.form-input');
        
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
            });
        });
    }

    // Keyboard navigation enhancements
    function addKeyboardSupport() {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                passwordInput.focus();
            }
        });
        
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Flash message auto-hide
    function autoHideFlashMessages() {
        const flashMessages = document.querySelectorAll('.flash-message');
        flashMessages.forEach(message => {
            setTimeout(() => {
                message.style.animation = 'slideOut 0.4s ease-out forwards';
                setTimeout(() => {
                    message.remove();
                }, 400);
            }, 5000);
        });
    }

    // Add slideOut animation to CSS dynamically
    function addSlideOutAnimation() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize all functionality
    function init() {
        loadSavedEmail();
        addInputAnimations();
        addKeyboardSupport();
        autoHideFlashMessages();
        addSlideOutAnimation();
        
        // Add subtle page load animation
        document.body.style.opacity = '0';
        setTimeout(() => {
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '1';
        }, 100);
    }

    // Run initialization
    init();

    // Add some Easter eggs for better UX
    let clickCount = 0;
    document.querySelector('.logo-placeholder').addEventListener('click', function() {
        clickCount++;
        if (clickCount === 5) {
            this.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                this.style.animation = 'pulse 2s infinite';
            }, 500);
            clickCount = 0;
        }
    });

    // Performance monitoring (optional - for development)
    if (typeof performance !== 'undefined') {
        window.addEventListener('load', function() {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Login page loaded in ${loadTime}ms`);
        });
    }
});

// Utility functions for enhanced user experience
const LoginUtils = {
    // Format error messages nicely
    formatErrorMessage: function(message) {
        return message.charAt(0).toUpperCase() + message.slice(1);
    },
    
    // Check if user is on mobile
    isMobile: function() {
        return window.innerWidth <= 768;
    },
    
    // Smooth scroll to error (useful for long forms)
    scrollToError: function(errorElement) {
        errorElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    },
    
    // Generate random placeholder tips
    getRandomTip: function() {
        const tips = [
            "Use a strong password with numbers and symbols",
            "Keep your login credentials secure",
            "Contact IT support if you need help",
            "Your session will timeout after 30 minutes of inactivity"
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
};

// Export for potential testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginUtils;
}