function notify(message, type, url = null) { ///type="success" |"error"
  if (url) {
    sessionStorage.setItem("toastMessage", message);
    sessionStorage.setItem("toastType", type);
    window.location.href = url;
  } else {
    showToast(message, type);
  }
}

// 🔄 AUTO run when module loads (after redirect)
const msg = sessionStorage.getItem("toastMessage");
const type = sessionStorage.getItem("toastType");

if (msg && type) {
  showToast(msg, type);
  sessionStorage.removeItem("toastMessage");
  sessionStorage.removeItem("toastType");
}

// 🍞 internal toast function
function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // simple animation trigger
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}




export {notify};