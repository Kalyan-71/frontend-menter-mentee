
// Check if user is a mentor
window.onload = function() {
    const role = localStorage.getItem('role');
    if (role !== 'Mentor') {
        alert('Access denied. This page is for mentors only.');
        window.location.href = '../login page/login.html';
    }
};

function filterByTime(period) {
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    alert(`Filtering analytics by: ${period}`);
}
