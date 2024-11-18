// Configuración de la API
const API_BASE_URL = '/api';

// Configuración de la paginación
let currentPage = 1;
const pageSize = 10;
let totalPages = 0;

// Elementos DOM
const tablaUnidades = document.getElementById('tablaUnidades');
const totalUnidadesElement = document.getElementById('totalUnidades');
const unidadesActivasElement = document.getElementById('unidadesActivas');
const unidadesInactivasElement = document.getElementById('unidadesInactivas');
const totalRutasElement = document.getElementById('totalRutas');
const nombreUsuarioElement = document.getElementById('nombreUsuario');

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!await checkAuth()) {
            return;
        }
        await cargarUnidades();
    } catch (error) {
        console.error('Error en la inicialización:', error);
        mostrarError('Error al inicializar la página');
    }
});

// Función para parsear el token JWT
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

// Verificar autenticación
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
        if (userName && nombreUsuarioElement) {
            nombreUsuarioElement.textContent = userName;
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

// Función para cargar las unidades desde la API
async function cargarUnidades() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        mostrarCargando(true);

        // Construir URL con parámetros de paginación según la estructura esperada por el backend
        const url = new URL(`${API_BASE_URL}/api/unidades`, 'https://pagabus.org');
        url.searchParams.append('PageParameters.PageNumber', currentPage.toString());
        url.searchParams.append('PageParameters.PageSize', pageSize.toString());

        console.log('URL de consulta:', url.toString());
        console.log('Token:', token);

        const finalUrl = url.pathname + url.search;

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        console.log('Estado de la respuesta:', response.status);
        const responseText = await response.text();
        console.log('Texto de la respuesta:', responseText);

        if (response.status === 401) {
            console.log('Error de autenticación');
            logout();
            return;
        }

        if (!response.ok) {
            const errorData = JSON.parse(responseText);
            console.error('Error en la respuesta:', errorData);
            throw new Error(errorData.Message || `Error del servidor: ${response.status}`);
        }

        const data = JSON.parse(responseText);
        console.log('Datos procesados:', data);

        // Verificar si la respuesta tiene la estructura de PagedList
        if (data && Array.isArray(data)) {
            actualizarTablaInicial(data);
            actualizarEstadisticas(data);
            inicializarDataTable();
        } else if (data && Array.isArray(data.items)) {
            // Si viene en formato PagedList
            actualizarTablaInicial(data.items);
            actualizarEstadisticas(data.items);
            totalPages = data.totalPages;
            currentPage = data.currentPage;
            inicializarDataTable();
        } else {
            console.error('Formato de respuesta inválido:', data);
            throw new Error('Formato de respuesta inválido');
        }

    } catch (error) {
        console.error('Error completo:', error);
        mostrarError(error.message || 'Error al cargar las unidades. Por favor, intente más tarde.');
    } finally {
        mostrarCargando(false);
    }
}

// Función para mostrar/ocultar indicador de carga
function mostrarCargando(mostrar) {
    if (!tablaUnidades) return;
    
    let tbody = tablaUnidades.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        tablaUnidades.appendChild(tbody);
    }
    
    if (mostrar) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Función para la primera actualización de la tabla
function actualizarTablaInicial(unidades) {
    if (!tablaUnidades) return;
    
    // Asegurar que existe el thead con la estructura correcta
    if (!tablaUnidades.querySelector('thead')) {
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Placas</th>
                <th>No. Permiso</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Ruta</th>
                <th>Estado</th>
            </tr>
        `;
        tablaUnidades.insertBefore(thead, tablaUnidades.firstChild);
    }
    
    let tbody = tablaUnidades.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        tablaUnidades.appendChild(tbody);
    }

    tbody.innerHTML = '';

    if (!Array.isArray(unidades) || unidades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No se encontraron unidades registradas</td>
            </tr>
        `;
        return;
    }

    unidades.forEach(unidad => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', unidad.id);
        tr.innerHTML = `
            <td>${escapeHtml(unidad.placas || '')}</td>
            <td>${escapeHtml(unidad.numeroPermiso || '')}</td>
            <td>${escapeHtml(unidad.marca || '')}</td>
            <td>${escapeHtml(unidad.modelo || '')}</td>
            <td>${escapeHtml(unidad.ruta?.nombre || 'Sin asignar')}</td>
            <td>
                <span class="badge ${unidad.activo ? 'bg-success' : 'bg-danger'}">
                    ${unidad.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Inicializar DataTable
function inicializarDataTable() {
    if (!tablaUnidades) {
        console.error('No se encontró la tabla de unidades');
        return;
    }

    try {
        // Destruir la instancia anterior si existe
        const dataTable = tablaUnidades.dataTable;
        if (dataTable) {
            dataTable.destroy();
        }

        // Crear nueva instancia de DataTable
        tablaUnidades.dataTable = new simpleDatatables.DataTable(tablaUnidades, {
            searchable: true,
            fixedHeight: true,
            perPage: pageSize,
            labels: {
                placeholder: "Buscar...",
                perPage: "Elementos por página",
                noRows: "No se encontraron registros",
                info: "Mostrando {start} a {end} de {rows} registros",
            },
            // Configurar eventos de paginación
            perPageSelect: false, // Deshabilitamos el selector de registros por página
            firstLast: true, // Mostrar botones de primera/última página
            nextPrev: true, // Mostrar botones de siguiente/anterior
        });

    } catch (error) {
        console.error('Error al inicializar DataTable:', error);
    }
}

// Función para cambiar de página
async function cambiarPagina(nuevaPagina) {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPages) {
        currentPage = nuevaPagina;
        await cargarUnidades();
    }
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Función para actualizar las estadísticas
function actualizarEstadisticas(unidades) {
    if (!Array.isArray(unidades)) return;

    const totalUnidades = unidades.length;
    const unidadesActivas = unidades.filter(u => u.activo).length;
    const unidadesInactivas = totalUnidades - unidadesActivas;
    const totalRutas = new Set(unidades.filter(u => u.rutaId).map(u => u.rutaId)).size;

    if (totalUnidadesElement) totalUnidadesElement.textContent = totalUnidades;
    if (unidadesActivasElement) unidadesActivasElement.textContent = unidadesActivas;
    if (unidadesInactivasElement) unidadesInactivasElement.textContent = unidadesInactivas;
    if (totalRutasElement) totalRutasElement.textContent = totalRutas;
}

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        ${escapeHtml(mensaje)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const container = document.querySelector('.container-fluid');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Configurar cerrar sesión
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'cerrarSesion') {
        e.preventDefault();
        logout();
    }
});

// Exportar funciones necesarias
window.logout = logout;
window.cambiarPagina = cambiarPagina;
