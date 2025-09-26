/**
 * Employee Profile Modal JavaScript - FIXED VERSION
 * Handles modal opening/closing and profile data loading
 */

// Global state for profile modal
const ProfileModal = {
    isOpen: false,
    isLoading: false,
    profileData: null,
    elements: {},
    originalModalBodyContent: null
};

// Initialize profile modal functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing profile modal...');
    initializeProfileModal();
});

/**
 * Initialize profile modal elements and event listeners
 */
function initializeProfileModal() {
    console.log('Initializing profile modal...');
    
    // Cache DOM elements
    ProfileModal.elements = {
        modal: document.getElementById('profileModal'),
        profileLink: document.getElementById('profileLink'),
        mobileProfileLink: document.getElementById('mobileProfileLink'),
        closeButton: document.getElementById('closeProfileModal'),
        modalBody: document.querySelector('.profile-modal-body'),
        modalContent: document.querySelector('.profile-modal')
    };

    // Debug: Log which elements were found
    console.log('Profile modal elements found:', {
        modal: !!ProfileModal.elements.modal,
        profileLink: !!ProfileModal.elements.profileLink,
        mobileProfileLink: !!ProfileModal.elements.mobileProfileLink,
        closeButton: !!ProfileModal.elements.closeButton,
        modalBody: !!ProfileModal.elements.modalBody,
        modalContent: !!ProfileModal.elements.modalContent
    });

    // Check if required elements exist
    if (!ProfileModal.elements.modal) {
        console.warn('Profile modal element not found');
        return;
    }

    // Store original modal body content
    if (ProfileModal.elements.modalBody) {
        ProfileModal.originalModalBodyContent = ProfileModal.elements.modalBody.innerHTML;
        console.log('Original modal content stored');
    }

    // Setup event listeners
    setupEventListeners();
    
    console.log('Profile modal initialized successfully');
}

/**
 * Setup all event listeners for the profile modal
 */
function setupEventListeners() {
    const { modal, profileLink, mobileProfileLink, closeButton, modalContent } = ProfileModal.elements;

    // Desktop profile link click
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Desktop profile link clicked');
            
            // Close dropdown menus first
            closeAllMenus();
            
            openProfileModal();
        });
    }

    // Mobile profile link click
    if (mobileProfileLink) {
        mobileProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile profile link clicked');
            
            // Close dropdown menus first
            closeAllMenus();
            
            openProfileModal();
        });
    }

    // Setup close button event listener with delegation
    setupCloseButtonListener();

    // Close modal when clicking overlay (but not modal content)
    if (modal) {
        modal.addEventListener('click', function(e) {
            // Only close if clicking the overlay itself, not the modal content
            if (e.target === modal) {
                console.log('Modal overlay clicked');
                closeProfileModal();
            }
        });
    }

    // Prevent modal content clicks from closing modal
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && ProfileModal.isOpen) {
            console.log('Escape key pressed, closing modal');
            closeProfileModal();
        }
    });
    
    console.log('Event listeners setup complete');
}

/**
 * Setup close button listener with event delegation to handle dynamic content
 */
function setupCloseButtonListener() {
    const { modal } = ProfileModal.elements;
    
    if (!modal) return;

    // Use event delegation on the modal to catch close button clicks
    modal.addEventListener('click', function(e) {
        // Check if the clicked element is the close button or contains the close button
        const closeButton = e.target.closest('.profile-modal-close, #closeProfileModal');
        if (closeButton) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked via delegation');
            closeProfileModal();
        }
    });

    // Also setup direct listener if close button exists initially
    const closeButton = document.getElementById('closeProfileModal');
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked directly');
            closeProfileModal();
        });
    }
}

/**
 * Close all navigation menus - works with or without employeeNavigation
 */
function closeAllMenus() {
    try {
        if (window.employeeNavigation && typeof window.employeeNavigation.closeAllMenus === 'function') {
            window.employeeNavigation.closeAllMenus();
        } else {
            // Fallback: manually close dropdowns
            const dropdown = document.getElementById('dropdownMenu');
            const profileDropdown = document.getElementById('profileDropdown');
            const mobileNav = document.getElementById('mobileNav');
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            
            if (dropdown) dropdown.classList.remove('show');
            if (profileDropdown) profileDropdown.classList.remove('active');
            if (mobileNav) mobileNav.classList.remove('show');
            if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
            
            // Also restore body overflow if it was changed
            document.body.style.overflow = '';
        }
    } catch (error) {
        console.warn('Error closing menus:', error);
    }
}

