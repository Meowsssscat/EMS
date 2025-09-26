/**
 * Employee Leave Request JavaScript - Modern BPO Design
 * Handles leave form submission, validation, and page interactivity
 */

// Global state management
const AppState = {
    isFormSubmitting: false,
    formValidation: {},
    animationQueue: [],
    loadingStates: new Set(),
    messageTimeout: 5000
};

// Utility functions
const Utils = {
    // Debounce function for performance optimization
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format date for display
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Calculate business days between two dates
    calculateBusinessDays: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let days = 0;
        let current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                days++;
            }
            current.setDate(current.getDate() + 1);
        }

        return days;
    },

    // Generate unique ID
    generateId: () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Smooth scroll to element
    scrollToElement: (element, offset = 0) => {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

// Animation system
const AnimationManager = {
    // Queue animation to prevent conflicts
    queue: (callback) => {
        AppState.animationQueue.push(callback);
        if (AppState.animationQueue.length === 1) {
            AnimationManager.processNext();
        }
    },

    // Process next animation in queue
    processNext: () => {
        if (AppState.animationQueue.length === 0) return;
        
        const animation = AppState.animationQueue[0];
        animation(() => {
            AppState.animationQueue.shift();
            setTimeout(() => AnimationManager.processNext(), 50);
        });
    },

    // Fade in animation
    fadeIn: (element, duration = 300, callback = null) => {
        element.style.opacity = '0';
        element.style.display = 'block';
        element.offsetHeight; // Trigger reflow

        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '1';

        setTimeout(() => {
            if (callback) callback();
        }, duration);
    },

    // Slide down animation
    slideDown: (element, duration = 300, callback = null) => {
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms ease`;
        
        const fullHeight = element.scrollHeight;
        requestAnimationFrame(() => {
            element.style.height = fullHeight + 'px';
        });

        setTimeout(() => {
            element.style.height = 'auto';
            element.style.overflow = '';
            if (callback) callback();
        }, duration);
    },

    // Pulse animation
    pulse: (element, intensity = 1.05, duration = 200) => {
        element.style.transition = `transform ${duration}ms ease`;
        element.style.transform = `scale(${intensity})`;

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, duration);
    }
};

// Form validation system
const FormValidator = {
    rules: {
        leaveType: {
            required: true,
            message: 'Please select a leave type'
        },
        startDate: {
            required: true,
            validate: (value) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(value);
                return selected >= today;
            },
            message: 'Start date cannot be in the past'
        },
        endDate: {
            required: true,
            validate: (value, form) => {
                const startDate = form.start_date?.value;
                if (!startDate) return true;
                return new Date(value) >= new Date(startDate);
            },
            message: 'End date must be after or equal to start date'
        },
        reason: {
            required: true,
            minLength: 10,
            validate: (value) => value.trim().length >= 10,
            message: 'Please provide a detailed reason (minimum 10 characters)'
        }
    },

    // Validate single field
    validateField: (fieldName, value, form = null) => {
        const rule = FormValidator.rules[fieldName];
        if (!rule) return { valid: true };

        // Required check
        if (rule.required && (!value || value.trim() === '')) {
            return {
                valid: false,
                message: rule.message || `${fieldName} is required`
            };
        }

        // Custom validation
        if (rule.validate && !rule.validate(value, form)) {
            return {
                valid: false,
                message: rule.message || `Invalid ${fieldName}`
            };
        }

        // Minimum length check
        if (rule.minLength && value.length < rule.minLength) {
            return {
                valid: false,
                message: rule.message || `Minimum ${rule.minLength} characters required`
            };
        }

        return { valid: true };
    },

    // Validate entire form
    validateForm: (form) => {
        let isValid = true;
        const errors = {};

        Object.keys(FormValidator.rules).forEach(fieldName => {
            const field = form[fieldName];
            if (field) {
                const result = FormValidator.validateField(fieldName, field.value, form);
                if (!result.valid) {
                    isValid = false;
                    errors[fieldName] = result.message;
                    UI.setFieldError(field, result.message);
                } else {
                    UI.setFieldSuccess(field);
                }
            }
        });

        AppState.formValidation = { isValid, errors };
        return isValid;
    }
};

// UI interaction handlers
const UI = {
    // Set field error state with animation
    setFieldError: (field, message) => {
        field.classList.remove('success');
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message with animation
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateY(-10px)';
        
        field.parentNode.appendChild(errorDiv);
        
        // Animate in
        requestAnimationFrame(() => {
            errorDiv.style.transition = 'all 0.3s ease';
            errorDiv.style.opacity = '1';
            errorDiv.style.transform = 'translateY(0)';
        });

        // Pulse field to draw attention
        AnimationManager.pulse(field, 1.02, 150);
    },

    // Set field success state
    setFieldSuccess: (field) => {
        field.classList.remove('error');
        field.classList.add('success');
        
        // Remove error message with fade out
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.style.transition = 'all 0.3s ease';
            existingError.style.opacity = '0';
            existingError.style.transform = 'translateY(-10px)';
            setTimeout(() => existingError.remove(), 300);
        }
    },

    // Clear field validation state
    clearFieldError: (field) => {
        field.classList.remove('error', 'success');
        
        // Remove error message
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.style.transition = 'all 0.3s ease';
            existingError.style.opacity = '0';
            setTimeout(() => existingError.remove(), 300);
        }
    },

    // Update button loading state
    setButtonLoading: (button, loading, originalText = '') => {
        if (loading) {
            button.disabled = true;
            AppState.loadingStates.add(button.id);
            button.innerHTML = `
                <svg class="btn-icon loading" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Loading...
            `;
        } else {
            button.disabled = false;
            AppState.loadingStates.delete(button.id);
            button.innerHTML = originalText;
        }
    },

    // Show notification message with enhanced styling
    showMessage: (text, type = 'info', duration = AppState.messageTimeout) => {
        const messageContainer = document.getElementById('messageContainer') || 
                                UI.createMessageContainer();
        
        const messageId = Utils.generateId();
        const iconSvg = UI.getMessageIcon(type);
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.id = messageId;
        messageElement.style.transform = 'translateX(100%) scale(0.8)';
        messageElement.style.opacity = '0';
        
        messageElement.innerHTML = `
            <div class="message-icon">${iconSvg}</div>
            <span>${text}</span>
            <button class="message-close" type="button" onclick="UI.closeMessage('${messageId}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        
        messageContainer.appendChild(messageElement);
        
        // Animate in
        requestAnimationFrame(() => {
            messageElement.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            messageElement.style.transform = 'translateX(0) scale(1)';
            messageElement.style.opacity = '1';
        });
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => UI.closeMessage(messageId), duration);
        }
        
        return messageId;
    },

    // Create message container if it doesn't exist
    createMessageContainer: () => {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
        return container;
    },

    // Close message with animation
    closeMessage: (messageId) => {
        const message = document.getElementById(messageId);
        if (!message) return;

        message.style.transition = 'all 0.3s ease';
        message.style.transform = 'translateX(100%) scale(0.8)';
        message.style.opacity = '0';
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    },

    // Get message icon based on type
    getMessageIcon: (type) => {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        return icons[type] || icons.info;
    }
};

