// js/landingPage.js

let currentLandingPageId = null;
let landingPagesList = [];

// ==========================================
// API INTERACTION
// ==========================================

async function loadLandingPages() {
    try {
        const res = await fetch('/api/landing-pages', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            landingPagesList = await res.json();
            renderLandingPagesList();
        }
    } catch (e) {
        console.error('Failed to load landing pages', e);
    }
}

function renderLandingPagesList() {
    const listContainer = document.getElementById('landing-pages-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    
    if (landingPagesList.length === 0) {
        listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">You have not created any Landing Pages yet.</div>';
        return;
    }

    landingPagesList.forEach(lp => {
        const card = document.createElement('div');
        card.className = 'module-card';
        card.innerHTML = `
            <div class="module-status-badge">
                ${lp.course ? 'Linked to: ' + lp.course.title : 'Unlinked'}
            </div>
            <h3>${lp.title}</h3>
            <p>Created: ${new Date(lp.createdAt).toLocaleDateString()}</p>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="openLandingPageBuilder(${lp.id})">Edit</button>
                <button class="btn btn-secondary btn-sm" onclick="deleteLandingPage(${lp.id})" style="color: var(--error); border-color: rgba(239, 68, 68, 0.3);">Delete</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function closeLandingPageBuilder() {
    document.getElementById('landing-page-builder-section').classList.add('hidden');
    document.getElementById('landing-pages-panel').classList.remove('hidden');
    loadLandingPages();
}

function createNewLandingPage() {
    currentLandingPageId = null;
    document.getElementById('builder-title').value = "New Landing Page";
    document.getElementById('landing-pages-panel').classList.add('hidden');
    document.getElementById('landing-page-builder-section').classList.remove('hidden');
    
    // Inject default template
    document.getElementById('template-container').innerHTML = `
        <section class="module-section" id="header-section" style="background-image: url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000');">
            <div class="bg-overlay"></div>
            <button class="bg-edit-btn" onclick="triggerImageUpload('header-section', 'bg')" title="Alterar Cabeçalho BG"><i class="fas fa-cog"></i></button>
            <div class="module-content">
                <div class="logo-container editable-image-wrapper" onclick="triggerImageUpload('logo-img', 'src')">
                    <img src="https://placehold.co/200x100/ffffff/111111?text=LOGO" alt="Logo" class="logo-img" id="logo-img">
                </div>
                <div class="text-block text-white" style="flex: 1;">
                    <h1 class="editable-text" id="titulo-cabecalho">Meu Título Incrível</h1>
                    <p class="editable-text" id="desc-cabecalho">Esta é a descrição do cabeçalho. Você pode clicar e editar este texto livremente, assim como pode apertar nos botões vermelhos correspondentes e trocar a imagem de fundo ou a logo ao lado.</p>
                </div>
            </div>
        </section>
        <section class="module-section" id="body1-section" style="background-image: url('https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=2000');">
            <div class="bg-overlay"></div>
            <button class="bg-edit-btn" onclick="triggerImageUpload('body1-section', 'bg')" title="Alterar Corpo 1 BG"><i class="fas fa-cog"></i></button>
            <div class="module-content">
                <div class="body-img-container editable-image-wrapper" onclick="triggerImageUpload('body1-img', 'src')">
                    <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800" alt="Imagem Representativa" class="body-img" id="body1-img">
                </div>
                <div class="text-block text-white" style="flex: 1;">
                    <h1 class="editable-text" id="titulo-corpo1">Título Corpo 1</h1>
                    <p class="editable-text" id="texto-corpo1">Este é o texto associado ao primeiro bloco do corpo da página. A imagem ao lado é a imagem representativa, clique nela para alterar o arquivo fonte, e clique no botão acima para alterar o background desta "Div".</p>
                </div>
            </div>
        </section>
        <section class="module-section" id="body2-section" style="background-image: url('https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&q=80&w=2000');">
            <div class="bg-overlay"></div>
            <button class="bg-edit-btn" onclick="triggerImageUpload('body2-section', 'bg')" title="Alterar Corpo 2 BG"><i class="fas fa-cog"></i></button>
            <div class="module-content" style="justify-content: center; text-align: center;">
                <div class="text-block text-white" style="max-width: 800px;">
                    <p class="editable-text text-large" id="texto-corpo2">Este é o texto descritivo do bloco Corpo 2. Como definido na arquitetura visual, ele não possui um título específico, apenas um longo parágrafo (texto corpo 2) que serve de apoio, o qual você pode modificar de forma dinâmica.</p>
                </div>
            </div>
        </section>
        <footer class="module-section" id="footer-section" style="background-image: url('https://images.unsplash.com/photo-1557683304-673a23048d34?auto=format&fit=crop&q=80&w=2000'); margin-bottom: 0;">
            <div class="bg-overlay" style="background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);"></div>
            <button class="bg-edit-btn" onclick="triggerImageUpload('footer-section', 'bg')" title="Alterar Rodapé BG"><i class="fas fa-cog"></i></button>
            <div class="module-content" style="padding: 20px; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                <p class="editable-text text-white" id="rodape-texto" style="font-size: 0.9rem; margin: 0; text-align: center;">© 2026 Template Modular de Design. Todos os direitos reservados. Você pode visualizar como o público acessará na aba Publicação.</p>
                <div class="body-img-container editable-image-wrapper" onclick="triggerImageUpload('footer-img', 'src')">
                    <img src="https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=400&q=80" alt="Logos Rodapé" class="body-img" id="footer-img" style="height: auto; max-height: 120px; object-fit: contain; box-shadow: none;">
                </div>
            </div>
        </footer>
    `;

    setTimeout(() => {
        initBuilderElements();
    }, 100);
}

window.openLandingPageBuilder = async function(id) {
    try {
        const res = await fetch(`/api/landing-pages/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            const data = await res.json();
            currentLandingPageId = data.id;
            document.getElementById('builder-title').value = data.title;
            
            // Render raw saved content
            if (data.content && data.content.html) {
                document.getElementById('template-container').innerHTML = data.content.html;
            }
            
            document.getElementById('landing-pages-panel').classList.add('hidden');
            document.getElementById('landing-page-builder-section').classList.remove('hidden');
            
            setTimeout(() => {
                initBuilderElements();
            }, 100);
        }
    } catch(e) {
        console.error(e);
        alert('Failed to load landing page');
    }
}

window.deleteLandingPage = async function(id) {
    if (!confirm('Are you sure you want to delete this landing page?')) return;
    try {
        const res = await fetch(`/api/landing-pages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            loadLandingPages();
        }
    } catch(e) {
        console.error(e);
    }
}

window.saveLandingPage = async function() {
    const title = document.getElementById('builder-title').value;
    const container = document.getElementById('template-container');
    
    // Save raw content for editing
    const rawContent = { html: container.innerHTML };
    
    // Create optimized compiled clone
    const clone = container.cloneNode(true);
    
    // Strip Editor Tooling
    clone.classList.remove('edit-mode');
    clone.querySelectorAll('.bg-edit-btn').forEach(el => el.remove());
    clone.querySelectorAll('.selected-element').forEach(el => el.classList.remove('selected-element'));
    clone.querySelectorAll('.editable-text').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('editable-text');
    });
    clone.querySelectorAll('.editable-image-wrapper').forEach(el => {
        el.classList.remove('editable-image-wrapper');
        el.style.cursor = 'default';
        el.removeAttribute('onclick'); // Important to remove manual inline triggers
    });
    
    const compiledHtml = clone.innerHTML;
    // For CSS, we rely on modular-style.css being served by the static viewer

    const payload = {
        title,
        content: rawContent,
        compiledHtml: compiledHtml,
        compiledCss: '' 
    };

    const url = currentLandingPageId 
        ? `/api/landing-pages/${currentLandingPageId}` 
        : '/api/landing-pages';
    const method = currentLandingPageId ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const data = await res.json();
            currentLandingPageId = data.id;
            alert('Landing page saved successfully!');
        } else {
            const err = await res.json();
            alert('Failed to save: ' + (err.error || 'Unknown error'));
        }
    } catch (e) {
        console.error(e);
        alert('Server error');
    }
}

// Ensure loadLandingPages is accessible on first tab switch
window.addEventListener('load', () => {
    // Overriding the switchSection logic from app.js to reload data if tab is active
    const originalSwitchSection = window.switchSection;
    if (originalSwitchSection) {
        window.switchSection = function(section) {
            originalSwitchSection(section);
            if (section === 'landingPages') {
                loadLandingPages();
            }
        };
    }
});

// ==========================================
// BUILDER LOGIC (Adapted from modular-template)
// ==========================================


    window.initDynamicEvents = function() {
        document.querySelectorAll('.editable-text').forEach(el => {
            el.setAttribute('contenteditable', isEditMode);
            if(el.dataset.eventsBound) return;
            el.dataset.eventsBound = 'true';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                setActiveElement(el, 'text');
            });
            el.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.originalEvent || e).clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        });

        document.querySelectorAll('.editable-image-wrapper').forEach(wrapper => {
            if(wrapper.dataset.eventsBound) return;
            wrapper.dataset.eventsBound = 'true';
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const img = wrapper.querySelector('img') || wrapper.querySelector('video') || wrapper;
                setActiveElement(img, 'image');
            });
        });

        if(typeof window.observeAnimations === 'function') window.observeAnimations();

        document.querySelectorAll('.bg-edit-btn').forEach(btn => {
            if(btn.dataset.eventsBound) return;
            btn.dataset.eventsBound = 'true';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = btn.closest('.module-section');
                if(section) setActiveElement(section, 'bg');
            });
        });
        
        document.querySelectorAll('.module-section').forEach(section => {
            if(section.dataset.eventsBoundBgMain) return;
            section.dataset.eventsBoundBgMain = 'true';
            section.addEventListener('click', (e) => {
                e.stopPropagation(); 
                setActiveElement(section, 'bg');
            });
        });
    };

    window.animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1 });

    window.observeAnimations = function() {
        try {
            window.animObserver.disconnect();
            document.querySelectorAll('.anim-fade-in, .anim-slide-up').forEach(el => {
                window.animObserver.observe(el);
            });
        } catch(e){}
    };
    

let isEditMode = true;
let activeElement = null;
let activeElementType = null; // 'text', 'image', 'bg'
let dragHandle = null;

function initBuilderElements() {
    isEditMode = true;
    activeElement = null;
    activeElementType = null;
    
    // Backward compatibility patch for existing pages loaded with raw HTML
    document.querySelectorAll('.bg-edit-btn').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-cog"></i>';
        btn.setAttribute('title', 'Alterar Background');
    });
    
    const bodyStyles = window.getComputedStyle(document.body);
    
    // Avoid double events
    if (dragHandle && dragHandle.parentNode) {
        dragHandle.parentNode.removeChild(dragHandle);
    }
    
    dragHandle = document.createElement('div');
    dragHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
    dragHandle.style.cssText = 'position:absolute; width: 30px; height: 30px; background: #0ea5e9; color: white; border-radius: 50%; display:none; justify-content:center; align-items:center; cursor:grab; z-index:10000; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    document.getElementById('builder-canvas').appendChild(dragHandle);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPosX = 0;
    let initialPosY = 0;

    dragHandle.addEventListener('mousedown', e => {
        if (!activeElement) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialPosX = parseInt(activeElement.dataset.posX) || 0;
        initialPosY = parseInt(activeElement.dataset.posY) || 0;
        dragHandle.style.cursor = 'grabbing';
        e.preventDefault();
    });

    const canvas = document.getElementById('builder-canvas');
    
    canvas.addEventListener('mousemove', e => {
        if (!isDragging || !activeElement) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        const newX = initialPosX + dx;
        const newY = initialPosY + dy;

        document.getElementById('pos-x-range').value = newX;
        document.getElementById('pos-y-range').value = newY;
        document.getElementById('pos-x-input').value = newX;
        document.getElementById('pos-y-input').value = newY;

        activeElement.dataset.posX = newX;
        activeElement.dataset.posY = newY;
        activeElement.style.transform = `translate(${newX}px, ${newY}px)`;

        updateDragHandlePos();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        if(dragHandle) dragHandle.style.cursor = 'grab';
    });

    // Reattach listeners to loaded texts
    const editableTexts = document.querySelectorAll('.editable-text');
    editableTexts.forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.onclick = (e) => {
            e.stopPropagation();
            setActiveElement(el, 'text');
        };
        el.onpaste = e => {
            e.preventDefault();
            const text = (e.originalEvent || e).clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        };
    });

    window.triggerImageUpload = function (targetId, type) {
        if (!isEditMode) return;
        if (window.event) window.event.stopPropagation();
        const targetElement = document.getElementById(targetId);
        if (type === 'src') setActiveElement(targetElement, 'image');
        else if (type === 'bg') setActiveElement(targetElement, 'bg');
    };

    document.getElementById('template-container').onclick = deselectElement;
    
    
    const templateModal = document.getElementById('template-modal');
    const templateCardsContainer = document.getElementById('template-cards-container');
    const bcontainer = document.getElementById('template-container');

    if(window.templatePresets && templateModal && templateCardsContainer && templateCardsContainer.children.length === 0) {
        window.templatePresets.forEach(tpl => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#1e293b; border-radius:12px; overflow:hidden; width:280px; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;';
            card.innerHTML = "\<img src=\"" + tpl.thumb + "\" style=\"width:100%; height:180px; object-fit:cover;\">\n<div style=\"padding:15px;text-align:center;color:white;font-weight:bold;\">" + tpl.name + "</div>";
            card.onmouseover = () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)'; };
            card.onmouseout = () => { card.style.transform = 'none'; card.style.boxShadow = 'none'; };
            card.onclick = () => {
                bcontainer.innerHTML = tpl.html;
                templateModal.style.display = 'none';
                if (window.initDynamicEvents) window.initDynamicEvents();
                if (window.observeAnimations) window.observeAnimations();
            };
            templateCardsContainer.appendChild(card);
        });
    }
    
    openSidePanel();
    if (window.initDynamicEvents) window.initDynamicEvents();
    if (window.observeAnimations) window.observeAnimations();
}

// Side Panel UI functions (using global document elements bound in init)

function updateDragHandlePos() {
    if (!activeElement || !isEditMode || activeElementType === 'bg' || !dragHandle) {
        if (dragHandle) dragHandle.style.display = 'none';
        return;
    }
    const canvas = document.getElementById('builder-canvas');
    const rect = activeElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    dragHandle.style.top = `${rect.top - canvasRect.top + canvas.scrollTop - 15}px`;
    dragHandle.style.left = `${rect.left - canvasRect.left + canvas.scrollLeft - 15}px`;
    dragHandle.style.display = 'flex';
}

function setActiveElement(element, type) {
    if (!isEditMode) return;
    if (activeElement) activeElement.classList.remove('selected-element');
    activeElement = element;
    activeElementType = type;
    if (activeElement) {
        activeElement.classList.add('selected-element');
        openSidePanel();
        syncPanelWithElement();
    }
}

function deselectElement(e) {
    if (e && e.target && (
        e.target.closest('.bg-edit-btn') || 
        e.target.closest('.editable-image-wrapper') || 
        e.target.closest('.editable-text') ||
        e.target.closest('.properties-panel-area')
    )) {
        return;
    }
    
    if (activeElement) {
        activeElement.classList.remove('selected-element');
        activeElement = null;
        activeElementType = null;
    }
    if (dragHandle) dragHandle.style.display = 'none';
    if (isEditMode) openSidePanel();
}

function openSidePanel() {
    if (!isEditMode) return;
    const propertiesPanel = document.getElementById('properties-panel');
    if (!propertiesPanel) return;
    const builderSection = document.getElementById('landing-page-builder-section');
    
    propertiesPanel.classList.remove('hidden');
    builderSection.classList.add('panel-open'); // To fix right margin

    const noSelectionMsg = document.getElementById('no-selection-msg');
    const textOptions = document.getElementById('text-options');
    const imageOptions = document.getElementById('image-options');
    const bgOptions = document.getElementById('bg-options');
    const boxOptions = document.getElementById('box-options');
    const positionOptions = document.getElementById('position-options');
    const fxOptions = document.getElementById('fx-options');

    // Esconde todos
    [textOptions, imageOptions, bgOptions, boxOptions, positionOptions, fxOptions].forEach(o => o.classList.add('hidden'));
    
    if (noSelectionMsg) noSelectionMsg.classList.remove('hidden');

    if (activeElement) {
        if (noSelectionMsg) noSelectionMsg.classList.add('hidden');
        boxOptions.classList.remove('hidden');
        fxOptions.classList.remove('hidden');
        if (activeElementType !== 'bg') positionOptions.classList.remove('hidden');

        const bgTypeSelect = document.getElementById('bg-type-select');

        if (activeElementType === 'text') {
            textOptions.classList.remove('hidden');
            bgOptions.classList.remove('hidden');
            const optImage = bgTypeSelect.querySelector('option[value="image"]');
            optImage.style.display = 'none';
            optImage.disabled = true;
            document.getElementById('blur-row').classList.add('hidden');
            document.getElementById('opacity-row').classList.remove('hidden');
            if (bgTypeSelect.value === 'image') bgTypeSelect.value = 'color';
        }
        else if (activeElementType === 'image') {
            imageOptions.classList.remove('hidden');
        }
        else if (activeElementType === 'bg') {
            bgOptions.classList.remove('hidden');
            document.getElementById('blur-row').classList.remove('hidden');
            const optImage = bgTypeSelect.querySelector('option[value="image"]');
            optImage.style.display = 'block';
            optImage.disabled = false;
            document.getElementById('opacity-row').classList.add('hidden');
        }

        const type = bgTypeSelect.value;
        document.getElementById('bg-image-controls').classList.toggle('hidden', type !== 'image');
        document.getElementById('bg-color-controls').classList.toggle('hidden', type !== 'color');
        document.getElementById('bg-grad-controls').classList.toggle('hidden', type !== 'gradient' && type !== 'radial');
    }
}

function syncPanelWithElement() {
    if (!activeElement) return;
    const computed = window.getComputedStyle(activeElement);
    
    const posXRange = document.getElementById('pos-x-range');
    const posYRange = document.getElementById('pos-y-range');
    const posXInput = document.getElementById('pos-x-input');
    const posYInput = document.getElementById('pos-y-input');
    const marginInput = document.getElementById('margin-input');
    const paddingInput = document.getElementById('padding-input');
    const borderRadiusInput = document.getElementById('border-radius-input');
    const borderStyleSelect = document.getElementById('border-style-select');
    const borderWidthInput = document.getElementById('border-width-input');
    const borderColorType = document.getElementById('border-color-type');
    const bgTypeSelect = document.getElementById('bg-type-select');
    const bgOpacityRange = document.getElementById('bg-opacity-range');
    const fontSelect = document.getElementById('font-family-select');
    const fontSizeInput = document.getElementById('font-size-input');
    const textColorInput = document.getElementById('text-color-input');
    const imageScaleRange = document.getElementById('image-scale-range');
    const imageScaleInput = document.getElementById('image-scale-input');

    // New Fields
    const textLinkInput = document.getElementById('text-link-input');
    const tsX = document.getElementById('ts-x');
    const tsY = document.getElementById('ts-y');
    const tsBlur = document.getElementById('ts-blur');
    const tsColor = document.getElementById('ts-color');
    const bsX = document.getElementById('bs-x');
    const bsY = document.getElementById('bs-y');
    const bsBlur = document.getElementById('bs-blur');
    const bsSpread = document.getElementById('bs-spread');
    const bsColor = document.getElementById('bs-color');
    const bsInset = document.getElementById('bs-inset');
    const animSelect = document.getElementById('anim-select');
    const stickyCheckbox = document.getElementById('sticky-checkbox');

    const px = activeElement.dataset.posX || 0;
    const py = activeElement.dataset.posY || 0;
    posXRange.value = px;
    posYRange.value = py;
    if (posXInput) posXInput.value = px;
    if (posYInput) posYInput.value = py;

    updateDragHandlePos();

    marginInput.value = parseInt(computed.margin) || 0;
    paddingInput.value = parseInt(computed.padding) || 0;
    borderRadiusInput.value = parseInt(computed.borderRadius) || 0;
    borderStyleSelect.value = computed.borderStyle !== 'none' ? computed.borderStyle : 'none';
    borderWidthInput.value = parseInt(computed.borderWidth) || 0;

    borderColorType.value = activeElement.dataset.borderType || 'solid-color';
    borderColorType.dispatchEvent(new Event('change'));

    if (activeElementType === 'bg') {
        const savedType = activeElement.dataset.bgType;
        if (savedType) {
            bgTypeSelect.value = savedType;
        } else {
            const bgImage = computed.backgroundImage;
            if (bgImage !== 'none' && !bgImage.includes('gradient')) bgTypeSelect.value = 'image';
            else if (bgImage.includes('radial-gradient')) bgTypeSelect.value = 'radial';
            else if (bgImage.includes('gradient')) bgTypeSelect.value = 'gradient';
            else bgTypeSelect.value = 'color';
        }
        document.getElementById('bg-image-controls').classList.toggle('hidden', bgTypeSelect.value !== 'image');
        document.getElementById('bg-color-controls').classList.toggle('hidden', bgTypeSelect.value !== 'color');
        document.getElementById('bg-grad-controls').classList.toggle('hidden', bgTypeSelect.value !== 'gradient' && bgTypeSelect.value !== 'radial');
        bgOpacityRange.value = 100;
    }

    if (activeElementType === 'text') {
        fontSelect.value = computed.fontFamily.replace(/"/g, "'");
        fontSizeInput.value = parseInt(computed.fontSize);
        textColorInput.value = rgbToHex(computed.color);

        // Sync Link se existir
        const firstA = activeElement.querySelector('a');
        if (activeElement.tagName.toLowerCase() === 'a') {
            if (textLinkInput) textLinkInput.value = activeElement.href;
        } else if (firstA) {
            if (textLinkInput) textLinkInput.value = firstA.href;
        } else {
            if (textLinkInput) textLinkInput.value = '';
        }

        // Sync Text Shadow
        if(computed.textShadow && computed.textShadow !== 'none') {
            const colorMatch = computed.textShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
            if(colorMatch) tsColor.value = rgbToHex(colorMatch[0]);
            
            let shadowStr = computed.textShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').trim();
            const pxVals = shadowStr.match(/-?\d+/g);
            if(pxVals && pxVals.length >= 2){
                tsX.value = parseInt(pxVals[0]);
                tsY.value = parseInt(pxVals[1]);
                tsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
            }
        } else {
            tsX.value = 0; tsY.value = 0; tsBlur.value = 0;
        }

        const textBg = computed.backgroundColor;
        const matchBg = /rgba?\\(.*,\\s*.*,\\s*.*,?\\s*([\\d.]+)?\\)/.exec(textBg);
        let textAlpha = 0;
        if (matchBg && matchBg[1] !== undefined) textAlpha = parseFloat(matchBg[1]);
        else if (textBg.startsWith('rgb(') && textBg !== 'rgba(0, 0, 0, 0)') textAlpha = 1;
        else if (textBg === 'rgba(0, 0, 0, 0)') textAlpha = 0;
        bgOpacityRange.value = textAlpha * 100;
    } else if (activeElementType === 'image') {
        const scale = activeElement.dataset.scale || 100;
        imageScaleRange.value = scale;
        if(imageScaleInput) imageScaleInput.value = scale;
    }

    // Sync Box Shadow Global
    if (computed.boxShadow && computed.boxShadow !== 'none') {
        const isInset = computed.boxShadow.includes('inset');
        bsInset.checked = isInset;
        const colorMatch = computed.boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
        if(colorMatch) bsColor.value = rgbToHex(colorMatch[0]);

        let shadowStr = computed.boxShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').replace('inset', '').trim();
        const pxVals = shadowStr.match(/-?\d+/g);
        if(pxVals && pxVals.length >= 2){
            bsX.value = parseInt(pxVals[0]);
            bsY.value = parseInt(pxVals[1]);
            bsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
            bsSpread.value = pxVals[3] ? parseInt(pxVals[3]) : 0;
        }
    } else {
        bsX.value=0; bsY.value=0; bsBlur.value=0; bsSpread.value=0; bsInset.checked=false;
    }

    // Sync FX
    let animFound = "";
    activeElement.classList.forEach(c => { if(c.startsWith('anim-')) animFound = c; });
    animSelect.value = animFound;
    stickyCheckbox.checked = computed.position === 'sticky';
}

// Global Event setup for properties panel (doing this on load)
window.addEventListener('load', () => {
    
    
    const applyLinkBtn = document.getElementById('apply-link-btn');
    const removeLinkBtn = document.getElementById('remove-link-btn');
    const textLinkInput = document.getElementById('text-link-input');
    const tsX = document.getElementById('ts-x');
    const tsY = document.getElementById('ts-y');
    const tsBlur = document.getElementById('ts-blur');
    const tsColor = document.getElementById('ts-color');
    const bsX = document.getElementById('bs-x');
    const bsY = document.getElementById('bs-y');
    const bsBlur = document.getElementById('bs-blur');
    const bsSpread = document.getElementById('bs-spread');
    const bsColor = document.getElementById('bs-color');
    const bsInset = document.getElementById('bs-inset');
    const animSelect = document.getElementById('anim-select');
    const stickyCheckbox = document.getElementById('sticky-checkbox');
    const imageScaleInput = document.getElementById('image-scale-input');

nst toggleBtn = document.getElementById('toggle-mode-btn');
    const editableTexts = document.querySelectorAll('.editable-text');
    const imageInput = document.getElementById('image-upload-input');

    // Sidebar elements
    const propertiesPanel = document.getElementById('properties-panel');
    const closePanelBtn = document.getElementById('close-panel-btn');

    const textOptions = document.getElementById('text-options');
    const imageOptions = document.getElementById('image-options');
    const bgOptions = document.getElementById('bg-options');
    const boxOptions = document.getElementById('box-options');
    const positionOptions = document.getElementById('position-options');

    // Controls
    const fontSelect = document.getElementById('font-family-select');
    const fontSizeInput = document.getElementById('font-size-input');
    const textColorInput = document.getElementById('text-color-input');
    const styleBtns = document.querySelectorAll('.style-btn');
    const alignBtns = document.querySelectorAll('.align-btn');

    const imageScaleRange = document.getElementById('image-scale-range');
    const imgAlignBtns = document.querySelectorAll('.img-align-btn');

    const bgTypeSelect = document.getElementById('bg-type-select');
    const uploadPanelBtn = document.getElementById('upload-panel-btn');
    const uploadImgPanelBtn = document.getElementById('upload-img-panel-btn');
    const bgColorInput = document.getElementById('bg-color-input');
    const bgGrad1 = document.getElementById('bg-grad1');
    const bgGrad2 = document.getElementById('bg-grad2');
    const bgBlurRange = document.getElementById('bg-blur-range');
    const bgOpacityRange = document.getElementById('bg-opacity-range');

    // Box Constraints
    const marginInput = document.getElementById('margin-input');
    const paddingInput = document.getElementById('padding-input');
    const borderRadiusInput = document.getElementById('border-radius-input');
    const borderStyleSelect = document.getElementById('border-style-select');
    const borderWidthInput = document.getElementById('border-width-input');
    const borderColorType = document.getElementById('border-color-type');
    const borderColorInput = document.getElementById('border-color-input');
    const borderGrad1 = document.getElementById('border-grad1');
    const borderGrad2 = document.getElementById('border-grad2');

    const posXRange = document.getElementById('pos-x-range');
    const posYRange = document.getElementById('pos-y-range');
    const posXInput = document.getElementById('pos-x-input');
    const posYInput = document.getElementById('pos-y-input');

    let isEditMode = true;
    let activeElement = null;
    let activeElementType = null; // 'text', 'image', 'bg'

    // --- TEMPLATE MODAL LOGIC ---
    const templateModal = document.getElementById('template-modal');
    const templateCardsContainer = document.getElementById('template-cards-container');
    const templateContainer = document.getElementById('template-container');

    if(window.templatePresets && templateModal && templateCardsContainer) {
        window.templatePresets.forEach(tpl => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#1e293b; border-radius:12px; overflow:hidden; width:280px; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;';
            card.innerHTML = `<img src="${tpl.thumb}" style="width:100%; height:180px; object-fit:cover;">
                              <div style="padding:15px;text-align:center;color:white;font-weight:bold;">${tpl.name}</div>`;
            card.onmouseover = () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)'; };
            card.onmouseout = () => { card.style.transform = 'none'; card.style.boxShadow = 'none'; };
            card.onclick = () => {
                templateContainer.innerHTML = tpl.html;
                templateModal.style.display = 'none';
                initDynamicEvents();
            };
            templateCardsContainer.appendChild(card);
        });
    }

    // Text Link & Shadow & Fx inputs
    const textLinkInput = document.getElementById('text-link-input');
    const applyLinkBtn = document.getElementById('apply-link-btn');
    const removeLinkBtn = document.getElementById('remove-link-btn');
    const tsX = document.getElementById('ts-x');
    const tsY = document.getElementById('ts-y');
    const tsBlur = document.getElementById('ts-blur');
    const tsColor = document.getElementById('ts-color');
    const bsX = document.getElementById('bs-x');
    const bsY = document.getElementById('bs-y');
    const bsBlur = document.getElementById('bs-blur');
    const bsSpread = document.getElementById('bs-spread');
    const bsColor = document.getElementById('bs-color');
    const bsInset = document.getElementById('bs-inset');

    const imageScaleInput = document.getElementById('image-scale-input');
    const animSelect = document.getElementById('anim-select');
    const stickyCheckbox = document.getElementById('sticky-checkbox');
    const fxOptions = document.getElementById('fx-options');

    // --- DRAG HANDLE UI ---
    const dragHandle = document.createElement('div');
    dragHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
    dragHandle.style.cssText = 'position:absolute; width: 30px; height: 30px; background: #0ea5e9; color: white; border-radius: 50%; display:none; justify-content:center; align-items:center; cursor:grab; z-index:10000; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    document.body.appendChild(dragHandle);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPosX = 0;
    let initialPosY = 0;

    dragHandle.addEventListener('mousedown', e => {
        if (!activeElement) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialPosX = parseInt(activeElement.dataset.posX) || 0;
        initialPosY = parseInt(activeElement.dataset.posY) || 0;
        dragHandle.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging || !activeElement) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        const newX = initialPosX + dx;
        const newY = initialPosY + dy;

        posXRange.value = newX;
        posYRange.value = newY;
        if (posXInput) posXInput.value = newX;
        if (posYInput) posYInput.value = newY;

        activeElement.dataset.posX = newX;
        activeElement.dataset.posY = newY;
        activeElement.style.transform = `translate(${newX}px, ${newY}px)`;

        updateDragHandlePos();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
    });

    function updateDragHandlePos() {
        if (!activeElement || !isEditMode || activeElementType === 'bg') {
            dragHandle.style.display = 'none';
            return;
        }

        const rect = activeElement.getBoundingClientRect();
        dragHandle.style.top = `${rect.top + window.scrollY - 15}px`;
        dragHandle.style.left = `${rect.left + window.scrollX - 15}px`;
        dragHandle.style.display = 'flex';
    }

    document.addEventListener('scroll', updateDragHandlePos);
    window.addEventListener('resize', updateDragHandlePos);

    // Alternar Visualização (Publish Mode toggle)
    toggleBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            body.className = 'edit-mode';
            openSidePanel(); // Sempre mantenha aberto no modo edição!
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Visualizar Publicação';
            toggleBtn.classList.remove('publish-mode');
            enableTextEditing(true);
        } else {
            body.className = 'view-mode';
            deselectElement(); // Tira seleções se tiver alguma
            hidePanelCompletely(); // Oculta a sidebar para simular a view
            toggleBtn.innerHTML = '<i class="fas fa-edit"></i> Voltar para Edição';
            toggleBtn.classList.add('publish-mode');
            enableTextEditing(false);
            showFloatingBackButton();
        }
    });

    function enableTextEditing(enable) {
        document.querySelectorAll('.editable-text').forEach(el => {
            el.setAttribute('contenteditable', enable);
        });
    }

    function initDynamicEvents() {
        // --- 1. Textos Editáveis ---
        document.querySelectorAll('.editable-text').forEach(el => {
            el.setAttribute('contenteditable', isEditMode);
            if(el.dataset.eventsBound) return;
            el.dataset.eventsBound = 'true';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                setActiveElement(el, 'text');
            });
            el.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.originalEvent || e).clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        });

        // --- 2. Imagens Editáveis ---
        document.querySelectorAll('.editable-image-wrapper').forEach(wrapper => {
            if(wrapper.dataset.eventsBound) return;
            wrapper.dataset.eventsBound = 'true';
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const img = wrapper.querySelector('img') || wrapper.querySelector('video') || wrapper;
                setActiveElement(img, 'image');
            });
        });

        // Atualizar os observadores caso templates iniciais tragam animacoes novas
        if(typeof observeAnimations === 'function') observeAnimations();

        // --- 3. Fundo Editável (Botões) ---
        document.querySelectorAll('.bg-edit-btn').forEach(btn => {
            if(btn.dataset.eventsBound) return;
            btn.dataset.eventsBound = 'true';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = btn.closest('.module-section');
                if(section) setActiveElement(section, 'bg');
            });
        });
        // --- 4. Clicar no corpo principal da Div para editar as bordas/fundo ---
        document.querySelectorAll('.module-section').forEach(section => {
            if(section.dataset.eventsBoundBgMain) return;
            section.dataset.eventsBoundBgMain = 'true';
            section.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede o #template-container de rodar deselectElement()
                setActiveElement(section, 'bg');
            });
        });
    }
    // --- CSS Animation Observer ---
    const animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1 });

    function observeAnimations() {
        animObserver.disconnect();
        document.querySelectorAll('.anim-fade-in, .anim-slide-up').forEach(el => {
            // Immediately toggle off if not intersecting to reset the animation properly
            animObserver.observe(el);
        });
    }

    // Primeira chamada para elementos que vieram default no index.html
    initDynamicEvents(); 
    observeAnimations();

    // ==========================================
    // SELECTION & SIDEBAR LOGIC (Intuitivo)
    // ==========================================

    function setActiveElement(element, type) {
        if (!isEditMode) return;

        // Remove destaque do anterior
        if (activeElement) activeElement.classList.remove('selected-element');

        activeElement = element;
        activeElementType = type;

        if (activeElement) {
            activeElement.classList.add('selected-element');
            openSidePanel();
            syncPanelWithElement();
        }
    }

    // Manter fallback legacy só por precaução
    window.triggerImageUpload = function (targetId, type) {
        if (!isEditMode) return;
        if (window.event) window.event.stopPropagation();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (!targetElement) return;
        
        if (type === 'src') setActiveElement(targetElement, 'image');
        else if (type === 'bg') setActiveElement(targetElement, 'bg');
    };

    function openSidePanel() {
        if (!isEditMode) return;
        propertiesPanel.classList.remove('hidden');
        body.classList.add('panel-open');

        const noSelectionMsg = document.getElementById('no-selection-msg');

        // Esconde todos
        textOptions.classList.add('hidden');
        imageOptions.classList.add('hidden');
        bgOptions.classList.add('hidden');
        boxOptions.classList.add('hidden');
        positionOptions.classList.add('hidden');
        if (noSelectionMsg) noSelectionMsg.classList.remove('hidden');

        // Revela mediante seleção
        if (activeElement) {
            if (noSelectionMsg) noSelectionMsg.classList.add('hidden');
            boxOptions.classList.remove('hidden'); // Box é global 
            fxOptions.classList.remove('hidden'); // Animações são globais
            if (activeElementType !== 'bg') {
                positionOptions.classList.remove('hidden'); // Offset bloqueado no bg
            }

            if (activeElementType === 'text') {
                textOptions.classList.remove('hidden');
                bgOptions.classList.remove('hidden'); // Texto ganha background

                const optImage = document.getElementById('bg-type-select').querySelector('option[value="image"]');
                optImage.style.display = 'none';
                optImage.disabled = true;

                document.getElementById('blur-row').classList.add('hidden');
                document.getElementById('opacity-row').classList.remove('hidden');

                if (bgTypeSelect.value === 'image') bgTypeSelect.value = 'color';
            }
            else if (activeElementType === 'image') {
                imageOptions.classList.remove('hidden');
            }
            else if (activeElementType === 'bg') {
                bgOptions.classList.remove('hidden');
                document.getElementById('blur-row').classList.remove('hidden');

                const optImage = document.getElementById('bg-type-select').querySelector('option[value="image"]');
                optImage.style.display = 'block';
                optImage.disabled = false;
                
                document.getElementById('opacity-row').classList.add('hidden');
            }

            // Apenas atualiza a UI do dropdown de tipos sem disparar "change" e quebrar a renderização!
            const type = bgTypeSelect.value;
            document.getElementById('bg-image-controls').classList.toggle('hidden', type !== 'image');
            document.getElementById('bg-color-controls').classList.toggle('hidden', type !== 'color');
            document.getElementById('bg-grad-controls').classList.toggle('hidden', type !== 'gradient' && type !== 'radial');
        }
    }

    function hidePanelCompletely() {
        propertiesPanel.classList.add('hidden');
        body.classList.remove('panel-open');
    }

    function deselectElement() {
        if (activeElement) {
            activeElement.classList.remove('selected-element');
            activeElement = null;
            activeElementType = null;
        }
        dragHandle.style.display = 'none';
        if (isEditMode) openSidePanel(); // Atualiza a UI da UI para fallback
    }

    closePanelBtn.addEventListener('click', hidePanelCompletely);

    // Em vez de esconder, apenas tira o hook no elemento focado
    document.getElementById('template-container').addEventListener('click', deselectElement);

    // Inicializa abrindo a sidebar
    openSidePanel();

    // ==========================================
    // SINCROCINZAR UI DO PAINEL COM O ELEMENTO
    // ==========================================
    function syncPanelWithElement() {
        const computed = window.getComputedStyle(activeElement);

        const px = activeElement.dataset.posX || 0;
        const py = activeElement.dataset.posY || 0;
        posXRange.value = px;
        posYRange.value = py;
        if (posXInput) posXInput.value = px;
        if (posYInput) posYInput.value = py;

        updateDragHandlePos();

        marginInput.value = parseInt(computed.margin) || 0;
        paddingInput.value = parseInt(computed.padding) || 0;
        borderRadiusInput.value = parseInt(computed.borderRadius) || 0;
        borderStyleSelect.value = computed.borderStyle !== 'none' ? computed.borderStyle : 'none';
        borderWidthInput.value = parseInt(computed.borderWidth) || 0;

        borderColorType.value = activeElement.dataset.borderType || 'solid-color';
        borderColorType.dispatchEvent(new Event('change'));

        if (activeElementType === 'bg') {
            const savedType = activeElement.dataset.bgType;
            if (savedType) {
                bgTypeSelect.value = savedType;
            } else {
                const bgImage = computed.backgroundImage;
                if (bgImage !== 'none' && !bgImage.includes('gradient')) bgTypeSelect.value = 'image';
                else if (bgImage.includes('radial-gradient')) bgTypeSelect.value = 'radial';
                else if (bgImage.includes('gradient')) bgTypeSelect.value = 'gradient';
                else bgTypeSelect.value = 'color';
            }
            
            // Segurança: Apenas mostra o menu correto sem re-renderizar em cima da DIV
            document.getElementById('bg-image-controls').classList.toggle('hidden', bgTypeSelect.value !== 'image');
            document.getElementById('bg-color-controls').classList.toggle('hidden', bgTypeSelect.value !== 'color');
            document.getElementById('bg-grad-controls').classList.toggle('hidden', bgTypeSelect.value !== 'gradient' && bgTypeSelect.value !== 'radial');

            // Ignorando opacidade da div global, pois o slider esta escondido para BGs principais agora.
            bgOpacityRange.value = 100;
        }

        if (activeElementType === 'text') {
            fontSelect.value = computed.fontFamily.replace(/"/g, "'"); // normaliza aspa
            fontSizeInput.value = parseInt(computed.fontSize);
            textColorInput.value = rgbToHex(computed.color);

            // Sync Link se existir
            const firstA = activeElement.querySelector('a');
            if (activeElement.tagName.toLowerCase() === 'a') {
                if (textLinkInput) textLinkInput.value = activeElement.href;
            } else if (firstA) {
                if (textLinkInput) textLinkInput.value = firstA.href;
            } else {
                if (textLinkInput) textLinkInput.value = '';
            }

            // Sync Text Shadow
            if(computed.textShadow && computed.textShadow !== 'none') {
                const colorMatch = computed.textShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
                if(colorMatch) tsColor.value = rgbToHex(colorMatch[0]);
                
                let shadowStr = computed.textShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').trim();
                const pxVals = shadowStr.match(/-?\d+/g);
                if(pxVals && pxVals.length >= 2){
                    tsX.value = parseInt(pxVals[0]);
                    tsY.value = parseInt(pxVals[1]);
                    tsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
                }
            } else {
                tsX.value = 0; tsY.value = 0; tsBlur.value = 0;
            }

            const textBg = computed.backgroundColor;
            const matchBg = /rgba?\(.*,\s*.*,\s*.*,?\s*([\d.]+)?\)/.exec(textBg);
            let textAlpha = 0;
            if (matchBg && matchBg[1] !== undefined) textAlpha = parseFloat(matchBg[1]);
            else if (textBg.startsWith('rgb(') && textBg !== 'rgba(0, 0, 0, 0)') textAlpha = 1;
            else if (textBg === 'rgba(0, 0, 0, 0)') textAlpha = 0;
            bgOpacityRange.value = textAlpha * 100;

        } else if (activeElementType === 'image') {
            const scale = activeElement.dataset.scale || 100;
            imageScaleRange.value = scale;
            if(imageScaleInput) imageScaleInput.value = scale;
        }

        // Sync Box Shadow Global
        if (computed.boxShadow && computed.boxShadow !== 'none') {
            const isInset = computed.boxShadow.includes('inset');
            bsInset.checked = isInset;
            const colorMatch = computed.boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
            if(colorMatch) bsColor.value = rgbToHex(colorMatch[0]);

            let shadowStr = computed.boxShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').replace('inset', '').trim();
            const pxVals = shadowStr.match(/-?\d+/g);
            if(pxVals && pxVals.length >= 2){
                bsX.value = parseInt(pxVals[0]);
                bsY.value = parseInt(pxVals[1]);
                bsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
                bsSpread.value = pxVals[3] ? parseInt(pxVals[3]) : 0;
            }
        } else {
            bsX.value=0; bsY.value=0; bsBlur.value=0; bsSpread.value=0; bsInset.checked=false;
        }

        // Sync FX
        let animFound = "";
        activeElement.classList.forEach(c => { if(c.startsWith('anim-')) animFound = c; });
        animSelect.value = animFound;
        stickyCheckbox.checked = computed.position === 'sticky';
    }

    // ==========================================
    // LIVE UPDATE LOGIC: PANEL -> DOM
    // ==========================================

    const applyStyle = (prop, val) => { if (activeElement) activeElement.style[prop] = val; };

    function hasSelectionInActiveElement() {
        const sel = window.getSelection();
        if(!sel.rangeCount || sel.isCollapsed) return false;
        let node = sel.anchorNode;
        while(node) {
            if(node === activeElement) return true;
            node = node.parentNode;
        }
        return false;
    }

    function applyInlineStyleOrGlobal(prop, globalValue, execCommandName, execValue) {
        if (!activeElement) return;
        if (hasSelectionInActiveElement() && execCommandName) {
            document.execCommand('styleWithCSS', false, true);
            if(execCommandName === 'spanWrap') {
                const span = document.createElement('span');
                span.style[prop] = globalValue;
                const sel = window.getSelection();
                const range = sel.getRangeAt(0);
                range.surroundContents(span);
            } else {
                document.execCommand(execCommandName, false, execValue);
            }
        } else {
            applyStyle(prop, globalValue);
        }
    }

    // --- Controladores de Texto ---
    fontSelect.addEventListener('change', e => {
        applyInlineStyleOrGlobal('fontFamily', e.target.value, 'fontName', e.target.value);
    });

    fontSizeInput.addEventListener('input', e => {
        let val = e.target.value;
        if (!isNaN(val) && val !== "") val += 'px';
        applyInlineStyleOrGlobal('fontSize', val, 'spanWrap', val);
    });

    textColorInput.addEventListener('input', e => {
        applyInlineStyleOrGlobal('color', e.target.value, 'foreColor', e.target.value);
    });

    styleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(hasSelectionInActiveElement()) {
                const cmd = btn.dataset.style === 'fontWeight' ? 'bold' : 'italic';
                document.execCommand('styleWithCSS', false, true);
                document.execCommand(cmd, false, null);
                return;
            }
            const prop = btn.dataset.style;
            const val = btn.dataset.value;
            const computed = window.getComputedStyle(activeElement)[prop];
            applyStyle(prop, (computed.includes(val) || computed > 400) ? 'normal' : val);
        });
    });

    alignBtns.forEach(btn => {
        btn.addEventListener('click', () => applyStyle('textAlign', btn.dataset.align));
    });

    if(applyLinkBtn) {
        applyLinkBtn.addEventListener('click', () => {
            const url = textLinkInput.value.trim();
            if (!url || !activeElement) return;
            
            if (hasSelectionInActiveElement()) {
                document.execCommand('createLink', false, url);
            } else {
                if (activeElement.tagName.toLowerCase() === 'a') {
                    activeElement.href = url;
                } else {
                    const range = document.createRange();
                    range.selectNodeContents(activeElement);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    document.execCommand('createLink', false, url);
                }
            }
        });
    }

    if(removeLinkBtn) {
        removeLinkBtn.addEventListener('click', () => {
            if (!activeElement) return;
            if (hasSelectionInActiveElement()) {
                document.execCommand('unlink', false, null);
            } else {
                activeElement.querySelectorAll('a').forEach(a => {
                    const text = document.createTextNode(a.textContent);
                    a.parentNode.replaceChild(text, a);
                });
                textLinkInput.value = '';
            }
        });
    }

    // --- Controladores de Sombras ---
    const updateTextShadow = () => { applyStyle('textShadow', `${tsX.value}px ${tsY.value}px ${tsBlur.value}px ${tsColor.value}`); };
    tsX.addEventListener('input', updateTextShadow);
    tsY.addEventListener('input', updateTextShadow);
    tsBlur.addEventListener('input', updateTextShadow);
    tsColor.addEventListener('input', updateTextShadow);

    const updateBoxShadow = () => { 
        const inset = bsInset.checked ? 'inset ' : '';
        applyStyle('boxShadow', `${inset}${bsX.value}px ${bsY.value}px ${bsBlur.value}px ${bsSpread.value}px ${bsColor.value}`); 
    };
    bsX.addEventListener('input', updateBoxShadow);
    bsY.addEventListener('input', updateBoxShadow);
    bsBlur.addEventListener('input', updateBoxShadow);
    bsSpread.addEventListener('input', updateBoxShadow);
    bsColor.addEventListener('input', updateBoxShadow);
    bsInset.addEventListener('change', updateBoxShadow);

    // --- Fx & Animações ---
    animSelect.addEventListener('change', e => {
        if(!activeElement) return;
        ['anim-float', 'anim-pulse', 'anim-fade-in', 'anim-slide-up'].forEach(c => activeElement.classList.remove(c));
        if(e.target.value) activeElement.classList.add(e.target.value);
        if(typeof observeAnimations === 'function') observeAnimations();
    });
    
    stickyCheckbox.addEventListener('change', e => {
        if(!activeElement) return;
        if(e.target.checked) {
            applyStyle('position', 'sticky');
            applyStyle('top', '0');
            applyStyle('zIndex', '500');
        } else {
            applyStyle('position', 'relative');
            applyStyle('top', 'auto');
            applyStyle('zIndex', 'auto');
        }
    });

    // --- Controladores de Imagem ---
    const updateImgScale = (val) => {
        imageScaleRange.value = val;
        if(imageScaleInput) imageScaleInput.value = val;
        if(activeElement){
            activeElement.dataset.scale = val;
            applyStyle('width', `${val}%`);
        }
    };
    imageScaleRange.addEventListener('input', e => updateImgScale(e.target.value));
    if(imageScaleInput) imageScaleInput.addEventListener('input', e => updateImgScale(e.target.value));

    imgAlignBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Imagens e logos estao num container editable-image-wrapper
            const container = activeElement.closest('.editable-image-wrapper') || activeElement.parentElement;
            container.style.display = 'flex';
            container.style.justifyContent = btn.dataset.align;
        });
    });

    // --- Controladores de Fundo (Background Divs) ---
    bgTypeSelect.addEventListener('change', e => {
        let type = e.target.value;
        if (activeElementType === 'text' && type === 'image') {
            type = 'color';
            e.target.value = 'color';
        }

        if (activeElement) activeElement.dataset.bgType = type;

        document.getElementById('bg-image-controls').classList.toggle('hidden', type !== 'image');
        document.getElementById('bg-color-controls').classList.toggle('hidden', type !== 'color');
        document.getElementById('bg-grad-controls').classList.toggle('hidden', type !== 'gradient' && type !== 'radial');
        updateBgRender();
    });

    const updateBgRender = () => {
        if (!activeElement || (activeElementType !== 'bg' && activeElementType !== 'text')) return;

        const type = bgTypeSelect.value;
        const opacity = parseFloat(bgOpacityRange.value) / 100;

        const overlay = activeElement.querySelector('.bg-overlay');

        if (type === 'color') {
            activeElement.style.backgroundImage = 'none';
            activeElement.style.backgroundColor = hexToRgba(bgColorInput.value, activeElementType === 'text' ? opacity : 1);
            if (overlay) {
                overlay.style.backgroundColor = 'transparent';
                overlay.style.backdropFilter = 'none';
            }
        } else if (type === 'gradient') {
            let c1 = hexToRgba(bgGrad1.value, activeElementType === 'text' ? opacity : 1); // Gradiente puro
            let c2 = hexToRgba(bgGrad2.value, activeElementType === 'text' ? opacity : 1);
            activeElement.style.backgroundColor = 'transparent';
            activeElement.style.backgroundImage = `linear-gradient(135deg, ${c1}, ${c2})`;
            activeElement.style.opacity = 1; // Nunca some com a div base
            if (overlay) {
                overlay.style.backgroundColor = 'transparent';
                overlay.style.backdropFilter = 'none';
            }
        } else if (type === 'radial') {
            let c1 = hexToRgba(bgGrad1.value, activeElementType === 'text' ? opacity : 1);
            let c2 = hexToRgba(bgGrad2.value, activeElementType === 'text' ? opacity : 1);
            activeElement.style.backgroundColor = activeElementType === 'text' ? 'transparent' : '#1e293b'; 
            activeElement.style.backgroundImage = `radial-gradient(circle at 10% 20%, ${c1} 0%, transparent 60%), radial-gradient(circle at 90% 80%, ${c2} 0%, transparent 60%)`;
            activeElement.style.opacity = 1;
            if (overlay) {
                overlay.style.backgroundColor = 'transparent';
                overlay.style.backdropFilter = 'none';
            }
        } else if (type === 'image' && activeElementType === 'bg') {
            activeElement.style.opacity = 1;
            if (overlay) {
                overlay.style.backgroundColor = 'transparent'; // Ficticio - não aplica escuridão global
                overlay.style.backdropFilter = `blur(${bgBlurRange.value}px)`;
            }
        }
    };

    bgColorInput.addEventListener('input', updateBgRender);
    bgGrad1.addEventListener('input', updateBgRender);
    bgGrad2.addEventListener('input', updateBgRender);
    bgOpacityRange.addEventListener('input', updateBgRender);

    bgBlurRange.addEventListener('input', e => {
        if (!activeElement || activeElementType !== 'bg') return;
        // Blur manipulado no pseudo layer da div (.bg-overlay)
        const overlay = activeElement.querySelector('.bg-overlay');
        if (overlay) overlay.style.backdropFilter = `blur(${e.target.value}px)`;
    });

    // --- Controladores de Restrição do Bloco (Box Margin e Borders) ---
    marginInput.addEventListener('input', e => applyStyle('margin', `${e.target.value}px`));
    paddingInput.addEventListener('input', e => applyStyle('padding', `${e.target.value}px`));
    borderRadiusInput.addEventListener('input', e => applyStyle('borderRadius', `${e.target.value}px`));

    borderStyleSelect.addEventListener('change', e => {
        applyStyle('borderStyle', e.target.value);
        if (e.target.value !== 'none' && !activeElement.style.borderWidth) applyStyle('borderWidth', '2px');
    });
    borderWidthInput.addEventListener('input', e => applyStyle('borderWidth', `${e.target.value}px`));

    borderColorType.addEventListener('change', e => {
        const type = e.target.value;
        if (activeElement) activeElement.dataset.borderType = type;

        document.getElementById('border-solid-controls').classList.toggle('hidden', type !== 'solid-color');
        document.getElementById('border-grad-controls').classList.toggle('hidden', type !== 'gradient');

        // Desativar radius base se gradiente
        if (type === 'gradient') {
            borderRadiusInput.disabled = true;
            borderRadiusInput.style.opacity = '0.4';
            borderStyleSelect.disabled = true;
            borderStyleSelect.style.opacity = '0.4';
            applyStyle('borderStyle', 'solid'); // Forçar fallback visual
        } else {
            borderRadiusInput.disabled = false;
            borderRadiusInput.style.opacity = '1';
            borderStyleSelect.disabled = false;
            borderStyleSelect.style.opacity = '1';
            applyStyle('borderImage', 'none');
            applyStyle('borderStyle', borderStyleSelect.value); // Retorna a config original
        }
        updateBorderRender();
    });

    const updateBorderRender = () => {
        if (!activeElement) return;
        const type = borderColorType.value;
        if (type === 'gradient') {
            activeElement.style.borderImage = `linear-gradient(135deg, ${borderGrad1.value}, ${borderGrad2.value}) 1`;
        } else {
            activeElement.style.borderImage = 'none';
            activeElement.style.borderColor = borderColorInput.value;
        }
    };

    borderColorInput.addEventListener('input', updateBorderRender);
    borderGrad1.addEventListener('input', updateBorderRender);
    borderGrad2.addEventListener('input', updateBorderRender);

    const updatePositionRender = (e) => {
        if (!activeElement) return;

        if (e && e.target) {
            if (e.target === posXInput) posXRange.value = posXInput.value || 0;
            if (e.target === posYInput) posYRange.value = posYInput.value || 0;
            if (e.target === posXRange) posXInput.value = posXRange.value;
            if (e.target === posYRange) posYInput.value = posYRange.value;
        }

        const x = posXRange.value;
        const y = posYRange.value;
        activeElement.dataset.posX = x;
        activeElement.dataset.posY = y;
        activeElement.style.transform = `translate(${x}px, ${y}px)`;
        updateDragHandlePos();
    };

    posXRange.addEventListener('input', updatePositionRender);
    posYRange.addEventListener('input', updatePositionRender);
    if (posXInput) posXInput.addEventListener('input', updatePositionRender);
    if (posYInput) posYInput.addEventListener('input', updatePositionRender);


    // --- Engine de Upload de Foto ---
    uploadPanelBtn.addEventListener('click', () => imageInput.click());
    if (uploadImgPanelBtn) uploadImgPanelBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && activeElement) {
            const reader = new FileReader();
            reader.onload = function (e) {
                if (activeElementType === 'image') {
                    activeElement.src = e.target.result;
                } else if (activeElementType === 'bg') {
                    bgTypeSelect.value = 'image';
                    // Reverte se estivesse gradient
                    document.getElementById('bg-image-controls').classList.remove('hidden');
                    document.getElementById('bg-color-controls').classList.add('hidden');
                    document.getElementById('bg-grad-controls').classList.add('hidden');

                    activeElement.style.backgroundImage = `url(${e.target.result})`;
                }
            };
            reader.readAsDataURL(file);
        }
        imageInput.value = '';
    });

    // 
});
    }

    // Text Link & Shadow & Fx inputs
    const textLinkInput = document.getElementById('text-link-input');
    const applyLinkBtn = document.getElementById('apply-link-btn');
    const removeLinkBtn = document.getElementById('remove-link-btn');
    const tsX = document.getElementById('ts-x');
    const tsY = document.getElementById('ts-y');
    const tsBlur = document.getElementById('ts-blur');
    const tsColor = document.getElementById('ts-color');
    const bsX = document.getElementById('bs-x');
    const bsY = document.getElementById('bs-y');
    const bsBlur = document.getElementById('bs-blur');
    const bsSpread = document.getElementById('bs-spread');
    const bsColor = document.getElementById('bs-color');
    const bsInset = document.getElementById('bs-inset');

    const imageScaleInput = document.getElementById('image-scale-input');
    const animSelect = document.getElementById('anim-select');
    const stickyCheckbox = document.getElementById('sticky-checkbox');
    const fxOptions = document.getElementById('fx-options');

    // --- DRAG HANDLE UI ---
    const dragHandle = document.createElement('div');
    dragHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
    dragHandle.style.cssText = 'position:absolute; width: 30px; height: 30px; background: #0ea5e9; color: white; border-radius: 50%; display:none; justify-content:center; align-items:center; cursor:grab; z-index:10000; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    document.body.appendChild(dragHandle);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPosX = 0;
    let initialPosY = 0;

    dragHandle.addEventListener('mousedown', e => {
        if (!activeElement) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialPosX = parseInt(activeElement.dataset.posX) || 0;
        initialPosY = parseInt(activeElement.dataset.posY) || 0;
        dragHandle.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging || !activeElement) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        const newX = initialPosX + dx;
        const newY = initialPosY + dy;

        posXRange.value = newX;
        posYRange.value = newY;
        if (posXInput) posXInput.value = newX;
        if (posYInput) posYInput.value = newY;

        activeElement.dataset.posX = newX;
        activeElement.dataset.posY = newY;
        activeElement.style.transform = `translate(${newX}px, ${newY}px)`;

        updateDragHandlePos();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
    });

    function updateDragHandlePos() {
        if (!activeElement || !isEditMode || activeElementType === 'bg') {
            dragHandle.style.display = 'none';
            return;
        }

        const rect = activeElement.getBoundingClientRect();
        dragHandle.style.top = `${rect.top + window.scrollY - 15}px`;
        dragHandle.style.left = `${rect.left + window.scrollX - 15}px`;
        dragHandle.style.display = 'flex';
    }

    document.addEventListener('scroll', updateDragHandlePos);
    window.addEventListener('resize', updateDragHandlePos);

    // Alternar Visualização (Publish Mode toggle)
    toggleBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        if (isEditMode) {
            body.className = 'edit-mode';
            openSidePanel(); // Sempre mantenha aberto no modo edição!
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Visualizar Publicação';
            toggleBtn.classList.remove('publish-mode');
            enableTextEditing(true);
        } else {
            body.className = 'view-mode';
            deselectElement(); // Tira seleções se tiver alguma
            hidePanelCompletely(); // Oculta a sidebar para simular a view
            toggleBtn.innerHTML = '<i class="fas fa-edit"></i> Voltar para Edição';
            toggleBtn.classList.add('publish-mode');
            enableTextEditing(false);
            showFloatingBackButton();
        }
    });

    function enableTextEditing(enable) {
        document.querySelectorAll('.editable-text').forEach(el => {
            el.setAttribute('contenteditable', enable);
        });
    }

    function initDynamicEvents() {
        // --- 1. Textos Editáveis ---
        document.querySelectorAll('.editable-text').forEach(el => {
            el.setAttribute('contenteditable', isEditMode);
            if(el.dataset.eventsBound) return;
            el.dataset.eventsBound = 'true';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                setActiveElement(el, 'text');
            });
            el.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.originalEvent || e).clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        });

        // --- 2. Imagens Editáveis ---
        document.querySelectorAll('.editable-image-wrapper').forEach(wrapper => {
            if(wrapper.dataset.eventsBound) return;
            wrapper.dataset.eventsBound = 'true';
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const img = wrapper.querySelector('img') || wrapper.querySelector('video') || wrapper;
                setActiveElement(img, 'image');
            });
        });

        // Atualizar os observadores caso templates iniciais tragam animacoes novas
        if(typeof observeAnimations === 'function') observeAnimations();

        // --- 3. Fundo Editável (Botões) ---
        document.querySelectorAll('.bg-edit-btn').forEach(btn => {
            if(btn.dataset.eventsBound) return;
            btn.dataset.eventsBound = 'true';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = btn.closest('.module-section');
                if(section) setActiveElement(section, 'bg');
            });
        });
        // --- 4. Clicar no corpo principal da Div para editar as bordas/fundo ---
        document.querySelectorAll('.module-section').forEach(section => {
            if(section.dataset.eventsBoundBgMain) return;
            section.dataset.eventsBoundBgMain = 'true';
            section.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede o #template-container de rodar deselectElement()
                setActiveElement(section, 'bg');
            });
        });
    }
    // --- CSS Animation Observer ---
    const animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1 });

    function observeAnimations() {
        animObserver.disconnect();
        document.querySelectorAll('.anim-fade-in, .anim-slide-up').forEach(el => {
            // Immediately toggle off if not intersecting to reset the animation properly
            animObserver.observe(el);
        });
    }

    // Primeira chamada para elementos que vieram default no index.html
    initDynamicEvents(); 
    observeAnimations();

    // ==========================================
    // SELECTION & SIDEBAR LOGIC (Intuitivo)
    // ==========================================

    function setActiveElement(element, type) {
        if (!isEditMode) return;

        // Remove destaque do anterior
        if (activeElement) activeElement.classList.remove('selected-element');

        activeElement = element;
        activeElementType = type;

        if (activeElement) {
            activeElement.classList.add('selected-element');
            openSidePanel();
            syncPanelWithElement();
        }
    }

    // Manter fallback legacy só por precaução
    window.triggerImageUpload = function (targetId, type) {
        if (!isEditMode) return;
        if (window.event) window.event.stopPropagation();
        const targetElement = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
        if (!targetElement) return;
        
        if (type === 'src') setActiveElement(targetElement, 'image');
        else if (type === 'bg') setActiveElement(targetElement, 'bg');
    };

    function openSidePanel() {
        if (!isEditMode) return;
        propertiesPanel.classList.remove('hidden');
        body.classList.add('panel-open');

        const noSelectionMsg = document.getElementById('no-selection-msg');

        // Esconde todos
        textOptions.classList.add('hidden');
        imageOptions.classList.add('hidden');
        bgOptions.classList.add('hidden');
        boxOptions.classList.add('hidden');
        positionOptions.classList.add('hidden');
        if (noSelectionMsg) noSelectionMsg.classList.remove('hidden');

        // Revela mediante seleção
        if (activeElement) {
            if (noSelectionMsg) noSelectionMsg.classList.add('hidden');
            boxOptions.classList.remove('hidden'); // Box é global 
            fxOptions.classList.remove('hidden'); // Animações são globais
            if (activeElementType !== 'bg') {
                positionOptions.classList.remove('hidden'); // Offset bloqueado no bg
            }

            if (activeElementType === 'text') {
                textOptions.classList.remove('hidden');
                bgOptions.classList.remove('hidden'); // Texto ganha background

                const optImage = document.getElementById('bg-type-select').querySelector('option[value="image"]');
                optImage.style.display = 'none';
                optImage.disabled = true;

                document.getElementById('blur-row').classList.add('hidden');
                document.getElementById('opacity-row').classList.remove('hidden');

                if (bgTypeSelect.value === 'image') bgTypeSelect.value = 'color';
            }
            else if (activeElementType === 'image') {
                imageOptions.classList.remove('hidden');
            }
            else if (activeElementType === 'bg') {
                bgOptions.classList.remove('hidden');
                document.getElementById('blur-row').classList.remove('hidden');

                const optImage = document.getElementById('bg-type-select').querySelector('option[value="image"]');
                optImage.style.display = 'block';
                optImage.disabled = false;
                
                document.getElementById('opacity-row').classList.add('hidden');
            }

            // Apenas atualiza a UI do dropdown de tipos sem disparar "change" e quebrar a renderização!
            const type = bgTypeSelect.value;
            document.getElementById('bg-image-controls').classList.toggle('hidden', type !== 'image');
            document.getElementById('bg-color-controls').classList.toggle('hidden', type !== 'color');
            document.getElementById('bg-grad-controls').classList.toggle('hidden', type !== 'gradient' && type !== 'radial');
        }
    }

    function hidePanelCompletely() {
        propertiesPanel.classList.add('hidden');
        body.classList.remove('panel-open');
    }

    function deselectElement() {
        if (activeElement) {
            activeElement.classList.remove('selected-element');
            activeElement = null;
            activeElementType = null;
        }
        dragHandle.style.display = 'none';
        if (isEditMode) openSidePanel(); // Atualiza a UI da UI para fallback
    }

    closePanelBtn.addEventListener('click', hidePanelCompletely);

    // Em vez de esconder, apenas tira o hook no elemento focado
    document.getElementById('template-container').addEventListener('click', deselectElement);

    // Inicializa abrindo a sidebar
    openSidePanel();

    // ==========================================
    // SINCROCINZAR UI DO PAINEL COM O ELEMENTO
    // ==========================================
    function syncPanelWithElement() {
        const computed = window.getComputedStyle(activeElement);

        const px = activeElement.dataset.posX || 0;
        const py = activeElement.dataset.posY || 0;
        posXRange.value = px;
        posYRange.value = py;
        if (posXInput) posXInput.value = px;
        if (posYInput) posYInput.value = py;

        updateDragHandlePos();

        marginInput.value = parseInt(computed.margin) || 0;
        paddingInput.value = parseInt(computed.padding) || 0;
        borderRadiusInput.value = parseInt(computed.borderRadius) || 0;
        borderStyleSelect.value = computed.borderStyle !== 'none' ? computed.borderStyle : 'none';
        borderWidthInput.value = parseInt(computed.borderWidth) || 0;

        borderColorType.value = activeElement.dataset.borderType || 'solid-color';
        borderColorType.dispatchEvent(new Event('change'));

        if (activeElementType === 'bg') {
            const savedType = activeElement.dataset.bgType;
            if (savedType) {
                bgTypeSelect.value = savedType;
            } else {
                const bgImage = computed.backgroundImage;
                if (bgImage !== 'none' && !bgImage.includes('gradient')) bgTypeSelect.value = 'image';
                else if (bgImage.includes('radial-gradient')) bgTypeSelect.value = 'radial';
                else if (bgImage.includes('gradient')) bgTypeSelect.value = 'gradient';
                else bgTypeSelect.value = 'color';
            }
            
            // Segurança: Apenas mostra o menu correto sem re-renderizar em cima da DIV
            document.getElementById('bg-image-controls').classList.toggle('hidden', bgTypeSelect.value !== 'image');
            document.getElementById('bg-color-controls').classList.toggle('hidden', bgTypeSelect.value !== 'color');
            document.getElementById('bg-grad-controls').classList.toggle('hidden', bgTypeSelect.value !== 'gradient' && bgTypeSelect.value !== 'radial');

            // Ignorando opacidade da div global, pois o slider esta escondido para BGs principais agora.
            bgOpacityRange.value = 100;
        }

        if (activeElementType === 'text') {
            fontSelect.value = computed.fontFamily.replace(/"/g, "'"); // normaliza aspa
            fontSizeInput.value = parseInt(computed.fontSize);
            textColorInput.value = rgbToHex(computed.color);

            // Sync Link se existir
            const firstA = activeElement.querySelector('a');
            if (activeElement.tagName.toLowerCase() === 'a') {
                if (textLinkInput) textLinkInput.value = activeElement.href;
            } else if (firstA) {
                if (textLinkInput) textLinkInput.value = firstA.href;
            } else {
                if (textLinkInput) textLinkInput.value = '';
            }

            // Sync Text Shadow
            if(computed.textShadow && computed.textShadow !== 'none') {
                const colorMatch = computed.textShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
                if(colorMatch) tsColor.value = rgbToHex(colorMatch[0]);
                
                let shadowStr = computed.textShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').trim();
                const pxVals = shadowStr.match(/-?\d+/g);
                if(pxVals && pxVals.length >= 2){
                    tsX.value = parseInt(pxVals[0]);
                    tsY.value = parseInt(pxVals[1]);
                    tsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
                }
            } else {
                tsX.value = 0; tsY.value = 0; tsBlur.value = 0;
            }

            const textBg = computed.backgroundColor;
            const matchBg = /rgba?\(.*,\s*.*,\s*.*,?\s*([\d.]+)?\)/.exec(textBg);
            let textAlpha = 0;
            if (matchBg && matchBg[1] !== undefined) textAlpha = parseFloat(matchBg[1]);
            else if (textBg.startsWith('rgb(') && textBg !== 'rgba(0, 0, 0, 0)') textAlpha = 1;
            else if (textBg === 'rgba(0, 0, 0, 0)') textAlpha = 0;
            bgOpacityRange.value = textAlpha * 100;

        } else if (activeElementType === 'image') {
            const scale = activeElement.dataset.scale || 100;
            imageScaleRange.value = scale;
            if(imageScaleInput) imageScaleInput.value = scale;
        }

        // Sync Box Shadow Global
        if (computed.boxShadow && computed.boxShadow !== 'none') {
            const isInset = computed.boxShadow.includes('inset');
            bsInset.checked = isInset;
            const colorMatch = computed.boxShadow.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+/);
            if(colorMatch) bsColor.value = rgbToHex(colorMatch[0]);

            let shadowStr = computed.boxShadow.replace(/rgba?\([^)]+\)|#[0-9a-fA-F]+/g, '').replace('inset', '').trim();
            const pxVals = shadowStr.match(/-?\d+/g);
            if(pxVals && pxVals.length >= 2){
                bsX.value = parseInt(pxVals[0]);
                bsY.value = parseInt(pxVals[1]);
                bsBlur.value = pxVals[2] ? parseInt(pxVals[2]) : 0;
                bsSpread.value = pxVals[3] ? parseInt(pxVals[3]) : 0;
            }
        } else {
            bsX.value=0; bsY.value=0; bsBlur.value=0; bsSpread.value=0; bsInset.checked=false;
        }

        // Sync FX
        let animFound = "";
        activeElement.classList.forEach(c => { if(c.startsWith('anim-')) animFound = c; });
        animSelect.value = animFound;
        stickyCheckbox.checked = computed.position === 'sticky';
    }

    // ==========================================
    // LIVE UPDATE LOGIC: PANEL -> DOM
    // ==========================================

    const applyStyle = (prop, val) => { if (activeElement) activeElement.style[prop] = val; };

    \n
});

function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16) || 0;
    let g = parseInt(hex.slice(3, 5), 16) || 0;
    let b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb || "#000000";
    const result = /rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/.exec(rgb);
    return result ? "#" + ((1 << 24 | parseInt(result[1]) << 16 | parseInt(result[2]) << 8 | parseInt(result[3])).toString(16).slice(1)) : "#000000";
}

// In case the tab is selected immediately
loadLandingPages();
