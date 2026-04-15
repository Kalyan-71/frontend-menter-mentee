// ==========================================
// CONFIGURATION
// ==========================================
// const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';


// ==========================================
// STATE
// ==========================================
let pendingMentees = [];
let activeMentees = [];
let currentFilter = 'all';


let currentViewingConnectionId = null;
let currentMenteeForSuggestions = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('role');
    
    if (!token) {
        redirectToLogin();
        return;
    }
    
    // Only mentors can access this page
    if (role !== 'Mentor') {
        document.getElementById('accessDenied').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        return;
    }
    
    await loadMentees();
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadMentees() {
    try {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('pendingSection').style.display = 'none';
        document.getElementById('activeSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/my-mentees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load mentees');
        
        const data = await response.json();
        pendingMentees = data.data.pending || [];
        activeMentees = data.data.active || [];
        
        document.getElementById('loadingState').style.display = 'none';
        
        updateStats();
        renderPendingMentees();
        renderActiveMentees();
        
        // Show/hide sections based on data
        if (pendingMentees.length === 0 && activeMentees.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            if (pendingMentees.length > 0) {
                document.getElementById('pendingSection').style.display = 'block';
            }
            if (activeMentees.length > 0) {
                document.getElementById('activeSection').style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error loading mentees:', error);
        document.getElementById('loadingState').style.display = 'none';
        showToast('Failed to load mentees', 'error');
    }
}

// ==========================================
// RENDERING
// ==========================================
function updateStats() {
    const total = pendingMentees.length + activeMentees.length;
    // const totalSessions = activeMentees.reduce((sum, m) => sum + (m.sessionsCount || 0), 0);
    
    document.getElementById('totalMentees').textContent = total;
    document.getElementById('activeMentees').textContent = activeMentees.length;
    document.getElementById('pendingMentees').textContent = pendingMentees.length;
    // document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('pendingCount').textContent = pendingMentees.length;
}

function renderPendingMentees() {
    const container = document.getElementById('pendingGrid');
    
    if (pendingMentees.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = pendingMentees.map(mentee => `
        <div class="mentee-card pending" data-id="${mentee.connectionId}">
            <div class="mentee-header">
                <div class="mentee-avatar">
                    ${mentee.mentee.avatar ? `<img src="${mentee.mentee.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👤'}
                </div>
                <div class="mentee-info">
                    <h3>${mentee.mentee.fullname}</h3>
                    <p>${mentee.mentee.industry || 'Professional'}</p>
                    <span class="status-badge pending">⏳ Pending Request</span>
                </div>
            </div>
            
            ${mentee.message ? `
                <div class="request-message">
                    <i class="fas fa-quote-left"></i> ${mentee.message}
                </div>
            ` : ''}
            
            <div class="mentee-details">
                <p><i class="fas fa-map-marker-alt"></i> ${mentee.mentee.location || 'Location not specified'}</p>
                <p><i class="fas fa-briefcase"></i> ${mentee.mentee.skills.slice(0, 3).join(', ') || 'No skills listed'}</p>
            </div>
            
            <div class="request-actions">
                <button class="btn-accept" onclick="acceptMentee('${mentee.connectionId}')">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn-decline" onclick="declineMentee('${mentee.connectionId}')">
                    Decline
                </button>
            </div>
        </div>
    `).join('');
}

function renderActiveMentees(filter = 'all') {
    const container = document.getElementById('activeGrid');
    
    let filtered = activeMentees;
    
    if (filter === 'high-progress') {
        filtered = activeMentees.filter(m => m.progress.percentage >= 70);
    } else if (filter === 'needs-attention') {
        filtered = activeMentees.filter(m => m.progress.percentage < 40);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; padding: 40px;">
                <p>No mentees match this filter</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(mentee => `
        <div class="mentee-card" data-id="${mentee.connectionId}">
            <div class="mentee-header">
                <div class="mentee-avatar">
                    ${mentee.mentee.avatar ? `<img src="${mentee.mentee.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👤'}
                </div>
                <div class="mentee-info">
                    <h3>${mentee.mentee.fullname}</h3>
                    <p>${mentee.mentee.industry || 'Professional'}</p>
                    <span class="status-badge active">● Active</span>
                </div>
            </div>

            <div class="progress-section">
                <div class="progress-item">
                    <div class="progress-label">
                        <span>Overall Progress</span>
                        <span>${mentee.progress.percentage}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${mentee.progress.percentage}%"></div>
                    </div>
                </div>
            </div>

            <div class="sessions-info">
                <div class="session-stat">
                    <h4>${mentee.sessionsCount}</h4>
                    <p>Sessions</p>
                </div>
                <div class="session-stat">
                    <h4>${mentee.progress.totalGoals}</h4>
                    <p>Goals</p>
                </div>
                <div class="session-stat">
                    <h4>${mentee.progress.completedGoals}</h4>
                    <p>Completed</p>
                </div>
            </div>

            ${mentee.goals.length > 0 ? `
                <div class="goals-preview">
                    <h4><i class="fas fa-tasks"></i> Active Goals</h4>
                    ${mentee.goals.slice(0, 2).map(goal => {
                        const completed = goal.milestones.filter(m => m.isCompleted).length;
                        const total = goal.milestones.length;
                        const pct = total > 0 ? Math.round((completed/total)*100) : 0;
                        return `
                            <div class="goal-mini ${pct === 100 ? '' : 'pending'}">
                                <i class="fas fa-${pct === 100 ? 'check-circle' : 'circle'}"></i>
                                <span>${goal.title} (${pct}%)</span>
                            </div>
                        `;
                    }).join('')}
                    ${mentee.goals.length > 2 ? `<div class="goal-mini">+${mentee.goals.length - 2} more goals</div>` : ''}
                </div>
            ` : ''}

            <div class="card-actions">
                <button class="btn-primary" onclick="viewProgress('${mentee.connectionId}')">
                    <i class="fas fa-chart-line"></i> View Progress
                </button>
                <button class="btn-secondary" onclick="sendMessage('${mentee.mentee._id}')">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// ACTIONS
// ==========================================
async function acceptMentee(connectionId) {
    try {
        const btn = event.target.closest('.btn-accept');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/accept/${connectionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to accept');
        
        showToast('Mentee accepted successfully!', 'success');
        
        // Move from pending to active in local state
        const accepted = pendingMentees.find(m => m.connectionId === connectionId);
        if (accepted) {
            accepted.status = 'active';
            accepted.startedAt = new Date();
            activeMentees.unshift(accepted);
            pendingMentees = pendingMentees.filter(m => m.connectionId !== connectionId);
        }
        
        // Re-render
        updateStats();
        renderPendingMentees();
        renderActiveMentees(currentFilter);
        
        // Show sections
        if (pendingMentees.length === 0) {
            document.getElementById('pendingSection').style.display = 'none';
        }
        document.getElementById('activeSection').style.display = 'block';
        
    } catch (error) {
        showToast('Failed to accept mentee', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Accept';
    }
}

async function declineMentee(connectionId) {
    if (!confirm('Are you sure you want to decline this request?')) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/reject/${connectionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to decline');
        
        showToast('Request declined', 'info');
        
        // Remove from pending
        pendingMentees = pendingMentees.filter(m => m.connectionId !== connectionId);
        
        updateStats();
        renderPendingMentees();
        
        if (pendingMentees.length === 0) {
            document.getElementById('pendingSection').style.display = 'none';
        }
        
        if (pendingMentees.length === 0 && activeMentees.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        }
        
    } catch (error) {
        showToast('Failed to decline request', 'error');
    }
}

function filterMentees(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.section-actions .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderActiveMentees(filter);
}

async function viewProgress(connectionId) {
    currentViewingConnectionId = connectionId;
    const mentee = activeMentees.find(m => m.connectionId === connectionId);
    if (!mentee) return;

    // Fetch fresh goals data
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/goalsTracker/mentee/${mentee.mentee._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        
        
        if (response.ok) {
            const data = await response.json();
            mentee.goals = data.data; // Update with fresh data
        }
    } catch (error) {
        console.log('Using cached goals data');
    }

    // Build modal content with goals
    const modalBody = document.getElementById('menteeModalBody');
    
    modalBody.innerHTML = `
        <div class="mentee-detail-header">
            <div class="detail-avatar">
                ${mentee.mentee.avatar ? `<img src="${mentee.mentee.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}
            </div>
            <div class="detail-info">
                <h2>${mentee.mentee.fullname}</h2>
                <p><i class="fas fa-envelope"></i> ${mentee.mentee.email}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${mentee.mentee.location || 'No location'}</p>
            </div>
        </div>
        
        <div class="progress-overview" style="margin-bottom: 30px;">
            <h3>Progress Overview</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 15px;">
                <div class="stat-box" style="margin: 0;">
                    <div class="stat-value">${mentee.progress.percentage}%</div>
                    <div class="stat-label">Overall</div>
                </div>
                <div class="stat-box" style="margin: 0;">
                    <div class="stat-value">${mentee.progress.completedGoals}/${mentee.progress.totalGoals}</div>
                    <div class="stat-label">Goals Done</div>
                </div>
                <div class="stat-box" style="margin: 0;">
                    <div class="stat-value">${mentee.sessionsCount}</div>
                    <div class="stat-label">Sessions</div>
                </div>
            </div>
        </div>
        
        <div class="goals-detail">
            <h3><i class="fas fa-bullseye"></i> Goals & Milestones</h3>
            ${mentee.goals.length === 0 ? '<p>No goals set yet. <button onclick="suggestGoals()" class="btn-primary" style="margin-top:10px;">Suggest Goals</button></p>' : ''}
            ${mentee.goals.map(goal => {
                const completed = goal.milestones.filter(m => m.isCompleted).length;
                const total = goal.milestones.length;
                const pct = total > 0 ? Math.round((completed/total)*100) : 0;
                const isCompleted = pct === 100;
                
                return `
                    <div class="goal-detail-card ${isCompleted ? 'completed' : ''}">
                        <div class="goal-header-row">
                            <span class="goal-title">${goal.title}</span>
                            <span class="goal-progress-text">${pct}% (${completed}/${total})</span>
                        </div>
                        <p style="color: #7fae92; font-size: 14px; margin-bottom: 10px;">
                            ${goal.category} • ${goal.description?.substring(0, 60)}...
                        </p>
                        
                        <div class="milestone-list">
                            ${goal.milestones.map(m => `
                                <div class="milestone-detail ${m.isCompleted ? '' : 'pending'}">
                                    <i class="fas fa-${m.isCompleted ? 'check-circle' : 'circle'}"></i>
                                    <span>${m.todo}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${!isCompleted ? `
                            <div style="margin-top: 15px; text-align: right;">
                                <button class="btn-action" onclick="reviewGoal('${goal._id}')">
                                    Review Progress
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
            <button class="btn-primary" onclick="sendMessage('${mentee.mentee._id}')" style="padding: 12px 30px;">
                <i class="fas fa-comment"></i> Message Mentee
            </button>
            <button class="btn-secondary" onclick="scheduleSession('${mentee.connectionId}')" style="margin-left: 10px;">
                <i class="fas fa-calendar"></i> Schedule Session
            </button>
        </div>
    `;
    
    document.getElementById('menteeModal').classList.add('active');
}


function closeMenteeModal() {
    document.getElementById('menteeModal').classList.remove('active');
}

function sendMessage(menteeId) {
    window.location.href = `../messaging/messaging.html?user=${menteeId}`;
}

// ==========================================
// NAVIGATION
// ==========================================
function goToDashboard() {
    window.location.href = '../dashboard/mentor-dashboard/mentor-dashboard.html';
}

function goToProfile() {
    window.location.href = '../profile/profile.html';
}

function goToMessages() {
    window.location.href = '../messaging/messaging.html';
}

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    redirectToLogin();
}

function redirectToLogin() {
    window.location.href = '../login page/login.html';
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

// ==========================================
// TOAST
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// ==========================================
// SUGGEST GOALS FUNCTIONALITY
// ==========================================

async function suggestGoals() {
    const mentee = activeMentees.find(m => m.connectionId === currentViewingConnectionId);
    if (!mentee) {
        showToast('Mentee not found', 'error');
        return;
    }

    // Close current modal and open suggest goals modal
    closeMenteeModal();
    openSuggestGoalsModal(mentee);
}


function openSuggestGoalsModal(mentee) {
    currentMenteeForSuggestions = mentee;
    
    // Create modal if doesn't exist
    let modal = document.getElementById('suggestGoalsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'suggestGoalsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> Suggest Goals for ${mentee.mentee.fullname}</h3>
                    <button class="close-btn" onclick="closeSuggestGoalsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" id="suggestGoalsBody">
                    <!-- Dynamic content -->
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSuggestGoalsModal();
        });
    }
    
    // Store connection ID for later use
    currentViewingConnectionId = mentee.connectionId;
    
    // Render template suggestions
    const suggestGoalsBody = document.getElementById('suggestGoalsBody');
    suggestGoalsBody.innerHTML = `
        <div class="suggestions-intro" style="margin-bottom: 25px; color: #7fae92;">
            <p>Choose from pre-made goal templates or create a custom suggestion for your mentee.</p>
        </div>
        
        <div class="goal-templates" style="display: grid; gap: 15px; margin-bottom: 25px;">
            ${getGoalTemplates(mentee.mentee.industry).map((template, idx) => `
                <div class="template-card" style="border: 2px solid #e8f5e9; border-radius: 12px; padding: 20px; cursor: pointer; transition: 0.3s;" 
                     onclick="selectTemplate(${idx})"
                     onmouseover="this.style.borderColor='#7fae92'; this.style.background='#f9fdf9';"
                     onmouseout="this.style.borderColor='#e8f5e9'; this.style.background='white';"
                     data-idx="${idx}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="color: #3e6b4f; margin-bottom: 5px;">${template.title}</h4>
                            <p style="color: #7fae92; font-size: 14px;">${template.category} • ${template.milestones.length} milestones</p>
                        </div>
                        <i class="fas fa-chevron-right" style="color: #7fae92;"></i>
                    </div>
                    <p style="color: #666; font-size: 13px; margin-top: 10px;">${template.description}</p>
                </div>
            `).join('')}
        </div>
        
        <div class="custom-goal-section" style="border-top: 2px solid #e8f5e9; padding-top: 25px;">
            <h4 style="color: #3e6b4f; margin-bottom: 15px;">Or Create Custom Suggestion</h4>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; color: #7fae92; margin-bottom: 8px; font-weight: 600;">Goal Title</label>
                <input type="text" id="customGoalTitle" class="form-input" placeholder="e.g., Improve Communication Skills" 
                       style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px;">
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; color: #7fae92; margin-bottom: 8px; font-weight: 600;">Category</label>
                <select id="customGoalCategory" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px;">
                    <option value="Career">Career</option>
                    <option value="Skills">Skills</option>
                    <option value="Personal Development">Personal Development</option>
                    <option value="Networking">Networking</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; color: #7fae92; margin-bottom: 8px; font-weight: 600;">Description</label>
                <textarea id="customGoalDescription" rows="3" placeholder="Describe the goal..." 
                          style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px; resize: vertical;"></textarea>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; color: #7fae92; margin-bottom: 8px; font-weight: 600;">Milestones (one per line)</label>
                <textarea id="customGoalMilestones" rows="4" placeholder="e.g.&#10;Complete online course&#10;Practice with mentor&#10;Deliver presentation" 
                          style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px; resize: vertical;"></textarea>
            </div>
            
            <button class="btn-primary" onclick="sendCustomGoalSuggestion()" style="width: 100%; padding: 14px;">
                <i class="fas fa-paper-plane"></i> Send Custom Suggestion
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeSuggestGoalsModal() {
    const modal = document.getElementById('suggestGoalsModal');
    if (modal) modal.classList.remove('active');
    currentMenteeForSuggestions = null;
}

function getGoalTemplates(industry) {
    const templates = [
        {
            title: "Complete Technical Certification",
            category: "Skills",
            description: "Obtain an industry-recognized certification to validate technical expertise.",
            milestones: [
                "Research relevant certifications for your role",
                "Enroll in preparation course",
                "Complete practice exams with 80%+ score",
                "Schedule and pass certification exam",
                "Update resume and LinkedIn with new certification"
            ]
        },
        {
            title: "Build Professional Network",
            category: "Networking",
            description: "Expand professional connections through industry events and online platforms.",
            milestones: [
                "Update LinkedIn profile and optimize for search",
                "Join 2 professional industry groups/communities",
                "Attend 3 networking events or conferences",
                "Schedule informational interviews with 5 professionals",
                "Maintain regular contact with new connections"
            ]
        },
        {
            title: "Improve Public Speaking",
            category: "Personal Development",
            description: "Develop confidence and skills in presenting to groups and public speaking.",
            milestones: [
                "Join Toastmasters or similar speaking club",
                "Prepare and practice 5-minute speech",
                "Deliver presentation to small team",
                "Present at department meeting",
                "Speak at external event or conference"
            ]
        },
        {
            title: "Lead a Cross-functional Project",
            category: "Career",
            description: "Demonstrate leadership by successfully managing a project across teams.",
            milestones: [
                "Identify opportunity for cross-functional initiative",
                "Create project proposal and get stakeholder buy-in",
                "Assemble project team and define roles",
                "Execute project with regular checkpoints",
                "Deliver results and document lessons learned"
            ]
        },
        {
            title: "Master a New Technology",
            category: "Skills",
            description: "Learn and apply a new technology relevant to your career growth.",
            milestones: [
                "Complete introductory tutorial/course",
                "Build a small practice project",
                "Contribute to team project using new tech",
                "Mentor colleague on basics",
                "Implement advanced feature in production"
            ]
        }
    ];
    
    // Add industry-specific templates
    if (industry?.toLowerCase().includes('software') || industry?.toLowerCase().includes('tech')) {
        templates.push({
            title: "Contribute to Open Source",
            category: "Skills",
            description: "Make meaningful contributions to open source projects to build reputation.",
            milestones: [
                "Identify 3 projects aligned with your interests",
                "Set up development environment",
                "Submit first documentation fix or small bug fix",
                "Implement feature enhancement",
                "Become recognized contributor or maintainer"
            ]
        });
    }
    
    return templates;
}

function selectTemplate(templateIdx) {
    const template = getGoalTemplates()[templateIdx];
    if (!template || !currentMenteeForSuggestions) return;
    
    // Fill custom form with template data
    document.getElementById('customGoalTitle').value = template.title;
    document.getElementById('customGoalCategory').value = template.category;
    document.getElementById('customGoalDescription').value = template.description;
    document.getElementById('customGoalMilestones').value = template.milestones.join('\n');
    
    // Visual feedback
    document.querySelectorAll('.template-card').forEach(card => {
        card.style.borderColor = '#e8f5e9';
        card.style.background = 'white';
    });
    document.querySelector(`[data-idx="${templateIdx}"]`).style.borderColor = '#7fae92';
    document.querySelector(`[data-idx="${templateIdx}"]`).style.background = '#f9fdf9';
    
    showToast('Template loaded! Customize and send.', 'success');
}

async function sendCustomGoalSuggestion() {
    const title = document.getElementById('customGoalTitle').value.trim();
    const category = document.getElementById('customGoalCategory').value;
    const description = document.getElementById('customGoalDescription').value.trim();
    const milestonesText = document.getElementById('customGoalMilestones').value.trim();
    
    if (!title || !description) {
        showToast('Please fill in title and description', 'error');
        return;
    }
    
    const milestones = milestonesText.split('\n')
        .map(m => m.trim())
        .filter(m => m.length > 0)
        .map(m => ({ todo: m, isCompleted: false }));
    
    if (milestones.length === 0) {
        showToast('Please add at least one milestone', 'error');
        return;
    }
    
    // Store the connection ID BEFORE closing modal and nulling the variable
    const menteeConnectionId = currentMenteeForSuggestions?.connectionId;
    const menteeId = currentMenteeForSuggestions?.mentee?._id;
    
    if (!menteeConnectionId || !menteeId) {
        showToast('Mentee information not found', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        const payload = {
            title,
            category,
            description,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
            milestones,
            suggestedFor: menteeId,
            suggestedBy: 'mentor'
        };
        
        const response = await fetch(`${API_BASE_URL}/goalsTracker/create-new-mentor-goal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Failed to create goal');
        
        showToast('Goal suggestion sent successfully!', 'success');
        closeSuggestGoalsModal();
        
        // Use the stored connection ID instead of the nulled variable
        setTimeout(() => {
            viewProgress(menteeConnectionId);
        }, 500);
        
    } catch (error) {
        console.error('Error suggesting goal:', error);
        showToast('Failed to send suggestion. Please try again.', 'error');
    }
}


// Make functions globally available
window.suggestGoals = suggestGoals;
window.closeSuggestGoalsModal = closeSuggestGoalsModal;
window.selectTemplate = selectTemplate;
window.sendCustomGoalSuggestion = sendCustomGoalSuggestion;
window.sendMessage = sendMessage; 