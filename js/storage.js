// DocFlow AI - LocalStorage Manager
// Handles all data persistence and CRUD operations

const Storage = {
  // Keys for localStorage
  KEYS: {
    USERS: 'docflow_users',
    DOCUMENTS: 'docflow_documents',
    AUDIT_LOGS: 'docflow_audit_logs',
    CURRENT_USER: 'docflow_current_user',
    SETTINGS: 'docflow_settings'
  },

  // Initialize storage with demo data
  initialize() {
    if (!this.get(this.KEYS.USERS)) {
      // Create demo users
      const defaultUsers = [
        {
          id: 'user_1',
          username: 'admin',
          password: 'admin123', // In production, use proper hashing
          role: 'admin',
          email: 'admin@docflow.ai',
          fullName: 'Admin User',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user_2',
          username: 'reviewer',
          password: 'reviewer123',
          role: 'reviewer',
          email: 'reviewer@docflow.ai',
          fullName: 'Reviewer User',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user_3',
          username: 'user',
          password: 'user123',
          role: 'user',
          email: 'user@docflow.ai',
          fullName: 'Regular User',
          createdAt: new Date().toISOString()
        }
      ];
      this.set(this.KEYS.USERS, defaultUsers);
    }

    if (!this.get(this.KEYS.DOCUMENTS)) {
      this.set(this.KEYS.DOCUMENTS, []);
    }

    if (!this.get(this.KEYS.AUDIT_LOGS)) {
      this.set(this.KEYS.AUDIT_LOGS, []);
    }

    console.log('✅ Storage initialized');
  },

  // Generic get/set methods
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      // Check if quota exceeded
      if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please clear some documents.');
      }
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },

  // User operations
  getUsers() {
    return this.get(this.KEYS.USERS) || [];
  },

  getUserById(userId) {
    const users = this.getUsers();
    return users.find(u => u.id === userId);
  },

  getUserByUsername(username) {
    const users = this.getUsers();
    return users.find(u => u.username === username);
  },

  getCurrentUser() {
    return this.get(this.KEYS.CURRENT_USER);
  },

  setCurrentUser(user) {
    this.set(this.KEYS.CURRENT_USER, user);
  },

  // Document operations
  getDocuments() {
    return this.get(this.KEYS.DOCUMENTS) || [];
  },

  getDocumentById(docId) {
    const documents = this.getDocuments();
    return documents.find(d => d.id === docId);
  },

  addDocument(document) {
    const documents = this.getDocuments();
    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    documents.push(newDoc);
    this.set(this.KEYS.DOCUMENTS, documents);
    return newDoc;
  },

  updateDocument(docId, updates) {
    const documents = this.getDocuments();
    const index = documents.findIndex(d => d.id === docId);
    
    if (index !== -1) {
      documents[index] = {
        ...documents[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.set(this.KEYS.DOCUMENTS, documents);
      return documents[index];
    }
    return null;
  },

  deleteDocument(docId) {
    const documents = this.getDocuments();
    const filtered = documents.filter(d => d.id !== docId);
    this.set(this.KEYS.DOCUMENTS, filtered);
    return true;
  },

  // Get documents by status
  getDocumentsByStatus(status) {
    const documents = this.getDocuments();
    return documents.filter(d => d.status === status);
  },

  // Get documents by user
  getDocumentsByUser(userId) {
    const documents = this.getDocuments();
    return documents.filter(d => d.uploadedBy === userId);
  },

  // Audit log operations
  getAuditLogs() {
    return this.get(this.KEYS.AUDIT_LOGS) || [];
  },

  addAuditLog(log) {
    const logs = this.getAuditLogs();
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...log
    };
    logs.push(newLog);
    
    // Keep only last 1000 logs to prevent storage overflow
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    this.set(this.KEYS.AUDIT_LOGS, logs);
    return newLog;
  },

  // Get audit logs for a specific document
  getDocumentLogs(docId) {
    const logs = this.getAuditLogs();
    return logs.filter(log => log.documentId === docId);
  },

  // Get audit logs for a specific user
  getUserLogs(userId) {
    const logs = this.getAuditLogs();
    return logs.filter(log => log.userId === userId);
  },

  // Statistics
  getStats() {
    const documents = this.getDocuments();
    const logs = this.getAuditLogs();
    
    return {
      totalDocuments: documents.length,
      pending: documents.filter(d => d.status === 'pending').length,
      processing: documents.filter(d => d.status === 'processing').length,
      needsReview: documents.filter(d => d.status === 'needs-review').length,
      approved: documents.filter(d => d.status === 'approved').length,
      rejected: documents.filter(d => d.status === 'rejected').length,
      autoApproved: documents.filter(d => d.status === 'approved' && d.autoApproved).length,
      totalLogs: logs.length
    };
  },

  // Export data as JSON
  exportData() {
    return {
      users: this.get(this.KEYS.USERS),
      documents: this.get(this.KEYS.DOCUMENTS),
      auditLogs: this.get(this.KEYS.AUDIT_LOGS),
      exportedAt: new Date().toISOString()
    };
  },

  // Import data from JSON
  importData(data) {
    try {
      if (data.users) this.set(this.KEYS.USERS, data.users);
      if (data.documents) this.set(this.KEYS.DOCUMENTS, data.documents);
      if (data.auditLogs) this.set(this.KEYS.AUDIT_LOGS, data.auditLogs);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  },

  // Get storage usage information
  getStorageInfo() {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Convert to KB
    const sizeKB = (totalSize / 1024).toFixed(2);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      totalSize,
      sizeKB,
      sizeMB,
      percentage: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2) // Assuming 5MB limit
    };
  }
};

// Initialize storage on load
if (typeof window !== 'undefined') {
  Storage.initialize();
}
