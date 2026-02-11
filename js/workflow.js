// DocFlow AI - Workflow Engine
// Implements rule-based approval logic and workflow automation

const Workflow = {
    // Process a document and make approval decision
    processDocument(documentId) {
        const document = Storage.getDocumentById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        // Apply workflow rules
        const decision = this.evaluateRules(document);

        // Update document status
        Storage.updateDocument(documentId, {
            status: decision.status,
            autoApproved: decision.autoApproved,
            workflowReason: decision.reason
        });

        // Log the decision
        Audit.log({
            action: decision.autoApproved ? Audit.Actions.AUTO_APPROVE : Audit.Actions.FLAG_REVIEW,
            documentId: document.id,
            documentName: document.name,
            details: decision.reason
        });

        return decision;
    },

    // Evaluate workflow rules
    evaluateRules(document) {
        const rules = this.getRules();
        let decision = {
            status: 'needs-review',
            autoApproved: false,
            reason: 'Document requires manual review',
            appliedRules: []
        };

        // Check each rule
        for (const rule of rules) {
            const result = rule.evaluate(document);

            if (result.matched) {
                decision = {
                    status: result.status,
                    autoApproved: result.autoApproved,
                    reason: result.reason,
                    appliedRules: [...decision.appliedRules, rule.name]
                };

                // If any rule requires review, override auto-approval
                if (result.status === 'needs-review') {
                    decision.autoApproved = false;
                    break;
                }
            }
        }

        return decision;
    },

    // Define workflow rules (in order of precedence)
    getRules() {
        return [
            // Rule 1: High risk always needs review
            {
                name: 'High Risk Review',
                evaluate: (doc) => {
                    if (doc.riskScore >= 7) {
                        return {
                            matched: true,
                            status: 'needs-review',
                            autoApproved: false,
                            reason: `High risk score (${doc.riskScore}/10) requires manual review`
                        };
                    }
                    return { matched: false };
                }
            },

            // Rule 2: Large amounts need review
            {
                name: 'Large Amount Review',
                evaluate: (doc) => {
                    const amount = this._extractAmount(doc);
                    if (amount >= 10000) {
                        return {
                            matched: true,
                            status: 'needs-review',
                            autoApproved: false,
                            reason: `Amount of $${amount.toLocaleString()} requires manual review (threshold: $10,000)`
                        };
                    }
                    return { matched: false };
                }
            },

            // Rule 3: Missing critical fields need review
            {
                name: 'Missing Fields Review',
                evaluate: (doc) => {
                    const criticalFields = doc.type === 'invoice'
                        ? ['Invoice Number', 'Amount', 'Date']
                        : ['Contract Number', 'Parties', 'Effective Date'];

                    const missingFields = criticalFields.filter(field =>
                        !doc.extractedFields || !doc.extractedFields[field]
                    );

                    if (missingFields.length > 0) {
                        return {
                            matched: true,
                            status: 'needs-review',
                            autoApproved: false,
                            reason: `Missing critical fields: ${missingFields.join(', ')}`
                        };
                    }
                    return { matched: false };
                }
            },

            // Rule 4: Moderate risk with moderate amount needs review
            {
                name: 'Moderate Risk Review',
                evaluate: (doc) => {
                    const amount = this._extractAmount(doc);
                    if (doc.riskScore >= 4 && doc.riskScore < 7 && amount >= 5000) {
                        return {
                            matched: true,
                            status: 'needs-review',
                            autoApproved: false,
                            reason: `Moderate risk (${doc.riskScore}/10) with amount $${amount.toLocaleString()} requires review`
                        };
                    }
                    return { matched: false };
                }
            },

            // Rule 5: Auto-approve simple, low-risk documents
            {
                name: 'Auto Approve Simple Documents',
                evaluate: (doc) => {
                    const amount = this._extractAmount(doc);
                    const fieldsCount = doc.extractedFields ? Object.keys(doc.extractedFields).length : 0;

                    // More lenient auto-approval:
                    // - Risk score < 3 (very low risk)
                    // - Amount < $5,000
                    // - Has at least 2 extracted fields (or any fields for low amounts)
                    const hasEnoughFields = fieldsCount >= 2 || (amount < 1000 && fieldsCount >= 1);

                    if (doc.riskScore <= 3 && amount < 5000 && hasEnoughFields) {
                        return {
                            matched: true,
                            status: 'approved',
                            autoApproved: true,
                            reason: `Auto-approved: Low risk (${doc.riskScore}/10), amount $${amount.toLocaleString()} under threshold, ${fieldsCount} fields extracted`
                        };
                    }
                    return { matched: false };
                }
            }
        ];
    },

    // Helper to extract amount from document
    _extractAmount(document) {
        if (!document.extractedFields) return 0;

        const amountField = document.extractedFields['Amount'] ||
            document.extractedFields['Value'] ||
            document.extractedFields['Total'];

        if (!amountField) return 0;

        // Extract numeric value
        const numericValue = amountField.toString().replace(/[$,]/g, '');
        return parseFloat(numericValue) || 0;
    },

    // Manual approval by reviewer
    approveDocument(documentId, reviewerId, comments = '') {
        const document = Storage.getDocumentById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        // Update document
        Storage.updateDocument(documentId, {
            status: 'approved',
            reviewedBy: reviewerId,
            reviewedAt: new Date().toISOString(),
            reviewComments: comments
        });

        // Log approval
        const reviewer = Storage.getUserById(reviewerId);
        Audit.log({
            action: Audit.Actions.APPROVE,
            userId: reviewerId,
            userName: reviewer ? reviewer.username : 'Unknown',
            documentId: document.id,
            documentName: document.name,
            details: `Document approved`,
            comments: comments
        });

        return {
            success: true,
            message: 'Document approved successfully'
        };
    },

    // Manual rejection by reviewer
    rejectDocument(documentId, reviewerId, reason = '') {
        const document = Storage.getDocumentById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        // Rejection requires a reason
        if (!reason || reason.trim() === '') {
            throw new Error('Rejection reason is required');
        }

        // Update document
        Storage.updateDocument(documentId, {
            status: 'rejected',
            reviewedBy: reviewerId,
            reviewedAt: new Date().toISOString(),
            rejectionReason: reason
        });

        // Log rejection
        const reviewer = Storage.getUserById(reviewerId);
        Audit.log({
            action: Audit.Actions.REJECT,
            userId: reviewerId,
            userName: reviewer ? reviewer.username : 'Unknown',
            documentId: document.id,
            documentName: document.name,
            details: `Document rejected`,
            comments: reason
        });

        return {
            success: true,
            message: 'Document rejected'
        };
    },

    // Get documents pending review
    getPendingReviews() {
        return Storage.getDocumentsByStatus('needs-review');
    },

    // Get workflow statistics
    getStatistics() {
        const documents = Storage.getDocuments();

        return {
            total: documents.length,
            autoApproved: documents.filter(d => d.autoApproved).length,
            manuallyReviewed: documents.filter(d => d.reviewedBy).length,
            pending: documents.filter(d => d.status === 'needs-review').length,
            approved: documents.filter(d => d.status === 'approved').length,
            rejected: documents.filter(d => d.status === 'rejected').length,
            averageRiskScore: documents.length > 0
                ? (documents.reduce((sum, d) => sum + (d.riskScore || 0), 0) / documents.length).toFixed(2)
                : 0
        };
    }
};
