let coursesState = {
    user: null,
    canManageCourses: false,
    courses: [],
    selectedCourseId: null,
    selectedCourse: null,
    enrollmentSearchResults: [],
    assignableModules: [],
    selectedAssignableModuleId: null
};

const DEFAULT_QUIZ_GATE_SCORE = 70;

function escapeCourseHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchAccessibleCourses() {
    const apiCall = window.apiCall;
    if (!apiCall) return [];
    return apiCall('/courses/accessible');
}

function renderCoursesList() {
    const container = document.getElementById('courses-list');
    const counter = document.getElementById('courses-counter');
    if (!container || !counter) return;

    counter.textContent = `${coursesState.courses.length} courses`;

    if (!coursesState.courses.length) {
        container.innerHTML = '<div class="empty-state-inline">No courses available yet.</div>';
        return;
    }

    container.innerHTML = coursesState.courses.map((course) => {
        const active = coursesState.selectedCourseId === course.id ? 'border-color: rgba(96,165,250,0.6); box-shadow: 0 0 0 1px rgba(96,165,250,0.25);' : '';
        return `
            <button type="button" data-course-id="${course.id}" class="glassmorphism course-list-card" style="text-align:left; width:100%; padding:1rem; border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(15,23,42,0.6); color:white; cursor:pointer; ${active}">
                <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start;">
                    <div>
                        <strong style="display:block; margin-bottom:0.35rem;">${escapeCourseHtml(course.title)}</strong>
                        <span style="font-size:0.82rem; color:var(--text-muted);">${escapeCourseHtml(course.description || 'No description yet.')}</span>
                    </div>
                    <span class="role-badge" style="font-size:0.65rem;">${escapeCourseHtml(course.status || 'DRAFT')}</span>
                </div>
                <div style="display:flex; justify-content:space-between; gap:0.75rem; margin-top:0.85rem; font-size:0.78rem; color:var(--text-muted);">
                    <span>${course.moduleCount || 0} modules</span>
                    <span>${course.progressPercent || 0}% progress</span>
                </div>
            </button>
        `;
    }).join('');

    container.querySelectorAll('[data-course-id]').forEach((button) => {
        button.addEventListener('click', () => loadCourseDetail(Number(button.dataset.courseId)));
    });
}

function renderCourseModules(course) {
    const container = document.getElementById('course-modules-list');
    const meta = document.getElementById('course-modules-meta');
    if (!container || !meta) return;

    meta.textContent = `${(course.modules || []).length} modules`;

    if (!course.modules?.length) {
        container.innerHTML = '<div class="empty-state-inline">No modules attached yet.</div>';
        return;
    }

    container.innerHTML = course.modules.map((module, index) => {
        const statusLabel = module.completed ? 'Completed' : (module.unlocked ? 'Available' : 'Locked');
        const statusColor = module.completed ? 'priority-low' : (module.unlocked ? 'priority-medium' : 'priority-critical');
        return `
            <article class="operation-item ${module.completed ? '' : (module.unlocked ? '' : 'is-urgent')}" data-course-module-id="${module.courseModuleId}">
                <div class="operation-item-head">
                    <div>
                        <h5>${index + 1}. ${escapeCourseHtml(module.title)}</h5>
                        <p>${escapeCourseHtml(module.description || module.roomLabel || 'Module trail room')}</p>
                    </div>
                    <span class="operation-tag ${statusColor}">${statusLabel}</span>
                </div>
                <div class="operation-item-footer" style="align-items:flex-start; gap:0.75rem; flex-wrap:wrap;">
                    <div class="operation-meta-row">
                        <span class="operation-tag">${module.isRequired ? 'Required' : 'Optional'}</span>
                        <span class="operation-tag">${escapeCourseHtml(module.roomLabel || 'Module room')}</span>
                        <span class="operation-tag">Step ${index + 1} in trail</span>
                        <span class="operation-tag">${escapeCourseHtml(module.moduleStatus || 'DRAFT')}</span>
                    </div>
                    <div class="operation-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${module.unlocked ? `<button type="button" class="btn btn-secondary btn-sm" data-open-world-course="${coursesState.selectedCourseId}">Enter this course world</button>` : ''}
                        ${!coursesState.selectedCourse?.canManage && module.unlocked && !module.completed ? `<button type="button" class="btn btn-secondary btn-sm" data-complete-module="${module.moduleId}">Mark complete</button>` : ''}
                        ${coursesState.selectedCourse?.canManage ? `
                            <button type="button" class="btn btn-secondary btn-sm" data-move-course-module="up" data-course-module-id="${module.courseModuleId}">↑</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-move-course-module="down" data-course-module-id="${module.courseModuleId}">↓</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-toggle-required="${module.courseModuleId}">${module.isRequired ? 'Make optional' : 'Make required'}</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-remove-course-module="${module.courseModuleId}" style="color:var(--error); border-color:rgba(239,68,68,0.3);">Remove</button>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('[data-open-world-course]').forEach((button) => {
        button.addEventListener('click', () => window.goToMultiplayer?.(Number(button.dataset.openWorldCourse)));
    });

    container.querySelectorAll('[data-complete-module]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                button.disabled = true;
                await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${button.dataset.completeModule}/complete`, 'POST', { source: 'DASHBOARD' });
                await refreshCoursesPanel();
                await loadCourseDetail(coursesState.selectedCourseId);
            } catch (error) {
                alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    });

    if (coursesState.selectedCourse?.canManage) {
        container.querySelectorAll('[data-toggle-required]').forEach((button) => {
            button.addEventListener('click', async () => {
                const target = coursesState.selectedCourse.modules.find((module) => module.courseModuleId === Number(button.dataset.toggleRequired));
                if (!target) return;
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${target.courseModuleId}`, 'PATCH', { isRequired: !target.isRequired });
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        container.querySelectorAll('[data-remove-course-module]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Remove this module from the course trail?')) return;
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${button.dataset.removeCourseModule}`, 'DELETE');
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        container.querySelectorAll('[data-move-course-module]').forEach((button) => {
            button.addEventListener('click', async () => {
                const ordered = [...coursesState.selectedCourse.modules].sort((a, b) => a.orderIndex - b.orderIndex);
                const idx = ordered.findIndex((item) => item.courseModuleId === Number(button.dataset.courseModuleId));
                if (idx === -1) return;
                const nextIndex = button.dataset.moveCourseModule === 'up' ? idx - 1 : idx + 1;
                if (nextIndex < 0 || nextIndex >= ordered.length) return;
                const [item] = ordered.splice(idx, 1);
                ordered.splice(nextIndex, 0, item);
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/reorder`, 'PATCH', {
                        orderedCourseModuleIds: ordered.map((entry) => entry.courseModuleId)
                    });
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }
}

