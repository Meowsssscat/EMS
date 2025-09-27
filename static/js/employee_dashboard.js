/**
 * EMS Employee Dashboard JavaScript
 * Handles dashboard interactions, clock in/out, and real-time updates
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    updateCurrentDate();
    setupEventListeners();
    initializePeriodicUpdates();
});

/**
 * Initialize dashboard components
 */
function initializeDashboard() {
    updateClockButtonState();
    initializeAnimations();
    checkOnlineStatus();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Handle window resize for responsive behavior
    window.addEventListener('resize', handleWindowResize);
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Add click handlers for metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'translateY(-6px)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
}

/**
 * Update current date and time display
 */
function updateCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

/**
 * Clock In/Out functionality
 */
async function clockInOut() {
    const clockBtn = document.getElementById('clockBtn');
    if (!clockBtn) return;
    
    // Prevent multiple clicks
    if (clockBtn.disabled) return;
    clockBtn.disabled = true;
    
    // Show loading state
    const originalContent = clockBtn.innerHTML;
    clockBtn.innerHTML = `
        <div class="spinner"></div>
        Processing...
    `;
    clockBtn.classList.add('loading');
    
    try {
        const response = await fetch('/employee/clock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update UI based on response
            updateAttendanceUI(data);
            showNotification(data.message, 'success');
            
            // Refresh dashboard data
            setTimeout(() => {
                refreshDashboardData();
            }, 1000);
        } else {
            throw new Error(data.message || 'Clock operation failed');
        }
        
    } catch (error) {
        console.error('Clock operation error:', error);
        showNotification('Failed to record attendance. Please try again.', 'error');
    } finally {
        // Reset button state
        clockBtn.innerHTML = originalContent;
        clockBtn.classList.remove('loading');
        clockBtn.disabled = false;
        
        // Update button state based on current attendance
        updateClockButtonState();
    }
}

/**
 * Update attendance UI after successful clock operation
 */
function updateAttendanceUI(data) {
    const clockInTime = document.getElementById('clockInTime');
    const clockOutTime = document.getElementById('clockOutTime');
    const clockInStatus = document.getElementById('clockInStatus');
    const clockOutStatus = document.getElementById('clockOutStatus');
    const totalHours = document.getElementById('totalHours');
    
    if (data.action === 'clock_in') {
        if (clockInTime) {
            clockInTime.textContent = data.clock_in_time;
            animateValueChange(clockInTime);
        }
        if (clockInStatus) {
            clockInStatus.textContent = 'Present';
            clockInStatus.className = 'attendance-status present';
            animateStatusChange(clockInStatus);
        }
        if (clockOutStatus) {
            clockOutStatus.textContent = 'Present';
            clockOutStatus.className = 'attendance-status pending';
        }
    } else if (data.action === 'clock_out') {
        if (clockOutTime) {
            clockOutTime.textContent = data.clock_out_time;
            animateValueChange(clockOutTime);
        }
        if (clockOutStatus) {
            clockOutStatus.textContent = 'Completed';
            clockOutStatus.className = 'attendance-status present';
            animateStatusChange(clockOutStatus);
        }
        if (totalHours && data.total_hours) {
            animateNumberChange(totalHours, data.total_hours);
        }
    }
}

/**
 * Update clock button state based on current attendance
 */
