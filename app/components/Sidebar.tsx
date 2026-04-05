'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState } from 'react'
import sikasLogo from '../../sikas_logo.jpeg'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Master Data', href: '/master-data', icon: '📁', children: [
    { name: 'Vehicles', href: '/master-data/vehicles', icon: '🚛' },
    { name: 'Drivers', href: '/master-data/drivers', icon: '👤' },
    { name: 'Clients', href: '/master-data/clients', icon: '🏢' },
    { name: 'Departments', href: '/master-data/departments', icon: '🏢' },
    { name: 'Tile Types', href: '/master-data/tile-types', icon: '🧱' },
  ]},
  { name: 'Orders', href: '/orders', icon: '📋' },
  { name: 'Fleet', href: '/fleet', icon: '🚚', children: [
    { name: 'Usage Logs', href: '/fleet/usage-logs', icon: '📝' },
    { name: 'Maintenance', href: '/fleet/maintenance', icon: '🔧' },
    { name: 'Fuel Tracking', href: '/fleet/fuel', icon: '⛽' },
  ]},
  { name: 'HR & Drivers', href: '/hr', icon: '👥', children: [
    { name: 'Attendance', href: '/hr/attendance', icon: '📅' },
    { name: 'Salaries', href: '/hr/salaries', icon: '💵' },
  ]},
  { name: 'Finance', href: '/finance', icon: '💰', children: [
    { name: 'Trips', href: '/finance/trips', icon: '🛣️' },
    { name: 'Expenses', href: '/finance/expenses', icon: '📊' },
    { name: 'Invoices', href: '/finance/invoices', icon: '📄' },
  ]},
  { name: 'CRM', href: '/crm', icon: '🤝', children: [
    { name: 'Contacts', href: '/crm/contacts', icon: '📞' },
    { name: 'Complaints', href: '/crm/complaints', icon: '⚠️' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Master Data', 'Fleet', 'HR & Drivers', 'Finance', 'CRM'])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    )
  }

  return (
    <div className={clsx(
      'bg-slate-800 text-white flex flex-col transition-all duration-300',
      isOpen ? 'w-64' : 'w-20'
    )}>
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 relative flex-shrink-0">
              <Image 
                src={sikasLogo} 
                alt="SIKAS Logo" 
                fill 
                className="object-contain rounded"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold">SIKAS ERP</h1>
              <p className="text-xs text-slate-400">Logistics</p>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 p-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{item.icon}</span>
                      {isOpen && <span>{item.name}</span>}
                    </div>
                    {isOpen && (
                      <span className={clsx(
                        'transition-transform duration-200',
                        expandedMenus.includes(item.name) ? 'rotate-180' : ''
                      )}>▼</span>
                    )}
                  </button>
                  {isOpen && expandedMenus.includes(item.name) && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={clsx(
                              'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                              pathname === child.href
                                ? 'bg-primary-600 text-white'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            )}
                          >
                            <span className="mr-2">{child.icon}</span>
                            {child.name}
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
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {isOpen && <span>{item.name}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
