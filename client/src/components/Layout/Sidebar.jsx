import { NavLink } from "react-router-dom"
import { Home, Zap, BarChart3, Wallet, Target, Bell, User, X } from "lucide-react"

export default function Sidebar({ isOpen, onClose }) {
  const menuItems = [
    { 
      name: "Home", 
      path: "/dashboard", 
      icon: Home, 
      textColor: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    { 
      name: "Energy Data", 
      path: "/energy", 
      icon: Zap, 
      textColor: "text-green-600",
      bgColor: "bg-green-50"
    },
    { 
      name: "Analytics", 
      path: "/analytics", 
      icon: BarChart3, 
      textColor: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    { 
      name: "Billing", 
      path: "/billing", 
      icon: Wallet, 
      textColor: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    { 
      name: "Budget", 
      path: "/budget", 
      icon: Target, 
      textColor: "text-teal-600",
      bgColor: "bg-teal-50"
    },
    { 
      name: "Alerts", 
      path: "/alerts", 
      icon: Bell, 
      textColor: "text-red-600",
      bgColor: "bg-red-50"
    },
    { 
      name: "Profile", 
      path: "/profile", 
      icon: User, 
      textColor: "text-gray-600",
      bgColor: "bg-gray-50"
    }
  ]

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? `${item.bgColor} ${item.textColor} border-l-4 border-current font-semibold`
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}