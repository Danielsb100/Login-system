let coursesState = {
    user: null,
    canManageCourses: false,
    courses: [],
    selectedCourseId: null,
    selectedCourse: null,
    enrollmentSearchResults: []
};

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
                        <span class="operation-tag">${escapeCourseHtml(module.moduleStatus || 'DRAFT')}</span>
                    </div>
                    <div class="operation-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${module.unlocked ? `<button type="button" class="btn btn-secondary btn-sm" data-open-world-course="${coursesState.selectedCourseId}">Open in 3D</button>` : ''}
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

async function attachExistingModule() {
    if (!coursesState.selectedCourse) return;
    const modules = await window.apiCall('/modules/my/assignable');
    if (!modules.length) {
        alert('You do not have any modules available. Create one in the Modules workbench first.');
        return;
    }
    const moduleList = modules.map((module, index) => `${index + 1}. ${module.title} (${module.status})`).join('\n');
    const choice = prompt(`Choose the module to attach:\n\n${moduleList}\n\nType the number:`);
    const selected = modules[Number(choice) - 1];
    if (!selected) return;
    const roomLabel = prompt('Room label (optional)', selected.title);
    const isRequired = confirm('Should this module be required in the course path?');
    await window.apiCall(`/courses/${coursesState.selectedCourseId}/modules`, 'POST', {
        moduleId: selected.id,
        roomLabel,
        isRequired
    });
    await refreshCoursesPanel();
    await loadCourseDetail(coursesState.selectedCourseId);
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
