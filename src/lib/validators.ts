import { z } from 'zod'

export const cadastroSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

export const lojaSchema = z.object({
  nome_loja: z.string().min(2, 'Nome da loja deve ter pelo menos 2 caracteres'),
})

export const pixSchema = z.object({
  pix_tipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']),
  pix_chave: z.string().min(1, 'Chave Pix é obrigatória'),
  pix_nome: z.string().min(1, 'Nome do beneficiário é obrigatório'),
  pix_cidade: z.string().min(1, 'Cidade é obrigatória'),
})

export const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  apelido: z.string().optional(),
})

export const notaSchema = z.object({
  cliente_id: z.string().uuid(),
  descricao: z.string().optional(),
  itens: z.array(z.object({
    descricao: z.string(),
    quantidade: z.number().positive(),
    valor_unitario: z.number().positive(),
  })).optional(),
  valor: z.number().positive('Valor deve ser maior que zero'),
  data_vencimento: z.string().nullable(),
})

export const profileSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
})

export type CadastroInput = z.infer<typeof cadastroSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LojaInput = z.infer<typeof lojaSchema>
export type PixInput = z.infer<typeof pixSchema>
export type ClienteInput = z.infer<typeof clienteSchema>
export type NotaInput = z.infer<typeof notaSchema>
export type ProfileInput = z.infer<typeof profileSchema>