/**
 * Open the profile modal
 */
async function openProfileModal() {
    const { modal } = ProfileModal.elements;
    
    console.log('Opening profile modal...');
    
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    if (ProfileModal.isOpen) {
        console.log('Modal is already open');
        return;
    }

    try {
        ProfileModal.isOpen = true;

        // Show modal with loading state
        modal.classList.add('active');
        showLoadingState();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        console.log('Modal opened, loading profile data...');

        // Load profile data
        await loadProfileData();
        
        console.log('Profile data loaded successfully');
        
        // Focus management for accessibility - find close button after content is loaded
        setTimeout(() => {
            const closeButton = document.getElementById('closeProfileModal') || 
                              document.querySelector('.profile-modal-close');
            if (closeButton) {
                closeButton.focus();
            }
        }, 200);

    } catch (error) {
        console.error('Error opening profile modal:', error);
        showErrorState('Failed to load profile data. Please try again.');
        // Keep modal open to show error
    }
}

/**
 * Close the profile modal - IMPROVED VERSION
 */
function closeProfileModal() {
    const { modal } = ProfileModal.elements;
    
    console.log('Closing profile modal...');
    
    if (!modal) {
        console.log('Modal element not found');
        return;
    }

    if (!ProfileModal.isOpen) {
        console.log('Modal is already closed');
        return;
    }

    // Set state immediately to prevent multiple calls
    ProfileModal.isOpen = false;
    
    // Hide modal immediately
    modal.classList.remove('active');
    
    // Restore body scroll immediately
    document.body.style.overflow = '';
    
    // Clear loading state immediately
    ProfileModal.isLoading = false;
    
    console.log('Profile modal closed successfully');
    
    // Clean up after animation completes
    setTimeout(() => {
        // Clear any loading or error states
        hideErrorState();
        hideLoadingState();
        
        // Restore original content
        restoreOriginalContent();
        
        console.log('Modal cleanup completed');
    }, 300); // Wait for modal close animation
}

/**
 * Restore original modal content - IMPROVED VERSION
 */
function restoreOriginalContent() {
    const { modalBody } = ProfileModal.elements;
    
    if (modalBody && ProfileModal.originalModalBodyContent) {
        modalBody.innerHTML = ProfileModal.originalModalBodyContent;
        console.log('Original modal content restored');
        
        // Re-setup close button listener for the restored content
        setTimeout(() => {
            setupCloseButtonListener();
        }, 50);
    }
}

/**
 * Load profile data from server
 */
async function loadProfileData() {
    if (ProfileModal.isLoading) {
        console.log('Profile data is already loading');
        return;
    }

    try {
        ProfileModal.isLoading = true;
        console.log('Fetching profile data from server...');

        const response = await fetch('/employee/profile-data', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Profile data received:', data);

        if (data.success && data.employee) {
            ProfileModal.profileData = data.employee;
            updateModalContent(data.employee);
        } else {
            throw new Error(data.error || 'Failed to load profile data');
        }

    } catch (error) {
        console.error('Error loading profile data:', error);
        throw error;
    } finally {
        ProfileModal.isLoading = false;
    }
}

/**
 * Update modal content with profile data
 */
function updateModalContent(employee) {
    console.log('Updating modal content with employee data:', employee);
    
    // Hide loading state first
    hideLoadingState();
    
    // Restore original content
    restoreOriginalContent();
    
    // Wait a moment for content to be restored, then update
    setTimeout(() => {
        // Update profile image/initials
        updateProfileAvatar(employee);
        
        // Update profile details
        updateProfileDetails(employee);
        
        // Re-setup close button listener after content update
        setupCloseButtonListener();
        
        console.log('Profile modal content updated');
    }, 100); // Slightly longer delay to ensure DOM is ready
}

/**
 * Update profile avatar in modal
 */
function updateProfileAvatar(employee) {
    let avatarContainer = document.querySelector('.profile-modal-avatar');
    
    if (!avatarContainer) {
        console.warn('Avatar container not found');
        return;
    }

    console.log('Updating profile avatar');

    // Clear existing content
    avatarContainer.innerHTML = '';

    if (employee.image && employee.image.trim() !== '') {
        const img = document.createElement('img');
        img.src = employee.image;
        img.alt = employee.full_name || 'Profile Image';
        img.className = 'modal-profile-image';
        img.id = 'modalProfileImage';
        img.onerror = function() {
            // If image fails to load, show initials instead
            showInitialsAvatar(avatarContainer, employee);
        };
        avatarContainer.appendChild(img);
    } else {
        showInitialsAvatar(avatarContainer, employee);
    }
}

/**
 * Show initials avatar
 */
function showInitialsAvatar(container, employee) {
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'modal-profile-initials';
    initialsDiv.id = 'modalProfileInitials';
    
    // Get initials
    const fullName = employee.full_name || employee.name || '';
    const nameParts = fullName.trim().split(' ');
    let initials = '';
    
    if (nameParts.length > 0 && nameParts[0]) {
        initials = nameParts[0].charAt(0);
        if (nameParts.length > 1 && nameParts[nameParts.length - 1]) {
            initials += nameParts[nameParts.length - 1].charAt(0);
        }
    } else {
        initials = 'U'; // Default for "User"
    }
    
    initialsDiv.textContent = initials.toUpperCase();
    container.appendChild(initialsDiv);
}

/**
 * Update profile details in modal
 */
function updateProfileDetails(employee) {
    console.log('Updating profile details');
    
    const updates = {
        'modalEmployeeId': employee.employee_id || employee.id || 'N/A',
        'modalFullName': employee.full_name || employee.name || 'N/A',
        'modalEmail': employee.email || 'N/A',
        'modalPhone': employee.phone || 'N/A',
        'modalPosition': employee.position || 'N/A',
        'modalDepartment': employee.department || 'N/A',
        'modalHireDate': formatDate(employee.hire_date) || formatDate(employee.created_at) || 'N/A'
    };

    // Update each field
    Object.entries(updates).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            console.log(`Updated ${elementId}: ${value}`);
        } else {
            console.warn(`Element ${elementId} not found`);
        }
    });

    // Update status badge if it exists
    const statusElement = document.getElementById('modalStatus');
    if (statusElement) {
        updateStatusBadge(employee.status || 'active');
    }
}

