// auth.js

const API_BASE_URL = '/api';

// Función para decodificar el token JWT
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decodificando token:', error);
        return null;
    }
}

// Función para verificar las credenciales del usuario
async function verificarCredenciales(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Error en la autenticación');
        }

        const data = await response.json();
        
        // Decodificar el token para verificar el rol
        const decodedToken = decodeJWT(data.token);
        console.log('Token decodificado:', decodedToken);

        // Verificar si el usuario tiene el rol correcto (C)
        const userRole = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        if (userRole !== 'C') {
            throw new Error('Acceso no autorizado: Solo los concesionarios pueden iniciar sesión');
        }

        return {
            token: data.token,
            id: decodedToken.id,
            name: decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
            role: userRole
        };

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Función de login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('inputEmail').value;
    const password = document.getElementById('inputPassword').value;
    
    // Mostrar loader
    document.getElementById('loginLoader').classList.remove('d-none');
    document.getElementById('loginButton').disabled = true;

    try {
        const userData = await verificarCredenciales(email, password);
        
        // Guardar información de sesión
        const sessionData = {
            userId: userData.id,
            name: userData.name,
            role: userData.role,
            token: userData.token,
            lastLogin: new Date().toISOString()
        };

        localStorage.setItem('sessionData', JSON.stringify(sessionData));
        localStorage.setItem('authToken', userData.token);
        
        showAlert('¡Bienvenido!', 'success');
        window.location.href = 'index.html';
        
    } catch (error) {
        showAlert(error.message || 'Error al iniciar sesión', 'danger');
    } finally {
        // Ocultar loader
        document.getElementById('loginLoader').classList.add('d-none');
        document.getElementById('loginButton').disabled = false;
    }
}

// Función para verificar autenticación
function checkAuth() {
    const sessionData = localStorage.getItem('sessionData');
    const currentPath = window.location.pathname;

    if (!sessionData && !currentPath.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }

    if (sessionData) {
        const userData = JSON.parse(sessionData);
        
        // Verificar si el usuario tiene el rol correcto
        if (userData.role !== 'C') {
            logout();
            return;
        }

        if (currentPath.includes('login.html')) {
            window.location.href = 'index.html';
            return;
        }

        updateUserInterface(userData);
    }
}

// Función para actualizar la interfaz
function updateUserInterface(userData) {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = userData.name;
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('sessionData');
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

// Función para mostrar alertas
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '1050';
    alertDiv.role = 'alert';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Inicializar la verificación de autenticación
document.addEventListener('DOMContentLoaded', checkAuth);