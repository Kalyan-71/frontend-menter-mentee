// ==========================================
// CHAT CONFIGURATION
// ==========================================

///local
const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL1 = 'http://localhost:8000';

//production
// const API_BASE_URL = 'https://major-cudz.onrender.com/api/v1';
// const API_BASE_URL1 = 'https://major-cudz.onrender.com';

let socket = null;
let currentUserId = null;
let currentUserRole = null;
let currentReceiverId = null;
let currentConversationId = null;
let typingTimeout = null;
let allConversations = [];
let socketInitialized = false; // FIXED: Declare this variable
let isTabActive = true;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
});

async function initializeChat() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload._id || payload.id;
        currentUserRole = payload.role;
    } catch (e) {
        console.error('Invalid token');
        redirectToLogin();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user');

    initializeSocket();
    await loadConversations();

    if (urlUserId) {
        const existing = allConversations.find(c => c.participant._id === urlUserId);
        if (existing) {
            await openChat(urlUserId, existing.participant.fullname, existing.participant.avatar || '👤');
        } else {
            showToast('You can only message connected mentors/mentees', 'error');
        }
    }
}

// ==========================================
// SOCKET.IO SETUP (FIXED: Removed duplicate listeners)
// ==========================================
function initializeSocket() {
    if (socketInitialized) return;
    socketInitialized = true;

    const token = localStorage.getItem('accessToken');
    
    socket = io(API_BASE_URL1, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ Connected to chat server');
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from chat server');
        updateConnectionStatus(false);
    });

    // FIXED: Use ONLY message_broadcast for incoming messages (not receive_message)
    // receive_message is only for when receiver is NOT in the room
    socket.on('receive_message', (message) => {
        console.log('📩 Direct receive (not in room):', message);
        handleIncomingMessage(message, 'received');
    });

    socket.on('message_broadcast', (message) => {
        console.log('📢 Broadcast:', message);
        // Only process if NOT from current user
        if (message.sender._id !== currentUserId) {
            handleIncomingMessage(message, 'received');
        }
    });

    socket.on('message_sent', (message) => {
        console.log('✉️ Sent:', message);
        handleIncomingMessage(message, 'sent');
    });

    socket.on('user_typing', (data) => {
        if (data.userId === currentReceiverId) {
            showTypingIndicator(data.fullname);
        }
    });

    socket.on('user_stop_typing', (data) => {
        if (data.userId === currentReceiverId) {
            hideTypingIndicator();
        }
    });

    socket.on('messages_read', (data) => {
        if (data.readBy === currentReceiverId) {
            updateReadReceipts(data);
        }
    });

    socket.on('user_status', (data) => {
        updateUserStatus(data.userId, data.isOnline);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showToast(error.message, 'error');
    });
}

// ==========================================
// MESSAGE HANDLER (Unified)
// ==========================================
function handleIncomingMessage(message, type) {
    // Skip if tab hidden and not current chat
    if (!isTabActive && message.conversationId !== currentConversationId) {
        updateConversationPreview(message, type === 'sent');
        if (type === 'received') playNotificationSound();
        return;
    }

    // CRITICAL: Check for duplicates using message ID
    const existingMsg = document.querySelector(`[data-message-id="${message._id}"]`);
    if (existingMsg) {
        console.log('Duplicate ignored:', message._id);
        return;
    }

    // Display if current conversation is open
    if (message.conversationId === currentConversationId) {
        displayMessage(message, type);
        
        if (type === 'received') {
            socket.emit('mark_read', {
                conversationId: message.conversationId,
                senderId: message.sender._id
            });
        }
    }

    updateConversationPreview(message, type === 'sent');
    
    if (type === 'received') {
        playNotificationSound();
    }
}