/**
 * Update status badge
 */
function updateStatusBadge(status) {
    const statusElement = document.getElementById('modalStatus');
    if (!statusElement) {
        console.warn('Status element not found');
        return;
    }

    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = `status-badge ${status.toLowerCase()}`;
    console.log(`Status updated: ${status}`);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return null;
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString; // Return original if formatting fails
    }
}

/**
 * Show loading state - IMPROVED VERSION
 */
function showLoadingState() {
    const { modalBody } = ProfileModal.elements;
    if (!modalBody) return;

    console.log('Showing loading state');

    modalBody.innerHTML = `
        <div class="profile-modal-loading" style="text-align: center; padding: 2rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; animation: spin 1s linear infinite; color: #007bff;">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <p style="color: #666; margin: 0; font-size: 16px;">Loading profile information...</p>
        </div>
        <style>
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        </style>
    `;
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const loadingElement = document.querySelector('.profile-modal-loading');
    if (loadingElement) {
        loadingElement.remove();
        console.log('Loading state hidden');
    }
}

/**
 * Show error state - IMPROVED VERSION
 */
function showErrorState(message) {
    const { modalBody } = ProfileModal.elements;
    if (!modalBody) return;

    console.log('Showing error state:', message);

    modalBody.innerHTML = `
        <div class="profile-modal-error" style="text-align: center; padding: 2rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: #dc3545;">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3 style="color: #dc3545; margin: 0 0 1rem 0; font-size: 18px;">Error Loading Profile</h3>
            <p style="color: #666; margin: 0 0 1.5rem 0; font-size: 14px;">${message}</p>
            <button onclick="retryLoadProfile()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                Try Again
            </button>
        </div>
    `;
}

/**
 * Hide error state
 */
function hideErrorState() {
    const errorElement = document.querySelector('.profile-modal-error');
    if (errorElement) {
        errorElement.remove();
        console.log('Error state hidden');
    }
}

/**
 * Retry loading profile (called from error state button)
 */
async function retryLoadProfile() {
    console.log('Retrying profile load...');
    hideErrorState();
    showLoadingState();
    
    try {
        await loadProfileData();
    } catch (error) {
        showErrorState('Failed to load profile data. Please try again.');
    }
}

/**
 * Force close modal (emergency function)
 */
function forceCloseModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        ProfileModal.isOpen = false;
        console.log('Modal force closed');
    }
}

/**
 * Export functions for testing or external access
 */
window.ProfileModal = {
    open: openProfileModal,
    close: closeProfileModal,
    forceClose: forceCloseModal,
    retry: retryLoadProfile,
    isOpen: () => ProfileModal.isOpen,
    getData: () => ProfileModal.profileData
};

// Global function for retry button
window.retryLoadProfile = retryLoadProfile;

console.log('Profile modal script loaded successfully');