import { registerUser } from "../Backend routes/user.js";
import { notify } from "../utils/toast.js";

function togglePassword(inputId, iconId) {
  const passwordInput = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.innerHTML = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

function updateSelectLabel() {
    const selectDiv = document.getElementById('roleSelect');
    selectDiv.classList.add('has-value');
  }
  

  async function handleSignup() {
    const fullName = document.querySelector('input[type="text"]').value;
    const email = document.querySelector('input[type="email"]').value;
    const username = document.querySelectorAll('input[type="text"]')[1].value;
    const role = document.querySelector('select').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation

    if (!fullName || !email || !username || !role || !password || !confirmPassword) {
        notify('Please fill in all fields!',"error");  
        return;
    }

    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!pattern.test(email)){
      notify("Please enter a valid email address", "error");
      return
    }
    
    if (password !== confirmPassword) {
        notify("Passwords do not match!","error");
        return;
    }
    
    if (password.length < 6) {
        notify('Password must be at least 6 characters long!',"error");
        return;
    }
    
    const user = {
      email,
      password,
      username,
      role,
      fullName,
    }
    const res = await registerUser(user);
    if(!res.success){
      notify(res.message , "error");
    }
    else{
      // Redirect to login
      notify("Account created successfully! Please Login","success","../login page/login.html");  
    }
}


window.togglePassword = togglePassword;
window.updateSelectLabel = updateSelectLabel;
window.handleSignup = handleSignup;
