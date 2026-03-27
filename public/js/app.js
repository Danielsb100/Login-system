const API_URL = ''; // Same origin
// SYNC_CHECK: 24/03/2026 16:40

// --- UI Helpers ---
function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${isError ? 'message-error' : 'message-success'}`;
    setTimeout(() => { el.textContent = ''; }, 5000);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

function getToken() {
    return localStorage.getItem('auth_token');
}

function switchSection(section) {
    document.querySelectorAll('.section-group').forEach(group => group.classList.add('hidden'));
    document.getElementById(`group-${section}`).classList.remove('hidden');
    
    document.querySelectorAll('.dash-tab').forEach(btn => btn.classList.remove('active'));
    // If called from onclick, event should be available
    if (window.event && window.event.target.classList.contains('dash-tab')) {
        window.event.target.classList.add('active');
    } else {
         document.getElementById(`tab-${section}`)?.classList.add('active');
    }
}

function setToken(token) {
    localStorage.setItem('auth_token', token);
}

function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/index.html';
}

// --- Advanced Asset State ---
let currentAssetTab = 'image';
let personalAssets = [];
let currentFilteredAssets = [];
let currentIndex = -1;

// --- API Calls ---

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
}

// --- Event Listeners ---

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');
        
        try {
            btn.textContent = 'Signing in...';
            btn.disabled = true;
            
            const res = await apiCall('/auth/login', 'POST', { email, password });
            setToken(res.token);
            window.location.href = '/dashboard.html';
        } catch (error) {
            showMessage('login-message', error.message, true);
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const btn = registerForm.querySelector('button');

        // SYNC_CHECK: 24/03/2026 16:40
        try {
            btn.textContent = 'Creating account...';
            btn.disabled = true;
            
            await apiCall('/auth/register', 'POST', { username, email, password });
            
            showMessage('register-message', 'Account created! Please log in.', false);
            // Auto switch back to login tab
            setTimeout(() => switchTab('login'), 2000);
            
            registerForm.reset();
        } catch (error) {
            showMessage('register-message', error.message, true);
        } finally {
            btn.textContent = 'Sign Up';
            btn.disabled = false;
        }
    });
}

// --- Dashboard Logic ---

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    try {
        // Verify token and get profile info
        const res = await apiCall('/auth/verify');
        const user = res.user;

        // Update UI
        document.getElementById('nav-user-badge').textContent = `Hello, ${user.username}`;
        
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-id').textContent = `#${user.id}`;
        
        const roleBadge = document.getElementById('profile-role');
        roleBadge.textContent = user.role;
        roleBadge.dataset.role = user.role;

        // If user is ADMIN or MASTER, load admin panel
        if (user.role === 'ADMIN' || user.role === 'MASTER') {
            await loadAdminPanel();

            if (user.role === 'MASTER') {
                const btnReset = document.getElementById('btn-reset-db');
                if (btnReset) btnReset.classList.remove('hidden');
                
                // Show Modules Tab
                document.getElementById('tab-modules').classList.remove('hidden');
                
                // NEW: Load Teaching Modules for Master
                await loadModulesPanel();
            }
        }

        // Load personal shared assets
        await loadUserDocuments();

    } catch (error) {
        console.error('Dashboard error:', error);
        // Only logout if it's a 401 or specific auth error
        if (error.message.includes('401') || error.message.includes('token') || error.message.includes('expired')) {
            alert('Sessão expirada. Por favor, faça login novamente.');
            logout();
        } else {
            console.error('Critical Dashboard failure: ', error.message);
            // Optionally show error on screen instead of logging out
        }
    }
}

