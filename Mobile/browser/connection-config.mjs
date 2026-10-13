// Use one public configuration for cache, interfaces, diagnostics and login.
export const connectionConfig = fetch("/login-config.json").then(async response => {
    if (!response.ok) throw new Error("Native login configuration unavailable");
    return response.json();
}).catch(error => ({unavailable:true,message:error.message}));
