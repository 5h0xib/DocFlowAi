// DocFlow AI - Authentication Module
// Handles user login, logout, and session management

const Auth = {
    // Check if user is logged in
    isAuthenticated() {
        const currentUser = Storage.getCurrentUser();
        return currentUser !== null;
    },

    // Get current user
    getCurrentUser() {
        return Storage.getCurrentUser();
    },

    // Login user
    login(username, password) {
        const user = Storage.getUserByUsername(username);

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // Simple password check (in production, use proper hashing)
        if (user.password !== password) {
            return {
                success: false,
                message: 'Invalid password'
            };
        }

        // Create session
        const session = {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            fullName: user.fullName,
            loginTime: new Date().toISOString()
        };

        Storage.setCurrentUser(session);

        // Log the login
        if (typeof Audit !== 'undefined') {
            Audit.log({
                userId: user.id,
                action: 'login',
                details: `User ${username} logged in as ${user.role}`
            });
        }

        return {
            success: true,
            user: session
        };
    },

    // Logout user
    logout() {
        const currentUser = this.getCurrentUser();

        if (currentUser && typeof Audit !== 'undefined') {
            // Log the logout
            Audit.log({
                userId: currentUser.id,
                action: 'logout',
                details: `User ${currentUser.username} logged out`
            });
        }

        Storage.remove(Storage.KEYS.CURRENT_USER);

        // Redirect to login
        window.location.href = 'index.html';
    },

    // Check if user has specific role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // Check if user has any of the specified roles
    hasAnyRole(roles) {
        const user = this.getCurrentUser();
        return user && roles.includes(user.role);
    },

    // Require authentication (redirect to login if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Require specific role
    requireRole(role) {
        if (!this.requireAuth()) return false;

        if (!this.hasRole(role)) {
            UI.showToast('Access denied. Insufficient permissions.', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    },

    // Require any of the specified roles
    requireAnyRole(roles) {
        if (!this.requireAuth()) return false;

        if (!this.hasAnyRole(roles)) {
            UI.showToast('Access denied. Insufficient permissions.', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    },

    // Get user permissions based on role
    getPermissions() {
        const user = this.getCurrentUser();
        if (!user) return [];

        const permissions = {
            admin: [
                'upload_document',
                'view_all_documents',
                'review_document',
                'approve_document',
                'reject_document',
                'delete_document',
                'view_audit_logs',
                'manage_users',
                'view_reports'
            ],
            reviewer: [
                'upload_document',
                'view_all_documents',
                'review_document',
                'approve_document',
                'reject_document',
                'view_audit_logs',
                'view_reports'
            ],
            user: [
                'upload_document',
                'view_own_documents'
            ]
        };

        return permissions[user.role] || [];
    },

    // Check if user has specific permission
    hasPermission(permission) {
        const permissions = this.getPermissions();
        return permissions.includes(permission);
    },

    // Initialize auth state on page load
    init() {
        // Check if we're on login page
        const isLoginPage = window.location.pathname.endsWith('index.html') ||
            window.location.pathname === '/' ||
            window.location.pathname.endsWith('/');

        if (!isLoginPage) {
            // Require authentication for all other pages
            this.requireAuth();
        } else if (this.isAuthenticated()) {
            // If already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    }
};

// Initialize auth on page load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        Auth.init();
    });
}
