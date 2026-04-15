import React, {useEffect, useState} from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { FiLogOut, FiSun, FiMoon, FiHome, FiMessageSquare, FiBook, FiGrid, FiChevronLeft } from 'react-icons/fi'

const UserLayout = () => {
  const {theme, toggleTheme}=useTheme();
  const navigate=useNavigate();
  const[user, setUser]=useState({name:'User'});

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
    {name:'Courses', icon:<FiGrid />, path:'/dashboard/courses'}
  ];
  return (
    <div className='flex h-screen bg-[#f0f9ff] dark:bg-[1#f2937] transition-colors duration-300 font-sans'>
      <aside className='w-64 flex-shrink-0 bg-[#8cbbf1] dark:bg-[#111827] flex flex-col justify-between transition-colors duration-300'>
        <div className='p-6'>
          <h1 className='text-3xl font-bold text-white mb-10 tracking-wide'>SeraniAI</h1>
          <nav className='space-y-2'>
            {menuItems.map((item)=>(
              <NavLink key={item.name} to={item.path} end={item.path==='/dashboard'}
              className={({isActive}) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#1e40af] text-white shadow-md': `text-white/80 hover:bg-white/10 hover:text-white`}`}>
                  <span className='text-xl'>{item.icon}</span>
                  <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className='p-6 space-y-6'>
          <div className='bg-black/20 dark:bg-white/10 rounded-full p-1 flex'>
            <button 
              onClick={() => toggleTheme('light')}
              className={`flex-1 text-xs font-bold py-1.5 rounded-full transition-all ${
                theme === 'light' ? 'bg-pink-500 text-white shadow' : 'text-white/70'
              }`}
            >
              Light mode
            </button>

            <button onClick={()=>toggleTheme('dark')}
              className={`flex-1 text-xs font-bold py-1.5 rounded-full transition-all 
              ${theme==='dark' ? 'bg-pink-500 text-white shadow': 'text-white/70'}`}>
              Dark mode
            </button>
          </div>

          {/*User Profile / Logout*/}
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
      <main className='flex-1 p-8 overflow-y-auto'>
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout