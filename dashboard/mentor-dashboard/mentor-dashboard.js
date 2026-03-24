import { notify } from "../../utils/toast.js";

// Load user data
window.onload = function() {
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'Mentor';
    const role = localStorage.getItem('role');
    
    // Debug: Log what's in localStorage
    console.log('LocalStorage Debug:');
    console.log('Username:', username);
    console.log('Role:', role);
    console.log('All localStorage:', localStorage);
    
    // Check if user is actually a mentor
    if (!role || role !== 'Mentor') {
        notify("No role found. Please login again." , "error");
        window.location.href = '../../login page/login.html';
        return;
    }

    
    document.getElementById('userName').textContent = username;
    document.getElementById('welcomeName').textContent = username;
    
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
};

window.handleLogout = function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../../login page/login.html';
    }
}

window.viewMenteeProfile=function viewMenteeProfile(name) {
    alert(`Viewing ${name}'s profile and progress...`);

}

window.viewAllMentees=function viewAllMentees() {
    window.location.href = '../../my-mentees/my-mentees.html';
}

window.acceptRequest=function acceptRequest(name) {
    alert(`✅ You accepted ${name}'s connection request! They have been added to your mentees.`);
}

window.declineRequest=function declineRequest(name) {
    if (confirm(`Are you sure you want to decline ${name}'s request?`)) {
        alert(`Request from ${name} declined.`);
    }
}

window.scheduleSession=function scheduleSession() {
    alert('Opening session scheduler...');
}

window.updateAvailability=function updateAvailability() {
    alert('Opening availability calendar...');
}

window.viewAnalytics=function viewAnalytics() {
    window.location.href = '../../mentor-analytics/mentor-analytics.html';
}

window.shareResources=function shareResources() {
    alert('Opening resource library...');
}