function renderCourseEnrollments(course) {
    const card = document.getElementById('course-enrollments-card');
    const meta = document.getElementById('course-enrollments-meta');
    const list = document.getElementById('course-enrollments-list');
    const searchResults = document.getElementById('course-enrollment-search-results');
    if (!card || !meta || !list || !searchResults) return;

    card.classList.toggle('hidden', !course.canManage);
    if (!course.canManage) return;

    const enrollments = course.enrollments || [];
    meta.textContent = `${enrollments.length} learners`;
    const searchLabel = coursesState.enrollmentSearchResults.length ? `${coursesState.enrollmentSearchResults.length} matches found` : 'Search for a learner to enroll.';
    if (!enrollments.length) {
        list.innerHTML = '<div class="empty-state-inline">No learners enrolled yet.</div>';
    } else {
        list.innerHTML = enrollments.map((enrollment) => `
            <article class="operation-item">
                <div class="operation-item-head">
                    <div>
                        <h5>${escapeCourseHtml(enrollment.displayName || enrollment.username || `User #${enrollment.userId}`)}</h5>
                        <p>${escapeCourseHtml(enrollment.email || `User #${enrollment.userId}`)} • Status: ${escapeCourseHtml(enrollment.status)}</p>
                    </div>
                    <span class="operation-tag">${Number(enrollment.progressPercent || 0)}%</span>
                </div>
            </article>
        `).join('');
    }

    if (!coursesState.enrollmentSearchResults.length) {
        searchResults.innerHTML = `<div class="empty-state-inline">${escapeCourseHtml(searchLabel)}</div>`;
        return;
    }

    searchResults.innerHTML = coursesState.enrollmentSearchResults.map((user) => `
        <article class="operation-item">
            <div class="operation-item-head">
                <div>
                    <h5>${escapeCourseHtml(user.displayName || user.username)}</h5>
                    <p>${escapeCourseHtml(user.email)} • ${escapeCourseHtml((user.roles || []).join(', ') || user.primaryRole || 'STUDENT')}</p>
                </div>
                <button type="button" class="btn btn-primary btn-sm" data-enroll-user-id="${user.id}">Enroll</button>
            </div>
        </article>
    `).join('');

    searchResults.querySelectorAll('[data-enroll-user-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                button.disabled = true;
                await enrollUser(Number(button.dataset.enrollUserId));
            } catch (error) {
                alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    });
}

function renderCourseDetail(course) {
    coursesState.selectedCourse = course;
    const empty = document.getElementById('course-detail-empty');
    const content = document.getElementById('course-detail-content');
    const managerActions = document.getElementById('course-manager-actions');
    if (!empty || !content || !managerActions) return;

    empty.classList.add('hidden');
    content.classList.remove('hidden');
    managerActions.classList.toggle('hidden', !course.canManage);

    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-description').textContent = course.description || 'No description yet.';
    document.getElementById('course-progress-pill').textContent = `${course.progressPercent || 0}% progress`;
    
    const lpPill = document.getElementById('course-landing-page-pill');
    if (lpPill) {
        if (course.landingPage) {
            lpPill.textContent = 'LP: ' + course.landingPage.title;
            lpPill.style.borderColor = 'rgba(96,165,250,0.4)';
            lpPill.style.color = '#60a5fa';
        } else {
            lpPill.textContent = 'No Landing Page';
            lpPill.style.borderColor = 'rgba(255,255,255,0.1)';
            lpPill.style.color = 'var(--text-muted)';
        }
    }
    const openCourseWorldButton = document.getElementById('btn-open-course-world');
    if (openCourseWorldButton) {
        openCourseWorldButton.textContent = 'Enter this course world';
    }

    renderCourseModules(course);
    renderCourseEnrollments(course);
}

async function loadCourseDetail(courseId) {
    coursesState.selectedCourseId = courseId;
    renderCoursesList();
    const detail = await window.apiCall(`/courses/${courseId}`);
    renderCourseDetail(detail);
}

async function refreshCoursesPanel() {
    coursesState.courses = await fetchAccessibleCourses();
    renderCoursesList();
}

async function createCourse() {
    const title = prompt('Course title');
    if (!title) return;
    const description = prompt('Course description', '');
    await window.apiCall('/courses', 'POST', { title, description });
    await refreshCoursesPanel();
    if (coursesState.courses.length) {
        await loadCourseDetail(coursesState.courses[0].id);
    }
}

async function editCourse() {
    if (!coursesState.selectedCourse) return;
    const title = prompt('Course title', coursesState.selectedCourse.title);
    if (!title) return;
    const description = prompt('Course description', coursesState.selectedCourse.description || '');
    const status = prompt('Course status (DRAFT, PUBLISHED, ARCHIVED)', coursesState.selectedCourse.status || 'DRAFT');
    await window.apiCall(`/courses/${coursesState.selectedCourseId}`, 'PUT', { title, description, status });
    await refreshCoursesPanel();
    await loadCourseDetail(coursesState.selectedCourseId);
}

function renderAssignableModulesList(filterText = '') {
    const options = document.getElementById('course-module-options');
    const empty = document.getElementById('course-module-empty');
    if (!options || !empty) return;

    const normalizedFilter = String(filterText || '').trim().toLowerCase();
    const modules = (coursesState.assignableModules || []).filter((module) => {
        if (!normalizedFilter) return true;
        return [module.title, module.status, module.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedFilter));
    });

    options.innerHTML = '';
    empty.classList.toggle('hidden', modules.length > 0);
    empty.textContent = modules.length ? '' : 'No modules matched your search.';

    modules.forEach((module) => {
        const selected = coursesState.selectedAssignableModuleId === module.id;
        const article = document.createElement('button');
        article.type = 'button';
        article.className = 'glassmorphism';
        article.style.cssText = `text-align:left; width:100%; padding:0.9rem 1rem; border-radius:16px; border:1px solid ${selected ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.08)'}; background:${selected ? 'rgba(37,99,235,0.22)' : 'rgba(15,23,42,0.5)'}; color:white; cursor:pointer;`;
        article.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start;">
                <div>
                    <strong style="display:block; margin-bottom:0.25rem;">${escapeCourseHtml(module.title)}</strong>
                    <span style="font-size:0.82rem; color:var(--text-muted);">${escapeCourseHtml(module.description || 'No description.')}</span>
                </div>
                <span class="role-badge" style="font-size:0.68rem;">${escapeCourseHtml(module.status || 'DRAFT')}</span>
            </div>
        `;
        article.addEventListener('click', () => {
            coursesState.selectedAssignableModuleId = module.id;
            const roomLabelInput = document.getElementById('course-module-room-label');
            if (roomLabelInput && !roomLabelInput.value.trim()) {
                roomLabelInput.value = module.title;
            }
            renderAssignableModulesList(document.getElementById('course-module-search')?.value || '');
        });
        options.appendChild(article);
    });
}

function closeCourseModuleModal() {
    document.getElementById('course-module-modal')?.classList.add('hidden');
    coursesState.selectedAssignableModuleId = null;
}
window.closeCourseModuleModal = closeCourseModuleModal;

async function attachExistingModule() {
    if (!coursesState.selectedCourse) return;
    const modules = await window.apiCall('/modules/my/assignable');
    coursesState.assignableModules = modules || [];
    coursesState.selectedAssignableModuleId = coursesState.assignableModules[0]?.id || null;

    const modal = document.getElementById('course-module-modal');
    const searchInput = document.getElementById('course-module-search');
    const roomLabelInput = document.getElementById('course-module-room-label');
    const requiredInput = document.getElementById('course-module-required');
    const empty = document.getElementById('course-module-empty');
    if (!modal || !searchInput || !roomLabelInput || !requiredInput || !empty) return;

    searchInput.value = '';
    roomLabelInput.value = coursesState.assignableModules[0]?.title || '';
    requiredInput.checked = true;

    if (!coursesState.assignableModules.length) {
        empty.classList.remove('hidden');
        empty.textContent = 'You do not have any modules available yet. Create one in the modules workbench first, then add it to this course trail.';
        document.getElementById('course-module-options').innerHTML = '';
    } else {
        renderAssignableModulesList();
    }

    searchInput.oninput = () => renderAssignableModulesList(searchInput.value);

    const confirmButton = document.getElementById('btn-confirm-course-module');
    if (confirmButton) {
        confirmButton.onclick = async () => {
            const selected = coursesState.assignableModules.find((module) => module.id === coursesState.selectedAssignableModuleId);
            if (!selected) {
                alert('Choose a module first.');
                return;
            }
            try {
                confirmButton.disabled = true;
                await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules`, 'POST', {
                    moduleId: selected.id,
                    roomLabel: roomLabelInput.value.trim() || selected.title,
                    isRequired: requiredInput.checked
                });
                closeCourseModuleModal();
                await refreshCoursesPanel();
                await loadCourseDetail(coursesState.selectedCourseId);
            } catch (error) {
                alert(error.message);
            } finally {
                confirmButton.disabled = false;
            }
        };
    }

    modal.classList.remove('hidden');
}

