document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    displayUserName();
    await cargarRutas();
    await cargarUnidades();
    
    // Configurar el formulario
    document.getElementById('unidadForm').addEventListener('submit', handleSubmit);
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
        if (isTokenExpired(token)) {
            console.log('Token expirado');
            logout();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error en autenticación:', error);
        logout();
        return false;
    }
}

function displayUserName() {
    const userName = localStorage.getItem('userName');
    const userNameElement = document.getElementById('userNameDisplay');
    if (userName && userNameElement) {
        userNameElement.textContent = userName;
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
        const response = await fetch('http://187.251.132.2:5000/api/rutas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Respuesta de rutas:', response.status);

        if (!response.ok) {
            throw new Error(`Error al cargar rutas: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos de rutas:', data);
        
        const rutaSelect = document.getElementById('rutaId');
        rutaSelect.innerHTML = '<option value="">Seleccione una ruta</option>';
        
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(ruta => {
                const option = document.createElement('option');
                option.value = ruta.id;
                option.textContent = ruta.nombre;
                rutaSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error al cargar rutas:', error);
        showError('Error al cargar las rutas. Por favor, intente de nuevo.');
    }
}

async function cargarUnidades() {
    console.log('Cargando unidades...');
    try {
        const token = localStorage.getItem('token');
        console.log('Token para cargar unidades:', token);
        
        const response = await fetch('http://187.251.132.2:5000/api/unidades', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Respuesta del servidor:', response.status);
        
        if (response.status === 401) {
            console.log('Token no válido, redirigiendo a login');
            logout();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos de unidades recibidos:', data);
        renderUnidadesTable(data.items || []);

    } catch (error) {
        console.error('Error al cargar unidades:', error);
        showError('Error al cargar las unidades. Por favor, intente de nuevo.');
    }
}

function renderUnidadesTable(unidades) {
    console.log('Renderizando tabla de unidades:', unidades);
    const tableContainer = document.getElementById('unidadesTable');
    if (!unidades || unidades.length === 0) {
        tableContainer.innerHTML = '<div class="alert alert-info">No hay unidades registradas</div>';
        return;
    }

    const table = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead>
                    <tr>
                        <th>Placas</th>
                        <th>Permiso</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Ruta</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${unidades.map(unidad => `
                        <tr>
                            <td>${unidad.placas || ''}</td>
                            <td>${unidad.numeroPermiso || ''}</td>
                            <td>${unidad.marca || ''}</td>
                            <td>${unidad.modelo || ''}</td>
                            <td>${unidad.ruta ? unidad.ruta.nombre : 'Sin ruta'}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="editarUnidad('${unidad.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    tableContainer.innerHTML = table;
}

async function handleSubmit(event) {
    event.preventDefault();
    console.log('Iniciando envío de formulario...');

    const button = document.getElementById('submitButton');
    const spinner = document.getElementById('submitSpinner');
    const buttonText = document.getElementById('submitText');
    const unidadId = document.getElementById('unidadId').value;
    
    const formData = {
        placas: document.getElementById('placas').value,
        numeroPermiso: document.getElementById('numeroPermiso').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        rutaId: document.getElementById('rutaId').value
    };

    console.log('Datos del formulario:', formData);

    button.disabled = true;
    buttonText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const token = localStorage.getItem('token');
        const url = unidadId ? 
            `http://187.251.132.2:5000/api/unidades/${unidadId}` : 
            'http://187.251.132.2:5000/api/unidades';
        
        console.log('Enviando petición a:', url);
        
        const response = await fetch(url, {
            method: unidadId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Respuesta del servidor:', response.status);

        const data = await response.json();
        console.log('Datos de respuesta:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Error al procesar la solicitud');
        }

        showSuccess(unidadId ? 'Unidad modificada exitosamente' : 'Unidad registrada exitosamente');
        document.getElementById('unidadForm').reset();
        if (unidadId) {
            cancelarEdicion();
        }
        await cargarUnidades();

    } catch (error) {
        console.error('Error en el envío:', error);
        showError(error.message || 'Error al procesar la solicitud');
    } finally {
        button.disabled = false;
        buttonText.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

async function editarUnidad(id) {
    console.log('Editando unidad:', id);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://187.251.132.2:5000/api/unidades/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar los datos de la unidad');
        }

        const unidad = await response.json();
        console.log('Datos de la unidad a editar:', unidad);
        
        // Llenar el formulario
        document.getElementById('unidadId').value = unidad.id;
        document.getElementById('placas').value = unidad.placas;
        document.getElementById('numeroPermiso').value = unidad.numeroPermiso;
        document.getElementById('marca').value = unidad.marca;
        document.getElementById('modelo').value = unidad.modelo;
        document.getElementById('rutaId').value = unidad.rutaId || '';

        // Cambiar la apariencia del formulario
        document.getElementById('formTitle').textContent = 'Modificar Unidad';
        document.getElementById('submitText').textContent = 'Guardar Cambios';
        document.getElementById('cancelButton').style.display = 'block';
        document.getElementById('infoText').textContent = 'Modifique los campos necesarios y guarde los cambios.';

    } catch (error) {
        console.error('Error al cargar datos para editar:', error);
        showError(error.message);
    }
}

function cancelarEdicion() {
    console.log('Cancelando edición');
    document.getElementById('unidadForm').reset();
    document.getElementById('unidadId').value = '';
    document.getElementById('formTitle').textContent = 'Registrar Nueva Unidad';
    document.getElementById('submitText').textContent = 'Registrar Unidad';
    document.getElementById('cancelButton').style.display = 'none';
    document.getElementById('infoText').textContent = 'Complete todos los campos requeridos para registrar una nueva unidad.';
}

function showError(message) {
    console.error('Error:', message);
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    setTimeout(() => alertDiv.style.display = 'none', 5000);
}

function showSuccess(message) {
    console.log('Éxito:', message);
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
        return JSON.parse(window.atob(base64));
    } catch (error) {
        console.error('Error decodificando token:', error);
        return {};
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