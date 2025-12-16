import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Dog, Calendar, DollarSign, Plus, X, Edit2, Trash2, 
  Save, ArrowLeft, TrendingUp, Bell, Settings, Menu,
  ChevronLeft, ChevronRight, Filter, PieChart
} from 'lucide-react';
import './App.css';

// Supabase configuration - REPLACE WITH YOUR CREDENTIALS
const SUPABASE_URL = 'https://ezqhzkugtgzhxlrelhwx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6cWh6a3VndGd6aHhscmVsaHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTU1MjAsImV4cCI6MjA4MTM5MTUyMH0.QzGNqeWDGR7M7bKjeLJnCo8aDgWa-9LZt_2VYgPtHdU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Base prices
const BASE_PRICES = {
  small: 1500,
  medium: 2000,
  large: 3000
};

// Dog colors for calendar
const DOG_COLORS = [
  '#4c9aff', '#9d5fff', '#ff5fa2', '#00d4aa', '#ffb84d',
  '#ff5757', '#5fedff', '#a8ff5f', '#ff9d5f', '#d45fff'
];

function App() {
  const [view, setView] = useState('calendar'); // calendar, dogs, bookings, reports, settings
  const [dogs, setDogs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null); // dog, booking, expense
  const [editingItem, setEditingItem] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load data from Supabase
  useEffect(() => {
    loadData();
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dogsData, bookingsData, expensesData] = await Promise.all([
        supabase.from('dogs').select('*').order('name'),
        supabase.from('bookings').select('*').order('check_in', { ascending: false }),
        supabase.from('expenses').select('*')
      ]);

      if (dogsData.data) setDogs(dogsData.data);
      if (bookingsData.data) setBookings(bookingsData.data);
      if (expensesData.data) setExpenses(expensesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных. Проверьте подключение к Supabase.');
    }
    setLoading(false);
  };

  const checkNotifications = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingBookings = bookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return (
        (isSameDay(checkIn, tomorrow) && b.status === 'upcoming') ||
        (isSameDay(checkOut, tomorrow) && b.status === 'active')
      );
    });

    setNotifications(upcomingBookings.map(b => {
      const dog = dogs.find(d => d.id === b.dog_id);
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      
      if (isSameDay(checkIn, tomorrow)) {
        return { type: 'check-in', dog: dog?.name, date: checkIn };
      } else {
        return { type: 'check-out', dog: dog?.name, date: checkOut };
      }
    }));
  };

  // CRUD operations
  const saveDog = async (dogData) => {
    try {
      if (editingItem) {
        await supabase.from('dogs').update(dogData).eq('id', editingItem.id);
      } else {
        await supabase.from('dogs').insert([dogData]);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving dog:', error);
      alert('Ошибка сохранения');
    }
  };

  const deleteDog = async (id) => {
    if (!confirm('Удалить собаку? Все связанные брони также будут удалены.')) return;
    try {
      await supabase.from('dogs').delete().eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting dog:', error);
      alert('Ошибка удаления');
    }
  };

  const saveBooking = async (bookingData) => {
  try {
    // Удаляем read-only поля (вычисляются автоматически)
    const { total_days, created_at, updated_at, ...cleanData } = bookingData;
    
    if (editingItem) {
      // Обновление существующей брони
      const { data, error } = await supabase
        .from('bookings')
        .update(cleanData)
        .eq('id', editingItem.id);
      
      if (error) throw error;
    } else {
      // Создание новой брони
      const { data, error } = await supabase
        .from('bookings')
        .insert([cleanData]);
      
      if (error) throw error;
    }
    
    await loadData();
    closeModal();
  } catch (error) {
    console.error('Error saving booking:', error);
    alert('Ошибка сохранения: ' + error.message);
  }
};

  const deleteBooking = async (id) => {
    if (!confirm('Удалить бронь?')) return;
    try {
      await supabase.from('bookings').delete().eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Ошибка удаления');
    }
  };

  const saveExpense = async (expenseData) => {
    try {
      if (editingItem) {
        await supabase.from('expenses').update(expenseData).eq('id', editingItem.id);
      } else {
        await supabase.from('expenses').insert([expenseData]);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Ошибка сохранения');
    }
  };

  const deleteExpense = async (id) => {
    if (!confirm('Удалить издержку?')) return;
    try {
      await supabase.from('expenses').delete().eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Ошибка удаления');
    }
  };

  // Calculate booking total
  const calculateBookingTotal = (booking) => {
    const pricePerDay = booking.custom_price_per_day || booking.base_price_per_day;
    const regularDays = booking.total_days - (booking.holiday_days || 0);
    const regularTotal = regularDays * pricePerDay;
    const holidayTotal = (booking.holiday_days || 0) * (pricePerDay + (booking.holiday_price_add || 0));
    const bookingExpenses = expenses.filter(e => e.booking_id === booking.id);
    const expensesTotal = bookingExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return regularTotal + holidayTotal - expensesTotal;
  };

  // Get dog color
  const getDogColor = (dogId) => {
    const index = dogs.findIndex(d => d.id === dogId);
    return DOG_COLORS[index % DOG_COLORS.length];
  };

  // Modal handlers
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header 
        view={view}
        setView={setView}
        notifications={notifications}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      <main className="main-content">
        {view === 'calendar' && (
          <CalendarView
            dogs={dogs}
            bookings={bookings}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            getDogColor={getDogColor}
            openModal={openModal}
            calculateBookingTotal={calculateBookingTotal}
          />
        )}

        {view === 'dogs' && (
          <DogsView
            dogs={dogs}
            bookings={bookings}
            openModal={openModal}
            deleteDog={deleteDog}
            calculateBookingTotal={calculateBookingTotal}
          />
        )}

        {view === 'bookings' && (
          <BookingsView
            dogs={dogs}
            bookings={bookings}
            expenses={expenses}
            openModal={openModal}
            deleteBooking={deleteBooking}
            deleteExpense={deleteExpense}
            getDogColor={getDogColor}
            calculateBookingTotal={calculateBookingTotal}
          />
        )}

        {view === 'reports' && (
          <ReportsView
            bookings={bookings}
            expenses={expenses}
            dogs={dogs}
            calculateBookingTotal={calculateBookingTotal}
          />
        )}
      </main>

      {showModal && (
        <Modal
          type={modalType}
          item={editingItem}
          dogs={dogs}
          bookings={bookings}
          onClose={closeModal}
          onSave={modalType === 'dog' ? saveDog : modalType === 'booking' ? saveBooking : saveExpense}
        />
      )}
    </div>
  );
}

