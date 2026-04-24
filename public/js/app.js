const API_URL = ''; // Same origin
console.log("🚀 App Loaded v2.5 - Email Verification Active");
const APP_CONFIG = window.__APP_CONFIG__ || {};
const MULTIPLAYER_URL = APP_CONFIG.multiplayerUrl || resolveLocalMultiplayerUrl();
const DEFAULT_PROFILE_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%2316213e'/%3E%3Ccircle cx='60' cy='44' r='24' fill='%235ec8f8'/%3E%3Cpath d='M20 108c7-23 23-34 40-34s33 11 40 34' fill='%235ec8f8'/%3E%3C/svg%3E";

window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global Error:", message, "at", source, ":", lineno);
    // alert("Erro de Sistema: " + message + " (Linha " + lineno + ")");
    return false;
};

// SYNC_CHECK: 24/03/2026 16:40

function resolveLocalMultiplayerUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:3001`;
    }

    return '';
}

// --- UI Helpers ---
async function openModuleEditor(id = null) {
    console.log('Opening module editor for ID:', id);
    const modal = document.getElementById('module-editor-modal');
    const title = document.getElementById('editor-title');
    if (!modal || !title) {
        console.error('Module editor elements not found!');
        return;
    }

    currentModuleId = id;

    const btnDel = document.getElementById('btn-delete-module-editor');
    if (btnDel) {
        if (id) {
            btnDel.classList.remove('hidden');
            btnDel.onclick = () => deleteModule(id);
        } else {
            btnDel.classList.add('hidden');
        }
    }

    if (!id) {
        title.textContent = 'Create New Module';
        const form = document.getElementById('module-basics-form');
        if (form) form.reset();
        const tabs = document.getElementById('editor-tabs');
        if (tabs) tabs.classList.add('hidden');
        modal.classList.remove('hidden');
        return;
    }

    title.textContent = 'Configure Module Content';
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'block'; // Force show
        modal.style.opacity = '1';
    }
    await loadModuleData(id);
    switchEditorTab('basics');
}
window.openModuleEditor = openModuleEditor;

function showMessage(elementId, message, isError = false) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${isError ? 'message-error' : 'message-success'}`;
    setTimeout(() => { el.textContent = ''; }, 5000);
}

function setAuthTabState(activeTab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab-${activeTab}`);
    if (targetBtn) targetBtn.classList.add('active');
}

function activateAuthSection(sectionId, activeTab = 'login') {
    document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));
    setAuthTabState(activeTab);
    document.getElementById(sectionId)?.classList.add('active');
}

function switchTab(tab) {
    activateAuthSection(`${tab}-form`, tab);
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

/**
 * Redireciona para o projeto Multiplayer passando o token atual
 */
function goToMultiplayer(courseId = null) {
    const token = getToken();
    if (!token) {
        alert('You need to be logged in to access the 3D world.');
        return;
    }

    if (!MULTIPLAYER_URL) {
        alert('The 3D world URL is not configured in this environment.');
        return;
    }

    const targetUrl = new URL(MULTIPLAYER_URL);
    targetUrl.searchParams.set('token', token);
    if (courseId) {
        targetUrl.searchParams.set('courseId', String(courseId));
    }

    window.open(targetUrl.toString(), '_blank');
}
window.goToMultiplayer = goToMultiplayer;
window.getCurrentIdentity = () => currentIdentity;

let currentVerifyEmail = '';
let currentIdentity = null;
let currentPortfolioItems = [];
let currentNotificationsSummary = null;

const PRIORITY_LABELS = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
};

function formatRoleLabel(role) {
    return String(role || 'GUEST')
        .toLowerCase()
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function hasAnyRole(user, roles) {
    const userRoles = new Set([
        ...(user?.roles || []),
        user?.primaryRole,
        user?.legacyRole,
        user?.role
    ].filter(Boolean));

    return roles.some(role => userRoles.has(role));
}

function fillInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
}

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.checked = Boolean(value);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDateLabel(value) {
    if (!value) return 'No due date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No due date';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function renderEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="empty-state-inline">${escapeHtml(message)}</div>`;
}

function renderOperationItems(containerId, items, renderer, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
        renderEmptyState(containerId, emptyMessage);
        return;
    }

    container.innerHTML = items.map(renderer).join('');
}

function renderNotificationItem(item) {
    const statusTag = item.status === 'UNREAD' ? '<span class="operation-tag priority-medium">Unread</span>' : '<span class="operation-tag">Read</span>';
    const actionLink = item.actionUrl ? `<a class="operation-link" href="${escapeHtml(item.actionUrl)}">Abrir</a>` : '';
    const readAction = item.status === 'UNREAD'
        ? `<button type="button" class="btn btn-secondary btn-sm" onclick="markNotificationRead(${Number(item.id)})">Mark as read</button>`
        : '';

    return `
        <article class="operation-item ${item.status === 'UNREAD' ? 'is-unread' : ''}">
            <div class="operation-item-head">
                <div>
                    <h5>${escapeHtml(item.title)}</h5>
                    <p>${escapeHtml(item.message)}</p>
                </div>
                ${statusTag}
            </div>
            <div class="operation-item-footer">
                <div class="operation-meta-row">
                    <span class="operation-tag priority-${String(item.priority || 'LOW').toLowerCase()}">${escapeHtml(PRIORITY_LABELS[item.priority] || item.priority || 'Low')}</span>
                    <span class="operation-tag">${escapeHtml(formatDateLabel(item.createdAt))}</span>
                    <span class="operation-tag">${escapeHtml(item.type || 'SYSTEM')}</span>
                </div>
                <div class="operation-actions">
                    ${actionLink}
                    ${readAction}
                </div>
            </div>
        </article>
    `;
}

function renderTaskQueueItem(item) {
    const statusAction = item.status === 'IN_PROGRESS'
        ? `<button type="button" class="btn btn-secondary btn-sm" onclick="updateTaskQueueItemStatus(${Number(item.id)}, 'COMPLETED')">Complete</button>`
        : `<button type="button" class="btn btn-secondary btn-sm" onclick="updateTaskQueueItemStatus(${Number(item.id)}, 'IN_PROGRESS')">Start</button>`;

    return `
        <article class="operation-item ${item.priority === 'CRITICAL' ? 'is-urgent' : ''}">
            <div class="operation-item-head">
                <div>
                    <h5>${escapeHtml(item.title)}</h5>
                    <p>${escapeHtml(item.summary || 'No operational summary.')}</p>
                </div>
                <span class="operation-tag priority-${String(item.priority || 'LOW').toLowerCase()}">${escapeHtml(PRIORITY_LABELS[item.priority] || item.priority || 'Low')}</span>
            </div>
            <div class="operation-item-footer">
                <div class="operation-meta-row">
                    <span class="operation-tag">${escapeHtml(item.bucket || 'TODAY')}</span>
                    <span class="operation-tag">${escapeHtml(formatDateLabel(item.dueAt || item.scheduledFor))}</span>
                </div>
                <div class="operation-actions">
                    ${item.actionUrl ? `<a class="operation-link" href="${escapeHtml(item.actionUrl)}">Abrir</a>` : ''}
                    ${statusAction}
                    <button type="button" class="btn btn-secondary btn-sm" onclick="updateTaskQueueItemStatus(${Number(item.id)}, 'DISMISSED')">Dismiss</button>
                </div>
            </div>
        </article>
    `;
}

function renderReminderItem(item) {
    return `
        <article class="operation-item">
            <div class="operation-item-head">
                <div>
                    <h5>${escapeHtml(item.title)}</h5>
                    <p>${escapeHtml(item.description || 'Internal reminder with no additional description.')}</p>
                </div>
                <span class="operation-tag priority-${String(item.priority || 'LOW').toLowerCase()}">${escapeHtml(PRIORITY_LABELS[item.priority] || item.priority || 'Low')}</span>
            </div>
            <div class="operation-item-footer">
                <div class="operation-meta-row">
                    <span class="operation-tag">${escapeHtml(formatDateLabel(item.dueAt))}</span>
                    <span class="operation-tag">${escapeHtml(item.type || 'SYSTEM_REMINDER')}</span>
                </div>
                <div class="operation-actions">
                    ${item.actionUrl ? `<a class="operation-link" href="${escapeHtml(item.actionUrl)}">Abrir</a>` : ''}
                    <button type="button" class="btn btn-secondary btn-sm" onclick="updateReminderStatus(${Number(item.id)}, 'COMPLETED')">Complete</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="updateReminderStatus(${Number(item.id)}, 'DISMISSED')">Dismiss</button>
                </div>
            </div>
        </article>
    `;
}

