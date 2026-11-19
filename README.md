# 🚀 Hardware Price Tracker (Monitor de Precios)

Una aplicación Full-Stack diseñada para rastrear, almacenar y visualizar el historial de precios de componentes de hardware en diversas tiendas de e-commerce (Mercado Libre, Compra Gamer, etc.). 

El sistema cuenta con un motor de scraping (HTTP + navegador headless para sitios con renderizado dinámico), un "Cazador de Ofertas" en tiempo real y alertas automatizadas a través de Telegram.

## ✨ Características Principales

- **🕵️‍♂️ Web Scraping (Playwright + fetch):** Mercado Libre se lee desde datos estructurados del HTML (JSON-LD / metadatos); Compra Gamer, que renderiza el precio en el navegador, se lee con Playwright. Cada URL se valida contra una lista blanca de dominios por tienda.
- **⚡ Cazador de Ofertas en Vivo:** Buscador integrado que consulta en tiempo real los mejores precios en Mercado Libre sin necesidad de recargar la página.
- **📈 Visualización de Datos:** Gráficos históricos interactivos con scroll horizontal para analizar la fluctuación de precios a lo largo del tiempo (Recharts).
- **🔐 Autenticación y Seguridad:** Panel de administrador protegido mediante JSON Web Tokens (JWT) y contraseñas encriptadas con Bcrypt.
- **🤖 Alertas por Telegram:** Integración con la API de Telegram para notificar automáticamente cuando un producto baja de precio.
- **📱 Diseño Responsivo:** Interfaz de usuario intuitiva, construida con React y Tailwind CSS, optimizada para cualquier dispositivo.

## 🛠️ Tecnologías y Arquitectura

**Frontend:**
- React.js (Vite)
- TypeScript
- Tailwind CSS
- Recharts (Visualización de datos)
- Sonner (Notificaciones Toast)

**Backend:**
- Node.js & Express
- Playwright (Web Scraping headless)
- PostgreSQL (Base de datos relacional)
- API de Telegram (consumida con `fetch`, sin librerías extra)
- JWT & Bcrypt (Seguridad)

## 🏗️ Estructura del Proyecto

El proyecto está dividido en dos servicios principales:
1. `/backend`: Contiene la API REST, la lógica del scraper, la conexión a la base de datos y el bot de Telegram.
2. `/frontend`: Contiene la Single Page Application (SPA) que consume la API.

## 🚀 Instalación y Uso Local

### 1. Clonar el repositorio
\`\`\`bash
git clone https://github.com/lauJofre04/hardware-price-tracker.git
cd hardware-price-tracker
\`\`\`

### 2. Configurar Base de Datos (PostgreSQL)
Crear una base de datos en PostgreSQL. Las tablas, el índice del historial y las tiendas base se crean solos al arrancar el backend (o a mano con `npm run init-db`). Después, crear el usuario administrador:

```bash
cd backend
ADMIN_USER=admin ADMIN_PASSWORD="una-clave-de-12-o-mas-caracteres" npm run crear-admin
```

### 3. Configurar Variables de Entorno (.env)
**En `/backend/.env`** (hay un modelo en `backend/.env.example`):
```env
PORT=3000
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tu_base_de_datos
DB_SSL=false                # en Neon u otro Postgres con SSL, dejalo sin definir
JWT_SECRET=minimo_32_caracteres_aleatorios
TELEGRAM_TOKEN=tu_token_de_telegram
TELEGRAM_CHAT_ID=tu_chat_id
# Opcionales
CORS_ORIGIN=https://tu-dominio.com   # orígenes extra permitidos, separados por coma
ALERT_ON_PRICE_INCREASE=false        # true = avisar también cuando un precio sube
ENABLE_CRON=true                     # false = desactiva la actualización automática
```

**En `/frontend/.env`:**
\`\`\`env
VITE_API_URL=http://localhost:3000
\`\`\`

### 4. Iniciar los servidores
Abrir dos terminales:
\`\`\`bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
\`\`\`


## 🧪 Tests

```bash
cd backend
npm install
npm test
```

Cubren el parser de precios, la validación de URLs (anti-SSRF), el formato de los mensajes de Telegram y el guardado de precios con la base y la red simuladas. No hacen falta Postgres ni internet.

## ⚙️ Decisiones de diseño

- **Actualización automática:** un cron dentro del proceso corre a las 12:00 y 17:00 (hora de Argentina). Si ya hay una actualización en curso, la corrida se omite. En hosting gratuito que "duerme" el servicio puede no ejecutarse; en ese caso se puede disparar con `POST /api/scrape-all`.
- **Alertas:** por defecto solo avisa cuando un precio **baja**.
- **Seguridad:** endpoints de escritura con JWT, límite de intentos en el login y en el buscador, lista blanca de dominios para las URLs que scrapea el servidor.
- **Sesión:** el token se guarda en `localStorage`; es una decisión consciente para un panel de un solo administrador.
- **Uso responsable:** respetá los términos de uso de cada tienda y mantené frecuencias bajas de consulta.

## Capturas de la pagina Web

### 1. Pagina Principal

<img width="1341" height="682" alt="Image" src="https://github.com/user-attachments/assets/72b69294-96e5-405e-babb-067964d14b57" />

### 2. Card Produto
<img width="368" height="523" alt="Image" src="https://github.com/user-attachments/assets/32a6d481-ca8f-46da-ac54-42344036310a" />

### 3. Grafico Precio Producto
<img width="623" height="166" alt="Image" src="https://github.com/user-attachments/assets/529f68c6-289a-4b29-9c22-52eb63292657" />
## 👨‍💻 Autor

**Lautaro Jofre**
- Desarrollador Full Stack Jr. | Estudiante de Ingeniería en Sistemas
- 💼 LinkedIn: [linkedin.com/in/lautaro-jofre](https://www.linkedin.com/in/lautaro-jofre)
- 🌐 Portfolio: [portfolio-web-jofre-lautaro.vercel.app](https://portfolio-web-jofre-lautaro.vercel.app/)
