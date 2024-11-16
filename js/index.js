document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM cargado, iniciando verificaciones...');
    try {
        const authOk = await checkAuth();
        if (!authOk) {
            console.log('Autenticación fallida');
            return;
        }
        
        console.log('Autenticación exitosa');
        displayUserName();
        await loadUnidades();
    } catch (error) {
        console.error('Error en la inicialización:', error);
        logout();
    }
});

async function checkAuth() {
    console.log('Verificando autenticación...');
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('Faltan datos de autenticación');
        logout();
        return false;
    }

    try {
        const tokenData = parseJwt(token);
        console.log('Token decodificado:', tokenData);

        // Verificar expiración
        if (tokenData.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime >= tokenData.exp) {
                console.log('Token expirado');
                logout();
                return false;
            }
        }

        // Verificar rol
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

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
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

async function loadUnidades() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No hay token disponible');
        return;
    }

    try {
        const response = await fetch('http://187.251.132.2:5000/api/unidades', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            throw new Error(`Error en la respuesta: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
            renderUnidadesTable(data.items);
            await loadGanancias(data.items);
            updateActiveUnitsCount(data.items);
        } else {
            showError('No hay datos de unidades disponibles');
        }
    } catch (error) {
        console.error('Error cargando unidades:', error);
        showError('Error al cargar las unidades');
    }
}

function updateActiveUnitsCount(unidades) {
    const activeUnits = unidades.filter(unidad => unidad.status === 'Activo').length;
    const activeUnitsElement = document.getElementById('activeUnits');
    if (activeUnitsElement) {
        activeUnitsElement.textContent = activeUnits;
    }
}

function renderUnidadesTable(unidades) {
    const tableContainer = document.getElementById('unidadesTable');
    if (!tableContainer) return;

    const table = document.createElement('table');
    table.className = 'table table-bordered table-striped';
    table.innerHTML = `
        <thead class="table-dark">
            <tr>
                <th>ID</th>
                <th>Ruta</th>
                <th>Chofer</th>
                <th>Estado</th>
                <th>Último Reporte</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${unidades.map(unidad => `
                <tr>
                    <td>${unidad.id}</td>
                    <td>${unidad.ruta || 'No asignada'}</td>
                    <td>${unidad.chofer || 'Sin asignar'}</td>
                    <td>
                        <span class="badge ${getStatusBadgeClass(unidad.status)}">
                            ${unidad.status || 'Desconocido'}
                        </span>
                    </td>
                    <td>${formatDate(unidad.ultimoReporte)}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="viewDetails('${unidad.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="editUnit('${unidad.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;

    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
        case 'activo':
            return 'bg-success';
        case 'inactivo':
            return 'bg-danger';
        case 'mantenimiento':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Sin registro';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

async function loadGanancias(unidades) {
    const token = localStorage.getItem('token');
    if (!token || !unidades.length) return;

    try {
        // Aquí irá la lógica para cargar las ganancias cuando esté disponible el endpoint
        const gananciasData = await fetchGanancias(unidades.map(u => u.id));
        renderGananciasTable(gananciasData);
        updateDashboardStats(gananciasData);
    } catch (error) {
        console.error('Error cargando ganancias:', error);
        showError('Error al cargar información de ganancias');
    }
}

async function fetchGanancias(unidadesIds) {
    // Este es un placeholder hasta que tengamos el endpoint real
    return []; // Retorna un array vacío por ahora
}

function renderGananciasTable(ganancias) {
    const container = document.getElementById('gananciasTable');
    if (!container || !ganancias.length) return;

    // Implementar cuando tengamos los datos reales
}

function updateDashboardStats(ganancias) {
    // Actualizar estadísticas del dashboard cuando tengamos los datos
    const ticketsSoldToday = document.getElementById('ticketsSoldToday');
    if (ticketsSoldToday) {
        ticketsSoldToday.textContent = '0'; // Actualizar con datos reales
    }
}

function viewDetails(unitId) {
    // Implementar vista de detalles
    console.log('Ver detalles de unidad:', unitId);
}

function editUnit(unitId) {
    // Implementar edición de unidad
    console.log('Editar unidad:', unitId);
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container-fluid');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Verificar autenticación cada minuto
setInterval(async () => {
    const authOk = await checkAuth();
    if (!authOk) {
        logout();
    }
}, 60000);

// Exportar funciones que necesiten ser accesibles desde HTML
window.viewDetails = viewDetails;
window.editUnit = editUnit;
window.logout = logout;