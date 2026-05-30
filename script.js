// --- APPLICATION ARCHITECTURE STATE ---
let appState = {
    currentUser: JSON.parse(localStorage.getItem('lk_current_user')) || null,
    links: JSON.parse(localStorage.getItem('lk_links')) || [],
    activeSpace: 'all',
    activeTag: null,
    currentView: 'grid',
    selectedInspectIndex: null
};

// --- DOM ELEMENTS REFERENCE ---
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const userDisplayEmail = document.getElementById('user-display-email');
const logoutBtn = document.getElementById('logout-btn');

const quickAddForm = document.getElementById('quick-add-form');
const linksWrapper = document.getElementById('links-wrapper');
const globalSearch = document.getElementById('global-search');
const currentSpaceTitle = document.getElementById('current-space-title');

const rightInspector = document.getElementById('right-inspector');
const closeInspector = document.getElementById('close-inspector');
const inspectTitle = document.getElementById('inspect-title');
const inspectUrl = document.getElementById('inspect-url');
const inspectTagsDisplay = document.getElementById('inspect-tags-display');
const inspectDate = document.getElementById('inspect-date');
const inspectClicks = document.getElementById('inspect-clicks');
const inspectDeleteBtn = document.getElementById('inspect-delete-btn');

let isSignUpMode = true;

// --- AUTHENTICATION INTERACTION ENGINE ---
function checkAuthStatus() {
    if (appState.currentUser) {
        authOverlay.classList.add('hidden');
        userDisplayEmail.textContent = appState.currentUser.email;
        renderAppWorkspace();
    } else {
        authOverlay.classList.remove('hidden');
    }
}

authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    authTitle.textContent = isSignUpMode ? "Welcome to LinkKeep Pro" : "Welcome Back";
    authSubtitle.textContent = isSignUpMode ? "Sign up to unlock infinite spaces and nested folders." : "Enter your credentials to reaccess your secure vault.";
    authSubmitBtn.textContent = isSignUpMode ? "Create Account" : "Secure Authorization";
    document.getElementById('auth-toggle-text').textContent = isSignUpMode ? "Already have an account?" : "Need a premium account?";
    authToggleLink.textContent = isSignUpMode ? "Sign In" : "Sign Up";
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    // Basic mock authentication login simulation
    appState.currentUser = { email: email, uid: 'usr_' + Date.now() };
    localStorage.setItem('lk_current_user', JSON.stringify(appState.currentUser));
    checkAuthStatus();
});

logoutBtn.addEventListener('click', () => {
    appState.currentUser = null;
    localStorage.removeItem('lk_current_user');
    rightInspector.classList.add('hidden');
    checkAuthStatus();
});

// --- CORE INTERFACE LOGIC & MUTATIONS ---
quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('new-link-title').value;
    const url = document.getElementById('new-link-url').value;
    const rawTags = document.getElementById('new-link-tags').value;
    
    // Process flexible tag inputs
    const tagsArray = rawTags.split(',')
                             .map(t => t.trim().toLowerCase().replace('#', ''))
                             .filter(t => t.length > 0);

    const newLinkItem = {
        id: 'lnk_' + Date.now(),
        userId: appState.currentUser.uid,
        title: title,
        url: url,
        space: appState.activeSpace === 'all' ? 'work' : appState.activeSpace, 
        tags: tagsArray,
        clicks: 0,
        createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };

    appState.links.unshift(newLinkItem);
    saveDataToDisk();
    quickAddForm.reset();
    renderAppWorkspace();
});

function saveDataToDisk() {
    localStorage.setItem('lk_links', JSON.stringify(appState.links));
}

