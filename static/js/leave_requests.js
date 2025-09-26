/**
 * EMS Leave Requests Management JavaScript
 * Professional Leave Management System
 * Handles all leave request interactions and functionality
 */

(function() {
    'use strict';

    // ==========================================================================
    // Global Variables and Configuration
    // ==========================================================================

    const CONFIG = {
        apiEndpoints: {
            create: '/admin/leave-requests/create',
            updateStatus: '/admin/leave-requests/update-status',
            delete: '/admin/leave-requests/delete',
            stats: '/admin/leave-requests/stats'
        },
        animations: {
            duration: 300,
            easing: 'ease-in-out'
        },
        dateOptions: {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        },
        debounceDelay: 300
    };

    let currentView = 'cards';
    let filteredData = [];
    let allRequests = [];
    let confirmCallback = null;
    let isInitialized = false;

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    /**
     * Get element by selector with error handling
     */
    function getElement(selector) {
        const element = document.querySelector(selector);
        if (!element && isInitialized) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    /**
     * Get all elements by selector
     */
    function getElements(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Add event listener with error handling
     */
    function addEvent(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Remove event listener
     */
    function removeEvent(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.removeEventListener(event, handler);
        }
    }

    /**
     * Show loading overlay with animation
     */
    function showLoading() {
        const overlay = getElement('#loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide loading overlay with animation
     */
    function hideLoading() {
        const overlay = getElement('#loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    /**
     * Show notification message with better styling
     */
    function showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications
        const existingNotifications = getElements('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Set styles based on type
        let backgroundColor, iconSVG;
        switch(type) {
            case 'success':
                backgroundColor = '#4CAF50';
                iconSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>';
                break;
            case 'error':
                backgroundColor = '#F44336';
                iconSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                break;
            case 'warning':
                backgroundColor = '#FF9800';
                iconSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                break;
            default:
                backgroundColor = '#757575';
                iconSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="m9,9h5.5a2.5,2.5,0,0,1,0,5H12v0"></path><circle cx="12" cy="17" r=".5"></circle></svg>';
        }
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="flex-shrink: 0;">${iconSVG}</div>
                <div style="flex: 1; font-weight: 600;">${message}</div>
                <button onclick="this.parentElement.parentElement.style.transform='translateX(100%)';" style="background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0.8; transition: opacity 0.2s;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 16px 20px;
            background: ${backgroundColor};
            color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 1002;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 400px;
            font-size: 14px;
            font-family: inherit;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                notification.style.transform = 'translateX(0)';
            });
        });
        
        // Auto remove
        const removeNotification = () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        setTimeout(removeNotification, duration);
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', CONFIG.dateOptions);
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Calculate duration between two dates
     */
    function calculateDuration(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return Math.max(1, diffDays);
        } catch (error) {
            return 1;
        }
    }

    /**
     * Debounce function with improved performance
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function for scroll events
     */
    function throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    // ==========================================================================
    // Modal Management
    // ==========================================================================

    /**
     * Show modal with improved animations
     */
    function showModal(modalId) {
        const modal = getElement(`#${modalId}`);
        if (modal) {
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Show modal
            modal.classList.add('show');
            
            // Focus management
            const firstInput = modal.querySelector('input, select, textarea, button');
            if (firstInput && !firstInput.disabled) {
                setTimeout(() => firstInput.focus(), 150);
            }
            
            // Add escape key listener
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    hideModal(modalId);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
    }

    /**
     * Hide modal with improved animations
     */
    function hideModal(modalId) {
        const modal = getElement(`#${modalId}`);
        if (modal) {
            modal.classList.remove('show');
            
            // Restore body scroll after animation
            setTimeout(() => {
                document.body.style.overflow = '';
            }, 300);
            
            // Clear any form data if it's the add modal
            if (modalId === 'addLeaveModal') {
                const form = getElement('#addLeaveForm');
                if (form) {
                    form.reset();
                    updateDurationPreview();
                }
            }
        }
    }

    /**
     * Show confirmation modal with better UX
     */
    function showConfirmation(title, message, callback, iconType = 'warning') {
        const modal = getElement('#confirmModal');
        const titleEl = getElement('#confirmTitle');
        const messageEl = getElement('#confirmMessage');
        const iconEl = getElement('#confirmIcon');
        const confirmBtn = getElement('#confirmAction');
        
        if (!modal || !titleEl || !messageEl || !iconEl || !confirmBtn) return;
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Update icon and button based on type
        let iconSVG, buttonText, buttonClass;
        switch(iconType) {
            case 'delete':
                iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path></svg>';
                buttonText = 'Delete';
                buttonClass = 'action-btn primary';
                iconEl.style.background = 'rgba(244, 67, 54, 0.1)';
                iconEl.style.borderColor = '#F44336';
                break;
            case 'approved':
                iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"></polyline></svg>';
                buttonText = 'Approve';
                buttonClass = 'action-btn accent';
                iconEl.style.background = 'rgba(76, 175, 80, 0.1)';
                iconEl.style.borderColor = '#4CAF50';
                break;
            case 'rejected':
                iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                buttonText = 'Reject';
                buttonClass = 'action-btn secondary';
                iconEl.style.background = 'rgba(117, 117, 117, 0.1)';
                iconEl.style.borderColor = '#757575';
                break;
            default:
                iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>';
                buttonText = 'Confirm';
                buttonClass = 'action-btn primary';
                iconEl.style.background = 'rgba(255, 152, 0, 0.1)';
                iconEl.style.borderColor = '#FF9800';
        }
        
        iconEl.innerHTML = iconSVG;
        confirmBtn.textContent = buttonText;
        confirmBtn.className = buttonClass;
        
        confirmCallback = callback;
        showModal('confirmModal');
    }

    // ==========================================================================
    // Leave Request Management
    // ==========================================================================

    /**
     * Open add leave modal with better initialization
     */
    function openAddLeaveModal() {
        const form = getElement('#addLeaveForm');
        if (form) {
            form.reset();
            setMinimumDates();
            updateDurationPreview();
        }
        showModal('addLeaveModal');
    }

    /**
     * Set minimum dates for leave request form
     */
    function setMinimumDates() {
        const startDateEl = getElement('#startDate');
        const endDateEl = getElement('#endDate');
        const today = new Date().toISOString().split('T')[0];
        
        if (startDateEl) {
            startDateEl.min = today;
        }
        if (endDateEl) {
            endDateEl.min = today;
        }
    }

    /**
     * Update duration preview with better formatting
     */
    function updateDurationPreview() {
        const startDateEl = getElement('#startDate');
        const endDateEl = getElement('#endDate');
        const preview = getElement('#durationPreview');
        const text = getElement('#durationText');
        
        if (startDateEl && endDateEl && preview && text) {
            const startDate = startDateEl.value;
            const endDate = endDateEl.value;
            
            if (startDate && endDate) {
                const duration = calculateDuration(startDate, endDate);
                if (duration > 0 && new Date(startDate) <= new Date(endDate)) {
                    const weekdays = calculateWeekdays(startDate, endDate);
                    text.innerHTML = `
                        <strong>Duration: ${duration} day${duration !== 1 ? 's' : ''}</strong>
                        <span style="margin-left: 16px; font-size: 14px; opacity: 0.8;">
                            (${weekdays} weekday${weekdays !== 1 ? 's' : ''})
                        </span>
                    `;
                    preview.style.display = 'block';
                    
                    // Add validation warning for long periods
                    if (duration > 30) {
                        text.innerHTML += '<div style="margin-top: 8px; color: #FF9800; font-size: 14px;">⚠️ Extended leave period</div>';
                    }
                } else {
                    preview.style.display = 'none';
                }
            } else {
                preview.style.display = 'none';
            }
        }
    }

    /**
     * Calculate weekdays between two dates
     */
    function calculateWeekdays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let weekdays = 0;
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                weekdays++;
            }
        }
        
        return weekdays;
    }

    /**
     * Create leave request with improved error handling
     */
    async function createLeaveRequest(formData) {
        showLoading();
        
        try {
            const response = await fetch(CONFIG.apiEndpoints.create, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Leave request created successfully', 'success');
                hideModal('addLeaveModal');
                
                // Smooth reload or update
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                showNotification(result.error || 'Failed to create leave request', 'error');
            }
        } catch (error) {
            console.error('Error creating leave request:', error);
            showNotification('Network error. Please check your connection and try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Update leave request status with better UX
     */
    window.updateLeaveStatus = async function(requestId, newStatus) {
        const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        const actionText = newStatus === 'approved' ? 'approve' : 
                          newStatus === 'rejected' ? 'reject' : 'reset to pending';
        
        showConfirmation(
            `${statusText} Leave Request`,
            `Are you sure you want to ${actionText} this leave request? This action will be recorded.`,
            async () => {
                showLoading();
                
                try {
                    const response = await fetch(CONFIG.apiEndpoints.updateStatus, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            request_id: requestId,
                            status: newStatus
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showNotification(result.message || `Leave request ${statusText.toLowerCase()} successfully`, 'success');
                        
                        // Update UI immediately for better UX
                        updateCardStatus(requestId, newStatus);
                        
                        setTimeout(() => {
                            window.location.reload();
                        }, 1200);
                    } else {
                        showNotification(result.error || 'Failed to update status', 'error');
                    }
                } catch (error) {
                    console.error('Error updating status:', error);
                    showNotification('Network error. Please try again.', 'error');
                } finally {
                    hideLoading();
                }
            },
            newStatus
        );
    };

    /**
     * Update card status immediately for better UX
     */
    function updateCardStatus(requestId, newStatus) {
        const cards = getElements('.request-card');
        const tableRows = getElements('.data-table tbody tr');
        
        // Update card status
        cards.forEach(card => {
            const cardActions = card.querySelector('.card-actions');
            if (cardActions && cardActions.querySelector(`button[onclick*="${requestId}"]`)) {
                const statusBadge = card.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge ${newStatus}`;
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                }
            }
        });
        
        // Update table row status
        tableRows.forEach(row => {
            const actions = row.querySelector('.table-actions');
            if (actions && actions.querySelector(`button[onclick*="${requestId}"]`)) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge ${newStatus}`;
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                }
            }
        });
    }

    /**
     * Delete leave request with better confirmation
     */
    window.deleteLeaveRequest = function(requestId) {
        showConfirmation(
            'Delete Leave Request',
            'Are you sure you want to permanently delete this leave request? This action cannot be undone and will remove all associated data.',
            async () => {
                showLoading();
                
                try {
                    const response = await fetch(CONFIG.apiEndpoints.delete, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            request_id: requestId
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showNotification('Leave request deleted successfully', 'success');
                        
                        // Remove from UI immediately
                        removeRequestFromUI(requestId);
                        
                        setTimeout(() => {
                            window.location.reload();
                        }, 1200);
                    } else {
                        showNotification(result.error || 'Failed to delete request', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting request:', error);
                    showNotification('Network error. Please try again.', 'error');
                } finally {
                    hideLoading();
                }
            },
            'delete'
        );
    };

    /**
     * Remove request from UI immediately
     */
    function removeRequestFromUI(requestId) {
        const cards = getElements('.request-card');
        const tableRows = getElements('.data-table tbody tr');
        
        // Remove card
        cards.forEach(card => {
            const cardActions = card.querySelector('.card-actions');
            if (cardActions && cardActions.querySelector(`button[onclick*="${requestId}"]`)) {
                card.style.opacity = '0';
                card.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    if (card.parentNode) {
                        card.parentNode.removeChild(card);
                    }
                }, 300);
            }
        });
        
        // Remove table row
        tableRows.forEach(row => {
            const actions = row.querySelector('.table-actions');
            if (actions && actions.querySelector(`button[onclick*="${requestId}"]`)) {
                row.style.opacity = '0';
                setTimeout(() => {
                    if (row.parentNode) {
                        row.parentNode.removeChild(row);
                    }
                }, 300);
            }
        });
    }

    // ==========================================================================
    // View Management
    // ==========================================================================

    /**
     * Switch between card and table views
     */
    function switchView(viewType) {
        const cardView = getElement('#cardsView');
        const tableView = getElement('#tableView');
        const viewBtns = getElements('.view-btn');
        
        currentView = viewType;
        
        // Update button states
        viewBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewType) {
                btn.classList.add('active');
            }
        });
        
        // Show/hide views with animation
        if (viewType === 'cards') {
            if (tableView) tableView.style.display = 'none';
            if (cardView) {
                cardView.style.display = 'grid';
                cardView.style.opacity = '0';
                requestAnimationFrame(() => {
                    cardView.style.opacity = '1';
                });
            }
        } else {
            if (cardView) cardView.style.display = 'none';
            if (tableView) {
                tableView.style.display = 'block';
                tableView.style.opacity = '0';
                requestAnimationFrame(() => {
                    tableView.style.opacity = '1';
                });
            }
        }
    }

    // ==========================================================================
    // Search and Filter Functions
    // ==========================================================================

    /**
     * Filter requests based on search and filter criteria
     */
    function filterRequests() {
        const searchTerm = getElement('#searchInput')?.value.toLowerCase() || '';
        const statusFilter = getElement('#statusFilter')?.value || '';
        const typeFilter = getElement('#leaveTypeFilter')?.value || '';
        
        const cards = getElements('.request-card');
        const tableRows = getElements('.data-table tbody tr');
        
        let visibleCount = 0;
        
        // Filter cards
        cards.forEach(card => {
            const employeeName = card.dataset.employee?.toLowerCase() || '';
            const leaveType = card.dataset.type?.toLowerCase() || '';
            const status = card.dataset.status?.toLowerCase() || '';
            
            const matchesSearch = !searchTerm || 
                                employeeName.includes(searchTerm) || 
                                leaveType.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter.toLowerCase();
            const matchesType = !typeFilter || card.dataset.type === typeFilter;
            
            const shouldShow = matchesSearch && matchesStatus && matchesType;
            
            if (shouldShow) {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                visibleCount++;
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (card.style.opacity === '0') {
                        card.style.display = 'none';
                    }
                }, 200);
            }
        });
        
        // Filter table rows
        tableRows.forEach(row => {
            if (row.querySelector('td[colspan]')) return; // Skip empty state row
            
            const employeeName = row.dataset.employee?.toLowerCase() || '';
            const leaveType = row.dataset.type?.toLowerCase() || '';
            const status = row.dataset.status?.toLowerCase() || '';
            
            const matchesSearch = !searchTerm || 
                                employeeName.includes(searchTerm) || 
                                leaveType.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter.toLowerCase();
            const matchesType = !typeFilter || row.dataset.type === typeFilter;
            
            const shouldShow = matchesSearch && matchesStatus && matchesType;
            
            if (shouldShow) {
                row.style.display = 'table-row';
                row.style.opacity = '1';
            } else {
                row.style.opacity = '0';
                setTimeout(() => {
                    if (row.style.opacity === '0') {
                        row.style.display = 'none';
                    }
                }, 200);
            }
        });
        
        // Show/hide empty state
        showEmptyState(visibleCount === 0 && (searchTerm || statusFilter || typeFilter));
    }

    /**
     * Show empty state when no results found
     */
    function showEmptyState(show) {
        const cardsView = getElement('#cardsView');
        const existingEmpty = getElement('#noResultsEmpty');
        
        if (show && !existingEmpty && cardsView) {
            const emptyDiv = document.createElement('div');
            emptyDiv.id = 'noResultsEmpty';
            emptyDiv.className = 'empty-state';
            emptyDiv.innerHTML = `
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <h3>No Results Found</h3>
                <p>No leave requests match your current search criteria. Try adjusting your filters or search terms.</p>
                <button class="action-btn ghost" onclick="clearFilters()">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Clear Filters
                </button>
            `;
            cardsView.appendChild(emptyDiv);
        } else if (!show && existingEmpty) {
            existingEmpty.remove();
        }
    }

    /**
     * Clear all filters and search
     */
    function clearFilters() {
        const searchInput = getElement('#searchInput');
        const statusFilter = getElement('#statusFilter');
        const typeFilter = getElement('#leaveTypeFilter');
        const noResultsEmpty = getElement('#noResultsEmpty');
        
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (noResultsEmpty) noResultsEmpty.remove();
        
        // Re-show all items
        filterRequests();
        showNotification('Filters cleared', 'info', 2000);
    }

    // Make clearFilters available globally
    window.clearFilters = clearFilters;

    // ==========================================================================
    // Form Validation and Submission
    // ==========================================================================

    /**
     * Validate leave request form
     */
    function validateLeaveForm(formData) {
        const errors = [];
        
        if (!formData.employee_id) {
            errors.push('Please select an employee');
        }
        
        if (!formData.leave_type) {
            errors.push('Please select a leave type');
        }
        
        if (!formData.start_date) {
            errors.push('Please select a start date');
        }
        
        if (!formData.end_date) {
            errors.push('Please select an end date');
        }
        
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (startDate < today) {
                errors.push('Start date cannot be in the past');
            }
            
            if (endDate < startDate) {
                errors.push('End date must be after start date');
            }
            
            if (startDate > endDate) {
                errors.push('Start date cannot be after end date');
            }
        }
        
        return errors;
    }

    /**
     * Handle form submission
     */
    function handleFormSubmission(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validate form
        const errors = validateLeaveForm(data);
        if (errors.length > 0) {
            showNotification(errors.join('. '), 'error');
            return;
        }
        
        // Submit form
        createLeaveRequest(data);
    }

    // ==========================================================================
    // Date Management Functions
    // ==========================================================================

    /**
     * Handle start date changes
     */
    function handleStartDateChange(event) {
        const startDate = event.target.value;
        const endDateEl = getElement('#endDate');
        
        if (startDate && endDateEl) {
            // Set minimum end date to start date
            endDateEl.min = startDate;
            
            // If end date is before start date, reset it
            if (endDateEl.value && endDateEl.value < startDate) {
                endDateEl.value = startDate;
            }
        }
        
        updateDurationPreview();
    }

    /**
     * Handle end date changes
     */
    function handleEndDateChange(event) {
        const endDate = event.target.value;
        const startDateEl = getElement('#startDate');
        
        if (endDate && startDateEl && startDateEl.value) {
            // If end date is before start date, adjust start date
            if (endDate < startDateEl.value) {
                startDateEl.value = endDate;
            }
        }
        
        updateDurationPreview();
    }

    // ==========================================================================
    // Event Listeners Setup
    // ==========================================================================

    /**
     * Initialize all event listeners
     */
    function initializeEventListeners() {
        // Modal event listeners
        const addLeaveModal = getElement('#addLeaveModal');
        const closeAddLeaveModal = getElement('#closeAddLeaveModal');
        const cancelAddLeave = getElement('#cancelAddLeave');
        const confirmModal = getElement('#confirmModal');
        const cancelConfirm = getElement('#cancelConfirm');
        const confirmAction = getElement('#confirmAction');
        
        // View switching
        const viewBtns = getElements('.view-btn');
        viewBtns.forEach(btn => {
            addEvent(btn, 'click', () => switchView(btn.dataset.view));
        });
        
        // Modal close events
        addEvent(closeAddLeaveModal, 'click', () => hideModal('addLeaveModal'));
        addEvent(cancelAddLeave, 'click', () => hideModal('addLeaveModal'));
        addEvent(cancelConfirm, 'click', () => hideModal('confirmModal'));
        
        // Modal overlay clicks
        if (addLeaveModal) {
            addEvent(addLeaveModal, 'click', (e) => {
                if (e.target === addLeaveModal) {
                    hideModal('addLeaveModal');
                }
            });
        }
        
        if (confirmModal) {
            addEvent(confirmModal, 'click', (e) => {
                if (e.target === confirmModal) {
                    hideModal('confirmModal');
                }
            });
        }
        
        // Confirmation modal action
        addEvent(confirmAction, 'click', () => {
            if (confirmCallback && typeof confirmCallback === 'function') {
                confirmCallback();
                confirmCallback = null;
            }
            hideModal('confirmModal');
        });
        
        // Form submission
        const addLeaveForm = getElement('#addLeaveForm');
        addEvent(addLeaveForm, 'submit', handleFormSubmission);
        
        // Date field events
        const startDateEl = getElement('#startDate');
        const endDateEl = getElement('#endDate');
        addEvent(startDateEl, 'change', handleStartDateChange);
        addEvent(endDateEl, 'change', handleEndDateChange);
        
        // Search and filter events
        const searchInput = getElement('#searchInput');
        const statusFilter = getElement('#statusFilter');
        const typeFilter = getElement('#leaveTypeFilter');
        const clearFiltersBtn = getElement('#clearFiltersBtn');
        
        addEvent(searchInput, 'input', debounce(filterRequests, CONFIG.debounceDelay));
        addEvent(statusFilter, 'change', filterRequests);
        addEvent(typeFilter, 'change', filterRequests);
        addEvent(clearFiltersBtn, 'click', clearFilters);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = getElement('#searchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Ctrl/Cmd + N for new leave request
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openAddLeaveModal();
            }
        });
        
        // Responsive table scrolling
        const tableContainer = getElement('.table-container');
        if (tableContainer) {
            addEvent(tableContainer, 'scroll', throttle(() => {
                // Add scroll shadow effect
                const scrollLeft = tableContainer.scrollLeft;
                const scrollWidth = tableContainer.scrollWidth;
                const clientWidth = tableContainer.clientWidth;
                
                tableContainer.classList.toggle('scroll-start', scrollLeft > 0);
                tableContainer.classList.toggle('scroll-end', scrollLeft < scrollWidth - clientWidth);
            }, 16));
        }
    }

    // ==========================================================================
    // Accessibility Functions
    // ==========================================================================

    /**
     * Enhance accessibility features
     */
    function enhanceAccessibility() {
        // Add ARIA labels to buttons without text
        const iconButtons = getElements('button:not(:has(span)):not(:has(div))');
        iconButtons.forEach(btn => {
            if (!btn.getAttribute('aria-label') && !btn.getAttribute('title')) {
                const svg = btn.querySelector('svg');
                if (svg) {
                    // Try to determine button purpose from onclick or class
                    if (btn.onclick && btn.onclick.toString().includes('approve')) {
                        btn.setAttribute('aria-label', 'Approve request');
                    } else if (btn.onclick && btn.onclick.toString().includes('reject')) {
                        btn.setAttribute('aria-label', 'Reject request');
                    } else if (btn.onclick && btn.onclick.toString().includes('delete')) {
                        btn.setAttribute('aria-label', 'Delete request');
                    }
                }
            }
        });
        
        // Add role="status" to live regions for screen readers
        const statsNumbers = getElements('.stat-number');
        statsNumbers.forEach(stat => {
            stat.setAttribute('aria-live', 'polite');
        });
        
        // Enhance form accessibility
        const formInputs = getElements('#addLeaveForm input, #addLeaveForm select, #addLeaveForm textarea');
        formInputs.forEach(input => {
            const label = getElement(`label[for="${input.id}"]`);
            if (label && input.hasAttribute('required')) {
                label.setAttribute('aria-required', 'true');
                if (!label.textContent.includes('*')) {
                    label.innerHTML += ' <span style="color: #F44336;">*</span>';
                }
            }
        });
    }

    // ==========================================================================
    // Performance Optimization
    // ==========================================================================

    /**
     * Optimize performance for large datasets
     */
    function optimizePerformance() {
        // Lazy load images/avatars if any
        const avatars = getElements('.employee-avatar');
        if ('IntersectionObserver' in window) {
            const avatarObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('loaded');
                        avatarObserver.unobserve(entry.target);
                    }
                });
            });
            
            avatars.forEach(avatar => {
                avatarObserver.observe(avatar);
            });
        }
        
        // Optimize scroll performance
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // Defer non-critical operations
                enhanceAccessibility();
            });
        } else {
            setTimeout(enhanceAccessibility, 100);
        }
    }

    // ==========================================================================
    // Error Handling and Recovery
    // ==========================================================================

    /**
     * Global error handler
     */
    function handleGlobalErrors() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            showNotification('An unexpected error occurred. Please refresh the page.', 'error');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            showNotification('A network error occurred. Please check your connection.', 'error');
        });
    }

    // ==========================================================================
    // Initialization
    // ==========================================================================

    /**
     * Initialize the application
     */
    function initializeApp() {
        try {
            // Set initialization flag
            isInitialized = true;
            
            // Setup error handling first
            handleGlobalErrors();
            
            // Initialize event listeners
            initializeEventListeners();
            
            // Set minimum dates
            setMinimumDates();
            
            // Optimize performance
            optimizePerformance();
            
            // Initialize filters
            filterRequests();
            
            // Log successful initialization
            console.log('Leave Requests Management System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            showNotification('Failed to initialize the application. Please refresh the page.', 'error');
        }
    }

    /**
     * Make functions available globally for HTML onclick handlers
     */
    window.openAddLeaveModal = openAddLeaveModal;
    window.showModal = showModal;
    window.hideModal = hideModal;

    // ==========================================================================
    // DOM Ready and Load Events
    // ==========================================================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    // Additional setup when page is fully loaded
    window.addEventListener('load', () => {
        // Hide any initial loading states
        hideLoading();
        
        // Focus search input on page load if no modals are open
        const searchInput = getElement('#searchInput');
        if (searchInput && !document.querySelector('.modal-overlay.show')) {
            searchInput.focus();
        }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Page became visible again - could refresh data here
            console.log('Page became visible');
        }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        showNotification('Connection restored', 'success', 2000);
    });

    window.addEventListener('offline', () => {
        showNotification('Connection lost. Some features may not work.', 'warning', 5000);
    });

})();