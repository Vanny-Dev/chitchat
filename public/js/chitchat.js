async function checkAuth() {
    const response = await fetch('/auth/user');
    const data = await response.json();

    if (data.loggedIn) {
        document.querySelector("span").textContent = `👋 Welcome, ${data.username}!`;
    } else {
        window.location.href = "../login/"; // Redirect to login if not authenticated
    }
}

checkAuth();