function updateClockButtonState() {
    const clockBtn = document.getElementById('clockBtn');
    const clockInTime = document.getElementById('clockInTime');
    const clockOutTime = document.getElementById('clockOutTime');
    
    if (!clockBtn) return;
    
    const isClockedIn = clockInTime && clockInTime.textContent !== '--:--';
    const isClockedOut = clockOutTime && clockOutTime.textContent !== '--:--';
    
    let buttonText = 'Clock In';
    let iconPath = 'M12 2v20M2 12h20';
    
    if (isClockedOut) {
        buttonText = 'Completed';
        iconPath = 'M20 6L9 17l-5.1-5.1';
        clockBtn.disabled = true;
    } else if (isClockedIn) {
        buttonText = 'Clock Out';
        iconPath = 'M12 2v20M2 12h20';
    }
    
    clockBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="${iconPath}"/>
        </svg>
        ${buttonText}
    `;
}

/**
 * Refresh dashboard data from server
 */
async function refreshDashboardData() {
    try {
        const response = await fetch('/employee/dashboard-data', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateDashboardWithNewData(data);
        } else {
            throw new Error(data.error || 'Failed to refresh dashboard');
        }
        
    } catch (error) {
        console.error('Dashboard refresh error:', error);
        // Silent fail for background refresh
    }
}

/**
 * Update dashboard with fresh data from server
 */
function updateDashboardWithNewData(data) {
    // Update metrics if provided
    if (data.employee_stats) {
        const stats = data.employee_stats;
        
        // Update attendance rate
        const attendanceRate = document.querySelector('.metric-card.primary .metric-number');
        if (attendanceRate && stats.attendance_rate !== undefined) {
            animateNumberChange(attendanceRate, stats.attendance_rate + '%');
        }
        
        // Update leave balance
        const leaveBalance = document.querySelector('.metric-card.secondary .metric-number');
        if (leaveBalance && stats.leave_balance !== undefined) {
            animateNumberChange(leaveBalance, stats.leave_balance);
        }
        
        // Update pending requests
        const pendingRequests = document.querySelector('.metric-card.warning .metric-number');
        if (pendingRequests && stats.pending_requests !== undefined) {
            animateNumberChange(pendingRequests, stats.pending_requests);
        }
    }
    
    // Update today's attendance
    if (data.today_attendance) {
        const attendance = data.today_attendance;
        
        const clockInTime = document.getElementById('clockInTime');
        const clockOutTime = document.getElementById('clockOutTime');
        const totalHours = document.getElementById('totalHours');
        
        if (clockInTime && attendance.clock_in) {
            const clockInFormatted = new Date(attendance.clock_in).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            if (clockInTime.textContent !== clockInFormatted) {
                clockInTime.textContent = clockInFormatted;
                animateValueChange(clockInTime);
            }
        }
        
        if (clockOutTime && attendance.clock_out) {
            const clockOutFormatted = new Date(attendance.clock_out).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            if (clockOutTime.textContent !== clockOutFormatted) {
                clockOutTime.textContent = clockOutFormatted;
                animateValueChange(clockOutTime);
            }
        }
        
        if (totalHours && attendance.total_hours) {
            animateNumberChange(totalHours, attendance.total_hours.toFixed(1));
        }
        
        // Update clock button state
        updateClockButtonState();
    }
}

/**
 * Animate value changes with smooth transitions
 */
function animateValueChange(element) {
    if (!element) return;
    
    element.style.transform = 'scale(1.1)';
    element.style.color = 'var(--success-color)';
    element.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 300);
}

/**
 * Animate status changes
 */
function animateStatusChange(element) {
    if (!element) return;
    
    element.style.transform = 'translateX(5px)';
    element.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
        element.style.transform = 'translateX(0)';
    }, 200);
}

/**
 * Animate number changes with counting effect
 */
function animateNumberChange(element, newValue) {
    if (!element) return;
    
    const currentValue = parseFloat(element.textContent) || 0;
    const targetValue = parseFloat(newValue);
    
    if (currentValue === targetValue) return;
    
    const difference = targetValue - currentValue;
    const steps = 20;
    const stepValue = difference / steps;
    const stepDuration = 50; // milliseconds
    
    let currentStep = 0;
    const interval = setInterval(() => {
        currentStep++;
        const displayValue = currentValue + (stepValue * currentStep);
        
        if (newValue.includes('%')) {
            element.textContent = Math.round(displayValue) + '%';
        } else if (newValue.includes('.')) {
            element.textContent = displayValue.toFixed(1);
        } else {
            element.textContent = Math.round(displayValue);
        }
        
        if (currentStep >= steps) {
            clearInterval(interval);
            element.textContent = newValue;
            animateValueChange(element);
        }
    }, stepDuration);
}

/**
 * Initialize smooth animations
 */
function initializeAnimations() {
    // Add stagger animation to metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.transition = 'all 0.6s ease';
        }, index * 100);
    });
    
    // Add entrance animation to dashboard panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach((panel, index) => {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
            panel.style.transition = 'all 0.6s ease';
        }, (index + metricCards.length) * 100);
    });
}

/**
 * Show notification with enhanced styling
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.dashboard-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `dashboard-notification notification-${type}`;
    
    // Set notification icon based on type
    let iconPath = '';
    switch (type) {
        case 'success':
            iconPath = 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-2.99';
            break;
        case 'error':
            iconPath = 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01';
            break;
        case 'warning':
            iconPath = 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z';
            break;
        default:
            iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="${iconPath}"/>
            </svg>
        </div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    // Add notification styles if not already present
    addNotificationStyles();
    
    // Add notification to page
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    notificationContainer.appendChild(notification);
    
    // Trigger entrance animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

/**
 * Add notification styles dynamically
 */
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
        #notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        }
        
        .dashboard-notification {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 320px;
            padding: 16px;
            margin-bottom: 12px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(26, 35, 126, 0.15);
            border-left: 4px solid var(--info-color);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: all;
        }
        
        .notification-success { border-left-color: var(--success-color); }
        .notification-error { border-left-color: var(--error-color); }
        .notification-warning { border-left-color: var(--warning-color); }
        .notification-info { border-left-color: var(--info-color); }
        
        .notification-icon {
            width: 24px;
            height: 24px;
            flex-shrink: 0;
        }
        
        .notification-success .notification-icon { color: var(--success-color); }
        .notification-error .notification-icon { color: var(--error-color); }
        .notification-warning .notification-icon { color: var(--warning-color); }
        .notification-info .notification-icon { color: var(--info-color); }
        
        .notification-content { flex: 1; }
        
        .notification-message {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            line-height: 1.4;
        }
        
        .notification-close {
            width: 24px;
            height: 24px;
            border: none;
            background: none;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .notification-close:hover {
            background: rgba(0, 0, 0, 0.05);
            color: var(--text-primary);
        }
        
        .notification-close svg {
            width: 16px;
            height: 16px;
        }
        
        @media (max-width: 480px) {
            #notification-container {
                top: 10px;
                right: 10px;
                left: 10px;
            }
            
            .dashboard-notification {
                min-width: auto;
                width: 100%;
            }
        }
    `;
    document.head.appendChild(styles);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // ESC key to close notifications
    if (e.key === 'Escape') {
        const notifications = document.querySelectorAll('.dashboard-notification');
        notifications.forEach(notification => notification.remove());
    }
    
    // Ctrl+R to refresh dashboard (prevent default browser refresh)
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshDashboardData();
        showNotification('Dashboard refreshed', 'success');
    }
    
    // Space bar for quick clock in/out (only when not in input fields)
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        clockInOut();
    }
}

