import QRCode from 'qrcode'
import * as PIX from 'pixbr'

interface PixParams {
  chave: string
  nome: string
  cidade: string
  valor?: number
  txid?: string
}

export function gerarBRCode(p: PixParams): string {
  // Cria mensagem estática Pix
  const msg = new PIX.Messages.Static(p.chave, p.nome.toUpperCase(), p.cidade.toUpperCase())
  
  // Adiciona valor se existir
  if (p.valor && p.valor > 0) {
    msg.setField(new PIX.Fields.Transaction_Amount(p.valor))
  }
  
  // Adiciona TXID (identificador da transação)
  if (p.txid) {
    const additionalData = new PIX.Groups.Grp_Additional_Data_Field()
    additionalData.Children.push(new PIX.Fields.Additional_Data_Field('05', p.txid.substring(0, 25)))
    msg.setField(additionalData)
  }
  
  // Retorna o BRCode válido
  return msg.getStringValue()
}

export async function gerarQRDataURL(p: PixParams): Promise<string> {
  const code = gerarBRCode(p)
  console.log('BRCode gerado:', code)
  
  return QRCode.toDataURL(code, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

// Função para validar se o BRCode está correto
export function validarBRCode(brcode: string): boolean {
  try {
    // Verifica se começa com o formato correto (000201)
    if (!brcode.startsWith('000201')) {
      return false
    }
    
    // Verifica se tem o CRC16 no final
    if (!brcode.includes('6304')) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}