// ==========================================
// LOAD CONVERSATIONS (Connected Users)
// ==========================================
async function loadConversations() {
    try {
        const token = localStorage.getItem('accessToken');
        
        // Get accepted connections
        const connectionsRes = await fetch(`${API_BASE_URL}/messages/connected-users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!connectionsRes.ok) throw new Error('Failed to load connections');
        const connectionsResult = await connectionsRes.json();
        const connectedUsers = connectionsResult.data || [];

        // Get existing conversations
        const conversationsRes = await fetch(`${API_BASE_URL}/messages/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let conversations = [];
        if (conversationsRes.ok) {
            const convResult = await conversationsRes.json();
            conversations = convResult.data || [];
        }

        // Merge data
        const mergedConversations = connectedUsers.map(conn => {
            const existingConv = conversations.find(c => 
                c.participant._id.toString() === conn.user._id.toString()
            );
            
            return {
                participant: conn.user,
                lastMessage: existingConv?.lastMessage || null,
                unreadCount: existingConv?.unreadCount || 0,
                connectionId: conn.connectionId,
                conversationId: existingConv?.conversationId || generateConversationId(currentUserId, conn.user._id),
                isNew: !existingConv
            };
        });

        // Add disconnected conversations
        const otherConversations = conversations.filter(c => 
            !connectedUsers.some(conn => conn.user._id.toString() === c.participant._id.toString())
        ).map(c => ({ ...c, isDisconnected: true }));

        allConversations = [...mergedConversations, ...otherConversations];
        renderConversations(allConversations);

    } catch (error) {
        console.error('Error loading connections:', error);
        showToast('Failed to load connections', 'error');
        renderConversations([]);
    }
}

// ==========================================
// LOAD MESSAGES (REMOVED DUPLICATE FUNCTION)
// ==========================================
async function loadMessages(userId) {
    try {
        currentReceiverId = userId;
        const token = localStorage.getItem('accessToken');
        
        currentConversationId = generateConversationId(currentUserId, userId);
        socket.emit('join_conversation', { conversationId: currentConversationId });

        const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load messages');
        
        const result = await response.json();
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        if (result.data && result.data.length > 0) {
            result.data.forEach(msg => {
                const type = msg.sender._id === currentUserId ? 'sent' : 'received';
                displayMessage(msg, type);
            });
            
            // Mark as read
            const hasUnread = result.data.some(msg => 
                msg.sender._id !== currentUserId && !msg.isRead
            );
            if (hasUnread) {
                socket.emit('mark_read', {
                    conversationId: currentConversationId,
                    senderId: userId
                });
            }
        } else {
            container.innerHTML = `
                <div class="chat-empty-state" style="height: auto; padding: 40px;">
                    <p>No messages yet. Say hello! 👋</p>
                </div>
            `;
        }
        
        // Scroll to bottom
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });

    } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Failed to load messages', 'error');
    }
}

async function fetchAndOpenChat(userId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const user = result.data;
            await openChat(userId, user.fullname, user.avatar || (user.role === 'mentor' ? '👨‍🏫' : '👨‍🎓'));
        } else {
            await openChat(userId, 'User', '👤');
        }
    } catch (error) {
        await openChat(userId, 'User', '👤');
    }
}

// ==========================================
// MESSAGE ACTIONS
// ==========================================
function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    const sendBtn = document.getElementById('sendBtn');
    
    if (!content) return;

    const isConnected = allConversations.some(c => 
        c.participant._id === currentReceiverId && !c.isDisconnected
    );
    
    if (!isConnected) {
        showToast('You can only message connected mentors/mentees', 'error');
        return;
    }
    
    if (!socket || !currentReceiverId) {
        showToast('Please select a conversation first', 'error');
        return;
    }

    if (!socket.connected) {
        showToast('Not connected to server. Please wait...', 'error');
        return;
    }

    sendBtn.disabled = true;

    socket.emit('send_message', {
        receiverId: currentReceiverId,
        content: content,
        conversationId: currentConversationId
    });

    input.value = '';
    input.style.height = 'auto';
    
    socket.emit('stop_typing', {
        conversationId: currentConversationId,
        receiverId: currentReceiverId
    });

    setTimeout(() => {
        sendBtn.disabled = false;
        input.focus();
    }, 300);
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
        return;
    }
    handleTyping();
}

function handleTyping() {
    if (!socket || !currentReceiverId || !socket.connected) return;
    
    socket.emit('typing', {
        conversationId: currentConversationId,
        receiverId: currentReceiverId
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', {
            conversationId: currentConversationId,
            receiverId: currentReceiverId
        });
    }, 2000);
}

