// ==========================================
// CONFIGURATION
// ==========================================
const API_BASE_URL = 'http://localhost:8000/api/v1';
// const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';

// ==========================================
// STATE
// ==========================================
let currentMentor = null;
let mentorId = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

function initializePage() {
    // Get mentor ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    mentorId = urlParams.get('id');
    
    if (!mentorId) {
        showError();
        return;
    }
    
    // Check auth
    const token = localStorage.getItem('accessToken');
    if (!token) {
        redirectToLogin();
        return;
    }
    
    loadMentorProfile();
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadMentorProfile() {
    try {
        showLoading(true);
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/mentor/${mentorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Mentor not found');
            }
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        currentMentor = data.data;
        
        populateProfile(currentMentor);
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showLoading(false);
        showError();
    }
}

// ==========================================
// RENDERING
// ==========================================
function populateProfile(mentor) {
    // Basic info
    document.getElementById('mentorName').textContent = mentor.fullname;
    document.getElementById('mentorTitle').textContent = 
        `${mentor.industry || 'Professional'} • ${mentor.yearsOfExperience || 'Experienced'}`;
    
    // Avatar
    const avatarImg = document.getElementById('avatarImg');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (mentor.avatar) {
        avatarImg.src = mentor.avatar;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else {
        avatarPlaceholder.textContent = '👤';
    }
    
    // Meta info
    document.getElementById('locationMeta').innerHTML = 
        `<i class="fas fa-map-marker-alt"></i> ${mentor.location || 'Location not specified'}`;
    document.getElementById('experienceMeta').innerHTML = 
        `<i class="fas fa-briefcase"></i> ${mentor.yearsOfExperience || 'Experience N/A'}`;
    document.getElementById('rateMeta').innerHTML = 
        `<i class="fas fa-dollar-sign"></i> ${mentor.hourlyRate || 'Rate not set'}`;
    document.getElementById('availabilityMeta').innerHTML = 
        `<i class="fas fa-clock"></i> ${mentor.availability || 'Flexible'}`;
    
    // Stats
    document.getElementById('statRating').textContent = mentor.stats?.rating || '--';
    document.getElementById('statSessions').textContent = mentor.stats?.sessions || '0';
    document.getElementById('statMentees').textContent = mentor.stats?.totalMentees || '0';
    document.getElementById('statGoals').textContent = mentor.stats?.goals || '0';
    
    // Bio
    document.getElementById('mentorBio').textContent = 
        mentor.bio || 'No bio available for this mentor.';
    
    // Skills
    const skillsContainer = document.getElementById('skillsContainer');
    if (mentor.skills && mentor.skills.length > 0) {
        skillsContainer.innerHTML = mentor.skills.map(skill => 
            `<span class="skill-tag">${skill}</span>`
        ).join('');
    } else {
        skillsContainer.innerHTML = '<p class="text-muted">No skills listed</p>';
    }
    
    // Experience
    const expTimeline = document.getElementById('experienceTimeline');
    if (mentor.experience && mentor.experience.length > 0) {
        expTimeline.innerHTML = mentor.experience.map(exp => `
            <div class="timeline-item">
                <div class="timeline-icon"><i class="fas fa-briefcase"></i></div>
                <div class="timeline-content">
                    <h4>${exp.title}</h4>
                    <p>${exp.company}</p>
                    <span class="timeline-period">${exp.period || 'Present'}</span>
                </div>
            </div>
        `).join('');
    } else {
        expTimeline.innerHTML = '<p class="text-muted">No experience listed</p>';
    }
    
    // Education
    const eduTimeline = document.getElementById('educationTimeline');
    if (mentor.education && mentor.education.length > 0) {
        eduTimeline.innerHTML = mentor.education.map(edu => `
            <div class="timeline-item">
                <div class="timeline-icon"><i class="fas fa-graduation-cap"></i></div>
                <div class="timeline-content">
                    <h4>${edu.degree}</h4>
                    <p>${edu.institution}</p>
                    <span class="timeline-period">${edu.period || ''}</span>
                </div>
            </div>
        `).join('');
    } else {
        eduTimeline.innerHTML = '<p class="text-muted">No education listed</p>';
    }
    
    // Quick availability
    document.getElementById('quickAvailability').textContent = 
        mentor.availability || 'Flexible hours';
    
    // Connection status & actions
    renderConnectionStatus(mentor);
}

function renderConnectionStatus(mentor) {
    const banner = document.getElementById('connectionBanner');
    const actionCard = document.getElementById('actionCard');
    const actionContent = document.getElementById('actionContent');
    const sharedGoalsCard = document.getElementById('sharedGoalsCard');
    
    // Connection status banner
    if (mentor.connectionStatus === 'pending') {
        banner.className = 'connection-banner banner-pending';
        banner.innerHTML = '<i class="fas fa-clock"></i> Connection request pending approval';
        
        actionContent.innerHTML = `
            <h3><i class="fas fa-paper-plane"></i> Request Sent</h3>
            <p>Your connection request is waiting for ${mentor.fullname.split(' ')[0]}'s approval.</p>
            <button class="btn-primary btn-pending" disabled>
                <i class="fas fa-clock"></i> Pending Approval
            </button>
        `;
        
    } else if (mentor.connectionStatus === 'active') {
        banner.className = 'connection-banner banner-active';
        banner.innerHTML = '<i class="fas fa-check-circle"></i> You are connected with this mentor';
        
        actionContent.innerHTML = `
            <h3><i class="fas fa-user-check"></i> Connected</h3>
            <p>You and ${mentor.fullname.split(' ')[0]} are actively working together.</p>
            <button class="btn-primary btn-message" onclick="sendMessage()">
                <i class="fas fa-comment"></i> Send Message
            </button>
            <button class="btn-secondary" onclick="viewGoals()">
                <i class="fas fa-tasks"></i> View All Goals
            </button>
        `;
        
        // Show shared goals
        if (mentor.connectionInfo?.sharedGoals?.length > 0) {
            sharedGoalsCard.style.display = 'block';
            const goalsList = document.getElementById('sharedGoalsList');
            goalsList.innerHTML = mentor.connectionInfo.sharedGoals.map(goal => {
                const completed = goal.milestones.filter(m => m.isCompleted).length;
                const total = goal.milestones.length;
                const pct = total > 0 ? Math.round((completed/total)*100) : 0;
                
                return `
                    <div class="shared-goal-item">
                        <i class="fas fa-${pct === 100 ? 'check-circle' : 'circle'}"></i>
                        <div class="goal-info">
                            <h4>${goal.title}</h4>
                            <p>${pct}% complete • ${goal.category}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
    } else {
        // No connection
        banner.className = 'connection-banner banner-none';
        banner.innerHTML = '<i class="fas fa-info-circle"></i> Not connected yet';
        
        actionContent.innerHTML = `
            <h3><i class="fas fa-handshake"></i> Start Mentorship</h3>
            <p>Connect with ${mentor.fullname.split(' ')[0]} to begin your learning journey.</p>
            <button class="btn-primary" onclick="openConnectModal()">
                <i class="fas fa-paper-plane"></i> Connect Now
            </button>
        `;
    }
}

// ==========================================
// ACTIONS
// ==========================================
function openConnectModal() {
    if (!currentMentor) return;
    
    const preview = document.getElementById('modalMentorPreview');
    preview.innerHTML = `
        <div class="preview-avatar">${currentMentor.fullname.charAt(0)}</div>
        <div class="preview-info">
            <h4>${currentMentor.fullname}</h4>
            <p>${currentMentor.industry || 'Professional'}</p>
        </div>
    `;
    
    document.getElementById('connectMessage').value = '';
    document.getElementById('sendRequestBtn').disabled = false;
    document.getElementById('sendRequestBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    
    document.getElementById('connectModal').classList.add('active');
}

function closeConnectModal() {
    document.getElementById('connectModal').classList.remove('active');
}

async function sendConnectionRequest() {
    if (!currentMentor) return;
    
    const btn = document.getElementById('sendRequestBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const token = localStorage.getItem('accessToken');
        const message = document.getElementById('connectMessage').value;
        
        const response = await fetch(`${API_BASE_URL}/connections/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                mentorId: currentMentor._id,
                message: message
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send request');
        }
        
        closeConnectModal();
        showToast('Connection request sent!', 'success');
        
        // Update UI
        currentMentor.connectionStatus = 'pending';
        renderConnectionStatus(currentMentor);
        
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    }
}

function sendMessage() {
    window.location.href = `../messaging/messaging.html?user=${mentorId}`;
}

function viewGoals() {
    window.location.href = `../goals-tracker/goals-tracker.html?mentor=${mentorId}`;
}

// ==========================================
// NAVIGATION
// ==========================================
function goBack() {
    window.history.back();
}

function goToDashboard() {
    const role = localStorage.getItem('role');
    const path = role === 'mentor' 
        ? '../dashboard/mentor-dashboard/mentor-dashboard.html'
        : '../dashboard/mentee-dashboard/mentee-dashboard.html';
    window.location.href = path;
}

function goToMessages() {
    window.location.href = '../messaging/messaging.html';
}

function redirectToLogin() {
    window.location.href = '../login page/login.html';
}

// ==========================================
// UI HELPERS
// ==========================================
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
    document.getElementById('profileContent').style.display = show ? 'none' : 'block';
    document.getElementById('errorState').style.display = 'none';
}

function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
}

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