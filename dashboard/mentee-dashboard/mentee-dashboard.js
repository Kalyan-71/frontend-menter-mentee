// Load user data
window.onload = function() {
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'Mentee';
    const role = localStorage.getItem('role');
    
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
    
    
    document.getElementById('userName').textContent = username;
    document.getElementById('welcomeName').textContent = username;
    
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
};

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../../login page/login.html';
    }
}

function viewMentorProfile(name) {
    alert(`Viewing ${name}'s full profile...`);
}

function sendConnectionRequest(name) {
    event.stopPropagation();
    alert(`✉️ Connection request sent to ${name}! You'll be notified when they respond.`);
}

function browseMentors() {
    window.location.href = '../../mentor-search/mentor-search.html';
}

function viewAllGoals() {
    window.location.href = '../../goal-tracker/goal-tracker.html';
}

function findMentors() {
    window.location.href = '../../mentor-search/mentor-search.html';
}

function createGoal() {
    window.location.href = '../../goal-tracker/goal-tracker.html';
}

function viewMessages() {
    window.location.href = '../../messaging/messaging.html';
}

function viewResources() {
    alert('Opening resource library...');
}

function viewAllMentors() {
    alert('Viewing all your connected mentors...');
}


function messageMentor(mentorId) {
    window.location.href = `../../messaging/messaging.html?user=${mentorId}`;
}

// Make globally available
window.viewMessages = viewMessages;
window.messageMentor = messageMentor;
