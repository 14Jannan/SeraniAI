import { NavLink } from "react-router-dom";
// 1. Import LogOut icon and useAuth hook
import { Home, MessageSquare, BookOpen, GraduationCap, LogOut } from "lucide-react"; 
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext"; // Import AuthContext

const Sidebar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  // 2. Get the logout function
  const { logout } = useAuth(); 

  const menuItems = [
    { name: "Home", icon: <Home size={20} />, path: "/" },
    { name: "AI Chat", icon: <MessageSquare size={20} />, path: "/chat" },
    { name: "Journal", icon: <BookOpen size={20} />, path: "/journal" },
    { name: "Courses", icon: <GraduationCap size={20} />, path: "/courses" },
  ];

  return (
    <div className="h-screen w-64 bg-[#A3B3F5] dark:bg-[#1A2332] text-white flex flex-col p-5 transition-colors duration-300">
      
      {/* Logo */}
      <h1 className="text-3xl font-bold mb-10 tracking-wide">SeraniAI</h1>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg transition-all ${
                isActive ? "bg-[#3B82F6] shadow-lg font-semibold" : "hover:bg-white/10 opacity-90"
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* BOTTOM SECTION */}
      <div className="space-y-4 pt-4 border-t border-white/20">
        
        {/* Theme Toggle */}
        <div className="bg-white/20 p-1 rounded-full flex text-xs font-medium">
          <button
            onClick={() => toggleTheme("light")}
            className={`flex-1 py-1.5 rounded-full transition ${theme === 'light' ? 'bg-pink-500 text-white shadow' : 'text-gray-200 hover:text-white'}`}
          >
            Light
          </button>
          <button
            onClick={() => toggleTheme("dark")}
            className={`flex-1 py-1.5 rounded-full transition ${theme === 'dark' ? 'bg-pink-500 text-white shadow' : 'text-gray-200 hover:text-white'}`}
          >
            Dark
          </button>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center justify-between bg-white/10 p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center font-bold shadow-sm">
              A
            </div>
            <div className="text-sm leading-tight">
              <p className="font-semibold">Alexandra</p>
              <p className="text-[10px] opacity-70">Free Plan</p>
            </div>
          </div>

          {/* 3. The Logout Button */}
          <button 
            onClick={logout} 
            title="Logout"
            className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-200 transition text-white/70"
          >
            <LogOut size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;