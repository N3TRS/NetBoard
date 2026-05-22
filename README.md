# 🎨 NetBoard — Microservicio de Pizarra Colaborativa en Tiempo Real

<div align="center">

### 🛠️ Stack Tecnológico

![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Prisma-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Embedded-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### ☁️ Infraestructura & Calidad

![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-6DB33F?style=for-the-badge)
![Prometheus](https://img.shields.io/badge/Prometheus-Metrics-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)

### 🏗️ Arquitectura

![Modular](https://img.shields.io/badge/Architecture-Modular_NestJS-blueviolet?style=for-the-badge)
![Excalidraw](https://img.shields.io/badge/Excalidraw-Drawing-6965DB?style=for-the-badge)
![REST API](https://img.shields.io/badge/REST-API-009688?style=for-the-badge)

</div>

---

## 📑 Tabla de Contenidos

1. [👤 Integrantes](#1--integrantes)
2. [🎯 Objetivo del Microservicio](#2--objetivo-del-microservicio)
3. [⚡ Funcionalidades Principales](#3--funcionalidades-principales)
4. [📋 Estrategia de Versionamiento y Branches](#4--estrategia-de-versionamiento-y-branches)
5. [⚙️ Tecnologías Utilizadas](#5-️-tecnologías-utilizadas)
6. [🧩 Funcionalidad y Endpoints](#6--funcionalidad-y-endpoints)
7. [🏛️ Arquitectura, Patrones y Módulos](#7-️-arquitectura-patrones-y-módulos)
8. [⚠️ Manejo de Errores](#8-️-manejo-de-errores)
9. [🧪 Evidencia de Pruebas y Cobertura](#9--evidencia-de-pruebas-y-cobertura)
10. [🗂️ Organización del Código](#10-️-organización-del-código)
11. [🔗 Conexiones con Servicios Externos](#11--conexiones-con-servicios-externos)
12. [🚀 Ejecución del Proyecto](#12--ejecución-del-proyecto)
13. [🐳 Dockerización](#13--dockerización)
14. [🤝 Integrantes y Contribuciones](#14--integrantes-y-contribuciones)

---

## 1. 👤 Integrantes

- Tulio Riaño Sánchez
- Julian Camilo Lopez Barrero
- Juan Sebastián Puentes Julio
- David Alejandro Patacon Henao

---

## 2. 🎯 Objetivo del Microservicio

**NetBoard** es el microservicio de pizarra colaborativa en tiempo real de la plataforma **OmniCode**. Sincroniza diagramas Excalidraw entre múltiples usuarios mediante WebSocket (Socket.IO), persiste snapshots del estado del tablero en MongoDB, usa Redis para caché de sesiones activas, y expone herramientas MCP para que agentes de IA puedan manipular el tablero programáticamente.

---

## 3. ⚡ Funcionalidades Principales

| Funcionalidad | Descripción |
|---|---|
| **Sincronización en tiempo real** | Propaga cambios de elementos Excalidraw a todos los colaboradores de la sesión vía WebSocket. |
| **Snapshots de tablero** | Guarda el estado del tablero vinculado a un `sessionSnapshotId` de NetSessions. |
| **Compartición de cursor** | Difunde posición del puntero de cada colaborador en tiempo real. |
| **Herramientas MCP** | API MCP en `/mcp` para que agentes IA dibujen formas, texto y flechas programáticamente. |
| **Presencia de colaboradores** | Notifica join/leave de usuarios en la sesión colaborativa. |
| **Métricas Prometheus** | Expone `http_requests_total` y latencia en `/metrics`. |

---

## 4. 📋 Estrategia de Versionamiento y Branches

### Estrategia de Ramas (Git Flow)

#### `main` — Estable, auto-deploy vía Docker
#### `develop` — Integración de features
#### `feature/*` — Desarrollo de funcionalidad específica

### 4.1 Convenciones para commits

```
feat: agregar endpoint de listado de snapshots
fix: corregir sincronización de cursor en reconexión
test: agregar pruebas para mcp.service
chore: actualizar prisma schema con índice en sessionSnapshotId
```

---

## 5. ⚙️ Tecnologías Utilizadas

| **Tecnología** | **Uso en el proyecto** |
|---|---|
| **TypeScript 5.7.3** | Lenguaje base. |
| **NestJS 11.0.1** | Framework REST + WebSocket. |
| **Node.js 20** | Runtime. |
| **@prisma/client 6.x** | ORM para MongoDB. |
| **ioredis 5.8.2** | Cliente Redis (embedded o externo). |
| **socket.io** | WebSocket para sincronización en tiempo real. |
| **@nestjs/jwt** | Validación de tokens JWT. |
| **@modelcontextprotocol/sdk** | Servidor MCP para herramientas de dibujo IA. |
| **prom-client 15.1.3** | Métricas Prometheus. |
| **class-validator** | Validación de DTOs. |
| **Jest 30** | Framework de pruebas. |
| **Docker** | Contenerización multi-stage con Redis embebido. |

---

## 6. 🧩 Funcionalidad y Endpoints

### REST API (todas requieren JWT Bearer)

---

#### 1️⃣ Guardar Snapshot — `POST /v1/boards/:sessionId/snapshots`

#### 📦 Request

| Campo | Tipo | Descripción |
|---|---|---|
| sessionSnapshotId | MongoId | ID del snapshot de sesión (NetSessions) |
| savedByEmail | email | Email del usuario que guarda |
| elements | array | Elementos Excalidraw en formato JSON |

#### 📤 Response (201 CREATED)

```json
{
  "id": "abc123",
  "sessionId": "sess-001",
  "sessionSnapshotId": "snap-001",
  "savedByEmail": "user@example.com",
  "createdAt": "2026-05-22T10:00:00Z"
}
```

---

#### 2️⃣ Listar Snapshots — `GET /v1/boards/:sessionId/snapshots`

**Response (200):** Array de metadata de snapshots (sin elementos serializados).

---

#### 3️⃣ Obtener Snapshot — `GET /v1/boards/snapshots/:sessionSnapshotId`

**Response (200):** Snapshot completo con `elements` como JSON parseado.

---

#### 4️⃣ Health Check — `GET /v1/health`

```json
{ "status": "ok" }
```

---

#### 5️⃣ Métricas — `GET /metrics`

Prometheus text format: `http_requests_total`, `http_request_duration_seconds`.

---

### WebSocket Gateway (`/ws/whiteboard`)

| Evento (Cliente → Servidor) | Payload | Descripción |
|---|---|---|
| `whiteboard.join` | `{ sessionId }` | Unirse a sesión colaborativa |
| `whiteboard.update` | `{ sessionId, elements }` | Difundir cambios de elementos |
| `whiteboard.pointer` | `{ sessionId, x, y }` | Compartir posición del cursor |

| Evento (Servidor → Cliente) | Descripción |
|---|---|
| `whiteboard.update` | Elementos actualizados por otro colaborador |
| `whiteboard.pointer` | Posición del cursor de otro usuario |
| `whiteboard.collaboratorJoined` | Notificación de nuevo colaborador |
| `whiteboard.collaboratorLeft` | Notificación de salida |

---

### MCP Endpoint (`/mcp`)

| Herramienta | Descripción |
|---|---|
| `draw_shape` | Agrega rectángulo, elipse o diamante con etiqueta opcional |
| `draw_text` | Agrega elemento de texto |
| `draw_arrow` | Dibuja flecha con etiqueta opcional |
| `add_elements` | Fusiona nuevos elementos al tablero |
| `get_board_state` | Obtiene elementos actuales del tablero |
| `clear_board` | Elimina todos los elementos |

---

## 7. 🏛️ Arquitectura, Patrones y Módulos

### Estructura Modular

```
AppModule
├── AuthIntegrationModule   (JWT guard)
├── HealthModule            (liveness probe)
├── McpModule               (MCP server)
├── MetricsModule           (Prometheus)
├── PersistenceModule       (repositorios Prisma)
├── RedisModule             (cliente ioredis)
└── WhiteboardModule        (gateway Socket.IO + lógica core)
```

### Patrones Aplicados

| Patrón | Dónde | Propósito |
|---|---|---|
| **Repository** | `BoardSnapshotsRepository`, `WhiteboardStateRepository` | Abstrae queries Prisma del servicio. |
| **Guard** | `JwtAuthGuard` | Valida Bearer token en rutas REST. |
| **Interceptor** | `MetricsInterceptor` | Registra duración y count de requests. |
| **Adapter (MCP)** | `McpService` | Expone herramientas de dibujo al protocolo MCP. |
| **Embedded Redis** | Docker image | Redis corre dentro del contenedor; sin dependencia externa en producción. |

---

## 8. ⚠️ Manejo de Errores

| ⚠️ Escenario | 🔢 HTTP | Descripción |
|:---|:---:|:---|
| Token JWT inválido | 401 | `JwtAuthGuard` rechaza la petición |
| Snapshot no encontrado | 404 | Repository lanza `NotFoundException` |
| Validación de DTO fallida | 422 | Global `ValidationPipe` |
| Error inesperado | 500 | `HttpExceptionFilter` global retorna JSON uniforme |

---

## 9. 🧪 Evidencia de Pruebas y Cobertura

### Suites de prueba — 16 archivos

```
test/unit/
├── health.controller.spec.ts
├── http-exception.filter.spec.ts
├── whiteboard.controller.spec.ts
├── whiteboard.gateway.spec.ts
├── whiteboard-jwt.guard.spec.ts
├── mcp.controller.spec.ts
├── mcp.service.spec.ts
├── metrics.controller.spec.ts
├── metrics.interceptor.spec.ts
├── metrics.service.spec.ts
├── redis.service.spec.ts
├── redis.utils.spec.ts
├── board-snapshots.repository.spec.ts
├── whiteboard-state.repository.spec.ts
└── app.e2e-spec.ts (E2E)
```

### Cómo ejecutar

```bash
npm run test          # Unitarias
npm run test:cov      # Cobertura (~90% target)
npm run test:e2e      # E2E
```

---

## 10. 🗂️ Organización del Código

```
NetBoard/
│
├── src/
│   ├── main.ts                          # Bootstrap, Swagger, global pipes/filters
│   ├── app.module.ts                    # Módulo raíz (8 imports)
│   ├── common/filters/                  # HttpExceptionFilter
│   └── modules/
│       ├── auth-integration/            # JwtAuthGuard
│       ├── health/                      # GET /v1/health
│       ├── mcp/                         # Servidor MCP (draw tools)
│       ├── metrics/                     # Prometheus
│       ├── persistence/                 # Repositorios Prisma
│       ├── redis/                       # ioredis client
│       └── whiteboard/                  # Core: gateway Socket.IO + snapshots
│
├── prisma/schema.prisma                 # Modelos MongoDB: WhiteboardState, BoardSnapshot
├── docker/
│   ├── redis.conf                       # Config Redis embebido
│   └── entrypoint.sh                    # Startup: Redis + NestJS
├── Dockerfile                           # Multi-stage build con Redis embebido
├── docker-compose.yml
├── package.json
└── sonar-project.properties
```

---

## 11. 🔗 Conexiones con Servicios Externos

| Servicio | Variable de Entorno | Descripción |
|---|---|---|
| **MongoDB** | `DATABASE_URL` | Persistencia de snapshots y estado del tablero (Prisma). |
| **Redis** | `REDIS_URL` | Caché de sesiones activas. Omitir para usar Redis embebido en Docker. |
| **JWT** (NetSessions) | `JWT_SECRET` | Secreto compartido para validar tokens del ecosistema. |

---

## 12. 🚀 Ejecución del Proyecto

### 📋 Prerrequisitos

- **Node.js 20+**, **npm**, **Docker**

```bash
npm install
npx prisma generate

# Desarrollo
npm run start:dev

# Producción con Docker (incluye Redis embebido)
docker compose up --build
```

📍 **URL Local:** `http://localhost:3003`
📚 **Swagger:** `http://localhost:3003/api`

### ⚙️ Variables de Entorno

| Variable | Requerida | Default | Descripción |
|:---|:---:|:---|:---|
| `DATABASE_URL` | ✅ | — | MongoDB URI |
| `JWT_SECRET` | ✅ | — | Secreto JWT compartido |
| `REDIS_URL` | ❌ | `redis://127.0.0.1:6379` | Redis externo (omitir = embebido) |
| `FRONTEND_URL` | ✅ | — | Origin permitido en CORS |
| `PORT` | ❌ | `3003` | Puerto del servidor |

---

## 13. 🐳 Dockerización

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm ci && npx prisma generate
RUN nest build

# Stage 2: Production (con Redis embebido)
FROM node:20-alpine
RUN apk add --no-cache tini redis
COPY --from=builder /app/dist ./dist
EXPOSE 3003
HEALTHCHECK CMD redis-cli ping && curl -f http://localhost:3003/v1/health
ENTRYPOINT ["tini", "--", "./docker/entrypoint.sh"]
```

| ✅ Característica | Descripción |
|:---|:---|
| **Multi-stage** | Imagen final sin devDependencies ni código fuente |
| **Redis embebido** | Un solo contenedor en producción, sin Redis externo obligatorio |
| **Health check** | Verifica Redis + HTTP en cada 30s |
| **Tini PID 1** | Manejo correcto de señales en Docker |

---

## 14. 🤝 Integrantes y Contribuciones

<div align="center">

![Course](https://img.shields.io/badge/Course-ARSW-orange?style=for-the-badge)
![Year](https://img.shields.io/badge/Year-2026--1-blue?style=for-the-badge)

| 👤 Integrante | 🎓 Rol |
|:---|:---|
| Tulio Riaño Sánchez | Desarrollo y arquitectura |
| Julian Camilo Lopez Barrero | Desarrollo y arquitectura |
| Juan Sebastián Puentes Julio | Desarrollo y arquitectura |
| David Alejandro Patacon Henao | Desarrollo y arquitectura |

> 💡 **NetBoard** conecta en tiempo real a múltiples desarrolladores sobre el mismo tablero Excalidraw, mientras permite a agentes IA manipular los diagramas a través del protocolo MCP.

**🎓 Escuela Colombiana de Ingeniería Julio Garavito**

</div>
