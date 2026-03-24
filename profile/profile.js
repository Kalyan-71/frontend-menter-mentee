// ==========================================
// CONFIGURATION
// ==========================================
// const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';////github
const MAX_BIO_LENGTH = 1000;
const MAX_SKILLS = 15;

// ==========================================
// STATE MANAGEMENT
// ==========================================
let currentProfile = null;
let currentUser = null;
let userSkills = [];
let isFirstLogin = false;
let deleteCallback = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        redirectToLogin();
        return;
    }
    
        // HIDE banner immediately on load (prevents flash)
    // Will show again only if needed after profile loads
    document.getElementById('completionBanner').style.display = 'none';
    document.getElementById('completeSection').style.display = 'none';

    // Setup event listeners
    setupEventListeners();
    
    // Load profile
    await loadProfile();
}

function setupEventListeners() {
    // Bio character count
    const bioInput = document.getElementById('bioInput');
    if (bioInput) {
        bioInput.addEventListener('input', updateCharCount);
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// ==========================================
// NAVIGATION
// ==========================================
function goToDashboard() {
    if (!currentUser) return;
    
    const path = currentUser.role === 'mentor' 
        ? '../dashboard/mentor-dashboard/mentor-dashboard.html'
        : '../dashboard/mentee-dashboard/mentee-dashboard.html';
    window.location.href = path;
}

function goToMessages() {
    window.location.href = '../messaging/messaging.html';
}

function goToSettings() {
    window.location.href = '../settings/settings.html';
}

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    redirectToLogin();
}

function redirectToLogin() {
    window.location.href = '../login page/login.html';
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');
}

// ==========================================
// PROFILE LOADING
// ==========================================
async function loadProfile() {
    showLoading(true);
    hideError();
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            handleAuthError();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load profile');
        }
        
        
        currentProfile = data.data;
        currentUser = {
            _id: currentProfile.user,
            username: currentProfile.username,
            email: currentProfile.email,
            fullname: currentProfile.fullname,
            role: currentProfile.role,
            isProfileComplete: currentProfile.isProfileComplete,
            isFirstLogin: currentProfile.isFirstLogin
        };
        
        isFirstLogin = currentProfile.isFirstLogin;
        
        // Update UI
        updateUIBasedOnProfile();
        populateProfile(currentProfile);
        calculateProgress(currentProfile);
        updateTips(currentProfile);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showLoading(false);
        showError();
    }
}
function updateUIBasedOnProfile() {
    const banner = document.getElementById('completionBanner');
    const completeSection = document.getElementById('completeSection');
    
    // ALWAYS check current profile data first
    const missing = getMissingRequiredFields();
    const allFieldsComplete = missing.length === 0;
    
    // Hide banner if:
    // 1. All required fields are filled, OR
    // 2. Profile is marked complete in backend
    if (allFieldsComplete || currentProfile.isProfileComplete) {
        banner.style.display = 'none';
        completeSection.style.display = 'none';

    } else {
        // Show banner with pending fields
        banner.style.display = 'flex';
        completeSection.style.display = 'block';
        
        // Update banner text with pending count
        const bannerText = banner.querySelector('.banner-text span');
        if (bannerText && missing.length > 0) {
            const fieldNames = {
                bio: 'Bio',
                fullname: 'Full Name',
                location: 'Location',
                industry: 'Industry'
            };
            const pendingNames = missing.map(f => fieldNames[f] || f).join(', ');
            bannerText.textContent = `Complete required fields: ${pendingNames}`;
        }
    }
}
// ==========================================
// UI POPULATION
// ==========================================
function populateProfile(profile) {
    // Header info
    document.getElementById('displayName').textContent = profile.fullname || profile.username || 'User';
    document.getElementById('displayRole').innerHTML = `
        <i class="fas fa-${profile.role === 'mentor' ? 'chalkboard-teacher' : 'user-graduate'}"></i>
        ${profile.role === 'mentor' ? 'Mentor' : 'Mentee'}
    `;
    
    // Headline
    const headlineEl = document.getElementById('headlineDisplay');
    if (profile.bio) {
        const shortBio = profile.bio.substring(0, 100) + (profile.bio.length > 100 ? '...' : '');
        headlineEl.textContent = shortBio;
        headlineEl.classList.remove('placeholder-text');
    } else {
        headlineEl.innerHTML = '<span class="placeholder-text">Add a headline to describe yourself...</span>';
    }
    
    // Meta info
    updateMetaItem('locationMeta', profile.location, 'Add location', 'map-marker-alt');
    updateMetaItem('industryMeta', profile.industry, 'Add industry', 'briefcase');
    
    // Stats
    document.getElementById('connectionsCount').textContent = profile.stats?.connections || 0;
    document.getElementById('sessionsCount').textContent = profile.stats?.sessions || 0;
    document.getElementById('goalsCount').textContent = profile.stats?.goals || 0;
    
    // Update labels based on role
    if (profile.role === 'mentor') {
        document.getElementById('connectionsLabel').textContent = 'Mentees';
    }
    
    // Avatar
    updateAvatar(profile.avatar);
    
    // Role-based UI
    updateRoleBasedUI(profile.role);
    
    // About section
    populateAboutSection(profile);
    
    // Personal info
    populatePersonalInfo(profile);
    
    // Skills
    userSkills = profile.skills || [];
    renderSkills();
    
    // Experience & Education
    renderExperience(profile.experience || []);
    renderEducation(profile.education || []);


    calculateProgress(currentProfile);  // First calculate
    updateTips(currentProfile);          // Then update tips
    updateUIBasedOnProfile();   
}

