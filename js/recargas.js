// Funciones de utilidad
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error al parsear el token:', error);
        throw new Error('Token inválido');
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'loginPasajero.html';
}

// Inicialización de la página
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando página de recargas...');
    try {
        await checkAuth();
        await loadAccountInfo();
        await loadTransactionHistory();
        
        // Agregar event listener al formulario de recarga
        const rechargeForm = document.getElementById('rechargeForm');
        if (rechargeForm) {
            rechargeForm.addEventListener('submit', handleRecharge);
        }
    } catch (error) {
        console.error('Error en la inicialización:', error);
        showError('Error al cargar la información');
    }
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'loginPasajero.html';
        return;
    }

    try {
        const tokenData = parseJwt(token);
        // Verificar que sea usuario tipo Pasajero
        if (tokenData['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] !== 'P') {
            throw new Error('Acceso exclusivo para pasajeros');
        }
        
        // Actualizar nombre de usuario en la navegación
        updateUserDisplay(tokenData);
    } catch (error) {
        console.error('Error de autenticación:', error);
        logout();
    }
}

function updateUserDisplay(tokenData) {
    try {
        // Obtener el nombre del usuario del token
        const userName = tokenData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        if (!userName) {
            throw new Error('Nombre de usuario no encontrado en el token');
        }
        
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = userName;
        }
    } catch (error) {
        console.error('Error al actualizar nombre de usuario:', error);
        showError('Error al cargar información del usuario');
    }
}

async function loadAccountInfo() {
    const token = localStorage.getItem('token');
    const tokenData = parseJwt(token);
    const userId = tokenData.id;

    if (!userId) {
        throw new Error('ID de usuario no encontrado en el token');
    }

    try {
        const response = await fetch(`http://187.251.132.2:5000/api/cuentas/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener información de la cuenta');
        }

        const data = await response.json();
        console.log('Datos de la cuenta:', data);
        updateAccountInfo(data);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

function updateAccountInfo(data) {
    // Actualizar saldo
    const saldoElement = document.getElementById('saldoActual');
    if (saldoElement) {
        saldoElement.textContent = formatCurrency(data.saldo || 0);
    }

    // Actualizar información del usuario
    const userFullName = document.getElementById('userFullName');
    const userEmail = document.getElementById('userEmail');
    
    if (userFullName) {
        userFullName.textContent = `${data.cuentaNombre || ''} ${data.cuentaApellidoPaterno || ''} ${data.cuentaApellidoMaterno || ''}`.trim();
    }
    
    if (userEmail) {
        userEmail.textContent = data.cuentaCorreo || 'No disponible';
    }
}

async function loadTransactionHistory() {
    const token = localStorage.getItem('token');
    const tokenData = parseJwt(token);
    const userId = tokenData.id;

    try {
        // La API espera los parámetros en el cuerpo de la solicitud
        const response = await fetch('http://187.251.132.2:5000/api/transacciones', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar las transacciones');
        }

        const data = await response.json();
        console.log('Transacciones:', data);
        
        // Si existe una transacción, actualizar la vista
        if (data && data.tipoTransaccion) {
            updateTransactionHistory([{
                tipo: data.tipoTransaccion,
                monto: data.monto,
                fecha: data.fecha
            }]);
        } else {
            updateTransactionHistory([]);
        }
    } catch (error) {
        console.error('Error:', error);
        // Mostrar mensaje en la interfaz sin levantar error
        updateTransactionHistory([]);
    }
}

function updateTransactionHistory(transactions) {
    const historialElement = document.getElementById('historialTransacciones');
    if (!historialElement) return;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
        historialElement.innerHTML = `
            <li class="list-group-item text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                No hay transacciones disponibles
            </li>`;
        return;
    }

    historialElement.innerHTML = transactions
        .map(transaction => {
            const isRecarga = transaction.tipo === 'Recarga';
            const icon = isRecarga ? 'fa-plus' : 'fa-minus';
            const badgeClass = isRecarga ? 'bg-success' : 'bg-primary';

            return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${isRecarga ? 'Recarga de' : 'Pago de'} ${formatCurrency(transaction.monto || 0)}</strong>
                    <br>
                    <small class="text-muted">
                        <i class="fas fa-calendar-alt me-1"></i>
                        ${formatDate(transaction.fecha)}
                    </small>
                </div>
                <span class="badge ${badgeClass} rounded-pill">
                    <i class="fas ${icon} me-1"></i>
                    ${transaction.tipo}
                </span>
            </li>`;
        })
        .join('');
}

function updateTransactionHistory(transactions) {
    const historialElement = document.getElementById('historialTransacciones');
    if (!historialElement) return;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
        historialElement.innerHTML = `
            <li class="list-group-item text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                No hay transacciones disponibles
            </li>`;
        return;
    }

    historialElement.innerHTML = transactions
        .map(transaction => {
            // Determinar el tipo de transacción y el ícono
            const isRecarga = transaction.tipo === 'Recarga';
            const icon = isRecarga ? 'fa-plus' : 'fa-minus';
            const badgeClass = isRecarga ? 'bg-success' : 'bg-primary';

            return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${isRecarga ? 'Recarga de' : 'Pago de'} ${formatCurrency(transaction.monto || 0)}</strong>
                    <br>
                    <small class="text-muted">
                        <i class="fas fa-calendar-alt me-1"></i>
                        ${formatDate(transaction.fecha)}
                    </small>
                </div>
                <span class="badge ${badgeClass} rounded-pill">
                    <i class="fas ${icon} me-1"></i>
                    ${transaction.tipo}
                </span>
            </li>`;
        })
        .join('');
}

async function handleRecharge(event) {
    event.preventDefault();
    
    const amount = document.getElementById('amount').value;
    
    if (!amount || parseFloat(amount) < 1) {
        showError('Por favor ingrese un monto válido (mínimo $1.00)');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://187.251.132.2:5000/api/transacciones/recargas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                monto: parseFloat(amount)
            })
        });

        if (!response.ok) {
            throw new Error('Error al realizar la recarga');
        }

        const data = await response.json();
        showSuccess(`Recarga exitosa. Nuevo saldo: ${formatCurrency(data.nuevoSaldo || 0)}`);
        
        // Actualizar información
        await loadAccountInfo();
        await loadTransactionHistory();
        
        // Limpiar el formulario
        event.target.reset();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al realizar la recarga. Por favor, intente nuevamente.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// Funciones auxiliares
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    setTimeout(() => {
        if (alertDiv && alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    setTimeout(() => {
        if (alertDiv && alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Exportar funciones necesarias
window.logout = logout;

// Gestión de errores global
window.addEventListener('unhandledrejection', function(event) {
    console.error('Error no manejado:', event.reason);
    showError('Ocurrió un error inesperado. Por favor, intente nuevamente.');
});