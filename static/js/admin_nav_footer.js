/**
 * Admin Navigation and Footer JavaScript
 * Handles mobile menu toggle, dropdown functionality, and active states
 */

class AdminNavigation {
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
        
        // Handle nested routes (e.g., /admin/dashboard matches /admin/dashboard/analytics)
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

        // Handle Enter and Space for dropdown toggle
        if (this.profileDropdown) {
            this.profileDropdown.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleProfileDropdown();
                }
            });
        }

        // Handle Enter and Space for mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleMobileMenu();
                }
            });
        }

        // Handle arrow keys in dropdown menu
        if (this.dropdownMenu) {
            this.dropdownMenu.addEventListener('keydown', (e) => {
                const items = this.dropdownMenu.querySelectorAll('.dropdown-item');
                const currentIndex = Array.from(items).indexOf(document.activeElement);

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    items[nextIndex].focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    items[prevIndex].focus();
                }
            });
        }
    }

    /**
     * Setup responsive handling for window resize
     */
    setupResponsiveHandling() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Close mobile menu and dropdown on resize to desktop
                if (window.innerWidth > 768) {
                    this.closeMobileMenu();
                    this.closeProfileDropdown();
                }
            }, 250);
        });
    }

    /**
     * Add smooth scroll behavior to internal links
     */
    setupSmoothScroll() {
        const internalLinks = document.querySelectorAll('a[href^="#"]');
        
        internalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Close mobile menu if open
                    this.closeMobileMenu();
                }
            });
        });
    }

    /**
     * Update active state dynamically (useful for SPA or dynamic content)
     */
    updateActiveState(newPath) {
        // Remove all active states
        this.navLinks.forEach(link => link.classList.remove('active'));
        this.mobileNavLinks.forEach(link => link.classList.remove('active'));
        
        // Add active state to matching links
        [...this.navLinks, ...this.mobileNavLinks].forEach(link => {
            if (!link.classList.contains('logout-link')) {
                const linkPath = new URL(link.href).pathname;
                if (linkPath === newPath || this.isPathMatch(linkPath, newPath)) {
                    link.classList.add('active');
                }
            }
        });
    }
}

/**
 * Utility functions
 */
class NavigationUtils {
    /**
     * Show loading state on navigation links
     */
    static showLoadingState(linkElement) {
        const originalContent = linkElement.innerHTML;
        linkElement.innerHTML = `
            <svg class="nav-icon loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <span>Loading...</span>
        `;
        linkElement.classList.add('loading');
        
        // Store original content for restoration
        linkElement.dataset.originalContent = originalContent;
    }

    /**
     * Hide loading state on navigation links
     */
    static hideLoadingState(linkElement) {
        if (linkElement.dataset.originalContent) {
            linkElement.innerHTML = linkElement.dataset.originalContent;
            linkElement.classList.remove('loading');
            delete linkElement.dataset.originalContent;
        }
    }

    /**
     * Add notification badge to navigation items
     */
    static addNotificationBadge(linkElement, count = 0) {
        const existingBadge = linkElement.querySelector('.notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            linkElement.style.position = 'relative';
            linkElement.appendChild(badge);
        }
    }
}

/**
 * Initialize the navigation system when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main navigation
    const navigation = new AdminNavigation();
    
    // Add loading styles for navigation
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .notification-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background-color: #f44336;
            color: white;
            font-size: 0.7rem;
            font-weight: bold;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
        }
        
        .nav-link.loading,
        .mobile-nav-link.loading {
            opacity: 0.7;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
    
    // Make navigation and utils available globally if needed
    window.AdminNavigation = navigation;
    window.NavigationUtils = NavigationUtils;
    
    // Optional: Add loading states to navigation links
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    navLinks.forEach(link => {
        if (!link.classList.contains('logout-link')) {
            link.addEventListener('click', function(e) {
                // Optional: Show loading state for external links
                if (this.href && !this.href.includes('#')) {
                    NavigationUtils.showLoadingState(this);
                }
            });
        }
    });
    
    console.log('Admin Navigation System initialized successfully');
});