// Leave management system
const LeaveManager = {
    // Calculate and display duration with animation
    calculateDuration: () => {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const durationDisplay = document.getElementById('leaveDuration');
        const durationContainer = durationDisplay?.closest('.duration-display');
        
        if (!startDateInput || !endDateInput || !durationDisplay) return;
        
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (end >= start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                // Animate number change
                const numberElement = durationDisplay.querySelector('.duration-number');
                const textElement = durationDisplay.querySelector('.duration-text');
                
                if (numberElement && textElement) {
                    // Scale animation for number change
                    numberElement.style.transition = 'transform 0.3s ease';
                    numberElement.style.transform = 'scale(1.2)';
                    
                    setTimeout(() => {
                        numberElement.textContent = diffDays;
                        textElement.textContent = diffDays === 1 ? 'day' : 'days';
                        numberElement.style.transform = 'scale(1)';
                    }, 150);
                }
                
                if (durationContainer) {
                    durationContainer.classList.add('has-value');
                }
            } else {
                LeaveManager.resetDurationDisplay();
            }
        } else {
            LeaveManager.resetDurationDisplay();
        }
        
        // Update end date minimum when start date changes
        if (startDate && endDateInput) {
            endDateInput.setAttribute('min', startDate);
        }
    },

    // Reset duration display
    resetDurationDisplay: () => {
        const durationDisplay = document.getElementById('leaveDuration');
        const durationContainer = durationDisplay?.closest('.duration-display');
        
        if (durationDisplay) {
            const numberElement = durationDisplay.querySelector('.duration-number');
            const textElement = durationDisplay.querySelector('.duration-text');
            
            if (numberElement && textElement) {
                numberElement.textContent = '0';
                textElement.textContent = 'days';
            }
        }
        
        if (durationContainer) {
            durationContainer.classList.remove('has-value');
        }
    },

    // Submit leave request with enhanced error handling
    submitRequest: async (formData) => {
        try {
            const response = await fetch('/employee/leave/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Submit request error:', error);
            throw error;
        }
    },

    // Cancel leave request
    cancelRequest: async (requestId) => {
        if (!confirm('Are you sure you want to cancel this leave request? This action cannot be undone.')) {
            return;
        }
        
        try {
            LoadingManager.show();
            
            const response = await fetch(`/employee/leave/${requestId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                UI.showMessage(data.message, 'success');
                await LeaveManager.removeRequestFromUI(requestId);
                await DataManager.refreshStats();
            } else {
                UI.showMessage(data.error || 'Failed to cancel leave request', 'error');
            }
            
        } catch (error) {
            console.error('Cancel request error:', error);
            UI.showMessage('Failed to cancel leave request. Please try again.', 'error');
        } finally {
            LoadingManager.hide();
        }
    },

    // Remove request from UI with animation
    removeRequestFromUI: (requestId) => {
        return new Promise((resolve) => {
            const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
            if (!requestCard) {
                resolve();
                return;
            }
            
            // Animate out
            requestCard.style.transition = 'all 0.4s ease';
            requestCard.style.transform = 'translateX(-100%) scale(0.8)';
            requestCard.style.opacity = '0';
            
            setTimeout(() => {
                requestCard.remove();
                
                // Check if history is empty and show empty state
                const historyContainer = document.getElementById('leaveHistory');
                if (historyContainer && historyContainer.children.length === 0) {
                    LeaveManager.showEmptyState(historyContainer);
                }
                
                resolve();
            }, 400);
        });
    },

    // Show empty state
    showEmptyState: (container) => {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                    </svg>
                </div>
                <h3>No Leave Requests</h3>
                <p>You haven't submitted any leave requests yet. Use the form above to submit your first request.</p>
            </div>
        `;
    },

    // Add new request to history with animation
    addRequestToHistory: (request) => {
        const historyContainer = document.getElementById('leaveHistory');
        if (!historyContainer) return;
        
        // Remove empty state if it exists
        const emptyState = historyContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.style.transition = 'all 0.3s ease';
            emptyState.style.opacity = '0';
            setTimeout(() => emptyState.remove(), 300);
        }
        
        // Create new request card
        const requestCard = document.createElement('div');
        requestCard.className = 'leave-request-card';
        requestCard.setAttribute('data-request-id', request.id);
        requestCard.style.opacity = '0';
        requestCard.style.transform = 'translateY(-20px) scale(0.95)';
        
        const cancelButton = request.status === 'pending' ? 
            `<button class="cancel-btn" onclick="LeaveManager.cancelRequest('${request.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>` : '';
        
        requestCard.innerHTML = `
            <div class="card-header">
                <div class="request-info">
                    <h4 class="request-title">${request.leave_type_label}</h4>
                    <div class="request-dates">
                        ${Utils.formatDate(request.start_date)} - ${Utils.formatDate(request.end_date)}
                        <span class="duration-badge">${request.leave_days} days</span>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-badge ${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                    ${cancelButton}
                </div>
            </div>
            <div class="card-body">
                <div class="request-reason">
                    <strong>Reason:</strong> ${request.reason}
                </div>
                <div class="request-meta">
                    <span class="submitted-date">Submitted on ${Utils.formatDate(request.created_at)}</span>
                </div>
            </div>
        `;
        
        // Add to top of history
        historyContainer.insertBefore(requestCard, historyContainer.firstChild);
        
        // Animate in
        requestAnimationFrame(() => {
            requestCard.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            requestCard.style.opacity = '1';
            requestCard.style.transform = 'translateY(0) scale(1)';
        });
    }
};

