
function goToDashboard() {
    const role = localStorage.getItem('role');
    if (role === 'Mentor') {
        window.location.href = '../dashboard/mentor-dashboard/mentor-dashboard.html';
    } else {
        window.location.href = '../dashboard/mentee-dashboard/mentee-dashboard.html';
    }
}

function goToProfile() {
    window.location.href = '../profile/profile.html';
}

function goToMessages() {
    window.location.href = '../messaging/messaging.html';
}

function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
            alert('Account deletion process initiated. You will receive a confirmation email.');
        }
    }
}