function updateMetaItem(elementId, value, placeholder, icon) {
    const el = document.getElementById(elementId);
    if (value) {
        el.innerHTML = `<i class="fas fa-${icon}"></i> ${value}`;
        el.classList.remove('placeholder-text');
    } else {
        el.innerHTML = `<i class="fas fa-${icon}"></i> <span class="placeholder-text">${placeholder}</span>`;
        el.classList.add('placeholder-text');
    }
}

function updateAvatar(avatarUrl) {
    const img = document.getElementById('avatarImg');
    const placeholder = document.getElementById('avatarPlaceholder');
    
    if (avatarUrl) {
        img.src = avatarUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
    }
}

function updateRoleBasedUI(role) {
    const isMentor = role === 'mentor';
    
    // Show/hide mentor fields
    document.querySelectorAll('.mentor-only').forEach(el => {
        el.style.display = isMentor ? 'flex' : 'none';
    });
    
    // Show/hide mentee fields
    document.querySelectorAll('.mentee-only').forEach(el => {
        el.style.display = isMentor ? 'none' : 'flex';
    });
    
    // Update experience label
    const expLabel = document.getElementById('experienceLabel');
    if (expLabel) {
        expLabel.textContent = isMentor ? 'Years of Experience' : 'Experience Level';
    }
}

function populateAboutSection(profile) {
    const bioDisplay = document.getElementById('bioDisplay');
    const bioInput = document.getElementById('bioInput');
    
    if (profile.bio && profile.bio.trim()) {
        bioDisplay.textContent = profile.bio;
        bioDisplay.classList.remove('placeholder-text');
    } else {
        const placeholder = profile.role === 'mentor'
            ? 'Share your mentoring philosophy, expertise areas, and what you can offer to mentees...'
            : 'Tell mentors about your background, goals, and what you hope to achieve...';
        bioDisplay.innerHTML = `<span class="placeholder-text">${placeholder}</span>`;
    }
    
    bioInput.value = profile.bio || '';
    updateCharCount();
}

