'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  MessageCircle,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Cardápio',
    href: '/admin/cardapio',
    icon: UtensilsCrossed,
  },
  {
    name: 'Pedidos',
    href: '/admin/pedidos',
    icon: ClipboardList,
  },
  {
    name: 'Contatos WhatsApp',
    href: '/admin/contatos',
    icon: MessageCircle,
  },
  {
    name: 'Relatórios',
    href: '/admin/relatorios',
    icon: FileText,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary">
          <UtensilsCrossed className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <span className="font-bold text-sidebar-foreground">
            Marmitas do Chico
          </span>
          <p className="text-xs text-muted-foreground">Painel Admin</p>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/"
          className="block rounded-lg border border-sidebar-border bg-sidebar-accent px-4 py-2 text-center text-sm text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/80"
        >
          Ver Loja
        </Link>
      </div>
    </aside>
  )
}
