async function signup() {
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    if (!username || !password) {
        Swal.fire({
            icon: "warning",
            title: "Missing Fields!",
            text: "Please enter both username and password.",
            showConfirmButton: true
        });
        return; // Stop execution if fields are empty
    }

    const response = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    Swal.fire({
        icon: result.success ? "success" : "error",
        title: result.success ? "Success!" : "Error!",
        text: result.message,
        showConfirmButton: true
    }).then(() => {
        if (result.success) window.location.href = "../login/"; // Redirect after signup
    });
}


async function login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    // Frontend validation
    if (!username || !password) {
        Swal.fire({
            icon: "warning",
            title: "Fill up the fields!",
            text: "Please enter both username and password.",
            showConfirmButton: true
        });
        return; // Stop execution if fields are empty
    }

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    Swal.fire({
        icon: result.success ? "success" : "error",
        title: result.success ? "Success!" : "Error!",
        text: result.message,
        showConfirmButton: true
    }).then(() => {
        if (result.success) window.location.href = "/chitchat/"; // Redirect after login
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent form refresh

            // Check which page we're on and call the correct function
            if (document.getElementById("signup-username")) {
                signup();
            } else if (document.getElementById("login-username")) {
                login();
            }
        }
    });
});

