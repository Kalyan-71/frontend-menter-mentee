import { notify } from "../utils/toast.js";
// Simulate getting user data (in real app, this would come from server/session)
function loadUserData() {
    // You can customize this based on actual login data
    const username = localStorage.getItem('username') || 'User';
    const role = localStorage.getItem('role') || 'Mentee';
    
    document.getElementById('username').textContent = username;
    document.getElementById('userRole').textContent = role;
}

function handleLogout() {

}

// Load user data on page load
window.onload = loadUserData;

window.handleLogout = handleLogout;
window.loadUserData = loadUserData;