function renderNotificationsSummary(summary) {
    currentNotificationsSummary = summary;
    document.getElementById('ops-unread-count').textContent = `${summary.counts.unread} unread`;
    document.getElementById('ops-urgent-count').textContent = `${summary.counts.urgent} urgent`;
    document.getElementById('ops-inbox-meta').textContent = `${summary.inbox.length} itens`;
    document.getElementById('ops-today-meta').textContent = `${summary.operational.today.length} pending`;
    document.getElementById('ops-urgent-meta').textContent = `${summary.operational.urgent.length} blocked`;
    document.getElementById('ops-week-meta').textContent = `${summary.weeklyGoals.length} goals`;
    document.getElementById('ops-reminders-meta').textContent = `${summary.reminders.length} reminders`;

    renderOperationItems('notifications-inbox', summary.inbox, renderNotificationItem, 'No notifications yet.');
    renderOperationItems('operations-today', summary.operational.today, renderTaskQueueItem, 'Nothing planned for today.');
    renderOperationItems('operations-urgent', summary.operational.urgent, renderTaskQueueItem, 'Sem urgent no momento.');
    renderOperationItems('operations-week', summary.weeklyGoals, renderTaskQueueItem, 'No operational goals yet this week.');
    renderOperationItems('operations-reminders', summary.reminders, renderReminderItem, 'No open automatic reminders.');
}

async function loadNotificationsSummary() {
    const summary = await apiCall('/api/notifications/summary');
    renderNotificationsSummary(summary);
    return summary;
}

async function markNotificationRead(id) {
    await apiCall(`/api/notifications/${id}/read`, 'PATCH');
    await loadNotificationsSummary();
}
window.markNotificationRead = markNotificationRead;

async function markAllNotificationsRead() {
    await apiCall('/api/notifications/read-all', 'PATCH');
    await loadNotificationsSummary();
}
window.markAllNotificationsRead = markAllNotificationsRead;

async function updateTaskQueueItemStatus(id, status) {
    await apiCall(`/api/tasks/${id}`, 'PATCH', { status });
    await loadNotificationsSummary();
}
window.updateTaskQueueItemStatus = updateTaskQueueItemStatus;

async function updateReminderStatus(id, status) {
    await apiCall(`/api/reminders/${id}`, 'PATCH', { status });
    await loadNotificationsSummary();
}
window.updateReminderStatus = updateReminderStatus;

function showPasswordRequestSection(email = '') {
    fillInputValue('password-request-email', email);
    showMessage('password-request-message', '');
    const debugEl = document.getElementById('password-request-debug');
    if (debugEl) debugEl.textContent = '';
    activateAuthSection('password-request-form', 'login');
}

function showPasswordResetSection({ token = '', email = '', debugText = '' } = {}) {
    fillInputValue('password-reset-token', token);
    fillInputValue('password-reset-email', email);
    fillInputValue('password-reset-password', '');
    fillInputValue('password-reset-confirm', '');
    const debugEl = document.getElementById('password-reset-debug');
    if (debugEl) debugEl.textContent = debugText;
    activateAuthSection('password-reset-form', 'login');
}

function applyPasswordResetTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    const email = params.get('email') || '';

    if (resetToken) {
        showPasswordResetSection({ token: resetToken, email });
    }
}

function showVerificationSection(email) {
    currentVerifyEmail = email;
    activateAuthSection('verify-section', 'login');
    const emailEl = document.getElementById('display-verify-email');
    if (emailEl) emailEl.textContent = email;
    showMessage('verify-message', '');
    fillInputValue('verify-code', '');
    const debugCodeEl = document.getElementById('verify-debug-code');
    if (debugCodeEl) debugCodeEl.textContent = '';
}

function renderIdentityState(identity) {
    if (!identity || !identity.user) return;

    currentIdentity = identity;
    currentPortfolioItems = identity.portfolio || [];

    const user = identity.user;
    const profile = identity.profile || {};
    const preferences = identity.preferences || {};
    const consents = identity.consents || {};

    const displayName = profile.displayName || user.displayName || user.username;
    const rolesText = (user.roles || []).map(formatRoleLabel).join(' • ') || formatRoleLabel(user.primaryRole || user.role);
    const roleBadge = document.getElementById('profile-role');

    document.getElementById('nav-user-badge').textContent = `Hello, ${displayName}`;
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-id').textContent = `#${user.id}`;
    document.getElementById('profile-display-name-heading').textContent = displayName;
    document.getElementById('profile-display-name').textContent = displayName;
    document.getElementById('profile-headline-display').textContent = profile.headline || 'Add a headline to contextualize your role in the ecosystem.';
    document.getElementById('profile-roles-list').textContent = rolesText;
    document.getElementById('profile-language').textContent = preferences.language || 'pt-BR';

    if (roleBadge) {
        roleBadge.innerText = formatRoleLabel(user.primaryRole || user.role);
        roleBadge.className = `role-badge role-${String(user.primaryRole || user.role).toLowerCase()}`;
    }

    const profileDisplay = document.getElementById('profile-picture-display');
    if (profileDisplay) {
        console.log("Loading profile picture:", user.profilePicture);
        profileDisplay.src = user.profilePicture || DEFAULT_PROFILE_AVATAR;
    }

    fillInputValue('profile-display-name-input', profile.displayName || '');
    fillInputValue('profile-headline-input', profile.headline || '');
    fillInputValue('profile-bio-input', profile.bio || '');
    fillInputValue('profile-interests-input', (profile.interests || []).join(', '));
    fillInputValue('profile-skills-input', (profile.skills || []).join(', '));
    fillInputValue('profile-languages-input', (profile.spokenLanguages || []).join(', '));
    fillInputValue('profile-organization-input', profile.organization || '');
    fillInputValue('profile-course-input', profile.course || '');
    fillInputValue('profile-location-input', profile.location || '');
    fillInputValue('profile-timezone-input', profile.timezone || '');
    fillInputValue('profile-website-input', profile.websiteUrl || '');
    fillInputValue('profile-linkedin-input', profile.linkedinUrl || '');
    fillInputValue('profile-github-input', profile.githubUrl || '');

    fillInputValue('preference-language-input', preferences.language || 'pt-BR');
    fillInputValue('preference-theme-input', preferences.theme || 'system');
    setCheckboxValue('pref-email-notifications', preferences.emailNotifications);
    setCheckboxValue('pref-allow-direct-messages', preferences.allowDirectMessages);
    setCheckboxValue('pref-reduce-motion', preferences.reduceMotion);
    setCheckboxValue('pref-high-contrast', preferences.highContrast);

    setCheckboxValue('consent-terms-input', consents.termsAndPrivacy?.granted);
    setCheckboxValue('consent-marketing-input', consents.marketingEmails?.granted ?? preferences.marketingEmails);
    setCheckboxValue('consent-discovery-input', consents.profileDiscovery?.granted ?? preferences.allowProfileDiscovery);
    setCheckboxValue('consent-world-profile-input', consents.worldProfileCard?.granted ?? preferences.showProfileInWorld);

    const termsStatus = consents.termsAndPrivacy?.granted
        ? `Accepted in version ${consents.termsAndPrivacy.version}`
        : 'Pendente';
    document.getElementById('consent-terms-status').textContent = termsStatus;

    renderPortfolioItems();
}