async function loadAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    adminPanel.classList.remove('hidden');
    
    const tbody = document.getElementById('users-table-body');
    
    try {
        const res = await apiCall('/api/users');
        const users = res.users;
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        users.forEach(u => {
            const date = new Date(u.createdAt).toLocaleDateString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="role-badge" data-role="${u.role}">${u.role}</span></td>
                <td>${date}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color: var(--error); text-align: center;">Failed to load users: ${error.message}</td></tr>`;
    }
}

async function resetDatabase() {
    const confirmation = confirm("TEM CERTEZA ABSOLUTA?\n\nIsso irá deletar TODOS os usuários do sistema, deixando apenas a sua própria conta MASTER ativa. Essa ação não pode ser desfeita!");
    if (!confirmation) return;

    try {
        const btnReset = document.getElementById('btn-reset-db');
        const originalText = btnReset.textContent;
        btnReset.textContent = "Apagando...";
        btnReset.disabled = true;

        const res = await apiCall('/api/users/reset', 'POST');
        alert(res.message);
        
        // Recarrega a lista para mostrar que esvaziou
        await loadAdminPanel(); 

        btnReset.textContent = originalText;
        btnReset.disabled = false;
    } catch (err) {
        alert('Erro ao resetar: ' + err.message);
    }
}
// --- Document Management logic ---

async function loadUserDocuments() {
    try {
        const res = await apiCall('/api/documents');
        personalAssets = res.documents || [];
        renderAssets('personal', personalAssets);
    } catch (err) {
        console.error('Failed to load documents:', err);
    }
}

function renderAssets(context, assets) {
    currentContext = context;
    const isPersonal = context === 'personal';
    const prefix = isPersonal ? 'personal' : 'drill';
    
    const tableContainer = document.getElementById(`${prefix}-table-container`);
    const gridContainer = document.getElementById(`${prefix}-grid-container`);
    const tbody = document.getElementById(isPersonal ? 'docs-table-body' : 'drill-assets-body');

    // Filter by current tab
    currentFilteredAssets = assets.filter(doc => {
        const type = doc.type.toLowerCase();
        if (currentAssetTab === 'image') return type.startsWith('image/');
        if (currentAssetTab === 'video') return type.startsWith('video/');
        if (currentAssetTab === 'pdf') return type === 'application/pdf';
        if (currentAssetTab === 'word') return type.includes('msword') || type.includes('officedocument.wordprocessingml');
        return false;
    });

    if (currentAssetTab === 'image' || currentAssetTab === 'video') {
        if (tableContainer) tableContainer.classList.add('hidden');
        if (gridContainer) {
            gridContainer.classList.remove('hidden');
            renderGrid(gridContainer, currentFilteredAssets, isPersonal);
        }
    } else {
        if (gridContainer) gridContainer.classList.add('hidden');
        if (tableContainer) {
            tableContainer.classList.remove('hidden');
            renderTable(tbody, currentFilteredAssets, isPersonal);
        }
    }
}

function renderTable(tbody, assets, isEditable) {
    if (assets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isEditable ? 3 : 2}" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.4);">Nenhum arquivo nesta categoria.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    assets.forEach(doc => {
        const date = new Date(doc.createdAt).toLocaleDateString();
        const tr = document.createElement('tr');
        if (isEditable) {
            tr.innerHTML = `
                <td><strong>${doc.name}</strong></td>
                <td>${date}</td>
                <td>
                    <button onclick="downloadDocument(${doc.id}, '${doc.name}')" class="btn btn-secondary btn-sm">Download</button>
                    <button onclick="deleteDocument(${doc.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Delete</button>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td><strong>${doc.name}</strong></td>
                <td>${date}</td>
                <td><button onclick="downloadDocument(${doc.id}, '${doc.name}')" class="btn btn-secondary btn-sm">Download</button></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function renderGrid(container, assets, isEditable) {
    if (assets.length === 0) {
        container.innerHTML = `<div style="text-align: center; width: 100%; padding: 3rem; color: rgba(255,255,255,0.4);">Nenhum arquivo nesta categoria.</div>`;
        return;
    }

    container.innerHTML = '';
    assets.forEach(async (doc, index) => {
        const card = document.createElement('div');
        card.className = 'asset-card glassmorphism';
        card.onclick = () => openMediaPreview(index);

        const thumb = document.createElement('div');
        thumb.className = 'thumb-wrapper';
        
        if (doc.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = `${API_URL}/api/documents/download/${doc.id}`;
            img.loading = 'lazy';
            thumb.appendChild(img);
        } else if (doc.type.startsWith('video/')) {
            const videoThumb = await createVideoThumbnail(`${API_URL}/api/documents/download/${doc.id}`);
            thumb.appendChild(videoThumb);
            const playIcon = document.createElement('div');
            playIcon.innerHTML = '<i class="fas fa-play"></i>';
            playIcon.style.cssText = 'position: absolute; color: white; font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));';
            thumb.appendChild(playIcon);
        }

        // Deletion Red X for personal
        if (isEditable) {
            const delBtn = document.createElement('div');
            delBtn.className = 'delete-badge';
            delBtn.innerHTML = '&times;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteDocument(doc.id);
            };
            card.appendChild(delBtn);
        }

        const name = document.createElement('span');
        name.className = 'filename';
        name.innerText = doc.name;

        card.appendChild(thumb);
        card.appendChild(name);
        container.appendChild(card);
    });
}

function createVideoThumbnail(url) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.currentTime = 0.5;

        video.onloadeddata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            setTimeout(() => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas);
                video.src = ''; 
            }, 300);
        };
        video.onerror = () => {
             const div = document.createElement('div');
             div.innerHTML = '<i class="fas fa-video" style="font-size: 2rem; color: rgba(255,255,255,0.3);"></i>';
             resolve(div);
        };
    });
}

async function uploadDocument(file) {
    if (!file) return;
    
    const docMessage = 'doc-message';
    try {
        const formData = new FormData();
        formData.append('document', file);

        const res = await fetch(`${API_URL}/api/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        showMessage(docMessage, 'Document uploaded successfully!', false);
        loadUserDocuments();
    } catch (err) {
        showMessage(docMessage, err.message, true);
    }
}

async function downloadDocument(id, name) {
    try {
        const response = await fetch(`${API_URL}/api/documents/download/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert('Error downloading: ' + err.message);
    }
}

// --- Preview Logic ---
function openMediaPreview(index) {
    currentIndex = index;
    const doc = currentFilteredAssets[currentIndex];
    if (!doc) return;

    const previewContent = document.getElementById('preview-content');
    const previewModal = document.getElementById('media-preview-modal');
    const downloadBtn = document.getElementById('btn-download-preview');
    
    previewContent.innerHTML = '';
    downloadBtn.onclick = () => downloadDocument(doc.id, doc.name);

    if (doc.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `${API_URL}/api/documents/download/${doc.id}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh';
        previewContent.appendChild(img);
    } else if (doc.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = `${API_URL}/api/documents/download/${doc.id}`;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '70vh';
        previewContent.appendChild(video);
    }

    previewModal.classList.remove('hidden');
    
    // UI Navigation Arrows
    document.getElementById('prev-preview').style.display = currentFilteredAssets.length > 1 ? 'flex' : 'none';
    document.getElementById('next-preview').style.display = currentFilteredAssets.length > 1 ? 'flex' : 'none';
}

function nextPreview() {
    if (currentFilteredAssets.length <= 1) return;
    currentIndex = (currentIndex + 1) % currentFilteredAssets.length;
    openMediaPreview(currentIndex);
}

function prevPreview() {
    if (currentFilteredAssets.length <= 1) return;
    currentIndex = (currentIndex - 1 + currentFilteredAssets.length) % currentFilteredAssets.length;
    openMediaPreview(currentIndex);
}

// Event bindings for dashboard arrows
document.getElementById('next-preview').onclick = (e) => { e.stopPropagation(); nextPreview(); };
document.getElementById('prev-preview').onclick = (e) => { e.stopPropagation(); prevPreview(); };

// Keyboard support
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('media-preview-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') nextPreview();
    if (e.key === 'ArrowLeft') prevPreview();
    if (e.key === 'Escape') closeMediaPreview();
});

function closeMediaPreview() {
    const previewModal = document.getElementById('media-preview-modal');
    const previewContent = document.getElementById('preview-content');
    previewModal.classList.add('hidden');
    previewContent.innerHTML = '';
}

async function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
        await apiCall(`/api/documents/${id}`, 'DELETE');
        loadUserDocuments();
    } catch (err) {
        alert('Error deleting: ' + err.message);
    }
}

