import { notify } from "./utils/toast.js";

function goToLogin() {
    window.location.href = 'login page/login.html';
}

function goToSignup() {
    window.location.href = 'sign up page/signUp.html';
}

function learnMore() {
    document.querySelector('.features-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

window.goToLogin = goToLogin;
window.goToSignup = goToSignup;
window.learnMore = learnMore;
