// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentProductId = null;
        this.isEditMode = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }
    
    initializeElements() {
        // Product management
        this.addProductBtn = document.getElementById('addProductBtn');
        this.updateGlobalGstBtn = document.getElementById('updateGlobalGstBtn');
        this.productsTableBody = document.getElementById('productsTableBody');
        
        // Template management
        this.uploadTemplateBtn = document.getElementById('uploadTemplateBtn');
        this.templatesTableBody = document.getElementById('templatesTableBody');
        
        // Modals
        this.productModal = document.getElementById('productModal');
        this.productForm = document.getElementById('productForm');
        this.productModalTitle = document.getElementById('productModalTitle');
        this.productId = document.getElementById('productId');
        this.productName = document.getElementById('productName');
        this.productPrice = document.getElementById('productPrice');
        this.productGst = document.getElementById('productGst');
        this.closeProductModal = document.getElementById('closeProductModal');
        this.cancelProduct = document.getElementById('cancelProduct');
        
        this.gstModal = document.getElementById('gstModal');
        this.gstForm = document.getElementById('gstForm');
        this.globalGst = document.getElementById('globalGst');
        this.closeGstModal = document.getElementById('closeGstModal');
        this.cancelGst = document.getElementById('cancelGst');
        
        this.templateModal = document.getElementById('templateModal');
        this.templateForm = document.getElementById('templateForm');
        this.templateName = document.getElementById('templateName');
        this.templateFile = document.getElementById('templateFile');
        this.closeTemplateModal = document.getElementById('closeTemplateModal');
        this.cancelTemplate = document.getElementById('cancelTemplate');
        
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmMessage = document.getElementById('confirmMessage');
        this.confirmAction = document.getElementById('confirmAction');
        this.closeConfirmModal = document.getElementById('closeConfirmModal');
        this.cancelConfirm = document.getElementById('cancelConfirm');
        
        // Stats
        this.totalProducts = document.getElementById('totalProducts');
        this.totalTemplates = document.getElementById('totalTemplates');
        this.recentBills = document.getElementById('recentBills');
    }
    
    bindEvents() {
        // Product events
        this.addProductBtn.addEventListener('click', () => this.showAddProductModal());
        this.updateGlobalGstBtn.addEventListener('click', () => this.showGstModal());
        this.productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        this.closeProductModal.addEventListener('click', () => this.hideProductModal());
        this.cancelProduct.addEventListener('click', () => this.hideProductModal());
        
        // GST events
        this.gstForm.addEventListener('submit', (e) => this.handleGstSubmit(e));
        this.closeGstModal.addEventListener('click', () => this.hideGstModal());
        this.cancelGst.addEventListener('click', () => this.hideGstModal());
        
        // Template events
        this.uploadTemplateBtn.addEventListener('click', () => this.showTemplateModal());
        this.templateForm.addEventListener('submit', (e) => this.handleTemplateSubmit(e));
        this.closeTemplateModal.addEventListener('click', () => this.hideTemplateModal());
        this.cancelTemplate.addEventListener('click', () => this.hideTemplateModal());
        
        // Confirmation modal events
        this.closeConfirmModal.addEventListener('click', () => this.hideConfirmModal());
        this.cancelConfirm.addEventListener('click', () => this.hideConfirmModal());
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.productModal) this.hideProductModal();
            if (e.target === this.gstModal) this.hideGstModal();
            if (e.target === this.templateModal) this.hideTemplateModal();
            if (e.target === this.confirmModal) this.hideConfirmModal();
        });
    }
    
    async loadData() {
        await Promise.all([
            this.loadProducts(),
            this.loadTemplates(),
            this.loadStats()
        ]);
    }
    
    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const data = await response.json();
                this.populateProductsTable(data.products || []);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Error loading products', 'error');
        }
    }
    
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            if (response.ok) {
                const data = await response.json();
                this.populateTemplatesTable(data.templates || []);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.showNotification('Error loading templates', 'error');
        }
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data = await response.json();
                this.updateStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    populateProductsTable(products) {
        this.productsTableBody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>₹${product.price.toFixed(2)}</td>
                <td>${product.gst_percent}%</td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="adminPanel.editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            this.productsTableBody.appendChild(row);
        });
        
        this.updateStats({ total_products: products.length });
    }
    
    populateTemplatesTable(templates) {
        this.templatesTableBody.innerHTML = '';
        
        templates.forEach(template => {
            const row = document.createElement('tr');
            const createdDate = template.created_at ? new Date(template.created_at).toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td>${template.id}</td>
                <td>${template.name}</td>
                <td>${template.file_type.toUpperCase()}</td>
                <td>${createdDate}</td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-danger" onclick="adminPanel.deleteTemplate(${template.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            this.templatesTableBody.appendChild(row);
        });
        
        this.updateStats({ total_templates: templates.length });
    }
    
    updateStats(stats) {
        if (stats.total_products !== undefined) {
            this.totalProducts.textContent = stats.total_products;
        }
        if (stats.total_templates !== undefined) {
            this.totalTemplates.textContent = stats.total_templates;
        }
        if (stats.recent_bills !== undefined) {
            this.recentBills.textContent = stats.recent_bills;
        }
    }
    
    // Product Modal Functions
    showAddProductModal() {
        this.isEditMode = false;
        this.currentProductId = null;
        this.productModalTitle.textContent = 'Add New Product';
        this.productForm.reset();
        this.productModal.classList.remove('hidden');
        this.productName.focus();
    }
    
    editProduct(productId) {
        this.isEditMode = true;
        this.currentProductId = productId;
        this.productModalTitle.textContent = 'Edit Product';
        
        // Fetch product data and populate form
        this.fetchProductData(productId);
        
        this.productModal.classList.remove('hidden');
    }
    
    async fetchProductData(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (response.ok) {
                const data = await response.json();
                const product = data.product;
                
                this.productId.value = product.id;
                this.productName.value = product.name;
                this.productPrice.value = product.price;
                this.productGst.value = product.gst_percent;
            }
        } catch (error) {
            console.error('Error fetching product data:', error);
            this.showNotification('Error loading product data', 'error');
        }
    }
    
    hideProductModal() {
        this.productModal.classList.add('hidden');
        this.productForm.reset();
        this.currentProductId = null;
        this.isEditMode = false;
    }
    
    async handleProductSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData();
            formData.append('name', this.productName.value);
            formData.append('price', this.productPrice.value);
            formData.append('gst_percent', this.productGst.value);
            
            const url = this.isEditMode 
                ? `/api/products/${this.currentProductId}`
                : '/api/products';
            
            const method = this.isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                this.hideProductModal();
                this.loadProducts(); // Reload products
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error saving product');
            }
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification(error.message || 'Error saving product', 'error');
        }
    }
    
    async deleteProduct(productId) {
        this.showConfirmModal(
            'Are you sure you want to delete this product? This action cannot be undone.',
            async () => {
                try {
                    const response = await fetch(`/api/products/${productId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        this.showNotification(result.message, 'success');
                        this.loadProducts(); // Reload products
                    } else {
                        const error = await response.json();
                        throw new Error(error.message || 'Error deleting product');
                    }
                    
                } catch (error) {
                    console.error('Error deleting product:', error);
                    this.showNotification(error.message || 'Error deleting product', 'error');
                }
                
                this.hideConfirmModal();
            }
        );
    }
    
    // GST Modal Functions
    showGstModal() {
        this.gstModal.classList.remove('hidden');
        this.globalGst.focus();
    }
    
    hideGstModal() {
        this.gstModal.classList.add('hidden');
        this.gstForm.reset();
    }
    
    async handleGstSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData();
            formData.append('gst_percent', this.globalGst.value);
            
            const response = await fetch('/api/global-gst', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                this.hideGstModal();
                this.loadProducts(); // Reload products to show updated GST
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error updating global GST');
            }
            
        } catch (error) {
            console.error('Error updating global GST:', error);
            this.showNotification(error.message || 'Error updating global GST', 'error');
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
    
    async handleTemplateSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData();
            formData.append('template_name', this.templateName.value);
            formData.append('template', this.templateFile.files[0]);
            
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
        }
    }
    
    async deleteTemplate(templateId) {
        this.showConfirmModal(
            'Are you sure you want to delete this template? This action cannot be undone.',
            async () => {
                try {
                    const response = await fetch(`/api/templates/${templateId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        this.showNotification(result.message, 'success');
                        this.loadTemplates(); // Reload templates
                    } else {
                        const error = await response.json();
                        throw new Error(error.message || 'Error deleting template');
                    }
                    
                } catch (error) {
                    console.error('Error deleting template:', error);
                    this.showNotification(error.message || 'Error deleting template', 'error');
                }
                
                this.hideConfirmModal();
            }
        );
    }
    
    // Confirmation Modal Functions
    showConfirmModal(message, onConfirm) {
        this.confirmMessage.textContent = message;
        this.confirmAction.onclick = onConfirm;
        this.confirmModal.classList.remove('hidden');
    }
    
    hideConfirmModal() {
        this.confirmModal.classList.add('hidden');
    }
    
    // Utility Functions
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
    window.adminPanel = new AdminPanel();
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
`;
document.head.appendChild(notificationStyles);