// --- RENDERING CONFIGURATIONS (CANVAS LOGIC) ---
function renderAppWorkspace() {
    linksWrapper.innerHTML = '';
    
    // Apply Active View Setup
    linksWrapper.className = appState.currentView === 'grid' ? 'grid-view' : 'list-view';

    // Filters application: Search query context + Space focus state + Tag filtering
    const searchTarget = globalSearch.value.toLowerCase();
    
    const filteredDataset = appState.links.filter(link => {
        // Validate user link isolation constraints
        if (link.userId !== appState.currentUser.uid) return false;
        
        const matchesSpace = appState.activeSpace === 'all' || link.space === appState.activeSpace;
        const matchesTag = !appState.activeTag || link.tags.includes(appState.activeTag);
        const matchesSearch = link.title.toLowerCase().includes(searchTarget) || 
                              link.url.toLowerCase().includes(searchTarget) ||
                              link.tags.some(t => t.toLowerCase().includes(searchTarget));
                              
        return matchesSpace && matchesTag && matchesSearch;
    });

    if(filteredDataset.length === 0) {
        linksWrapper.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No high-value assets identified matching active scope.</div>`;
        return;
    }

    filteredDataset.forEach((link) => {
        const card = document.createElement('div');
        card.classList.add('premium-card');
        card.setAttribute('data-id', link.id);
        
        // Generate flexible iterative markup blocks
        const tagsMarkup = link.tags.map(t => `<span class="card-tag">#${t}</span>`).join('');

        card.innerHTML = `
            <div class="card-meta-group">
                <h3 class="card-title-text">${link.title}</h3>
                <p class="card-url-text">${link.url}</p>
                <div class="tags-container">${tagsMarkup}</div>
            </div>
            <div class="card-footer">
                <a href="${link.url}" target="_blank" class="btn-open" data-action="redirect">Explore Secure Link ↗</a>
                <span style="font-size:0.75rem; color: var(--text-muted)">📈 Clicks: ${link.clicks}</span>
            </div>
        `;

        // Interactive Card Click Handler for the Inspector Sidebar Panel
        card.addEventListener('click', (e) => {
            if(e.target.hasAttribute('data-action')) {
                // Tracking analytics redirect engagement values
                link.clicks++;
                saveDataToDisk();
                return; 
            }
            openInspectorPanel(link);
        });

        linksWrapper.appendChild(card);
    });
}

// --- COMPREHENSIVE SIDEBAR INSPECTOR SUBSYSTEM ---
function openInspectorPanel(linkItem) {
    const originalIndex = appState.links.findIndex(l => l.id === linkItem.id);
    appState.selectedInspectIndex = originalIndex;

    inspectTitle.value = linkItem.title;
    inspectUrl.value = linkItem.url;
    inspectDate.textContent = linkItem.createdAt;
    inspectClicks.textContent = linkItem.clicks;

    // Redraw Inspector tags
    inspectTagsDisplay.innerHTML = linkItem.tags.map(t => `<span class="tag">#${t}</span>`).join('') || '<span style="color:var(--text-muted); font-size:0.8rem;">No tags</span>';
    
    rightInspector.classList.remove('hidden');
}

// Dynamic real-time inline updates triggered directly out from input focus changes
[inspectTitle, inspectUrl].forEach(input => {
    input.addEventListener('change', () => {
        if(appState.selectedInspectIndex !== null) {
            const targetLink = appState.links[appState.selectedInspectIndex];
            targetLink.title = inspectTitle.value;
            targetLink.url = inspectUrl.value;
            saveDataToDisk();
            renderAppWorkspace();
        }
    });
});

inspectDeleteBtn.addEventListener('click', () => {
    if(appState.selectedInspectIndex !== null) {
        appState.links.splice(appState.selectedInspectIndex, 1);
        saveDataToDisk();
        rightInspector.classList.add('hidden');
        appState.selectedInspectIndex = null;
        renderAppWorkspace();
    }
});

closeInspector.addEventListener('click', () => rightInspector.classList.add('hidden'));

// --- GLOBAL EVENT REGISTRATIONS & VIEW DELEGATION ---
document.querySelectorAll('#spaces-list li').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('#spaces-list li').forEach(li => li.classList.remove('active'));
        e.target.classList.add('active');
        appState.activeSpace = e.target.getAttribute('data-space');
        currentSpaceTitle.textContent = e.target.textContent;
        renderAppWorkspace();
    });
});

document.querySelectorAll('#tags-cloud .tag').forEach(tagEl => {
    tagEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('active')) {
            e.target.classList.remove('active');
            appState.activeTag = null;
        } else {
            document.querySelectorAll('#tags-cloud .tag').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            appState.activeTag = e.target.getAttribute('data-tag');
        }
        renderAppWorkspace();
    });
});

document.getElementById('view-grid').addEventListener('click', (e) => {
    appState.currentView = 'grid';
    document.getElementById('view-list').classList.remove('active');
    e.target.classList.add('active');
    renderAppWorkspace();
});

document.getElementById('view-list').addEventListener('click', (e) => {
    appState.currentView = 'list';
    document.getElementById('view-grid').classList.remove('active');
    e.target.classList.add('active');
    renderAppWorkspace();
});

globalSearch.addEventListener('input', renderAppWorkspace);

// Global hotkeys to maximize product professional usability metrics
window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== globalSearch && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        globalSearch.focus();
    }
});

// INITIAL APPLICATION INITIALIZATION BOOT
checkAuthStatus();