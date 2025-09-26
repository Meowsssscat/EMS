/**
 * EMS Admin Attendance Management JavaScript
 * Handles all client-side functionality for attendance management
 */

(function() {
    'use strict';

    // ==========================================================================
    // Global Variables and Configuration
    // ==========================================================================

    const CONFIG = {
        apiEndpoints: {
            markAttendance: '/admin/attendance/mark',
            bulkMark: '/admin/attendance/bulk-mark',
            filterAttendance: '/admin/attendance/filter',
            generateReport: '/admin/attendance/report',
            deleteAttendance: '/admin/attendance/delete'
        },
        toastDuration: 6000, // 6 seconds for better visibility (minimum 1 second as requested)
        toastHideDuration: 6000, // Time for hide animation
        debounceDelay: 300
    };

    let currentFilters = {};
    let selectedEmployees = new Set();
    let toastTimeout = null;

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    function formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = toast?.querySelector('.toast-message');
        
        if (!toast || !toastMessage) return;
        
        // Clear existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        // Remove existing classes and set new ones
        toast.className = 'toast';
        toast.classList.add(type);
        toastMessage.textContent = message;
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto hide after duration
        toastTimeout = setTimeout(() => {
            hideToast();
        }, CONFIG.toastDuration);
    }

    function hideToast() {
        const toast = document.getElementById('toast');
        if (toast && toast.classList.contains('show')) {
            toast.classList.remove('show');
            toast.classList.add('hide');
            
            // Remove hide class after animation
            setTimeout(() => {
                toast.classList.remove('hide');
            }, CONFIG.toastHideDuration);
        }
        
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            toastTimeout = null;
        }
    }

    function animateCounter(element, endValue) {
        if (!element) return;
        
        const startValue = 0;
        const duration = 1500; // Slightly longer animation
        const startTime = performance.now();
        
        element.classList.add('animating');
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = endValue;
                element.classList.remove('animating');
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // ==========================================================================
    // API Functions
    // ==========================================================================

    async function makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return { success: false, message: 'Invalid response format' };
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
 
    async function markAttendance(employeeId, status, date) {
        return await makeRequest(CONFIG.apiEndpoints.markAttendance, {
            method: 'POST',
            body: JSON.stringify({
                employee_id: employeeId,
                status: status,
                date: date
            })
        });
    }

    async function bulkMarkAttendance(employeeIds, status, date) {
        return await makeRequest(CONFIG.apiEndpoints.bulkMark, {
            method: 'POST',
            body: JSON.stringify({
                employee_ids: employeeIds,
                status: status,
                date: date
            })
        });
    }

    async function filterAttendance(filters) {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        
        return await makeRequest(`${CONFIG.apiEndpoints.filterAttendance}?${params}`);
    }

    async function generateReport(startDate, endDate, employeeId = null) {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        
        if (employeeId) {
            params.append('employee_id', employeeId);
        }
        
        return await makeRequest(`${CONFIG.apiEndpoints.generateReport}?${params}`);
    }

    async function deleteAttendance(attendanceId) {
        return await makeRequest(`${CONFIG.apiEndpoints.deleteAttendance}/${attendanceId}`, {
            method: 'DELETE'
        });
    }

    // ==========================================================================
    // Quick Mark Attendance
    // ==========================================================================

    function initQuickMarkForm() {
        const form = document.getElementById('quickMarkForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const employeeId = formData.get('employee_id');
            const status = formData.get('status');
            const date = formData.get('date');

            if (!employeeId || !status || !date) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            try {
                showLoading();
                const result = await markAttendance(employeeId, status, date);
                
                if (result.success) {
                    showToast(result.message || 'Attendance marked successfully', 'success');
                    form.reset();
                    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
                    await refreshAttendanceData();
                } else {
                    showToast(result.message || 'Failed to mark attendance', 'error');
                }
            } catch (error) {
                showToast('An error occurred while marking attendance', 'error');
                console.error('Mark attendance error:', error);
            } finally {
                hideLoading();
            }
        });
    }

    // ==========================================================================
    // Filter Functionality
    // ==========================================================================

    function initFilterForm() {
        const form = document.getElementById('filterForm');
        const clearBtn = document.getElementById('clearFiltersBtn');
        
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await applyFilters();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                form.reset();
                currentFilters = {};
                await refreshAttendanceData();
                showToast('Filters cleared', 'info');
            });
        }
    }

    async function applyFilters() {
        const form = document.getElementById('filterForm');
        if (!form) return;

        const formData = new FormData(form);
        currentFilters = {
            employee_id: formData.get('employee_id'),
            status: formData.get('status'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date')
        };

        // Remove empty values
        Object.keys(currentFilters).forEach(key => {
            if (!currentFilters[key]) {
                delete currentFilters[key];
            }
        });

        try {
            showLoading();
            const result = await filterAttendance(currentFilters);
            
            if (result.success) {
                refreshAttendanceTable(result.data);
                updateRecordCount(result.data.length);
                showToast(`Found ${result.data.length} record${result.data.length !== 1 ? 's' : ''}`, 'info');
            } else {
                showToast(result.message || 'Failed to filter attendance', 'error');
            }
        } catch (error) {
            showToast('An error occurred while filtering attendance', 'error');
            console.error('Filter error:', error);
        } finally {
            hideLoading();
        }
    }

    // ==========================================================================
    // Attendance Table Management
    // ==========================================================================

    function refreshAttendanceTable(data) {
        const tbody = document.getElementById('attendanceTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.querySelector('.table-wrapper');
        
        if (!tbody) return;

        tbody.innerHTML = '';

        if (data.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        data.forEach(record => {
            const row = createAttendanceRow(record);
            tbody.appendChild(row);
        });

        // Reinitialize row event listeners
        initTableActions();
        
        // Add fade-in animation to rows
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            setTimeout(() => {
                row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50); // Staggered animation
        });
    }

    function createAttendanceRow(record) {
        const row = document.createElement('tr');
        row.dataset.id = record.id || '';
        
        row.innerHTML = `
            <td>
                <span class="date-badge">${record.date ? formatDate(record.date) : 'N/A'}</span>
            </td>
            <td>
                <div class="employee-info">
                    <span class="employee-name">${record.name || 'Unknown'}</span>
                </div>
            </td>
            <td>
                <span class="department-badge">${record.department || 'N/A'}</span>
            </td>
            <td>
                <span class="status-badge status-${record.status || 'unknown'}">
                    ${record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                </span>
            </td>
            <td>
                <span class="time-badge">
                    ${record.created_at ? formatTime(record.created_at) : 'N/A'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon-only edit-btn" data-id="${record.id || ''}" title="Edit" aria-label="Edit attendance record">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                    </button>
                    <button class="btn-icon-only delete-btn" data-id="${record.id || ''}" title="Delete" aria-label="Delete attendance record">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    function initTableActions() {
        const editButtons = document.querySelectorAll('.edit-btn');
        const deleteButtons = document.querySelectorAll('.delete-btn');
        
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attendanceId = e.currentTarget.dataset.id;
                if (attendanceId) {
                    handleEditAttendance(attendanceId);
                }
            });
        });
        
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const attendanceId = e.currentTarget.dataset.id;
                if (attendanceId && confirm('Are you sure you want to delete this attendance record?')) {
                    await handleDeleteAttendance(attendanceId);
                }
            });
        });
    }

    function handleEditAttendance(attendanceId) {
        // TODO: Implement edit functionality
        showToast('Edit functionality coming soon', 'info');
    }

    async function handleDeleteAttendance(attendanceId) {
        try {
            showLoading();
            const result = await deleteAttendance(attendanceId);
            
            if (result.success) {
                showToast('Attendance record deleted successfully', 'success');
                await refreshAttendanceData();
            } else {
                showToast(result.message || 'Failed to delete attendance record', 'error');
            }
        } catch (error) {
            showToast('An error occurred while deleting the record', 'error');
            console.error('Delete error:', error);
        } finally {
            hideLoading();
        }
    }

    function updateRecordCount(count) {
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            recordCount.textContent = `${count} record${count !== 1 ? 's' : ''}`;
        }
    }

    // ==========================================================================
    // Bulk Mark Modal
    // ==========================================================================

    function initBulkMarkModal() {
        const modal = document.getElementById('bulkMarkModal');
        const openBtn = document.getElementById('bulkMarkBtn');
        const closeBtn = document.getElementById('closeBulkModal');
        const cancelBtn = document.getElementById('cancelBulkMark');
        const form = document.getElementById('bulkMarkForm');
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        
        if (!modal) return;

        // Open modal
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('show');
                resetBulkForm();
                // Focus first input
                const firstInput = modal.querySelector('input, select');
                if (firstInput) firstInput.focus();
            });
        }

        // Close modal
        const closeModal = () => {
            modal.classList.remove('show');
            resetBulkForm();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close on Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Select all functionality
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const employeeCheckboxes = document.querySelectorAll('input[name="employee_ids"]');
                employeeCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                updateSelectedCount();
            });
        }

        // Individual checkbox listeners
        const employeeCheckboxes = document.querySelectorAll('input[name="employee_ids"]');
        employeeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateSelectedCount();
                updateSelectAllState();
            });
        });

        // Form submission
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleBulkMarkSubmission();
            });
        }
    }

    function resetBulkForm() {
        const form = document.getElementById('bulkMarkForm');
        if (form) {
            form.reset();
            const bulkDate = document.getElementById('bulkDate');
            if (bulkDate) {
                bulkDate.value = new Date().toISOString().split('T')[0];
            }
        }
        
        const employeeCheckboxes = document.querySelectorAll('input[name="employee_ids"]');
        employeeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        updateSelectedCount();
        updateSelectAllState();
    }

    function updateSelectedCount() {
        const selectedCheckboxes = document.querySelectorAll('input[name="employee_ids"]:checked');
        const countElement = document.querySelector('.selected-count');
        if (countElement) {
            const count = selectedCheckboxes.length;
            countElement.textContent = `${count} selected`;
        }
    }

    function updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('selectAllEmployees');
        const employeeCheckboxes = document.querySelectorAll('input[name="employee_ids"]');
        const selectedCheckboxes = document.querySelectorAll('input[name="employee_ids"]:checked');
        
        if (selectAllCheckbox) {
            if (selectedCheckboxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (selectedCheckboxes.length === employeeCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
                selectAllCheckbox.checked = false;
            }
        }
    }

    async function handleBulkMarkSubmission() {
        const formData = new FormData(document.getElementById('bulkMarkForm'));
        const selectedEmployees = Array.from(document.querySelectorAll('input[name="employee_ids"]:checked'))
            .map(checkbox => checkbox.value);
        const status = formData.get('status');
        const date = formData.get('date');

        if (selectedEmployees.length === 0) {
            showToast('Please select at least one employee', 'warning');
            return;
        }

        if (!status || !date) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            showLoading();
            const result = await bulkMarkAttendance(selectedEmployees, status, date);
            
            if (result.success) {
                showToast(`Successfully marked attendance for ${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? 's' : ''}`, 'success');
                document.getElementById('bulkMarkModal').classList.remove('show');
                await refreshAttendanceData();
            } else {
                showToast(result.message || 'Failed to bulk mark attendance', 'error');
            }
        } catch (error) {
            showToast('An error occurred during bulk marking', 'error');
            console.error('Bulk mark error:', error);
        } finally {
            hideLoading();
        }
    }

    // ==========================================================================
    // Report Modal
    // ==========================================================================

    function initReportModal() {
        const modal = document.getElementById('reportModal');
        const openBtn = document.getElementById('generateReportBtn');
        const closeBtn = document.getElementById('closeReportModal');
        const form = document.getElementById('reportForm');
        const downloadBtn = document.getElementById('downloadReport');
        
        if (!modal) return;

        // Open modal
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('show');
                setDefaultReportDates();
                // Focus first input
                const firstInput = modal.querySelector('input, select');
                if (firstInput) firstInput.focus();
            });
        }

        // Close modal
        const closeModal = () => {
            modal.classList.remove('show');
            const resultsDiv = document.getElementById('reportResults');
            if (resultsDiv) resultsDiv.style.display = 'none';
            if (form) form.reset();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close on Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Form submission
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleReportGeneration();
            });
        }

        // Download report
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                downloadReportAsCSV();
            });
        }
    }

    function setDefaultReportDates() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');
        
        if (startDateInput) {
            startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
        }
        if (endDateInput) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }

    async function handleReportGeneration() {
        const formData = new FormData(document.getElementById('reportForm'));
        const startDate = formData.get('start_date');
        const endDate = formData.get('end_date');
        const employeeId = formData.get('employee_id');

        if (!startDate || !endDate) {
            showToast('Please provide both start and end dates', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showToast('Start date cannot be after end date', 'error');
            return;
        }

        try {
            showLoading();
            const result = await generateReport(startDate, endDate, employeeId);
            
            if (result.success) {
                displayReportResults(result.data, result.summary);
                showToast('Report generated successfully', 'success');
            } else {
                showToast(result.message || 'Failed to generate report', 'error');
            }
        } catch (error) {
            showToast('An error occurred while generating the report', 'error');
            console.error('Report generation error:', error);
        } finally {
            hideLoading();
        }
    }

    function displayReportResults(data, summary) {
        const resultsDiv = document.getElementById('reportResults');
        const summaryDiv = document.getElementById('reportSummary');
        const tableBody = document.getElementById('reportTableBody');
        
        if (!resultsDiv || !summaryDiv || !tableBody) return;

        // Display summary
        summaryDiv.innerHTML = `
            <div class="summary-item">
                <span class="summary-value">${summary.working_days || 0}</span>
                <span class="summary-label">Working Days</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${summary.total_employees || 0}</span>
                <span class="summary-label">Employees</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${summary.start_date ? formatDate(summary.start_date) : 'N/A'}</span>
                <span class="summary-label">From</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${summary.end_date ? formatDate(summary.end_date) : 'N/A'}</span>
                <span class="summary-label">To</span>
            </div>
        `;

        // Clear and populate table
        tableBody.innerHTML = '';
        data.forEach((employee, index) => {
            const row = document.createElement('tr');
            const percentageClass = getPercentageClass(employee.attendance_percentage || 0);
            
            row.innerHTML = `
                <td>${employee.name || 'N/A'}</td>
                <td>${employee.department || 'N/A'}</td>
                <td>${employee.position || 'N/A'}</td>
                <td>${employee.present_days || 0}</td>
                <td>${employee.absent_days || 0}</td>
                <td>${employee.late_days || 0}</td>
                <td>
                    <span class="attendance-percentage ${percentageClass}">
                        ${employee.attendance_percentage || 0}%
                    </span>
                </td>
            `;
            
            // Add animation
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            setTimeout(() => {
                row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
            
            tableBody.appendChild(row);
        });

        resultsDiv.style.display = 'block';
        
        // Store data for download
        window.reportData = { data, summary };
    }

    function getPercentageClass(percentage) {
        if (percentage >= 95) return 'percentage-excellent';
        if (percentage >= 85) return 'percentage-good';
        return 'percentage-warning';
    }

    function downloadReportAsCSV() {
        if (!window.reportData) {
            showToast('No report data available to download', 'warning');
            return;
        }

        const { data, summary } = window.reportData;
        
        try {
            // Create CSV content
            let csvContent = 'data:text/csv;charset=utf-8,';
            
            // Add header info
            csvContent += 'Attendance Report\n';
            csvContent += `Period: ${summary.start_date ? formatDate(summary.start_date) : 'N/A'} to ${summary.end_date ? formatDate(summary.end_date) : 'N/A'}\n`;
            csvContent += `Working Days: ${summary.working_days || 0}\n`;
            csvContent += `Total Employees: ${summary.total_employees || 0}\n\n`;
            
            // Add table headers
            csvContent += 'Employee Name,Department,Position,Present Days,Absent Days,Late Days,Attendance Percentage\n';
            
            // Add data rows
            data.forEach(employee => {
                const name = (employee.name || 'N/A').replace(/"/g, '""');
                const department = (employee.department || 'N/A').replace(/"/g, '""');
                const position = (employee.position || 'N/A').replace(/"/g, '""');
                
                csvContent += `"${name}","${department}","${position}",${employee.present_days || 0},${employee.absent_days || 0},${employee.late_days || 0},${employee.attendance_percentage || 0}%\n`;
            });

            // Create and trigger download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            
            const startDate = summary.start_date ? summary.start_date.split('T')[0] : 'unknown';
            const endDate = summary.end_date ? summary.end_date.split('T')[0] : 'unknown';
            link.setAttribute('download', `attendance-report-${startDate}-to-${endDate}.csv`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Report downloaded successfully', 'success');
        } catch (error) {
            showToast('Failed to download report', 'error');
            console.error('Download error:', error);
        }
    }

    // ==========================================================================
    // Data Refresh Functions
    // ==========================================================================

    async function refreshAttendanceData() {
        try {
            if (Object.keys(currentFilters).length > 0) {
                await applyFilters();
            } else {
                // Refresh the entire page
                window.location.reload();
            }
        } catch (error) {
            showToast('Failed to refresh data', 'error');
            console.error('Refresh error:', error);
        }
    }

    function initRefreshButton() {
        const refreshBtn = document.getElementById('refreshAttendance');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = refreshBtn.querySelector('.btn-icon');
                refreshBtn.disabled = true;
                
                if (icon) {
                    icon.style.animation = 'spin 1s linear infinite';
                }
                
                try {
                    await refreshAttendanceData();
                    showToast('Data refreshed successfully', 'success');
                } catch (error) {
                    showToast('Failed to refresh data', 'error');
                } finally {
                    refreshBtn.disabled = false;
                    if (icon) {
                        icon.style.animation = 'none';
                    }
                }
            });
        }
    }

    // ==========================================================================
    // Statistics Animation
    // ==========================================================================

    function animateStatistics() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const endValue = parseInt(element.textContent) || 0;
                    animateCounter(element, endValue);
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.5 });
        
        statNumbers.forEach(element => {
            observer.observe(element);
        });
    }

    // ==========================================================================
    // Toast Management
    // ==========================================================================

    function initToastHandlers() {
        const toast = document.getElementById('toast');
        const closeBtn = toast?.querySelector('.toast-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideToast();
            });
        }
        
        // Click anywhere on toast to close
        if (toast) {
            toast.addEventListener('click', hideToast);
        }
    }

    // ==========================================================================
    // Export Functionality
    // ==========================================================================

    function initExportButton() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportCurrentTableAsCSV();
            });
        }
    }

    function exportCurrentTableAsCSV() {
        const table = document.getElementById('attendanceTable');
        const rows = table?.querySelectorAll('tr');
        
        if (!rows || rows.length <= 1) { // Only header row
            showToast('No data to export', 'warning');
            return;
        }

        try {
            let csvContent = 'data:text/csv;charset=utf-8,';
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('th, td');
                const rowData = Array.from(cells).slice(0, -1).map(cell => {
                    // Get text content and clean it
                    let text = cell.textContent.trim();
                    // Escape quotes and wrap in quotes if contains comma
                    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                        text = '"' + text.replace(/"/g, '""') + '"';
                    }
                    return text;
                });
                csvContent += rowData.join(',') + '\n';
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `attendance-records-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Attendance records exported successfully', 'success');
        } catch (error) {
            showToast('Failed to export data', 'error');
            console.error('Export error:', error);
        }
    }

    // ==========================================================================
    // Keyboard Shortcuts
    // ==========================================================================

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only process shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl/Cmd + R: Refresh (prevent default browser refresh)
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                document.getElementById('refreshAttendance')?.click();
            }
            
            // Ctrl/Cmd + B: Bulk Mark
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                document.getElementById('bulkMarkBtn')?.click();
            }
            
            // Ctrl/Cmd + G: Generate Report
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                document.getElementById('generateReportBtn')?.click();
            }
            
            // Escape: Close modals and toast
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal.show');
                modals.forEach(modal => {
                    modal.classList.remove('show');
                });
                hideToast();
            }
        });
    }

    // ==========================================================================
    // Accessibility Enhancements
    // ==========================================================================

    function initAccessibility() {
        // Add ARIA labels to buttons without text
        const iconButtons = document.querySelectorAll('button[title]:not([aria-label])');
        iconButtons.forEach(btn => {
            btn.setAttribute('aria-label', btn.getAttribute('title'));
        });

        // Focus management for modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    trapFocus(e, modal);
                }
            });
        });

        // Add role and aria-live to toast
        const toast = document.getElementById('toast');
        if (toast) {
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'polite');
        }

        // Add aria-expanded to buttons that open modals
        const modalTriggers = document.querySelectorAll('[id$="Btn"]');
        modalTriggers.forEach(btn => {
            btn.setAttribute('aria-expanded', 'false');
            btn.addEventListener('click', () => {
                btn.setAttribute('aria-expanded', 'true');
            });
        });
    }

    function trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    // ==========================================================================
    // Performance Optimization
    // ==========================================================================

    function initPerformanceOptimizations() {
        // Throttled scroll listener for tables
        let scrollTimeout;
        const tableContainers = document.querySelectorAll('.table-wrapper');
        
        tableContainers.forEach(container => {
            container.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    updateTableShadows(container);
                }, 16); // ~60fps
            });
        });

        // Debounced resize listener
        const debouncedResize = debounce(() => {
            updateResponsiveElements();
        }, 250);
        
        window.addEventListener('resize', debouncedResize);
    }

    function updateTableShadows(container) {
        // Add visual indicators for scrollable content
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        
        container.classList.toggle('scrolled-left', scrollLeft > 0);
        container.classList.toggle('scrolled-right', scrollLeft < scrollWidth - clientWidth - 1);
    }

    function updateResponsiveElements() {
        // Handle responsive adjustments that can't be done with CSS alone
        const isMobile = window.innerWidth <= 768;
        const modals = document.querySelectorAll('.modal-content');
        
        modals.forEach(modal => {
            if (isMobile) {
                modal.style.margin = '10px';
            } else {
                modal.style.margin = '';
            }
        });
    }

    // ==========================================================================
    // Error Handling
    // ==========================================================================

    function initErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error caught:', e.error);
            showToast('An unexpected error occurred', 'error');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            showToast('An unexpected error occurred', 'error');
            e.preventDefault(); // Prevent console spam
        });

        // Network error detection
        window.addEventListener('offline', () => {
            showToast('Network connection lost', 'warning');
        });

        window.addEventListener('online', () => {
            showToast('Network connection restored', 'success');
        });
    }

    // ==========================================================================
    // Form Validation
    // ==========================================================================

    function initFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input[required], select[required]');
            
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    validateInput(input);
                });
                
                input.addEventListener('input', () => {
                    clearInputError(input);
                });
            });
        });
    }

    function validateInput(input) {
        const isValid = input.checkValidity();
        
        if (!isValid) {
            input.classList.add('error');
            showInputError(input, input.validationMessage);
        } else {
            input.classList.remove('error');
            clearInputError(input);
        }
        
        return isValid;
    }

    function showInputError(input, message) {
        clearInputError(input);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'input-error';
        errorElement.textContent = message;
        
        input.parentNode.appendChild(errorElement);
    }

    function clearInputError(input) {
        const errorElement = input.parentNode.querySelector('.input-error');
        if (errorElement) {
            errorElement.remove();
        }
        input.classList.remove('error');
    }

    // ==========================================================================
    // Initialization
    // ==========================================================================

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        try {
            // Initialize all components
            initQuickMarkForm();
            initFilterForm();
            initBulkMarkModal();
            initReportModal();
            initRefreshButton();
            initToastHandlers();
            initExportButton();
            initTableActions();
            initKeyboardShortcuts();
            initAccessibility();
            initPerformanceOptimizations();
            initErrorHandling();
            initFormValidation();

            // Animate statistics after a short delay
            setTimeout(() => {
                animateStatistics();
            }, 300);

            // Initialize responsive elements
            updateResponsiveElements();

            console.log('Admin Attendance Management initialized successfully');
            
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Failed to initialize attendance management', 'error');
        }
    }

    // ==========================================================================
    // Cleanup
    // ==========================================================================

    function cleanup() {
        // Clear timeouts
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        // Clear any intervals that might be running
        // Remove event listeners if needed for memory cleanup
    }

    // Add cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

    // ==========================================================================
    // Public API
    // ==========================================================================

    // Expose public methods for external use
    window.AttendanceManager = {
        refreshData: refreshAttendanceData,
        showToast: showToast,
        hideToast: hideToast,
        applyFilters: applyFilters,
        exportTableAsCSV: exportCurrentTableAsCSV,
        showLoading: showLoading,
        hideLoading: hideLoading
    };

    // Initialize when DOM is ready
    init();

})();

toastDuration 