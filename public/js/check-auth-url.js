fetch('/check-auth')
    .then(response => response.json())
    .then(data => {
        if (data.loggedIn) {
            // Redirect to protected page if already logged in
            window.location.href = "../chitchat/";
        }
    });
