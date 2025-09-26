/**
 * Admin Dashboard JavaScript
 * Handles chart rendering, data updates, and responsiveness
 */

class AdminDashboard {
    constructor() {
        this.charts = {};
        this.dashboardData = null;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Load initial data from script tag
        this.loadDashboardData();
        
        // Initialize charts
        this.initializeCharts();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update last updated time
        this.updateLastUpdatedTime();
        
        // Set up responsive handlers
        this.setupResponsiveHandlers();
    }
    
    loadDashboardData() {
        try {
            const dataScript = document.getElementById('dashboardData');
            if (dataScript) {
                this.dashboardData = JSON.parse(dataScript.textContent);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.dashboardData = {
                attendanceTrends: [],
                leaveTrends: []
            };
        }
    }
    
    initializeCharts() {
        // Initialize attendance trends chart
        this.initAttendanceChart();
        
        // Initialize leave trends chart
        this.initLeaveChart();
    }
    
    initAttendanceChart() {
        const ctx = document.getElementById('attendanceChart');
        if (!ctx || !this.dashboardData.attendanceTrends) return;
        
        const data = this.dashboardData.attendanceTrends;
        
        this.charts.attendance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: 'Attendance Rate (%)',
                    data: data.map(item => item.rate),
                    borderColor: '#1A237E',
                    backgroundColor: 'rgba(26, 35, 126, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1A237E',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 35, 126, 0.9)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#1A237E',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Attendance Rate: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#757575',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(224, 224, 224, 0.5)'
                        },
                        ticks: {
                            color: '#757575',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    initLeaveChart() {
        const ctx = document.getElementById('leaveChart');
        if (!ctx || !this.dashboardData.leaveTrends) return;
        
        const data = this.dashboardData.leaveTrends;
        
        this.charts.leave = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.month),
                datasets: [{
                    label: 'Leave Requests',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(26, 35, 126, 0.8)',
                    borderColor: '#1A237E',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 35, 126, 0.9)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#1A237E',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Requests: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#757575',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(224, 224, 224, 0.5)'
                        },
                        ticks: {
                            color: '#757575',
                            font: {
                                size: 12
                            },
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshButton');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Auto refresh every 5 minutes
        setInterval(() => this.refreshDashboard(), 5 * 60 * 1000);
    }
    
    setupResponsiveHandlers() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }
    
    handleResize() {
        // Resize charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
    
    async refreshDashboard() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const refreshBtn = document.getElementById('refreshButton');
        
        try {
            // Update button state
            if (refreshBtn) {
                refreshBtn.classList.add('loading');
                refreshBtn.disabled = true;
            }
            
            // Fetch new data
            const response = await fetch('/admin/dashboard/api/data');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }
            
            const newData = await response.json();
            
            // Update KPI cards
            this.updateKPICards(newData);
            
            // Update employee of the month
            this.updateEmployeeOfMonth(newData.employee_of_month);
            
            // Update charts if data structure is available
            if (newData.attendanceTrends) {
                this.updateAttendanceChart(newData.attendanceTrends);
            }
            
            if (newData.leaveTrends) {
                this.updateLeaveChart(newData.leaveTrends);
            }
            
            // Update last updated time
            this.updateLastUpdatedTime();
            
            // Show success feedback
            this.showRefreshFeedback('success');
            
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showRefreshFeedback('error');
        } finally {
            this.isLoading = false;
            
            // Reset button state
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
                refreshBtn.disabled = false;
            }
        }
    }
    
    updateKPICards(data) {
        const updates = {
            'totalEmployees': data.total_employees,
            'attendanceToday': data.attendance_today,
            'pendingRequests': data.pending_leave_requests,
            'attendanceRate': data.overall_attendance_rate + '%'
        };
        
        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateValueUpdate(element, value);
            }
        });
    }
    
    updateEmployeeOfMonth(employeeData) {
        const nameElement = document.getElementById('employeeName');
        const countElement = document.getElementById('employeePresentCount');
        
        if (nameElement && employeeData.name) {
            nameElement.textContent = employeeData.name;
        }
        
        if (countElement && employeeData.present_count !== undefined) {
            this.animateValueUpdate(countElement, employeeData.present_count);
        }
    }
    
    updateAttendanceChart(newData) {
        if (!this.charts.attendance || !newData) return;
        
        this.charts.attendance.data.labels = newData.map(item => item.date);
        this.charts.attendance.data.datasets[0].data = newData.map(item => item.rate);
        this.charts.attendance.update('active');
    }
    
    updateLeaveChart(newData) {
        if (!this.charts.leave || !newData) return;
        
        this.charts.leave.data.labels = newData.map(item => item.month);
        this.charts.leave.data.datasets[0].data = newData.map(item => item.count);
        this.charts.leave.update('active');
    }
    
    animateValueUpdate(element, newValue) {
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
        }, 100);
        
        setTimeout(() => {
            element.style.transition = '';
        }, 300);
    }
    
    updateLastUpdatedTime() {
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            timeElement.textContent = timeString;
        }
    }
    
    showRefreshFeedback(type) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = `refresh-feedback ${type}`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;
        
        if (type === 'success') {
            feedback.style.backgroundColor = '#4CAF50';
            feedback.textContent = '✓ Dashboard updated successfully';
        } else {
            feedback.style.backgroundColor = '#F44336';
            feedback.textContent = '✗ Failed to update dashboard';
        }
        
        document.body.appendChild(feedback);
        
        // Animate in
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }
    
    // Utility method to check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // Method to handle chart visibility for performance
    handleChartVisibility() {
        Object.entries(this.charts).forEach(([key, chart]) => {
            if (!chart) return;
            
            const canvas = chart.canvas;
            if (this.isInViewport(canvas)) {
                chart.update('none');
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin dashboard page
    if (document.getElementById('attendanceChart') || document.getElementById('leaveChart')) {
        window.adminDashboard = new AdminDashboard();
    }
});

// Handle visibility change to pause/resume updates when tab is not active
document.addEventListener('visibilitychange', function() {
    if (window.adminDashboard) {
        if (document.hidden) {
            // Tab is now hidden, could pause auto-refresh
            console.log('Dashboard tab hidden');
        } else {
            // Tab is now visible, resume updates
            console.log('Dashboard tab visible');
            window.adminDashboard.updateLastUpdatedTime();
        }
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}