function renderPortfolioItems() {
    const container = document.getElementById('portfolio-list');
    if (!container) return;

    if (!currentPortfolioItems.length) {
        container.innerHTML = '<div class="identity-empty">No portfolio items added yet.</div>';
        return;
    }

    container.innerHTML = currentPortfolioItems.map(item => `
        <article class="portfolio-item">
            <div class="portfolio-item-header">
                <div>
                    <h4>${item.title}</h4>
                    <p>${formatRoleLabel(item.itemType || 'LINK')}</p>
                </div>
                ${item.highlight ? '<span class="portfolio-highlight">Destaque</span>' : ''}
            </div>
            <p class="portfolio-description">${item.description || 'No description.'}</p>
            ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a>` : ''}
            <div class="portfolio-actions">
                <button type="button" class="btn btn-secondary btn-sm" onclick="editPortfolioItem(${item.id})">Edit</button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="deletePortfolioItemEntry(${item.id})">Delete</button>
            </div>
        </article>
    `).join('');
}

async function editPortfolioItem(id) {
    const item = currentPortfolioItems.find(entry => entry.id === id);
    if (!item) {
        alert('Portfolio item not found.');
        return;
    }

    const title = prompt('Item title', item.title);
    if (title === null) return;

    const url = prompt('URL do item', item.url || '');
    if (url === null) return;

    const description = prompt('Item description', item.description || '');
    if (description === null) return;

    const itemType = prompt('Tipo do item (PROJECT, LINK, CERTIFICATE...)', item.itemType || 'LINK');
    if (itemType === null) return;

    try {
        await apiCall(`/api/profile/portfolio/${id}`, 'PUT', {
            title,
            url,
            description,
            itemType
        });
        await refreshIdentityState();
        showMessage('portfolio-message', 'Portfolio item updated.', false);
    } catch (error) {
        showMessage('portfolio-message', error.message, true);
    }
}

async function deletePortfolioItemEntry(id) {
    if (!confirm('Do you want to remove this portfolio item?')) return;

    try {
        await apiCall(`/api/profile/portfolio/${id}`, 'DELETE');
        await refreshIdentityState();
        showMessage('portfolio-message', 'Portfolio item removed.', false);
    } catch (error) {
        showMessage('portfolio-message', error.message, true);
    }
}

// Verification Logic
const btnVerify = document.getElementById('btn-verify-code');
if (btnVerify) {
    btnVerify.addEventListener('click', async () => {
        const code = document.getElementById('verify-code').value.trim();
        if (!code) return;

        try {
            btnVerify.disabled = true;
            btnVerify.textContent = 'Verifying...';
            
            await apiCall('/auth/verify-email', 'POST', { email: currentVerifyEmail, code });
            
            showMessage('verify-message', 'Account verified! Redirecting to login...', false);
            fillInputValue('login-email', currentVerifyEmail);
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        } catch (error) {
            showMessage('verify-message', error.message, true);
        } finally {
            btnVerify.disabled = false;
            btnVerify.textContent = 'Verify Account';
        }
    });
}

const btnResend = document.getElementById('btn-resend-code');
if (btnResend) {
    btnResend.addEventListener('click', async () => {
        try {
            btnResend.disabled = true;
            btnResend.textContent = 'Sending...';
            const response = await apiCall('/auth/resend-code', 'POST', { email: currentVerifyEmail });
            showMessage('verify-message', 'Code resent! Please check your email.', false);
            const debugCodeEl = document.getElementById('verify-debug-code');
            if (debugCodeEl) {
                debugCodeEl.textContent = response.debugVerificationCode
                    ? `Local test code: ${response.debugVerificationCode}`
                    : '';
            }
        } catch (error) {
            showMessage('verify-message', error.message, true);
        } finally {
            btnResend.disabled = false;
            btnResend.textContent = 'Resend Code';
        }
    });
}

const btnForgotPassword = document.getElementById('btn-forgot-password');
if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', () => {
        showPasswordRequestSection(document.getElementById('login-email')?.value || '');
    });
}

const passwordRequestForm = document.getElementById('password-request-form');
if (passwordRequestForm) {
    passwordRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('password-request-email').value.trim();
        const submitButton = passwordRequestForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            const response = await apiCall('/auth/password/request', 'POST', { email });
            showMessage('password-request-message', response.message || 'Password reset instructions sent.', false);

            if (response.debugResetToken) {
                showPasswordResetSection({
                    token: response.debugResetToken,
                    email,
                    debugText: `Token local de teste: ${response.debugResetToken}`
                });
            }
        } catch (error) {
            showMessage('password-request-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Link';
        }
    });
}

const passwordResetForm = document.getElementById('password-reset-form');
if (passwordResetForm) {
    passwordResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = document.getElementById('password-reset-token').value.trim();
        const password = document.getElementById('password-reset-password').value;
        const confirmPassword = document.getElementById('password-reset-confirm').value;
        const submitButton = passwordResetForm.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            showMessage('password-reset-message', 'Passwords do not match.', true);
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Resetting...';
            await apiCall('/auth/password/reset', 'POST', { token, password });
            showMessage('password-reset-message', 'Password updated successfully. Redirecting to login...', false);
            setTimeout(() => {
                switchTab('login');
            }, 1800);
        } catch (error) {
            showMessage('password-reset-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Reset Password';
        }
    });
}

applyPasswordResetTokenFromUrl();

// --- Advanced Asset State ---
let currentAssetTab = 'image';
let personalAssets = [];
let currentFilteredAssets = [];
let currentIndex = -1;

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const apiBaseUrl = APP_CONFIG.apiBaseUrl || API_URL;
    const response = await fetch(`${apiBaseUrl}${endpoint}`, options);
    const contentType = response.headers.get('content-type') || '';
    const rawBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    const data = typeof rawBody === 'string'
        ? (rawBody ? { message: rawBody } : {})
        : rawBody;
    
    if (!response.ok) {
        const errorMessage =
            typeof data.error === 'string'
                ? data.error
                : typeof data.message === 'string'
                    ? data.message
                    : 'Unexpected request error';
        throw new Error(errorMessage);
    }

    return data;
}
window.apiCall = apiCall;

// Global Robust Listener for Module Creation
document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-create-module' || e.target.closest('#btn-create-module')) {
        console.log("Módulo creation button clicked");
        if (typeof openModuleEditor === 'function') {
            openModuleEditor();
        }
    }
});

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
            if (error.needsVerification) {
                showVerificationSection(error.email);
            } else {
                showMessage('login-message', error.message, true);
            }
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
        const acceptedTerms = document.getElementById('register-consent-terms')?.checked;
        const marketingEmails = document.getElementById('register-consent-marketing')?.checked;
        const btn = registerForm.querySelector('button');

        if (!acceptedTerms) {
            showMessage('register-message', 'You need to accept the terms and privacy policy.', true);
            return;
        }

        // SYNC_CHECK: 24/03/2026 16:40
        try {
            btn.textContent = 'Creating account...';
            btn.disabled = true;
            
            const res = await apiCall('/auth/register', 'POST', {
                username,
                email,
                password,
                consents: {
                    termsAndPrivacy: true,
                    marketingEmails: Boolean(marketingEmails)
                }
            });
            
            if (res.needsVerification) {
                showVerificationSection(email);
                const debugCodeEl = document.getElementById('verify-debug-code');
                if (debugCodeEl) {
                    debugCodeEl.textContent = res.debugVerificationCode
                        ? `Local test code: ${res.debugVerificationCode}`
                        : '';
                }
            } else {
                showMessage('register-message', 'Account created! Please log in.', false);
                setTimeout(() => switchTab('login'), 2000);
            }
            
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

let adminUsersCache = [];
const ASSIGNABLE_ROLE_OPTIONS = ['STUDENT', 'TEACHER', 'TUTOR', 'BUSINESS_MENTOR', 'COORDINATOR', 'ADMIN', 'GUEST', 'SUPER_ADMIN'];
let currentRoleModalUserId = null;

const markNotificationsReadButton = document.getElementById('btn-mark-notifications-read');
if (markNotificationsReadButton) {
    markNotificationsReadButton.addEventListener('click', async () => {
        try {
            markNotificationsReadButton.disabled = true;
            markNotificationsReadButton.textContent = 'Updating...';
            await markAllNotificationsRead();
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
            alert(error.message || 'Could not update the inbox.');
        } finally {
            markNotificationsReadButton.disabled = false;
            markNotificationsReadButton.textContent = 'Mark inbox as read';
        }
    });
}

async function refreshIdentityState() {
    const identity = await apiCall('/api/profile/me');
    renderIdentityState(identity);
    return identity;
}

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const identity = await refreshIdentityState();
        await loadNotificationsSummary();
        const user = identity.user;
        const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']) || user.role === 'ADMIN';
        const canManageModules = hasAnyRole(user, ['TEACHER', 'COORDINATOR', 'TUTOR', 'ADMIN', 'SUPER_ADMIN']) || user.role === 'MASTER';
        const canManageCourses = hasAnyRole(user, ['TEACHER', 'COORDINATOR', 'TUTOR', 'ADMIN', 'SUPER_ADMIN']) || user.role === 'MASTER';

        if (isAdmin || canManageModules) {
            await loadAdminPanel();

            if (canManageModules) {
                const btnReset = document.getElementById('btn-reset-db');
                if (btnReset) btnReset.classList.remove('hidden');
                document.getElementById('tab-modules').classList.remove('hidden');
                const tabLanding = document.getElementById('tab-landingPages');
                if (tabLanding) tabLanding.classList.remove('hidden');
                await loadModulesPanel();
            }
        }

        if (window.loadCoursesPanel) {
            await window.loadCoursesPanel({
                user,
                canManageCourses
            });
        }

        await loadUserDocuments();
    } catch (error) {
        console.error('Dashboard error:', error);
        if (error.message.includes('401') || error.message.includes('token') || error.message.includes('expired')) {
            alert('Session expired. Please log in again.');
            logout();
        } else {
            console.error('Critical Dashboard failure: ', error.message);
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
        adminUsersCache = users;
        
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
                <td>
                    <span class="role-badge" data-role="${u.primaryRole || u.role}">${formatRoleLabel(u.primaryRole || u.role)}</span>
                    <div class="admin-role-hint">${(u.roles || []).map(formatRoleLabel).join(', ') || formatRoleLabel(u.role)} • legado: ${u.legacyRole || u.role}</div>
                </td>
                <td>${date}</td>
                <td style="text-align: right;">
                    <button onclick="openUserRolesModal(${u.id})" class="btn btn-secondary btn-sm" style="padding: 4px 8px; margin-right: 6px;" title="Update Roles">
                        <i class="fas fa-user-shield"></i>
                    </button>
                    <button onclick="deleteUser(${u.id})" class="btn btn-secondary btn-sm" style="color: var(--error); border-color: rgba(239, 68, 68, 0.3); padding: 4px 8px;" title="Delete User">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="color: var(--error); text-align: center;">Failed to load users: ${error.message}</td></tr>`;
    }
}