// Data management system
const DataManager = {
    // Refresh leave statistics
    refreshStats: async () => {
        try {
            const response = await fetch('/employee/leave/stats');
            const data = await response.json();
            
            if (data.success) {
                DataManager.updateStatsDisplay(data.stats);
            }
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    },

    // Update stats display with animation
    updateStatsDisplay: (stats) => {
        const statElements = {
            totalRequested: document.getElementById('totalRequested'),
            approvedDays: document.getElementById('approvedDays'),
            remainingBalance: document.getElementById('remainingBalance'),
            pendingRequests: document.getElementById('pendingRequests')
        };

        Object.entries(statElements).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                DataManager.animateNumber(element, parseInt(element.textContent) || 0, stats[key]);
            }
        });
    },

    // Animate number change
    animateNumber: (element, from, to, duration = 1000) => {
        const startTime = performance.now();
        const difference = to - from;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + difference * easedProgress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },

    // Refresh leave history
    refreshHistory: async () => {
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        
        try {
            UI.setButtonLoading(refreshBtn, true, `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="23,4 23,10 17,10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh
            `);

            const response = await fetch('/employee/leave/history');
            const data = await response.json();

            if (data.success) {
                DataManager.updateHistoryDisplay(data.history);
                DataManager.updateStatsDisplay(data.stats);
                UI.showMessage('History refreshed successfully!', 'success');
            } else {
                UI.showMessage('Failed to refresh history.', 'error');
            }

        } catch (error) {
            console.error('Error refreshing history:', error);
            UI.showMessage('Failed to refresh history. Please try again.', 'error');
        } finally {
            UI.setButtonLoading(refreshBtn, false, `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="23,4 23,10 17,10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh
            `);
        }
    },

    // Update history display
    updateHistoryDisplay: (history) => {
        const historyContainer = document.getElementById('leaveHistory');
        
        if (!historyContainer || !history) return;

        if (history.length === 0) {
            LeaveManager.showEmptyState(historyContainer);
            return;
        }

        const historyHTML = history.map(request => {
            const cancelButton = request.status === 'pending' ? 
                `<button class="cancel-btn" onclick="LeaveManager.cancelRequest('${request.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>` : '';
            
            return `
                <div class="leave-request-card" data-request-id="${request.id}">
                    <div class="card-header">
                        <div class="request-info">
                            <h4 class="request-title">${request.leave_type_label}</h4>
                            <div class="request-dates">
                                ${Utils.formatDate(request.start_date)} - ${Utils.formatDate(request.end_date)}
                                <span class="duration-badge">${request.leave_days} days</span>
                            </div>
                        </div>
                        <div class="request-status">
                            <span class="status-badge ${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                            ${cancelButton}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="request-reason">
                            <strong>Reason:</strong> ${request.reason}
                        </div>
                        <div class="request-meta">
                            <span class="submitted-date">Submitted on ${Utils.formatDate(request.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Fade out and update
        historyContainer.style.transition = 'opacity 0.3s ease';
        historyContainer.style.opacity = '0.5';
        
        setTimeout(() => {
            historyContainer.innerHTML = historyHTML;
            historyContainer.style.opacity = '1';
        }, 150);
    }
};

// Loading manager
const LoadingManager = {
    overlay: null,

    // Initialize loading overlay
    init: () => {
        if (!LoadingManager.overlay) {
            LoadingManager.overlay = document.createElement('div');
            LoadingManager.overlay.id = 'loadingOverlay';
            LoadingManager.overlay.className = 'loading-overlay';
            LoadingManager.overlay.innerHTML = `
                <div class="loading-spinner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                </div>
            `;
            document.body.appendChild(LoadingManager.overlay);
        }
    },

    // Show loading overlay
    show: () => {
        LoadingManager.init();
        LoadingManager.overlay.classList.add('show');
    },

    // Hide loading overlay
    hide: () => {
        if (LoadingManager.overlay) {
            LoadingManager.overlay.classList.remove('show');
        }
    }
};

// Event handlers
const EventHandlers = {
    // Form submission handler
    handleFormSubmit: async (e) => {
        e.preventDefault();
        
        if (AppState.isFormSubmitting) return;
        
        const form = e.target;
        const submitBtn = document.getElementById('submitLeaveBtn');
        
        // Validate form
        if (!FormValidator.validateForm(form)) {
            UI.showMessage('Please correct the errors in the form', 'error');
            Utils.scrollToElement(form, 100);
            return;
        }
        
        try {
            AppState.isFormSubmitting = true;
            LoadingManager.show();
            
            // Update submit button
            const originalBtnText = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Submit Leave Request
            `;
            
            UI.setButtonLoading(submitBtn, true, originalBtnText);
            
            // Prepare form data
            const formData = {
                leave_type: form.leave_type.value,
                start_date: form.start_date.value,
                end_date: form.end_date.value,
                reason: form.reason.value.trim()
            };
            
            // Submit to server
            const data = await LeaveManager.submitRequest(formData);
            
            if (data.success) {
                UI.showMessage(data.message, 'success');
                EventHandlers.resetForm();
                
                // Add new request to history
                if (data.leave_request) {
                    LeaveManager.addRequestToHistory(data.leave_request);
                }
                
                // Refresh stats
                await DataManager.refreshStats();
            } else {
                UI.showMessage(data.error || 'Failed to submit leave request', 'error');
            }
            
        } catch (error) {
            console.error('Error submitting leave request:', error);
            UI.showMessage('Failed to submit leave request. Please try again.', 'error');
        } finally {
            AppState.isFormSubmitting = false;
            LoadingManager.hide();
            UI.setButtonLoading(submitBtn, false, `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Submit Leave Request
            `);
        }
    },

    // Reset form handler
    resetForm: () => {
        const form = document.getElementById('leaveRequestForm');
        if (!form) return;
        
        // Animate form reset
        form.style.transition = 'opacity 0.3s ease';
        form.style.opacity = '0.7';
        
        setTimeout(() => {
            form.reset();
            
            // Clear all validation states
            const formFields = form.querySelectorAll('.form-input, .form-select, .form-textarea');
            formFields.forEach(field => {
                UI.clearFieldError(field);
            });
            
            // Reset duration display
            LeaveManager.resetDurationDisplay();
            
            form.style.opacity = '1';
            UI.showMessage('Form has been reset', 'info', 3000);
        }, 150);
    },

    // Field validation handler with debouncing
    handleFieldValidation: Utils.debounce((field) => {
        const fieldName = field.name;
        if (FormValidator.rules[fieldName]) {
            const result = FormValidator.validateField(fieldName, field.value, field.form);
            if (!result.valid) {
                UI.setFieldError(field, result.message);
            } else {
                UI.setFieldSuccess(field);
            }
        }
    }, 300),

    // Field input handler
    handleFieldInput: (field) => {
        UI.clearFieldError(field);
        
        // Special handling for date fields
        if (field.type === 'date') {
            LeaveManager.calculateDuration();
        }
    },

    // Message close handler
    handleMessageClose: (e) => {
        const closeBtn = e.target.closest('.message-close');
        if (closeBtn) {
            const message = closeBtn.closest('.message');
            if (message) {
                UI.closeMessage(message.id);
            }
        }
    },

    // Initialize date constraints
    initializeDateConstraints: () => {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.setAttribute('min', today);
        }
        
        if (endDateInput) {
            endDateInput.setAttribute('min', today);
        }
    }
};

