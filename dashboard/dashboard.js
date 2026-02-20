import { notify } from "../utils/toast.js";
import { getItem } from "../utils/localstorage.js";
import { logoutUser } from "../Backend routes/user.js";


function loadUserData() {
    const user = getItem("CURRENT-USER");

    document.getElementById('username').textContent = user.username;
    document.getElementById('userRole').textContent = user.role;
    
}

async function handleLogout() {
  await logoutUser();
}

window.onload = loadUserData;
window.handleLogout = handleLogout;
window.loadUserData = loadUserData;
