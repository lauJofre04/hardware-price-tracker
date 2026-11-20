export type Product = {
  product_id: number;
  product_name: string;
  category: string | null;
  brand: string | null;
  shop_name: string;
  last_price: string | null;
  product_url: string;
  is_selected: boolean;
};

export type Shop = {
  id: number;
  name: string;
};

// Resultado temporal del "Cazador de Ofertas" (todavía no se está rastreando)
export type LiveResult = {
  title: string;
  link: string;
  price: number;
  thumbnail: string;
};

export type NewProduct = {
  name: string;
  category: string;
  brand: string;
  shop_id: string | number;
  product_url: string;
};