const advancedProfileForm = document.getElementById('advanced-profile-form');
if (advancedProfileForm) {
    advancedProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = advancedProfileForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            const response = await apiCall('/api/profile/me', 'PUT', {
                displayName: document.getElementById('profile-display-name-input').value,
                headline: document.getElementById('profile-headline-input').value,
                bio: document.getElementById('profile-bio-input').value,
                interests: document.getElementById('profile-interests-input').value,
                skills: document.getElementById('profile-skills-input').value,
                spokenLanguages: document.getElementById('profile-languages-input').value,
                organization: document.getElementById('profile-organization-input').value,
                course: document.getElementById('profile-course-input').value,
                location: document.getElementById('profile-location-input').value,
                timezone: document.getElementById('profile-timezone-input').value,
                websiteUrl: document.getElementById('profile-website-input').value,
                linkedinUrl: document.getElementById('profile-linkedin-input').value,
                githubUrl: document.getElementById('profile-github-input').value
            });
            renderIdentityState(response);
            showMessage('advanced-profile-message', response.message || 'Profile updated.', false);
        } catch (error) {
            showMessage('advanced-profile-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Profile';
        }
    });
}

const preferencesForm = document.getElementById('preferences-form');
if (preferencesForm) {
    preferencesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = preferencesForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            const response = await apiCall('/api/profile/preferences', 'PUT', {
                language: document.getElementById('preference-language-input').value,
                theme: document.getElementById('preference-theme-input').value,
                emailNotifications: document.getElementById('pref-email-notifications').checked,
                allowDirectMessages: document.getElementById('pref-allow-direct-messages').checked,
                reduceMotion: document.getElementById('pref-reduce-motion').checked,
                highContrast: document.getElementById('pref-high-contrast').checked
            });
            renderIdentityState(response);
            showMessage('preferences-message', response.message || 'Preferences updated.', false);
        } catch (error) {
            showMessage('preferences-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Preferences';
        }
    });
}

const consentForm = document.getElementById('consent-form');
if (consentForm) {
    consentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = consentForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            const response = await apiCall('/api/profile/consents', 'PUT', {
                consents: {
                    termsAndPrivacy: document.getElementById('consent-terms-input').checked,
                    marketingEmails: document.getElementById('consent-marketing-input').checked,
                    profileDiscovery: document.getElementById('consent-discovery-input').checked,
                    worldProfileCard: document.getElementById('consent-world-profile-input').checked
                }
            });
            await refreshIdentityState();
            showMessage('consent-message', response.message || 'Consents updated.', false);
        } catch (error) {
            showMessage('consent-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Consents';
        }
    });
}

const portfolioForm = document.getElementById('portfolio-form');
if (portfolioForm) {
    portfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = portfolioForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Adicionando...';
            await apiCall('/api/profile/portfolio', 'POST', {
                title: document.getElementById('portfolio-title-input').value,
                itemType: document.getElementById('portfolio-type-input').value,
                url: document.getElementById('portfolio-url-input').value,
                description: document.getElementById('portfolio-description-input').value,
                highlight: document.getElementById('portfolio-highlight-input').checked
            });
            portfolioForm.reset();
            await refreshIdentityState();
            showMessage('portfolio-message', 'Portfolio item added.', false);
        } catch (error) {
            showMessage('portfolio-message', error.message, true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Item';
        }
    });
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to PERMANENTLY DELETE this user and ALL associated data? This action cannot be undone.')) return;
    try {
        const res = await apiCall('/api/users/' + id, 'DELETE');
        alert(res.message);
        await loadAdminPanel();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function openUserRolesModal(id) {
    const targetUser = adminUsersCache.find(user => user.id === id);
    if (!targetUser) {
        alert('User not found in the current cache.');
        return;
    }

    currentRoleModalUserId = id;
    const modal = document.getElementById('roles-modal');
    const options = document.getElementById('roles-modal-options');
    const meta = document.getElementById('roles-modal-user-meta');
    if (!modal || !options || !meta) return;

    const activeRoles = new Set(targetUser.roles || []);
    meta.textContent = `${targetUser.username} • ${targetUser.email}`;
    options.innerHTML = ASSIGNABLE_ROLE_OPTIONS.map((role) => `
        <label class="identity-toggle" style="padding:0.9rem; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
            <input type="checkbox" data-role-option="${role}" ${activeRoles.has(role) ? 'checked' : ''}>
            <span>${formatRoleLabel(role)}</span>
        </label>
    `).join('');

    modal.classList.remove('hidden');
}
window.openUserRolesModal = openUserRolesModal;

function closeUserRolesModal() {
    const modal = document.getElementById('roles-modal');
    if (modal) modal.classList.add('hidden');
    currentRoleModalUserId = null;
}
window.closeUserRolesModal = closeUserRolesModal;

async function saveUserRolesFromModal() {
    if (!currentRoleModalUserId) return;
    const selectedRoles = Array.from(document.querySelectorAll('[data-role-option]:checked')).map((input) => input.dataset.roleOption);
    if (!selectedRoles.length) {
        alert('Select at least one role.');
        return;
    }

    const saveButton = document.getElementById('btn-save-user-roles');
    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }
        const res = await apiCall(`/api/users/${currentRoleModalUserId}/roles`, 'PATCH', { roles: selectedRoles });
        alert(res.message || 'Roles updated successfully.');
        closeUserRolesModal();
        await Promise.all([loadAdminPanel(), refreshIdentityState()]);
    } catch (error) {
        alert('Error updating roles: ' + error.message);
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Roles';
        }
    }
}

async function promptUpdateUserRoles(id) {
    return openUserRolesModal(id);
}

