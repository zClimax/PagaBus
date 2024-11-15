console.log('Cargando index.js');

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
    }
});

async function checkAuth() {
    console.log('Verificando autenticación...');
    const token = localStorage.getItem('token');
    console.log('Token encontrado:', token ? 'Sí' : 'No');

    if (!token) {
        console.log('No hay token presente');
        window.location.href = 'login.html';
        return false;
    }

    try {
        if (isTokenExpired(token)) {
            console.log('Token expirado');
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
    console.log('Intentando mostrar nombre de usuario');
    const userName = localStorage.getItem('userName');
    const userNameElement = document.getElementById('userNameDisplay');
    if (userName && userNameElement) {
        userNameElement.textContent = userName;
        console.log('Nombre de usuario mostrado:', userName);
    } else {
        console.log('No se encontró userName o elemento HTML', {userName, userNameElement});
    }
}

function logout() {
    console.log('Ejecutando logout');
    localStorage.clear();
    window.location.href = 'login.html';
}

function isTokenExpired(token) {
    try {
        const tokenData = parseJwt(token);
        const expirationDate = new Date(tokenData.exp * 1000);
        return expirationDate < new Date();
    } catch (error) {
        console.error('Error verificando expiración del token:', error);
        return true;
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (error) {
        console.error('Error decodificando token:', error);
        return {};
    }
}

async function loadUnidades() {
    console.log('Iniciando carga de unidades');
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No hay token disponible');
        return;
    }

    try {
        console.log('Realizando petición con token:', token);
        const response = await fetch('http://187.251.132.2:5000/api/unidades', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos de unidades recibidos:', data);
        
        if (data.items) {
            renderUnidadesTable(data.items);
            await loadGanancias(data.items);
        } else {
            console.error('No se encontraron items en la respuesta');
            showError('No hay datos de unidades disponibles');
        }
    } catch (error) {
        console.error('Error cargando unidades:', error);
        showError('Error al cargar las unidades');
    }
}

function renderUnidadesTable(unidades) {
    console.log('Renderizando tabla de unidades');
    const tableContainer = document.getElementById('unidadesTable');
    if (!tableContainer) {
        console.error('No se encontró el contenedor de la tabla de unidades');
        return;
    }
    
    if (!unidades || unidades.length === 0) {
        tableContainer.innerHTML = '<div class="alert alert-info">No hay unidades registradas</div>';
        return;
    }

    const table = `
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Placas</th>
                        <th>Número de Permiso</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Estado</th>
                        <th>Ruta</th>
                    </tr>
                </thead>
                <tbody>
                    ${unidades.map(unidad => `
                        <tr>
                            <td>${unidad.placas || ''}</td>
                            <td>${unidad.numeroPermiso || ''}</td>
                            <td>${unidad.marca || ''}</td>
                            <td>${unidad.modelo || ''}</td>
                            <td>${unidad.activo ? 
                                '<span class="badge bg-success">Activo</span>' : 
                                '<span class="badge bg-danger">Inactivo</span>'}</td>
                            <td>${unidad.ruta ? unidad.ruta.nombre : 'Sin ruta asignada'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    tableContainer.innerHTML = table;
    console.log('Tabla de unidades renderizada');
}

async function loadGanancias(unidades) {
    console.log('Cargando ganancias de unidades');
    const token = localStorage.getItem('token');
    
    if (!token || !unidades || unidades.length === 0) {
        return;
    }

    try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const gananciasPromises = unidades.map(async unidad => {
            try {
                const response = await fetch(
                    `http://187.251.132.2:5000/api/unidades/${unidad.id}/transacciones?FechaInicio=${startDate.toISOString()}&FechaFin=${today.toISOString()}&Periodo=M`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Error al cargar ganancias para unidad ${unidad.id}`);
                }

                const data = await response.json();
                return {
                    unidad: unidad,
                    ganancias: data.items || []
                };
            } catch (error) {
                console.error(`Error cargando ganancias para unidad ${unidad.id}:`, error);
                return {
                    unidad: unidad,
                    ganancias: []
                };
            }
        });

        const resultados = await Promise.all(gananciasPromises);
        console.log('Resultados de ganancias recibidos:', resultados);
        renderGananciasTable(resultados);
    } catch (error) {
        console.error('Error cargando ganancias:', error);
        showError('Error al cargar las ganancias');
    }
}

function renderGananciasTable(gananciasData) {
    console.log('Renderizando tabla de ganancias');
    const tableContainer = document.getElementById('gananciasTable');
    if (!tableContainer) {
        console.error('No se encontró el contenedor de la tabla de ganancias');
        return;
    }

    if (!gananciasData || gananciasData.length === 0) {
        tableContainer.innerHTML = '<div class="alert alert-info">No hay datos de ganancias disponibles</div>';
        return;
    }

    const table = `
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Unidad</th>
                        <th>Ganancias Totales</th>
                        <th>Último Periodo</th>
                    </tr>
                </thead>
                <tbody>
                    ${gananciasData.map(item => {
                        const totalGanancias = item.ganancias.reduce((sum, g) => sum + g.totalGanancias, 0);
                        const ultimoPeriodo = item.ganancias[item.ganancias.length - 1];
                        return `
                            <tr>
                                <td>${item.unidad.placas}</td>
                                <td>$${totalGanancias.toFixed(2)}</td>
                                <td>${ultimoPeriodo ? 
                                    `$${ultimoPeriodo.totalGanancias.toFixed(2)} (${new Date(ultimoPeriodo.periodo).toLocaleDateString()})` : 
                                    'Sin datos'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    tableContainer.innerHTML = table;
    console.log('Tabla de ganancias renderizada');
}

function showError(message) {
    console.error('Mostrando error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    } else {
        console.error('No se encontró el elemento main');
    }
}

// Verificar expiración del token periódicamente
setInterval(checkAuth, 60000);