let __selectedLandingPageId = null;

async function openLinkLandingPageModal() {
    if (!coursesState.selectedCourse) return;
    const modal = document.getElementById('course-landing-page-modal');
    const listContainer = document.getElementById('course-landing-page-options');
    const emptyMsg = document.getElementById('course-landing-page-empty');
    if (!modal || !listContainer || !emptyMsg) return;

    try {
        const pages = await window.apiCall('/api/landing-pages');
        if (!modal.classList.contains('hidden') && __selectedLandingPageId) {
            // keep selection across re-renders
        } else {
            __selectedLandingPageId = coursesState.selectedCourse.landingPage ? coursesState.selectedCourse.landingPage.id : null;
        }

        listContainer.innerHTML = '';
        if (!pages || pages.length === 0) {
            emptyMsg.classList.remove('hidden');
        } else {
            emptyMsg.classList.add('hidden');
            pages.forEach(page => {
                const isSelected = __selectedLandingPageId === page.id;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'glassmorphism';
                btn.style.cssText = `text-align:left; width:100%; padding:0.9rem 1rem; border-radius:16px; border:1px solid ${isSelected ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.08)'}; background:${isSelected ? 'rgba(37,99,235,0.22)' : 'rgba(15,23,42,0.5)'}; color:white; cursor:pointer;`;
                btn.innerHTML = `
                    <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start;">
                        <div>
                            <strong style="display:block; margin-bottom:0.25rem;">${escapeCourseHtml(page.title)}</strong>
                            <span style="font-size:0.82rem; color:var(--text-muted);">${page.course ? (page.course.id === coursesState.selectedCourseId ? 'Linked to this course' : `Linked to another course: ${page.course.title}`) : 'Unlinked'}</span>
                        </div>
                    </div>
                `;
                btn.onclick = () => {
                    __selectedLandingPageId = page.id;
                    openLinkLandingPageModal(); // re-render list
                };
                listContainer.appendChild(btn);
            });
        }

        const confirmBtn = document.getElementById('btn-confirm-landing-page');
        const unlinkBtn = document.getElementById('btn-unlink-landing-page');

        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                if (!__selectedLandingPageId) { alert('Select a landing page'); return; }
                try {
                    confirmBtn.disabled = true;
                    // First fetch the old landing page to unlink if it exists? No needed, Prisma handles 1-1 reassignment
                    await window.apiCall(`/api/landing-pages/${__selectedLandingPageId}`, 'PUT', { courseId: coursesState.selectedCourseId });
                    modal.classList.add('hidden');
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                    if (window.loadLandingPages) window.loadLandingPages(); // Refresh the landing pages tab state if available
                } catch(e) {
                    alert(e.message);
                } finally {
                    confirmBtn.disabled = false;
                }
            };
        }

        if (unlinkBtn) {
            // Only active if there's currently a linked landing page
            unlinkBtn.style.opacity = coursesState.selectedCourse.landingPage ? '1' : '0.4';
            unlinkBtn.onclick = async () => {
                if (!coursesState.selectedCourse.landingPage) return;
                try {
                    unlinkBtn.disabled = true;
                    await window.apiCall(`/api/landing-pages/${coursesState.selectedCourse.landingPage.id}`, 'PUT', { courseId: null });
                    modal.classList.add('hidden');
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                    if (window.loadLandingPages) window.loadLandingPages();
                } catch(e) {
                    alert(e.message);
                } finally {
                    unlinkBtn.disabled = false;
                }
            };
        }

        modal.classList.remove('hidden');
    } catch(e) {
        alert('Failed to load landing pages.');
        console.error(e);
    }
}

