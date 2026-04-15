// ==========================================
// CONFIGURATION
// ==========================================
const API_BASE_URL = 'http://localhost:8000/api/v1';
// const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';

// ==========================================
// STATE
// ==========================================
let allMentors = [];
let myMentors = [];
let filteredMentors = [];
let selectedMentor = null;

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
    
    // Only mentees can access this page
    if (role !== 'Mentee') {
        document.getElementById('accessDenied').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        return;
    }
    
    // Load data
    await Promise.all([
        loadMyMentors(),
        loadAllMentors()
    ]);
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadMyMentors() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/my-mentors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load my mentors');
        
        const data = await response.json();
        myMentors = data.data || [];

        console.log("My mentors:")
        console.log(myMentors);
        
        renderMyMentors();
        
    } catch (error) {
        console.error('Error loading my mentors:', error);
    }
}

async function loadAllMentors() {
    try {
        const token = localStorage.getItem('accessToken');
        
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('mentorsGrid').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        
        const response = await fetch(`${API_BASE_URL}/connections/mentors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load mentors');
        
        const data = await response.json();
        allMentors = data.data || [];
        filteredMentors = [...allMentors];

        console.log("All mentors");
        console.log(allMentors);

        renderMentors(allMentors);
        
        document.getElementById('loadingState').style.display = 'none';
        
        if (allMentors.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            document.getElementById('mentorsGrid').style.display = 'grid';
            renderMentors(filteredMentors);
        }
        
        updateResultsCount();
        
    } catch (error) {
        console.error('Error loading mentors:', error);
        document.getElementById('loadingState').style.display = 'none';
        showToast('Failed to load mentors', 'error');
    }
}

// ==========================================
// RENDERING
// ==========================================
function renderMyMentors() {
    const container = document.getElementById('myMentorsGrid');
    const section = document.getElementById('myMentorsSection');
    
    if (myMentors.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    container.innerHTML = myMentors.map(conn => `
        <div class="my-mentor-card">
            <div class="my-mentor-avatar">
                ${conn.mentor.avatar ? `<img src="${conn.mentor.avatar}" alt="">` : '👤'}
            </div>
            <div class="my-mentor-info">
                <h4>${conn.mentor.fullname}</h4>
                <span class="my-mentor-status status-${conn.status}">${conn.status}</span>
            </div>
            <button class="btn-icon" onclick="viewMentorProfile('${conn.mentor._id}')">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `).join('');
}

function renderMentors(mentors) {
    const container = document.getElementById('mentorsGrid');
    
    container.innerHTML = mentors.map(mentor => {
        const isConnected = mentor.connectionStatus;
        const skillsToShow = mentor.skills.slice(0, 3);
        const remainingSkills = mentor.skills.length - 3;
        
        return `
        <div class="match-card">
            ${isConnected ? `
                <span class="status-badge status-${isConnected}-badge">
                    ${isConnected === 'pending' ? '⏳ Request Sent' : '✓ Connected'}
                </span>
            ` : '<span class="match-badge">Available</span>'}
            
            <div class="match-avatar">
                ${mentor.avatar ? `<img src="${mentor.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👤'}
            </div>
            
            <h3 class="match-name">${mentor.fullname}</h3>
            <p class="match-title">${mentor.industry || 'Professional'} • ${mentor.yearsOfExperience || 'Experienced'}</p>
            
            <div class="match-stats">
                <div class="stat">
                    <div class="stat-value">${mentor.yearsOfExperience || '-'}</div>
                    <div class="stat-label">Years</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${mentor.stats?.sessions || 0}</div>
                    <div class="stat-label">Sessions</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${mentor.skills.length}</div>
                    <div class="stat-label">Skills</div>
                </div>
            </div>
            
            <div class="match-skills">
                ${skillsToShow.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                ${remainingSkills > 0 ? `<span class="skill-tag">+${remainingSkills} more</span>` : ''}
            </div>
            
            <p class="match-bio">${mentor.bio ? mentor.bio.substring(0, 100) + '...' : 'No bio available'}</p>
            
            ${mentor.hourlyRate ? `
                <div class="match-rate">
                    <i class="fas fa-dollar-sign"></i> ${mentor.hourlyRate}/hour
                </div>
            ` : ''}
            
            <div class="match-actions">
                ${isConnected ? `
                    <button class="btn-secondary" style="flex:1;" onclick="viewMentorProfile('${mentor._id}')">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                ` : `
                    <button class="btn-primary" onclick="openConnectModal('${mentor._id}')">
                        <i class="fas fa-paper-plane"></i> Connect
                    </button>
                    <button class="btn-secondary" onclick="viewMentorProfile('${mentor._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                `}
            </div>
        </div>
    `}).join('');
}

// ==========================================
// SEARCH & FILTER
// ==========================================
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);
}

function searchMentors() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);
}

function applyFilters(searchQuery = '') {
    const industry = document.getElementById('industryFilter').value;
    const experience = document.getElementById('experienceFilter').value;
    const availability = document.getElementById('availabilityFilter').value;
    
    filteredMentors = allMentors.filter(mentor => {
        // Search query
        if (searchQuery) {
            const searchable = `${mentor.fullname} ${mentor.bio} ${mentor.skills.join(' ')} ${mentor.industry}`.toLowerCase();
            if (!searchable.includes(searchQuery)) return false;
        }
        
        // Industry filter
        if (industry && mentor.industry !== industry) return false;
        
        // Experience filter
        if (experience) {
            const years = parseInt(mentor.yearsOfExperience) || 0;
            if (experience === '0-5' && years > 5) return false;
            if (experience === '5-10' && (years < 5 || years > 10)) return false;
            if (experience === '10+' && years < 10) return false;
        }
        
        // Availability filter
        if (availability && !mentor.availability?.includes(availability)) return false;
        
        return true;
    });
    
    renderMentors(filteredMentors);
    updateResultsCount();
    
    const emptyState = document.getElementById('emptyState');
    const grid = document.getElementById('mentorsGrid');
    
    if (filteredMentors.length === 0) {
        emptyState.style.display = 'block';
        grid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('industryFilter').value = '';
    document.getElementById('experienceFilter').value = '';
    document.getElementById('availabilityFilter').value = '';
    
    filteredMentors = [...allMentors];
    renderMentors(filteredMentors);
    updateResultsCount();
    
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('mentorsGrid').style.display = 'grid';
}

function sortMentors() {
    const sortBy = document.getElementById('sortSelect').value;
    
    switch(sortBy) {
        case 'experience':
            filteredMentors.sort((a, b) => {
                const expA = parseInt(a.yearsOfExperience) || 0;
                const expB = parseInt(b.yearsOfExperience) || 0;
                return expB - expA;
            });
            break;
        case 'rating':
            filteredMentors.sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
            break;
        default:
            // Relevance - keep original order
            break;
    }
    
    renderMentors(filteredMentors);
}

function updateResultsCount() {
    const count = filteredMentors.length;
    document.getElementById('resultsCount').textContent = 
        `Showing ${count} mentor${count !== 1 ? 's' : ''}`;
}

// ==========================================
// CONNECTION MODAL
// ==========================================
function openConnectModal(mentorId) {
    selectedMentor = allMentors.find(m => m._id === mentorId);
    if (!selectedMentor) return;
    
    const preview = document.getElementById('mentorPreview');
    preview.innerHTML = `
        <div class="preview-avatar">
            ${selectedMentor.avatar ? `<img src="${selectedMentor.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}
        </div>
        <div class="preview-info">
            <h4>${selectedMentor.fullname}</h4>
            <p>${selectedMentor.industry || 'Professional'}</p>
        </div>
    `;
    
    document.getElementById('connectMessage').value = '';
    document.getElementById('sendRequestBtn').disabled = false;
    document.getElementById('connectModal').classList.add('active');
}

function closeConnectModal() {
    document.getElementById('connectModal').classList.remove('active');
    selectedMentor = null;
}

async function sendConnectionRequest() {
    if (!selectedMentor) return;
    
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
                mentorId: selectedMentor._id,
                message: message
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send request');
        }
        
        // Update local state
        const mentorIndex = allMentors.findIndex(m => m._id === selectedMentor._id);
        if (mentorIndex !== -1) {
            allMentors[mentorIndex].connectionStatus = 'pending';
        }
        
        // Refresh displays
        renderMentors(filteredMentors);
        await loadMyMentors();
        
        closeConnectModal();
        showToast('Connection request sent successfully!', 'success');
        
    } catch (error) {
        showToast(error.message || 'Failed to send request', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    }
}

// ==========================================
// NAVIGATION
// ==========================================
function goToDashboard() {
    const role = localStorage.getItem('role');
    const path = role === 'mentor' 
        ? '../dashboard/mentor-dashboard/mentor-dashboard.html'
        : '../dashboard/mentee-dashboard/mentee-dashboard.html';
    window.location.href = path;
}

function goToProfile() {
    window.location.href = '../profile/profile.html';
}

function goToMessages() {
    window.location.href = '../messaging/messaging.html';
}

function viewMentorProfile(mentorId) {
    // Store selected mentor and navigate to profile view
    localStorage.setItem('viewMentorId', mentorId);
    window.location.href = `../profile/public-profile.html?id=${mentorId}`;
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
// TOAST NOTIFICATIONS
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