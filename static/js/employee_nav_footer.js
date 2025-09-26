/**
 * Employee Navigation and Footer JavaScript
 * Handles mobile menu toggle, dropdown functionality, and active states
 * Based on admin navigation but tailored for employee interface
 */

class EmployeeNavigation {
    constructor() {
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.mobileNav = document.getElementById('mobileNav');
        this.profileDropdown = document.getElementById('profileDropdown');
        this.dropdownMenu = document.getElementById('dropdownMenu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupProfileDropdown();
        this.setupActiveStates();
        this.setupClickOutside();
        this.setupKeyboardNavigation();
        this.setupResponsiveHandling();
        this.setupProfileLinks();
    }

    /**
     * Setup mobile menu toggle functionality
     */
    setupMobileMenu() {
        if (this.mobileMenuToggle && this.mobileNav) {
            this.mobileMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
        }
    }

    /**
     * Toggle mobile menu open/close
     */
    toggleMobileMenu() {
        const isActive = this.mobileMenuToggle.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.mobileMenuToggle.classList.add('active');
        this.mobileNav.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Close profile dropdown if open
        this.closeProfileDropdown();
        
        // Focus management
        const firstLink = this.mobileNav.querySelector('.mobile-nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.mobileMenuToggle.classList.remove('active');
        this.mobileNav.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Setup profile dropdown functionality
     */
    setupProfileDropdown() {
        if (this.profileDropdown && this.dropdownMenu) {
            this.profileDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileDropdown();
            });
        }
    }

    /**
     * Toggle profile dropdown open/close
     */
    toggleProfileDropdown() {
        const isActive = this.profileDropdown.classList.contains('active');
        
        if (isActive) {
            this.closeProfileDropdown();
        } else {
            this.openProfileDropdown();
        }
    }

    /**
     * Open profile dropdown
     */
    openProfileDropdown() {
        this.profileDropdown.classList.add('active');
        this.dropdownMenu.classList.add('show');
        
        // Close mobile menu if open
        this.closeMobileMenu();
        
        // Focus first dropdown item
        const firstItem = this.dropdownMenu.querySelector('.dropdown-item');
        if (firstItem) {
            setTimeout(() => firstItem.focus(), 100);
        }
    }

    /**
     * Close profile dropdown
     */
    closeProfileDropdown() {
        if (this.profileDropdown && this.dropdownMenu) {
            this.profileDropdown.classList.remove('active');
            this.dropdownMenu.classList.remove('show');
        }
    }

    /**
     * Setup active states for navigation links
     */
    setupActiveStates() {
        const currentPath = window.location.pathname;
        
        // Desktop nav links
        this.navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === currentPath || this.isPathMatch(linkPath, currentPath)) {
                link.classList.add('active');
            }
        });
        
        // Mobile nav links
        this.mobileNavLinks.forEach(link => {
            if (!link.classList.contains('logout-link')) {
                const linkPath = new URL(link.href).pathname;
                if (linkPath === currentPath || this.isPathMatch(linkPath, currentPath)) {
                    link.classList.add('active');
                }
            }
        });
    }

    /**
     * Check if paths match (handles nested routes)
     */
    isPathMatch(linkPath, currentPath) {
        // Handle exact matches
        if (linkPath === currentPath) return true;
        
        // Handle nested routes (e.g., /employee/dashboard matches /employee/dashboard/analytics)
        if (currentPath.startsWith(linkPath) && linkPath !== '/') {
            return true;
        }
        
        return false;
    }

    /**
     * Setup click outside functionality to close dropdowns and menus
     */
    setupClickOutside() {
        document.addEventListener('click', (e) => {
            // Close profile dropdown if clicking outside
            if (this.dropdownMenu && 
                !this.profileDropdown.contains(e.target) && 
                !this.dropdownMenu.contains(e.target)) {
                this.closeProfileDropdown();
            }
            
            // Close mobile menu if clicking outside
            if (this.mobileNav && 
                !this.mobileMenuToggle.contains(e.target) && 
                !this.mobileNav.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Setup keyboard navigation for accessibility
     */
    setupKeyboardNavigation() {
        // Handle Escape key to close menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProfileDropdown();
                this.closeMobileMenu();
            }
        });

        // Handle dropdown navigation with arrow keys
        if (this.dropdownMenu) {
            this.dropdownMenu.addEventListener('keydown', (e) => {
                const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
                const currentIndex = Array.from(items).indexOf(document.activeElement);

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % items.length;
                        items[nextIndex].focus();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
                        items[prevIndex].focus();
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        document.activeElement.click();
                        break;
                }
            });
        }

        // Handle mobile menu navigation with arrow keys
        if (this.mobileNav) {
            this.mobileNav.addEventListener('keydown', (e) => {
                const links = this.mobileNav.querySelectorAll('.mobile-nav-link');
                const currentIndex = Array.from(links).indexOf(document.activeElement);

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % links.length;
                        links[nextIndex].focus();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = currentIndex === 0 ? links.length - 1 : currentIndex - 1;
                        links[prevIndex].focus();
                        break;
                }
            });
        }
    }

    /**
     * Setup responsive handling for screen size changes
     */
    setupResponsiveHandling() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Close mobile menu on desktop resize
                if (window.innerWidth > 768) {
                    this.closeMobileMenu();
                }
                // Close dropdown on mobile resize
                if (window.innerWidth <= 768) {
                    this.closeProfileDropdown();
                }
            }, 250);
        });
    }

    /**
     * Setup profile links functionality
     */
    setupProfileLinks() {
        // Desktop profile link
        const profileLink = document.getElementById('profileLink');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleProfileView();
            });
        }

        // Mobile profile link
        const mobileProfileLink = document.getElementById('mobileProfileLink');
        if (mobileProfileLink) {
            mobileProfileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleProfileView();
            });
        }
    }

    /**
     * Handle profile view navigation
     */

    handleProfileView() {
    // Close the dropdown first
    this.closeProfileDropdown();
    this.closeMobileMenu();
    
    // Trigger the profile modal instead of navigation
    if (typeof window.ProfileModal !== 'undefined' && window.ProfileModal.open) {
        window.ProfileModal.open();
    } else {
        // Fallback: try to trigger modal via event
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            profileModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
}

    /**
     * Show loading state for navigation links
     */
    showLoadingState() {
        // Add loading class to prevent multiple clicks
        this.navLinks.forEach(link => link.classList.add('loading'));
        this.mobileNavLinks.forEach(link => link.classList.add('loading'));
        
        // Remove loading state after navigation
        setTimeout(() => {
            this.navLinks.forEach(link => link.classList.remove('loading'));
            this.mobileNavLinks.forEach(link => link.classList.remove('loading'));
        }, 2000);
    }

    /**
     * Update active state programmatically (for SPA navigation)
     */
    updateActiveState(activePath) {
        // Remove all active states
        this.navLinks.forEach(link => link.classList.remove('active'));
        this.mobileNavLinks.forEach(link => link.classList.remove('active'));

        // Add active state to matching links
        this.navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === activePath || this.isPathMatch(linkPath, activePath)) {
                link.classList.add('active');
            }
        });

        this.mobileNavLinks.forEach(link => {
            if (!link.classList.contains('logout-link')) {
                const linkPath = new URL(link.href).pathname;
                if (linkPath === activePath || this.isPathMatch(linkPath, activePath)) {
                    link.classList.add('active');
                }
            }
        });
    }

    /**
     * Public method to close all menus
     */
    closeAllMenus() {
        this.closeProfileDropdown();
        this.closeMobileMenu();
    }
}

/**
 * Utility functions for enhanced functionality
 */
const EmployeeNavigationUtils = {
    /**
     * Show toast notification (if toast system is available)
     */
    showToast(message, type = 'info') {
        // Check if toast system exists and show notification
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    },

    /**
     * Handle navigation errors gracefully
     */
    handleNavigationError(error) {
        console.error('Navigation error:', error);
        this.showToast('Navigation failed. Please try again.', 'error');
    },

    /**
     * Preload page for faster navigation
     */
    preloadPage(url) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    }
};

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.employeeNavigation = new EmployeeNavigation();
    
    // Expose utilities globally
    window.EmployeeNavigationUtils = EmployeeNavigationUtils;
});

// Handle page visibility changes to close menus when tab becomes inactive
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.employeeNavigation) {
        window.employeeNavigation.closeAllMenus();
    }
});