async function enrollUser(userId) {
    if (!coursesState.selectedCourse) return;
    if (!userId) {
        alert('Select a valid learner.');
        return;
    }
    await window.apiCall(`/courses/${coursesState.selectedCourseId}/enrollments`, 'POST', { userId });
    coursesState.enrollmentSearchResults = [];
    const queryField = document.getElementById('course-enrollment-query');
    if (queryField) queryField.value = '';
    await loadCourseDetail(coursesState.selectedCourseId);
}

function renderCourseModules(course) {
    const container = document.getElementById('course-modules-list');
    const meta = document.getElementById('course-modules-meta');
    if (!container || !meta) return;

    meta.textContent = `${(course.modules || []).length} modules`;

    if (!course.modules?.length) {
        container.innerHTML = '<div class="empty-state-inline">No modules attached yet.</div>';
        return;
    }

    container.innerHTML = course.modules.map((module, index) => {
        const statusLabel = module.completed ? 'Completed' : (module.unlocked ? 'Available' : 'Locked');
        const statusColor = module.completed ? 'priority-low' : (module.unlocked ? 'priority-medium' : 'priority-critical');
        const quizRuleLabel = module.quizRequirementActive
            ? `Quiz gate ${Math.round(module.minimumQuizScore || DEFAULT_QUIZ_GATE_SCORE)}%`
            : (module.hasQuiz ? 'Quiz optional' : 'No quiz');
        const quizScoreLabel = module.bestQuizScore === null || module.bestQuizScore === undefined
            ? 'No attempts yet'
            : `Best ${Math.round(module.bestQuizScore)}%`;

        return `
            <article class="operation-item ${module.completed ? '' : (module.unlocked ? '' : 'is-urgent')}" data-course-module-id="${module.courseModuleId}">
                <div class="operation-item-head">
                    <div>
                        <h5>${index + 1}. ${escapeCourseHtml(module.title)}</h5>
                        <p>${escapeCourseHtml(module.description || module.roomLabel || 'Module trail room')}</p>
                    </div>
                    <span class="operation-tag ${statusColor}">${statusLabel}</span>
                </div>
                <div class="operation-item-footer" style="align-items:flex-start; gap:0.75rem; flex-wrap:wrap;">
                    <div class="operation-meta-row">
                        <span class="operation-tag">${module.isRequired ? 'Required' : 'Optional'}</span>
                        <span class="operation-tag">${escapeCourseHtml(module.roomLabel || 'Module room')}</span>
                        <span class="operation-tag">Step ${index + 1} in trail</span>
                        <span class="operation-tag">${escapeCourseHtml(module.moduleStatus || 'DRAFT')}</span>
                        <span class="operation-tag">${escapeCourseHtml(quizRuleLabel)}</span>
                        ${module.hasQuiz ? `<span class="operation-tag">${escapeCourseHtml(quizScoreLabel)}</span>` : ''}
                    </div>
                    <div class="operation-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${module.unlocked ? `<button type="button" class="btn btn-secondary btn-sm" data-open-world-course="${coursesState.selectedCourseId}">Enter this course world</button>` : ''}
                        ${!coursesState.selectedCourse?.canManage && module.unlocked && !module.completed ? `<button type="button" class="btn btn-secondary btn-sm" data-complete-module="${module.moduleId}">Mark complete</button>` : ''}
                        ${coursesState.selectedCourse?.canManage ? `
                            <button type="button" class="btn btn-secondary btn-sm" data-move-course-module="up" data-course-module-id="${module.courseModuleId}">↑</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-move-course-module="down" data-course-module-id="${module.courseModuleId}">↓</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-toggle-required="${module.courseModuleId}">${module.isRequired ? 'Make optional' : 'Make required'}</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-edit-quiz-gate="${module.courseModuleId}" ${module.hasQuiz ? '' : 'disabled'}>${module.quizRequirementActive ? 'Edit quiz gate' : 'Quiz rule'}</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-generate-ai-quiz="${module.moduleId}">AI Quiz</button>
                            <button type="button" class="btn btn-secondary btn-sm" data-remove-course-module="${module.courseModuleId}" style="color:var(--error); border-color:rgba(239,68,68,0.3);">Remove</button>
                        ` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('[data-open-world-course]').forEach((button) => {
        button.addEventListener('click', () => window.goToMultiplayer?.(Number(button.dataset.openWorldCourse)));
    });

    container.querySelectorAll('[data-complete-module]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                button.disabled = true;
                await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${button.dataset.completeModule}/complete`, 'POST', { source: 'DASHBOARD' });
                await refreshCoursesPanel();
                await loadCourseDetail(coursesState.selectedCourseId);
            } catch (error) {
                alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    });

    if (coursesState.selectedCourse?.canManage) {
        container.querySelectorAll('[data-toggle-required]').forEach((button) => {
            button.addEventListener('click', async () => {
                const target = coursesState.selectedCourse.modules.find((module) => module.courseModuleId === Number(button.dataset.toggleRequired));
                if (!target) return;
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${target.courseModuleId}`, 'PATCH', { isRequired: !target.isRequired });
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        container.querySelectorAll('[data-generate-ai-quiz]').forEach((button) => {
            button.addEventListener('click', async () => {
                const moduleId = Number(button.dataset.generateAiQuiz);
                if (window.showGenerateAiQuizForm) {
                    window.showGenerateAiQuizForm(moduleId);
                    return;
                }
                alert('AI quiz generator is not available on this page.');
            });
        });

        container.querySelectorAll('[data-edit-quiz-gate]').forEach((button) => {
            button.addEventListener('click', async () => {
                const target = coursesState.selectedCourse.modules.find((module) => module.courseModuleId === Number(button.dataset.editQuizGate));
                if (!target) return;
                if (!target.hasQuiz) {
                    alert('This module does not have a quiz yet.');
                    return;
                }

                try {
                    if (target.quizRequirementActive) {
                        const keepEnabled = confirm('Quiz pass is currently required for this room. Click OK to change the minimum score, or Cancel to disable the quiz gate.');
                        if (!keepEnabled) {
                            await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${target.courseModuleId}`, 'PATCH', {
                                requireQuizPass: false,
                                minimumQuizScore: null
                            });
                        } else {
                            const nextScore = prompt('Minimum quiz score required to unlock the next room (%)', String(Math.round(target.minimumQuizScore || DEFAULT_QUIZ_GATE_SCORE)));
                            if (nextScore === null) return;
                            const parsedScore = Number(nextScore);
                            if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
                                alert('Enter a score between 0 and 100.');
                                return;
                            }
                            await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${target.courseModuleId}`, 'PATCH', {
                                requireQuizPass: true,
                                minimumQuizScore: parsedScore
                            });
                        }
                    } else {
                        const enableGate = confirm('Require learners to pass this module quiz before the next room unlocks?');
                        if (!enableGate) return;
                        const nextScore = prompt('Minimum quiz score required to unlock the next room (%)', String(Math.round(target.minimumQuizScore || DEFAULT_QUIZ_GATE_SCORE)));
                        if (nextScore === null) return;
                        const parsedScore = Number(nextScore);
                        if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
                            alert('Enter a score between 0 and 100.');
                            return;
                        }
                        await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${target.courseModuleId}`, 'PATCH', {
                            requireQuizPass: true,
                            minimumQuizScore: parsedScore
                        });
                    }

                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        container.querySelectorAll('[data-remove-course-module]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Remove this module from the course trail?')) return;
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/${button.dataset.removeCourseModule}`, 'DELETE');
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });

        container.querySelectorAll('[data-move-course-module]').forEach((button) => {
            button.addEventListener('click', async () => {
                const ordered = [...coursesState.selectedCourse.modules].sort((a, b) => a.orderIndex - b.orderIndex);
                const idx = ordered.findIndex((item) => item.courseModuleId === Number(button.dataset.courseModuleId));
                if (idx === -1) return;
                const nextIndex = button.dataset.moveCourseModule === 'up' ? idx - 1 : idx + 1;
                if (nextIndex < 0 || nextIndex >= ordered.length) return;
                const [item] = ordered.splice(idx, 1);
                ordered.splice(nextIndex, 0, item);
                try {
                    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules/reorder`, 'PATCH', {
                        orderedCourseModuleIds: ordered.map((entry) => entry.courseModuleId)
                    });
                    await refreshCoursesPanel();
                    await loadCourseDetail(coursesState.selectedCourseId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }
}

