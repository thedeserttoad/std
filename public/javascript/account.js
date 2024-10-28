async function UpdateAccountStatus() {
    console.log("Reached update function");
    setStatus();
}

async function isLoggedIn() {
    try {
        const response = await fetch('/api/isAuthenticated');
        console.log(response);
    } catch {
        console.log("Some error", error);
    }
}

async function setStatus() {
    const accountStatus = document.getElementById('accountStatus');

    if (!isSignedIn) {
        const status = await checkAuthentication();
        console.log("Status = ", status);
        if (status != null) {
        console.log("Account Signed In")
        accountStatus.innerHTML = 'Account Status: <span style="color: green;">Signed In</span>';
        }
    } else {
        console.log("Account not Signed in")
        accountStatus.innerHTML = 'Account Status: <span style="color: red;">Not Signed In</span>';
    }
}

module.exports = {
    UpdateAccountStatus,
    isLoggedIn,
    setStatus
};
  