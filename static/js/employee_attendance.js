/**
 * Employee Attendance Page JavaScript - Main Content Only
 * Handles attendance marking and page interactivity
 */

// Global variables
let currentTime = new Date();
let timeUpdateInterval;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAttendancePage();
    startTimeUpdates();
    setupEventListeners();
    createMessageContainer();
    createLoadingOverlay();
});

/**
 * Initialize the attendance page
 */
function initializeAttendancePage() {
    updateCurrentTime();
    console.log('Attendance page initialized');
}

/**
 * Create message container if it doesn't exist
 */
function createMessageContainer() {
    if (!document.getElementById('messageContainer')) {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
    }
}

/**
 * Create loading overlay if it doesn't exist
 */
function createLoadingOverlay() {
    if (!document.getElementById('loadingOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Mark Attendance Button
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    if (markAttendanceBtn && !markAttendanceBtn.disabled) {
        markAttendanceBtn.addEventListener('click', handleMarkAttendance);
    }

    // Refresh History Button
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', refreshAttendanceHistory);
    }

    // Message close buttons (event delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('message-close') || e.target.closest('.message-close')) {
            const message = e.target.closest('.message');
            if (message) {
                closeMessage(message);
            }
        }
    });

    // Enhanced hover effects for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Timeline item hover effects
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const content = this.querySelector('.timeline-content');
            const marker = this.querySelector('.timeline-marker');
            
            if (content) {
                content.style.transform = 'translateX(12px) scale(1.02)';
            }
            if (marker) {
                marker.style.transform = 'scale(1.15) rotate(5deg)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const content = this.querySelector('.timeline-content');
            const marker = this.querySelector('.timeline-marker');
            
            if (content) {
                content.style.transform = 'translateX(0) scale(1)';
            }
            if (marker) {
                marker.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
}

/**
 * Update current time display
 */
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        currentTimeElement.textContent = timeString;
    }
}

/**
 * Start time update interval
 */
function startTimeUpdates() {
    // Update time every second
    timeUpdateInterval = setInterval(updateCurrentTime, 1000);
}

/**
 * Handle mark attendance button click
 */
async function handleMarkAttendance() {
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    
    try {
        // Show loading state
        showLoadingOverlay();
        markAttendanceBtn.disabled = true;
        
        // Add button loading animation
        const originalContent = markAttendanceBtn.innerHTML;
        markAttendanceBtn.innerHTML = `
            <svg class="btn-icon loading" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Marking...
        `;

        // Simulate API delay for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Make API request (replace with actual endpoint)
        const response = await fetch('/employee/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update UI on success
            updateAttendanceUI(data);
            showMessage(data.message || 'Attendance marked successfully!', 'success');
            
            // Refresh the page data
            await refreshPageData();
        } else {
            showMessage(data.message || 'Failed to mark attendance', data.type || 'error');
            
            // Reset button if not already marked
            if (!data.message || !data.message.includes('already marked')) {
                markAttendanceBtn.disabled = false;
                markAttendanceBtn.innerHTML = originalContent;
            }
        }

    } catch (error) {
        console.error('Error marking attendance:', error);
        showMessage('Failed to mark attendance. Please try again.', 'error');
        
        // Reset button
        markAttendanceBtn.disabled = false;
        markAttendanceBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
            Mark Attendance
        `;
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Update attendance UI after successful marking
 */
function updateAttendanceUI(data) {
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    const todayStatus = document.getElementById('todayStatus');

    // Update button with smooth transition
    if (markAttendanceBtn) {
        markAttendanceBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            markAttendanceBtn.disabled = true;
            markAttendanceBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Already Marked
            `;
            markAttendanceBtn.style.transform = 'scale(1)';
        }, 150);
    }

    // Update status badge with animation
    if (todayStatus) {
        todayStatus.style.transform = 'scale(0.95)';
        setTimeout(() => {
            todayStatus.innerHTML = '<span class="status-badge success">Marked</span>';
            todayStatus.style.transform = 'scale(1)';
        }, 150);
    }

    // Update stats if provided
    if (data.stats) {
        updateStatsDisplay(data.stats);
    }
}

/**
 * Update stats display with animation
 */
function updateStatsDisplay(stats) {
    const presentDaysElement = document.getElementById('presentDays');
    const attendanceRateElement = document.getElementById('attendanceRate');
    const totalDaysElement = document.getElementById('totalDays');

    // Animate number changes
    if (presentDaysElement) {
        animateNumberChange(presentDaysElement, stats.present_days);
    }
    
    if (attendanceRateElement) {
        animateNumberChange(attendanceRateElement, stats.attendance_rate + '%');
    }
    
    if (totalDaysElement) {
        animateNumberChange(totalDaysElement, stats.total_days);
    }
}

/**
 * Animate number change in element
 */
function animateNumberChange(element, newValue) {
    element.style.transform = 'scale(1.1)';
    element.style.color = 'var(--primary-navy)';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 200);
}

/**
 * Refresh attendance history
 */
