// soporte.js
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando página de soporte...');
    
    // Inicializar EmailJS con la Public Key correcta
    initializeEmailJS();

    try {
        const authOk = await checkAuth();
        if (!authOk) {
            console.log('Autenticación fallida');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Autenticación exitosa');
        await displayUserName();
        initializeSupportForm();
    } catch (error) {
        console.error('Error en la inicialización:', error);
        logout();
    }
});

function initializeEmailJS() {
    emailjs.init("Wx6gvCe7pLFO1qpW1");
}

function displayUserName() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const tokenData = parseJwt(token);
            const userName = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
            const userNameElement = document.getElementById('userNameDisplay');
            if (userName && userNameElement) {
                userNameElement.textContent = userName;
            }
        } catch (error) {
            console.error('Error mostrando nombre de usuario:', error);
        }
    }
}

function initializeSupportForm() {
    const form = document.getElementById('supportForm');
    if (!form) {
        console.error('Formulario de soporte no encontrado');
        return;
    }

    // Pre-llenar información del usuario desde el token
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const tokenData = parseJwt(token);
            const userName = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
            const userEmail = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
                            tokenData['email']; // Respaldo por si el claim es diferente
            
            if (userName) {
                const nombreInput = document.getElementById('nombre');
                if (nombreInput) {
                    nombreInput.value = userName;
                    nombreInput.readOnly = true;
                }
            }
            
            if (userEmail) {
                const emailInput = document.getElementById('email');
                if (emailInput) {
                    emailInput.value = userEmail;
                    emailInput.readOnly = true;
                }
            }
        } catch (error) {
            console.error('Error al pre-llenar datos del usuario:', error);
        }
    }

    form.addEventListener('submit', handleSupportSubmit);
}

async function handleSupportSubmit(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('submitButton');
    const spinner = document.getElementById('submitSpinner');
    const buttonText = submitButton.querySelector('.button-text');
    
    // Deshabilitar botón y mostrar spinner
    if (submitButton) submitButton.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (buttonText) buttonText.style.display = 'none';

    try {
        const formData = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            asunto: document.getElementById('asunto').value,
            mensaje: document.getElementById('mensaje').value,
            userId: localStorage.getItem('userId'),
            timestamp: new Date().toISOString()
        };

        // Validar campos
        if (!formData.nombre || !formData.email || !formData.asunto || !formData.mensaje) {
            throw new Error('Por favor complete todos los campos');
        }

        // Enviar usando EmailJS
        const response = await emailjs.send(
            'service_xv6ay0d',
            'template_c22dl0t',
            {
                to_email: 'jaespinoza132@gmail.com',
                from_name: formData.nombre,
                from_email: formData.email,
                subject: formData.asunto,
                message: formData.mensaje,
                user_id: formData.userId,
                timestamp: new Date(formData.timestamp).toLocaleString()
            }
        );

        console.log('EmailJS Response:', response);
        showSuccessMessage('Ticket enviado correctamente. Nuestro equipo se pondrá en contacto contigo pronto.');
        
        // Limpiar solo el asunto y mensaje
        document.getElementById('asunto').value = '';
        document.getElementById('mensaje').value = '';
        
    } catch (error) {
        console.error('Error al enviar ticket:', error);
        showErrorMessage(error.message || 'Error al enviar el ticket. Por favor intente nuevamente.');
    } finally {
        // Restaurar botón y ocultar spinner
        if (submitButton) submitButton.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (buttonText) buttonText.style.display = 'inline';
    }
}

function showSuccessMessage(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

function showErrorMessage(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

async function checkAuth() {
    console.log('Verificando autenticación...');
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No hay token disponible');
        logout();
        return false;
    }

    try {
        const tokenData = parseJwt(token);
        
        // Verificar expiración
        if (tokenData.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime >= tokenData.exp) {
                console.log('Token expirado');
                logout();
                return false;
            }
        }

        // Verificar rol de concesionario
        const role = tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        if (role !== 'C') {
            console.log('Rol no autorizado');
            logout();
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error verificando token:', error);
        logout();
        return false;
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

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Verificar autenticación cada minuto
setInterval(async () => {
    const authOk = await checkAuth();
    if (!authOk) {
        logout();
    }
}, 60000);