// Main initialization function
function initializeLeavePage() {
    EventHandlers.initializeDateConstraints();
    LeaveManager.calculateDuration();
    
    console.log('Leave page initialized successfully');
}

// Setup all event listeners
function setupEventListeners() {
    // Leave form submission
    const leaveForm = document.getElementById('leaveRequestForm');
    if (leaveForm) {
        leaveForm.addEventListener('submit', EventHandlers.handleFormSubmit);
    }

    // Date inputs for duration calculation
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            LeaveManager.calculateDuration();
            EventHandlers.handleFieldValidation(startDateInput);
        });
        startDateInput.addEventListener('input', () => EventHandlers.handleFieldInput(startDateInput));
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', () => {
            LeaveManager.calculateDuration();
            EventHandlers.handleFieldValidation(endDateInput);
        });
        endDateInput.addEventListener('input', () => EventHandlers.handleFieldInput(endDateInput));
    }

    // Reset form button
    const resetFormBtn = document.getElementById('resetFormBtn');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', EventHandlers.resetForm);
    }

    // Refresh history button
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', DataManager.refreshHistory);
    }

    // Message close buttons (using event delegation)
    document.addEventListener('click', EventHandlers.handleMessageClose);

    // Form validation on input/blur
    const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    formInputs.forEach(input => {
        input.addEventListener('blur', () => EventHandlers.handleFieldValidation(input));
        input.addEventListener('input', () => EventHandlers.handleFieldInput(input));
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to close messages
        if (e.key === 'Escape') {
            const messages = document.querySelectorAll('.message');
            messages.forEach(message => UI.closeMessage(message.id));
        }
        
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('leaveRequestForm');
            if (form && !AppState.isFormSubmitting) {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });

    // Form auto-save (optional enhancement)
    const autoSaveInputs = document.querySelectorAll('#leaveRequestForm input, #leaveRequestForm select, #leaveRequestForm textarea');
    autoSaveInputs.forEach(input => {
        input.addEventListener('input', Utils.debounce(() => {
            // Save form data to sessionStorage for recovery
            const formData = new FormData(document.getElementById('leaveRequestForm'));
            const data = Object.fromEntries(formData.entries());
            try {
                sessionStorage.setItem('leaveFormDraft', JSON.stringify(data));
            } catch (e) {
                // Handle storage errors silently
            }
        }, 1000));
    });

    // Load saved form data on page load
    try {
        const savedData = sessionStorage.getItem('leaveFormDraft');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.entries(data).forEach(([key, value]) => {
                const field = document.querySelector(`[name="${key}"]`);
                if (field && value) {
                    field.value = value;
                    if (field.type === 'date') {
                        LeaveManager.calculateDuration();
                    }
                }
            });
        }
    } catch (e) {
        // Handle parsing errors silently
    }

    // Clear draft on successful submission
    leaveForm?.addEventListener('submit', (e) => {
        if (!e.defaultPrevented) {
            try {
                sessionStorage.removeItem('leaveFormDraft');
            } catch (e) {
                // Handle storage errors silently
            }
        }
    });
}

// Performance optimization: Intersection Observer for animations
const observeAnimations = () => {
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe cards and stats
    document.querySelectorAll('.stat-card, .leave-request-card').forEach(el => {
        animateOnScroll.observe(el);
    });
};

// Global functions for HTML onclick handlers
window.LeaveManager = LeaveManager;
window.cancelLeaveRequest = LeaveManager.cancelRequest;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeLeavePage();
    setupEventListeners();
    observeAnimations();
    
    // Add performance monitoring
    if (performance.mark) {
        performance.mark('leave-page-ready');
        console.log('Leave page initialization completed');
    }
});

// Handle page visibility changes for better UX
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when user returns to tab
        DataManager.refreshStats();
    }
});

// Add error boundary for unhandled errors
window.addEventListener('error', (e) => {
    console.error('Unhandled error:', e.error);
    UI.showMessage('An unexpected error occurred. Please refresh the page.', 'error');
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    UI.showMessage('An error occurred while processing your request.', 'error');
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        FormValidator,
        LeaveManager,
        DataManager,
        UI,
        LoadingManager
    };
}