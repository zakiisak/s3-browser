let currentPath = '';

// Format file size
function formatSize(bytes) {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Update breadcrumb
function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';

    const parts = path.split('/').filter(p => p);
    const breadcrumbItems = ['Home', ...parts];

    breadcrumbItems.forEach((part, index) => {
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        if (index === breadcrumbItems.length - 1) {
            item.classList.add('active');
        }
        item.textContent = index === 0 ? 'Home' : part;
        
        const itemPath = index === 0 ? '' : parts.slice(0, index).join('/') + '/';
        item.dataset.path = itemPath;
        item.addEventListener('click', () => navigateToPath(itemPath));
        
        breadcrumb.appendChild(item);
    });
}

// Navigate to path
function navigateToPath(path) {
    currentPath = path;
    updateBreadcrumb(path);
    loadFiles(path);
}

// Load files
async function loadFiles(prefix = '') {
    const fileList = document.getElementById('fileList');
    const loading = document.getElementById('loading');
    
    loading.style.display = 'block';
    fileList.innerHTML = '<div class="empty-state"><p>Loading files...</p></div>';

    try {
        const response = await fetch(`/api/list?prefix=${encodeURIComponent(prefix)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load files');
        }

        fileList.innerHTML = '';

        // Display folders
        data.folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.innerHTML = `
                <span class="folder-icon">📁</span>
                <span class="folder-name">${escapeHtml(folder.name)}</span>
                <div class="file-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteFolder('${escapeHtml(folder.path)}', '${escapeHtml(folder.name)}')">
                        🗑️ Delete
                    </button>
                </div>
            `;
            folderItem.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions')) {
                    navigateToPath(folder.path);
                }
            });
            fileList.appendChild(folderItem);
        });

        // Display files
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>Size: ${formatSize(file.size)}</span>
                        <span>Modified: ${formatDate(file.lastModified)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); copyFileLink('${escapeHtml(file.path)}', '${escapeHtml(file.name)}')">
                        🔗 Copy Link
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); downloadFile('${escapeHtml(file.path)}', '${escapeHtml(file.name)}')">
                        ⬇️ Download
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteFile('${escapeHtml(file.path)}', '${escapeHtml(file.name)}')">
                        🗑️ Delete
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
        });

        if (data.folders.length === 0 && data.files.length === 0) {
            fileList.innerHTML = '<div class="empty-state"><p>This folder is empty</p></div>';
        }
    } catch (error) {
        fileList.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(error.message)}</p></div>`;
        console.error('Error loading files:', error);
    } finally {
        loading.style.display = 'none';
    }
}

// Copy file link to clipboard
async function copyFileLink(key, filename) {
    try {
        const response = await fetch(`/api/download?key=${encodeURIComponent(key)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate download URL');
        }

        const url = data.url;

        // Try modern clipboard API first
        try {
            await navigator.clipboard.writeText(url);
            showToast(`Link copied to clipboard!`);
        } catch (clipboardError) {
            // Fallback for older browsers or when clipboard API fails
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast(`Link copied to clipboard!`);
            } catch (execError) {
                alert('Error copying link. Please copy manually: ' + url);
                console.error('Error copying link:', execError);
            }
            document.body.removeChild(textarea);
        }
    } catch (error) {
        alert('Error generating link: ' + error.message);
        console.error('Error copying link:', error);
    }
}

// Download file
async function downloadFile(key, filename) {
    try {
        const response = await fetch(`/api/download?key=${encodeURIComponent(key)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate download URL');
        }

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        alert('Error downloading file: ' + error.message);
        console.error('Error downloading file:', error);
    }
}

// Show toast notification
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Upload file
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const fileNameInput = document.getElementById('fileNameInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const uploadStatus = document.getElementById('uploadStatus');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file to upload');
        return;
    }

    const file = fileInput.files[0];
    const fileName = fileNameInput.value.trim() || file.name;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('prefix', currentPath);

    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    uploadStatus.textContent = 'Uploading...';

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                uploadStatus.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                progressFill.style.width = '100%';
                uploadStatus.textContent = 'Upload complete!';
                setTimeout(() => {
                    closeUploadModal();
                    loadFiles(currentPath);
                }, 500);
            } else {
                const response = JSON.parse(xhr.responseText);
                throw new Error(response.error || 'Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            throw new Error('Upload failed');
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    } catch (error) {
        alert('Error uploading file: ' + error.message);
        console.error('Error uploading file:', error);
        uploadProgress.style.display = 'none';
    }
}

let pendingDelete = null;

// Delete file
function deleteFile(key, name) {
    pendingDelete = { type: 'file', key, name };
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete "${name}"?`;
    document.getElementById('deleteModal').classList.add('active');
}

// Delete folder
function deleteFolder(prefix, name) {
    pendingDelete = { type: 'folder', prefix, name };
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete the folder "${name}" and all its contents? This action cannot be undone.`;
    document.getElementById('deleteModal').classList.add('active');
}

// Confirm delete
async function confirmDelete() {
    if (!pendingDelete) return;

    const { type, key, prefix, name } = pendingDelete;
    closeDeleteModal();

    try {
        let response;
        if (type === 'file') {
            response = await fetch(`/api/delete?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });
        } else {
            response = await fetch(`/api/delete-folder?prefix=${encodeURIComponent(prefix)}`, {
                method: 'DELETE',
            });
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to delete ${type}`);
        }

        loadFiles(currentPath);
    } catch (error) {
        alert(`Error deleting ${type}: ` + error.message);
        console.error(`Error deleting ${type}:`, error);
    } finally {
        pendingDelete = null;
    }
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    pendingDelete = null;
}

// Modal functions
function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('fileNameInput').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadProgress').style.display = 'none';
}

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadFiles(currentPath);
});

document.getElementById('uploadBtn').addEventListener('click', openUploadModal);

document.getElementById('closeUploadModal').addEventListener('click', closeUploadModal);
document.getElementById('cancelUploadBtn').addEventListener('click', closeUploadModal);

document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    uploadFile();
});

// Delete modal event listeners
document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);

// Close modals when clicking outside
document.getElementById('uploadModal').addEventListener('click', (e) => {
    if (e.target.id === 'uploadModal') {
        closeUploadModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target.id === 'deleteModal') {
        closeDeleteModal();
    }
});

// Initial load
loadFiles('');

