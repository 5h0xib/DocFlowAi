// DocFlow AI - UI Utilities
// Reusable UI components and helpers

const UI = {
    // Toast notification system
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span style="font-size: 1.25rem;">${this.getToastIcon(type)}</span>
      <span style="flex: 1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; padding: 0;">&times;</button>
    `;

        container.appendChild(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    // Modal system
    showModal(title, content, buttons = []) {
        // Remove existing modals
        const existingModals = document.querySelectorAll('.modal-overlay');
        existingModals.forEach(m => m.remove());

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
      <h3 style="margin: 0;">${title}</h3>
      <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.5rem; padding: 0;">&times;</button>
    `;

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }

        // Footer with buttons
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn ${btn.className || 'btn-secondary'}`;
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.onClick) btn.onClick();
                if (btn.closeOnClick !== false) overlay.remove();
            };
            footer.appendChild(button);
        });

        modal.appendChild(header);
        modal.appendChild(body);
        if (buttons.length > 0) modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return overlay;
    },

    // Confirm dialog
    confirm(message, onConfirm, onCancel) {
        const buttons = [
            {
                text: 'Cancel',
                className: 'btn-secondary',
                onClick: onCancel
            },
            {
                text: 'Confirm',
                className: 'btn-primary',
                onClick: onConfirm
            }
        ];

        return this.showModal('Confirm', `<p>${message}</p>`, buttons);
    },

    // Loading spinner
    showLoading(message = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'modal-overlay';
        loading.innerHTML = `
      <div style="text-align: center; color: var(--text-primary);">
        <div class="progress-bar" style="width: 200px; margin-bottom: 1rem;">
          <div class="progress-indeterminate"></div>
        </div>
        <p>${message}</p>
      </div>
    `;
        document.body.appendChild(loading);
        return loading;
    },

    hideLoading(loadingElement) {
        if (loadingElement) loadingElement.remove();
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }

        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }

        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }

        // Format as date
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    // Render status badge
    renderStatusBadge(status) {
        const statusConfig = {
            'pending': { label: 'Pending', class: 'status-pending' },
            'processing': { label: 'Processing', class: 'status-processing' },
            'needs-review': { label: 'Needs Review', class: 'status-pending' },
            'approved': { label: 'Approved', class: 'status-approved' },
            'rejected': { label: 'Rejected', class: 'status-rejected' }
        };

        const config = statusConfig[status] || { label: status, class: 'status-pending' };

        return `
      <span class="status-badge ${config.class}">
        <span class="status-dot"></span>
        ${config.label}
      </span>
    `;
    },

    // Render role badge
    renderRoleBadge(role) {
        const roleClass = `role-${role}`;
        return `<span class="role-tag ${roleClass}">${role}</span>`;
    },

    // Create document card
    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'document-item';
        card.innerHTML = `
      <div class="document-icon">${this.getDocumentIcon(doc.type)}</div>
      <div class="document-info">
        <div class="document-name">${doc.name}</div>
        <div class="document-meta">
          ${this.formatDate(doc.createdAt)} • ${doc.type}
        </div>
      </div>
      <div>
        ${this.renderStatusBadge(doc.status)}
      </div>
    `;
        return card;
    },

    getDocumentIcon(type) {
        const icons = {
            'invoice': '🧾',
            'contract': '📝',
            'pdf': '📄',
            'image': '🖼️'
        };
        return icons[type] || '📄';
    },

    // Update navbar with user info
    updateNavbar(user) {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const userBadge = navbar.querySelector('.user-badge');
        if (userBadge) {
            userBadge.innerHTML = `
        <span>${user.fullName}</span>
        ${this.renderRoleBadge(user.role)}
      `;
        }
    },

    // Render data table
    renderTable(containerId, columns, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

        if (data.length === 0) {
            html += `
        <tr>
          <td colspan="${columns.length}" style="text-align: center; padding: 2rem;">
            <p class="text-muted">No data available</p>
          </td>
        </tr>
      `;
        } else {
            data.forEach(row => {
                html += '<tr>';
                columns.forEach(col => {
                    let value = row[col.field];
                    if (col.render) {
                        value = col.render(value, row);
                    }
                    html += `<td>${value}</td>`;
                });
                html += '</tr>';
            });
        }

        html += `
          </tbody>
        </table>
      </div>
    `;

        container.innerHTML = html;
    },

    // Debounce helper
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success', 2000);
        }).catch(() => {
            this.showToast('Failed to copy', 'error');
        });
    },

    // Download file
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
};

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOutRight {
    to { transform: translateX(120%); opacity: 0; }
  }
`;
document.head.appendChild(style);