function refreshMessages() {
    if (currentReceiverId) {
        loadMessages(currentReceiverId);
        showToast('Messages refreshed', 'success');
    }
}

// ==========================================
// UI RENDERING
// ==========================================
function renderConversations(conversations) {
    const container = document.getElementById('conversationsContainer');
    
    if (!conversations || conversations.length === 0) {
        container.innerHTML = `
            <div class="empty-conversations">
                <i class="fas fa-user-friends" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No connections yet</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    ${currentUserRole === 'mentee' 
                        ? 'Connect with a mentor to start messaging' 
                        : 'Wait for mentees to connect with you'}
                </p>
            </div>
        `;
        return;
    }

    const sorted = conversations.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const timeA = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt) : new Date(0);
        const timeB = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt) : new Date(0);
        return timeB - timeA;
    });

    container.innerHTML = sorted.map(conv => {
        const isActive = conv.participant._id === currentReceiverId;
        const time = formatTime(conv.lastMessage?.sentAt);
        const preview = conv.lastMessage?.content || (conv.isNew ? 'Start a conversation...' : 'No messages yet');
        const isUnread = conv.unreadCount > 0;
        const roleLabel = conv.participant.role === 'mentor' ? 'Mentor' : 'Mentee';
        const isDisconnected = conv.isDisconnected;
        
        return `
            <div class="conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'has-unread' : ''} ${isDisconnected ? 'disconnected' : ''}" 
                 onclick="selectConversation('${conv.participant._id}', '${escapeHtml(conv.participant.fullname)}', '${conv.participant.avatar || ''}')"
                 data-user-id="${conv.participant._id}">
                <div class="conversation-avatar">
                    ${conv.participant.avatar || getDefaultAvatar(conv.participant.role)}
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">
                        <span>${escapeHtml(conv.participant.fullname)} 
                            <small class="role-badge">${roleLabel}</small>
                            ${isDisconnected ? '<small style="color: #ff6b6b; margin-left: 5px;">[Disconnected]</small>' : ''}
                        </span>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-preview" style="${conv.isNew ? 'font-style: italic; opacity: 0.7;' : ''}">
                        ${escapeHtml(preview.substring(0, 35))}${preview.length > 35 ? '...' : ''}
                    </div>
                </div>
                ${isUnread ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
            </div>
        `;
    }).join('');
}

async function selectConversation(userId, name, avatar) {
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const item = document.querySelector(`[data-user-id="${userId}"]`);
    if (item) {
        item.classList.add('active');
        const badge = item.querySelector('.unread-badge');
        if (badge) badge.remove();
        item.classList.remove('has-unread');
    }
    
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('activeChat').style.display = 'flex';
    document.getElementById('chatUserName').textContent = name;
    document.getElementById('chatAvatar').textContent = avatar || getDefaultAvatar();
    
    await openChat(userId, name, avatar);
}

async function openChat(userId, name, avatar) {
    currentReceiverId = userId;
    document.getElementById('chatUserName').textContent = name;
    document.getElementById('chatAvatar').textContent = avatar || '👤';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('activeChat').style.display = 'flex';
    
    await loadMessages(userId);
    
    const url = new URL(window.location);
    url.searchParams.set('user', userId);
    window.history.pushState({}, '', url);
    
    setTimeout(() => {
        document.getElementById('messageInput').focus();
    }, 100);
}