/**
 * Handle window resize for responsive behavior
 */
function handleWindowResize() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
}

/**
 * Check and update online status
 */
function checkOnlineStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    if (!statusIndicator) return;
    
    if (navigator.onLine) {
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusIndicator.innerHTML = `
            <span class="status-dot"></span>
            Online
        `;
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusIndicator.innerHTML = `
            <span class="status-dot offline"></span>
            Offline
        `;
    }
}

/**
 * Get CSRF token from meta tag or cookie
 */
function getCSRFToken() {
    // Try to get CSRF token from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Fallback to cookie-based CSRF token
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf_token') {
            return decodeURIComponent(value);
        }
    }
    
    // Last resort - try to get from form if exists
    const csrfInput = document.querySelector('input[name="csrf_token"]');
    if (csrfInput) {
        return csrfInput.value;
    }
    
    return '';
}

/**
 * Initialize periodic updates for real-time data
 */
function initializePeriodicUpdates() {
    // Update current date every minute
    setInterval(updateCurrentDate, 60000);
    
    // Refresh dashboard data every 5 minutes
    setInterval(refreshDashboardData, 300000);
    
    // Check online status every 30 seconds
    setInterval(checkOnlineStatus, 30000);
    
    // Listen for online/offline events
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
}

/**
 * Utility function to format time
 */
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Utility function to format date
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Export functions for global access
 */
window.EmployeeDashboard = {
    clockInOut,
    refreshDashboardData,
    showNotification
};