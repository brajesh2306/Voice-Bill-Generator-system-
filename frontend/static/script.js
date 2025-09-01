// Voice Bill Generator - Main JavaScript
class VoiceBillGenerator {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.currentBillData = null;
        this.currentBillPath = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadTemplates();
    }
    
    initializeElements() {
        // Template selection
        this.templateSelect = document.getElementById('templateSelect');
        this.uploadTemplateBtn = document.getElementById('uploadTemplateBtn');
        
        // Recording controls
        this.startRecordingBtn = document.getElementById('startRecording');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.recordingTime = document.getElementById('recordingTime');
        
        // Bill preview and generation
        this.billPreview = document.getElementById('billPreview');
        this.previewContent = document.getElementById('previewContent');
        this.generateBillBtn = document.getElementById('generateBillBtn');
        
        // Download section
        this.downloadSection = document.getElementById('downloadSection');
        this.downloadBillBtn = document.getElementById('downloadBillBtn');
        
        // Modals
        this.templateModal = document.getElementById('templateModal');
        this.templateForm = document.getElementById('templateForm');
        this.templateName = document.getElementById('templateName');
        this.templateFile = document.getElementById('templateFile');
        this.closeModal = document.getElementById('closeModal');
        this.cancelUpload = document.getElementById('cancelUpload');
        
        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }
    
    bindEvents() {
        // Recording events
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        
        // Template events
        this.uploadTemplateBtn.addEventListener('click', () => this.showTemplateModal());
        this.closeModal.addEventListener('click', () => this.hideTemplateModal());
        this.cancelUpload.addEventListener('click', () => this.hideTemplateModal());
        this.templateForm.addEventListener('submit', (e) => this.handleTemplateUpload(e));
        
        // Bill generation events
        this.generateBillBtn.addEventListener('click', () => this.generateBill());
        this.downloadBillBtn.addEventListener('click', () => this.downloadBill());
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.templateModal) {
                this.hideTemplateModal();
            }
        });
    }
    
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            if (response.ok) {
                const data = await response.json();
                this.populateTemplateSelect(data.templates || []);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showNotification('Error loading templates', 'error');
        }
    }
    
    populateTemplateSelect(templates) {
        this.templateSelect.innerHTML = '<option value="">Select a template...</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.file_type.toUpperCase()})`;
            this.templateSelect.appendChild(option);
        });
    }
    
    async startRecording() {
        try {
            if (!this.templateSelect.value) {
                this.showNotification('Please select a bill template first', 'warning');
                return;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // Update UI
            this.startRecordingBtn.disabled = true;
            this.stopRecordingBtn.disabled = false;
            this.recordingIndicator.classList.remove('hidden');
            this.recordingTime.classList.remove('hidden');
            
            // Start timer
            this.startRecordingTimer();
            
            this.showNotification('Recording started. Speak clearly into your microphone.', 'info');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Error accessing microphone. Please check permissions.', 'error');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // Update UI
            this.startRecordingBtn.disabled = false;
            this.stopRecordingBtn.disabled = true;
            this.recordingIndicator.classList.add('hidden');
            this.recordingTime.classList.add('hidden');
            
            // Stop timer
            this.stopRecordingTimer();
            
            this.showNotification('Recording stopped. Processing your voice input...', 'info');
        }
    }
    
    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            this.recordingTime.textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
    
    async processRecording() {
        try {
            this.showLoadingOverlay();
            
            // Create audio blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            // Create form data
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'recording.wav');
            formData.append('template_id', this.templateSelect.value);
            
            // Send to server
            const response = await fetch('/process-voice', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.currentBillData = result.bill_data;
                this.currentBillPath = result.bill_path;
                
                this.showBillPreview(result.bill_data);
                this.showNotification('Voice processed successfully!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Error processing voice input');
            }
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showNotification(error.message || 'Error processing voice input', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    showBillPreview(billData) {
        this.billPreview.classList.remove('hidden');
        
        let previewHTML = `
            <div class="bill-preview-content">
                <div class="bill-header">
                    <h4>Bill Preview</h4>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="customer-info">
                    <h5>Customer Information</h5>
                    <p><strong>Name:</strong> ${billData.customer_name || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${billData.customer_phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${billData.customer_address || 'N/A'}</p>
                </div>
                
                <div class="products-info">
                    <h5>Products</h5>
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>GST</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (billData.products && billData.products.length > 0) {
            billData.products.forEach(product => {
                previewHTML += `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.quantity}</td>
                        <td>${product.unit}</td>
                        <td>₹${product.unit_price?.toFixed(2) || '0.00'}</td>
                        <td>₹${product.total_price?.toFixed(2) || '0.00'}</td>
                        <td>${product.gst_percent || 0}%</td>
                    </tr>
                `;
            });
        } else {
            previewHTML += '<tr><td colspan="6">No products found</td></tr>';
        }
        
        previewHTML += `
                        </tbody>
                    </table>
                </div>
                
                <div class="bill-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>₹${billData.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total GST:</span>
                        <span>₹${billData.total_gst?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total Amount:</span>
                        <span>₹${billData.total_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </div>
        `;
        
        this.previewContent.innerHTML = previewHTML;
        
        // Scroll to preview
        this.billPreview.scrollIntoView({ behavior: 'smooth' });
    }
    
    async generateBill() {
        try {
            if (!this.currentBillData) {
                this.showNotification('No bill data available. Please record voice input first.', 'warning');
                return;
            }
            
            this.showLoadingOverlay();
            
            // Show download section
            this.downloadSection.classList.remove('hidden');
            this.downloadSection.scrollIntoView({ behavior: 'smooth' });
            
            this.showNotification('Bill generated successfully! You can now download it.', 'success');
            
        } catch (error) {
            console.error('Error generating bill:', error);
            this.showNotification('Error generating bill', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    async downloadBill() {
        try {
            if (!this.currentBillPath) {
                this.showNotification('No bill available for download', 'warning');
                return;
            }
            
            // Extract filename from path
            const filename = this.currentBillPath.split('/').pop();
            
            // Create download link
            const downloadUrl = `/download-bill/${filename}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Download started!', 'success');
            
        } catch (error) {
            console.error('Error downloading bill:', error);
            this.showNotification('Error downloading bill', 'error');
        }
    }
    
    // Template Modal Functions
    showTemplateModal() {
        this.templateModal.classList.remove('hidden');
        this.templateName.focus();
    }
    
    hideTemplateModal() {
        this.templateModal.classList.add('hidden');
        this.templateForm.reset();
    }
    
    async handleTemplateUpload(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData();
            formData.append('template_name', this.templateName.value);
            formData.append('template', this.templateFile.files[0]);
            
            this.showLoadingOverlay();
            
            const response = await fetch('/upload-template', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('Template uploaded successfully!', 'success');
                this.hideTemplateModal();
                this.loadTemplates(); // Reload templates
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Error uploading template');
            }
            
        } catch (error) {
            console.error('Error uploading template:', error);
            this.showNotification(error.message || 'Error uploading template', 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    // Utility Functions
    showLoadingOverlay() {
        this.loadingOverlay.classList.remove('hidden');
    }
    
    hideLoadingOverlay() {
        this.loadingOverlay.classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 3000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceBillGenerator();
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.8;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .preview-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }
    
    .preview-table th,
    .preview-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #e1e8ed;
    }
    
    .preview-table th {
        background: #f8f9fa;
        font-weight: 600;
    }
    
    .bill-preview-content {
        line-height: 1.8;
    }
    
    .bill-header,
    .customer-info,
    .products-info,
    .bill-summary {
        margin-bottom: 20px;
    }
    
    .bill-summary {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
    }
    
    .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid #e1e8ed;
    }
    
    .summary-row:last-child {
        border-bottom: none;
    }
    
    .summary-row.total {
        font-weight: bold;
        font-size: 1.1rem;
        color: #667eea;
    }
`;
document.head.appendChild(notificationStyles);
