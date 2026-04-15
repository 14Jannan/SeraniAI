import React, {useEffect, useState} from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { FiLogOut, FiSun, FiMoon, FiHome, FiMessageSquare, FiBook, FiGrid, FiCheckSquare } from 'react-icons/fi'

const UserLayout = () => {
  const {theme, toggleTheme}=useTheme();
  const navigate=useNavigate();
  const location = useLocation();
  const[user, setUser]=useState({name:'User'});

  const isChatPage = location.pathname.includes('/chat');

  useEffect(()=>{
    const userData=localStorage.getItem('user');
    if(userData){
      setUser(JSON.parse(userData));
    }
  },[]);

  const handleLogout=()=>{
    localStorage.clear();
    navigate('/login');
  };

  const menuItems=[
    {name:'Home', icon:<FiHome />, path:'/dashboard'},
    {name:'AI Chat', icon:<FiMessageSquare />, path:'/dashboard/chat'},
    {name:'Journal', icon:<FiBook />, path:'/dashboard/journal'},
    {name:'Courses', icon:<FiGrid />, path:'/dashboard/courses'},
    {name:'Daily Tasks', icon:<FiCheckSquare />, path:'/dashboard/tasks'}
  ];

  return (
    <div className='flex h-screen bg-[#f0f9ff] dark:bg-[#0F172A] transition-colors duration-300 font-sans'>
      <aside className='w-64 flex-shrink-0 bg-[#1e1b4b] dark:bg-[#0f172a] flex flex-col justify-between transition-colors duration-300 shadow-xl'>
        <div className='p-6'>
          <h1 className='text-3xl font-bold text-white mb-10 tracking-wide'>SeraniAI</h1>
          <nav className='space-y-2'>
            {menuItems.map((item)=>(
              <NavLink key={item.name} to={item.path} end={item.path==='/dashboard'}
              className={({isActive}) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-lg': `text-white/70 hover:bg-white/10 hover:text-white`}`}>
                  <span className='text-xl'>{item.icon}</span>
                  <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className='p-6 space-y-6'>
          <div className='bg-white/10 rounded-full p-1 flex'>
            <button 
              onClick={() => toggleTheme('light')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-full transition-all ${
                theme === 'light' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Light Mode
            </button>

            <button onClick={()=>toggleTheme('dark')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-full transition-all 
              ${theme==='dark' ? 'bg-indigo-600 text-white shadow-md': 'text-white/40 hover:text-white/70'}`}>
              Dark Mode
            </button>
          </div>

          <div className='border-t border-white/20 pt-4'>
            <div className='flex items-center gap-3 text-white mb-3'>
              <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-s font-bold border-2 border-white/20'>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm front-semibold truncate'>{user.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className='flex items-center gap-2 text-white/80 hover:text-white text-sm w-full'>
              <FiLogOut />Logout
            </button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 overflow-y-auto ${isChatPage ? 'p-0' : 'p-6'}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout;