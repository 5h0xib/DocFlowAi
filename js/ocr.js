// DocFlow AI - OCR Module
// Extracts text from images using Tesseract.js

const OCR = {
    worker: null,

    // Initialize Tesseract worker
    async initialize() {
        if (this.worker) return this.worker;

        try {
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            console.log('✅ OCR worker initialized');
            return this.worker;
        } catch (error) {
            console.error('Failed to initialize OCR worker:', error);
            throw new Error('OCR initialization failed');
        }
    },

    // Extract text from an image file
    async extractText(file, onProgress = null) {
        try {
            // Initialize worker if not already done
            await this.initialize();

            // Convert file to image URL
            const imageUrl = URL.createObjectURL(file);

            // Perform OCR (without per-call logger to avoid DataCloneError in Worker)
            const result = await this.worker.recognize(imageUrl);

            // Clean up
            URL.revokeObjectURL(imageUrl);

            // Return extracted text
            const text = result.data.text;
            console.log(`✅ Extracted ${text.length} characters from ${file.name}`);

            // Call progress callback with 100% on completion
            if (onProgress) {
                onProgress(1.0);
            }

            return text;

        } catch (error) {
            console.error('OCR extraction error:', error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    },

    // Extract text from multiple images
    async extractMultiple(files, onFileProgress = null) {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const text = await this.extractText(file, (progress) => {
                    if (onFileProgress) {
                        onFileProgress(i, files.length, progress);
                    }
                });

                results.push({
                    file: file.name,
                    success: true,
                    text
                });
            } catch (error) {
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    },

    // Terminate worker to free resources
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            console.log('OCR worker terminated');
        }
    },

    // Get confidence score from OCR result
    getConfidence(result) {
        if (result.data && result.data.confidence) {
            return Math.round(result.data.confidence);
        }
        return 0;
    },

    // Preprocess image for better OCR (if needed)
    async preprocessImage(imageFile) {
        // This would include operations like:
        // - Grayscale conversion
        // - Noise reduction
        // - Contrast enhancement
        // - Deskewing
        // For now, we return the original file
        return imageFile;
    }
};

// Clean up on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        OCR.terminate();
    });
}
