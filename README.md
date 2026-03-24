# Dulce Antojo 🧊

[![CI](https://github.com/tovarsantiagopalacio-debug/Dulce-antojo/actions/workflows/ci.yml/badge.svg)](https://github.com/tovarsantiagopalacio-debug/Dulce-antojo/actions/workflows/ci.yml)

Plataforma web de pedidos mayoristas para **Dulce Antojo**, empresa de granizados 100% naturales del Eje Cafetero, Colombia.

## ¿Qué hace?

- Catálogo de 8 sabores con filtros por categoría, búsqueda y ordenamiento
- Carrito de compras y sistema de pedidos con control de stock
- Autenticación completa (registro, login, recuperación de contraseña)
- Panel de administración con estadísticas, gestión de pedidos y exportación a Excel
- Upload de imágenes a Cloudinary
- Notificaciones por email (bienvenida, recuperación de contraseña)

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express 5 |
| Base de datos | MongoDB Atlas + Mongoose |
| Frontend | HTML5 + Tailwind CSS + Vanilla JS |
| Auth | JWT + bcrypt |
| Imágenes | Cloudinary |
| Email | Nodemailer + Gmail |
| Deploy | Railway (nixpacks) |

## Estructura del proyecto

```
dulce-antojo/
├── controllers/        # Lógica de negocio por dominio
├── middleware/         # Auth, admin, validación Zod
├── models/             # Schemas Mongoose (User, Product, Order)
├── public/             # Frontend estático (HTML, CSS, JS, img)
├── routes/             # Rutas Express por dominio
├── services/           # Cloudinary, Email
├── validators/         # Schemas Zod para validación de inputs
├── seed.js             # Poblar productos desde products.json
├── seed-admin.js       # Crear usuario administrador
└── server.js           # Punto de entrada (62 líneas)
```

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tovarsantiagopalacio-debug/Dulce-antojo.git
cd Dulce-antojo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales reales
```

Variables requeridas mínimas para correr localmente:
- `MONGO_URI` — conexión a MongoDB Atlas
- `JWT_SECRET` — genera uno con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Variables opcionales (funcionalidad reducida sin ellas):
- `CLOUDINARY_*` — upload de imágenes desde el panel admin
- `EMAIL_*` — emails de bienvenida y recuperación de contraseña
- `APP_URL` — URL base para links en emails

### 4. Poblar la base de datos

```bash
# Cargar los 8 productos de ejemplo
npm run seed

# Crear usuario administrador (requiere ADMIN_PASSWORD en .env)
npm run seed:admin
```

### 5. Iniciar el servidor

```bash
npm start
# Servidor en http://localhost:3000
```

## API — Endpoints principales

### Públicos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos activos |
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/forgot-password` | Solicitar reset de contraseña |
| POST | `/api/auth/reset-password` | Establecer nueva contraseña |

### Autenticados (requieren JWT)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders/my` | Historial de pedidos |

### Admin (requieren JWT + rol admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/stats` | Estadísticas del día |
| GET | `/api/admin/orders` | Listar pedidos por fecha |
| GET | `/api/admin/orders/export` | Exportar pedidos a Excel |
| PATCH | `/api/admin/orders/:id/status` | Cambiar estado de pedido |
| GET | `/api/admin/products` | Listar todos los productos |
| POST | `/api/admin/products` | Crear producto |
| PUT | `/api/admin/products/:id` | Editar producto |
| POST | `/api/admin/upload` | Subir imagen a Cloudinary |

## Deploy en Railway

El proyecto incluye `railway.toml` preconfigurado. Al hacer push a `main`, Railway detecta el `package.json` y ejecuta `npm start` automáticamente.

Variables de entorno requeridas en Railway:
```
MONGO_URI
JWT_SECRET
APP_URL
NODE_ENV=production
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
EMAIL_USER
EMAIL_PASS
EMAIL_FROM
```

## Licencia

Proyecto privado — © 2026 Dulce Antojo. Todos los derechos reservados.
