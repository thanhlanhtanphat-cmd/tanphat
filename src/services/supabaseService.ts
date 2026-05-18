import { supabase } from '../lib/supabase';
import { Product, Supplier, Category, Order, AdminAccount } from '../types';

export const supabaseService = {
  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data.map(p => ({
      ...p,
      id: Number(p.id),
      costPrice: p.cost_price,
      qrCode: p.qr_code
    })) as Product[];
  },

  async addProduct(product: Omit<Product, 'id'>) {
    const productData = {
      image: product.image,
      code: product.code,
      name: product.name,
      category: product.category,
      brand: product.brand,
      unit: product.unit,
      price: product.price,
      cost_price: product.costPrice,
      stock: product.stock,
      status: product.status,
      qr_code: product.qrCode
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      id: Number(data.id),
      costPrice: data.cost_price,
      qrCode: data.qr_code
    } as Product;
  },

  async updateProduct(id: number, product: Partial<Product>) {
    const updateData: any = { ...product };
    if (product.costPrice !== undefined) {
      updateData.cost_price = product.costPrice;
      delete updateData.costPrice;
    }
    if (product.qrCode !== undefined) {
      updateData.qr_code = product.qrCode;
      delete updateData.qrCode;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      id: Number(data.id),
      costPrice: data.cost_price,
      qrCode: data.qr_code
    } as Product;
  },

  async deleteProduct(id: number) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Suppliers
  async getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data as Supplier[];
  },

  async addSupplier(supplier: Omit<Supplier, 'id'>) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async updateSupplier(id: number, supplier: Partial<Supplier>) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async deleteSupplier(id: number) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data as Category[];
  },

  async addCategory(category: Omit<Category, 'id'>) {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: number, category: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: number) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Orders
  async getOrders() {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('id', { ascending: false });
    
    if (ordersError) throw ordersError;
    
    return ordersData.map(order => ({
      ...order,
      id: Number(order.id),
      orderCode: order.order_code,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      items: order.order_items.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price
      }))
    })) as Order[];
  },

  async addOrder(order: Omit<Order, 'id'>) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_code: order.orderCode,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        total_amount: order.totalAmount,
        status: order.status
      }])
      .select()
      .single();
    
    if (orderError) throw orderError;

    const orderItems = order.items.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;

    return { 
      ...orderData, 
      id: Number(orderData.id),
      orderCode: orderData.order_code,
      customerName: orderData.customer_name,
      customerPhone: orderData.customer_phone,
      totalAmount: orderData.total_amount,
      createdAt: orderData.created_at,
      items: order.items 
    } as Order;
  },

  async updateOrderStatus(id: number, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      id: Number(data.id),
      orderCode: data.order_code,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      totalAmount: data.total_amount,
      createdAt: data.created_at
    } as Order;
  },

  async updateOrder(id: number, order: Partial<Order>) {
    const updateData: any = {};
    if (order.orderCode) updateData.order_code = order.orderCode;
    if (order.customerName) updateData.customer_name = order.customerName;
    if (order.customerPhone) updateData.customer_phone = order.customerPhone;
    if (order.totalAmount !== undefined) updateData.total_amount = order.totalAmount;
    if (order.status) updateData.status = order.status;

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (orderError) throw orderError;

    if (order.items) {
      // Simplest way to update items is to delete existing and re-insert
      await supabase.from('order_items').delete().eq('order_id', id);
      
      const orderItems = order.items.map(item => ({
        order_id: id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
    }

    return { 
      ...orderData, 
      id: Number(orderData.id),
      orderCode: orderData.order_code,
      customerName: orderData.customer_name,
      customerPhone: orderData.customer_phone,
      totalAmount: orderData.total_amount,
      createdAt: orderData.created_at,
      items: order.items 
    } as Order;
  },

  async deleteOrder(id: number) {
    // Delete items first due to foreign key
    await supabase.from('order_items').delete().eq('order_id', id);
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Admin Accounts
  async getAccounts() {
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data.map(acc => ({
      ...acc,
      id: Number(acc.id),
      fullName: acc.full_name,
      lastLogin: acc.last_login
    })) as AdminAccount[];
  },

  async addAccount(account: Omit<AdminAccount, 'id'>) {
    const { data, error } = await supabase
      .from('admin_accounts')
      .insert([{
        username: account.username,
        full_name: account.fullName,
        email: account.email,
        role: account.role,
        status: account.status,
        avatar: account.avatar
      }])
      .select()
      .single();
    
    if (error) throw error;
    return {
      ...data,
      id: Number(data.id),
      fullName: data.full_name,
      lastLogin: data.last_login
    } as AdminAccount;
  },

  async updateAccount(id: number, account: Partial<AdminAccount>) {
    const updateData: any = { ...account };
    if (account.fullName) {
      updateData.full_name = account.fullName;
      delete updateData.fullName;
    }
    
    const { data, error } = await supabase
      .from('admin_accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      id: Number(data.id),
      fullName: data.full_name,
      lastLogin: data.last_login
    } as AdminAccount;
  },

  async deleteAccount(id: number) {
    const { error } = await supabase
      .from('admin_accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
