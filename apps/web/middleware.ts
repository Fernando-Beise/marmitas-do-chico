import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Pega o token de quando o admin fez login
  const token = request.cookies.get('token')?.value || request.cookies.get('@marmitas:token')?.value
  // Se a pessoa tentar acessar /admin sem o token redireciona ela de volta para a página de login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se tiver o token, deixa passar
  return NextResponse.next()
}

// páginas de segurança
export const config = {
  matcher: ['/admin/:path*']
}