'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState } from 'react'
import sikasLogo from '../../sikas_logo.jpeg'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Directory', href: '/master-data', icon: '📁', children: [
    { name: 'Vehicles', href: '/master-data/vehicles', icon: '🚛' },
    { name: 'Drivers', href: '/master-data/drivers', icon: '👤' },
    { name: 'Employees', href: '/master-data/employees', icon: '👥' },
    { name: 'Clients', href: '/master-data/clients', icon: '🏢' },
    { name: 'Departments', href: '/master-data/departments', icon: '🏢' },
    { name: 'Tile Inventory', href: '/master-data/tile-types', icon: '🧱' },
  ]},
  { name: 'Orders', href: '/orders', icon: '📋' },
  { name: 'HR', href: '/hr', icon: '👥', children: [
    { name: 'Attendance', href: '/hr/attendance', icon: '📅' },
    { name: 'Payroll', href: '/hr/salaries', icon: '💵' },
  ]},
  { name: 'Finance', href: '/finance', icon: '💰', children: [
    { name: 'Revenue', href: '/finance/revenue', icon: '📊' },
    { name: 'Invoices', href: '/finance/invoices', icon: '📄' },
    { name: 'Expenses', href: '/finance/expenses', icon: '💸' },
  ]},
  { name: 'Fleet', href: '/fleet', icon: '🚛', children: [
    { name: 'Fuel', href: '/fleet/fuel', icon: '⛽' },
    { name: 'Maintenance', href: '/fleet/maintenance', icon: '🔧' },
    { name: 'Trips', href: '/fleet/usage-logs', icon: '📝' },
  ]},
  { name: 'CRM', href: '/crm', icon: '🤝', children: [
    { name: 'Inquiries', href: '/crm/inquiries', icon: '📧' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Directory', 'Orders', 'HR'])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    )
  }

  return (
    <div className={clsx(
      'bg-slate-950 text-white flex flex-col transition-all duration-500 shadow-2xl z-20',
      isOpen ? 'w-80' : 'w-24'
    )}>
      <div className="p-8 flex items-center justify-between border-b border-white/5">
        {isOpen && (
          <div className="flex items-center space-x-4 group">
            <div className="w-12 h-12 relative flex-shrink-0 grayscale group-hover:grayscale-0 transition-all duration-500">
              <Image 
                src={sikasLogo} 
                alt="SIKAS" 
                fill 
                className="object-contain rounded-xl shadow-lg ring-1 ring-white/10"
              />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter leading-none">SIKAS<span className="text-sky-500 font-black"> ERP</span></h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Command v2.0</p>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-sky-500 transition-all text-xs"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 mt-4 scrollbar-hide">
        <ul className="space-y-4">
          {navigation.map((item) => (
            <li key={item.name} className="space-y-2">
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all",
                      expandedMenus.includes(item.name) ? "bg-white/5" : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center">
                      <span className="mr-3 text-lg opacity-80">{item.icon}</span>
                      {isOpen && <span className="text-[11px] font-black uppercase tracking-widest italic text-slate-400 group-hover:text-white transition-colors">{item.name}</span>}
                    </div>
                    {isOpen && (
                      <span className={clsx(
                        'text-[10px] transition-transform duration-300 opacity-30',
                        expandedMenus.includes(item.name) ? 'rotate-180' : ''
                      )}>▼</span>
                    )}
                  </button>
                  {isOpen && expandedMenus.includes(item.name) && (
                    <ul className="ml-6 py-2 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={clsx(
                              'flex items-center px-5 py-3 rounded-xl transition-all group',
                              pathname === child.href
                                ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            )}
                          >
                            <span className="mr-3 text-sm">{child.icon}</span>
                            <span className="text-xs font-bold tracking-tight">{child.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center px-4 py-4 rounded-2xl transition-all group',
                    pathname === item.href
                      ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="mr-3 text-lg opacity-80 group-hover:opacity-100">{item.icon}</span>
                  {isOpen && <span className="text-[11px] font-black uppercase tracking-widest italic">{item.name}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-8 border-t border-white/5">
         <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 italic">Status</p>
            <p className="text-xs font-black text-emerald-500 uppercase flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
               System Online
            </p>
         </div>
      </div>
    </div>
  )
}
