// DocFlow AI - Audit Logging System
// Tracks all system actions for traceability

const Audit = {
    // Log an action
    log(entry) {
        const currentUser = Auth.getCurrentUser();

        const logEntry = {
            userId: entry.userId || (currentUser ? currentUser.id : null),
            userName: entry.userName || (currentUser ? currentUser.username : 'System'),
            action: entry.action,
            documentId: entry.documentId || null,
            documentName: entry.documentName || null,
            details: entry.details || '',
            comments: entry.comments || '',
            metadata: entry.metadata || {}
        };

        return Storage.addAuditLog(logEntry);
    },

    // Get all logs
    getLogs() {
        return Storage.getAuditLogs();
    },

    // Get logs for a specific document
    getDocumentLogs(docId) {
        return Storage.getDocumentLogs(docId);
    },

    // Get logs for a specific user
    getUserLogs(userId) {
        return Storage.getUserLogs(userId);
    },

    // Get logs by action type
    getLogsByAction(action) {
        const logs = this.getLogs();
        return logs.filter(log => log.action === action);
    },

    // Get logs within date range
    getLogsByDateRange(startDate, endDate) {
        const logs = this.getLogs();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= start && logTime <= end;
        });
    },

    // Export logs as CSV
    exportToCSV() {
        const logs = this.getLogs();

        // CSV header
        let csv = 'Timestamp,User,Action,Document,Details,Comments\n';

        // CSV rows
        logs.forEach(log => {
            const row = [
                log.timestamp,
                log.userName,
                log.action,
                log.documentName || 'N/A',
                log.details,
                log.comments || ''
            ];

            // Escape quotes and wrap in quotes
            const escapedRow = row.map(field =>
                `"${String(field).replace(/"/g, '""')}"`
            );

            csv += escapedRow.join(',') + '\n';
        });

        return csv;
    },

    // Get audit statistics
    getStatistics() {
        const logs = this.getLogs();

        const stats = {
            totalLogs: logs.length,
            byAction: {},
            byUser: {},
            recentActivity: []
        };

        // Count by action
        logs.forEach(log => {
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
            stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
        });

        // Get recent activity (last 10)
        stats.recentActivity = logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        return stats;
    },

    // Common audit actions
    Actions: {
        // User actions
        LOGIN: 'login',
        LOGOUT: 'logout',

        // Document actions
        UPLOAD: 'upload_document',
        VIEW: 'view_document',
        DELETE: 'delete_document',

        // Processing actions
        OCR_START: 'ocr_start',
        OCR_COMPLETE: 'ocr_complete',
        OCR_FAILED: 'ocr_failed',
        NLP_PROCESS: 'nlp_process',
        AI_ANALYSIS: 'ai_analysis',

        // Workflow actions
        AUTO_APPROVE: 'auto_approve',
        FLAG_REVIEW: 'flag_for_review',
        APPROVE: 'approve',
        REJECT: 'reject',

        // System actions
        SYSTEM_ERROR: 'system_error'
    }
};

// Make Audit available globally
if (typeof window !== 'undefined') {
    window.Audit = Audit;
}