function renderAssignableModulesList(filterText = '') {
    const options = document.getElementById('course-module-options');
    const empty = document.getElementById('course-module-empty');
    if (!options || !empty) return;

    const normalizedFilter = String(filterText || '').trim().toLowerCase();
    const modules = (coursesState.assignableModules || []).filter((module) => {
        if (!normalizedFilter) return true;
        return [module.title, module.status, module.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedFilter));
    });

    options.innerHTML = '';
    empty.classList.toggle('hidden', modules.length > 0);
    empty.textContent = modules.length ? '' : 'No modules matched your search.';

    modules.forEach((module) => {
        const selected = coursesState.selectedAssignableModuleId === module.id;
        const article = document.createElement('button');
        article.type = 'button';
        article.className = 'glassmorphism';
        article.style.cssText = `text-align:left; width:100%; padding:0.9rem 1rem; border-radius:16px; border:1px solid ${selected ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.08)'}; background:${selected ? 'rgba(37,99,235,0.22)' : 'rgba(15,23,42,0.5)'}; color:white; cursor:pointer;`;
        article.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start;">
                <div>
                    <strong style="display:block; margin-bottom:0.25rem;">${escapeCourseHtml(module.title)}</strong>
                    <span style="font-size:0.82rem; color:var(--text-muted);">${escapeCourseHtml(module.description || 'No description.')}</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
                    <span class="role-badge" style="font-size:0.68rem;">${escapeCourseHtml(module.status || 'DRAFT')}</span>
                    <span class="role-badge" style="font-size:0.68rem; border-color:${module.quizCount ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}; color:${module.quizCount ? '#93c5fd' : 'var(--text-muted)'};">${module.quizCount ? `${module.quizCount} quiz${module.quizCount > 1 ? 'zes' : ''}` : 'No quiz'}</span>
                </div>
            </div>
        `;
        article.addEventListener('click', () => {
            coursesState.selectedAssignableModuleId = module.id;
            const roomLabelInput = document.getElementById('course-module-room-label');
            if (roomLabelInput && !roomLabelInput.value.trim()) {
                roomLabelInput.value = module.title;
            }
            updateCourseModuleQuizGateFields(module);
            renderAssignableModulesList(document.getElementById('course-module-search')?.value || '');
        });
        options.appendChild(article);
    });
}

function updateCourseModuleQuizGateFields(selectedModule = null) {
    const quizToggle = document.getElementById('course-module-require-quiz-pass');
    const quizScoreInput = document.getElementById('course-module-minimum-quiz-score');
    const quizHelp = document.getElementById('course-module-quiz-help');
    if (!quizToggle || !quizScoreInput || !quizHelp) return;

    const module = selectedModule || coursesState.assignableModules.find((entry) => entry.id === coursesState.selectedAssignableModuleId) || null;
    const hasQuiz = Boolean(module?.quizCount);

    if (!hasQuiz) {
        quizToggle.checked = false;
        quizToggle.disabled = true;
        quizScoreInput.disabled = true;
        quizScoreInput.value = String(DEFAULT_QUIZ_GATE_SCORE);
        quizHelp.textContent = 'This module has no quiz yet. Add a quiz first if you want to gate the next room by score.';
        return;
    }

    quizToggle.disabled = false;
    quizScoreInput.disabled = !quizToggle.checked;
    if (!quizScoreInput.value) {
        quizScoreInput.value = String(DEFAULT_QUIZ_GATE_SCORE);
    }
    quizHelp.textContent = quizToggle.checked
        ? 'Learners will only unlock the next room after marking this module done and reaching this score.'
        : 'This module has a quiz. Turn this on if passing it should be mandatory for the next room.';
}

async function attachExistingModule() {
    if (!coursesState.selectedCourse) return;
    const modules = await window.apiCall('/modules/my/assignable');
    coursesState.assignableModules = modules || [];
    coursesState.selectedAssignableModuleId = coursesState.assignableModules[0]?.id || null;

    const modal = document.getElementById('course-module-modal');
    const searchInput = document.getElementById('course-module-search');
    const roomLabelInput = document.getElementById('course-module-room-label');
    const requiredInput = document.getElementById('course-module-required');
    const quizGateInput = document.getElementById('course-module-require-quiz-pass');
    const quizScoreInput = document.getElementById('course-module-minimum-quiz-score');
    const empty = document.getElementById('course-module-empty');
    if (!modal || !searchInput || !roomLabelInput || !requiredInput || !quizGateInput || !quizScoreInput || !empty) return;

    searchInput.value = '';
    roomLabelInput.value = coursesState.assignableModules[0]?.title || '';
    requiredInput.checked = true;
    quizGateInput.checked = false;
    quizScoreInput.value = String(DEFAULT_QUIZ_GATE_SCORE);

    if (!coursesState.assignableModules.length) {
        empty.classList.remove('hidden');
        empty.textContent = 'You do not have any modules available yet. Create one in the modules workbench first, then add it to this course trail.';
        document.getElementById('course-module-options').innerHTML = '';
        updateCourseModuleQuizGateFields(null);
    } else {
        renderAssignableModulesList();
        updateCourseModuleQuizGateFields(coursesState.assignableModules[0]);
    }

    searchInput.oninput = () => renderAssignableModulesList(searchInput.value);
    quizGateInput.onchange = () => updateCourseModuleQuizGateFields();

    const confirmButton = document.getElementById('btn-confirm-course-module');
    if (confirmButton) {
        confirmButton.onclick = async () => {
            const selected = coursesState.assignableModules.find((module) => module.id === coursesState.selectedAssignableModuleId);
            if (!selected) {
                alert('Choose a module first.');
                return;
            }
            try {
                confirmButton.disabled = true;
                await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules`, 'POST', {
                    moduleId: selected.id,
                    roomLabel: roomLabelInput.value.trim() || selected.title,
                    isRequired: requiredInput.checked,
                    requireQuizPass: quizGateInput.checked && Boolean(selected.quizCount),
                    minimumQuizScore: quizGateInput.checked && Boolean(selected.quizCount)
                        ? Number(quizScoreInput.value || DEFAULT_QUIZ_GATE_SCORE)
                        : null
                });
                closeCourseModuleModal();
                await refreshCoursesPanel();
                await loadCourseDetail(coursesState.selectedCourseId);
            } catch (error) {
                alert(error.message);
            } finally {
                confirmButton.disabled = false;
            }
        };
    }

    modal.classList.remove('hidden');
}