function displayMessage(message, type) {
    const container = document.getElementById('messagesContainer');
    
    // CRITICAL: Duplicate check
    const existing = container.querySelector(`[data-message-id="${message._id}"]`);
    if (existing) {
        console.log('Message already displayed:', message._id);
        return;
    }
    
    const emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();
    
    const isSent = type === 'sent';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.dataset.messageId = message._id;
    
    const time = new Date(message.createdAt || Date.now()).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
    });

    messageDiv.innerHTML = `
        <div class="message-content">
            <div>${escapeHtml(message.content)}</div>
            <div class="message-time">
                ${time} 
                ${isSent ? `<span class="read-status">✓</span>` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function updateConversationPreview(message, isSent = false) {
    const otherUserId = isSent ? currentReceiverId : message.sender._id;
    const convElement = document.querySelector(`[data-user-id="${otherUserId}"]`);
    
    if (convElement) {
        const previewEl = convElement.querySelector('.conversation-preview');
        const timeEl = convElement.querySelector('.conversation-time');
        
        if (previewEl) {
            previewEl.textContent = message.content.substring(0, 35) + (message.content.length > 35 ? '...' : '');
            previewEl.style.fontStyle = 'normal';
            previewEl.style.opacity = '1';
        }
        if (timeEl) timeEl.textContent = 'Just now';
        
        if (!isSent && message.sender._id !== currentReceiverId) {
            let badge = convElement.querySelector('.unread-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                convElement.appendChild(badge);
                convElement.classList.add('has-unread');
            }
            badge.textContent = (parseInt(badge.textContent) || 0) + 1;
        }
        
        const container = document.getElementById('conversationsContainer');
        container.insertBefore(convElement, container.firstChild);
    } else if (!isSent) {
        loadConversations();
    }
}

// ==========================================
// UI HELPERS
// ==========================================
function showTypingIndicator(name) {
    const statusEl = document.getElementById('chatUserStatus');
    if (statusEl) {
        statusEl.innerHTML = `<span class="typing-indicator">${name} is typing<span>.</span><span>.</span><span>.</span></span>`;
    }
}

function hideTypingIndicator() {
    const statusEl = document.getElementById('chatUserStatus');
    if (statusEl) {
        statusEl.innerHTML = '<span class="online-status">● Online</span>';
    }
}

function updateReadReceipts(data) {
    document.querySelectorAll('.message.sent .read-status').forEach(el => {
        el.textContent = '✓✓';
        el.classList.add('read');
    });
}

function updateUserStatus(userId, isOnline) {
    const item = document.querySelector(`[data-user-id="${userId}"]`);
    if (item) {
        const avatar = item.querySelector('.conversation-avatar');
        avatar.style.border = isOnline ? '3px solid #4caf50' : 'none';
    }
    
    if (userId === currentReceiverId) {
        const statusEl = document.getElementById('chatUserStatus');
        if (statusEl) {
            statusEl.innerHTML = isOnline ? 
                '<span class="online-status">● Online</span>' : 
                '<span class="offline-status">● Offline</span>';
        }
    }
}

function updateConnectionStatus(connected) {
    const title = document.querySelector('.navbar-title');
    if (title) title.style.opacity = connected ? '1' : '0.6';
}

function searchConversations() {
    const searchTerm = document.getElementById('searchConversations').value.toLowerCase();
    if (!searchTerm) {
        renderConversations(allConversations);
        return;
    }
    
    const filtered = allConversations.filter(conv => 
        conv.participant.fullname.toLowerCase().includes(searchTerm)
    );
    renderConversations(filtered);
}

function getDefaultAvatar(role) {
    if (role === 'mentor') return '👨‍🏫';
    if (role === 'mentee') return '👨‍🎓';
    return '👤';
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function generateConversationId(userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `conv_${ids[0]}_${ids[1]}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d`;
    return d.toLocaleDateString();
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {}
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// NAVIGATION
// ==========================================
function goToDashboard() {
    const role = localStorage.getItem('role');
    window.location.href = role === 'mentor' 
        ? '../dashboard/mentor-dashboard/mentor-dashboard.html'
        : '../dashboard/mentee-dashboard/mentee-dashboard.html';
}

function goToProfile() {
    window.location.href = '../profile/profile.html';
}

function logout() {
    if (socket) socket.disconnect();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '../login page/login.html';
}

function redirectToLogin() {
    window.location.href = '../login page/login.html';
}

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('active');
}

// ==========================================
// EXPORTS FOR HTML
// ==========================================
window.selectConversation = selectConversation;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.handleTyping = handleTyping;
window.refreshMessages = refreshMessages;
window.searchConversations = searchConversations;
window.goToDashboard = goToDashboard;
window.goToProfile = goToProfile;
window.logout = logout;
window.toggleMobileMenu = toggleMobileMenu;

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('messageInput');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
});

// Tab visibility
document.addEventListener('visibilitychange', () => {
    isTabActive = document.visibilityState === 'visible';
});