document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    await cargarRutas();
});

async function checkAuth() {
    console.log('Verificando autenticación...');
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No hay token, redirigiendo a login');
        window.location.href = 'login.html';
        return false;
    }

    try {
        const tokenData = parseJwt(token);
        if (tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] !== 'C') {
            console.log('Usuario no es concesionario');
            logout();
            return false;
        }

        const userName = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (userName) {
            const userNameElement = document.getElementById('userNameDisplay');
            if (userNameElement) {
                userNameElement.textContent = userName;
            }
        }

        return true;
    } catch (error) {
        console.error('Error en autenticación:', error);
        logout();
        return false;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

async function cargarRutas() {
    console.log('Cargando rutas...');
    try {
        const token = localStorage.getItem('token');
        const tokenData = parseJwt(token);
        console.log('ID del concesionario:', tokenData.id);
        
        const response = await fetch('/api/api/rutas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status respuesta rutas:', response.status);
        const responseText = await response.text();
        console.log('Respuesta rutas:', responseText);

        if (!response.ok) {
            console.error('Error response:', response.status, responseText);
            throw new Error(`Error al cargar rutas: ${response.status}`);
        }

        const rutas = JSON.parse(responseText);
        console.log('Rutas procesadas:', rutas);
        
        const rutaSelect = document.getElementById('rutaId');
        rutaSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
        
        rutas.forEach(ruta => {
            if (ruta.activa) {
                const option = document.createElement('option');
                option.value = ruta.id;
                option.textContent = ruta.nombre;
                rutaSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error detallado al cargar rutas:', error);
        showError('Error al cargar las rutas disponibles. ' + error.message);
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    console.log('Iniciando registro de unidad...');

    const button = document.getElementById('submitButton');
    const spinner = document.getElementById('submitSpinner');
    const buttonText = document.getElementById('submitText');
    
    const formData = {
        placas: document.getElementById('placas').value,
        numeroPermiso: document.getElementById('numeroPermiso').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        rutaId: document.getElementById('rutaId').value
    };

    console.log('Datos del formulario:', formData);

    if (!formData.rutaId) {
        showError('Debe seleccionar una ruta');
        return;
    }

    button.disabled = true;
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/api/unidades', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Status respuesta creación:', response.status);
        const responseText = await response.text();
        console.log('Respuesta creación:', responseText);

        if (!response.ok) {
            throw new Error(responseText);
        }

        showSuccess('Unidad registrada exitosamente');
        document.getElementById('unidadForm').reset();

    } catch (error) {
        console.error('Error al registrar unidad:', error);
        showError(error.message || 'Error al registrar la unidad');
    } finally {
        button.disabled = false;
        buttonText.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

function showError(message) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    setTimeout(() => alertDiv.style.display = 'none', 5000);
}

function showSuccess(message) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = 'alert alert-success';
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    setTimeout(() => alertDiv.style.display = 'none', 5000);
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error al parsear token:', error);
        throw new Error('Token inválido');
    }
}

// Asignar el evento submit al formulario
document.getElementById('unidadForm').addEventListener('submit', handleSubmit);

// Exportar funciones necesarias
window.logout = logout;