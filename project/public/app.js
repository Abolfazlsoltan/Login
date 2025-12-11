const API = "http://localhost:3000/api/auth";

async function register() {
    const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: rname.value,
            email: remail.value,
            password: rpass.value
        })
    });

    console.log(await res.json());
}

async function login() {
    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: lemail.value,
            password: lpass.value
        }),
        credentials: "include"
    });

    console.log(await res.json());
}

// Google
window.onload = () => {
    google.accounts.id.initialize({
        client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
        callback: async (response) => {
            const res = await fetch(`${API}/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
                credentials: "include"
            });

            console.log(await res.json());
        }
    });

    google.accounts.id.renderButton(
        document.getElementById("google"),
        { theme: "filled_blue", size: "large" }
    );
};
