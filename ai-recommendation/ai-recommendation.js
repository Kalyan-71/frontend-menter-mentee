
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
    window.location.href = '../messages/messages.html';
}

function sendConnectionRequest(name) {
    alert(`✨ AI-powered connection request sent to ${name}!\n\nYour personalized introduction message has been auto-generated based on your shared interests and goals.`);
}

function viewProfile(name) {
    alert(`Viewing ${name}'s profile with AI insights...`);
}

function refreshRecommendations() {
    const grid = document.getElementById('recommendationsGrid');
    const loading = document.getElementById('loadingAnimation');
    
    grid.style.display = 'none';
    loading.classList.add('active');
    
    setTimeout(() => {
        loading.classList.remove('active');
        grid.style.display = 'grid';
        alert('🤖 AI has analyzed your latest activity and refreshed your recommendations!');
    }, 2000);
}