async function resetDatabase() {
    const confirmation = confirm("ARE YOU ABSOLUTELY SURE?\n\nThis will delete ALL users in the system, leaving only your own MASTER account active. This action cannot be undone!");
    if (!confirmation) return;

    try {
        const btnReset = document.getElementById('btn-reset-db');
        const originalText = btnReset.textContent;
        btnReset.textContent = "Deleting...";
        btnReset.disabled = true;

        const res = await apiCall('/api/users/reset', 'POST');
        alert(res.message);
        
        // Recarrega a lista para mostrar que esvaziou
        await loadAdminPanel(); 

        btnReset.textContent = originalText;
        btnReset.disabled = false;
    } catch (err) {
        alert('Error resetting: ' + err.message);
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
            video.currentTime = 0.5;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas);
            video.src = ''; 
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
const nextBtn = document.getElementById('next-preview');
if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); nextPreview(); };

const prevBtn = document.getElementById('prev-preview');
if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); prevPreview(); };

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
        counter.textContent = `${modules.length} modules created`;
        
        const btnCreate = document.getElementById('btn-create-module');
        if (btnCreate) btnCreate.disabled = false;

        if (modules.length === 0) {
            modulesList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">You have not created any modules yet.</div>';
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
                    ${m.description || 'No description.'}
                </p>
                <div class="module-meta">
                    <span><i class="fas fa-video"></i> ${m._count.videos}</span>
                    <span><i class="fas fa-file-alt"></i> ${m._count.documents}</span>
                    <span><i class="fas fa-question-circle"></i> ${m._count.questions}</span>
                </div>
            `;
            card.onclick = () => selectModuleForPreview(m.id);
            // Also make it open editor on double click maybe? No, let's keep click for preview
            modulesList.appendChild(card);
        });
    } catch (error) {
        modulesList.innerHTML = `<div style="grid-column: 1/-1; color: var(--error); text-align: center;">Error loading modules: ${error.message}</div>`;
    }
}

function switchPreviewTab(pane) {
    document.querySelectorAll('.prev-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.pane === pane));
    document.querySelectorAll('.prev-pane').forEach(p => p.classList.toggle('active', p.id === `prev-pane-${pane}`));
}

function switchModuleDocTab(type) {
    // Reset all tabs
    document.querySelectorAll('.doc-sub-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-muted)';
        btn.style.borderBottomColor = 'transparent';
    });
    
    // Activate target tab (safe against missing data-type)
    const activeBtn = document.querySelector(`.doc-sub-tab[data-type="${type}"]`) || 
                      Array.from(document.querySelectorAll('.doc-sub-tab')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(type));
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--primary)';
        activeBtn.style.borderBottomColor = 'var(--primary)';
    }

    // Reset all panes
    document.querySelectorAll('.doc-sub-pane').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
        p.style.display = 'none';
        p.style.opacity = '0';
    });
    
    // Activate target pane
    const activePane = document.getElementById(`module-doc-pane-${type}`);
    if (activePane) {
        activePane.classList.remove('hidden');
        activePane.classList.add('active');
        activePane.style.display = 'block';
        setTimeout(() => activePane.style.opacity = '1', 10); // Trigger transition
    }
}
window.switchModuleDocTab = switchModuleDocTab;

async function selectModuleForPreview(moduleId) {
    const section = document.getElementById('module-preview-section');
    section.classList.remove('hidden');
    
    document.querySelectorAll('.module-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector(`.module-card[data-id="${moduleId}"]`);
    if (activeCard) activeCard.classList.add('active');

    try {
        const m = await apiCall(`/modules/${moduleId}/edit-format`);
        currentModuleId = moduleId;
        currentModuleData = m;
        
        document.getElementById('preview-title').textContent = m.title;
        
        // Video Preview (Grid with Thumbnails)
        const videoGrid = document.getElementById('preview-videos-summary');
        videoGrid.className = 'assets-grid'; // Ensure grid class
        videoGrid.innerHTML = '';
        
        if (m.videos.length === 0) {
            videoGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No videos added.</div>';
        } else {
            for (const v of m.videos) {
                const card = document.createElement('div');
                card.className = 'asset-card glassmorphism';
                const thumb = document.createElement('div');
                thumb.className = 'thumb-wrapper';
                
                // Use the same thumbnail logic as personal assets
                const videoThumb = await createVideoThumbnail(v.url);
                thumb.appendChild(videoThumb);
                
                const playIcon = document.createElement('div');
                playIcon.innerHTML = '<i class="fas fa-play"></i>';
                playIcon.style.cssText = 'position: absolute; color: white; font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));';
                thumb.appendChild(playIcon);

                const name = document.createElement('span');
                name.className = 'filename';
                name.innerText = v.title;

                card.appendChild(thumb);
                card.appendChild(name);
                videoGrid.appendChild(card);
            }
        }
            
        // Document Preview (Refactored for Sub-Tabs and Grid)
        const pdfList = document.getElementById('prev-pdf-list');
        const wordList = document.getElementById('prev-word-list');
        const imgGrid = document.getElementById('prev-img-grid');

        pdfList.innerHTML = '';
        wordList.innerHTML = '';
        imgGrid.innerHTML = '';

        m.documents.forEach(d => {
            const ext = d.title ? d.title.split('.').pop().toLowerCase() : '';
            const tType = (d.type || '').toLowerCase();
            
            const isPdf = tType === 'application/pdf' || ext === 'pdf';
            const isWord = tType.includes('word') || tType.includes('officedocument.wordprocessingml') || ['doc', 'docx'].includes(ext);
            const isImg = tType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
            
            if (isPdf) {
                const item = document.createElement('div');
                item.className = 'doc-col-item';
                item.innerHTML = `<i class="fas fa-file-pdf" style="color: #ff4444;"></i> <span>${d.title}</span>`;
                item.onclick = () => {
                    currentFilteredAssets = m.documents.filter(doc => {
                        const dExt = doc.title ? doc.title.split('.').pop().toLowerCase() : '';
                        const dType = (doc.type || '').toLowerCase();
                        return (dType === 'application/pdf' || dExt === 'pdf');
                    }).map(doc => ({ id: doc.documentId, name: doc.title, type: doc.type }));
                    
                    const idx = currentFilteredAssets.findIndex(doc => doc.id === d.documentId);
                    openMediaPreview(idx);
                };
                pdfList.appendChild(item);
            } else if (isWord) {
                const item = document.createElement('div');
                item.className = 'doc-col-item';
                item.innerHTML = `<i class="fas fa-file-word" style="color: #4488ff;"></i> <span>${d.title}</span>`;
                item.onclick = () => {
                    currentFilteredAssets = m.documents.filter(doc => {
                        const dExt = doc.title ? doc.title.split('.').pop().toLowerCase() : '';
                        const dType = (doc.type || '').toLowerCase();
                        return (dType.includes('word') || dType.includes('officedocument.wordprocessingml') || ['doc', 'docx'].includes(dExt));
                    }).map(doc => ({ id: doc.documentId, name: doc.title, type: doc.type }));
                    
                    const idx = currentFilteredAssets.findIndex(doc => doc.id === d.documentId);
                    openMediaPreview(idx);
                };
                wordList.appendChild(item);
            } else if (isImg) {
                const card = document.createElement('div');
                card.className = 'asset-card glassmorphism';
                card.style.cursor = 'pointer';
                const thumb = document.createElement('div');
                thumb.className = 'thumb-wrapper';
                const img = document.createElement('img');
                img.src = `${API_URL}/api/documents/download/${d.documentId}`;
                img.loading = 'lazy';
                thumb.appendChild(img);
                
                const name = document.createElement('span');
                name.className = 'filename';
                name.innerText = d.title;

                card.appendChild(thumb);
                card.appendChild(name);
                card.onclick = () => {
                    // Open preview context
                    currentFilteredAssets = m.documents.filter(doc => {
                        const dExt = doc.title ? doc.title.split('.').pop().toLowerCase() : '';
                        const dType = (doc.type || '').toLowerCase();
                        return dType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(dExt);
                    }).map(doc => ({ id: doc.documentId, name: doc.title, type: doc.type }));
                    
                    const idx = currentFilteredAssets.findIndex(doc => doc.id === d.documentId);
                    openMediaPreview(idx);
                };
                imgGrid.appendChild(card);
            }
        });

        [pdfList, wordList].forEach(list => {
            if (list.innerHTML === '') list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem;">Nenhum arquivo nesta categoria.</div>';
        });
        if (imgGrid.innerHTML === '') imgGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">Nenhuma imagem.</div>';
        
        // Default to PDF sub-tab
        switchModuleDocTab('pdf');
            
        // Quiz Preview
        renderQuizList();

        // Reports Preview Summary
        try {
            const overview = await apiCall(`/modules/${moduleId}/reports/overview`);
            document.getElementById('preview-reports-summary').innerHTML = `
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                    <div class="stat-card">
                        <div class="stat-value">${overview.uniqueUsers}</div>
                        <div class="stat-label">Alunos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="font-size: 1.5rem;">${overview.averageScore ? overview.averageScore.toFixed(1) : 0}%</div>
                        <div class="stat-label">Average</div>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('Report summary error:', e);
            document.getElementById('preview-reports-summary').innerHTML = 'Error loading reports.';
        }

        // Action Buttons
        const btnEdit = document.getElementById('btn-edit-preview');
        if (btnEdit) btnEdit.onclick = () => openModuleEditor(moduleId);

        // Direct Addition Buttons
        const btnAddVideo = document.getElementById('btn-add-video-direct');
        if (btnAddVideo) btnAddVideo.onclick = () => {
            currentModuleId = moduleId;
            showAddVideoForm();
        };

        const btnAddDoc = document.getElementById('btn-add-doc-direct');
        if (btnAddDoc) btnAddDoc.onclick = () => {
            currentModuleId = moduleId;
            showAddDocForm();
        };

        const btnAddQuiz = document.getElementById('btn-add-quiz-direct');
        if (btnAddQuiz) btnAddQuiz.onclick = () => {
            currentModuleId = moduleId;
            switchPreviewTab('quiz');
            showCreateQuizForm();
        };

        const btnAiQuiz = document.getElementById('btn-generate-ai-quiz-direct');
        if (btnAiQuiz) btnAiQuiz.onclick = () => {
            currentModuleId = moduleId;
            switchPreviewTab('quiz');
            showGenerateAiQuizForm(moduleId);
        };
        
        // Start on Videos tab by default
        switchPreviewTab('videos');
        
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        console.error('Preview error:', err);
    }
}