// File input listener
const docInput = document.getElementById('doc-upload-input');
if (docInput) {
    docInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadDocument(e.target.files[0]);
            e.target.value = ''; // Reset
        }
    });
}

// --- Master Drilldown logic ---

function toggleAccordion(id) {
    document.getElementById(id).classList.toggle('active');
}

// Global Tab Listeners
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn') && !e.target.id.startsWith('tab-')) {
        const container = e.target.closest('.accordion-content');
        if (!container) return;
        
        currentAssetTab = e.target.dataset.tab;
        
        // Toggle active class on buttons in THIS container
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === currentAssetTab);
        });

        // Re-render personal assets
        renderAssets('personal', personalAssets);
    }
});

// --- Teaching Modules Logic ---

let currentModuleId = null;
let currentModuleData = null;

async function loadModulesPanel() {
    const modulesPanel = document.getElementById('modules-panel');
    if (!modulesPanel) return;
    modulesPanel.classList.remove('hidden');

    const modulesList = document.getElementById('modules-list');
    const counter = document.getElementById('module-counter');

    try {
        const modules = await apiCall('/modules/my');
        counter.textContent = `Limite: ${modules.length}/5 módulos criados`;
        
        const btnCreate = document.getElementById('btn-create-module');
        if (btnCreate) btnCreate.disabled = modules.length >= 5;

        if (modules.length === 0) {
            modulesList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">Você ainda não criou nenhum módulo.</div>';
            return;
        }

        modulesList.innerHTML = '';
        modules.forEach(m => {
            const card = document.createElement('div');
            card.className = 'module-card glassmorphism';
            card.dataset.id = m.id;
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                   <h3>${m.title}</h3>
                   <span class="role-badge" style="font-size: 0.7rem;">${m.status}</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${m.description || 'Sem descrição.'}
                </p>
                <div class="module-meta">
                    <span><i class="fas fa-video"></i> ${m._count.videos}</span>
                    <span><i class="fas fa-file-alt"></i> ${m._count.documents}</span>
                    <span><i class="fas fa-question-circle"></i> ${m._count.questions}</span>
                </div>
            `;
            card.onclick = () => selectModuleForPreview(m.id);
            modulesList.appendChild(card);
        });
    } catch (error) {
        modulesList.innerHTML = `<div style="grid-column: 1/-1; color: var(--error); text-align: center;">Erro ao carregar módulos: ${error.message}</div>`;
    }
}

function switchPreviewTab(pane) {
    document.querySelectorAll('.prev-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.pane === pane));
    document.querySelectorAll('.prev-pane').forEach(p => p.classList.toggle('active', p.id === `prev-pane-${pane}`));
}

async function selectModuleForPreview(moduleId) {
    const section = document.getElementById('module-preview-section');
    section.classList.remove('hidden');
    
    document.querySelectorAll('.module-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector(`.module-card[data-id="${moduleId}"]`);
    if (activeCard) activeCard.classList.add('active');

    try {
        const m = await apiCall(`/modules/${moduleId}/edit-format`);
        document.getElementById('preview-title').textContent = m.title;
        
        // Video Preview
        document.getElementById('preview-videos-summary').innerHTML = m.videos.length ? 
            m.videos.map(v => `
                <div class="doc-col-item">
                    <i class="fas fa-play-circle" style="color: var(--primary);"></i>
                    <span>${v.title}</span>
                </div>
            `).join('') : '<div style="color: var(--text-muted); padding: 1rem;">Nenhum vídeo.</div>';
            
        // Document Preview (3 Columns)
        const pdfList = document.getElementById('prev-pdf-list');
        const wordList = document.getElementById('prev-word-list');
        const imgList = document.getElementById('prev-img-list');

        pdfList.innerHTML = '';
        wordList.innerHTML = '';
        imgList.innerHTML = '';

        m.documents.forEach(d => {
            const type = d.document.type.toLowerCase();
            const item = document.createElement('div');
            item.className = 'doc-col-item';
            
            let icon = 'fa-file-alt';
            let color = 'var(--text-muted)';
            let targetList = null;

            if (type === 'application/pdf') {
                icon = 'fa-file-pdf';
                color = '#ff4444';
                targetList = pdfList;
            } else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                icon = 'fa-file-word';
                color = '#4488ff';
                targetList = wordList;
            } else if (type.startsWith('image/')) {
                icon = 'fa-file-image';
                color = '#44ff88';
                targetList = imgList;
            }

            if (targetList) {
                item.innerHTML = `<i class="fas ${icon}" style="color: ${color};"></i> <span>${d.title}</span>`;
                targetList.appendChild(item);
            }
        });

        [pdfList, wordList, imgList].forEach(list => {
            if (list.innerHTML === '') list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">Vazio</div>';
        });
            
        // Quiz Preview
        document.getElementById('preview-quiz-summary').innerHTML = m.questions.length ? 
            `<div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <strong style="color: var(--primary); font-size: 1.2rem;">${m.questions.length}</strong> perguntas cadastradas.
            </div>` : '<div style="color: var(--text-muted); padding: 1rem;">Nenhuma pergunta.</div>';

        // Reports Preview Summary
        const overview = await apiCall(`/modules/${moduleId}/reports/overview`);
        document.getElementById('preview-reports-summary').innerHTML = `
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                <div class="stat-card">
                    <div class="stat-value">${overview.uniqueUsers}</div>
                    <div class="stat-label">Alunos</div>
                </div>
                <div class="stat-value" style="font-size: 1.5rem;">${overview.averageScore.toFixed(1)}%</div>
                <div class="stat-label">Média</div>
            </div>
        `;

        // Action Buttons - Ensure we use a direct reference to avoid closure issues
        const btnEdit = document.getElementById('btn-edit-preview');
        btnEdit.onclick = () => openModuleEditor(moduleId);
        
        // Start on Videos tab by default
        switchPreviewTab('videos');
        
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        console.error('Preview error:', err);
    }
}

// Editor Modal Management
async function openModuleEditor(id = null) {
    const modal = document.getElementById('module-editor-modal');
    const title = document.getElementById('editor-title');
    currentModuleId = id;

    // Delete button handling in editor
    const btnDel = document.getElementById('btn-delete-module-editor');
    if (id) {
        btnDel.classList.remove('hidden');
        btnDel.onclick = () => deleteModule(id);
    } else {
        btnDel.classList.add('hidden');
    }

    if (!id) {
        // Create Mode
        title.textContent = 'Criar Novo Módulo';
        document.getElementById('module-basics-form').reset();
        document.getElementById('editor-tabs').classList.add('hidden');
        modal.classList.remove('hidden');
        return;
    }

    // Edit Mode
    title.textContent = 'Configurar Conteúdo do Módulo';
    document.getElementById('editor-tabs').classList.remove('hidden');
    modal.classList.remove('hidden');

    await loadModuleData(id);
    switchEditorTab('basics');
}

function closeModuleEditor() {
    document.getElementById('module-editor-modal').classList.add('hidden');
    currentModuleId = null;
    currentModuleData = null;
}

async function loadModuleData(id) {
    try {
        currentModuleData = await apiCall(`/modules/${id}/edit-format`);
        
        // Fill base info
        document.getElementById('m-title').value = currentModuleData.title;
        document.getElementById('m-description').value = currentModuleData.description || '';
        document.getElementById('m-cover').value = currentModuleData.coverImage || '';

        renderVideoList();
        renderDocList();
        renderQuizList();
        loadModuleReports(id);
    } catch (error) {
        alert('Erro ao carregar dados do módulo: ' + error.message);
    }
}

// Module Basics Form
document.getElementById('module-basics-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        title: document.getElementById('m-title').value,
        description: document.getElementById('m-description').value,
        coverImage: document.getElementById('m-cover').value
    };

    try {
        if (currentModuleId) {
            await apiCall(`/modules/${currentModuleId}`, 'PUT', data);
            alert('Módulo atualizado!');
        } else {
            const res = await apiCall('/modules', 'POST', data);
            currentModuleId = res.id;
            alert('Módulo criado! Agora você pode adicionar conteúdo.');
            await loadModulesPanel();
            openModuleEditor(res.id); // Reload in edit mode
        }
    } catch (error) {
        alert('Erro: ' + error.message);
    }
});

async function updateModuleStatus(id, status) {
    const endpoint = `/modules/${id}/${status === 'PUBLISHED' ? 'publish' : 'archive'}`;
    try {
        await apiCall(endpoint, 'PATCH');
        loadModulesPanel();
    } catch (error) {
        alert('Erro ao atualizar status: ' + error.message);
    }
}

async function deleteModule(id) {
    if (!confirm('Tem certeza que deseja excluir permanentemente este módulo e todo seu conteúdo?')) return;
    try {
        await apiCall(`/modules/${id}`, 'DELETE');
        loadModulesPanel();
        
        // Close UI components
        closeModuleEditor();
        document.getElementById('module-preview-section').classList.add('hidden');
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    }
}

// Editor Tab Switcher
function switchEditorTab(tab) {
    document.querySelectorAll('.inner-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${tab}`));
}

document.querySelectorAll('.inner-tab-btn').forEach(btn => {
    btn.onclick = () => switchEditorTab(btn.dataset.tab);
});

// --- Content Handlers (Videos, Docs, Quiz) ---

function renderVideoList() {
    const list = document.getElementById('v-list');
    list.innerHTML = '';
    currentModuleData.videos.forEach(v => {
        const li = document.createElement('li');
        li.className = 'content-item';
        li.innerHTML = `
            <div class="content-info">
                <i class="fas fa-play-circle" style="color: var(--primary);"></i>
                <span>${v.title}</span>
            </div>
            <div class="actions">
                <button onclick="deleteVideo(${v.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Excluir</button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function showAddVideoForm() {
    showSubModal('Adicionar Vídeo', `
        <div class="input-group">
            <label>Título do Vídeo</label>
            <input type="text" id="v-title-in" placeholder="Ex: Aula 01 - Fundamentos">
        </div>
        <div class="input-group">
            <label>URL do Vídeo (YouTube/Vimeo/etc)</label>
            <input type="text" id="v-url-in" placeholder="https://...">
        </div>
        <div style="text-align: center; margin: 0.5rem 0; color: var(--text-muted); font-size: 0.8rem;">--- OU ---</div>
        <div class="input-group">
            <label>Upload de Arquivo de Vídeo</label>
            <input type="file" id="v-file-in" accept="video/*" class="glassmorphism" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); color: white; border: 1px solid var(--surface-border); border-radius: 8px;">
        </div>
    `, async () => {
        const title = document.getElementById('v-title-in').value;
        const urlInput = document.getElementById('v-url-in').value;
        const fileInput = document.getElementById('v-file-in').files[0];
        const okBtn = document.getElementById('sub-modal-ok');
        
        let finalUrl = urlInput;

        if (fileInput) {
            okBtn.textContent = 'Enviando...';
            okBtn.disabled = true;
            try {
                const formData = new FormData();
                formData.append('document', fileInput);
                const res = await fetch(`${API_URL}/api/documents/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getToken()}` },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');
                finalUrl = `/api/documents/download/${data.id}`;
            } catch (err) {
                alert('Erro no upload: ' + err.message);
                okBtn.textContent = 'Confirmar';
                okBtn.disabled = false;
                return;
            }
        }

        if (!finalUrl || !title) {
            alert('Por favor, insira um título e uma URL ou selecione um arquivo.');
            return;
        }

        await apiCall(`/modules/${currentModuleId}/videos`, 'POST', { title, url: finalUrl, order: currentModuleData.videos.length });
        await loadModuleData(currentModuleId);
        closeSubModal();
    });
}

async function deleteVideo(videoId) {
    if (!confirm('Excluir vídeo?')) return;
    await apiCall(`/modules/${currentModuleId}/videos/${videoId}`, 'DELETE');
    await loadModuleData(currentModuleId);
}

function renderDocList() {
    const list = document.getElementById('d-list');
    list.innerHTML = '';
    currentModuleData.documents.forEach(d => {
        const li = document.createElement('li');
        li.className = 'content-item';
        li.innerHTML = `
            <div class="content-info">
                <i class="fas fa-file-pdf" style="color: var(--secondary);"></i>
                <span>${d.title}</span>
            </div>
            <div class="actions">
                <button onclick="deleteModuleDoc(${d.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Remover</button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function deleteModuleDoc(docId) {
    if (!confirm('Excluir documento?')) return;
    await apiCall(`/modules/${currentModuleId}/documents/${docId}`, 'DELETE');
    await loadModuleData(currentModuleId);
}

async function showAddDocForm() {
    let allDocs = [];
    let selectedDocId = null;
    let currentFilter = 'all';

    const fetchDocs = async () => {
        const res = await apiCall('/api/documents');
        allDocs = res.documents || [];
    };

    const renderGridMini = (filter) => {
        const grid = document.getElementById('doc-grid-mini');
        if (!grid) return;
        
        grid.innerHTML = '';
        const filtered = allDocs.filter(d => {
            if (filter === 'all') return true;
            const type = d.type.toLowerCase();
            if (filter === 'image') return type.startsWith('image/');
            if (filter === 'video') return type.startsWith('video/');
            if (filter === 'pdf') return type === 'application/pdf';
            if (filter === 'word') return type.includes('msword') || type.includes('officedocument.wordprocessingml');
            return false;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum arquivo encontrado.</div>';
            return;
        }

        filtered.forEach(doc => {
            const item = document.createElement('div');
            item.className = `doc-item-mini ${selectedDocId == doc.id ? 'selected' : ''}`;
            
            let icon = '📄';
            if (doc.type.startsWith('image/')) icon = '🖼️';
            else if (doc.type.startsWith('video/')) icon = '🎬';
            else if (doc.type === 'application/pdf') icon = '📕';
            else if (doc.type.includes('word')) icon = '📘';

            item.innerHTML = `
                <div class="thumb">${icon}</div>
                <div class="title" title="${doc.name}">${doc.name}</div>
            `;
            item.onclick = () => {
                selectedDocId = doc.id;
                document.querySelectorAll('.doc-item-mini').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                const titleIn = document.getElementById('d-title-in');
                if (!titleIn.value) titleIn.value = doc.name;
            };
            grid.appendChild(item);
        });
    };

    showSubModal('Vincular Documento', `
        <div class="doc-selector-container">
            <div class="input-group">
                <label>Título de Exibição</label>
                <input type="text" id="d-title-in" placeholder="Ex: Guia de Estudo PDF">
            </div>

            <div class="modal-tabs" style="margin-bottom: 1rem;">
                <button class="inner-tab-btn active" id="tab-doc-upload" onclick="toggleDocSelectorMode('upload')">Novo Upload</button>
                <button class="inner-tab-btn" id="tab-doc-library" onclick="toggleDocSelectorMode('library')">Minha Biblioteca</button>
            </div>

            <div id="mode-doc-upload" class="selector-mode-pane">
                <div class="upload-dropzone" onclick="document.getElementById('d-file-hidden').click()">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p id="upload-status-text">Clique para selecionar um arquivo</p>
                    <input type="file" id="d-file-hidden" class="hidden">
                </div>
            </div>

            <div id="mode-doc-library" class="selector-mode-pane hidden">
                <div class="doc-tabs">
                    <button class="doc-tab active" data-filter="all">Tudo</button>
                    <button class="doc-tab" data-filter="image">Imagens</button>
                    <button class="doc-tab" data-filter="video">Vídeos</button>
                    <button class="doc-tab" data-filter="pdf">PDF</button>
                    <button class="doc-tab" data-filter="word">Word</button>
                </div>
                <div id="doc-grid-mini" class="doc-grid-mini" style="max-height: 250px; overflow-y: auto;">
                    <!-- Grid items -->
                </div>
            </div>
        </div>
    `, async () => {
        const title = document.getElementById('d-title-in').value;
        if (!title || !selectedDocId) {
            alert('Por favor, preencha o título e selecione ou suba um arquivo.');
            return;
        }
        await apiCall(`/modules/${currentModuleId}/documents`, 'POST', { 
            title, 
            documentId: selectedDocId, 
            order: currentModuleData.documents.length 
        });
        await loadModuleData(currentModuleId);
        closeSubModal();
    });

    // Modal interaction logic
    window.toggleDocSelectorMode = (mode) => {
        document.getElementById('mode-doc-upload').classList.toggle('hidden', mode !== 'upload');
        document.getElementById('mode-doc-library').classList.toggle('hidden', mode !== 'library');
        document.getElementById('tab-doc-upload').classList.toggle('active', mode === 'upload');
        document.getElementById('tab-doc-library').classList.toggle('active', mode === 'library');
        if (mode === 'library') {
            fetchDocs().then(() => renderGridMini(currentFilter));
        }
    };

    setTimeout(() => {
        const fileHidden = document.getElementById('d-file-hidden');
        const statusText = document.getElementById('upload-status-text');

        // Document Tabs click
        document.querySelectorAll('.doc-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderGridMini(currentFilter);
            };
        });

        fileHidden.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            statusText.textContent = 'Enviando...';
            try {
                const formData = new FormData();
                formData.append('document', file);
                const res = await fetch(`${API_URL}/api/documents/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getToken()}` },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');
                
                selectedDocId = data.id;
                statusText.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> ${file.name} (Pronto)`;
                const titleIn = document.getElementById('d-title-in');
                if (!titleIn.value) titleIn.value = file.name;
            } catch (err) {
                alert('Erro no upload: ' + err.message);
                statusText.textContent = 'Clique para selecionar um arquivo';
            }
        };
    }, 100);
}


// Quiz Management Logic
function renderQuizList() {
    const list = document.getElementById('q-list');
    list.innerHTML = '';
    currentModuleData.questions.forEach((q, qIndex) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <strong>Pergunta ${qIndex + 1}</strong>
                <button onclick="deleteQuestion(${q.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Exclusão</button>
            </div>
            <p style="margin-bottom: 1rem; color: #fff;">${q.text}</p>
            <div class="options-list">
                ${q.options.map(o => `
                    <div class="option-item">
                        <i class="fas ${o.isCorrect ? 'fa-check-circle' : 'fa-circle'}" style="color: ${o.isCorrect ? 'var(--success)' : 'rgba(255,255,255,0.2)'};"></i>
                        <span>${o.text}</span>
                    </div>
                `).join('')}
            </div>
        `;
        list.appendChild(card);
    });
}

async function addQuizQuestion() {
    showSubModal('Nova Pergunta', `
        <div class="input-group">
            <label>Texto da Pergunta</label>
            <textarea id="q-text-in" class="glassmorphism" style="width: 100%; border-radius: 8px; padding: 0.8rem; color: white; background: rgba(0,0,0,0.2);"></textarea>
        </div>
        <div id="options-in-list" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
            <label>Opções (Marque a correta):</label>
            ${[0,1,2,3].map(i => `
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="radio" name="correct-opt" value="${i}" ${i === 0 ? 'checked' : ''}>
                    <input type="text" class="opt-text-in-field" style="flex: 1; padding: 0.5rem;" placeholder="Opção ${i + 1}">
                </div>
            `).join('')}
        </div>
    `, async () => {
        const text = document.getElementById('q-text-in').value;
        const optElements = document.querySelectorAll('.opt-text-in-field');
        const correctIndex = parseInt(document.querySelector('input[name="correct-opt"]:checked').value);
        
        const options = Array.from(optElements).map((el, index) => ({
            text: el.value,
            isCorrect: index === correctIndex
        })).filter(o => o.text.trim() !== '');

        await apiCall(`/modules/${currentModuleId}/quiz/questions`, 'POST', { 
            text, 
            options,
            order: currentModuleData.questions.length 
        });
        await loadModuleData(currentModuleId);
        closeSubModal();
    });
}

async function deleteQuestion(id) {
    if (!confirm('Excluir pergunta?')) return;
    await apiCall(`/modules/${currentModuleId}/quiz/questions/${id}`, 'DELETE');
    await loadModuleData(currentModuleId);
}

// Analytics and Reports
async function loadModuleReports(id) {
    try {
        const overview = await apiCall(`/modules/${id}/reports/overview`);
        const users = await apiCall(`/modules/${id}/reports/users`);

        // Render Stats
        const statsEl = document.getElementById('r-stats');
        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${overview.uniqueUsers}</div>
                <div class="stat-label">Alunos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${overview.totalAccesses}</div>
                <div class="stat-label">Acessos Totais</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${overview.averageScore.toFixed(1)}%</div>
                <div class="stat-label">Média Quiz</div>
            </div>
        `;

        // Render User Table
        const tbody = document.getElementById('r-users-body');
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.username}</td>
                <td>${u.videoProgress} aulas</td>
                <td>${u.lastScore !== null ? u.lastScore + '%' : '-'}</td>
                <td><button onclick="viewUserDetail(${u.id})" class="btn btn-secondary btn-sm">Detalhes</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

async function viewUserDetail(userId) {
    const report = await apiCall(`/modules/${currentModuleId}/reports/users/${userId}`);
    
    // Show detailed logs in sub-modal
    const content = `
        <div style="font-size: 0.9rem;">
            <h5>Acessos</h5>
            <div style="max-height: 150px; overflow-y: auto; margin-bottom: 1rem;">
                ${report.accessLogs.map(l => `<div>[${new Date(l.timestamp).toLocaleString()}] ${l.source}</div>`).join('')}
            </div>
            <h5>Quizzes</h5>
            <div>
                ${report.quizSubmissions.map(s => `<div>Pontuação: ${s.score}% (Tentativa ${s.attemptNumber}) em ${new Date(s.createdAt).toLocaleDateString()}</div>`).join('')}
            </div>
        </div>
    `;
    showSubModal('Relatório Detalhado', content, () => closeSubModal());
}

// Sub Modal Helpers
function showSubModal(title, bodyHtml, onOk) {
    const modal = document.getElementById('sub-modal');
    document.getElementById('sub-modal-title').textContent = title;
    document.getElementById('sub-modal-body').innerHTML = bodyHtml;
    document.getElementById('sub-modal-ok').onclick = onOk;
    modal.classList.remove('hidden');
}

function closeSubModal() {
    document.getElementById('sub-modal').classList.add('hidden');
}