window.loadCoursesPanel = async function loadCoursesPanel({ user, canManageCourses }) {
    coursesState.user = user;
    coursesState.canManageCourses = canManageCourses;
    const createButton = document.getElementById('btn-create-course');
    if (createButton) {
        createButton.classList.toggle('hidden', !canManageCourses);
        createButton.onclick = async () => {
            try {
                await createCourse();
            } catch (error) {
                alert(error.message);
            }
        };
    }

    const openWorldButton = document.getElementById('btn-open-course-world');
    if (openWorldButton) {
        openWorldButton.onclick = () => {
            if (coursesState.selectedCourseId) {
                window.goToMultiplayer?.(coursesState.selectedCourseId);
            }
        };
    }

    const editButton = document.getElementById('btn-edit-course');
    if (editButton) {
        editButton.onclick = async () => {
            try {
                await editCourse();
            } catch (error) {
                alert(error.message);
            }
        };
    }

    const addModuleButton = document.getElementById('btn-add-existing-module');
    if (addModuleButton) {
        addModuleButton.onclick = async () => {
            try {
                await attachExistingModule();
            } catch (error) {
                alert(error.message);
            }
        };
    }

    const workbenchButton = document.getElementById('btn-open-module-workbench');
    if (workbenchButton) {
        workbenchButton.onclick = () => window.switchSection?.('modules');
    }

    const linkLandingPageBtn = document.getElementById('btn-link-landing-page');
    if (linkLandingPageBtn) {
        linkLandingPageBtn.onclick = openLinkLandingPageModal;
    }

    const queryInput = document.getElementById('course-enrollment-query');
    if (queryInput) {
        let searchTimeout = null;
        queryInput.oninput = () => {
            const value = queryInput.value.trim();
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                if (!value || value.length < 2) {
                    coursesState.enrollmentSearchResults = [];
                    renderCourseEnrollments(coursesState.selectedCourse || { canManage: true, enrollments: [] });
                    return;
                }
                try {
                    const result = await window.apiCall(`/api/users/search?q=${encodeURIComponent(value)}&limit=8`);
                    const enrolledIds = new Set((coursesState.selectedCourse?.enrollments || []).map((entry) => entry.userId));
                    coursesState.enrollmentSearchResults = (result.users || []).filter((userEntry) => !enrolledIds.has(userEntry.id));
                    renderCourseEnrollments(coursesState.selectedCourse || { canManage: true, enrollments: [] });
                } catch (error) {
                    console.error('Enrollment search failed:', error);
                }
            }, 250);
        };
    }

    await refreshCoursesPanel();
    if (coursesState.selectedCourseId) {
        const stillExists = coursesState.courses.find((course) => course.id === coursesState.selectedCourseId);
        if (stillExists) {
            await loadCourseDetail(coursesState.selectedCourseId);
            return;
        }
    }
    if (coursesState.courses.length) {
        await loadCourseDetail(coursesState.courses[0].id);
    }
};