async function refreshAttendanceHistory() {
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    
    try {
        // Show loading state
        if (refreshBtn) {
            refreshBtn.disabled = true;
            const originalContent = refreshBtn.innerHTML;
            refreshBtn.innerHTML = `
                <svg class="btn-icon loading" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Refreshing...
            `;
            
            // Add subtle pulse effect
            refreshBtn.style.animation = 'pulse 1s infinite';
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await fetch('/employee/attendance/history');
        const data = await response.json();

        if (data.success) {
            updateHistoryDisplay(data.history);
            if (data.stats) {
                updateStatsDisplay(data.stats);
            }
            showMessage('History refreshed successfully!', 'success');
        } else {
            showMessage('Failed to refresh history.', 'error');
        }

    } catch (error) {
        console.error('Error refreshing history:', error);
        showMessage('Failed to refresh history. Please try again.', 'error');
    } finally {
        // Reset button
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.style.animation = '';
            refreshBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="23,4 23,10 17,10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh
            `;
        }
    }
}

/**
 * Update history display with new data and animations
 */
function updateHistoryDisplay(history) {
    const timelineElement = document.getElementById('attendanceTimeline');
    
    if (!timelineElement || !history) return;

    // Fade out current content
    timelineElement.style.opacity = '0.5';
    timelineElement.style.transform = 'translateY(20px)';

    setTimeout(() => {
        if (history.length === 0) {
            timelineElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <h3>No Attendance Records</h3>
                    <p>Start marking your attendance to see your history here.</p>
                </div>
            `;
        } else {
            const historyHTML = history.map((record, index) => {
                const statusIcon = getStatusIcon(record.status);
                const formattedDate = formatDate(record.date);
                const formattedCreatedAt = formatDate(record.created_at);
                
                return `
                    <div class="timeline-item" style="animation: slideInUp 0.6s ease ${index * 0.1}s both">
                        <div class="timeline-marker ${record.status}">
                            ${statusIcon}
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h4 class="timeline-date">${formattedDate}</h4>
                                <span class="timeline-status ${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span>
                            </div>
                            <div class="timeline-details">
                                <p>Marked on ${formattedCreatedAt}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            timelineElement.innerHTML = historyHTML;
        }

        // Fade in new content
        timelineElement.style.opacity = '1';
        timelineElement.style.transform = 'translateY(0)';
    }, 300);
}

/**
 * Get status icon SVG
 */
function getStatusIcon(status) {
    switch (status) {
        case 'present':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>`;
        case 'absent':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>`;
        case 'late':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                    </svg>`;
        default:
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>`;
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    
    // Format as readable date
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    };
    
    return date.toLocaleDateString('en-US', options);
}

/**
 * Refresh page data
 */
async function refreshPageData() {
    try {
        const response = await fetch('/employee/attendance/stats');
        const data = await response.json();
        
        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Error refreshing page data:', error);
    }
}

/**
 * Show message to user with enhanced animations
 */
function showMessage(text, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) return;

    const messageId = 'message_' + Date.now();
    const iconSvg = getMessageIcon(type);
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.id = messageId;
    messageElement.innerHTML = `
        <div class="message-icon">${iconSvg}</div>
        <span>${text}</span>
        <button class="message-close" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    // Add entrance animation
    messageElement.style.transform = 'translateX(100%)';
    messageElement.style.opacity = '0';
    
    messageContainer.appendChild(messageElement);
    
    // Trigger animation
    setTimeout(() => {
        messageElement.style.transform = 'translateX(0)';
        messageElement.style.opacity = '1';
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const msg = document.getElementById(messageId);
        if (msg) {
            closeMessage(msg);
        }
    }, 5000);
}

/**
 * Get message icon based on type
 */
function getMessageIcon(type) {
    switch (type) {
        case 'success':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>`;
        case 'error':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>`;
        case 'warning':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>`;
        case 'info':
        default:
            return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>`;
    }
}

/**
 * Close message with animation
 */
function closeMessage(messageElement) {
    if (messageElement) {
        messageElement.style.transform = 'translateX(100%) scale(0.8)';
        messageElement.style.opacity = '0';
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

/**
 * Add dynamic animations and effects
 */
function addDynamicEffects() {
    // Add slide-up animation for timeline items
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes bounce {
            0%, 20%, 53%, 80%, 100% {
                animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
                transform: translate3d(0, 0, 0);
            }
            40%, 43% {
                animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
                transform: translate3d(0, -8px, 0);
            }
            70% {
                animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
                transform: translate3d(0, -4px, 0);
            }
            90% {
                transform: translate3d(0, -2px, 0);
            }
        }
        
        .stat-card:hover .stat-number {
            animation: bounce 1s ease;
        }
        
        .timeline-marker:hover {
            animation: bounce 0.6s ease;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize intersection observer for animations
 */
function initializeIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideInUp 0.6s ease both';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe timeline items for scroll animations
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        observer.observe(item);
    });
}

// Initialize dynamic effects
addDynamicEffects();
initializeIntersectionObserver();

// Clean up intervals when page is unloaded
window.addEventListener('beforeunload', function() {
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
});

// Export functions for potential external use
window.attendanceModule = {
    showMessage,
    refreshAttendanceHistory,
    updateStatsDisplay,
    handleMarkAttendance
};