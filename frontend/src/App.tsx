import { useState, useEffect } from 'react';
import PriceChart from './PriceChart';
import { Toaster, toast } from 'sonner';

interface Product {
  product_id: number;
  product_name: string;
  category: string;
  brand: string;
  shop_name: string;
  last_price: string;
  product_url: string;
}

interface Shop {
  id: number;
  name: string;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  
  // === NUEVOS ESTADOS DE SEGURIDAD ===
  // Leemos si ya hay un token guardado en el navegador
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScrapingAll, setIsScrapingAll] = useState<boolean>(false);
  // Estados para la edición en línea
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newUrl, setNewUrl] = useState<string>('');
  // Estado para guardar los datos del formulario
  const [formData, setFormData] = useState({
    name: '', category: '', brand: '', shop_id: '', product_url: ''
  });
  // Estados del Cazador de Ofertas (Buscador en vivo)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [liveResult, setLiveResult] = useState<any>(null);
  // Estado para el filtro de la grilla
  const [searchTerm, setSearchTerm] = useState('');

  // Función para traer los productos
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error conectando a la API:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para traer las tiendas al cargar la app
  const fetchShops = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/shops`);
      const data = await response.json();
      setShops(data);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    }
  };

  // El useEffect inicial
  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, []);

  // Función para manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Bloqueamos el botón y mostramos aviso
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormData({ name: '', category: '', brand: '', shop_id: '', product_url: '' });
        setShowForm(false);
        fetchProducts(); // Recargamos para ver la tarjeta terminada
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    } finally {
      setIsSubmitting(false); // Liberamos el botón
    }
  };
  // Función para disparar la actualización masiva
  const handleScrapeAll = async () => {
    setIsScrapingAll(true);
    
    // 1. Avisamos que arrancó el proceso (desaparece rápido)
    toast.info('Buscando nuevos precios... Esto puede demorar unos segundos.', { duration: 4000 });

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/scrape-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`}
      });
      
      if (res.ok) {
        await fetchProducts(); // Recargamos las tarjetas
        // 2. ¡El toque de victoria!
        toast.success('¡Todos los precios fueron actualizados con éxito! 🚀');
      } else {
        // Por si el backend tira un error 500
        toast.error('Hubo un problema en el servidor al intentar actualizar.');
      }
    } catch (error) {
      console.error('Error al actualizar todos los precios:', error);
      // 3. Por si se corta internet o el backend está apagado
      toast.error('Error de conexión. Revisá si el servidor está encendido.');
    } finally {
      setIsScrapingAll(false);
    }
  };
  // Función para eliminar un producto
  const handleDelete = async (id: number, name: string) => {
    // Usamos el confirm nativo del navegador para evitar borrados accidentales
    if (!window.confirm(`¿Estás seguro de que querés dejar de rastrear el "${name}"?`)) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`}
      });
      
      if (res.ok) {
        // Volvemos a pedir los productos actualizados a la API
        fetchProducts(); 
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };
  // Función para guardar el nuevo enlace
  const handleUpdateUrl = async (productId: number) => {
    if (!newUrl) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_url: newUrl })
      });
      
      if (res.ok) {
        setEditingId(null); // Cerramos el modo edición
        setNewUrl('');
        fetchProducts(); // Recargamos para ver los cambios
      }
    } catch (error) {
      console.error('Error al actualizar el enlace:', error);
    }
  };
  // Función para iniciar sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token); // Lo guardamos en el navegador
        setToken(data.token); // Actualizamos el estado de React
        setShowLogin(false);
        setLoginData({ username: '', password: '' });
      } else {
        toast.error(data.error || 'Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };
  // 1. Ejecuta la búsqueda en ML
  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setLiveResult(null); // Limpiamos la búsqueda anterior
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/search/ml?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.found) {
        setLiveResult(data.product);
      } else {
        toast.error('No se encontraron resultados relevantes.');
      }
    } catch (error) {
      console.error('Error en la búsqueda en vivo:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Transforma el resultado temporal en un producto rastreado
  const handleTrackLiveResult = async () => {
    if (!liveResult) return;
    
    // Buscamos cuál es el ID de la tienda Mercado Libre en tu lista
    const mlShop = shops.find(s => s.name === 'Mercado Libre');
    if (!mlShop) {
      toast.error('Error: No se encontró la tienda Mercado Libre en la base de datos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Armamos el paquete simulando el formulario manual
      const payload = {
        name: liveResult.title,
        category: 'Búsqueda en Vivo', // Podés editarlo directo en la BD después
        brand: 'A clasificar',
        shop_id: mlShop.id,
        product_url: liveResult.link
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('¡Oferta guardada en tu radar!');
        setLiveResult(null); // Cerramos la tarjetita temporal
        setSearchQuery(''); // Limpiamos la barra
        fetchProducts(); // Recargamos tu grilla principal
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  // Filtramos los productos en vivo según lo que el usuario escriba
  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Toaster richColors position="top-right" />
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado y Botón de Nuevo Producto */}
        {/* Encabezado y Botones de Acción */}
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Monitor de Hardware 🚀</h1>
            <p className="text-gray-500 mt-2">Rastreando precios en tiempo real para tu próximo setup.</p>
          </div>
          
          {/* Contenedor de los dos botones */}
          {/* Contenedor de botones (Renderizado Condicional) */}
          <div className="flex gap-3 items-center">
            {token ? (
              <>
                <button onClick={handleScrapeAll} disabled={isScrapingAll} className={`font-bold py-2 px-4 rounded-lg transition-colors text-white ${isScrapingAll ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {isScrapingAll ? '⏳...' : '🔄 Forzar Actualización'}
                </button>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                  {showForm ? 'Cancelar' : '+ Rastrear'}
                </button>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
                  Salir
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg">
                Iniciar Sesión (Admin)
              </button>
            )}
          </div>
        </header>
        {/* =========================================
            CAZADOR DE OFERTAS (Solo visible para el admin)
            ========================================= */}
        {token && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <h2 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <span>⚡</span> Búsqueda Rápida en Mercado Libre
            </h2>
            
            <form onSubmit={handleLiveSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ej: Teclado Mecánico Aula F75..." 
                className="flex-1 border border-indigo-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <button 
                type="submit" 
                disabled={isSearching}
                className={`font-bold py-3 px-6 rounded-lg transition-colors text-white ${
                  isSearching ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSearching ? 'Buscando...' : 'Cazar Oferta'}
              </button>
            </form>

            {/* TARJETA DE RESULTADO TEMPORAL */}
            {liveResult && (
              <div className="mt-4 bg-white p-4 rounded-lg border-2 border-dashed border-indigo-300 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-4 flex-1">
                  {liveResult.thumbnail && (
                    <img src={liveResult.thumbnail} alt="Miniatura" className="w-16 h-16 object-contain rounded" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Mejor coincidencia</p>
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2" title={liveResult.title}>
                      {liveResult.title}
                    </h3>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      ${Number(liveResult.price).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setLiveResult(null)}
                    className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleTrackLiveResult}
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Guardando...' : '👀 Seguir Precio'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ========================================= */}
        {/* Modal de Iniciar Sesión (Se muestra si showLogin es true) */}
        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96 relative">
              {/* Botón de cerrar */}
              <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-bold mb-2 text-gray-800 text-center">Modo Administrador</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Ingresá para gestionar el radar.</p>
              
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <input 
                  required 
                  type="text" 
                  placeholder="Usuario" 
                  className="border border-gray-300 p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={loginData.username} 
                  onChange={e => setLoginData({...loginData, username: e.target.value})} 
                />
                <input 
                  required 
                  type="password" 
                  placeholder="Contraseña" 
                  className="border border-gray-300 p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={loginData.password} 
                  onChange={e => setLoginData({...loginData, password: e.target.value})} 
                />
                <button 
                  type="submit" 
                  className="mt-2 w-full bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Ingresar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Formulario (Se muestra solo si showForm es true) */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Agregar enlace al radar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="text" placeholder="Nombre del producto (Ej: Monitor LG 24)" className="border p-2 rounded w-full" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <div className="flex gap-4">
                <input required type="text" placeholder="Categoría (Ej: Monitor)" className="border p-2 rounded w-1/2" 
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                <input required type="text" placeholder="Marca (Ej: LG)" className="border p-2 rounded w-1/2" 
                  value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              </div>

              <select required className="border p-2 rounded w-full bg-white" 
                value={formData.shop_id} onChange={e => setFormData({...formData, shop_id: e.target.value})}>
                <option value="">Seleccionar Tienda...</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>

              <input required type="url" placeholder="URL del producto (https://...)" className="border p-2 rounded w-full" 
                value={formData.product_url} onChange={e => setFormData({...formData, product_url: e.target.value})} />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`mt-4 w-full font-bold py-2 px-4 rounded transition-colors text-white ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? '🤖 Scrapeando precio en tiempo real...' : 'Guardar y Scrapear'}
            </button>
          </form>
        )}
        