function populatePersonalInfo(profile) {
    // View mode
    setInfoValue('fullname', profile.fullname, 'Add your name');
    setInfoValue('email', profile.email, '-', false);
    setInfoValue('location', profile.location, 'Add location');
    setInfoValue('industry', profile.industry, 'Add industry');
    setInfoValue('experience', profile.yearsOfExperience, 'Add experience');
    
    if (profile.role === 'mentor') {
        setInfoValue('rate', profile.hourlyRate, 'Set your rate');
        setInfoValue('availability', profile.availability, 'Set availability');
    } else {
        setInfoValue('careerGoal', profile.careerGoal, 'Set your goal');
    }
    
    // Edit mode inputs
    document.getElementById('fullnameInput').value = profile.fullname || '';
    document.getElementById('emailInput').value = profile.email || '';
    document.getElementById('locationInput').value = profile.location || '';
    document.getElementById('industryInput').value = profile.industry || '';
    document.getElementById('experienceInput').value = profile.yearsOfExperience || '';
    document.getElementById('rateInput').value = profile.hourlyRate || '';
    document.getElementById('availabilityInput').value = profile.availability || '';
    document.getElementById('careerGoalInput').value = profile.careerGoal || '';
}

function setInfoValue(field, value, placeholder, isPlaceholder = true) {
    const display = document.getElementById(field + 'Display');
    if (!display) return;
    
    if (value && value.trim()) {
        display.textContent = value;
        display.classList.remove('placeholder-text');
    } else {
        display.textContent = placeholder;
        if (isPlaceholder) display.classList.add('placeholder-text');
    }
}

// ==========================================
// PROGRESS & TIPS
// ==========================================
function calculateProgress(profile) {
    const requiredFields = ['bio', 'location', 'industry'];
    const optionalFields = ['yearsOfExperience', 'avatar'];
    
    let completed = 0;
    let total = requiredFields.length + 2; // +2 for skills and experience
    
    requiredFields.forEach(field => {
        if (profile[field] && profile[field].trim()) completed++;
    });
    
    if (profile.skills && profile.skills.length > 0) completed++;
    if (profile.experience && profile.experience.length > 0) completed++;
    
    const percentage = Math.round((completed / total) * 100);
    
    // Update UI
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = percentage + '%';
    
    // Update hint
    const hint = document.getElementById('progressHint');
    if (percentage === 100) {
        hint.textContent = '✨ Your profile is complete! Ready to connect.';
        hint.style.color = 'var(--success)';
    } else {
        hint.textContent = `Complete ${requiredFields.length + 2 - completed} more items to finish your profile`;
        hint.style.color = 'var(--text-medium)';
    }
    
    return percentage;
}

function updateTips(profile) {
    const tips = {
        tipBio: profile.bio && profile.bio.trim(),
        tipLocation: profile.location && profile.location.trim(),
        tipIndustry: profile.industry && profile.industry.trim(),
        tipSkills: profile.skills && profile.skills.length >= 3,
        tipExperience: profile.experience && profile.experience.length > 0
    };
    
    Object.entries(tips).forEach(([id, completed]) => {
        const tip = document.getElementById(id);
        if (tip) {
            if (completed) {
                tip.classList.add('completed');
                tip.querySelector('i').className = 'fas fa-check-circle';
            } else {
                tip.classList.remove('completed');
                tip.querySelector('i').className = 'fas fa-circle';
            }
        }
    });
}

// ==========================================
// EDITING FUNCTIONS
// ==========================================
function toggleEdit(section) {
    const viewDiv = document.getElementById(section + 'View');
    const editDiv = document.getElementById(section + 'Edit');
    const editBtn = document.getElementById(section + 'EditBtn');
    
    const isEditing = editDiv.style.display === 'block';
    
    if (isEditing) {
        editDiv.style.display = 'none';
        viewDiv.style.display = 'block';
        if (editBtn) {
            editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
        }
    } else {
        // Close other sections
        closeAllEditModes();
        
        editDiv.style.display = 'block';
        viewDiv.style.display = 'none';
        if (editBtn) {
            editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        }
        
        // Focus input
        if (section === 'about') {
            document.getElementById('bioInput').focus();
        }
    }
}