// Editor Modal Management
// Function handled at top or elsewhere

function closeModuleEditor() {
    document.getElementById('module-editor-modal').classList.add('hidden');
    // currentModuleId = null; // Don't nullify, might be using in preview
    // currentModuleData = null; 
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

        // Update Publish button in editor
        const btnPublish = document.getElementById('btn-publish-module');
        if (btnPublish) {
            const isPublished = currentModuleData.status === 'PUBLISHED';
            btnPublish.innerText = isPublished ? 'Desarquivar' : 'Publicar';
            btnPublish.className = isPublished ? 'btn btn-secondary' : 'btn btn-primary';
            btnPublish.onclick = async () => {
                await updateModuleStatus(id, isPublished ? 'DRAFT' : 'PUBLISHED');
                await loadModuleData(id); // Refresh editor
                alert(isPublished ? 'Module hidden!' : 'Module published!');
            };
        }
    } catch (error) {
        alert('Error loading module data: ' + error.message);
    }
}

// Module Basics Form
const mbForm = document.getElementById('module-basics-form');
if (mbForm) {
    mbForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        title: document.getElementById('m-title').value,
        description: document.getElementById('m-description').value,
        coverImage: document.getElementById('m-cover').value
    };

    try {
        if (currentModuleId) {
            await apiCall(`/modules/${currentModuleId}`, 'PUT', data);
            await loadModulesPanel();
            closeModuleEditor();
            alert('Module updated!');
        } else {
            const res = await apiCall('/modules', 'POST', data);
            currentModuleId = res.id;
            await loadModulesPanel();
            closeModuleEditor(); // Fixed: Close after create
            alert('Module created!');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
    });
}

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
    if (!confirm('Are you sure you want to permanently delete this module and all its content?')) return;
    try {
        await apiCall(`/modules/${id}`, 'DELETE');
        loadModulesPanel();
        
        // Close UI components
        closeModuleEditor();
        document.getElementById('module-preview-section').classList.add('hidden');
    } catch (error) {
        alert('Error deleting: ' + error.message);
    }
}

// Editor Tab Switcher
function switchEditorTab(tab) {
    document.querySelectorAll('.inner-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${tab}`));
}

document.querySelectorAll('#editor-tabs .inner-tab-btn').forEach(btn => {
    btn.onclick = () => switchEditorTab(btn.dataset.tab);
});

// --- Content Handlers (Videos, Docs, Quiz) ---

async function uploadAssetFile(file, progressLabel = 'Uploading...') {
    const formData = new FormData();
    formData.append('document', file);

    const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
    });

    let data = null;
    try {
        data = await res.json();
    } catch (err) {
        throw new Error(`${progressLabel} failed: server returned an invalid response.`);
    }

    if (!res.ok) throw new Error(data.error || `${progressLabel} failed`);
    return data;
}

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
                <button onclick="deleteVideo(${v.id})" class="btn btn-secondary btn-sm" style="color: var(--error);">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

async function showAddVideoForm() {
    showSubModal('Add Video', `
        <div class="input-group">
            <label>Video Title</label>
            <input type="text" id="v-title-in" placeholder="Ex: Aula 01 - Fundamentos">
        </div>
        <div class="input-group">
            <label>Video URL (YouTube/Vimeo/etc)</label>
            <input type="text" id="v-url-in" placeholder="https://...">
        </div>
        <div style="text-align: center; margin: 0.5rem 0; color: var(--text-muted); font-size: 0.8rem;">--- OU ---</div>
        <div class="input-group">
            <label>Video File Upload</label>
            <input type="file" id="v-file-in" accept="video/*" class="glassmorphism" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); color: white; border: 1px solid var(--surface-border); border-radius: 8px;">
        </div>
    `, async () => {
        const title = document.getElementById('v-title-in').value;
        const urlInput = document.getElementById('v-url-in').value;
        const fileInput = document.getElementById('v-file-in').files[0];
        const okBtn = document.getElementById('sub-modal-ok');
        
        let finalUrl = urlInput;

        if (fileInput) {
            okBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            okBtn.disabled = true;
            try {
                console.log('Finalizing video upload...');
                const data = await uploadAssetFile(fileInput, 'Video upload');
                finalUrl = data.downloadUrl || `/api/documents/download/${data.id}`;
            } catch (err) {
                console.error('Upload Error:', err);
                alert('Error uploading video: ' + err.message);
                okBtn.textContent = 'Confirm';
                okBtn.disabled = false;
                return;
            }
        }

        if (!finalUrl || !title) {
            alert('Please enter a title and a URL or select a file.');
            return;
        }

        try {
            const order = (currentModuleData && currentModuleData.videos) ? currentModuleData.videos.length : 0;
            await apiCall(`/modules/${currentModuleId}/videos`, 'POST', { title, url: finalUrl, order });
            await loadModuleData(currentModuleId);
            closeSubModal();
        } catch (err) {
            alert('Error saving video: ' + err.message);
        }
    });
}

async function deleteVideo(videoId) {
    if (!confirm('Delete video?')) return;
    await apiCall(`/modules/${currentModuleId}/videos/${videoId}`, 'DELETE');
    await loadModuleData(currentModuleId);
}

