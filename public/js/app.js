const API_URL = ''; // Same origin

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

function setToken(token) {
    localStorage.setItem('auth_token', token);
}

function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/index.html';
}

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
        document.getElementById('profile-id').textContent = user.id;
        
        const roleBadge = document.getElementById('profile-role');
        roleBadge.textContent = user.role;
        roleBadge.dataset.role = user.role;

        // If user is ADMIN or MASTER, load admin panel
        if (user.role === 'ADMIN' || user.role === 'MASTER') {
            await loadAdminPanel();

            if (user.role === 'MASTER') {
                const btnReset = document.getElementById('btn-reset-db');
                if (btnReset) btnReset.classList.remove('hidden');
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
    const tbody = document.getElementById('docs-table-body');
    if (!tbody) return;

    try {
        const res = await apiCall('/api/documents');
        const docs = res.documents;

        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No documents shared yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        docs.forEach(doc => {
            const date = new Date(doc.createdAt).toLocaleDateString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${doc.name}</strong></td>
                <td>${date}</td>
                <td>
                    <button onclick="downloadDocument(${doc.id}, '${doc.name}')" class="btn btn-secondary btn-sm">Download</button>
                    <button onclick="deleteDocument(${doc.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" style="color: var(--error); text-align: center;">Error: ${err.message}</td></tr>`;
    }
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