function closeAllEditModes() {
    ['about', 'info', 'skills'].forEach(section => {
        const viewDiv = document.getElementById(section + 'View');
        const editDiv = document.getElementById(section + 'Edit');
        const editBtn = document.getElementById(section + 'EditBtn');
        
        if (viewDiv) viewDiv.style.display = 'block';
        if (editDiv) editDiv.style.display = 'none';
        if (editBtn) editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
    });
}

async function saveEdit(section) {
    const token = localStorage.getItem('accessToken');
    let updateData = {};
    let endpoint = `${API_BASE_URL}/profile`;
    let method = 'PATCH';
    
    try {
        if (section === 'about') {
            const bio = document.getElementById('bioInput').value.trim();
            if (!bio) {
                showToast('Please enter a bio', 'error');
                return;
            }
            updateData.bio = bio;
            
        } else if (section === 'info') {
            const fullname = document.getElementById('fullnameInput').value.trim();
            const location = document.getElementById('locationInput').value.trim();
            const industry = document.getElementById('industryInput').value;
            
            if (!fullname) {
                showToast('Full name is required', 'error');
                return;
            }
            if (!location) {
                showToast('Location is required', 'error');
                return;
            }
            if (!industry) {
                showToast('Industry is required', 'error');
                return;
            }
            
            updateData = {
                fullname,
                location,
                industry,
                yearsOfExperience: document.getElementById('experienceInput').value
            };
            
            if (currentUser.role === 'mentor') {
                updateData.hourlyRate = document.getElementById('rateInput').value;
                updateData.availability = document.getElementById('availabilityInput').value;
            } else {
                updateData.careerGoal = document.getElementById('careerGoalInput').value;
            }
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update');
        }
        
        const data = await response.json();
        currentProfile = data.data;
        
        // Update UI
        populateProfile(currentProfile);
        calculateProgress(currentProfile);
        updateTips(currentProfile);
        toggleEdit(section);
        
        showToast('Profile updated successfully!', 'success');
        updateUIBasedOnProfile();
        
    } catch (error) {
        console.error('Error saving:', error);
        showToast(error.message || 'Failed to save changes', 'error');
    }
}

// ==========================================
// SKILLS MANAGEMENT
// ==========================================
function toggleSkillsEdit() {
    const viewDiv = document.getElementById('skillsView');
    const editDiv = document.getElementById('skillsEdit');
    const editBtn = document.getElementById('skillsEditBtn');
    
    const isEditing = editDiv.style.display === 'block';
    
    if (isEditing) {
        editDiv.style.display = 'none';
        viewDiv.style.display = 'block';
        editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit';
    } else {
        closeAllEditModes();
        editDiv.style.display = 'block';
        viewDiv.style.display = 'none';
        editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        renderSkillsEdit();
        document.getElementById('skillInput').focus();
    }
}

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    
    if (userSkills.length === 0) {
        container.innerHTML = `
            <span class="empty-state">
                <i class="fas fa-lightbulb"></i>
                Add skills to showcase your expertise
            </span>
        `;
        return;
    }
    
    container.innerHTML = userSkills.map(skill => `
        <span class="skill-tag">
            ${skill}
        </span>
    `).join('');
}

function renderSkillsEdit() {
    const container = document.getElementById('skillsEditList');
    
    if (userSkills.length === 0) {
        container.innerHTML = '<span class="placeholder-text" style="width: 100%; text-align: center; padding: 20px;">Add skills above...</span>';
        return;
    }
    
    container.innerHTML = userSkills.map((skill, index) => `
        <span class="skill-edit-tag">
            ${skill}
            <span class="remove-skill" onclick="removeSkill(${index})">
                <i class="fas fa-times"></i>
            </span>
        </span>
    `).join('');
}

function handleSkillInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addSkill();
    }
}

