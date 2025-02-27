function logout() {
    fetch('/logout', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            Swal.fire({
                icon: "success",
                title: "Logged Out!",
                text: data.message,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "../login/"; // Redirect to login
            });
        })
        .catch(error => console.error("Logout error:", error));
}