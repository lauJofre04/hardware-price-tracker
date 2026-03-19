# 🚀 Hardware Price Tracker (Monitor de Precios)

Una aplicación Full-Stack diseñada para rastrear, almacenar y visualizar el historial de precios de componentes de hardware en diversas tiendas de e-commerce (Mercado Libre, Compra Gamer, etc.). 

El sistema cuenta con un motor de web scraping avanzado capaz de evadir protecciones anti-bot, un "Cazador de Ofertas" en tiempo real y alertas automatizadas a través de Telegram.

## ✨ Características Principales

- **🕵️‍♂️ Web Scraping Avanzado (Playwright):** Extracción asíncrona de datos del DOM, superando bloqueos WAF y errores 403 (Forbidden) simulando navegación humana.
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
- node-telegram-bot-api
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
Crear una base de datos en PostgreSQL y ejecutar el script `crearAdmin.js` para generar las tablas iniciales y el usuario administrador.

### 3. Configurar Variables de Entorno (.env)
**En `/backend/.env`:**
\`\`\`env
PORT=3000
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tu_base_de_datos
JWT_SECRET=tu_secreto_seguro
TELEGRAM_BOT_TOKEN=tu_token_de_telegram
TELEGRAM_CHAT_ID=tu_chat_id
\`\`\`

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

## 👨‍💻 Autor

**Lautaro Jofre**
- Desarrollador Full Stack Jr. | Estudiante de Ingeniería en Sistemas
- 💼 LinkedIn: [linkedin.com/in/lautaro-jofre](https://www.linkedin.com/in/lautaro-jofre)
- 🌐 Portfolio: [portfolio-web-jofre-lautaro.vercel.app](https://portfolio-web-jofre-lautaro.vercel.app/)