function addSkill() {
    const input = document.getElementById('skillInput');
    const skill = input.value.trim();
    
    if (!skill) return;
    
    if (userSkills.length >= MAX_SKILLS) {
        showToast(`Maximum ${MAX_SKILLS} skills allowed`, 'error');
        return;
    }
    
    if (userSkills.includes(skill)) {
        showToast('Skill already added', 'error');
        return;
    }
    
    userSkills.push(skill);
    input.value = '';
    renderSkillsEdit();
}

function quickAddSkill(skill) {
    if (userSkills.includes(skill)) {
        showToast('Skill already added', 'info');
        return;
    }
    if (userSkills.length >= MAX_SKILLS) {
        showToast(`Maximum ${MAX_SKILLS} skills allowed`, 'error');
        return;
    }
    userSkills.push(skill);
    renderSkillsEdit();
}

function removeSkill(index) {
    userSkills.splice(index, 1);
    renderSkillsEdit();
}

async function saveSkills() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/skills`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ skills: userSkills })
        });
        
        if (!response.ok) throw new Error('Failed to save skills');
        
        const data = await response.json();
        currentProfile = data.data;
        
        renderSkills();
        toggleSkillsEdit();
        calculateProgress(currentProfile);
        updateTips(currentProfile);
        
        showToast('Skills updated!', 'success');
        
    } catch (error) {
        showToast('Failed to save skills', 'error');
    }
}

// ==========================================
// EXPERIENCE MANAGEMENT
// ==========================================
function renderExperience(experience) {
    const container = document.getElementById('experienceContainer');
    
    if (experience.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <p>No experience added yet</p>
                <span>Add your work history to build credibility</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = experience.map(exp => `
        <div class="timeline-item" data-id="${exp._id}">
            <div class="timeline-icon">
                <i class="fas fa-briefcase"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-title">${escapeHtml(exp.title)}</div>
                <div class="timeline-subtitle">${escapeHtml(exp.company)}</div>
                <div class="timeline-period">
                    <i class="fas fa-calendar-alt"></i>
                    ${exp.period || 'Present'}
                </div>
            </div>
            <div class="timeline-actions">
                <button class="timeline-action-btn" onclick="confirmDeleteExperience('${exp._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openExperienceModal() {
    document.getElementById('experienceModal').classList.add('active');
    document.getElementById('expTitle').focus();
}

function toggleCurrentJob() {
    const endDate = document.getElementById('expEndDate');
    const isCurrent = document.getElementById('expCurrent').checked;
    endDate.disabled = isCurrent;
    if (isCurrent) endDate.value = '';
}

