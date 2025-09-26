// Employee Management JavaScript - Backend Integration
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let employees = [];

    // Get DOM elements
    const employeeGrid = document.getElementById('employeeGrid');
    const employeeCountSpan = document.getElementById('employeeCount');
    const searchInput = document.getElementById('searchEmployees');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const emptyStateBtn = document.getElementById('emptyStateBtn');

    // Modals
    const addModal = document.getElementById('addEmployeeModal');
    const editModal = document.getElementById('editEmployeeModal');
    const deleteModal = document.getElementById('deleteEmployeeModal');

    // Forms and buttons
    const addForm = document.getElementById('addEmployeeForm');
    const editForm = document.getElementById('editEmployeeForm');
    const deleteNameSpan = document.getElementById('deleteEmployeeName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    let employeeToDeleteId = null;

    // API Helper Functions
    async function apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    }

    // Load employees from backend
    async function loadEmployees() {
        try {
            showLoading(true);
            const response = await apiRequest('/admin/employees/list');
            employees = response.employees || [];
            renderEmployees();
        } catch (error) {
            console.error('Failed to load employees:', error);
            employees = [];
            renderEmployees();
        } finally {
            showLoading(false);
        }
    }

    // Show/hide loading state
    function showLoading(show) {
        loadingState.style.display = show ? 'flex' : 'none';
        employeeGrid.style.display = show ? 'none' : 'grid';
    }

    // Show notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });
    }

    // Helper function to create an employee card HTML string
    function createEmployeeCard(employee) {
        const initials = employee.name ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
        const plainPassword = employee.plain_password || 'Not set';
        
        // Handle avatar - show image if available, otherwise show initials
        let avatarContent;
        if (employee.image && employee.image.trim()) {
            avatarContent = `<img src="${employee.image}" alt="${employee.name}" onerror="this.style.display='none'; this.parentNode.classList.remove('has-image'); this.parentNode.textContent='${initials}';">`;
        } else {
            avatarContent = initials;
        }
        
        return `
            <div class="employee-card" data-id="${employee.id}">
                <div class="employee-header">
                    <div class="employee-avatar ${employee.image ? 'has-image' : ''}">${avatarContent}</div>
                    <div class="employee-info">
                        <h4 class="employee-name">${employee.name || 'No Name'}</h4>
                        <p class="employee-position">${employee.position || 'No Position'}</p>
                        <p class="employee-department">${employee.department || ''}</p>
                    </div>
                </div>
                <div class="employee-details">
                    <div class="employee-contact">
                        <div class="contact-item">
                            <svg class="contact-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <path d="m22 6-10 7L2 6"/>
                            </svg>
                            <span>${employee.email || 'No Email'}</span>
                        </div>
                        <div class="contact-item">
                            <svg class="contact-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2.08A19.5 19.5 0 0 1 2 5.09a2 2 0 0 1 2.08-2.18h3a2 2 0 0 1 2 2c0 1.5-.5 3-1.25 4.75A17.65 17.65 0 0 0 17 18.25c1.75-.75 3.25-1.25 4.75-1.25a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>${employee.phone || 'No Phone'}</span>
                        </div>
                        <div class="contact-item password-item">
                            <svg class="contact-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <circle cx="12" cy="16" r="1"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span class="password-display">Password: ${plainPassword}</span>
                        </div>
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="action-btn edit-btn" data-id="${employee.id}" title="Edit Employee">
                        <svg class="action-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" data-id="${employee.id}" title="Delete Employee">
                        <svg class="action-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Function to render employees to the grid
    function renderEmployees(filteredEmployees = employees) {
        employeeGrid.innerHTML = '';
        
        if (filteredEmployees.length === 0) {
            emptyState.style.display = 'block';
            employeeGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            employeeGrid.style.display = 'grid';
            filteredEmployees.forEach(employee => {
                employeeGrid.innerHTML += createEmployeeCard(employee);
            });
        }

        employeeCountSpan.textContent = `${filteredEmployees.length} employee${filteredEmployees.length === 1 ? '' : 's'}`;
        attachEventListeners();
    }

    // Function to attach event listeners to dynamically created buttons
    function attachEventListeners() {
        const editButtons = document.querySelectorAll('.edit-btn');
        const deleteButtons = document.querySelectorAll('.delete-btn');

        editButtons.forEach(button => {
            button.addEventListener('click', handleEditClick);
        });

        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDeleteClick);
        });
    }

    // Modal control functions
    function openModal(modalEl) {
        modalEl.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalEl) {
        modalEl.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    // Set button loading state
    function setButtonLoading(button, loading) {
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
            button.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'block';
            if (btnLoading) btnLoading.style.display = 'none';
            button.disabled = false;
        }
    }

    // Image upload handling
    function setupImageUpload(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        if (!input || !preview) return;
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select an image file', 'error');
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image size must be less than 5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image">`;
                    preview.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Click to upload
        preview.addEventListener('click', function() {
            input.click();
        });
    }

    // Phone number formatting for Philippines
    function formatPhoneNumber(input) {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Remove leading zeros and country code if present
            if (value.startsWith('63')) {
                value = value.substring(2);
            } else if (value.startsWith('0')) {
                value = value.substring(1);
            }
            
            // Format as +63 (9XX) XXX-XXXX
            if (value.length >= 10) {
                const formatted = `+63 (${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6, 10)}`;
                e.target.value = formatted;
            } else if (value.length > 0) {
                e.target.value = `+63 ${value}`;
            }
        });
    }

    // Upload image to server
    async function uploadImage(imageData, employeeId) {
        try {
            const response = await apiRequest('/admin/employees/upload-image', {
                method: 'POST',
                body: JSON.stringify({
                    image_data: imageData,
                    employee_id: employeeId
                })
            });
            return response.image_url;
        } catch (error) {
            console.error('Failed to upload image:', error);
            throw error;
        }
    }

    // Event handlers for opening/closing modals
    addEmployeeBtn.addEventListener('click', () => openModal(addModal));
    emptyStateBtn.addEventListener('click', () => openModal(addModal));
    
    addModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            addForm.reset();
            resetImagePreview('addImagePreview');
            closeModal(addModal);
        });
    });

    editModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            editForm.reset();
            resetImagePreview('editImagePreview');
            closeModal(editModal);
        });
    });

    deleteModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => closeModal(deleteModal));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.querySelector('.modal.show')) {
            const openModal = document.querySelector('.modal.show');
            closeModal(openModal);
        }
    });

    // Reset image preview
    function resetImagePreview(previewId) {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = `
                <div class="image-placeholder">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span>Click to upload image</span>
                </div>
            `;
            preview.classList.remove('has-image');
        }
    }

    // Handle Add Employee form submission
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = addForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true);
        
        try {
            const formData = {
                name: addForm.querySelector('#empName').value.trim(),
                email: addForm.querySelector('#empEmail').value.trim(),
                password: addForm.querySelector('#empPassword').value.trim(),
                position: addForm.querySelector('#empPosition').value.trim(),
                department: addForm.querySelector('#empDepartment').value.trim(),
                role: addForm.querySelector('#empRole').value,
                phone: addForm.querySelector('#empPhone').value.trim()
            };

            // Validate required fields
            if (!formData.name || !formData.email || !formData.password) {
                throw new Error('Name, email, and password are required');
            }

            // Create employee first
            const response = await apiRequest('/admin/employees/add', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            // Handle image upload if present
            const imageInput = addForm.querySelector('#empImage');
            if (imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        await uploadImage(e.target.result, response.employee.id);
                        showNotification('Employee added with image successfully!');
                    } catch (imgError) {
                        showNotification('Employee added, but image upload failed', 'error');
                    }
                    loadEmployees();
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                showNotification(response.message || 'Employee added successfully!');
                loadEmployees();
            }

            addForm.reset();
            resetImagePreview('addImagePreview');
            closeModal(addModal);
            
        } catch (error) {
            console.error('Failed to add employee:', error);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // Handle Edit Employee button click
    function handleEditClick(event) {
        const id = event.currentTarget.dataset.id;
        const employee = employees.find(emp => emp.id === id);

        if (employee) {
            editModal.querySelector('#editEmpId').value = employee.id;
            editModal.querySelector('#editEmpName').value = employee.name || '';
            editModal.querySelector('#editEmpEmail').value = employee.email || '';
            editModal.querySelector('#editEmpPosition').value = employee.position || '';
            editModal.querySelector('#editEmpDepartment').value = employee.department || '';
            editModal.querySelector('#editEmpRole').value = employee.role || 'employee';
            editModal.querySelector('#editEmpPhone').value = employee.phone || '';
            
            // Handle image preview
            const imagePreview = editModal.querySelector('#editImagePreview');
            if (employee.image && employee.image.trim()) {
                imagePreview.innerHTML = `<img src="${employee.image}" alt="Current Image" class="preview-image">`;
                imagePreview.classList.add('has-image');
            } else {
                resetImagePreview('editImagePreview');
            }
            
            // Reset password field
            const passwordField = editModal.querySelector('#editEmpPassword');
            const changeBtn = editModal.querySelector('#changePasswordBtn');
            if (passwordField && changeBtn) {
                passwordField.style.display = 'none';
                passwordField.value = '';
                changeBtn.style.display = 'block';
            }
            
            openModal(editModal);
        }
    }

    // Handle password change button
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'changePasswordBtn') {
            const passwordField = editModal.querySelector('#editEmpPassword');
            const changeBtn = editModal.querySelector('#changePasswordBtn');
            
            if (passwordField && changeBtn) {
                passwordField.style.display = 'block';
                changeBtn.style.display = 'none';
                passwordField.focus();
            }
        }
    });

    // Handle Edit form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = editForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true);
        
        try {
            const id = editForm.querySelector('#editEmpId').value;
            const formData = {
                name: editForm.querySelector('#editEmpName').value.trim(),
                email: editForm.querySelector('#editEmpEmail').value.trim(),
                position: editForm.querySelector('#editEmpPosition').value.trim(),
                department: editForm.querySelector('#editEmpDepartment').value.trim(),
                role: editForm.querySelector('#editEmpRole').value,
                phone: editForm.querySelector('#editEmpPhone').value.trim()
            };

            // Include password if it was changed
            const passwordField = editForm.querySelector('#editEmpPassword');
            if (passwordField && passwordField.style.display !== 'none' && passwordField.value.trim()) {
                formData.password = passwordField.value.trim();
            }

            // Update employee first
            const response = await apiRequest(`/admin/employees/update/${id}`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            // Handle image upload if present
            const imageInput = editForm.querySelector('#editEmpImage');
            if (imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        await uploadImage(e.target.result, id);
                        showNotification('Employee updated with new image successfully!');
                    } catch (imgError) {
                        showNotification('Employee updated, but image upload failed', 'error');
                    }
                    loadEmployees();
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                showNotification(response.message || 'Employee updated successfully!');
                loadEmployees();
            }

            editForm.reset();
            closeModal(editModal);
            
        } catch (error) {
            console.error('Failed to update employee:', error);
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    // Handle Delete Employee button click
    function handleDeleteClick(event) {
        employeeToDeleteId = event.currentTarget.dataset.id;
        const employee = employees.find(emp => emp.id === employeeToDeleteId);
        if (employee) {
            deleteNameSpan.textContent = employee.name;
            openModal(deleteModal);
        }
    }

    // Handle Delete confirmation
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!employeeToDeleteId) return;
        
        setButtonLoading(confirmDeleteBtn, true);
        
        try {
            const response = await apiRequest(`/admin/employees/delete/${employeeToDeleteId}`, {
                method: 'POST'
            });

            showNotification(response.message || 'Employee deleted successfully!');
            employeeToDeleteId = null;
            closeModal(deleteModal);
            loadEmployees();
            
        } catch (error) {
            console.error('Failed to delete employee:', error);
        } finally {
            setButtonLoading(confirmDeleteBtn, false);
        }
    });

    // Search functionality
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredEmployees = employees.filter(emp =>
            (emp.name || '').toLowerCase().includes(searchTerm) ||
            (emp.position || '').toLowerCase().includes(searchTerm) ||
            (emp.email || '').toLowerCase().includes(searchTerm) ||
            (emp.department || '').toLowerCase().includes(searchTerm)
        );
        renderEmployees(filteredEmployees);
    });

    // Initial load and setup
    loadEmployees();
    
    // Setup image uploads and phone formatting after DOM is ready
    setTimeout(() => {
        setupImageUpload('empImage', 'addImagePreview');
        setupImageUpload('editEmpImage', 'editImagePreview');
        
        // Format phone numbers
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(formatPhoneNumber);
    }, 100);
});

// Add CSS for notifications if not already present
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .notification-success {
            background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .notification-error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .notification-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            margin-left: 12px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
        
        .password-item {
            color: #666;
            font-size: 0.9em;
        }
        
        .password-display {
            font-family: monospace;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85em;
        }
        
        .employee-role {
            font-size: 0.8em;
            padding: 4px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .employee-role.admin {
            background: #fef3c7;
            color: #d97706;
        }
        
        .employee-role.employee {
            background: #e0f2fe;
            color: #0277bd;
        }
    `;
    document.head.appendChild(style);
}