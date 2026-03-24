// Navigation Functions
const pageRoutes = {
    'welcome': '../index.html', 
    'dashboard': '../dashboard/dashboard.html',
    'profile': '../profile/profile.html',
    'messages': '../messaging/messaging.html',
    'search': '../mentor-search/mentor-search.html',
    'goals': '../goal-tracker/goal-tracker.html',
    'settings': '../settings/settings.html',
    'recommendations': '../ai-recommendations/ai-recommendations.html'
};

function navigateTo(page) {
    event.preventDefault();
    
    // Navigate to page immediately
    if (pageRoutes[page]) {
        window.location.href = pageRoutes[page];
    }
    
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
}

// Toggle Dropdown Menu
function toggleDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropdown = document.getElementById('dropdownMenu');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdownMenu');
    const userProfile = document.querySelector('.user-profile');
    
    if (!userProfile.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// Prevent dropdown from closing when clicking inside it
document.addEventListener('DOMContentLoaded', function() {
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
        dropdown.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
});

// Toggle Mobile Menu
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '../login page/login.html';
    }
}

// Load user data and build navigation
window.addEventListener('DOMContentLoaded', function() {
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'John Doe';
    const role = localStorage.getItem('role') || 'Mentee';
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
    
    document.querySelector('.user-name').textContent = username;
    document.querySelector('.user-avatar').textContent = initials;
    
    // Update role badge
    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) {
        roleBadge.textContent = `🎓 ${role}`;
        roleBadge.className = `role-badge ${role.toLowerCase()}`;
    }
    
    // Build navigation based on role
    buildNavigation(role);
});

function buildNavigation(role) {
    const navMenu = document.getElementById('navMenu');
    const currentPage = window.location.pathname;
    
    let menuItems = [];
    
    if (role === 'Mentor') {
        menuItems = [
            { icon: '🏠', text: 'Dashboard', href: '../dashboard/mentor-dashboard/mentor-dashboard.html' },
            { icon: '👥', text: 'My Mentees', href: '../my-mentees/my-mentees.html' },
            { icon: '💬', text: 'Messages', href: '../messaging/messaging.html', badge: 8 },
            { icon: '📊', text: 'Analytics', href: '../mentor-analytics/mentor-analytics.html' },
            { icon: '👤', text: 'Profile', href: '../profile/profile.html' }
        ];
    } else {
        menuItems = [
            { icon: '🏠', text: 'Dashboard', href: '../dashboard/mentee-dashboard/mentee-dashboard.html' },
            { icon: '🔍', text: 'Find Mentors', href: '../mentor-search/mentor-search.html' },
            { icon: '💬', text: 'Messages', href: '../messaging/messaging.html', badge: 8 },
            { icon: '🎯', text: 'My Goals', href: '../goal-tracker/goal-tracker.html' },
            { icon: '👤', text: 'Profile', href: '../profile/profile.html' }
        ];
    }
    
    navMenu.innerHTML = '';
    
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        const isActive = currentPage.includes(item.href.split('/').pop().replace('.html', ''));
        
        li.innerHTML = `
            <a href="${item.href}" class="nav-link${isActive ? ' active' : ''}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.text}</span>
                ${item.badge ? `<span class="notification-badge">${item.badge}</span>` : ''}
            </a>
        `;
        
        navMenu.appendChild(li);
    });
}

