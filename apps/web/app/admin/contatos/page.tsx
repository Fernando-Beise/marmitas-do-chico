'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Eye, Plus, Search, Printer, Users, CalendarDays, Loader2, MessageCircleOff, Send  } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/services/api'

// Tipagem baseada no Cliente
type ClienteContato = {
  id: string
  nome: string
  telefone: string
  recebeNotificacoes: boolean
}

export default function ContatosPage() {
  const [contacts, setContacts] = useState<ClienteContato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
  })

  useEffect(() => {
    fetchContatos()
  }, [])

  const fetchContatos = async () => {
    try {
      const response = await api.get('/contatos')
      setContacts(response.data)
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search)
  )

  const activeCount = contacts.filter((c) => c.recebeNotificacoes).length

  const handleAddContact = async () => {
    if (formData.nome && formData.telefone) {
      try {
        setIsSaving(true)
        const response = await api.post('/contatos', formData)
        setContacts([...contacts, response.data])
        setFormData({ nome: '', telefone: '' })
        setIsModalOpen(false)
      } catch (error) {
        console.error('Erro ao adicionar cliente:', error)
        alert('Erro ao salvar contato.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setContacts(
        contacts.map((c) => (c.id === id ? { ...c, recebeNotificacoes: !currentStatus } : c))
      )
      await api.patch(`/contatos/${id}/status`, { ativo: !currentStatus })
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      setContacts(
        contacts.map((c) => (c.id === id ? { ...c, recebeNotificacoes: currentStatus } : c))
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Clientes & Transmissão
          </h1>
          <p className="text-muted-foreground">
            Gerencie os clientes que recebem o cardápio no WhatsApp
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/whatsapp">
            <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
              <Send className="h-4 w-4" />
              Enviar para os contatos
            </Button>
          </Link>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adicionar Cliente Manual
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes Registrados</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '-' : contacts.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <MessageCircleOff className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recebem o Cardápio no Zap</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '-' : activeCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Base de Clientes</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Cliente</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-right">Receber Mensagens?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Carregando carteira de clientes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.nome}</TableCell>
                    <TableCell>{contact.telefone}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end pr-4">
                        <Switch
                          checked={contact.recebeNotificacoes}
                          onCheckedChange={() => toggleActive(contact.id, contact.recebeNotificacoes)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Cliente Manualmente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Nome do Cliente
              </label>
              <Input
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Telefone (WhatsApp)
              </label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({ ...formData, telefone: e.target.value })
                }
                placeholder="Ex: 51 99999-9999"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddContact}
              disabled={isSaving || !formData.nome || !formData.telefone}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}