function renderDocList() {
    const list = document.getElementById('d-list');
    list.innerHTML = '';
    currentModuleData.documents.forEach(d => {
        const ext = d.title ? d.title.split('.').pop().toLowerCase() : '';
        const tType = (d.type || '').toLowerCase();
        
        const isPdf = tType === 'application/pdf' || ext === 'pdf';
        const isWord = tType.includes('word') || tType.includes('officedocument.wordprocessingml') || ['doc', 'docx'].includes(ext);
        const isImg = tType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        
        let iconHtml = '<i class="fas fa-file" style="color: var(--text-muted);"></i>';
        if (isPdf) iconHtml = '<i class="fas fa-file-pdf" style="color: #ff4444;"></i>';
        else if (isWord) iconHtml = '<i class="fas fa-file-word" style="color: #4488ff;"></i>';
        else if (isImg) iconHtml = '<i class="fas fa-file-image" style="color: #4CAF50;"></i>';
        else if (tType.startsWith('video/')) iconHtml = '<i class="fas fa-file-video" style="color: #ff9800;"></i>';

        const li = document.createElement('li');
        li.className = 'content-item';
        li.innerHTML = `
            <div class="content-info">
                ${iconHtml}
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
    if (!confirm('Delete documento?')) return;
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

    showSubModal('Link Document', `
        <div class="doc-selector-container">
            <div class="input-group">
                <label>Display Title</label>
                <input type="text" id="d-title-in" placeholder="Example: Study Guide PDF">
            </div>

            <div class="modal-tabs" style="margin-bottom: 1rem;">
                <button class="inner-tab-btn active" id="tab-doc-upload" onclick="toggleDocSelectorMode('upload')">New Upload</button>
                <button class="inner-tab-btn" id="tab-doc-library" onclick="toggleDocSelectorMode('library')">My Library</button>
            </div>

            <div id="mode-doc-upload" class="selector-mode-pane">
                <label class="upload-dropzone" for="d-file-hidden" style="display:block; position:relative; overflow:hidden;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p id="upload-status-text">Click to select a file</p>
                    <input type="file" id="d-file-hidden" style="position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                </label>
            </div>

            <div id="mode-doc-library" class="selector-mode-pane hidden">
                <div class="doc-tabs">
                    <button class="doc-tab active" data-filter="all">All</button>
                    <button class="doc-tab" data-filter="image">Images</button>
                    <button class="doc-tab" data-filter="video">Videos</button>
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
        const okBtn = document.getElementById('sub-modal-ok');
        console.log('Confirming document add:', { title, selectedDocId });
        
        if (!title || !selectedDocId) {
            alert('Por favor, preencha o título e selecione ou suba um arquivo.');
            return;
        }
        
        okBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        okBtn.disabled = true;

        const order = (currentModuleData && currentModuleData.documents) ? currentModuleData.documents.length : 0;
        try {
            await apiCall(`/modules/${currentModuleId}/documents`, 'POST', { 
                title, 
                documentId: selectedDocId, 
                order
            });
            await loadModuleData(currentModuleId);
            closeSubModal();
        } catch (err) {
            console.error('Save Doc Error:', err);
            alert('Erro ao vincular documento: ' + err.message);
            okBtn.textContent = 'Confirm';
            okBtn.disabled = false;
        }
    });

    // Handle File Input and Tabs inside setTimeout to ensure modal is rendered
    setTimeout(() => {
        const fileHidden = document.getElementById('d-file-hidden');
        const statusText = document.getElementById('upload-status-text');
        const okBtn = document.getElementById('sub-modal-ok');

        document.querySelectorAll('.doc-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGridMini(tab.dataset.filter);
            };
        });

        if (fileHidden) {
            fileHidden.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                statusText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subindo ${file.name}...`;
                if (okBtn) okBtn.disabled = true;

                try {
                    const data = await uploadAssetFile(file, 'File upload');
                    selectedDocId = data.id;
                    statusText.innerHTML = `<i class="fas fa-check-circle" style="color: var(--secondary);"></i> ${file.name} (Pronto)`;
                    if (okBtn) okBtn.disabled = false;
                    
                    const titleIn = document.getElementById('d-title-in');
                    if (titleIn && !titleIn.value) titleIn.value = file.name;
                } catch (err) {
                    alert('Erro no upload: ' + err.message);
                    statusText.textContent = 'Click to select a file';
                    if (okBtn) okBtn.disabled = false;
                }
            };
        }
    }, 100);

    // Initial fetch and render
    await fetchDocs();
    renderGridMini('all');
}

// Global helper for selector
window.toggleDocSelectorMode = (mode) => {
    const panes = { upload: 'mode-doc-upload', library: 'mode-doc-library' };
    const tabs = { upload: 'tab-doc-upload', library: 'tab-doc-library' };
    
    Object.keys(panes).forEach(k => {
        const p = document.getElementById(panes[k]);
        const t = document.getElementById(tabs[k]);
        if (p) p.classList.toggle('hidden', k !== mode);
        if (t) t.classList.toggle('active', k === mode);
    });
};

window.deleteQuiz = async (quizId) => {
    if (!confirm('Tem certeza que deseja excluir este quiz?')) return;
    try {
        await apiCall(`/modules/${currentModuleId}/quizzes/${quizId}`, 'DELETE');
        await loadModuleData(currentModuleId);
    } catch (err) {
        alert('Erro ao excluir quiz: ' + err.message);
    }
};

window.deleteQuestion = async (questionId) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;
    try {
        await apiCall(`/modules/${currentModuleId}/quiz/questions/${questionId}`, 'DELETE');
        await loadModuleData(currentModuleId);
    } catch (err) {
        alert('Erro ao excluir pergunta: ' + err.message);
    }
};


// Quiz Management Logic
function renderQuizList() {
    const editorList = document.getElementById('q-list');
    const previewList = document.getElementById('preview-quiz-summary');
    
    const quizzes = currentModuleData.quizzes || [];

    if (editorList) {
        editorList.innerHTML = quizzes.length ? '' : '<div style="color: var(--text-muted); padding: 1rem;">Nenhum quiz criado.</div>';
        quizzes.forEach(quiz => {
            const div = document.createElement('div');
            div.className = 'quiz-group-card glassmorphism';
            div.innerHTML = `
                <div class="quiz-group-header">
                    <h4><i class="fas fa-tasks"></i> ${quiz.title}</h4>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="addQuizQuestionToQuiz(${quiz.id})" class="btn btn-primary btn-sm">+ Pergunta</button>
                        <button onclick="deleteQuiz(${quiz.id})" class="btn btn-icon-del"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="questions-mini-list">
                    ${quiz.questions.length ? quiz.questions.map((q, idx) => `
                        <div class="question-mini-item">
                            <span>${idx + 1}. ${q.text}</span>
                            <button onclick="deleteQuestion(${q.id})" class="btn-icon-del"><i class="fas fa-trash"></i></button>
                        </div>
                    `).join('') : '<small style="color:var(--text-muted)">Sem perguntas.</small>'}
                </div>
            `;
            editorList.appendChild(div);
        });
    }

    if (previewList) {
        previewList.innerHTML = quizzes.length ? '' : '<div style="color: var(--text-muted); padding: 1rem;">Nenhum quiz criado para este módulo.</div>';
        quizzes.forEach(quiz => {
            const card = document.createElement('div');
            card.className = 'quiz-preview-item glassmorphism';
            card.style.marginBottom = '1rem';
            card.id = `quiz-prev-${quiz.id}`;
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${quiz.title}</strong>
                    <span class="badge-sm">${quiz.questions.length} questões</span>
                </div>
                <div class="preview-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" onclick="toggleQuizPreviewStructure(${quiz.id})">Ver Estrutura</button>
                    <button class="btn btn-secondary btn-sm" onclick="addQuizQuestionToQuiz(${quiz.id})">+ Add Pergunta</button>
                </div>
                <div id="quiz-structure-${quiz.id}" class="quiz-structure-pane hidden" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    ${quiz.questions.length ? quiz.questions.map((q, idx) => `
                        <div class="question-mini-item" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0.8rem; margin-bottom: 0.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <span><strong>${idx + 1}.</strong> ${q.text}</span>
                                <button onclick="deleteQuestion(${q.id})" class="btn-icon-del"><i class="fas fa-trash"></i></button>
                            </div>
                            <div style="margin-top: 0.5rem; padding-left: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
                                ${q.options.map(opt => `
                                    <div style="${opt.isCorrect ? 'color: var(--secondary); font-weight: bold;' : ''}">
                                        ${opt.isCorrect ? '<i class="fas fa-check"></i> ' : '<i class="far fa-circle"></i> '} ${opt.text}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('') : '<small style="color:var(--text-muted)">Sem perguntas cadastradas.</small>'}
                </div>
            `;
            previewList.appendChild(card);
        });
    }
}