async function saveExperience() {
    const title = document.getElementById('expTitle').value.trim();
    const company = document.getElementById('expCompany').value.trim();
    const startDate = document.getElementById('expStartDate').value;
    const endDate = document.getElementById('expEndDate').value;
    const isCurrent = document.getElementById('expCurrent').checked;
    
    if (!title || !company) {
        showToast('Title and company are required', 'error');
        return;
    }
    
    // Format period
    let period = '';
    if (startDate) {
        period = formatDate(startDate);
        if (isCurrent) {
            period += ' - Present';
        } else if (endDate) {
            period += ' - ' + formatDate(endDate);
        }
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/experience`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, company, period })
        });
        
        if (!response.ok) throw new Error('Failed to add experience');
        
        const data = await response.json();
        currentProfile = data.data;
        
        renderExperience(currentProfile.experience);
        calculateProgress(currentProfile);
        updateTips(currentProfile);
        closeModal('experienceModal');
        
        // Reset form
        document.getElementById('expTitle').value = '';
        document.getElementById('expCompany').value = '';
        document.getElementById('expStartDate').value = '';
        document.getElementById('expEndDate').value = '';
        document.getElementById('expCurrent').checked = false;
        document.getElementById('expEndDate').disabled = false;
        
        showToast('Experience added!', 'success');
        
    } catch (error) {
        showToast('Failed to add experience', 'error');
    }
}

function confirmDeleteExperience(id) {
    deleteCallback = () => deleteExperience(id);
    document.getElementById('confirmDeleteBtn').onclick = executeDelete;
    document.getElementById('deleteModal').classList.add('active');
}

async function deleteExperience(id) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/experience/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete');
        
        const data = await response.json();
        currentProfile = data.data;
        
        renderExperience(currentProfile.experience);
        calculateProgress(currentProfile);
        updateTips(currentProfile);
        
        showToast('Experience removed', 'success');
        
    } catch (error) {
        showToast('Failed to remove experience', 'error');
    }
}

// ==========================================
// EDUCATION MANAGEMENT
// ==========================================
function renderEducation(education) {
    const container = document.getElementById('educationContainer');
    
    if (education.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-graduation-cap"></i>
                <p>No education added yet</p>
                <span>Add your academic background</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = education.map(edu => `
        <div class="timeline-item" data-id="${edu._id}">
            <div class="timeline-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-title">${escapeHtml(edu.degree)}</div>
                <div class="timeline-subtitle">${escapeHtml(edu.institution)}</div>
                <div class="timeline-period">
                    <i class="fas fa-calendar-alt"></i>
                    ${edu.period || ''}
                </div>
            </div>
            <div class="timeline-actions">
                <button class="timeline-action-btn" onclick="confirmDeleteEducation('${edu._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openEducationModal() {
    document.getElementById('educationModal').classList.add('active');
    document.getElementById('eduDegree').focus();
}

async function saveEducation() {
    const degree = document.getElementById('eduDegree').value.trim();
    const institution = document.getElementById('eduInstitution').value.trim();
    const startYear = document.getElementById('eduStartYear').value;
    const endYear = document.getElementById('eduEndYear').value;
    
    if (!degree || !institution) {
        showToast('Degree and institution are required', 'error');
        return;
    }
    
    // Format period
    let period = '';
    if (startYear && endYear) {
        period = `${startYear} - ${endYear}`;
    } else if (startYear) {
        period = startYear;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/education`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ degree, institution, period })
        });
        
        if (!response.ok) throw new Error('Failed to add education');
        
        const data = await response.json();
        currentProfile = data.data;
        
        renderEducation(currentProfile.education);
        calculateProgress(currentProfile);
        closeModal('educationModal');
        
        // Reset form
        document.getElementById('eduDegree').value = '';
        document.getElementById('eduInstitution').value = '';
        document.getElementById('eduStartYear').value = '';
        document.getElementById('eduEndYear').value = '';
        
        showToast('Education added!', 'success');
        
    } catch (error) {
        showToast('Failed to add education', 'error');
    }
}

function confirmDeleteEducation(id) {
    deleteCallback = () => deleteEducation(id);
    document.getElementById('confirmDeleteBtn').onclick = executeDelete;
    document.getElementById('deleteModal').classList.add('active');
}

async function deleteEducation(id) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/education/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete');
        
        const data = await response.json();
        currentProfile = data.data;
        
        renderEducation(currentProfile.education);
        calculateProgress(currentProfile);
        
        showToast('Education removed', 'success');
        
    } catch (error) {
        showToast('Failed to remove education', 'error');
    }
}

function executeDelete() {
    if (deleteCallback) {
        deleteCallback();
        deleteCallback = null;
    }
    closeModal('deleteModal');
}

// ==========================================
// AVATAR UPLOAD
// ==========================================
function triggerAvatarUpload() {
    document.getElementById('avatarInput').click();
}

async function uploadAvatar(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to upload avatar');
        
        const data = await response.json();
        currentProfile = data.data;
        
        updateAvatar(currentProfile.avatar);
        calculateProgress(currentProfile);
        
        showToast('Avatar updated!', 'success');
        
    } catch (error) {
        showToast('Failed to upload avatar', 'error');
    }
    
    // Reset input
    input.value = '';
}

// ==========================================
// PROFILE COMPLETION
// ==========================================
async function completeProfile() {
    // Check required fields
    const required = ['bio', 'location', 'industry'];
    const missing = required.filter(field => !currentProfile[field] || !currentProfile[field].trim());
    
    if (missing.length > 0) {
        const fieldNames = {
            bio: 'About Me',
            location: 'Location',
            industry: 'Industry'
        };
        showToast(`Please complete: ${missing.map(f => fieldNames[f]).join(', ')}`, 'error');
        
        // Scroll to first missing
        const sectionMap = {
            bio: 'aboutSection',
            location: 'infoSection',
            industry: 'infoSection'
        };
        document.getElementById(sectionMap[missing[0]]).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to complete profile');
        }
        
        const data = await response.json();
        currentProfile = data.data;
        
        // Update UI
        document.getElementById('completionBanner').style.display = 'none';
        document.getElementById('completeSection').style.display = 'none';
        
        showToast('🎉 Profile completed! Welcome aboard!', 'success');
        
        // Redirect after delay
        setTimeout(() => {
            goToDashboard();
        }, 2000);
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}
function scrollToIncompleteSection() {
    // Check which required fields are missing
    const missing = getMissingRequiredFields();
    
    if (missing.length === 0) {
        // All required fields complete - hide banner
        document.getElementById('completionBanner').style.display = 'none';
        showToast('All required fields are complete!', 'success');
        return;
    }
    
    // Map missing fields to their section IDs
    const fieldToSection = {
        bio: 'aboutSection',
        location: 'infoSection',
        industry: 'infoSection',
        fullname: 'infoSection'
    };
    
    // Get the first missing field's section
    const firstMissing = missing[0];
    const sectionId = fieldToSection[firstMissing];
    
    if (sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            // Close any open edit modes first
            closeAllEditModes();
            
            // Scroll to section
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Auto-open edit mode for that section
            if (sectionId === 'aboutSection' && firstMissing === 'bio') {
                toggleEdit('about');
            } else if (sectionId === 'infoSection') {
                toggleEdit('info');
                // Focus the specific missing field
                setTimeout(() => {
                    const inputMap = {
                        fullname: 'fullnameInput',
                        location: 'locationInput',
                        industry: 'industryInput'
                    };
                    const inputId = inputMap[firstMissing];
                    if (inputId) {
                        const input = document.getElementById(inputId);
                        if (input) input.focus();
                    }
                }, 100);
            }
            
            // Highlight effect
            section.style.boxShadow = '0 0 0 4px rgba(255, 107, 107, 0.3)';
            setTimeout(() => {
                section.style.boxShadow = '';
            }, 2000);
        }
    }
}

// Helper function to check missing required fields
function getMissingRequiredFields() {
    const required = [];
    
    // Check bio
    if (!currentProfile.bio || !currentProfile.bio.trim()) {
        required.push('bio');
    }
    
    // Check personal info
    if (!currentProfile.fullname || !currentProfile.fullname.trim()) {
        required.push('fullname');
    }
    if (!currentProfile.location || !currentProfile.location.trim()) {
        required.push('location');
    }
    if (!currentProfile.industry || !currentProfile.industry.trim()) {
        required.push('industry');
    }
    
    return required;
}

function dismissBanner() {
    document.getElementById('completionBanner').style.display = 'none';
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function updateCharCount() {
    const bio = document.getElementById('bioInput');
    const count = document.getElementById('bioCharCount');
    if (bio && count) {
        count.textContent = bio.value.length;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'flex' : 'none';
    document.getElementById('profileContent').style.display = show ? 'none' : 'block';
}

function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('profileContent').style.display = 'none';
}

function hideError() {
    document.getElementById('errorState').style.display = 'none';
}

function handleAuthError() {
    localStorage.removeItem('accessToken');
    redirectToLogin();
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
        <i class="fas fa-${icons[type]} toast-icon"></i>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}