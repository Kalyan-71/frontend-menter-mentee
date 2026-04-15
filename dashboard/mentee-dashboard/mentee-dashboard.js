
// const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';


let allMentors = [];
let myMentors = [];
let recommendedMentors = [];



document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'Mentee';
    
    // Debug: Log what's in localStorage
    console.log('LocalStorage Debug:');
    console.log('Username:', username);
    console.log('Role:', role);
    console.log('All localStorage:', localStorage);
    
    // Check if user is actually a mentee
    if (!role || role !== 'Mentee') {
        alert('No role found. Please login again.');
        window.location.href = '../../login page/login.html';
        return;
    }
    
    // Update UI with user info
    document.getElementById('userName').textContent = username;
    document.getElementById('welcomeName').textContent = username;
    
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
    
    // Load dynamic data
    await Promise.all([
        loadMyMentors(),
        loadRecommendedMentors()
    ]);
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadMyMentors() {
    try {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
            redirectToLogin();
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/connections/my-mentors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load my mentors');
        
        const data = await response.json();
        myMentors = data.data || [];

        console.log("My mentors:", myMentors);
        
        renderMyMentors();
        updateStats();
        
    } catch (error) {
        console.error('Error loading my mentors:', error);
        renderMyMentorsEmpty();
    }
}

async function loadRecommendedMentors() {
    try {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
            redirectToLogin();
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/connections/mentors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load mentors');
        
        const data = await response.json();
        allMentors = data.data || [];
        
        // Filter out already connected mentors for recommendations
        const connectedMentorIds = new Set(myMentors.map(m => m.mentor._id));
        recommendedMentors = allMentors
            .filter(m => !connectedMentorIds.has(m._id) && !m.connectionStatus)
            .slice(0, 3); // Take top 3 recommendations

        console.log("Recommended mentors:", recommendedMentors);
        
        renderRecommendedMentors();
        
    } catch (error) {
        console.error('Error loading recommended mentors:', error);
        renderRecommendedMentorsEmpty();
    }
}

// ==========================================
// RENDERING - MY MENTORS
// ==========================================
function renderMyMentors() {
    const cards = document.querySelectorAll('.card');
    let myMentorsCard = null;
    
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('My Mentors')) {
            myMentorsCard = card;
            break;
        }
    }
    
    if (!myMentorsCard) return;
    
    if (myMentors.length === 0) {
        myMentorsCard.innerHTML = `
            <h2 class="section-title">My Mentors</h2>
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👤</div>
                <p>No mentors connected yet</p>
                <button class="btn-primary" onclick="browseMentors()" style="margin-top: 1rem;">Find Mentors</button>
            </div>
        `;
        return;
    }
    
    const mentorsHTML = myMentors.map(conn => `
        <div class="my-mentor-item" style="
            display: flex;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
            cursor: pointer;
            transition: background 0.2s;
        " onmouseover="this.style.background='#f5f5f5'" 
           onmouseout="this.style.background='transparent'"
           onclick="viewMentorProfile('${conn.mentor._id}')">
            <div style="
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin-right: 1rem;
                overflow: hidden;
            ">
                ${conn.mentor.avatar ? `<img src="${conn.mentor.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0; color: #333;">${conn.mentor.fullname}</h4>
                
            </div>
            <button class="btn-icon" onclick="event.stopPropagation(); messageMentor('${conn.mentor._id}')" style="
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0.5rem;
            ">💬</button>
        </div>
    `).join('');
    
    myMentorsCard.innerHTML = `
        <h2 class="section-title">My Mentors</h2>
        <div class="my-mentors-list" style="margin-bottom: 1rem;">
            ${mentorsHTML}
        </div>
        <button class="btn-primary" onclick="viewAllMentors()">View All Mentors</button>
    `;
}

function renderMyMentorsEmpty() {
    const cards = document.querySelectorAll('.card');
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('My Mentors')) {
            card.innerHTML = `
                <h2 class="section-title">My Mentors</h2>
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p>Failed to load mentors</p>
                    <button class="btn-primary" onclick="loadMyMentors()" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
            break;
        }
    }
}