window.toggleQuizPreviewStructure = (quizId) => {
    const pane = document.getElementById(`quiz-structure-${quizId}`);
    if (pane) pane.classList.toggle('hidden');
    
    // Toggle button text if needed
    const btn = document.querySelector(`#quiz-prev-${quizId} button[onclick*="toggleQuizPreviewStructure"]`);
    if (btn) {
        btn.textContent = pane.classList.contains('hidden') ? 'Ver Estrutura' : 'Ocultar Estrutura';
    }
};

async function showCreateQuizForm() {
    showSubModal('Novo Quiz', `
        <div class="input-group">
            <label>Título do Quiz</label>
            <input type="text" id="qz-title-in" placeholder="Ex: Avaliação Final">
        </div>
    `, async () => {
        const title = document.getElementById('qz-title-in').value;
        if (!title) return alert('Título obrigatório');

        const okBtn = document.getElementById('sub-modal-ok');
        okBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
        okBtn.disabled = true;

        try {
            const order = (currentModuleData && currentModuleData.quizzes) ? currentModuleData.quizzes.length : 0;
            await apiCall(`/modules/${currentModuleId}/quizzes`, 'POST', { 
                title, 
                order
            });
            await loadModuleData(currentModuleId);
            closeSubModal();
        } catch (err) {
            console.error('Quiz Create Error:', err);
            alert('Erro ao criar quiz: ' + err.message);
            okBtn.textContent = 'Confirm';
            okBtn.disabled = false;
        }
    });
}

async function showGenerateAiQuizForm(moduleId = currentModuleId) {
    if (!moduleId) return alert('Select a module first.');

    showSubModal('Generate Quiz with AI', `
        <div class="input-group">
            <label>Quiz Title</label>
            <input type="text" id="ai-qz-title-in" placeholder="AI-generated quiz">
        </div>
        <div class="input-group">
            <label>Number of questions</label>
            <input type="number" id="ai-qz-question-count" min="1" max="30" value="5">
        </div>
        <div class="input-group">
            <label>Options per question</label>
            <input type="number" id="ai-qz-options-count" min="2" max="8" value="4">
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">
            AI will use the module title, description, videos, and attached files. Very large files are skipped by the backend to avoid timeouts.
        </p>
    `, async () => {
        const title = document.getElementById('ai-qz-title-in').value.trim();
        const questionCount = parseInt(document.getElementById('ai-qz-question-count').value, 10) || 5;
        const optionsPerQuestion = parseInt(document.getElementById('ai-qz-options-count').value, 10) || 4;
        const okBtn = document.getElementById('sub-modal-ok');

        okBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating with AI...';
        okBtn.disabled = true;

        try {
            await apiCall(`/modules/${moduleId}/quizzes/ai-generate`, 'POST', {
                title,
                questionCount,
                optionsPerQuestion
            });

            if (currentModuleId === moduleId) {
                await loadModuleData(moduleId);
            }
            closeSubModal();
            alert('Quiz generated successfully. Review the questions before publishing or using this module.');
        } catch (err) {
            console.error('AI Quiz Generate Error:', err);
            alert('Error generating quiz with AI: ' + err.message);
            okBtn.textContent = 'Confirm';
            okBtn.disabled = false;
        }
    });
}

async function addQuizQuestionToQuiz(quizId) {
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

        if (!text || options.length < 2) return alert('Preencha a pergunta e pelo menos 2 opções.');

        const okBtn = document.getElementById('sub-modal-ok');
        okBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        okBtn.disabled = true;

        try {
            await apiCall(`/quizzes/${quizId}/questions`, 'POST', { 
                text, 
                options,
                order: 0 // Will handle order later if needed
            });
            await loadModuleData(currentModuleId);
            closeSubModal();
        } catch (err) {
            console.error('Question Add Error:', err);
            alert('Erro ao salvar pergunta: ' + err.message);
            okBtn.textContent = 'Confirm';
            okBtn.disabled = false;
        }
    });
}

async function deleteQuestion(id) {
    if (!confirm('Delete pergunta?')) return;
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
                <div class="stat-label">Average Quiz</div>
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
    console.log('Showing sub-modal:', title);
    const modal = document.getElementById('sub-modal');
    const okBtn = document.getElementById('sub-modal-ok');
    
    document.getElementById('sub-modal-title').textContent = title;
    document.getElementById('sub-modal-body').innerHTML = bodyHtml;
    
    // Reset button state
    okBtn.textContent = 'Confirm';
    okBtn.disabled = false;
    
    // Clear previous listeners by replacing the element
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.onclick = async () => {
        console.log('Sub-modal Confirm clicked');
        try {
            await onOk();
        } catch (err) {
            console.error('Sub-modal Action Error:', err);
            alert('Erro na ação: ' + err.message);
        }
    };
    
    modal.classList.remove('hidden');
}

function closeSubModal() {
    document.getElementById('sub-modal').classList.add('hidden');
}

// Export functions to window
window.openModuleEditor = openModuleEditor;
window.closeModuleEditor = closeModuleEditor;
window.switchTab = switchTab;
window.switchSection = switchSection;
window.logout = logout;
window.deleteModule = deleteModule;
window.switchEditorTab = switchEditorTab;
window.showAddVideoForm = showAddVideoForm;
window.deleteVideo = deleteVideo;
window.deleteModuleDoc = deleteModuleDoc;
window.showAddDocForm = showAddDocForm;
window.addQuizQuestionToQuiz = addQuizQuestionToQuiz;
window.deleteQuestion = deleteQuestion;
window.viewUserDetail = viewUserDetail;
window.showCreateQuizForm = showCreateQuizForm;
window.showGenerateAiQuizForm = showGenerateAiQuizForm;
window.switchPreviewTab = switchPreviewTab;
window.closeSubModal = closeSubModal;
window.selectModuleForPreview = selectModuleForPreview;
window.showSubModal = showSubModal;
window.promptUpdateUserRoles = promptUpdateUserRoles;
window.editPortfolioItem = editPortfolioItem;
window.deletePortfolioItemEntry = deletePortfolioItemEntry;
window.showPasswordRequestSection = showPasswordRequestSection;

// --- Profile Picture Cropping Logic ---
let profileCropper = null;
const cropModal = document.getElementById('crop-modal');
const imageToCrop = document.getElementById('image-to-crop');
const btnCropSave = document.getElementById('btn-crop-save');

window.uploadProfilePicture = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        imageToCrop.src = e.target.result;
        cropModal.classList.remove('hidden');
        
        if (profileCropper) profileCropper.destroy();
        
        profileCropper = new Cropper(imageToCrop, {
            aspectRatio: 1, // Perfeito 1:1 para avatar
            viewMode: 1,
            background: false,
            zoomable: true
        });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input após ler
};

window.closeCropModal = function() {
    cropModal.classList.add('hidden');
    if (profileCropper) {
        profileCropper.destroy();
        profileCropper = null;
    }
};

if (btnCropSave) {
    btnCropSave.addEventListener('click', async () => {
        if (!profileCropper) return;
        
        btnCropSave.disabled = true;
        btnCropSave.innerText = 'Saving...';

        profileCropper.getCroppedCanvas({
            width: 300,
            height: 300,
        }).toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('profilePicture', blob, 'profile.png');

            try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch('/api/users/profile-picture', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                alert('Foto de perfil atualizada com sucesso!');
                document.getElementById('profile-picture-display').src = data.url;
                if (window.location.pathname.includes('dashboard.html')) {
                    await refreshIdentityState();
                }
                closeCropModal();
            } catch (err) {
                alert('Erro ao salvar foto de perfil: ' + err.message);
            } finally {
                btnCropSave.disabled = false;
                btnCropSave.innerText = 'Save Profile';
            }
        }, 'image/png');
    });
}

const btnSaveUserRoles = document.getElementById('btn-save-user-roles');
if (btnSaveUserRoles) {
    btnSaveUserRoles.addEventListener('click', saveUserRolesFromModal);
}
