// Verificar si ya hay una sesión activa
document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando sesión existente...');
    const token = localStorage.getItem('token');
    if (token) {
        console.log('Token encontrado, verificando validez...');
        if (!isTokenExpired(token)) {
            console.log('Token válido, redirigiendo a index...');
            window.location.href = 'index.html';
        } else {
            console.log('Token expirado, limpiando...');
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

    // Mostrar estado de carga
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';
    loginButton.disabled = true;
    errorDiv.style.display = 'none';

    try {
        console.log('Enviando petición de login...');
        const response = await fetch('http://187.251.132.2:5000/login', {
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
        console.log('Respuesta recibida:', response.status);

        if (!response.ok) {
            let errorMessage;
            switch (response.status) {
                case 404:
                    errorMessage = 'Usuario no encontrado';
                    break;
                case 401:
                    errorMessage = 'Credenciales incorrectas';
                    break;
                case 400:
                    errorMessage = 'Datos inválidos. Por favor verifica la información';
                    break;
                default:
                    errorMessage = data.message || 'Error al iniciar sesión';
            }
            throw new Error(errorMessage);
        }

        if (!data.token) {
            throw new Error('No se recibió token del servidor');
        }

        console.log('Login exitoso, guardando token...');
        localStorage.setItem('token', data.token);

        // Decodificar y guardar información del usuario
        const tokenData = parseJwt(data.token);
        console.log('Información del token:', tokenData);
        
        localStorage.setItem('userId', tokenData.id);
        localStorage.setItem('userRole', tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
        localStorage.setItem('userName', tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/name']);

        console.log('Datos guardados, redirigiendo...');
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Error en login:', error);
        errorDiv.textContent = error.message || 'Error al iniciar sesión';
        errorDiv.style.display = 'block';
    } finally {
        // Restaurar estado del botón
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
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
        throw new Error('Error al procesar la información de usuario');
    }
}

function isTokenExpired(token) {
    try {
        const tokenData = parseJwt(token);
        const expirationDate = new Date(tokenData.exp * 1000);
        return expirationDate < new Date();
    } catch (error) {
        return true;
    }
}
