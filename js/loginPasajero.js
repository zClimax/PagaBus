document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando sesión existente...');
    const token = localStorage.getItem('token');
    if (token) {
        console.log('Token encontrado, verificando validez...');
        try {
            const tokenData = parseJwt(token);
            console.log('Token decodificado:', tokenData);
            if (!isTokenExpired(tokenData)) {
                console.log('Token válido, redirigiendo...');
                window.location.href = 'saldo.html';
            } else {
                console.log('Token expirado, limpiando...');
                localStorage.clear();
            }
        } catch (error) {
            console.error('Error validando token:', error);
            localStorage.clear();
        }
    }
});

async function handleLogin(event) {
    event.preventDefault();
    console.log('Iniciando proceso de login...');
    
    const email = document.getElementById('inputEmail').value;
    const password = document.getElementById('inputPassword').value;
    const errorDiv = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('loginButtonText');
    const spinner = document.getElementById('loginSpinner');

    // Mostrar loader
    buttonText.style.display = 'none';
    spinner.classList.remove('d-none');
    loginButton.disabled = true;
    errorDiv.classList.add('d-none');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                correo: email,
                contraseña: password
            })
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', response.status);

        if (!response.ok) {
            let errorMessage;
            switch (response.status) {
                case 404: errorMessage = 'Usuario no encontrado'; break;
                case 401: errorMessage = 'Credenciales incorrectas'; break;
                case 400: errorMessage = 'Datos inválidos'; break;
                default: errorMessage = data.message || 'Error al iniciar sesión';
            }
            throw new Error(errorMessage);
        }

        if (!data.token) {
            throw new Error('No se recibió token del servidor');
        }

        // Decodificar el token
        const tokenData = parseJwt(data.token);
        console.log('Token decodificado:', tokenData);

        // Verificar que sea usuario tipo Pasajero
        const role = tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        if (role !== 'P') {
            throw new Error('Acceso exclusivo para pasajeros');
        }

        // Guardar información de sesión
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', tokenData.id);
        localStorage.setItem('userName', tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']);
        localStorage.setItem('userRole', role);

        // Redirigir a la página de recargas
        window.location.href = 'saldo.html';

    } catch (error) {
        console.error('Error en login:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
    } finally {
        buttonText.style.display = 'inline';
        spinner.classList.add('d-none');
        loginButton.disabled = false;
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (error) {
        console.error('Error decodificando token:', error);
        throw new Error('Token inválido');
    }
}

function isTokenExpired(tokenData) {
    if (!tokenData.exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return tokenData.exp < currentTime;
}