// ==========================================
// RENDERING - RECOMMENDED MENTORS
// ==========================================
function renderRecommendedMentors() {
    const cards = document.querySelectorAll('.card');
    let recommendedCard = null;
    
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('Recommended Mentors')) {
            recommendedCard = card;
            break;
        }
    }
    
    if (!recommendedCard) return;
    
    if (recommendedMentors.length === 0) {
        recommendedCard.innerHTML = `
            <h2 class="section-title">
                Recommended Mentors
                <span class="ai-badge">🤖 AI Powered</span>
            </h2>
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                <p>No new recommendations available</p>
                <p style="font-size: 0.9rem; color: #666;">You've connected with all available mentors!</p>
            </div>
        `;
        return;
    }
    
    const mentorsHTML = recommendedMentors.map(mentor => {
        const skillsToShow = mentor.skills.slice(0, 3);
        return `
        <div class="mentor-card" onclick="viewMentorProfile('${mentor._id}')" style="cursor: pointer;">
            <div class="mentor-header">
                <div class="mentor-avatar" style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    overflow: hidden;
                ">
                    ${mentor.avatar ? `<img src="${mentor.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                <div class="mentor-info">
                    <h4>${mentor.fullname}</h4>
                    <p>${mentor.industry || 'Professional'} • ${mentor.yearsOfExperience || 'Experienced'}</p>
                </div>
                <span class="match-score" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 0.3rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                ">${mentor.matchScore || Math.floor(Math.random() * 10 + 90)}% Match</span>
            </div>
            <div class="mentor-skills" style="margin: 1rem 0;">
                ${skillsToShow.map(skill => `<span class="skill-tag" style="
                    background: #f0f0f0;
                    color: #555;
                    padding: 0.3rem 0.8rem;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    margin-right: 0.5rem;
                    display: inline-block;
                    margin-bottom: 0.3rem;
                ">${skill}</span>`).join('')}
            </div>
            <button class="btn-connect" onclick="event.stopPropagation(); sendConnectionRequest('${mentor._id}')" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 0.6rem 1.2rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                width: 100%;
                transition: transform 0.2s, box-shadow 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'"
               onmouseout="this.style.transform='';this.style.boxShadow=''">
                Connect
            </button>
        </div>
    `}).join('');
    
    recommendedCard.innerHTML = `
        <h2 class="section-title">
            Recommended Mentors
            <span class="ai-badge">🤖 AI Powered</span>
        </h2>
        ${mentorsHTML}
        <button class="btn-primary" onclick="browseMentors()" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 1rem;
            transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'"
           onmouseout="this.style.transform='';this.style.boxShadow=''">
            Browse All Mentors
        </button>
    `;
}

function renderRecommendedMentorsEmpty() {
    const cards = document.querySelectorAll('.card');
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('Recommended Mentors')) {
            card.innerHTML = `
                <h2 class="section-title">
                    Recommended Mentors
                    <span class="ai-badge">🤖 AI Powered</span>
                </h2>
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p>Failed to load recommendations</p>
                    <button class="btn-primary" onclick="loadRecommendedMentors()" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
            break;
        }
    }
}

// ==========================================
// STATS UPDATE
// ==========================================
function updateStats() {
    // Update Active Mentors count
    const activeMentors = myMentors.filter(m => m.status === 'accepted').length;
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards.length >= 4) {
        // First card is Active Mentors
        const activeMentorsValue = statCards[0].querySelector('.stat-value');
        if (activeMentorsValue) {
            animateNumber(activeMentorsValue, activeMentors);
        }
    }
}

function animateNumber(element, target) {
    const start = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// ==========================================
// ACTIONS
// ==========================================
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../../login page/login.html';
    }
}

function viewMentorProfile(mentorId) {
    localStorage.setItem('viewMentorId', mentorId);
    window.location.href = `../../profile/public-profile.html?id=${mentorId}`;
}

async function sendConnectionRequest(mentorId) {
    const mentor = recommendedMentors.find(m => m._id === mentorId) || allMentors.find(m => m._id === mentorId);
    if (!mentor) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${API_BASE_URL}/connections/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                mentorId: mentorId,
                message: `Hi ${mentor.fullname}, I'd like to connect with you for mentorship!`
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send request');
        }
        
        showToast(`✉️ Connection request sent to ${mentor.fullname}! You'll be notified when they respond.`, 'success');
        
        await Promise.all([
            loadMyMentors(),
            loadRecommendedMentors()
        ]);
        
    } catch (error) {
        showToast(error.message || 'Failed to send request', 'error');
    }
}



function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
            align-items: center;
        gap: 0.5rem;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
function browseMentors() {
    window.location.href = '../../mentor-search/mentor-search.html';
}

function viewAllGoals() {
    window.location.href = '../../goals tracker/goals-tracker.html';
}

function findMentors() {
    window.location.href = '../../mentor-search/mentor-search.html';
}

function createGoal() {
    window.location.href = '../../goals tracker/goals-tracker.html';
}

function viewMessages() {
    window.location.href = '../../messaging/messaging.html';
}

function viewResources() {
    alert('Opening resource library...');
}

function viewAllMentors() {
    window.location.href = '../../mentor-search/mentor-search.html';
}

function messageMentor(mentorId) {
    window.location.href = `../../messaging/messaging.html?user=${mentorId}`;
}

function redirectToLogin() {
    window.location.href = '../../login page/login.html';
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.viewMessages = viewMessages;
window.messageMentor = messageMentor;
window.viewMentorProfile = viewMentorProfile;
window.sendConnectionRequest = sendConnectionRequest;
window.browseMentors = browseMentors;
window.viewAllGoals = viewAllGoals;
window.findMentors = findMentors;
window.createGoal = createGoal;
window.viewResources = viewResources;
window.viewAllMentors = viewAllMentors;
window.handleLogout = handleLogout;