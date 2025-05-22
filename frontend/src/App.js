import { useState, useEffect } from 'react';
import { Menu, LogOut, PlusCircle, Trash2, RefreshCw, User, Check, X } from 'lucide-react';

// Thông tin xác thực Cognito
const TOKEN_KEY = 'whatToEat_token';
const USER_KEY = 'whatToEat_user';

// Cấu hình API và Cognito
const API_URL = window.env?.API_URL || 'https://vvbcaer9bc.execute-api.ap-southeast-1.amazonaws.com';
const COGNITO_DOMAIN = 'https://ap-southeast-15bnoogi8v.auth.ap-southeast-1.amazoncognito.com';
const CLIENT_ID = '2qkqfoug89p9qhfggcsflg4m24';
const REDIRECT_URI = window.location.origin;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState([]);
  const [randomDish, setRandomDish] = useState(null);
  const [newDishName, setNewDishName] = useState('');
  const [newDishImage, setNewDishImage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState('my-dishes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Kiểm tra trạng thái đăng nhập và xử lý callback Cognito khi ứng dụng khởi động
  useEffect(() => {
    // Kiểm tra nếu URL có chứa token từ Cognito (callback sau khi đăng nhập)
    if (window.location.hash && window.location.hash.includes('id_token')) {
      handleCognitoCallback();
    } else {
      // Kiểm tra nếu đã có token lưu trữ
      const token = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      
      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (e) {
          console.error('Error parsing saved user data:', e);
          logout(); // Xóa dữ liệu không hợp lệ
        }
      }
      
      setLoading(false);
    }
  }, []);

  // Xử lý callback từ Cognito sau khi đăng nhập
  const handleCognitoCallback = () => {
    try {
      setLoading(true);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get('id_token');
      const accessToken = hashParams.get('access_token');
      
      if (idToken && accessToken) {
        // Parse JWT token để lấy thông tin người dùng
        const payload = parseJwt(idToken);
        
        // Lưu token và thông tin người dùng
        localStorage.setItem(TOKEN_KEY, accessToken);
        const userData = {
          userId: payload.sub,
          username: payload.preferred_username || payload['cognito:username'] || payload.email.split('@')[0],
          email: payload.email
        };
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // Cập nhật state
        setUser(userData);
        
        // Xóa hash từ URL để tránh lưu token trong lịch sử trình duyệt
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError('Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error processing Cognito callback:', error);
      setError('Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm tiện ích để parse JWT token
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing JWT:', e);
      throw new Error('Invalid token format');
    }
  };

  // Lấy danh sách món ăn khi người dùng đã đăng nhập và tab thay đổi
  useEffect(() => {
    if (user) {
      fetchDishes();
    }
  }, [user, activeTab]);

  // Tạo thông báo tự động biến mất
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Hàm đăng nhập với Cognito
  const login = () => {
    // Chuyển hướng đến trang đăng nhập Cognito
    const cognitoLoginUrl = `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=token&scope=email+openid+phone&redirect_uri=https://dev.product-tracer.com`;
    window.location.href = cognitoLoginUrl;
  };

  // Hàm đăng xuất
  const logout = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Xóa dữ liệu lưu trữ local
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Cập nhật state
    setUser(null);
    setDishes([]);
    setRandomDish(null);
    
    // Tùy chọn: Đăng xuất khỏi Cognito
    if (token) {
      // Chuyển hướng đến trang đăng xuất Cognito
      const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
      window.location.href = logoutUrl;
    }
  };

  // Lấy danh sách món ăn
  const fetchDishes = async () => {
    try {
      setLoading(true);
      // Xác định phạm vi món ăn cần lấy
      const scope = activeTab === 'my-dishes' ? 'personal' : 'public';
      
      const response = await fetch(`${API_URL}/dishes?scope=${scope}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      });
      
      if (!response.ok) {
        // Kiểm tra lỗi xác thực
        if (response.status === 401 || response.status === 403) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setDishes(data.dishes || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách món ăn. Vui lòng thử lại sau.');
      console.error('Error fetching dishes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy món ăn ngẫu nhiên
  const getRandomDish = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/dishes/random?scope=${activeTab === 'my-dishes' ? 'personal' : 'all'}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      });
      
      if (!response.ok) {
        // Kiểm tra lỗi xác thực
        if (response.status === 401 || response.status === 403) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.dish) {
        setRandomDish(data.dish);
        setNotification(data.message || 'Hôm nay ăn món này nhé!');
      } else {
        setNotification('Không có món ăn nào để gợi ý!');
      }
    } catch (err) {
      setError('Không thể lấy món ăn ngẫu nhiên. Vui lòng thử lại sau.');
      console.error('Error getting random dish:', err);
    } finally {
      setLoading(false);
    }
  };

  // Thêm món ăn mới
  const addDish = async () => {
    if (!newDishName.trim()) {
      setError('Vui lòng nhập tên món ăn');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/dishes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        },
        body: JSON.stringify({
          dishName: newDishName,
          imageUrl: newDishImage || undefined, // Không gửi URL rỗng
          isPublic
        })
      });
      
      if (!response.ok) {
        // Kiểm tra lỗi xác thực
        if (response.status === 401 || response.status === 403) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Thêm món ăn mới vào danh sách hiện tại
      if (data.dish) {
        setDishes(prev => [data.dish, ...prev]);
      } else {
        // Fetch lại toàn bộ danh sách
        fetchDishes();
      }
      
      setNewDishName('');
      setNewDishImage('');
      setIsPublic(false);
      setNotification('Thêm món ăn thành công!');
      
      // Chuyển sang tab "Món ăn của tôi" sau khi thêm thành công
      setActiveTab('my-dishes');
    } catch (err) {
      setError('Không thể thêm món ăn. Vui lòng thử lại sau.');
      console.error('Error adding dish:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xóa món ăn
  const deleteDish = async (dishId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/dishes/${dishId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
        }
      });
      
      if (!response.ok) {
        // Kiểm tra lỗi xác thực
        if (response.status === 401 || response.status === 403) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Cập nhật state để xóa món ăn khỏi UI
      setDishes(prev => prev.filter(dish => dish.dishId !== dishId));
      
      // Nếu món ăn đang hiển thị là món được xóa, cập nhật lại
      if (randomDish && randomDish.dishId === dishId) {
        setRandomDish(null);
      }
      
      setNotification('Xóa món ăn thành công!');
    } catch (err) {
      setError('Không thể xóa món ăn. Vui lòng thử lại sau.');
      console.error('Error deleting dish:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận trước khi xóa
  const confirmDelete = (dishId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa món ăn này?')) {
      deleteDish(dishId);
    }
  };

  // Hiển thị trang đăng nhập nếu chưa đăng nhập
  if (!user && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-orange-600">Hôm Nay Ăn Gì?</h1>
            <p className="mt-2 text-gray-600">Ứng dụng giúp bạn chọn món ăn mỗi ngày</p>
          </div>
          
          <div className="mt-8">
            <button
              onClick={login}
              className="w-full px-4 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Đăng nhập với Cognito
            </button>
            <p className="mt-4 text-sm text-center text-gray-500">
              Đăng nhập để lưu trữ và quản lý các món ăn yêu thích của bạn!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị loading nếu đang xử lý
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-t-4 border-gray-200 rounded-full border-t-orange-500 animate-spin"></div>
          <p className="mt-4 text-gray-600">Đang xử lý đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-orange-600">Hôm Nay Ăn Gì?</h1>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>
        </div>
        
        {user && (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <User className="text-gray-600" size={20} />
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>
            
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    className={`flex items-center w-full px-4 py-2 rounded-md ${activeTab === 'my-dishes' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('my-dishes')}
                  >
                    Món ăn của tôi !!!!!!!!
                  </button>
                </li>
                <li>
                  <button
                    className={`flex items-center w-full px-4 py-2 rounded-md ${activeTab === 'public-dishes' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('public-dishes')}
                  >
                    Món ăn công khai
                  </button>
                </li>
                <li>
                  <button
                    className={`flex items-center w-full px-4 py-2 rounded-md ${activeTab === 'add-dish' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('add-dish')}
                  >
                    <PlusCircle size={18} className="mr-2" />
                    Thêm món ăn mới
                  </button>
                </li>
                <li className="pt-6 mt-6 border-t">
                  <button
                    className="flex items-center w-full px-4 py-2 text-red-600 rounded-md hover:bg-red-50"
                    onClick={logout}
                  >
                    <LogOut size={18} className="mr-2" />
                    Đăng xuất
                  </button>
                </li>
              </ul>
            </nav>
          </>
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white shadow-sm">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          {activeTab !== 'add-dish' && (
            <button
              onClick={getRandomDish}
              className="flex items-center px-4 py-2 font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <RefreshCw size={18} className="mr-2" />
              Gợi ý món ăn
            </button>
          )}
        </header>
        
        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 text-white bg-green-500 rounded-md shadow-lg">
            {notification}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 text-white bg-red-500 rounded-md shadow-lg">
            {error}
            <button 
              className="ml-2 font-bold"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}
        
        {/* Content */}
        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full border-t-orange-500 animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Random dish suggestion */}
              {randomDish && (
                <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
                  <h2 className="mb-4 text-2xl font-bold text-orange-600">Hôm nay ăn gì?</h2>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-6">
                      <img 
                        src={randomDish.imageUrl || '/api/placeholder/300/200'} 
                        alt={randomDish.dishName}
                        className="object-cover w-full h-48 rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{randomDish.dishName}</h3>
                      <div className="flex mt-4 space-x-3">
                        <button
                          onClick={getRandomDish}
                          className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                        >
                          Món khác
                        </button>
                        {activeTab === 'my-dishes' && (
                          <button
                            onClick={() => confirmDelete(randomDish.dishId)}
                            className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
                          >
                            Xóa món này
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tab content */}
              {activeTab === 'add-dish' ? (
                <div className="p-6 bg-white rounded-lg shadow-md">
                  <h2 className="mb-6 text-2xl font-bold">Thêm món ăn mới</h2>
                  <div>
                    <div className="mb-4">
                      <label htmlFor="dishName" className="block mb-2 text-sm font-medium text-gray-700">
                        Tên món ăn <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="dishName"
                        type="text"
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Nhập tên món ăn"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="imageUrl" className="block mb-2 text-sm font-medium text-gray-700">
                        URL Hình ảnh
                      </label>
                      <input
                        id="imageUrl"
                        type="text"
                        value={newDishImage}
                        onChange={(e) => setNewDishImage(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Nhập URL hình ảnh"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Để trống nếu không có hình ảnh
                      </p>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center">
                        <input
                          id="isPublic"
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="isPublic" className="ml-2 text-gray-700">
                          Công khai món ăn này
                        </label>
                      </div>
                    </div>
                    
                    <button
                      onClick={addDish}
                      className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    >
                      Thêm món ăn
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="mb-6 text-2xl font-bold">
                    {activeTab === 'my-dishes' ? 'Món ăn của tôi' : 'Món ăn công khai'}
                  </h2>
                  
                  {dishes.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-lg shadow-md">
                      <p className="text-gray-500">
                        {activeTab === 'my-dishes' 
                          ? 'Bạn chưa có món ăn nào. Hãy thêm món ăn mới!' 
                          : 'Không có món ăn công khai nào.'}
                      </p>
                      {activeTab === 'my-dishes' && (
                        <button
                          onClick={() => setActiveTab('add-dish')}
                          className="px-4 py-2 mt-4 text-white bg-orange-500 rounded-md hover:bg-orange-600"
                        >
                          Thêm món ăn
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {dishes.map(dish => (
                        <div key={dish.dishId} className="overflow-hidden bg-white rounded-lg shadow-md">
                          <div className="h-48">
                            <img 
                              src={dish.imageUrl || '/api/placeholder/300/200'} 
                              alt={dish.dishName}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-semibold">{dish.dishName}</h3>
                            {activeTab === 'public-dishes' && dish.username && (
                              <p className="text-sm text-gray-500">Đăng bởi: {dish.username}</p>
                            )}
                            <div className="flex justify-between mt-4">
                              {activeTab === 'my-dishes' && (
                                <button
                                  onClick={() => confirmDelete(dish.dishId)}
                                  className="flex items-center text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={16} className="mr-1" />
                                  Xóa
                                </button>
                              )}
                              {dish.isPublic && activeTab === 'my-dishes' && (
                                <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                                  Công khai
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}