{/* =========================================
            BARRA DE BÚSQUEDA / FILTRO EN VIVO
            ========================================= */}
        <div className="mb-6 relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar producto en mi radar (ej: Aula F75, Monitor...)"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all text-gray-700 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* =========================================
            GRILLA DE PRODUCTOS
            ========================================= */}
        {loading ? (
          <div className="text-center text-gray-500 font-semibold mt-20">Cargando componentes...</div>
        ) : filteredProducts.length === 0 ? (
          // Mensaje por si la búsqueda no da resultados
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-2">No encontramos nada con "{searchTerm}" 🕵️‍♂️</p>
            <p className="text-gray-400 text-sm">Probá con otras palabras o agregalo a tu radar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 🔥 ACÁ CAMBIAMOS 'products' POR 'filteredProducts' */}
            {filteredProducts.map((product) => (
              
              <div key={product.product_id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 relative">
                
                {/* BOTONES FLOTANTES DE ADMIN */}
                {token && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingId(product.product_id);
                        setNewUrl(product.product_url);
                      }}
                      className="text-gray-400 hover:text-blue-500 transition-colors bg-white/80 rounded-full p-1"
                      title="Editar enlace"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(product.product_id, product.product_name)}
                      className="text-gray-400 hover:text-red-500 transition-colors bg-white/80 rounded-full p-1"
                      title="Eliminar producto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4 pr-6">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase">
                      {product.category}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{product.brand}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2" title={product.product_name}>
                    {product.product_name}
                  </h2>
                  
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Mejor precio en</p>
                      <p className="font-semibold text-gray-700">{product.shop_name}</p>
                    </div>
                    <div className="text-right">
                      {product.last_price ? (
                        <p className="text-2xl font-black text-emerald-600">
                          ${Number(product.last_price).toLocaleString('es-AR')}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-orange-500">Esperando Scraper...</p>
                      )}
                    </div>
                  </div>

                  {product.last_price && <PriceChart productId={product.product_id} />}

                  {/* ZONA INFERIOR: MODO EDICIÓN vs MODO LECTURA */}
                  {editingId === product.product_id ? (
                    <div className="mt-6 flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <label className="text-xs font-bold text-gray-600">Nuevo enlace del producto:</label>
                      <input 
                        type="url" 
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleUpdateUrl(product.product_id)} className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded text-sm transition-colors">
                          Guardar
                        </button>
                        <button onClick={() => setEditingId(null)} className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white font-bold py-1.5 rounded text-sm transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="mt-6 block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors">
                      Ver en la tienda
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;