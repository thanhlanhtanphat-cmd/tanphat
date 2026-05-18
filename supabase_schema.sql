-- Create Categories table
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Đang kinh doanh',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Suppliers table
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Products table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  image TEXT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  unit TEXT,
  price NUMERIC(15, 2) DEFAULT 0,
  cost_price NUMERIC(15, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Đang kinh doanh',
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Orders table
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'Chờ xử lý',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Order Items table
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Admin Accounts table
CREATE TABLE admin_accounts (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Quản trị viên',
  status TEXT DEFAULT 'active',
  last_login TIMESTAMPTZ,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic RLS (Enable reading for all, writing for authenticated only or specific logic)
-- Note: You should configure specific RLS policies in Supabase dashboard based on your auth needs.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- Allow all for everyone (Since we use a custom admin login system)
CREATE POLICY "Allow all access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON admin_accounts FOR ALL USING (true) WITH CHECK (true);
