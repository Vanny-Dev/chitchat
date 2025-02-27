// Check if the user is logged in
fetch('/check-auth')
.then(response => response.json())
.then(data => {
    if (!data.loggedIn) {
        Swal.fire({
            icon: "warning",
            title: "Not Logged In!",
            text: "Redirecting to Login...",
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = "../login/"; // Redirect to login
        });
    }
})
.catch(error => console.error("Error checking authentication:", error));

