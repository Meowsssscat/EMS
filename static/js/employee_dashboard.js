/**
 * EMS Employee Dashboard JavaScript - Main Content Only
 * Handles dashboard interactions, clock in/out, and notifications
 * Navigation, footer, and profile modal functionality removed
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    updateCurrentDate();
    setupEventListeners();
    initializePeriodicUpdates();
});

/**
 * Initialize dashboard components
 */
function initializeDashboard() {
    // Update clock status based on current attendance data
    updateClockStatus();
    
    // Initialize any tooltips or interactive elements
    initializeInteractiveElements();
    
    // Set up smooth animations
    initializeAnimations();
}

/**
 * Setup event listeners for dashboard interactions
 */
function setupEventListeners() {
    // Add click handlers for metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('click', function() {
            const cardType = this.querySelector('.metric-icon').className.split(' ')[1];
            handleMetricCardClick(cardType);
        });
    });
    
    // Add hover effects for interactive elements
    setupHoverEffects();
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Handle window resize for responsive behavior
    window.addEventListener('resize', handleWindowResize);
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
 * Clock In/Out functionality with enhanced UI feedback
 */
function clockInOut() {
    const clockInTime = document.getElementById('clockInTime');
    const clockOutTime = document.getElementById('clockOutTime');
    const totalHours = document.getElementById('totalHours');
    const clockInStatus = document.getElementById('clockInStatus');
    const clockOutStatus = document.getElementById('clockOutStatus');
    
    const currentTime = new Date();
    const timeString = currentTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Check current clock status
    const isClockedIn = clockInTime && clockInTime.textContent !== '--:--';
    const isClockedOut = clockOutTime && clockOutTime.textContent !== '--:--';
    
    // Add loading state
    const heroBtn = document.querySelector('.hero-btn.primary');
    if (heroBtn) {
        heroBtn.classList.add('loading');
        heroBtn.innerHTML = `
            <div class="spinner"></div>
            Processing...
        `;
    }
    
    // Simulate API call delay for better UX
    setTimeout(() => {
        if (!isClockedIn) {
            // Clock In
            if (clockInTime) {
                clockInTime.textContent = timeString;
                animateValueChange(clockInTime);
            }
            if (clockInStatus) {
                clockInStatus.textContent = 'Present';
                clockInStatus.className = 'attendance-status present';
                animateStatusChange(clockInStatus);
            }
            
            showNotification('Successfully clocked in at ' + timeString, 'success');
            updateHeroBtnText('Clock Out');
            
            // Send clock in request to server
            sendClockRequest('clock_in', currentTime);
            
        } else if (!isClockedOut) {
            // Clock Out
            if (clockOutTime) {
                clockOutTime.textContent = timeString;
                animateValueChange(clockOutTime);
            }
            if (clockOutStatus) {
                clockOutStatus.textContent = 'Completed';
                clockOutStatus.className = 'attendance-status present';
                animateStatusChange(clockOutStatus);
            }
            
            // Calculate and animate total hours
            const clockInTimeText = clockInTime.textContent;
            const hoursWorked = calculateHoursWorked(clockInTimeText, timeString);
            if (totalHours) {
                animateNumberChange(totalHours, hoursWorked.toFixed(1));
            }
            
            showNotification('Successfully clocked out at ' + timeString, 'success');
            updateHeroBtnText('Attendance Complete');
            
            // Send clock out request to server
            sendClockRequest('clock_out', currentTime);
            
        } else {
            showNotification('You have already completed your attendance for today.', 'info');
        }
        
        // Reset hero button
        if (heroBtn) {
            heroBtn.classList.remove('loading');
            if (!heroBtn.classList.contains('updated')) {
                heroBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    Quick Clock In/Out
                `;
            }
        }
    }, 1500);
}

/**
 * Calculate hours worked between two time strings
 */
function calculateHoursWorked(clockInTime, clockOutTime) {
    const clockIn = new Date('1970/01/01 ' + clockInTime);
    const clockOut = new Date('1970/01/01 ' + clockOutTime);
    
    const diffMs = clockOut - clockIn;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours);
}

/**
 * Send clock in/out request to server
 */
async function sendClockRequest(action, timestamp) {
    try {
        const response = await fetch('/employee/clock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                action: action,
                timestamp: timestamp.toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        console.log('Clock request successful:', data);
        
        // Update UI based on server response if needed
        if (data.status === 'success') {
            updateAttendanceMetrics(data);
        }
        
    } catch (error) {
        console.error('Clock request failed:', error);
        showNotification('Failed to record attendance. Please try again.', 'error');
        
        // Revert UI changes on error
        revertAttendanceUI();
    }
}

/**
 * View schedule functionality
 */
function viewSchedule() {
    showNotification('Redirecting to schedule view...', 'info');
    // In a real application, this would navigate to the schedule page
    setTimeout(() => {
        showNotification('Schedule view coming soon!', 'info');
    }, 1000);
}

/**
 * Handle metric card clicks
 */
function handleMetricCardClick(cardType) {
    switch (cardType) {
        case 'attendance':
            showNotification('Opening attendance details...', 'info');
            break;
        case 'leave':
            showNotification('Opening leave management...', 'info');
            break;
        case 'pending':
            showNotification('Opening pending requests...', 'info');
            break;
        case 'team':
            showNotification('Opening team directory...', 'info');
            break;
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

/**
 * Update clock status based on current attendance data
 */
function updateClockStatus() {
    const clockInTime = document.getElementById('clockInTime');
    const heroBtn = document.querySelector('.hero-btn.primary');
    
    if (clockInTime && clockInTime.textContent !== '--:--') {
        if (heroBtn) {
            updateHeroBtnText('Clock Out');
        }
    }
}

/**
 * Update hero button text and icon
 */
function updateHeroBtnText(text) {
    const heroBtn = document.querySelector('.hero-btn.primary');
    if (heroBtn) {
        heroBtn.classList.add('updated');
        let iconSvg = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
            </svg>
        `;
        
        if (text === 'Clock Out') {
            iconSvg = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1h-1V8c0-1.657-1.343-3-3-3H7C5.343 5 4 6.343 4 8v2H3c-.552 0-1 .448-1 1s.448 1 1 1h1v2c0 1.657 1.343 3 3 3h10c1.657 0 3-1.343 3-3v-2h1z"/>
                </svg>
            `;
        } else if (text === 'Attendance Complete') {
            iconSvg = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20,6 9,17 4,12"/>
                </svg>
            `;
        }
        
        heroBtn.innerHTML = iconSvg + text;
    }
}

/**
 * Initialize interactive elements with enhanced animations
 */
function initializeInteractiveElements() {
    // Add stagger animation to metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });
    
    // Add entrance animation to dashboard panels
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach((panel, index) => {
        panel.style.animationDelay = `${(index + 4) * 0.1}s`;
        panel.classList.add('fade-in-up');
    });
}

/**
 * Initialize smooth animations
 */
function initializeAnimations() {
    // Add CSS animations dynamically
    if (!document.getElementById('dashboard-animations')) {
        const style = document.createElement('style');
        style.id = 'dashboard-animations';
        style.textContent = `
            .fade-in-up {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp 0.6s ease-out forwards;
            }
            
            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .value-change {
                animation: valueChange 0.5s ease-out;
            }
            
            @keyframes valueChange {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); color: var(--success-color); }
                100% { transform: scale(1); }
            }
            
            .status-change {
                animation: statusChange 0.3s ease-out;
            }
            
            @keyframes statusChange {
                0% { transform: translateX(0); }
                50% { transform: translateX(5px); }
                100% { transform: translateX(0); }
            }
            
            .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading {
                pointer-events: none;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Setup hover effects for better user interaction
 */
function setupHoverEffects() {
    // Enhanced hover effects for action cards
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Hover effects for notification items
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(8px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

/**
 * Animate value changes
 */
function animateValueChange(element) {
    if (element) {
        element.classList.add('value-change');
        setTimeout(() => {
            element.classList.remove('value-change');
        }, 500);
    }
}

/**
 * Animate status changes
 */
function animateStatusChange(element) {
    if (element) {
        element.classList.add('status-change');
        setTimeout(() => {
            element.classList.remove('status-change');
        }, 300);
    }
}

/**
 * Animate number changes with counting effect
 */
function animateNumberChange(element, newValue) {
    if (!element) return;
    
    const currentValue = parseFloat(element.textContent) || 0;
    const targetValue = parseFloat(newValue);
    const difference = targetValue - currentValue;
    const duration = 1000; // 1 second
    const steps = 30;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
        currentStep++;
        const displayValue = currentValue + (stepValue * currentStep);
        element.textContent = displayValue.toFixed(1);
        
        if (currentStep >= steps) {
            clearInterval(interval);
            element.textContent = targetValue.toFixed(1);
            animateValueChange(element);
        }
    }, stepDuration);
}

/**
 * Update attendance metrics after server response
 */
function updateAttendanceMetrics(data) {
    if (data.attendance_rate) {
        const attendanceRate = document.querySelector('.metric-card.primary .metric-number');
        if (attendanceRate) {
            animateNumberChange(attendanceRate, data.attendance_rate + '%');
        }
    }
    
    // Update other metrics as needed
    if (data.total_hours) {
        const totalHours = document.getElementById('totalHours');
        if (totalHours) {
            animateNumberChange(totalHours, data.total_hours);
        }
    }
}

/**
 * Revert attendance UI changes on error
 */
function revertAttendanceUI() {
    // This would revert any optimistic UI changes if the server request failed
    // Implementation depends on what changes were made optimistically
    console.log('Reverting attendance UI changes due to server error');
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // ESC key to close any open modals or dropdowns
    if (e.key === 'Escape') {
        // Close any open elements
        const activeElements = document.querySelectorAll('.active');
        activeElements.forEach(el => el.classList.remove('active'));
    }
    
    // Ctrl+R to refresh dashboard
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshDashboard();
    }
    
    // Space bar to quick clock in/out
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        clockInOut();
    }
}

/**
 * Handle window resize for responsive behavior
 */
function handleWindowResize() {
    // Adjust layouts or elements based on new window size
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile-specific adjustments
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
}

/**
 * Refresh dashboard data from server
 */
async function refreshDashboard() {
    try {
        showNotification('Refreshing dashboard...', 'info');
        
        const response = await fetch('/employee/dashboard-data', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh dashboard data');
        }
        
        const data = await response.json();
        updateDashboardData(data);
        showNotification('Dashboard refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Dashboard refresh failed:', error);
        showNotification('Failed to refresh dashboard. Please reload the page.', 'error');
    }
}

/**
 * Update dashboard with new data from server
 */
function updateDashboardData(data) {
    // Update attendance statistics
    if (data.stats) {
        if (data.stats.attendance_rate) {
            const attendanceRate = document.querySelector('.metric-card.primary .metric-number');
            if (attendanceRate) {
                animateNumberChange(attendanceRate, data.stats.attendance_rate);
            }
        }
        
        if (data.stats.leave_balance) {
            const leaveBalance = document.querySelector('.metric-card.secondary .metric-number');
            if (leaveBalance) {
                animateNumberChange(leaveBalance, data.stats.leave_balance);
            }
        }
        
        if (data.stats.pending_requests) {
            const pendingRequests = document.querySelector('.metric-card.warning .metric-number');
            if (pendingRequests) {
                animateNumberChange(pendingRequests, data.stats.pending_requests);
            }
        }
    }
    
    // Update today's attendance data
    if (data.today_attendance) {
        const clockInTime = document.getElementById('clockInTime');
        const clockOutTime = document.getElementById('clockOutTime');
        const totalHours = document.getElementById('totalHours');
        
        if (clockInTime && data.today_attendance.clock_in) {
            clockInTime.textContent = data.today_attendance.clock_in;
            animateValueChange(clockInTime);
        }
        
        if (clockOutTime && data.today_attendance.clock_out) {
            clockOutTime.textContent = data.today_attendance.clock_out;
            animateValueChange(clockOutTime);
        }
        
        if (totalHours && data.today_attendance.total_hours) {
            animateNumberChange(totalHours, data.today_attendance.total_hours);
        }
    }
}

/**
 * Show notification with enhanced styling and animations
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `dashboard-notification notification-${type}`;
    
    // Set notification icon based on type
    let iconSvg = '';
    switch (type) {
        case 'success':
            iconSvg = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>';
            break;
        case 'error':
            iconSvg = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            break;
        case 'warning':
            iconSvg = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
            break;
        default:
            iconSvg = '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${iconSvg}
            </svg>
        </div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
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
        notification.classList.add('show');
    }, 100);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('hide');
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
    if (!document.getElementById('notification-styles')) {
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
                position: relative;
                overflow: hidden;
            }
            
            .dashboard-notification::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                pointer-events: none;
            }
            
            .dashboard-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .dashboard-notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .notification-success {
                border-left-color: var(--success-color);
                background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%);
            }
            
            .notification-error {
                border-left-color: var(--error-color);
                background: linear-gradient(135deg, #ffffff 0%, #ffebee 100%);
            }
            
            .notification-warning {
                border-left-color: var(--warning-color);
                background: linear-gradient(135deg, #ffffff 0%, #fff3e0 100%);
            }
            
            .notification-info {
                border-left-color: var(--info-color);
                background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
            }
            
            .notification-icon {
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }
            
            .notification-success .notification-icon {
                color: var(--success-color);
            }
            
            .notification-error .notification-icon {
                color: var(--error-color);
            }
            
            .notification-warning .notification-icon {
                color: var(--warning-color);
            }
            
            .notification-info .notification-icon {
                color: var(--info-color);
            }
            
            .notification-content {
                flex: 1;
            }
            
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
            return value;
        }
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
    setInterval(() => {
        refreshDashboard();
    }, 300000);
    
    // Update online status indicator
    setInterval(updateOnlineStatus, 30000);
}

/**
 * Update online status indicator
 */
function updateOnlineStatus() {
    const statusIndicator = document.querySelector('.status-indicator.online');
    if (statusIndicator) {
        // In a real application, this would check actual online status
        // For now, we'll keep it as online
        if (!navigator.onLine) {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            statusIndicator.innerHTML = `
                <span class="status-dot offline"></span>
                Offline
            `;
        }
    }
}

/**
 * Format time string for display
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format date string for display
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Export dashboard functions for global access
 */
window.EmployeeDashboard = {
    clockInOut,
    viewSchedule,
    refreshDashboard,
    showNotification,
    handleMetricCardClick
};

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}