// DocFlow AI - NLP Module
// Analyzes documents using compromise.js and custom logic

const NLP = {
    // Analyze a document and extract fields
    async analyzeDocument(text, documentType) {
        // Check if compromise library is loaded
        if (typeof nlp === 'undefined') {
            throw new Error('NLP library (compromise.js) is not loaded. Please ensure the script is included in your HTML.');
        }

        const doc = nlp(text);

        const analysis = {
            fields: {},
            summary: '',
            riskScore: 0,
            keywords: []
        };

        if (documentType === 'invoice') {
            analysis.fields = this.extractInvoiceFields(text, doc);
        } else if (documentType === 'contract') {
            analysis.fields = this.extractContractFields(text, doc);
        }

        analysis.summary = this.generateSummary(text, doc, documentType);
        analysis.riskScore = this.calculateRiskScore(text, analysis.fields);
        analysis.keywords = this.extractKeywords(text, doc);

        return analysis;
    },

    // Extract invoice-specific fields
    extractInvoiceFields(text, doc) {
        const fields = {};

        // Invoice number - look for patterns like "Invoice #123" or "INV-456"
        const invoicePattern = /(?:invoice|inv)[\s#:-]*([A-Z0-9-]+)/i;
        const invoiceMatch = text.match(invoicePattern);
        if (invoiceMatch) {
            fields['Invoice Number'] = invoiceMatch[1];
        }

        // Date extraction - use regex since compromise dates() may not be available
        const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
        const dateMatches = text.match(datePattern);
        if (dateMatches && dateMatches.length > 0) {
            fields['Date'] = dateMatches[0];
        }

        // Amount - look for currency patterns
        const amountPattern = /(?:\$|USD|EUR|GBP)\s*([0-9,]+\.?[0-9]*)/g;
        const amounts = [];
        let match;
        while ((match = amountPattern.exec(text)) !== null) {
            amounts.push(match[1]);
        }
        if (amounts.length > 0) {
            // Take the largest amount as the total
            fields['Amount'] = '$' + amounts.sort((a, b) =>
                parseFloat(b.replace(/,/g, '')) - parseFloat(a.replace(/,/g, ''))
            )[0];
        }

        // Email extraction
        const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
        const emails = text.match(emailPattern);
        if (emails && emails.length > 0) {
            fields['Email'] = emails[0];
        }

        // Phone number
        const phonePattern = /(\+?[0-9]{1,3}[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g;
        const phones = text.match(phonePattern);
        if (phones && phones.length > 0) {
            fields['Phone'] = phones[0];
        }

        // Company name - use NLP to extract organizations
        const orgs = doc.match('#Organization').out('array');
        if (orgs.length > 0) {
            fields['Vendor'] = orgs[0];
        }

        return fields;
    },

    // Extract contract-specific fields
    extractContractFields(text, doc) {
        const fields = {};

        // Contract number
        const contractPattern = /(?:contract|agreement)[\s#:-]*([A-Z0-9-]+)/i;
        const contractMatch = text.match(contractPattern);
        if (contractMatch) {
            fields['Contract Number'] = contractMatch[1];
        }

        // Parties involved - extract people and organizations
        const people = doc.match('#Person').out('array');
        const orgs = doc.match('#Organization').out('array');

        if (people.length > 0) {
            fields['Party 1'] = people[0];
            if (people.length > 1) {
                fields['Party 2'] = people[1];
            }
        }

        if (orgs.length > 0) {
            fields['Company'] = orgs[0];
        }

        // Dates - use regex extraction
        const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
        const dateMatches = text.match(datePattern);
        if (dateMatches && dateMatches.length > 0) {
            fields['Effective Date'] = dateMatches[0];
            if (dateMatches.length > 1) {
                fields['Expiration Date'] = dateMatches[1];
            }
        }

        // Terms - look for duration patterns
        const termPattern = /(\d+)\s*(year|month|day)s?/i;
        const termMatch = text.match(termPattern);
        if (termMatch) {
            fields['Term'] = `${termMatch[1]} ${termMatch[2]}${parseInt(termMatch[1]) > 1 ? 's' : ''}`;
        }

        // Contract value
        const amountPattern = /(?:\$|USD|EUR|GBP)\s*([0-9,]+\.?[0-9]*)/g;
        const amounts = [];
        let match;
        while ((match = amountPattern.exec(text)) !== null) {
            amounts.push(match[1]);
        }
        if (amounts.length > 0) {
            fields['Value'] = '$' + amounts[0];
        }

        return fields;
    },

    // Generate a summary of the document
    generateSummary(text, doc, documentType) {
        const sentences = doc.sentences().out('array');
        const wordCount = text.split(/\s+/).length;
        const fields = documentType === 'invoice' ?
            this.extractInvoiceFields(text, doc) :
            this.extractContractFields(text, doc);

        let summary = '';

        // Document type-specific intelligent analysis
        if (documentType === 'invoice') {
            summary = this._generateInvoiceSummary(text, fields, sentences, wordCount);
        } else if (documentType === 'contract') {
            summary = this._generateContractSummary(text, fields, sentences, wordCount);
        } else {
            // General document summary
            if (sentences.length > 0) {
                summary = sentences.slice(0, 2).join(' ') + '\n\n';
            }
            summary += `**Document Analysis:** ${wordCount} words analyzed. `;
            summary += `Key fields extracted: ${Object.keys(fields).length}. `;
            summary += 'Manual review recommended for complete verification.';
        }

        return summary;
    },

    // Generate intelligent invoice summary
    _generateInvoiceSummary(text, fields, sentences, wordCount) {
        let summary = '#### 📄 Invoice Analysis\n\n';

        // Key Information
        const invoiceNum = fields['Invoice Number'] || 'Not found';
        const amount = fields['Amount'] || 'Not specified';
        const date = fields['Date'] || 'Not specified';
        const vendor = fields['Vendor'] || 'Unknown';

        summary += `**Invoice ${invoiceNum}** from ${vendor}\n\n`;
        summary += `**Amount:** ${amount} | **Date:** ${date}\n\n`;

        // Content Insight
        if (sentences.length > 0) {
            summary += `**Content Overview:** ${sentences[0]}\n\n`;
        }

        // Intelligent Analysis
        summary += '**AI Assessment:**\n';
        const amountValue = parseFloat(amount.replace(/[$,]/g, '')) || 0;

        if (amountValue > 10000) {
            summary += '• ⚠️ High-value transaction detected - Verify authorization\n';
        } else if (amountValue > 5000) {
            summary += '• Moderate amount - Standard approval process\n';
        } else {
            summary += '• Low-value transaction - Eligible for expedited processing\n';
        }

        if (!fields['Invoice Number']) {
            summary += '• ⚠️ Missing invoice number - Request from vendor\n';
        }
        if (!fields['Date']) {
            summary += '• ⚠️ Missing date - Verify invoice validity\n';
        }

        if (fields['Email']) {
            summary += `• Contact available at ${fields['Email']}\n`;
        }

        // Actionable Suggestions
        summary += '\n**Recommended Actions:**\n';
        if (amountValue < 5000 && fields['Invoice Number'] && fields['Date']) {
            summary += ' 1. Auto-approve payment processing\n';
            summary += ' 2. Schedule payment according to terms\n';
        } else {
            summary += ' 1. Verify invoice against purchase order\n';
            summary += ' 2. Confirm vendor details and amounts\n';
            if (amountValue > 10000) {
                summary += ' 3. Obtain management approval\n';
            }
        }

        return summary;
    },

    // Generate intelligent contract summary
    _generateContractSummary(text, fields, sentences, wordCount) {
        let summary = '#### 📋 Contract Analysis\n\n';

        // Key Information
        const contractNum = fields['Contract Number'] || 'Not specified';
        const company = fields['Company'] || 'Unknown party';
        const value = fields['Value'] || 'Not specified';
        const effectiveDate = fields['Effective Date'] || 'Not specified';
        const term = fields['Term'] || 'Not specified';

        summary += `**Contract ${contractNum}** with ${company}\n\n`;
        summary += `**Value:** ${value} | **Term:** ${term}\n\n`;
        summary += `**Effective Date:** ${effectiveDate}\n\n`;

        // Content Insight
        if (sentences.length > 0) {
            summary += `**Overview:** ${sentences[0]}\n\n`;
        }

        // Intelligent Analysis
        summary += '**AI Assessment:**\n';

        const valueAmount = parseFloat(value.replace(/[$,]/g, '')) || 0;
        if (valueAmount > 100000) {
            summary += '• ⚠️ High-value contract - Legal review required\n';
        }

        // Check for risk keywords
        const textLower = text.toLowerCase();
        const riskTerms = [];
        if (textLower.includes('termination')) riskTerms.push('termination clauses');
        if (textLower.includes('penalty')) riskTerms.push('penalty provisions');
        if (textLower.includes('liability')) riskTerms.push('liability terms');
        if (textLower.includes('dispute')) riskTerms.push('dispute resolution');

        if (riskTerms.length > 0) {
            summary += `• ⚠️ Contains: ${riskTerms.join(', ')} - Review carefully\n`;
        }

        if (term.includes('year')) {
            summary += `• Long-term commitment (${term}) - Consider renewal implications\n`;
        }

        if (!fields['Effective Date']) {
            summary += '• ⚠️ Missing effective date - Clarify start date\n';
        }

        // Actionable Suggestions
        summary += '\n**Recommended Actions:**\n';
        summary += ' 1. Verify all parties have signed the agreement\n';
        summary += ' 2. Review key terms and conditions carefully\n';
        if (riskTerms.length > 0) {
            summary += ' 3. Pay special attention to ' + riskTerms[0] + '\n';
        }
        if (valueAmount > 50000 || riskTerms.length > 2) {
            summary += ' 4. Escalate to legal team for detailed review\n';
        } else {
            summary += ' 4. File in document management system\n';
        }
        summary += ` 5. Set reminder for ${term !== 'Not specified' ? 'renewal/expiration' : 'follow-up'}\n`;

        return summary;
    },

    // Calculate risk score based on keywords and content
    calculateRiskScore(text, fields) {
        let riskScore = 0;
        const textLower = text.toLowerCase();

        // High-risk keywords
        const highRiskKeywords = [
            'penalty', 'termination', 'breach', 'liability', 'lawsuit',
            'dispute', 'overdue', 'default', 'cancel', 'void'
        ];

        const mediumRiskKeywords = [
            'amendment', 'modification', 'renewal', 'extension',
            'warning', 'notice', 'urgent', 'immediate'
        ];

        // Check for high-risk keywords (2 points each, max 6)
        let highRiskCount = 0;
        highRiskKeywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
                highRiskCount++;
            }
        });
        riskScore += Math.min(highRiskCount * 2, 6);

        // Check for medium-risk keywords (1 point each, max 3)
        let mediumRiskCount = 0;
        mediumRiskKeywords.forEach(keyword => {
            if (textLower.includes(keyword)) {
                mediumRiskCount++;
            }
        });
        riskScore += Math.min(mediumRiskCount, 3);

        // Large amounts increase risk (if amount > $10,000)
        if (fields['Amount'] || fields['Value']) {
            const amountStr = fields['Amount'] || fields['Value'];
            const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
            if (!isNaN(amount)) {
                if (amount > 10000) {
                    riskScore += 2;
                } else if (amount > 5000) {
                    riskScore += 1;
                }
            }
        }

        // Missing critical fields increases risk slightly (only if we have very few fields)
        const fieldsCount = Object.keys(fields).length;
        if (fieldsCount === 0) {
            riskScore += 3; // No fields extracted at all
        } else if (fieldsCount === 1) {
            riskScore += 2; // Very few fields
        } else if (fieldsCount === 2) {
            riskScore += 1; // Some fields missing
        }
        // If 3+ fields, no penalty

        // Cap at 10
        return Math.min(10, riskScore);
    },

    // Extract important keywords
    extractKeywords(text, doc) {
        const keywords = [];

        // Extract nouns and important terms
        const nouns = doc.match('#Noun').out('array');
        const properNouns = doc.match('#ProperNoun').out('array');

        // Combine and deduplicate
        const allKeywords = [...new Set([...nouns, ...properNouns])];

        // Take top 10 most common
        return allKeywords.slice(0, 10);
    },

    // Sentiment analysis (basic)
    analyzeSentiment(text) {
        if (typeof nlp === 'undefined') {
            return 'neutral';
        }

        const doc = nlp(text);

        // Count positive and negative words
        const positive = doc.match('#Positive').length;
        const negative = doc.match('#Negative').length;

        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }
};
