/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import { 
  Search, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  LogIn,
  Package,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  QrCode,
  Trash2,
  Edit,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Warehouse,
  Truck,
  BarChart3,
  Settings,
  Database,
  Bell,
  UserCircle,
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  Printer,
  ChevronDown,
  Tags,
  Plus,
  List,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ShieldCheck,
  X,
  Zap,
  Copy,
  Hash,
  Layout,
  Scaling,
  DollarSign,
  Target,
  UserPlus,
  UserCog,
  LogOut,
  Image,
  Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  File,
  Eye,
  ExternalLink,
  Loader2,
  HardDrive,
  Folder,
  RefreshCcw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { CATEGORIES, BRANDS, INITIAL_PRODUCTS, INITIAL_SUPPLIERS, INITIAL_ORDERS, INITIAL_ACCOUNTS } from './constants.ts';
import { ProductStatus, FilterState, Product, Supplier, Category, Order, OrderStatus, OrderItem, AdminAccount } from './types.ts';
import { initAuth, googleSignIn, logout, getAccessToken, clearAccessToken } from './lib/firebase.ts';
import { listDriveFiles, uploadToDrive, listDriveFolders, makeFilePublic } from './services/googleDrive.ts';
import { supabaseService } from './services/supabaseService.ts';
import { User } from 'firebase/auth';
import QRCode from 'qrcode';

export default function App() {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'Tất cả danh mục',
    brand: 'Tất cả thương hiệu',
    minPrice: '',
    maxPrice: '',
    priceRange: 'Tất cả các mức giá',
    orderQuery: '',
    orderPhone: '',
    orderDate: '',
    status: 'Tất cả trạng thái',
    stockStatus: 'Tất cả tồn kho',
    orderStatus: 'Tất cả trạng thái',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // States for data management
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<string>(() => localStorage.getItem('selectedDriveFolder') || '');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [zoomQrCode, setZoomQrCode] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>('Xem ảnh');

  useEffect(() => {
    localStorage.setItem('selectedDriveFolder', selectedDriveFolder);
  }, [selectedDriveFolder]);

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const [dbProducts, dbSuppliers, dbCategories, dbOrders, dbAccounts] = await Promise.all([
          supabaseService.getProducts(),
          supabaseService.getSuppliers(),
          supabaseService.getCategories(),
          supabaseService.getOrders(),
          supabaseService.getAccounts()
        ]);

        setProducts(dbProducts);
        setSuppliers(dbSuppliers);
        setCategories(dbCategories);
        setOrders(dbOrders);
        setAccounts(dbAccounts);

        // Handle URL parameters after data is loaded
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam) {
          const matchedCategory = dbCategories.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
          if (matchedCategory) {
            setFilters(prev => ({ ...prev, category: matchedCategory.name }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch data from Supabase:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  // Filtered products logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchSearch = product.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                          product.code.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchCategory = filters.category === 'Tất cả danh mục' || product.category === filters.category;
      const matchBrand = filters.brand === 'Tất cả thương hiệu' || product.brand === filters.brand;
      
      const price = product.price;
      let matchPrice = true;
      if (filters.priceRange === 'Dưới 1.000.000đ') {
        matchPrice = price < 1000000;
      } else if (filters.priceRange === '1.000.000đ - 2.000.000đ') {
        matchPrice = price >= 1000000 && price <= 2000000;
      } else if (filters.priceRange === '2.000.000đ - 5.000.000đ') {
        matchPrice = price >= 2000000 && price <= 5000000;
      } else if (filters.priceRange === '5.000.000đ - 10.000.000đ') {
        matchPrice = price >= 5000000 && price <= 10000000;
      } else if (filters.priceRange === 'Trên 10.000.000đ') {
        matchPrice = price > 10000000;
      }
      
      const matchStatus = filters.status === 'Tất cả trạng thái' || product.status === filters.status;
      
      let matchStock = true;
      if (filters.stockStatus === 'Hết hàng') matchStock = product.stock === 0;
      else if (filters.stockStatus === 'Sắp hết hàng') matchStock = product.stock > 0 && product.stock < 10;
      else if (filters.stockStatus === 'Còn hàng') matchStock = product.stock >= 10;

      return matchSearch && matchCategory && matchBrand && matchPrice && matchStatus && matchStock;
    });
  }, [filters, products]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchQuery = !filters.orderQuery || order.orderCode.toLowerCase().includes(filters.orderQuery.toLowerCase());
      const matchPhone = !filters.orderPhone || order.customerPhone.includes(filters.orderPhone);
      const matchDate = !filters.orderDate || order.createdAt.startsWith(filters.orderDate);
      const matchStatus = filters.orderStatus === 'Tất cả trạng thái' || order.status === filters.orderStatus;
      return matchQuery && matchPhone && matchDate && matchStatus;
    });
  }, [filters, orders]);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      category: 'Tất cả danh mục',
      brand: 'Tất cả thương hiệu',
      minPrice: '',
      maxPrice: '',
      priceRange: 'Tất cả các mức giá',
      orderQuery: '',
      orderPhone: '',
      orderDate: '',
      status: 'Tất cả trạng thái',
      stockStatus: 'Tất cả tồn kho',
      orderStatus: 'Tất cả trạng thái',
    });
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace('₫', '');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === '1' && loginData.password === '1') {
      setIsLoggedIn(true);
      setCurrentUser(accounts.length > 0 ? accounts[0] : null);
      setShowLoginModal(false);
      setLoginData({ username: '', password: '' });
    } else {
      const user = accounts.find(a => a.username === loginData.username);
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
        setShowLoginModal(false);
        setLoginData({ username: '', password: '' });
      } else {
        alert('Tài khoản hoặc mật khẩu không chính xác!');
      }
    }
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{message: string, onConfirm: () => void}>({
    message: '',
    onConfirm: () => {}
  });

  const handleDeleteProduct = (id: number) => {
    setConfirmConfig({
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này?',
      onConfirm: () => {
        setProducts(prev => prev.filter(p => p.id !== id));
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  if (isLoggedIn) {
    return (
      <AdminDashboard 
        onLogout={() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }} 
        products={products} 
        setProducts={setProducts} 
        suppliers={suppliers}
        setSuppliers={setSuppliers}
        categories={categories}
        setCategories={setCategories}
        orders={orders}
        setOrders={setOrders}
        filters={filters}
        setFilters={setFilters}
        handleResetFilters={handleResetFilters}
        accounts={accounts}
        setAccounts={setAccounts}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        selectedDriveFolder={selectedDriveFolder}
        setSelectedDriveFolder={setSelectedDriveFolder}
        zoomQrCode={zoomQrCode}
        setZoomQrCode={setZoomQrCode}
        zoomTitle={zoomTitle}
        setZoomTitle={setZoomTitle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-[#333]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://tanphatcompany.com/wp-content/uploads/2023/12/logo_tp.svg" 
              alt="Tân Phát Logo" 
              className="h-16 md:h-20 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="hidden lg:block text-center flex-1 mx-8">
            <h2 className="text-xl font-bold text-[#9d171a] uppercase">KHÔNG NGỪNG PHÁT TRIỂN - KHÔNG NGỪNG VƯƠN XA</h2>
            <div className="w-48 h-1 bg-gradient-to-r from-transparent via-[#9d171a] to-transparent mx-auto mt-2"></div>
            <div className="w-2 h-2 rounded-full bg-[#9d171a] mx-auto -mt-1.5"></div>
          </div>

          <div className="flex items-center gap-6">
            
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-[#9d171a]">Quản trị viên</p>
                  <p className="text-[10px] text-gray-500">Đang hoạt động</p>
                </div>
                <button 
                  onClick={() => setIsLoggedIn(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium shadow-sm border border-gray-200"
                >
                  <LogIn size={18} className="rotate-180" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#9d171a] text-white rounded-md hover:bg-[#851215] transition-colors font-medium shadow-md"
              >
                <LogIn size={18} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="mb-8 flex items-start gap-4">
          <div className="mt-1 bg-red-100 p-2 rounded-lg text-[#9d171a]">
            <Package size={24} />
          </div>
          <div>
            <h3 className="text-lg md:text-xl lg:text-[25px] font-bold text-[#333] uppercase leading-tight">Danh sách sản phẩm công khai</h3>
            <p className="text-sm text-gray-500 mt-1">Danh sách sản phẩm được công khai bởi Tân Phát Tote & Building</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Nhập tên sản phẩm cần tìm"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9d171a] text-sm"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Danh mục</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9d171a] text-sm bg-white"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="Tất cả danh mục">Tất cả danh mục</option>
                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Thương hiệu</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9d171a] text-sm bg-white"
                value={filters.brand}
                onChange={(e) => setFilters({...filters, brand: e.target.value})}
              >
                <option value="Tất cả thương hiệu">Tất cả thương hiệu</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Khoảng giá</label>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9d171a] text-sm bg-white"
                value={filters.priceRange}
                onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
              >
                <option value="Tất cả các mức giá">Tất cả các mức giá</option>
                <option value="Dưới 1.000.000đ">Dưới 1.000.000đ</option>
                <option value="1.000.000đ - 2.000.000đ">1.000.000đ - 2.000.000đ</option>
                <option value="2.000.000đ - 5.000.000đ">2.000.000đ - 5.000.000đ</option>
                <option value="5.000.000đ - 10.000.000đ">5.000.000đ - 10.000.000đ</option>
                <option value="Trên 10.000.000đ">Trên 10.000.000đ</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button className="flex-1 bg-[#9d171a] text-white py-2 rounded-md hover:bg-[#851215] transition-colors flex items-center justify-center gap-2 font-medium shadow-sm h-[38px]">
                <Search size={16} />
                <span>Tìm kiếm</span>
              </button>
              <button 
                onClick={handleResetFilters}
                className="px-3 bg-white border border-gray-200 text-gray-600 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium h-[38px]"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Xoá bộ lọc</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#9d171a] text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">STT</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Hình ảnh</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Mã sản phẩm</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Tên sản phẩm</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Danh mục</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Thương hiệu</th>
                  <th className="px-4 py-3 text-left font-semibold border-r border-[#ffffff20]">Đơn vị</th>
                  <th className="px-4 py-3 text-right font-semibold border-r border-[#ffffff20]">Giá bán (đ)</th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-[#ffffff20]">Tồn kho</th>
                  <th className="px-4 py-3 text-center font-semibold border-r border-[#ffffff20]">Trạng thái</th>
                  {isLoggedIn && <th className="px-4 py-3 text-center font-semibold border-r border-[#ffffff20]">Hành động</th>}
                  <th className="px-4 py-3 text-center font-semibold text-[10px]">Hình QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product, index) => (
                      <motion.tr 
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-gray-50 group transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-500 border-r border-gray-100">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-12 h-12 object-cover rounded shadow-sm group-hover:scale-110 transition-transform cursor-zoom-in"
                              onClick={() => {
                                setZoomQrCode(product.image || null);
                                setZoomTitle('Hình ảnh sản phẩm');
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300">
                              <Package size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-600 border-r border-gray-100">
                          {product.code}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 border-r border-gray-100 max-w-[200px] truncate">
                          {product.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-100">
                          {product.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-100">
                          {product.brand}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-100">
                          {product.unit}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#9d171a] text-right border-r border-gray-100">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium border-r border-gray-100">
                          {product.stock}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-100">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            product.status === ProductStatus.SHOW 
                            ? 'bg-green-50 text-green-600 border border-green-200' 
                            : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        {isLoggedIn && (
                          <td className="px-4 py-3 text-center border-r border-gray-100">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Sửa">
                                <Edit size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-all hover:scale-110 active:scale-95" 
                                title="Xoá"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          {product.qrCode ? (
                            <img 
                              src={product.qrCode} 
                              alt="QR" 
                              className="w-10 h-10 mx-auto cursor-zoom-in hover:scale-110 transition-transform" 
                              onClick={() => {
                                setZoomQrCode(product.qrCode || null);
                                setZoomTitle('Mã QR sản phẩm');
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 mx-auto bg-gray-50 flex items-center justify-center text-gray-200">
                              <QrCode size={14} />
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isLoggedIn ? 12 : 11} className="px-4 py-12 text-center text-gray-400 italic">
                        Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>Hiển thị</span>
              <select 
                className="px-2 py-1 border border-gray-200 rounded bg-white text-sm focus:outline-none"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>bản ghi trên trang</span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 rounded text-sm font-medium transition-all ${
                      currentPage === page 
                      ? 'bg-[#9d171a] text-white shadow-sm' 
                      : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 border border-gray-200 rounded hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 pb-8 mt-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img 
                src="https://tanphatcompany.com/wp-content/uploads/2023/12/logo_tp.svg" 
                alt="Tân Phát Logo" 
                className="h-12 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#9d171a] shrink-0 mt-0.5" />
                <p>Đường số 1 và số 13, Dãy Shophouse Khu B1 - Đại Đô Thị An Phú Thịnh - Phường Quy Nhơn Đông - Tỉnh Gia Lai.</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-[#9d171a] shrink-0" />
                <p>081 491 1331</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-[#9d171a] shrink-0" />
                <p>tanphatxd@gmail.com</p>
              </div>
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-[#9d171a] shrink-0" />
                <p>tanphatcompany.com</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="font-bold text-[#333] uppercase border-l-4 border-[#9d171a] pl-3">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Trang chủ</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Sản phẩm</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Về chúng tôi</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Liên hệ</li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-6">
            <h4 className="font-bold text-[#333] uppercase border-l-4 border-[#9d171a] pl-3">Hỗ trợ khách hàng</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Chính sách bảo hành</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Chính sách đổi trả</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Hướng dẫn mua hàng</li>
              <li className="hover:text-[#9d171a] cursor-pointer transition-colors">Câu hỏi thường gặp</li>
            </ul>
          </div>

          {/* QR Scan */}
          <div className="space-y-6">
            <h4 className="font-bold text-[#333] uppercase border-l-4 border-[#9d171a] pl-3">Quét QR để truy cập</h4>
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-500 max-w-[120px]">
                Quét mã để truy cập nhanh danh sách sản phẩm
              </div>
              <div className="w-20 h-20 bg-white p-1 border border-gray-100">
                <QrCode size={72} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 text-center text-xs text-gray-400 font-medium tracking-wide">
          © 2026 Tân Phát Tote & Building. All rights reserved.
        </div>
      </footer>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        data={loginData}
        setData={setLoginData}
      />

      <ConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmConfig.onConfirm}
        title="Xác nhận xóa"
        message={confirmConfig.message}
      />

      <QRZoomModal 
        isOpen={!!zoomQrCode}
        onClose={() => setZoomQrCode(null)}
        qrCode={zoomQrCode || ''}
        title={zoomTitle}
      />
    </div>
  );
}

function AdminDashboard({ 
  onLogout, 
  products, 
  setProducts, 
  suppliers, 
  setSuppliers, 
  categories, 
  setCategories, 
  orders, 
  setOrders, 
  filters, 
  setFilters, 
  handleResetFilters, 
  accounts, 
  setAccounts, 
  currentUser, 
  setCurrentUser,
  selectedDriveFolder,
  setSelectedDriveFolder,
  zoomQrCode,
  setZoomQrCode,
  zoomTitle,
  setZoomTitle
}: any) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('pdf');
  const [showOrderExportDropdown, setShowOrderExportDropdown] = useState(false);
  const [showCategoryExportDropdown, setShowCategoryExportDropdown] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Pagination for admin
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      const matchSearch = product.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                          product.code.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchCategory = filters.category === 'Tất cả danh mục' || product.category === filters.category;
      
      // For Brand, if it's admin view, we might want to be more specific or allow searching among suppliers
      const matchBrand = filters.brand === 'Tất cả thương hiệu' || product.brand === filters.brand;
      
      const price = product.price;
      let matchPrice = true;
      if (filters.priceRange === 'Dưới 1.000.000đ') {
        matchPrice = price < 1000000;
      } else if (filters.priceRange === '1.000.000đ - 2.000.000đ') {
        matchPrice = price >= 1000000 && price <= 2000000;
      } else if (filters.priceRange === '2.000.000đ - 5.000.000đ') {
        matchPrice = price >= 2000000 && price <= 5000000;
      } else if (filters.priceRange === '5.000.000đ - 10.000.000đ') {
        matchPrice = price >= 5000000 && price <= 10000000;
      } else if (filters.priceRange === 'Trên 10.000.000đ') {
        matchPrice = price > 10000000;
      }
      
      const matchStatus = filters.status === 'Tất cả trạng thái' || product.status === filters.status;
      
      let matchStock = true;
      if (filters.stockStatus === 'Hết hàng') matchStock = product.stock === 0;
      else if (filters.stockStatus === 'Sắp hết hàng') matchStock = product.stock > 0 && product.stock < 10;
      else if (filters.stockStatus === 'Còn hàng') matchStock = product.stock >= 10;

      return matchSearch && matchCategory && matchBrand && matchPrice && matchStatus && matchStock;
    });
  }, [filters, products]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order) => {
      const matchQuery = !filters.orderQuery || order.orderCode.toLowerCase().includes(filters.orderQuery.toLowerCase());
      const matchPhone = !filters.orderPhone || order.customerPhone.includes(filters.orderPhone);
      const matchDate = !filters.orderDate || order.createdAt.startsWith(filters.orderDate);
      return matchQuery && matchPhone && matchDate;
    });
  }, [filters, orders]);

  const sidebarItems = [
    { name: 'Tổng quan', icon: LayoutDashboard },
    { name: 'Đơn hàng', icon: ShoppingCart },
    { name: 'Sản phẩm', icon: Package },
    { name: 'Danh mục', icon: Tags },
    { name: 'Kho hàng', icon: Warehouse },
    { name: 'Nhà cung cấp', icon: Truck },
    { name: 'Google Drive', icon: HardDrive },
    { name: 'Báo cáo', icon: BarChart3 },
    { name: 'Cài đặt', icon: Settings },
    { name: 'Hệ thống', icon: Database },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value).replace('₫', '');
  };

  const handleOpenAddModal = async () => {
    const token = await getAccessToken();
    if (!token) {
      setConfirmConfig({
        title: 'YÊU CẦU KẾT NỐI GOOGLE DRIVE',
        message: 'Hệ thống cần kết nối với Google Drive để tự động đồng bộ hóa và lưu trữ hình ảnh sản phẩm cũng như mã QR. Bạn có muốn chuyển sang tab Google Drive đầu tiên để kết nối không?',
        onConfirm: () => {
          setShowConfirmModal(false);
          setActiveTab('Google Drive');
        }
      });
      setShowConfirmModal(true);
      return;
    }
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, message: string, onConfirm: () => void}>({
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleDeleteProduct = (id: number) => {
    setConfirmConfig({
      title: 'Xác nhận xóa sản phẩm',
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi hệ thống không? Dữ liệu sẽ bị mất và không thể khôi phục lại.',
      onConfirm: async () => {
        try {
          await supabaseService.deleteProduct(id);
          setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== id));
        } catch (err) {
          console.error('Delete product failed:', err);
          alert('Xóa sản phẩm thất bại.');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteSupplier = (id: number) => {
    setConfirmConfig({
      title: 'Xác nhận xóa nhà cung cấp',
      message: 'Bạn có chắc chắn muốn xóa nhà cung cấp này không? Hành động này sẽ loại bỏ hoàn toàn thông tin nhà cung cấp khỏi hệ thống và không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await supabaseService.deleteSupplier(id);
          setSuppliers((prev: Supplier[]) => prev.filter((s: Supplier) => s.id !== id));
        } catch (err) {
          console.error('Delete supplier failed:', err);
          alert('Xóa nhà cung cấp thất bại.');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };
  
  const handleDeleteCategory = (id: number) => {
    setConfirmConfig({
      title: 'Xác nhận xóa danh mục',
      message: 'Bạn có chắc chắn muốn xóa danh mục này không? Các sản phẩm thuộc danh mục này có thể bị ảnh hưởng.',
      onConfirm: async () => {
        try {
          await supabaseService.deleteCategory(id);
          setCategories((prev: Category[]) => prev.filter((c: Category) => c.id !== id));
        } catch (err) {
          console.error('Delete category failed:', err);
          alert('Xóa danh mục thất bại.');
        }
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };
 
  const handleDeleteOrder = (id: number) => {
    setConfirmConfig({
      title: 'Xác nhận xóa đơn hàng',
      message: 'Bạn có chắc chắn muốn xóa đơn hàng này không? Dữ liệu đơn hàng sẽ bị xóa hoàn toàn khỏi hệ thống.',
      onConfirm: async () => {
        try {
          await supabaseService.deleteOrder(id);
          setOrders((prev: Order[]) => prev.filter((o: Order) => o.id !== id));
          setShowConfirmModal(false);
        } catch (err) {
          console.error('Delete order failed:', err);
          alert('Xóa đơn hàng thất bại.');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      if (editingProduct) {
        const updated = await supabaseService.updateProduct(editingProduct.id, productData);
        setProducts((prev: Product[]) => prev.map((p: Product) => p.id === editingProduct.id ? updated : p));
      } else {
        const added = await supabaseService.addProduct(productData);
        setProducts((prev: Product[]) => [...prev, added]);
      }
      setShowProductModal(false);
    } catch (err) {
      console.error('Save product failed:', err);
      alert('Lưu sản phẩm thất bại.');
    }
  };

  const handleOpenAddSupplierModal = () => {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (supplierData: any) => {
    try {
      if (editingSupplier) {
        const updated = await supabaseService.updateSupplier(editingSupplier.id, supplierData);
        setSuppliers((prev: Supplier[]) => prev.map((s: Supplier) => s.id === editingSupplier.id ? updated : s));
      } else {
        const added = await supabaseService.addSupplier(supplierData);
        setSuppliers((prev: Supplier[]) => [...prev, added]);
      }
      setShowSupplierModal(false);
    } catch (err) {
      console.error('Save supplier failed:', err);
      alert('Lưu nhà cung cấp thất bại.');
    }
  };

  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (categoryData: any) => {
    try {
      if (editingCategory) {
        const updated = await supabaseService.updateCategory(editingCategory.id, categoryData);
        setCategories((prev: Category[]) => prev.map((c: Category) => c.id === editingCategory.id ? updated : c));
      } else {
        const added = await supabaseService.addCategory(categoryData);
        setCategories((prev: Category[]) => [...prev, added]);
      }
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Save category failed:', err);
      alert('Lưu danh mục thất bại.');
    }
  };

  const handleOpenAddOrderModal = () => {
    setEditingOrder(null);
    setShowOrderModal(true);
  };

  const handleOpenEditOrderModal = (order: Order) => {
    setEditingOrder(order);
    setShowOrderModal(true);
  };

  const handleSaveOrder = async (orderData: any) => {
    // Deduct stock if status changes to COMPLETED
    const isNowCompleted = orderData.status === OrderStatus.COMPLETED;
    const wasCompleted = editingOrder?.status === OrderStatus.COMPLETED;

    try {
      if (isNowCompleted && !wasCompleted) {
        // Find products that need stock deduction
        const updates = orderData.items.map(async (item: OrderItem) => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await supabaseService.updateProduct(product.id, { stock: newStock });
            return { id: product.id, stock: newStock };
          }
          return null;
        });
        const results = await Promise.all(updates);
        setProducts((prevProducts: Product[]) => 
          prevProducts.map((p: Product) => {
            const res = results.find(r => r?.id === p.id);
            return res ? { ...p, stock: res.stock } : p;
          })
        );
      } else if (!isNowCompleted && wasCompleted) {
        // Restore stock if moving away from COMPLETED status
        const updates = orderData.items.map(async (item: OrderItem) => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = product.stock + item.quantity;
            await supabaseService.updateProduct(product.id, { stock: newStock });
            return { id: product.id, stock: newStock };
          }
          return null;
        });
        const results = await Promise.all(updates);
        setProducts((prevProducts: Product[]) => 
          prevProducts.map((p: Product) => {
            const res = results.find(r => r?.id === p.id);
            return res ? { ...p, stock: res.stock } : p;
          })
        );
      }

      if (editingOrder) {
        const updated = await supabaseService.updateOrder(editingOrder.id, orderData);
        setOrders((prev: Order[]) => prev.map((o: Order) => o.id === editingOrder.id ? { ...updated, id: o.id } : o));
      } else {
        const added = await supabaseService.addOrder(orderData);
        setOrders((prev: Order[]) => [added, ...prev]);
      }
      setShowOrderModal(false);
    } catch (err) {
      console.error('Save order failed:', err);
      alert('Lưu đơn hàng thất bại.');
    }
  };

  const handleExportOrdersExcel = () => {
    const data = filteredOrders.map((o: Order, index: number) => ({
      'STT': index + 1,
      'MÃ ĐƠN HÀNG': o.orderCode,
      'NGÀY TẠO': o.createdAt,
      'KHÁCH HÀNG': o.customerName,
      'SỐ ĐIỆN THOẠI': o.customerPhone,
      'SẢN PHẨM CHI TIẾT': o.items.map(item => `${item.productName} (SL: ${item.quantity})`).join('\n'),
      'TỔNG TIỀN (VNĐ)': o.totalAmount,
      'TRẠNG THÁI': o.status === OrderStatus.COMPLETED ? 'Đã hoàn thành' : o.status === OrderStatus.PENDING ? 'Chờ xử lý' : 'Đã hủy'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for Excel
    worksheet['!cols'] = [
      { wch: 6 },   // STT
      { wch: 18 },  // Mã đơn
      { wch: 20 },  // Ngày tạo
      { wch: 30 },  // Khách hàng
      { wch: 15 },  // SĐT
      { wch: 60 },  // Sản phẩm
      { wch: 20 },  // Thành tiền
      { wch: 20 },  // Trạng thái
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo đơn hàng');
    
    const fileName = `TAN_PHAT_Bao_cao_don_hang_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowOrderExportDropdown(false);
  };

  const handleExportCategoriesExcel = () => {
    const data = categories.map((c: Category, index: number) => ({
      'STT': index + 1,
      'TÊN DANH MỤC': c.name,
      'SỐ SẢN PHẨM': products.filter((p: Product) => p.category === c.name).length,
      'MÃ QR': c.qrCode || 'Chưa có'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for Excel
    worksheet['!cols'] = [
      { wch: 6 },   // STT
      { wch: 40 },  // Tên danh mục
      { wch: 20 },  // Số sản phẩm
      { wch: 60 },  // Mã QR
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh mục sản phẩm');
    
    const fileName = `TAN_PHAT_Bao_cao_danh_muc_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowCategoryExportDropdown(false);
  };

  const handleExportCategoriesPDF = async () => {
    const element = document.createElement('div');
    element.style.width = '1050px';
    element.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    element.style.color = '#1a202c';
    element.style.backgroundColor = 'white';

    const dateStr = new Date().toLocaleDateString('vi-VN');
    
    element.innerHTML = `
      <div style="padding: 35px; background-color: white;">
        <div style="background-color: #2d3748; padding: 30px; color: white; margin-bottom: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">TÂN PHÁT TOTE & BUILDING</h1>
            <p style="margin: 10px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📍 Dãy Shophouse Khu B1 - Đại Đô Thị An Phú Thịnh - Quy Nhơn - Bình Định</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📞 081 491 1331 | 🌐 tanphatcompany.com</p>
          </div>
          <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 30px;">
            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px; text-transform: uppercase; font-weight: 600;">Danh mục: Kế toán</div>
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">BÁO CÁO DANH MỤC</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px; font-weight: 500;">Ngày trích xuất: ${dateStr}</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #9d171a;">
          <h2 style="margin: 0; font-size: 26px; color: #1a202c; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Bảng tổng kết chi tiết danh mục sản phẩm</h2>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; font-style: italic; font-weight: 600;">Dữ liệu gồm: <b>${categories.length}</b> danh mục hệ thống</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background-color: #2d3748; color: white;">
              <th style="padding: 15px 10px; border: 1px solid #cbd5e0; text-align: center; width: 60px; text-transform: uppercase; font-weight: 900;">STT</th>
              <th style="padding: 15px 15px; border: 1px solid #cbd5e0; text-align: left; text-transform: uppercase; font-weight: 900;">Tên Danh Mục</th>
              <th style="padding: 15px 15px; border: 1px solid #cbd5e0; text-align: center; width: 140px; text-transform: uppercase; font-weight: 900;">Số Sản Phẩm</th>
              <th style="padding: 15px 15px; border: 1px solid #cbd5e0; text-align: center; width: 120px; text-transform: uppercase; font-weight: 900;">Mã QR</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map((c: Category, index: number) => {
              const productCount = products.filter((p: Product) => p.category === c.name).length;
              return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f7fafc'}; transition: background-color 0.2s;">
                  <td style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #4a5568;">${index + 1}</td>
                  <td style="padding: 12px 15px; border: 1px solid #e2e8f0; font-weight: 700; color: #2d3748;">${c.name}</td>
                  <td style="padding: 12px 15px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #9d171a;">${productCount}</td>
                  <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">
                    ${c.qrCode ? `<img src="${c.qrCode}" style="width: 80px; height: 80px; display: block; margin: 0 auto; border: 1px solid #edf2f7; border-radius: 4px;" crossorigin="anonymous" />` : '<span style="font-size: 10px; color: #a0aec0;">Chưa có</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-start; border-top: 1px solid #e2e8f0; padding-top: 30px;">
          <div style="text-align: center; width: 250px;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #4a5568; text-transform: uppercase;">Người lập biểu</p>
            <p style="margin: 5px 0 50px 0; font-size: 11px; color: #718096; font-style: italic;">(Ký và ghi rõ họ tên)</p>
          </div>
          <div style="text-align: center; width: 250px;">
            <p style="margin: 0; font-size: 13px; font-weight: 800; color: #1a202c; text-transform: uppercase;">Giám đốc xác nhận</p>
            <p style="margin: 5px 0 50px 0; font-size: 11px; color: #718096; font-style: italic;">(Ký tên và đóng dấu)</p>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #a0aec0; font-size: 10px; border-top: 1px dashed #e2e8f0; padding-top: 20px;">
          <p>© 2026 Tân Phát Tote & Building - Hệ thống quản lý danh mục sản phẩm nội bộ</p>
        </div>
      </div>
    `;

    const opt: any = {
      margin: 10,
      filename: `TAN_PHAT_Bao_cao_danh_muc_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      setShowCategoryExportDropdown(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
    }
  };

  const handleExportOrdersPDF = async () => {
    const element = document.createElement('div');
    element.style.width = '1050px';
    element.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    element.style.color = '#1a202c';
    element.style.backgroundColor = 'white';

    const dateStr = new Date().toLocaleDateString('vi-VN');
    
    element.innerHTML = `
      <div style="padding: 35px; background-color: white;">
        <div style="background-color: #2d3748; padding: 30px; color: white; margin-bottom: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">TÂN PHÁT TOTE & BUILDING</h1>
            <p style="margin: 10px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📍 Dãy Shophouse Khu B1 - Đại Đô Thị An Phú Thịnh - Quy Nhơn - Bình Định</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📞 081 491 1331 | 🌐 tanphatcompany.com</p>
          </div>
          <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 30px;">
            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px; text-transform: uppercase; font-weight: 600;">Danh mục: Kế toán</div>
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">BÁO CÁO ĐƠN HÀNG</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px; font-weight: 500;">Ngày trích xuất: ${dateStr}</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #9d171a;">
          <h2 style="margin: 0; font-size: 26px; color: #1a202c; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Bảng tổng kết chi tiết đơn hàng</h2>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; font-style: italic; font-weight: 600;">Dữ liệu gồm: <b>${filteredOrders.length}</b> đơn hàng hệ thống</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background-color: #2d3748; color: white;">
              <th style="padding: 15px 4px; border: 1px solid #cbd5e0; text-align: center; width: 40px; text-transform: uppercase; font-weight: 900;">STT</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; width: 100px; text-transform: uppercase; font-weight: 900;">Mã đơn</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; width: 120px; text-transform: uppercase; font-weight: 900;">Thời gian</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; width: 190px; text-transform: uppercase; font-weight: 900;">Khách hàng / Liên hệ</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; text-transform: uppercase; font-weight: 900;">Nội dung đơn hàng</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: right; width: 130px; text-transform: uppercase; font-weight: 900;">Doanh số</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: center; width: 110px; text-transform: uppercase; font-weight: 900;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOrders.map((o, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f7fafc'};">
                <td style="padding: 12px 4px; border: 1px solid #e2e8f0; text-align: center; color: #718096; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0; font-weight: 900; color: #1a202c; letter-spacing: -0.2px;">${o.orderCode}</td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0; color: #4a5568;">${o.createdAt}</td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0;">
                  <div style="font-weight: 800; color: #2d3748; text-transform: uppercase; font-size: 11px;">${o.customerName}</div>
                  <div style="font-size: 10px; color: #718096; margin-top: 3px; font-weight: 600;">📞 ${o.customerPhone}</div>
                </td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0;">
                  ${o.items.map(item => `
                    <div style="margin-bottom: 5px; display: flex; justify-content: space-between; border-bottom: 1px dotted #edf2f7; padding-bottom: 2px;">
                      <span style="color: #4a5568; font-weight: 500;">• ${item.productName}</span>
                      <span style="font-weight: 900; color: #9d171a; margin-left: 10px;">x${item.quantity}</span>
                    </div>
                  `).join('')}
                </td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 900; color: #9d171a; font-size: 12px;">
                  ${o.totalAmount.toLocaleString('vi-VN')} đ
                </td>
                <td style="padding: 12px 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <span style="display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;
                    background-color: ${o.status === OrderStatus.COMPLETED ? '#def7ec' : o.status === OrderStatus.PENDING ? '#fef3c7' : '#fde2e2'}; 
                    color: ${o.status === OrderStatus.COMPLETED ? '#03543f' : o.status === OrderStatus.PENDING ? '#92400e' : '#9b1c1c'};
                    border: 1px solid ${o.status === OrderStatus.COMPLETED ? '#84e1bc' : o.status === OrderStatus.PENDING ? '#fcd34d' : '#f8b4b4'};">
                    ${o.status === OrderStatus.COMPLETED ? 'Hoàn thành' : o.status === OrderStatus.PENDING ? 'Chờ xử lý' : 'Đã hủy'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-start; padding: 0 40px;">
          <div style="text-align: center;">
            <p style="font-size: 13px; font-weight: 700; margin-bottom: 80px; text-transform: uppercase; color: #4a5568;">Bộ phận kế toán</p>
            <div style="width: 160px; border-bottom: 1px dashed #cbd5e0; margin: 0 auto;"></div>
            <p style="font-size: 11px; color: #a0aec0; margin-top: 5px;">(Ký và đóng dấu)</p>
          </div>
          <div style="text-align: center;">
            <p style="font-size: 13px; font-weight: 700; margin-bottom: 80px; text-transform: uppercase; color: #4a5568;">Người lập báo cáo</p>
            <p style="font-size: 16px; font-weight: 800; color: #1a202c; margin-bottom: 0;">${currentUser?.fullName || 'Nguyễn Văn A'}</p>
            <p style="font-size: 12px; color: #718096; margin-top: 4px;">NV Hệ thống</p>
          </div>
        </div>

        <div style="margin-top: 80px; text-align: center; border-top: 1px solid #edf2f7; padding-top: 20px;">
          <p style="font-size: 11px; color: #cbd5e0; margin: 0; font-weight: 500;">Báo cáo được trích xuất tự động từ hệ thống quản trị chuyên dụng của TAN PHAT TOTE & BUILDING</p>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const opt: any = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `TAN_PHAT_Bao_cao_don_hang_${dateStr.replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
    };

    try {
      await html2pdf().from(element).set(opt).save();
    } finally {
      document.body.removeChild(element);
      setShowOrderExportDropdown(false);
    }
  };

  const handleExportOrdersCSV = () => {
    const headers = ['STT', 'Ma don hang', 'Ngay tao', 'Khach hang', 'So dien thoai', 'San pham', 'Tong tien', 'Trang thai'];
    const rows = filteredOrders.map((o: Order, index: number) => [
      index + 1,
      o.orderCode,
      o.createdAt,
      o.customerName,
      o.customerPhone,
      o.items.map(item => `${item.productName} (x${item.quantity})`).join('; '),
      o.totalAmount,
      o.status === OrderStatus.COMPLETED ? 'Da hoan thanh' : o.status === OrderStatus.PENDING ? 'Cho xu ly' : 'Da huy'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_don_hang_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowOrderExportDropdown(false);
  };

  const handleExportExcel = (target: 'admin' | 'customer' = 'admin') => {
    const data = filteredProducts.map((p: any, index: number) => {
      const row: any = {
        'STT': index + 1,
        'HÌNH ẢNH (URL)': p.image,
        'MÃ SẢN PHẨM': p.code,
        'TÊN SẢN PHẨM': p.name,
        'DANH MỤC': p.category,
        'THƯƠNG HIỆU': p.brand,
        'ĐƠN VỊ TÍNH': p.unit,
      };

      if (target === 'admin') {
        row['GIÁ NHẬP (VNĐ)'] = p.costPrice;
      }

      row['GIÁ BÁN (VNĐ)'] = p.price;
      row['TỒN KHO'] = p.stock;
      row['TRẠNG THÁI'] = p.status === ProductStatus.SHOW ? 'Đang kinh doanh' : 'Ngừng kinh doanh';
      row['MÃ QR (URL)'] = p.qrCode;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const cols = [
      { wch: 6 },   // STT
      { wch: 25 },  // Hình ảnh
      { wch: 15 },  // Mã SP
      { wch: 40 },  // Tên
      { wch: 20 },  // Danh mục
      { wch: 20 },  // Thương hiệu
      { wch: 12 },  // ĐVT
    ];

    if (target === 'admin') {
      cols.push({ wch: 18 }); // Giá nhập
    }
    cols.push({ wch: 18 }); // Giá bán
    cols.push({ wch: 10 }); // Tồn kho
    cols.push({ wch: 20 }); // Trạng thái
    cols.push({ wch: 25 }); // QR

    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    const sheetName = target === 'admin' ? "Báo cáo nội bộ" : "Bảng giá khách hàng";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const prefix = target === 'admin' ? 'TAN_PHAT_Bao_cao_AD' : 'TAN_PHAT_Bang_gia_KH';
    XLSX.writeFile(workbook, `${prefix}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
    setShowExportDropdown(false);
    setShowExportModal(false);
  };

  const handleExportPDF = async (target: 'admin' | 'customer' = 'admin') => {
    const element = document.createElement('div');
    element.style.width = '1050px';
    element.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    element.style.color = '#1a202c';
    element.style.backgroundColor = 'white';
    
    const title = target === 'admin' ? 'Báo cáo danh sách sản phẩm quản trị' : 'Danh mục sản phẩm & Bảng giá niêm yết';
    const subTitle = target === 'admin' ? 'Tài liệu lưu hành nội bộ - Bảo mật' : 'Kính gửi Quý khách hàng & Đối tác';

    element.innerHTML = `
      <div style="padding: 35px; background-color: white;">
        <div style="background-color: ${target === 'admin' ? '#9d171a' : '#2d3748'}; padding: 30px; color: white; margin-bottom: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">TÂN PHÁT TOTE & BUILDING</h1>
            <p style="margin: 10px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📍 Dãy Shophouse Khu B1 - Đại Đô Thị An Phú Thịnh - Quy Nhơn - Bình Định</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">📞 081 491 1331 | 🌐 tanphatcompany.com</p>
          </div>
          <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 30px;">
            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">${target === 'admin' ? 'Phân loại: Quản trị' : 'Phân loại: Khách hàng'}</div>
            <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">${target === 'admin' ? 'BÁO CÁO KHO HÀNG' : 'BẢNG GIÁ SẢN PHẨM'}</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px; font-weight: 500;">${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid ${target === 'admin' ? '#9d171a' : '#2d3748'};">
          <h2 style="margin: 0; font-size: 24px; color: #1a202c; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h2>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; font-style: italic;">${subTitle}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background-color: #2d3748; color: white;">
              <th style="padding: 15px 4px; border: 1px solid #cbd5e0; text-align: center; width: 35px; text-transform: uppercase; font-weight: 700;">STT</th>
              <th style="padding: 15px 4px; border: 1px solid #cbd5e0; text-align: center; width: 75px; text-transform: uppercase; font-weight: 700;">Hình ảnh</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; width: 85px; text-transform: uppercase; font-weight: 700;">Mã SP</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: left; width: 220px; text-transform: uppercase; font-weight: 700;">Tên sản phẩm</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: center; width: 65px; text-transform: uppercase; font-weight: 700;">ĐVT</th>
              ${target === 'admin' ? '<th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: right; width: 110px; text-transform: uppercase; font-weight: 700;">Giá nhập</th>' : ''}
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: right; width: 120px; text-transform: uppercase; font-weight: 700;">Giá bán niêm yết</th>
              <th style="padding: 15px 8px; border: 1px solid #cbd5e0; text-align: center; width: 65px; text-transform: uppercase; font-weight: 700;">Tồn</th>
              <th style="padding: 15px 4px; border: 1px solid #cbd5e0; text-align: center; width: 75px; text-transform: uppercase; font-weight: 700;">Mã QR</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map((p: any, index: number) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f7fafc'}; border-bottom: 1px solid #edf2f7;">
                <td style="padding: 10px 4px; border: 1px solid #e2e8f0; text-align: center; color: #718096; font-weight: 600;">${index + 1}</td>
                <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center;">
                  <img src="${p.image}" style="width: 50px; height: 50px; object-fit: cover; display: block; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 6px; background: white;" />
                </td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; font-weight: 800; color: #1a202c; font-size: 10px;">${p.code}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; font-weight: 700; color: #2d3748; line-height: 1.4;">
                  <div style="font-size: 11px;">${p.name}</div>
                  <div style="font-size: 9px; color: #718096; margin-top: 2px;">${p.category} | ${p.brand}</div>
                </td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; color: #4a5568; font-weight: 500;">${p.unit}</td>
                ${target === 'admin' ? `<td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #718096;">${formatCurrency(p.costPrice)}</td>` : ''}
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 900; color: #9d171a; font-size: 12px;">${formatCurrency(p.price)}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: ${p.stock <= 5 && target === 'admin' ? '#c53030' : '#2d3748'}">${p.stock}</td>
                <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center;">
                  <img src="${p.qrCode}" style="width: 48px; height: 48px; display: block; margin: 0 auto; border: 1px solid #f7fafc; background: white;" />
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-start; padding: 0 50px;">
          <div style="text-align: center;">
            <p style="font-size: 13px; font-weight: 700; margin-bottom: 80px; text-transform: uppercase; color: #4a5568;">Xác nhận đơn vị</p>
            <div style="width: 150px; border-bottom: 1px dashed #cbd5e0; margin: 0 auto;"></div>
            <p style="font-size: 11px; color: #a0aec0; margin-top: 5px;">(Ký và đóng dấu)</p>
          </div>
          <div style="text-align: center;">
            <p style="font-size: 13px; font-weight: 700; margin-bottom: 80px; text-transform: uppercase; color: #4a5568;">Người lập biểu</p>
            <p style="font-size: 16px; font-weight: 800; color: #1a202c; margin-bottom: 0;">${currentUser?.fullName || 'Quản trị viên'}</p>
            <p style="font-size: 12px; color: #718096; margin-top: 4px;">TAN PHAT TOTE & BUILDING</p>
          </div>
        </div>

        <div style="margin-top: 80px; text-align: center; border-top: 1px solid #edf2f7; padding-top: 20px;">
          <p style="font-size: 10px; color: #a0aec0; margin: 0; letter-spacing: 0.5px;">© ${new Date().getFullYear()} TAN PHAT TOTE & BUILDING | ${target === 'admin' ? 'Tài liệu mật nội bộ' : 'Cam kết chất lượng & Uy tín'}</p>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const opt: any = {
      margin:       [8, 8, 8, 8],
      filename:     target === 'admin' ? `TAN_PHAT_Bao_cao_AD_${Date.now()}.pdf` : `TAN_PHAT_Bang_gia_KH_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { 
        scale: 3, 
        useCORS: true, 
        letterRendering: true,
        logging: false
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
    };

    try {
      await html2pdf().from(element).set(opt).save();
    } finally {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
      setShowExportDropdown(false);
      setShowExportModal(false);
    }
  };

  const handleExportCSV = () => {
    const data = filteredProducts.map((p: any, index: number) => ({
      'STT': index + 1,
      'Hình ảnh': p.image,
      'Mã sản phẩm': p.code,
      'Tên sản phẩm': p.name,
      'Danh mục': p.category,
      'Thương hiệu': p.brand,
      'Đơn vị tính': p.unit,
      'Giá nhập': p.costPrice,
      'Giá bán': p.price,
      'Tồn kho': p.stock,
      'Trạng thái': p.status === ProductStatus.SHOW ? 'Đang kinh doanh' : 'Ngừng kinh doanh'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    // Add UTF-8 BOM so Excel recognizes Vietnamese
    const blob = new Blob(["\uFEFF", csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TAN_PHAT_Bao_cao_san_pham_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  return (
    <div className="flex h-screen bg-[#f1f3f6] text-[#2c3e50] font-sans">
      {/* Sidebar */}
      <aside 
        className={`bg-white shadow-xl transition-all duration-300 flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-4 flex items-center justify-center border-b border-gray-100 h-20">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#9d171a] rounded-full flex items-center justify-center text-white shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#9d171a] leading-tight">TAN PHAT</h1>
                <p className="text-[9px] font-semibold text-gray-400">TOTE & BUILDING</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 bg-[#9d171a] rounded-full flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center px-6 py-3.5 transition-all relative ${
                activeTab === item.name 
                ? 'text-[#9d171a] font-bold bg-red-50/50' 
                : 'text-gray-500 hover:text-[#9d171a] hover:bg-gray-50'
              }`}
            >
              {activeTab === item.name && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#9d171a] rounded-r-lg" />
              )}
              <item.icon size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="ml-4 text-sm truncate">{item.name}</span>}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-4 border-t border-gray-100 flex items-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft 
            size={20} 
            className={`text-gray-400 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} 
          />
          {!isSidebarCollapsed && <span className="ml-4 text-sm text-gray-500">Thu gọn</span>}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-4 flex items-center justify-between shadow-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'Tổng quan' ? 'Tổng quan hệ thống' : activeTab === 'Nhà cung cấp' ? 'Quản lý nhà cung cấp' : activeTab === 'Danh mục' ? 'Quản lý danh mục' : activeTab === 'Đơn hàng' ? 'Quản lý đơn hàng' : activeTab === 'Kho hàng' ? 'Quản lý kho hàng' : activeTab === 'Google Drive' ? 'Quản lý tài liệu' : activeTab === 'Cài đặt' ? 'Cài đặt hệ thống' : 'Quản lý sản phẩm'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <span>Trang chủ</span>
              <ChevronRight size={12} />
              <span>{activeTab === 'Tổng quan' ? 'Dashboard' : activeTab === 'Danh mục' || activeTab === 'Nhà cung cấp' || activeTab === 'Đơn hàng' || activeTab === 'Kho hàng' || activeTab === 'Google Drive' || activeTab === 'Cài đặt' ? 'Hệ thống' : 'Quản lý'}</span>
              <ChevronRight size={12} />
              <span className="text-[#9d171a] font-medium">
                {activeTab === 'Tổng quan' ? 'Thống kê' : activeTab === 'Nhà cung cấp' ? 'Nhà cung cấp' : activeTab === 'Danh mục' ? 'Danh mục sản phẩm' : activeTab === 'Đơn hàng' ? 'Danh sách đơn hàng' : activeTab === 'Kho hàng' ? 'Tồn kho' : activeTab === 'Google Drive' ? 'Google Drive' : activeTab === 'Cài đặt' ? 'Cài đặt' : 'Danh sách sản phẩm'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <Bell size={22} className="text-gray-500" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">3</div>
            </div>
            
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100 group cursor-pointer" onClick={onLogout}>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-700">{currentUser?.fullName || 'Nguyễn Văn A'}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400">
                  <span>{currentUser?.role || 'Quản trị viên'}</span>
                  <ChevronDown size={10} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 p-0.5 border border-gray-200 overflow-hidden">
                <div className="w-full h-full bg-[#9d171a]/10 rounded-full flex items-center justify-center">
                  <UserCircle size={32} className="text-[#9d171a]" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f1f3f6]">
          {activeTab === 'Tổng quan' ? (
            <DashboardTab products={products} categories={categories} suppliers={suppliers} orders={orders} />
          ) : activeTab === 'Kho hàng' ? (
            <InventoryTab 
              products={filteredProducts} 
              paginatedProducts={paginatedProducts} 
              filters={filters} 
              setFilters={setFilters} 
              setZoomQrCode={setZoomQrCode}
              setZoomTitle={setZoomTitle}
            />
          ) : activeTab === 'Cài đặt' ? (
            <SettingsTab accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} setCurrentUser={setCurrentUser} />
          ) : activeTab === 'Google Drive' ? (
            <GoogleDriveTab 
              selectedFolderId={selectedDriveFolder} 
              setSelectedFolderId={setSelectedDriveFolder} 
              products={products}
              setProducts={setProducts}
            />
          ) : (
            <>
              {/* Filter Section */}
              { (activeTab === 'Sản phẩm' || activeTab === 'Báo cáo' || activeTab === 'Kho hàng') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Search size={18} className="text-[#9d171a]" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Tìm kiếm sản phẩm</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Tên sản phẩm</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      type="text"
                      placeholder="Nhập tên sản phẩm"
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                      value={filters.searchQuery}
                      onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Danh mục</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="Tất cả danh mục">Tất cả danh mục</option>
                    {categories.map((cat: Category) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Thương hiệu</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.brand}
                    onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  >
                    <option value="Tất cả thương hiệu">Tất cả thương hiệu</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Trạng thái</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="Tất cả trạng thái">-- Tất cả --</option>
                    <option value={ProductStatus.SHOW}>Đang kinh doanh</option>
                    <option value={ProductStatus.HIDE}>Ngừng kinh doanh</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tình trạng kho</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.stockStatus}
                    onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
                  >
                    <option value="Tất cả tồn kho">-- Tất cả kho --</option>
                    <option value="Còn hàng">Còn hàng (&gt;= 10)</option>
                    <option value="Sắp hết hàng">Sắp hết hàng (&lt; 10)</option>
                    <option value="Hết hàng">Đã hết hàng (0)</option>
                  </select>
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Khoảng giá</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.priceRange}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  >
                    <option value="Tất cả các mức giá">Tất cả các mức giá</option>
                    <option value="Dưới 1.000.000đ">Dưới 1.000.000đ</option>
                    <option value="1.000.000đ - 2.000.000đ">1.000.000đ - 2.000.000đ</option>
                    <option value="2.000.000đ - 5.000.000đ">2.000.000đ - 5.000.000đ</option>
                    <option value="5.000.000đ - 10.000.000đ">5.000.000đ - 10.000.000đ</option>
                    <option value="Trên 10.000.000đ">Trên 10.000.000đ</option>
                  </select>
                </div>

                <div className="flex items-end gap-3 justify-end lg:col-span-1">
                  <button 
                    onClick={handleResetFilters}
                    className="px-6 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    <span>Xóa bộ lọc</span>
                  </button>
                  <button className="px-6 py-2 bg-[#9d171a] text-white rounded-lg text-sm font-bold hover:bg-[#851215] transition-colors shadow-lg shadow-red-900/20 flex items-center gap-2">
                    <Search size={16} />
                    <span>Tìm kiếm</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Đơn hàng' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Search size={18} className="text-[#9d171a]" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Tìm kiếm đơn hàng</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Mã đơn hàng</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      type="text"
                      placeholder="Nhập mã đơn hàng"
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                      value={filters.orderQuery}
                      onChange={(e) => setFilters({ ...filters, orderQuery: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Số điện thoại</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      type="text"
                      placeholder="Nhập số điện thoại"
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                      value={filters.orderPhone}
                      onChange={(e) => setFilters({ ...filters, orderPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Ngày tạo</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                      value={filters.orderDate}
                      onChange={(e) => setFilters({ ...filters, orderDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Trạng thái đơn hàng</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9d171a] bg-gray-50/30"
                    value={filters.orderStatus}
                    onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
                  >
                    <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                    <option value={OrderStatus.PENDING}>{OrderStatus.PENDING}</option>
                    <option value={OrderStatus.COMPLETED}>{OrderStatus.COMPLETED}</option>
                    <option value={OrderStatus.CANCELLED}>{OrderStatus.CANCELLED}</option>
                  </select>
                </div>

                <div className="flex items-end gap-3 justify-end md:col-span-4">
                  <button 
                    onClick={handleResetFilters}
                    className="px-6 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    <span>Xóa bộ lọc</span>
                  </button>
                  <button className="px-6 py-2 bg-[#9d171a] text-white rounded-lg text-sm font-bold hover:bg-[#851215] transition-colors shadow-lg shadow-red-900/20 flex items-center gap-2">
                    <Search size={16} />
                    <span>Tìm kiếm</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-50 text-[#9d171a]">
                <Database size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {activeTab === 'Nhà cung cấp' ? 'Danh sách nhà cung cấp' : activeTab === 'Danh mục' ? 'Danh mục sản phẩm' : activeTab === 'Đơn hàng' ? 'Danh sách đơn hàng' : activeTab === 'Báo cáo' ? 'Báo cáo sản phẩm' : 'Danh sách sản phẩm'}
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Tổng số: <span className="text-[#9d171a] font-bold">
                        {activeTab === 'Nhà cung cấp' ? suppliers.length : activeTab === 'Danh mục' ? categories.length : activeTab === 'Đơn hàng' ? filteredOrders.length : filteredProducts.length}
                      </span> bản ghi {activeTab === 'Nhà cung cấp' ? 'nhà cung cấp' : activeTab === 'Danh mục' ? 'danh mục' : activeTab === 'Đơn hàng' ? 'đơn hàng' : 'sản phẩm'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'Sản phẩm' && (
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-900/10"
                >
                  <Package size={18} />
                  <span>Thêm sản phẩm</span>
                </button>
              )}

              {activeTab === 'Danh mục' && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => setShowCategoryExportDropdown(!showCategoryExportDropdown)}
                      className="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Download size={18} className="text-[#9d171a]" />
                      <span>Xuất báo cáo</span>
                      <ChevronDown size={14} className={`transition-transform ${showCategoryExportDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showCategoryExportDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20"
                        >
                          {[
                            { name: 'Xuất Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-green-600', action: handleExportCategoriesExcel },
                            { name: 'Xuất PDF (.pdf)', icon: FileText, color: 'text-red-500', action: handleExportCategoriesPDF },
                            { name: 'In danh sách', icon: Printer, color: 'text-gray-600', action: () => window.print() },
                          ].map((opt) => (
                            <button 
                              key={opt.name} 
                              onClick={opt.action}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-600 transition-colors border-b last:border-0 border-gray-50"
                            >
                              <opt.icon size={18} className={opt.color} />
                              <span>{opt.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={handleOpenAddCategoryModal}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-900/10"
                  >
                    <Tags size={18} />
                    <span>Thêm danh mục</span>
                  </button>
                </div>
              )}
              
              {activeTab === 'Đơn hàng' && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => setShowOrderExportDropdown(!showOrderExportDropdown)}
                      className="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Download size={18} className="text-[#9d171a]" />
                      <span>Xuất báo cáo</span>
                      <ChevronDown size={14} className={`transition-transform ${showOrderExportDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showOrderExportDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20"
                        >
                          {[
                            { name: 'Xuất Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-green-600', action: handleExportOrdersExcel },
                            { name: 'Xuất PDF (.pdf)', icon: FileText, color: 'text-red-500', action: handleExportOrdersPDF },
                            { name: 'Xuất CSV (.csv)', icon: FileJson, color: 'text-emerald-500', action: handleExportOrdersCSV },
                            { name: 'In danh sách', icon: Printer, color: 'text-gray-600', action: () => window.print() },
                          ].map((opt) => (
                            <button 
                              key={opt.name} 
                              onClick={opt.action}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-600 transition-colors border-b last:border-0 border-gray-50"
                            >
                              <opt.icon size={18} className={opt.color} />
                              <span>{opt.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={handleOpenAddOrderModal}
                    className="bg-[#9d171a] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#851215] transition-colors shadow-lg shadow-red-900/10"
                  >
                    <ShoppingCart size={18} />
                    <span>Tạo đơn hàng</span>
                  </button>
                </div>
              )}

              {activeTab === 'Nhà cung cấp' && (
                <button 
                  onClick={handleOpenAddSupplierModal}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-900/10"
                >
                  <Truck size={18} />
                  <span>Thêm NCC</span>
                </button>
              )}

              {activeTab === 'Báo cáo' && (
                <div className="relative">
                  <button 
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="bg-[#9d171a] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-[#851215] transition-colors shadow-lg shadow-red-900/20"
                  >
                    <Download size={18} />
                    <span>Xuất báo cáo</span>
                    <ChevronDown size={14} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showExportDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20"
                      >
                        {[
                          { name: 'Xuất Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-green-600', action: () => { setExportType('excel'); setShowExportModal(true); } },
                          { name: 'Xuất PDF (.pdf)', icon: FileText, color: 'text-red-500', action: () => { setExportType('pdf'); setShowExportModal(true); } },
                          { name: 'Xuất CSV (.csv)', icon: FileJson, color: 'text-emerald-500', action: handleExportCSV },
                          { name: 'In báo cáo', icon: Printer, color: 'text-gray-600', action: () => window.print() },
                        ].map((opt) => (
                          <button 
                            key={opt.name} 
                            onClick={opt.action}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-600 transition-colors border-b last:border-0 border-gray-50"
                          >
                            <opt.icon size={18} className={opt.color} />
                            <span>{opt.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
          </div>
        </div>

        {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 {activeTab === 'Nhà cung cấp' ? (
                   <>
                     <thead>
                       <tr className="bg-[#9d171a] text-white text-[11px] uppercase tracking-wider">
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-16">STT</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Tên NCC</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Điện thoại</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Email</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Địa chỉ</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Lĩnh vực</th>
                         <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-24">Hành động</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {suppliers.map((supplier: any, idx: number) => (
                         <tr key={supplier.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                           <td className="px-5 py-4 text-sm text-gray-400 font-medium text-center border-r border-gray-50">{idx + 1}</td>
                           <td className="px-5 py-4 text-sm font-bold text-gray-700 border-r border-gray-50">{supplier.name}</td>
                           <td className="px-5 py-4 text-sm font-medium text-gray-600 border-r border-gray-50">{supplier.phone}</td>
                           <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50">{supplier.email}</td>
                           <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50 leading-relaxed">{supplier.address}</td>
                           <td className="px-5 py-4 text-sm border-r border-gray-50">
                             <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                               {supplier.category}
                             </span>
                           </td>
                           <td className="px-5 py-4 text-center border-l border-gray-50">
                             <div className="flex items-center justify-center gap-2">
                               <button 
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleOpenEditSupplierModal(supplier);
                                 }}
                                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                 title="Sửa thông tin"
                               >
                                 <Edit size={16} />
                               </button>
                               <button 
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteSupplier(supplier.id);
                                 }}
                                 className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                 title="Xoá nhà cung cấp"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                       {suppliers.length === 0 && (
                         <tr>
                           <td colSpan={7} className="px-5 py-20 text-center text-gray-400 italic">
                             Chưa có nhà cung cấp nào trong hệ thống
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </>
                 ) : activeTab === 'Đơn hàng' ? (
                   <>
                     <thead>
                       <tr className="bg-[#9d171a] text-white text-[11px] uppercase tracking-wider">
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-16">STT</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-32">Mã đơn</th>
                          <th className="px-5 py-4 text-left font-bold border-r border-white/10">Ngày tạo</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Khách hàng</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Số điện thoại</th>
                         <th className="px-5 py-4 text-left font-bold border-r border-white/10">Sản phẩm</th>
                         <th className="px-5 py-4 text-right font-bold border-r border-white/10">Tổng tiền</th>
                         <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-40">Trạng thái</th>
                         <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-24">Hành động</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {filteredOrders.map((order: Order, idx: number) => (
                         <tr key={order.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                           <td className="px-5 py-4 text-sm text-gray-400 font-medium text-center border-r border-gray-50">{idx + 1}</td>
                           <td className="px-5 py-4 text-sm font-bold text-gray-700 border-r border-gray-50">{order.orderCode}</td>
                           <td className="px-5 py-4 text-sm font-medium text-gray-500 border-r border-gray-50">{order.createdAt.split(' ')[0]}</td>
                           <td className="px-5 py-4 text-sm font-bold text-gray-700 border-r border-gray-50">{order.customerName}</td>
                           <td className="px-5 py-4 text-sm font-medium text-gray-600 border-r border-gray-50">{order.customerPhone}</td>
                           <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50">
                             <div className="flex flex-col gap-1">
                               {order.items.map((item, i) => (
                                 <span key={i} className="text-[11px]">
                                   • {item.productName} (x{item.quantity})
                                 </span>
                               ))}
                             </div>
                           </td>
                           <td className="px-5 py-4 text-sm font-bold text-red-600 text-right border-r border-gray-50">
                             {order.totalAmount.toLocaleString()}đ
                           </td>
                           <td className="px-5 py-4 text-center border-r border-gray-50">
                             <span className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                               order.status === OrderStatus.COMPLETED 
                               ? 'bg-green-50 text-green-500 border border-green-100' 
                               : order.status === OrderStatus.PENDING
                               ? 'bg-orange-50 text-orange-500 border border-orange-100'
                               : 'bg-red-50 text-red-500 border border-red-100'
                             }`}>
                               {order.status}
                             </span>
                           </td>
                           <td className="px-5 py-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                               <button 
                                 type="button"
                                 onClick={() => handleOpenEditOrderModal(order)}
                                 className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                 title="Sửa đơn hàng"
                               >
                                 <Edit size={16} />
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => handleDeleteOrder(order.id)}
                                 className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                 title="Xoá đơn hàng"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                       {filteredOrders.length === 0 && (
                         <tr>
                           <td colSpan={9} className="px-5 py-20 text-center text-gray-400 italic">
                             Chưa có đơn hàng nào trong hệ thống
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </>
                 ) : activeTab === 'Danh mục' ? (
                  <>
                    <thead>
                      <tr className="bg-[#9d171a] text-white text-[11px] uppercase tracking-wider">
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-16">STT</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-48">Tên danh mục</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10">Mô tả</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-32">Số sản phẩm</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-32">Mã QR</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-32">Link công khai</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-32">Trạng thái</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-24">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categories.map((category: Category, idx: number) => {
                        const productCount = products.filter((p: Product) => p.category === category.name).length;
                        return (
                          <tr key={category.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                            <td className="px-5 py-4 text-sm text-gray-400 font-medium text-center border-r border-gray-50">{idx + 1}</td>
                            <td className="px-5 py-4 text-sm font-bold text-gray-700 border-r border-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg text-[#9d171a]">
                                  <Tags size={16} />
                                </div>
                                {category.name}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50 italic">{category.description || 'Không có mô tả'}</td>
                            <td className="px-5 py-4 text-sm font-bold text-center border-r border-gray-50">
                              <span className="text-[#9d171a]">{productCount}</span>
                            </td>
                            <td className="px-5 py-4 text-center border-r border-gray-50">
                              {category.qrCode ? (
                                <img 
                                  src={category.qrCode} 
                                  alt="QR" 
                                  className="w-10 h-10 mx-auto rounded border border-gray-100 p-0.5 cursor-zoom-in hover:scale-110 transition-transform" 
                                  onClick={() => {
                                    setZoomQrCode(category.qrCode || null);
                                    setZoomTitle('Mã QR Danh Mục');
                                  }}
                                />
                              ) : (
                                <span className="text-[10px] text-gray-300">Chưa có</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center border-r border-gray-50">
                              <div className="flex flex-col items-center gap-1.5">
                                <a 
                                  href={category.publicLink || `https://tanphat-tawny.vercel.app/?category=${encodeURIComponent(category.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase"
                                >
                                  <ExternalLink size={12} />
                                  XEM CÔNG KHAI
                                </a>
                                <button 
                                  onClick={() => {
                                    const link = category.publicLink || `https://tanphat-tawny.vercel.app/?category=${encodeURIComponent(category.name)}`;
                                    navigator.clipboard.writeText(link);
                                    alert('Đã sao chép link công khai!');
                                  }}
                                  className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 font-medium"
                                >
                                  <Copy size={10} />
                                  SAO CHÉP LINK
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center border-r border-gray-50">
                              <span className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                                category.status === ProductStatus.SHOW 
                                ? 'bg-green-50 text-green-500 border border-green-100' 
                                : 'bg-red-50 text-red-400 border border-red-100'
                              }`}>
                                {category.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditCategoryModal(category);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                  title="Sửa thông tin"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(category.id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95" 
                                  title="Xoá danh mục"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-20 text-center text-gray-400 italic">
                            Chưa có danh mục nào trong hệ thống
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr className="bg-[#9d171a] text-white text-[11px] uppercase tracking-wider">
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-16">STT</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-32">Mã sản phẩm</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-24">Hình ảnh</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10">Tên sản phẩm</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-32">Danh mục</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-32">Thương hiệu</th>
                        <th className="px-5 py-4 text-left font-bold border-r border-white/10 w-24">Đơn vị tính</th>
                        <th className="px-5 py-4 text-right font-bold border-r border-white/10">Giá nhập (đ)</th>
                        <th className="px-5 py-4 text-right font-bold border-r border-white/10">Giá bán (đ)</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-20">Tồn kho</th>
                        <th className="px-5 py-4 text-center font-bold border-r border-white/10">Trạng thái</th>
                        {activeTab !== 'Báo cáo' && <th className="px-5 py-4 text-center font-bold border-r border-white/10 w-24">Hành động</th>}
                        <th className="px-5 py-4 text-center font-bold text-[10px] w-24">Hình ảnh QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedProducts.map((product: any, idx: number) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-5 py-4 text-sm text-gray-400 border-r border-gray-50">{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-600 border-r border-gray-50">{product.code}</td>
                          <td className="px-5 py-4 border-r border-gray-50">
                            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden mx-auto p-1 shadow-sm">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded-md group-hover:scale-110 transition-transform cursor-zoom-in" 
                                  onClick={() => {
                                    setZoomQrCode(product.image || null);
                                    setZoomTitle('Hình ảnh sản phẩm');
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Package size={16} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-700 border-r border-gray-50">{product.name}</td>
                          <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50">{product.category}</td>
                          <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50">{product.brand}</td>
                          <td className="px-5 py-4 text-sm text-gray-500 border-r border-gray-50">{product.unit}</td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-500 text-right border-r border-gray-50">{formatCurrency(product.costPrice)}</td>
                          <td className="px-5 py-4 text-sm font-bold text-[#9d171a] text-right border-r border-gray-50">{formatCurrency(product.price)}</td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-600 text-center border-r border-gray-50">{product.stock}</td>
                          <td className="px-5 py-4 text-center border-r border-gray-50">
                            <span className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                              product.status === ProductStatus.SHOW 
                              ? 'bg-green-50 text-green-500 border border-green-100' 
                              : 'bg-red-50 text-red-400 border border-red-100'
                            }`}>
                              {product.status === ProductStatus.SHOW ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                            </span>
                          </td>
                          {activeTab !== 'Báo cáo' && (
                            <td className="px-5 py-4 text-center border-r border-gray-50">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(product);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all hover:scale-110 active:scale-95" 
                                  title="Sửa"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteProduct(product.id);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-all hover:scale-110 active:scale-95" 
                                  title="Xoá"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                          <td className="px-5 py-4">
                            {product.qrCode ? (
                              <img 
                                src={product.qrCode} 
                                alt="QR" 
                                className="w-10 h-10 mx-auto opacity-70 group-hover:opacity-100 transition-all cursor-zoom-in hover:scale-110" 
                                onClick={() => {
                                  setZoomQrCode(product.qrCode || null);
                                  setZoomTitle('Mã QR sản phẩm');
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 mx-auto bg-gray-50 flex items-center justify-center text-gray-200 rounded">
                                <QrCode size={14} />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {paginatedProducts.length === 0 && (
                        <tr>
                          <td colSpan={activeTab === 'Báo cáo' ? 11 : 12} className="px-5 py-20 text-center text-gray-400 italic">
                            Không tìm thấy sản phẩm nào trong hệ thống
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}
              </table>
            </div>

            {/* Pagination Admin */}
            {(activeTab === 'Sản phẩm' || activeTab === 'Báo cáo' || activeTab === 'Kho hàng') && (
              <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <span>Hiển thị</span>
                  <select 
                    className="px-2 py-1 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#9d171a] text-gray-600"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>bản ghi trên trang</span>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { icon: ChevronsLeft, page: 1 },
                    { icon: ChevronLeft, page: Math.max(1, currentPage - 1) }
                  ].map((btn, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(btn.page)}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-[#9d171a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <btn.icon size={16} />
                    </button>
                  ))}
                  
                  <div className="flex items-center gap-1 mx-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all shadow-sm ${
                          currentPage === i + 1 
                          ? 'bg-[#9d171a] text-white shadow-[#9d171a]/20' 
                          : 'text-gray-400 hover:bg-white hover:text-gray-600'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {totalPages === 0 && (
                      <button disabled className="w-8 h-8 rounded-lg text-sm font-bold bg-[#9d171a] text-white opacity-50">1</button>
                    )}
                  </div>

                  {[
                    { icon: ChevronRight, page: Math.min(totalPages, currentPage + 1) },
                    { icon: ChevronsRight, page: totalPages === 0 ? 1 : totalPages }
                  ].map((btn, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(btn.page)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 text-gray-400 hover:text-[#9d171a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <btn.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </main>
      </div>
      
      <ProductFormModal 
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        suppliers={suppliers}
        categories={categories}
        selectedDriveFolder={selectedDriveFolder}
      />

      <SupplierFormModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSave={handleSaveSupplier}
        editingSupplier={editingSupplier}
      />

      <CategoryFormModal 
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
        selectedDriveFolder={selectedDriveFolder}
      />

      <OrderFormModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
        products={products}
      />

      <ConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />

      <ExportSelectionModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={(target: 'admin' | 'customer') => {
          if (exportType === 'excel') {
            handleExportExcel(target);
          } else {
            handleExportPDF(target);
          }
        }}
      />

      <QRZoomModal 
        isOpen={!!zoomQrCode}
        onClose={() => setZoomQrCode(null)}
        qrCode={zoomQrCode || ''}
        title={zoomTitle}
      />
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-red-600 p-4 text-white flex items-center gap-3">
          <Trash2 size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={onConfirm}
              className="px-6 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProductFormModal({ isOpen, onClose, onSave, editingProduct, suppliers, categories, selectedDriveFolder }: any) {
  const [formData, setFormData] = useState<any>({
    code: '',
    name: '',
    category: categories[0]?.name || '',
    brand: suppliers[0]?.name || '',
    unit: 'Cái',
    price: 0,
    costPrice: 0,
    stock: 0,
    status: ProductStatus.SHOW,
    image: '',
    qrCode: ''
  });

  const [qrPreview, setQrPreview] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState<{image: boolean, qr: boolean}>({ image: false, qr: false });
  const [isSavingAndUploading, setIsSavingAndUploading] = useState(false);

  React.useEffect(() => {
    if (editingProduct) {
      setFormData(editingProduct);
      setQrPreview(editingProduct.qrCode);
      setImagePreview(editingProduct.image);
    } else {
      setFormData({
        code: '',
        name: '',
        category: categories[0]?.name || '',
        brand: suppliers[0]?.name || '',
        unit: 'Cái',
        price: 0,
        costPrice: 0,
        stock: 0,
        status: ProductStatus.SHOW,
        image: '',
        qrCode: ''
      });
      setQrPreview('');
      setImagePreview('');
    }
  }, [editingProduct, isOpen, suppliers, categories]);

  const generateQRCode = async () => {
    if (!formData.code) {
      alert('Vui lòng nhập mã sản phẩm trước để tạo mã QR');
      return;
    }
    try {
      const qrDataUrl = await QRCode.toDataURL(formData.code, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrPreview(qrDataUrl);
      setFormData({ ...formData, qrCode: qrDataUrl });
    } catch (err) {
      console.error('QR generation error:', err);
      alert('Không thể tạo mã QR');
    }
  };

  const handleDriveUpload = async (type: 'image' | 'qr', dataUrl: string) => {
    if (!selectedDriveFolder) {
      alert('Vui lòng chọn thư mục lưu trữ trong tab Google Drive trước.');
      return;
    }

    setIsUploading(prev => ({ ...prev, [type]: true }));
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Cần đăng nhập Google');

      // Convert base64 to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const fileName = `${formData.code || 'product'}_${type}_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
      const result = await uploadToDrive(token, blob, fileName, selectedDriveFolder);
      
      // Make file public so it can be viewed by anyone (important for public catalog)
      await makeFilePublic(token, result.id);
      
      const drivePublicUrl = `https://lh3.googleusercontent.com/d/${result.id}`;

      if (type === 'image') {
        setImagePreview(drivePublicUrl);
        setFormData({ ...formData, image: drivePublicUrl });
      } else {
        setQrPreview(drivePublicUrl);
        setFormData({ ...formData, qrCode: drivePublicUrl });
      }
      
      alert(`Đã tải ${type === 'image' ? 'hình ảnh' : 'mã QR'} lên Google Drive thành công!`);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      if (err.message.includes('401')) clearAccessToken();
      alert('Lỗi khi tải lên Drive: ' + err.message);
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQrPreview(base64String);
        setFormData({ ...formData, qrCode: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData({ ...formData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) {
      alert('Vui lòng nhập mã sản phẩm!');
      return;
    }
    if (!formData.name) {
      alert('Vui lòng nhập tên sản phẩm!');
      return;
    }

    setIsSavingAndUploading(true);
    const updatedFormData = { ...formData };

    try {
      const hasLocalImage = imagePreview && imagePreview.startsWith('data:');
      const hasLocalQr = qrPreview && qrPreview.startsWith('data:');

      if (hasLocalImage || hasLocalQr) {
        if (!selectedDriveFolder) {
          throw new Error('Vui lòng chọn thư mục lưu trữ trong tab Google Drive trước.');
        }

        const token = await getAccessToken();
        if (!token) {
          throw new Error('Cần kết nối với Google Drive để tự động lưu trữ hình ảnh và mã QR. Vui lòng kết nối tài khoản.');
        }

        if (hasLocalImage) {
          const res = await fetch(imagePreview);
          const blob = await res.blob();
          const fileName = `${formData.code}_image_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
          const result = await uploadToDrive(token, blob, fileName, selectedDriveFolder);
          await makeFilePublic(token, result.id);
          const drivePublicUrl = `https://lh3.googleusercontent.com/d/${result.id}`;
          updatedFormData.image = drivePublicUrl;
        }

        if (hasLocalQr) {
          const res = await fetch(qrPreview);
          const blob = await res.blob();
          const fileName = `${formData.code}_qr_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
          const result = await uploadToDrive(token, blob, fileName, selectedDriveFolder);
          await makeFilePublic(token, result.id);
          const drivePublicUrl = `https://lh3.googleusercontent.com/d/${result.id}`;
          updatedFormData.qrCode = drivePublicUrl;
        }
      }

      await onSave(updatedFormData);
    } catch (err: any) {
      console.error('Error auto-uploading to Google Drive:', err);
      alert(err.message || 'Lỗi khi upload lên Google Drive.');
    } finally {
      setIsSavingAndUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#f8f9fa] rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="bg-white px-8 py-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#9d171a] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-900/20">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <p className="text-xs text-gray-400 font-medium">Hệ thống quản lý kho hàng chuyên nghiệp</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Main Info */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Section: Basic Info */}
              <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-[#9d171a] rounded-full" />
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Thông tin cơ bản</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Hash size={10} />
                      Mã sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ví dụ: SP0001"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#9d171a]/5 focus:border-[#9d171a] transition-all placeholder:text-gray-300 placeholder:font-normal"
                    />
                  </div>

                  <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Layout size={10} />
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nhập tên sản phẩm..."
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#9d171a]/5 focus:border-[#9d171a] transition-all placeholder:text-gray-300 placeholder:font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Tags size={10} />
                        Danh mục
                      </label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#9d171a]/5 focus:border-[#9d171a] transition-all appearance-none"
                      >
                        {categories.map((cat: Category) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Truck size={10} />
                        Thương hiệu
                      </label>
                      <select 
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#9d171a]/5 focus:border-[#9d171a] transition-all appearance-none"
                      >
                        {suppliers.map((s: Supplier) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Pricing & Inventory */}
              <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Giá bán & Tồn kho</h4>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign size={10} />
                      Giá nhập (VND)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">VNĐ</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#9d171a] uppercase tracking-widest flex items-center gap-1.5">
                      <Zap size={10} />
                      Giá bán (VND)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full px-5 py-3.5 bg-[#9d171a]/5 border border-[#9d171a]/10 rounded-2xl text-sm font-black text-[#9d171a] focus:outline-none focus:ring-4 focus:ring-[#9d171a]/10 focus:border-[#9d171a] transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#9d171a]/30">VNĐ</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={10} />
                      Số lượng tồn
                    </label>
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Scaling size={10} />
                      Đơn vị tính
                    </label>
                    <input 
                      type="text" 
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="Cái, Bộ, Kg..."
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Status & Media */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Section: Status */}
              <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-green-500 rounded-full" />
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Trạng thái</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: ProductStatus.SHOW })}
                    className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
                      formData.status === ProductStatus.SHOW 
                      ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                      : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${formData.status === ProductStatus.SHOW ? 'bg-green-500 text-white' : 'bg-gray-200 text-white'}`}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider">Đang kinh doanh</span>
                    </div>
                    {formData.status === ProductStatus.SHOW && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: ProductStatus.HIDE })}
                    className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all ${
                      formData.status === ProductStatus.HIDE 
                      ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' 
                      : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${formData.status === ProductStatus.HIDE ? 'bg-red-500 text-white' : 'bg-gray-200 text-white'}`}>
                        <X size={12} strokeWidth={4} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider">Ngừng kinh doanh</span>
                    </div>
                    {formData.status === ProductStatus.HIDE && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                  </button>
                </div>
              </div>

              {/* Section: Media */}
              <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">Hình ảnh & Mã QR</h4>
                </div>

                <div className="space-y-6">
                  {/* Product Image */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Image size={10} />
                        Ảnh đại diện sản phẩm
                      </label>
                    </div>
                    <div className="relative group">
                      <div className="w-full h-48 bg-gray-50 rounded-[20px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[#9d171a]/30 group-hover:bg-[#9d171a]/5">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-[18px]" crossOrigin="anonymous" />
                        ) : (
                          <div className="text-center p-6">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-300 mx-auto mb-3">
                              <Camera size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tải lên hình ảnh</p>
                            <p className="text-[9px] text-gray-300 mt-1">Hỗ trợ JPG, PNG, WEBP</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                      </div>
                      {imagePreview && (
                        <button 
                          type="button" 
                          onClick={() => {setImagePreview(''); setFormData({...formData, image: ''})}}
                          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all z-20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <QrCode size={10} />
                        Mã QR xác thực
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={generateQRCode}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold hover:bg-purple-100 transition-colors"
                        >
                          <Zap size={10} />
                          TỰ ĐỘNG TẠO
                        </button>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="w-full h-48 bg-gray-50 rounded-[20px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[#9d171a]/30 group-hover:bg-[#9d171a]/5">
                        {qrPreview ? (
                          <img src={qrPreview} alt="QR" className="w-32 h-32 object-contain rounded-lg shadow-sm bg-white p-2" crossOrigin="anonymous" />
                        ) : (
                          <div className="text-center p-6">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-300 mx-auto mb-3">
                              <QrCode size={24} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tải lên hoặc tự tạo</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-white p-8 border-t border-gray-100 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all border border-gray-100"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={isSavingAndUploading}
            className="flex-[2] py-4 bg-[#9d171a] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/30 hover:bg-[#851215] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSavingAndUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang tải lên Drive & Lưu...</span>
              </>
            ) : (
              <span>{editingProduct ? 'Cập nhật hệ thống' : 'Lưu sản phẩm mới'}</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SupplierFormModal({ isOpen, onClose, onSave, editingSupplier }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    phone: '',
    email: '',
    address: '',
    category: ''
  });

  React.useEffect(() => {
    if (editingSupplier) {
      setFormData(editingSupplier);
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        category: ''
      });
    }
  }, [editingSupplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="bg-[#9d171a] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck size={24} />
            <h3 className="text-xl font-bold uppercase tracking-wider">
              {editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <ChevronLeft size={24} className="rotate-90 md:rotate-0" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tên nhà cung cấp</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Công ty TNHH ABC"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Điện thoại</label>
                <input 
                  required
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0xx xxxx xxx"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lĩnh vực</label>
                <input 
                  required
                  type="text" 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ví dụ: Đồ gia dụng"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@company.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Địa chỉ</label>
              <textarea 
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Nhập địa chỉ trụ sở"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-sm hover:bg-gray-50 transition-all"
            >
              Huỷ bỏ
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 px-4 bg-[#9d171a] text-white rounded-xl font-bold uppercase text-sm hover:bg-[#851215] shadow-lg shadow-red-900/10 transition-all active:scale-[0.98]"
            >
              {editingSupplier ? 'Cập nhật' : 'Lưu nhà cung cấp'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CategoryFormModal({ isOpen, onClose, onSave, editingCategory, selectedDriveFolder }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: ProductStatus.SHOW,
    qrCode: '',
    publicLink: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [qrPreview, setQrPreview] = useState<string>('');

  React.useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        description: editingCategory.description,
        status: editingCategory.status,
        qrCode: editingCategory.qrCode || '',
        publicLink: editingCategory.publicLink || ''
      });
      setQrPreview(editingCategory.qrCode || '');
    } else {
      setFormData({
        name: '',
        description: '',
        status: ProductStatus.SHOW,
        qrCode: '',
        publicLink: ''
      });
      setQrPreview('');
    }
  }, [editingCategory, isOpen]);

  const handleDriveUpload = async (dataUrl: string) => {
    if (!selectedDriveFolder) {
      alert('Vui lòng chọn thư mục lưu trữ trong tab Google Drive trước.');
      return;
    }

    setIsUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Cần đăng nhập Google');

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const fileName = `category_${formData.name || 'qr'}_${Date.now()}.png`;
      const result = await uploadToDrive(token, blob, fileName, selectedDriveFolder);
      
      await makeFilePublic(token, result.id);
      
      const drivePublicUrl = `https://lh3.googleusercontent.com/d/${result.id}`;
      setQrPreview(drivePublicUrl);
      setFormData({ ...formData, qrCode: drivePublicUrl });
      
      alert('Đã tải mã QR lên Google Drive thành công!');
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      if (err.message.includes('401')) clearAccessToken();
      alert('Lỗi khi tải lên Drive: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQrFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQrPreview(base64String);
        setFormData({ ...formData, qrCode: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateQRCode = async () => {
    if (!formData.name) {
      alert('Vui lòng nhập tên danh mục để tạo mã QR');
      return;
    }
    try {
      // Create a search link or deep link
      const publicSearchLink = `https://tanphat-tawny.vercel.app/?category=${encodeURIComponent(formData.name)}`;
      const qrDataUrl = await QRCode.toDataURL(publicSearchLink, {
        width: 400,
        margin: 2
      });
      setQrPreview(qrDataUrl);
      setFormData({ ...formData, qrCode: qrDataUrl, publicLink: publicSearchLink });
    } catch (err) {
      console.error('QR generation error:', err);
      alert('Không thể tạo mã QR');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="bg-[#9d171a] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tags size={24} />
            <h3 className="text-xl font-bold uppercase tracking-wider">
              {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tên danh mục sản phẩm</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Thiết bị xây dựng, Sơn..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as ProductStatus})}
              >
                <option value={ProductStatus.SHOW}>Đang kinh doanh</option>
                <option value={ProductStatus.HIDE}>Ngừng kinh doanh</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Link công khai (Tùy chọn)</label>
              <input 
                type="text" 
                value={formData.publicLink}
                onChange={(e) => setFormData({ ...formData, publicLink: e.target.value })}
                placeholder="https://tanphat-tawny.vercel.app/?category=Sơn"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all text-xs text-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider text-blue-500">Mã QR Danh Mục</label>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={generateQRCode}
                      className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold hover:bg-purple-100"
                    >
                      TẠO QR TỰ ĐỘNG
                    </button>
                    {qrPreview && (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => handleDriveUpload(qrPreview)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 disabled:opacity-50"
                      >
                        {isUploading ? 'ĐANG TẢI...' : 'LƯU VÀO DRIVE'}
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleQrFileSelected}
                    className="text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-gray-100 file:text-gray-500 hover:file:bg-gray-200"
                  />
                </div>
                <div className="w-24 h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-100 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  {qrPreview ? (
                    <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={32} className="text-gray-200" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mô tả</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả ngắn gọn về danh mục"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-sm hover:bg-gray-50 transition-all"
            >
              Huỷ bỏ
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 px-4 bg-[#9d171a] text-white rounded-xl font-bold uppercase text-sm hover:bg-[#851215] shadow-lg shadow-red-900/10 transition-all active:scale-[0.98]"
            >
              {editingCategory ? 'Cập nhật danh mục' : 'Lưu danh mục'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function OrderFormModal({ isOpen, onClose, onSave, editingOrder, products }: any) {
  const [formData, setFormData] = useState({
    orderCode: '',
    customerName: '',
    customerPhone: '',
    status: OrderStatus.PENDING,
    items: [] as OrderItem[],
    totalAmount: 0
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  React.useEffect(() => {
    if (editingOrder) {
      setFormData({
        orderCode: editingOrder.orderCode,
        customerName: editingOrder.customerName,
        customerPhone: editingOrder.customerPhone,
        status: editingOrder.status,
        items: [...editingOrder.items],
        totalAmount: editingOrder.totalAmount
      });
    } else {
      const nextCode = `DH${Math.floor(Math.random() * 90000) + 10000}`;
      setFormData({
        orderCode: nextCode,
        customerName: '',
        customerPhone: '',
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: 0
      });
    }
  }, [editingOrder, isOpen]);

  const addItem = () => {
    if (!selectedProduct) return;
    const product = products.find((p: Product) => p.name === selectedProduct);
    if (!product) return;

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: selectedQuantity,
      price: product.price
    };

    const newItems = [...formData.items, newItem];
    const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
    setSelectedProduct('');
    setSelectedQuantity(1);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }
    const orderData = {
      ...formData,
      createdAt: new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19)
    };
    onSave(orderData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="bg-[#9d171a] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} />
            <h3 className="text-xl font-bold uppercase tracking-wider">
              {editingOrder ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mã đơn hàng</label>
              <input 
                disabled
                type="text" 
                value={formData.orderCode}
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as OrderStatus})}
              >
                <option value={OrderStatus.PENDING}>Chờ xử lý</option>
                <option value={OrderStatus.COMPLETED}>Đã hoàn thành</option>
                <option value={OrderStatus.CANCELLED}>Đã hủy</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tên khách hàng</label>
              <input 
                required
                type="text" 
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Nhập tên khách hàng"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Số điện thoại</label>
              <input 
                required
                type="tel" 
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="Ví dụ: 0901234567"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <h4 className="font-bold text-gray-700 flex items-center gap-2">
              <Package size={18} className="text-[#9d171a]" />
              Danh sách sản phẩm
            </h4>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Chọn sản phẩm</option>
                  {products.filter((p: Product) => p.stock > 0).map((p: Product) => (
                    <option key={p.id} value={p.name}>{p.name} - {p.price.toLocaleString()}đ (Tồn: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input 
                  type="number" 
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                />
              </div>
              <button 
                type="button"
                onClick={addItem}
                className="px-4 bg-[#9d171a] text-white rounded-lg hover:bg-[#851215] transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 italic">
                    <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                    <th className="px-4 py-2 text-center w-20">SL</th>
                    <th className="px-4 py-2 text-right">Giá</th>
                    <th className="px-4 py-2 text-right">Thành tiền</th>
                    <th className="px-4 py-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {formData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium">{item.productName}</td>
                      <td className="px-4 py-2 text-center font-bold text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{item.price.toLocaleString()}đ</td>
                      <td className="px-4 py-2 text-right font-bold text-[#9d171a]">{(item.price * item.quantity).toLocaleString()}đ</td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Chưa có sản phẩm nào</td>
                    </tr>
                  )}
                </tbody>
                {formData.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-red-50 border-t border-red-100">
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700 uppercase text-xs">Tổng cộng</td>
                      <td className="px-4 py-3 text-right font-black text-[#9d171a] text-lg">{formData.totalAmount.toLocaleString()}đ</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-sm hover:bg-gray-50 transition-all"
            >
              Huỷ bỏ
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 px-4 bg-[#9d171a] text-white rounded-xl font-bold uppercase text-sm hover:bg-[#851215] shadow-lg shadow-red-900/10 transition-all active:scale-[0.98]"
            >
              {editingOrder ? 'Cập nhật đơn hàng' : 'Hoàn tất tạo đơn'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DashboardTab({ products, categories, suppliers, orders }: { products: Product[], categories: Category[], suppliers: Supplier[], orders: Order[] }) {
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalProducts = products.length;

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate start of current week (Monday)
    const currentDay = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayOrders = orders.filter(o => {
      const oDate = new Date(o.createdAt.split(' ')[0]);
      return oDate.toDateString() === today.toDateString() && o.status !== OrderStatus.CANCELLED;
    });

    const weekOrders = orders.filter(o => {
      const oDate = new Date(o.createdAt.split(' ')[0]);
      return oDate >= startOfWeek && o.status !== OrderStatus.CANCELLED;
    });

    const monthOrders = orders.filter(o => {
      const oDate = new Date(o.createdAt.split(' ')[0]);
      return oDate >= startOfMonth && o.status !== OrderStatus.CANCELLED;
    });

    const getQuantity = (orderList: Order[]) => 
      orderList.reduce((acc, o) => acc + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);

    const todayQty = getQuantity(todayOrders);
    const weekQty = getQuantity(weekOrders);

    // Grouping for charts
    const hours = ['08h', '10h', '12h', '14h', '16h', '18h', '20h'];
    const dailyData = hours.map(h => {
      const hourVal = parseInt(h);
      const qty = todayOrders.reduce((acc, o) => {
        const orderHour = parseInt(o.createdAt.split(' ')[1].split(':')[0]);
        if (orderHour >= hourVal && orderHour < hourVal + 2) {
          return acc + o.items.reduce((sum, item) => sum + item.quantity, 0);
        }
        return acc;
      }, 0);
      return { name: h, value: qty };
    });

    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const weeklyData = days.map((d, index) => {
      const dayIndex = index === 6 ? 0 : index + 1;
      const qty = weekOrders.reduce((acc, o) => {
        const oDate = new Date(o.createdAt.split(' ')[0]);
        if (oDate.getDay() === dayIndex) {
          return acc + o.items.reduce((sum, item) => sum + item.quantity, 0);
        }
        return acc;
      }, 0);
      return { name: d, value: qty };
    });

    const monthlyData = [
      { name: 'Tuần 1', start: 1, end: 7 },
      { name: 'Tuần 2', start: 8, end: 14 },
      { name: 'Tuần 3', start: 15, end: 21 },
      { name: 'Tuần 4', start: 22, end: 31 },
    ].map(w => {
      const qty = monthOrders.reduce((acc, o) => {
        const oDate = new Date(o.createdAt.split(' ')[0]);
        const day = oDate.getDate();
        if (day >= w.start && day <= w.end) {
          return acc + o.items.reduce((sum, item) => sum + item.quantity, 0);
        }
        return acc;
      }, 0);
      return { name: w.name, value: qty };
    });

    return { todayQty, weekQty, dailyData, weeklyData, monthlyData };
  }, [orders]);

  const stats = [
    { title: 'Xuất kho Hôm nay', value: dashboardStats.todayQty.toLocaleString(), trend: '+0%', icon: Zap, color: 'bg-orange-50 text-orange-600' },
    { title: 'Xuất kho Tuần này', value: dashboardStats.weekQty.toLocaleString(), trend: '+0%', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { title: 'Tổng Sản phẩm', value: totalProducts.toLocaleString(), trend: '+0%', icon: Package, color: 'bg-blue-50 text-blue-600' },
    { title: 'Tổng Tồn kho', value: totalStock.toLocaleString(), trend: '+0%', icon: Warehouse, color: 'bg-purple-50 text-purple-600' },
  ];

  const { dailyData, weeklyData, monthlyData } = dashboardStats;

  return (
    <div className="space-y-8 pb-10">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend}
                {stat.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
            <h4 className="text-2xl font-black text-gray-800">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Thống kê theo ngày</h3>
              <p className="text-xs text-gray-400">Số lượng sản phẩm xuất kho theo khung giờ hôm nay</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <Database size={18} />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9d171a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9d171a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#9d171a" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Thống kê theo tuần</h3>
              <p className="text-xs text-gray-400">Tổng lượng hàng xuất kho các ngày trong tuần</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#9d171a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Thống kê theo tháng</h3>
              <p className="text-xs text-gray-400">Xu hướng xuất kho qua các tuần trong tháng gần nhất</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded">
                <Target size={12} />
                Đạt mục tiêu
              </span>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area 
                  type="stepAfter" 
                  dataKey="value" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorMonthly)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InventoryTab({ 
  products, 
  paginatedProducts, 
  filters, 
  setFilters,
  setZoomQrCode,
  setZoomTitle
}: { 
  products: Product[], 
  paginatedProducts: Product[], 
  filters: any, 
  setFilters: any,
  setZoomQrCode: any,
  setZoomTitle: any
}) {
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockProducts = products.filter(p => p.stock < 10);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const inventoryStats = [
    { 
      title: 'Tổng số lượng tồn', 
      value: totalItems.toLocaleString(), 
      icon: Warehouse, 
      color: 'bg-blue-50 text-blue-600', 
      sub: 'Sản phẩm trong kho',
      filter: 'Tất cả tồn kho'
    },
    { 
      title: 'Giá trị tồn kho', 
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalStockValue).replace('₫', 'đ'), 
      icon: Database, 
      color: 'bg-green-50 text-green-600', 
      sub: 'Tổng vốn tồn đọng',
      filter: 'Còn hàng'
    },
    { 
      title: 'Sắp hết hàng', 
      value: lowStockProducts.length.toString(), 
      icon: Bell, 
      color: 'bg-orange-50 text-orange-600', 
      sub: 'Dưới 10 sản phẩm',
      filter: 'Sắp hết hàng'
    },
    { 
      title: 'Đã hết hàng', 
      value: outOfStockProducts.length.toString(), 
      icon: Trash2, 
      color: 'bg-red-50 text-red-600', 
      sub: 'Cần nhập hàng gấp',
      filter: 'Hết hàng'
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventoryStats.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setFilters({ ...filters, stockStatus: stat.filter })}
            className={`cursor-pointer p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${
              filters.stockStatus === stat.filter 
                ? 'bg-white border-[#9d171a] ring-1 ring-[#9d171a]' 
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {filters.stockStatus === stat.filter && (
                <div className="w-2 h-2 rounded-full bg-[#9d171a] animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stat.value}</h3>
              <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                {stat.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Inventory List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 gap-4">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <List size={20} className="text-[#9d171a]" />
                  Chi tiết tồn kho thực tế
                </h3>
                <p className="text-xs text-gray-400 mt-1">Danh sách sản phẩm và số lượng hiện có tại kho</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Tất cả', value: 'Tất cả tồn kho' },
                  { label: 'Còn hàng', value: 'Còn hàng' },
                  { label: 'Sắp hết', value: 'Sắp hết hàng' },
                  { label: 'Hết hàng', value: 'Hết hàng' }
                ].map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => setFilters({ ...filters, stockStatus: chip.value })}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                      filters.stockStatus === chip.value
                        ? 'bg-[#9d171a] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-[#9d171a] hover:text-[#9d171a]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-50">
                    <th className="px-6 py-4 text-left font-black">Sản phẩm</th>
                    <th className="px-6 py-4 text-center font-black">Mã SP</th>
                    <th className="px-6 py-4 text-center font-black">Tồn kho</th>
                    <th className="px-6 py-4 text-right font-black">Giá trị (đ)</th>
                    <th className="px-6 py-4 text-center font-black">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold overflow-hidden">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                className="w-full h-full object-cover cursor-zoom-in" 
                                alt={product.name} 
                                onClick={() => {
                                  setZoomQrCode(product.image || null);
                                  setZoomTitle('Hình ảnh sản phẩm');
                                }}
                              />
                            ) : (
                              product.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700 leading-tight">{product.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <code className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">{product.code}</code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700 text-sm">
                        {(product.stock * product.price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.stock === 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[9px] font-bold uppercase tracking-wider">Hết hàng</span>
                        ) : product.stock < 10 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-[9px] font-bold uppercase tracking-wider">Sắp hết</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-[9px] font-bold uppercase tracking-wider">An toàn</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alerts & Quick Info */}
        <div className="space-y-6">
          <div className="bg-[#9d171a] text-white p-8 rounded-2xl shadow-xl shadow-red-900/20 relative overflow-hidden">
            <Warehouse className="absolute -right-8 -bottom-8 opacity-10 w-48 h-48" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Cần nhập kho</h3>
              <p className="text-sm opacity-80 mb-6 font-medium">Có {lowStockProducts.length} sản phẩm đang ở mức báo động tồn kho thấp.</p>
              <div className="space-y-4">
                {lowStockProducts.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <span className="text-xs font-bold truncate max-w-[120px]">{p.name}</span>
                    <span className="text-xs font-black bg-white text-[#9d171a] px-2 py-1 rounded-md">{p.stock}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 bg-white text-[#9d171a] py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-colors">
                Tạo phiếu nhập hàng
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Tags size={18} className="text-[#9d171a]" />
              Sản phẩm giá trị nhất
            </h4>
            <div className="space-y-4">
              {[...products].sort((a, b) => (b.stock * b.price) - (a.stock * a.price)).slice(0, 4).map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">Giá trị: {((p.stock * p.price) / 1000000).toFixed(1)} tr đ</p>
                  </div>
                  <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#9d171a]" style={{ width: `${Math.min(100, (p.stock * p.price / totalStockValue) * 500)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ accounts, setAccounts, currentUser, setCurrentUser }: { accounts: AdminAccount[], setAccounts: any, currentUser: AdminAccount | null, setCurrentUser: any }) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'accounts'>('profile');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [accountFormData, setAccountFormData] = useState<Partial<AdminAccount>>({
    username: '',
    fullName: '',
    email: '',
    role: 'Nhân viên',
    status: 'active',
  });

  const [profileData, setProfileData] = useState({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    username: currentUser?.username || '',
  });

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setAccountFormData({
      username: '',
      fullName: '',
      email: '',
      role: 'Nhân viên',
      status: 'active',
    });
    setShowAccountModal(true);
  };

  const handleOpenEditModal = (account: AdminAccount) => {
    setEditingAccount(account);
    setAccountFormData({
      username: account.username,
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      status: account.status,
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.username || !accountFormData.fullName || !accountFormData.email) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    try {
      if (editingAccount) {
        const updated = await supabaseService.updateAccount(editingAccount.id, accountFormData);
        setAccounts((prev: AdminAccount[]) => prev.map(a => 
          a.id === editingAccount.id ? updated : a
        ));
        if (editingAccount.id === currentUser?.id) {
          setCurrentUser(updated);
        }
        alert('Cập nhật tài khoản thành công!');
      } else {
        const newAccountData: Omit<AdminAccount, 'id'> = {
          username: accountFormData.username!,
          fullName: accountFormData.fullName!,
          email: accountFormData.email!,
          role: accountFormData.role || 'Nhân viên',
          status: (accountFormData.status as 'active' | 'inactive') || 'active',
          lastLogin: '',
          avatar: '',
        };
        const added = await supabaseService.addAccount(newAccountData);
        setAccounts((prev: AdminAccount[]) => [...prev, added]);
        alert('Thêm tài khoản thành công!');
      }
      setShowAccountModal(false);
    } catch (err) {
      console.error('Error saving account:', err);
      alert('Lỗi khi lưu tài khoản!');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const updated = await supabaseService.updateAccount(currentUser.id, profileData);
      setCurrentUser(updated);
      setAccounts((prev: AdminAccount[]) => prev.map(a => a.id === currentUser.id ? updated : a));
      alert('Cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Lỗi khi cập nhật thông tin!');
    }
  };

  const handleToggleAccountStatus = async (id: number) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    if (id === currentUser?.id) {
      alert('Bạn không thể vô hiệu hóa chính mình!');
      return;
    }

    try {
      const newStatus = account.status === 'active' ? 'inactive' : 'active';
      const updated = await supabaseService.updateAccount(id, { status: newStatus });
      setAccounts((prev: AdminAccount[]) => prev.map(a => a.id === id ? updated : a));
    } catch (err) {
      console.error('Error toggling account status:', err);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'profile' ? 'bg-white text-[#9d171a] border-b-2 border-[#9d171a]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <UserCircle size={18} />
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'accounts' ? 'bg-white text-[#9d171a] border-b-2 border-[#9d171a]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users size={18} />
            Quản trị tài khoản
          </button>
        </div>

        <div className="p-8">
          {activeSubTab === 'profile' ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-6">Tùy chỉnh thông tin tài khoản</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-8 mb-8">
                  <div className="w-24 h-24 rounded-full bg-gray-100 p-1 border-2 border-gray-100 relative group">
                    <div className="w-full h-full bg-[#9d171a]/10 rounded-full flex items-center justify-center">
                      <UserCircle size={60} className="text-[#9d171a]" />
                    </div>
                    <button type="button" className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      ĐỔI ẢNH
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700">{currentUser?.fullName}</h4>
                    <p className="text-xs text-gray-400">{currentUser?.role}</p>
                    <div className="mt-2 flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded text-[9px] font-bold uppercase tracking-wider">Đang hoạt động</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên đăng nhập</label>
                    <input
                      type="text"
                      disabled
                      value={profileData.username}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vai trò</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.role}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#9d171a] text-white rounded-xl font-bold text-sm shadow-lg shadow-red-900/20 hover:bg-[#861417] transition-all flex items-center gap-2"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Quản trị danh sách tài khoản</h3>
                  <p className="text-xs text-gray-400 mt-1">Quản lý và giới hạn quyền truy cập cho nhân viên</p>
                </div>
                <button 
                  onClick={handleOpenAddModal}
                  className="px-6 py-2.5 bg-[#9d171a] text-white rounded-xl font-bold text-xs shadow-lg shadow-red-900/20 hover:bg-[#861417] transition-all flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  THÊM TÀI KHOẢN
                </button>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-black border-b border-gray-100">
                      <th className="px-6 py-4 text-left">Người dùng</th>
                      <th className="px-6 py-4 text-left">Vai trò</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4 text-center">Đăng nhập cuối</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[#9d171a] font-bold text-sm border border-gray-200">
                              {account.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-700">{account.fullName}</p>
                              <p className="text-[10px] text-gray-400">{account.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                          {account.role}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            account.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {account.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-400 font-medium">
                          {account.lastLogin || 'Chưa đăng nhập'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEditModal(account)}
                              className="p-1.5 text-gray-400 hover:text-[#9d171a] transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggleAccountStatus(account.id)}
                              className={`p-1.5 transition-colors rounded-lg ${
                                account.status === 'active' ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                              }`}
                            >
                              <ShieldCheck size={16} />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                              <UserCog size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AccountModal 
        isOpen={showAccountModal} 
        onClose={() => setShowAccountModal(false)}
        onSave={handleSaveAccount}
        data={accountFormData}
        setData={setAccountFormData}
        isEditing={!!editingAccount}
      />
    </div>
  );
}

function AccountModal({ isOpen, onClose, onSave, data, setData, isEditing }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="px-8 py-6 bg-[#9d171a] text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-widest">{isEditing ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
            <p className="text-[10px] opacity-70 mt-1 uppercase font-medium">Vui lòng nhập đầy đủ thông tin bên dưới</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSave} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên đăng nhập</label>
            <input
              type="text"
              disabled={isEditing}
              required
              placeholder="Ví dụ: nhanvien_01"
              value={data.username}
              onChange={(e) => setData({ ...data, username: e.target.value })}
              className={`w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20 ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Văn Hải"
              value={data.fullName}
              onChange={(e) => setData({ ...data, fullName: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email liên hệ</label>
            <input
              type="email"
              required
              placeholder="nhanvien@congty.vn"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vai trò</label>
              <select
                value={data.role}
                onChange={(e) => setData({ ...data, role: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
              >
                <option value="Quản trị viên">Quản trị viên</option>
                <option value="Quản lý bán hàng">Quản lý bán hàng</option>
                <option value="Quản lý kho">Quản lý kho</option>
                <option value="Nhân viên">Nhân viên</option>
              </select>
            </div>
            {!isEditing && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</label>
                <select
                  value={data.status}
                  onChange={(e) => setData({ ...data, status: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9d171a]/20"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm khóa</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3 mt-4">
            <button
              type="submit"
              className="flex-1 py-4 bg-[#9d171a] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/20 hover:bg-[#861417] transition-all"
            >
              LƯU THÔNG TIN
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
            >
              HỦY BỎ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ExportSelectionModal({ isOpen, onClose, onExport, type }: any) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
      >
        <div className="bg-[#2d3748] px-8 py-6 text-white text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Download size={28} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">Tuỳ chọn xuất báo cáo</h3>
          <p className="text-xs opacity-70 mt-1 font-medium italic">Vui lòng chọn đối tượng nhận báo cáo</p>
        </div>

        <div className="p-8 space-y-4">
          <button 
            onClick={() => onExport('admin')}
            className="w-full flex items-center justify-between p-5 bg-red-50 border border-red-100 rounded-2xl group hover:bg-red-100 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#9d171a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20 group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-[#9d171a] uppercase tracking-tight">Dành cho Quản Trị</p>
                <p className="text-[10px] text-red-400 font-medium mt-0.5">Hiển thị đầy đủ (Bao gồm Giá Nhập)</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#9d171a] border border-red-100 shadow-sm">
              <ChevronRight size={16} />
            </div>
          </button>

          <button 
            onClick={() => onExport('customer')}
            className="w-full flex items-center justify-between p-5 bg-blue-50 border border-blue-100 rounded-2xl group hover:bg-blue-100 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#2d3748] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/10 group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-[#2d3748] uppercase tracking-tight">Dành cho Khách Hàng</p>
                <p className="text-[10px] text-blue-400 font-medium mt-0.5">Ẩn Giá Nhập & Tối ưu trình bày</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#2d3748] border border-blue-100 shadow-sm">
              <ChevronRight size={16} />
            </div>
          </button>

          <button 
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest transition-colors mt-2"
          >
            Đóng cửa sổ
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginModal({ isOpen, onClose, onLogin, data, setData }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-[#9d171a] p-8 text-white text-center">
          <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-lg">
            <img 
              src="https://tanphatcompany.com/wp-content/uploads/2023/12/logo_tp.svg" 
              alt="Tân Phát Logo" 
              className="h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wider">Đăng nhập hệ thống</h3>
          <p className="text-sm opacity-80 mt-1">Truy cập quyền quản trị viên</p>
        </div>
        <form onSubmit={onLogin} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Tài khoản</label>
              <input 
                required
                type="text" 
                placeholder="Nhập tên đăng nhập"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                value={data.username}
                onChange={(e) => setData({ ...data, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">Mật khẩu</label>
              <input 
                required
                type="password" 
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d171a] transition-all"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full bg-[#9d171a] text-white py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#851215] shadow-lg transition-all active:scale-[0.98]"
            >
              Đăng nhập ngay
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Huỷ bỏ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function GoogleDriveTab({ 
  selectedFolderId, 
  setSelectedFolderId,
  products,
  setProducts
}: { 
  selectedFolderId: string, 
  setSelectedFolderId: (id: string) => void,
  products: Product[],
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  const fetchDriveData = async (folderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      // Fetch folders and files in parallel
      const [foldersData, filesData] = await Promise.all([
        listDriveFolders(token),
        listDriveFiles(token, folderId || selectedFolderId)
      ]);

      setFolders(foldersData.files || []);
      setFiles(filesData.files || []);
      setNeedsAuth(false);
      setError(null);
    } catch (err: any) {
      const isAuthError = err.message.includes('401') || 
                         err.message.includes('Unauthorized') || 
                         err.message.includes('invalid authentication credentials') ||
                         err.message.includes('invalid_grant');

      if (isAuthError) {
        clearAccessToken();
        setNeedsAuth(true);
        setUser(null);
        // Don't set a scary error message for auth expiration, 
        // the Connect UI will explain the need to re-login
      } else {
        console.error('Drive fetch error:', err);
        setError('Không thể kết nối với Google Drive. Vui lòng kiểm tra lại kết nối mạng.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncImages = async () => {
    if (!selectedFolderId) {
      alert('Vui lòng chọn một thư mục để bộ lọc!');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn đồng bộ hình ảnh? Hệ thống sẽ quét các tập tin trong thư mục Drive đã chọn và cập nhật hình ảnh cho sản phẩm nếu tên tập tin trùng với mã sản phẩm.')) {
      return;
    }

    setIsSyncing(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Cần đăng nhập Google');

      let matchCount = 0;
      const updatedProducts = [...products];

      for (const file of files) {
        // Remove extension and trim
        const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.').trim();
        
        // Find product with matching code
        const productIndex = updatedProducts.findIndex(p => p.code.trim().toUpperCase() === fileNameWithoutExt.toUpperCase());
        
        if (productIndex !== -1) {
          // Make file public
          await makeFilePublic(token, file.id);
          
          const drivePublicUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
          
          // Update in Supabase
          await supabaseService.updateProduct(updatedProducts[productIndex].id, { image: drivePublicUrl });
          
          // Update in local state
          updatedProducts[productIndex] = { ...updatedProducts[productIndex], image: drivePublicUrl };
          matchCount++;
        }
      }

      setProducts(updatedProducts);
      alert(`Đồng bộ hoàn tất! Đã cập nhật ${matchCount} sản phẩm.`);
    } catch (err: any) {
      console.error('Sync failed:', err);
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        clearAccessToken();
        setNeedsAuth(true);
      }
      alert('Lỗi khi đồng bộ: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setNeedsAuth(false);
        fetchDriveData();
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        fetchDriveData();
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      alert(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      const result = await uploadToDrive(token, file, undefined, selectedFolderId);
      await makeFilePublic(token, result.id);
      alert('Tải tập tin lên Google Drive thành công!');
      fetchDriveData();
    } catch (err: any) {
      console.error('Upload failed:', err);
      const isAuthError = err.message.includes('401') || 
                         err.message.includes('Unauthorized') || 
                         err.message.includes('invalid authentication credentials');
      
      if (isAuthError) {
        clearAccessToken();
        setNeedsAuth(true);
      }
      alert('Tải tập tin lên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <HardDrive size={64} className="text-gray-200 mb-6" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Kết nối Google Drive</h3>
        <p className="text-gray-500 text-sm mb-8 max-w-md text-center">
          Bạn cần đăng nhập bằng tài khoản Google để truy cập và quản lý các tập tin tài liệu của Tân Phát trên Google Drive.
        </p>
        <button
          onClick={handleSignIn}
          disabled={isLoggingIn}
          className="flex items-center gap-3 px-8 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all font-bold text-gray-700 active:scale-95 disabled:opacity-50"
        >
          {isLoggingIn ? (
            <Loader2 className="animate-spin text-[#9d171a]" size={20} />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
          )}
          <span>Đăng nhập với Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HardDrive className="text-[#9d171a]" />
            Tài liệu Google Drive
          </h3>
          <p className="text-xs text-gray-400 mt-1">Quản lý các báo cáo và tài liệu kỹ thuật của Tân Phát</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 min-w-[200px]">
            <Folder size={16} className="text-gray-400" />
            <select
              value={selectedFolderId}
              onChange={(e) => {
                const newFolderId = e.target.value;
                setSelectedFolderId(newFolderId);
                fetchDriveData(newFolderId);
              }}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none w-full cursor-pointer"
            >
              <option value="">Tất cả tập tin</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleSyncImages}
            disabled={loading || isSyncing || !selectedFolderId}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
            title="Đồng bộ hình ảnh sản phẩm theo mã"
          >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            ĐỒNG BỘ ẢNH SP
          </button>
          
          <button
            onClick={() => {
              fetchDriveData();
            }}
            className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
            title="Làm mới"
          >
            <RotateCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button className="px-6 py-2.5 bg-[#9d171a] text-white rounded-xl font-bold text-xs shadow-lg shadow-red-900/20 hover:bg-[#851215] transition-all flex items-center gap-2">
              <Plus size={18} />
              TẢI TÀI LIỆU LÊN
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
          <X size={20} />
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider text-gray-400 font-black border-b border-gray-100">
                  <th className="px-6 py-4 text-left">Tên tập tin</th>
                  <th className="px-6 py-4 text-left">Loại</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && files.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : files.length > 0 ? (
                  files.map((file: any) => (
                    <tr key={file.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                            <File size={20} />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                        {file.mimeType.split('.').pop()?.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-[#9d171a] hover:bg-red-50 rounded-lg transition-all"
                            title="Xem trên Drive"
                          >
                            <Eye size={18} />
                          </a>
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Mở tab mới"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center text-gray-400 italic">
                      Không tìm thấy tập tin nào trên Google Drive
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function QRZoomModal({ isOpen, onClose, qrCode, title = 'Mã QR' }: { isOpen: boolean, onClose: () => void, qrCode: string, title?: string }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-6"
      >
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {title.includes('QR') ? <QrCode className="text-[#9d171a]" size={20} /> : <div className="p-1 bg-red-50 text-[#9d171a] rounded"><Package size={16} /></div>}
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner">
          <img 
            src={qrCode} 
            alt="Zoomed Content" 
            className="w-full h-full object-contain" 
          />
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = qrCode;
              link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
              link.click();
            }}
            className="w-full py-4 bg-[#9d171a] text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-900/20 hover:bg-[#851215] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Download size={20} />
            TẢI XUỐNG ẢNH
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all uppercase tracking-wider"
          >
            ĐÓNG
          </button>
        </div>
      </motion.div>
    </div>
  );
}
