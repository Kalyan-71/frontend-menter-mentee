import { notify } from "../../utils/toast.js";

const API_BASE_URL = 'http://localhost:8000/api/v1';
// const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';

let pendingMentees = [];
let activeMentees = [];

// ==========================================
// INITIALIZATION - ONLY ONE window.onload
// ==========================================
window.onload = function() {
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'Mentor';
    const role = localStorage.getItem('role');
    
    if (!role || role !== 'Mentor') {
        notify("No role found. Please login again.", "error");
        window.location.href = '../../login page/login.html';
        return;
    }
    
    document.getElementById('userName').textContent = username;
    document.getElementById('welcomeName').textContent = username;
    
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
    
    // Load dynamic data
    loadDashboardData();
};

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/my-mentees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load mentees');
        
        const data = await response.json();
        pendingMentees = data.data.pending || [];
        activeMentees = data.data.active || [];
        
        renderMyMentees();
        renderNewRequests();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        notify('Failed to load dashboard data', 'error');
    }
}

function renderMyMentees() {
    const cards = document.querySelectorAll('.card');
    let myMenteesCard = null;
    
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('My Mentees')) {
            myMenteesCard = card;
            break;
        }
    }
    
    if (!myMenteesCard) return;
    
    const displayMentees = activeMentees.slice(0, 4);
    
    if (displayMentees.length === 0) {
        myMenteesCard.innerHTML = `
            <h2 class="section-title">My Mentees</h2>
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <p>No active mentees yet</p>
                <p style="font-size: 0.9rem; color: #666;">Accept pending requests to see mentees here</p>
            </div>
            <button class="btn-primary" onclick="viewAllMentees()">View All Mentees</button>
        `;
        return;
    }
    
    const menteesHTML = displayMentees.map(mentee => `
        <div class="mentee-item" onclick="viewMenteeProfile('${mentee.mentee._id}')" style="cursor: pointer;">
            <div class="mentee-avatar" style="
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin-right: 1rem;
                overflow: hidden;
            ">
                ${mentee.mentee.avatar ? `<img src="${mentee.mentee.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
            </div>
            <div class="mentee-info">
                <h4>${mentee.mentee.fullname}</h4>
                <p>${mentee.mentee.industry || 'Professional'} • ${mentee.progress.percentage}% progress</p>
            </div>
        </div>
    `).join('');
    
    myMenteesCard.innerHTML = `
        <h2 class="section-title">My Mentees</h2>
        ${menteesHTML}
        <button class="btn-primary" onclick="viewAllMentees()">View All Mentees</button>
    `;
}

function renderNewRequests() {
    const cards = document.querySelectorAll('.card');
    let requestsCard = null;
    
    for (let card of cards) {
        const title = card.querySelector('.section-title');
        if (title && title.textContent.includes('New Requests')) {
            requestsCard = card;
            break;
        }
    }
    
    if (!requestsCard) return;
    
    const displayRequests = pendingMentees.slice(0, 3);
    
    if (displayRequests.length === 0) {
        requestsCard.innerHTML = `
            <h2 class="section-title">New Requests</h2>
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No pending requests</p>
                <p style="font-size: 0.9rem; color: #666;">New mentee requests will appear here</p>
            </div>
        `;
        return;
    }
    
    const requestsHTML = displayRequests.map(mentee => `
        <div class="request-item" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
        ">
            <div class="request-info">
                <h4>${mentee.mentee.fullname}</h4>
                <p style="font-size: 0.85rem; color: #666;">${mentee.mentee.industry || 'Professional'}</p>
            </div>
            <div class="request-actions" style="display: flex; gap: 0.5rem;">
                <button class="btn-accept" onclick="event.stopPropagation(); acceptMentee('${mentee.connectionId}')" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                ">Accept</button>
                <button class="btn-decline" onclick="event.stopPropagation(); declineMentee('${mentee.connectionId}')" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                ">Decline</button>
            </div>
        </div>
    `).join('');
    
    requestsCard.innerHTML = `
        <h2 class="section-title">New Requests</h2>
        ${requestsHTML}
    `;
}

async function acceptMentee(connectionId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/accept/${connectionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to accept');
        
        notify('Mentee accepted successfully!', 'success');
        
        const accepted = pendingMentees.find(m => m.connectionId === connectionId);
        if (accepted) {
            accepted.status = 'active';
            activeMentees.unshift(accepted);
            pendingMentees = pendingMentees.filter(m => m.connectionId !== connectionId);
        }
        
        renderMyMentees();
        renderNewRequests();
        
    } catch (error) {
        notify('Failed to accept mentee', 'error');
    }
}

async function declineMentee(connectionId) {
    if (!confirm('Are you sure you want to decline this request?')) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/connections/reject/${connectionId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to decline');
        
        notify('Request declined', 'info');
        
        pendingMentees = pendingMentees.filter(m => m.connectionId !== connectionId);
        renderNewRequests();
        
    } catch (error) {
        notify('Failed to decline request', 'error');
    }
}

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================
window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../../login page/login.html';
    }
};

window.viewMenteeProfile = function(menteeId) {
    localStorage.setItem('viewMenteeId', menteeId);
    window.location.href = `../../my-mentees/my-mentees.html?view=${menteeId}`;
};

window.viewAllMentees = function() {
    window.location.href = '../../my-mentees/my-mentees.html';
};

window.acceptMentee = acceptMentee;
window.declineMentee = declineMentee;