// Header Component
function Header({ view, setView, notifications, showMobileMenu, setShowMobileMenu }) {
  return (
    <header className="header glass">
      <div className="header-left">
        <div className="logo">
          <Dog size={32} />
          <span>Perederzhka SPB</span>
        </div>
      </div>

      <nav className={`nav ${showMobileMenu ? 'nav-open' : ''}`}>
        <button
          className={`nav-btn ${view === 'calendar' ? 'active' : ''}`}
          onClick={() => { setView('calendar'); setShowMobileMenu(false); }}
        >
          <Calendar size={20} />
          <span>Календарь</span>
        </button>
        <button
          className={`nav-btn ${view === 'dogs' ? 'active' : ''}`}
          onClick={() => { setView('dogs'); setShowMobileMenu(false); }}
        >
          <Dog size={20} />
          <span>Собаки</span>
        </button>
        <button
          className={`nav-btn ${view === 'bookings' ? 'active' : ''}`}
          onClick={() => { setView('bookings'); setShowMobileMenu(false); }}
        >
          <Filter size={20} />
          <span>Брони</span>
        </button>
        <button
          className={`nav-btn ${view === 'reports' ? 'active' : ''}`}
          onClick={() => { setView('reports'); setShowMobileMenu(false); }}
        >
          <PieChart size={20} />
          <span>Отчёты</span>
        </button>
      </nav>

      <div className="header-right">
        {notifications.length > 0 && (
          <div className="notification-badge">
            <Bell size={20} />
            <span className="badge">{notifications.length}</span>
          </div>
        )}
        <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}

// Calendar View Component
function CalendarView({ dogs, bookings, currentMonth, setCurrentMonth, getDogColor, openModal, calculateBookingTotal }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookingsForDay = (day) => {
    return bookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return isWithinInterval(day, { start: checkIn, end: checkOut }) && b.status !== 'cancelled';
    });
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="calendar-view">
      <div className="calendar-header glass">
        <button onClick={prevMonth} className="icon-btn">
          <ChevronLeft size={24} />
        </button>
        <h2>{format(currentMonth, 'LLLL yyyy', { locale: ru })}</h2>
        <button onClick={nextMonth} className="icon-btn">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="calendar-grid">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {days.map(day => {
          const dayBookings = getBookingsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              className={`calendar-day glass ${isToday ? 'today' : ''}`}
            >
              <div className="day-number">{format(day, 'd')}</div>
              <div className="day-bookings">
                {dayBookings.map(booking => {
                  const dog = dogs.find(d => d.id === booking.dog_id);
                  return (
                    <div
                      key={booking.id}
                      className="day-booking"
                      style={{ backgroundColor: getDogColor(booking.dog_id) }}
                      title={dog?.name}
                    >
                      {dog?.name}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button className="fab" onClick={() => openModal('booking')}>
        <Plus size={24} />
      </button>
    </div>
  );
}

// Dogs View Component  
function DogsView({ dogs, bookings, openModal, deleteDog, calculateBookingTotal }) {
  const getDogStats = (dogId) => {
    const dogBookings = bookings.filter(b => b.dog_id === dogId && b.status === 'completed');
    const totalRevenue = dogBookings.reduce((sum, b) => sum + calculateBookingTotal(b), 0);
    const totalDays = dogBookings.reduce((sum, b) => sum + b.total_days, 0);
    return { totalRevenue, totalDays, bookingsCount: dogBookings.length };
  };

  return (
    <div className="dogs-view">
      <div className="view-header">
        <h2>Собаки</h2>
        <button className="btn btn-primary" onClick={() => openModal('dog')}>
          <Plus size={20} />
          Добавить собаку
        </button>
      </div>

      <div className="dogs-grid">
        {dogs.map(dog => {
          const stats = getDogStats(dog.id);
          return (
            <div key={dog.id} className="dog-card glass fade-in">
              <div className="dog-card-header">
                <div className="dog-info">
                  <h3>{dog.name}</h3>
                  <span className="dog-breed">{dog.breed || 'Порода не указана'}</span>
                  <span className={`badge badge-${dog.breed_size}`}>
                    {dog.breed_size === 'small' ? 'Малая' : dog.breed_size === 'medium' ? 'Средняя' : 'Большая'}
                  </span>
                </div>
                <div className="dog-actions">
                  <button className="icon-btn" onClick={() => openModal('dog', dog)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="icon-btn danger" onClick={() => deleteDog(dog.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {dog.comment && (
                <p className="dog-comment">{dog.comment}</p>
              )}

              {(dog.owner_name || dog.owner_phone) && (
                <div className="dog-owner">
                  <strong>Владелец:</strong>
                  {dog.owner_name && <span>{dog.owner_name}</span>}
                  {dog.owner_phone && <span>{dog.owner_phone}</span>}
                </div>
              )}

              <div className="dog-stats">
                <div className="stat">
                  <span className="stat-label">LTV</span>
                  <span className="stat-value">{stats.totalRevenue.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Броней</span>
                  <span className="stat-value">{stats.bookingsCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Дней</span>
                  <span className="stat-value">{stats.totalDays}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Bookings View Component
function BookingsView({ dogs, bookings, expenses, openModal, deleteBooking, deleteExpense, getDogColor, calculateBookingTotal }) {
  const [filter, setFilter] = useState('all'); // all, active, upcoming, completed, cancelled

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  return (
    <div className="bookings-view">
      <div className="view-header">
        <h2>Брони</h2>
        <button className="btn btn-primary" onClick={() => openModal('booking')}>
          <Plus size={20} />
          Новая бронь
        </button>
      </div>

      <div className="filters glass">
        {['all', 'upcoming', 'active', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Все' : 
             f === 'upcoming' ? 'Будущие' :
             f === 'active' ? 'Активные' :
             f === 'completed' ? 'Завершённые' : 'Отменённые'}
          </button>
        ))}
      </div>

      <div className="bookings-list">
        {filteredBookings.map(booking => {
          const dog = dogs.find(d => d.id === booking.dog_id);
          const bookingExpenses = expenses.filter(e => e.booking_id === booking.id);
          const total = calculateBookingTotal(booking);

          return (
            <div key={booking.id} className="booking-card glass fade-in">
              <div className="booking-header">
                <div className="booking-dog">
                  <div 
                    className="dog-badge"
                    style={{ backgroundColor: getDogColor(booking.dog_id) }}
                  >
                    {dog?.name || 'Неизвестно'}
                  </div>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status === 'active' ? 'Активна' :
                     booking.status === 'upcoming' ? 'Будущая' :
                     booking.status === 'completed' ? 'Завершена' : 'Отменена'}
                  </span>
                </div>
                <div className="booking-actions">
                  <button className="icon-btn" onClick={() => openModal('booking', booking)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="icon-btn" onClick={() => openModal('expense', { booking_id: booking.id })}>
                    <DollarSign size={18} />
                  </button>
                  <button className="icon-btn danger" onClick={() => deleteBooking(booking.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="booking-dates">
                <span>Заезд: {format(parseISO(booking.check_in), 'd MMMM yyyy', { locale: ru })}</span>
                <span>Выезд: {format(parseISO(booking.check_out), 'd MMMM yyyy', { locale: ru })}</span>
                <span>Дней: {booking.total_days}</span>
              </div>

              <div className="booking-pricing">
                <div className="price-row">
                  <span>Базовая цена:</span>
                  <span>{(booking.custom_price_per_day || booking.base_price_per_day).toLocaleString('ru-RU')} ₽/день</span>
                </div>
                {booking.holiday_days > 0 && (
                  <div className="price-row">
                    <span>Праздничных дней ({booking.holiday_days}):</span>
                    <span>+{booking.holiday_price_add.toLocaleString('ru-RU')} ₽/день</span>
                  </div>
                )}
                {bookingExpenses.length > 0 && (
                  <div className="price-row">
                    <span>Издержки:</span>
                    <span className="text-danger">
                      -{bookingExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Итого:</span>
                  <span className="total-amount">{total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {bookingExpenses.length > 0 && (
                <div className="booking-expenses">
                  <strong>Издержки:</strong>
                  {bookingExpenses.map(exp => (
                    <div key={exp.id} className="expense-item">
                      <span>{exp.name}</span>
                      <span>{parseFloat(exp.amount).toLocaleString('ru-RU')} ₽</span>
                      <button className="icon-btn small danger" onClick={() => deleteExpense(exp.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {booking.notes && (
                <div className="booking-notes">
                  <strong>Заметки:</strong>
                  <p>{booking.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reports View Component
function ReportsView({ bookings, expenses, dogs, calculateBookingTotal }) {
  const [period, setPeriod] = useState('month'); // month, quarter, year, all
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const getFilteredBookings = () => {
    return bookings.filter(b => {
      const checkIn = parseISO(b.check_in);
      return checkIn >= parseISO(startDate) && checkIn <= parseISO(endDate);
    });
  };

  const filteredBookings = getFilteredBookings();
  const completedBookings = filteredBookings.filter(b => b.status === 'completed');
  const upcomingBookings = filteredBookings.filter(b => b.status === 'upcoming' || b.status === 'active');

  const totalRevenue = completedBookings.reduce((sum, b) => sum + calculateBookingTotal(b), 0);
  const potentialRevenue = upcomingBookings.reduce((sum, b) => sum + calculateBookingTotal(b), 0);
  const totalExpenses = expenses
    .filter(e => completedBookings.some(b => b.id === e.booking_id))
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const topDogs = dogs.map(dog => {
    const dogBookings = completedBookings.filter(b => b.dog_id === dog.id);
    const revenue = dogBookings.reduce((sum, b) => sum + calculateBookingTotal(b), 0);
    return { dog, revenue, bookings: dogBookings.length };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="reports-view">
      <div className="view-header">
        <h2>Финансовые отчёты</h2>
      </div>

      <div className="period-selector glass">
        <div className="date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon success">
            <DollarSign size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Доход (завершённые)</span>
            <span className="stat-value">{totalRevenue.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon warning">
            <TrendingUp size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Потенциальный доход</span>
            <span className="stat-value">{potentialRevenue.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon danger">
            <DollarSign size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Издержки</span>
            <span className="stat-value">{totalExpenses.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon primary">
            <Filter size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Броней за период</span>
            <span className="stat-value">{filteredBookings.length}</span>
          </div>
        </div>
      </div>

      <div className="top-dogs glass">
        <h3>Топ собак по выручке</h3>
        <div className="top-dogs-list">
          {topDogs.map((item, index) => (
            <div key={item.dog.id} className="top-dog-item">
              <span className="rank">#{index + 1}</span>
              <span className="dog-name">{item.dog.name}</span>
              <span className="dog-bookings">{item.bookings} броней</span>
              <span className="dog-revenue">{item.revenue.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modal Component
function Modal({ type, item, dogs, bookings, onClose, onSave }) {
  const [formData, setFormData] = useState(() => {
    if (type === 'dog') {
      return item || {
        name: '',
        breed: '',
        breed_size: 'medium',
        comment: '',
        owner_name: '',
        owner_phone: ''
      };
    } else if (type === 'booking') {
      return item || {
        dog_id: dogs[0]?.id || '',
        check_in: format(new Date(), 'yyyy-MM-dd'),
        check_out: format(new Date(), 'yyyy-MM-dd'),
        status: 'upcoming',
        base_price_per_day: BASE_PRICES.medium,
        custom_price_per_day: null,
        holiday_days: 0,
        holiday_price_add: 0,
        notes: ''
      };
    } else {
      return item || {
        booking_id: item?.booking_id || bookings[0]?.id || '',
        name: '',
        amount: 0
      };
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (type === 'booking') {
      const selectedDog = dogs.find(d => d.id === formData.dog_id);
      if (selectedDog) {
        formData.base_price_per_day = BASE_PRICES[selectedDog.breed_size];
      }
    }

    onSave(formData);
  };

  const handleDogChange = (dogId) => {
    const dog = dogs.find(d => d.id === dogId);
    setFormData({
      ...formData,
      dog_id: dogId,
      base_price_per_day: dog ? BASE_PRICES[dog.breed_size] : BASE_PRICES.medium
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {type === 'dog' ? (item ? 'Редактировать собаку' : 'Новая собака') :
             type === 'booking' ? (item ? 'Редактировать бронь' : 'Новая бронь') :
             (item?.id ? 'Редактировать издержку' : 'Новая издержка')}
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {type === 'dog' && (
            <>
              <div className="form-group">
                <label>Кличка *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Размер породы *</label>
                <select
                  value={formData.breed_size}
                  onChange={(e) => setFormData({ ...formData, breed_size: e.target.value })}
                  required
                >
                  <option value="small">Малая (1500 ₽/день)</option>
                  <option value="medium">Средняя (2000 ₽/день)</option>
                  <option value="large">Большая (3000 ₽/день)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Порода</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Имя владельца</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Телефон владельца</label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                />
              </div>
            </>
          )}

          {type === 'booking' && (
            <>
              <div className="form-group">
                <label>Собака *</label>
                <select
                  value={formData.dog_id}
                  onChange={(e) => handleDogChange(e.target.value)}
                  required
                >
                  {dogs.map(dog => (
                    <option key={dog.id} value={dog.id}>
                      {dog.name} ({dog.breed_size === 'small' ? 'Малая' : dog.breed_size === 'medium' ? 'Средняя' : 'Большая'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Дата заезда *</label>
                  <input
                    type="date"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Дата выезда *</label>
                  <input
                    type="date"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Статус *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="upcoming">Будущая</option>
                  <option value="active">Активная</option>
                  <option value="completed">Завершённая</option>
                  <option value="cancelled">Отменённая</option>
                </select>
              </div>

              <div className="form-group">
                <label>Базовая цена: {formData.base_price_per_day} ₽/день</label>
              </div>

              <div className="form-group">
                <label>Своя цена (опционально)</label>
                <input
                  type="number"
                  value={formData.custom_price_per_day || ''}
                  onChange={(e) => setFormData({ ...formData, custom_price_per_day: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Оставьте пустым для базовой цены"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Праздничных дней</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.holiday_days}
                    onChange={(e) => setFormData({ ...formData, holiday_days: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label>Доплата за праздник (₽/день)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.holiday_price_add}
                    onChange={(e) => setFormData({ ...formData, holiday_price_add: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Заметки</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          )}

          {type === 'expense' && (
            <>
              <div className="form-group">
                <label>Бронь *</label>
                <select
                  value={formData.booking_id}
                  onChange={(e) => setFormData({ ...formData, booking_id: e.target.value })}
                  required
                >
                  {bookings.filter(b => b.status !== 'cancelled').map(booking => {
                    const dog = dogs.find(d => d.id === booking.dog_id);
                    return (
                      <option key={booking.id} value={booking.id}>
                        {dog?.name} ({format(parseISO(booking.check_in), 'd MMM', { locale: ru })} - {format(parseISO(booking.check_out), 'd MMM', { locale: ru })})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Памперсы, Химчистка"
                  required
                />
              </div>

              <div className="form-group">
                <label>Сумма *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={20} />
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
