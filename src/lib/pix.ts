import QRCode from 'qrcode'

interface PixParams {
  chave: string
  nome: string
  cidade: string
  valor?: number
  txid?: string
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function gerarBRCode(p: PixParams): string {
  const gui = tlv('00', 'br.gov.bcb.pix')
  const chave = tlv('01', p.chave)
  const mai = tlv('26', gui + chave)

  let payload = ''
  payload += tlv('00', '01') // format indicator
  payload += mai
  payload += tlv('52', '0000') // merchant category
  payload += tlv('53', '986') // BRL
  if (p.valor && p.valor > 0) {
    payload += tlv('54', p.valor.toFixed(2))
  }
  payload += tlv('58', 'BR')
  payload += tlv(
    '59',
    p.nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .substring(0, 25)
  )
  payload += tlv(
    '60',
    p.cidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .substring(0, 15)
  )

  if (p.txid) {
    payload += tlv('62', tlv('05', p.txid.substring(0, 25)))
  } else {
    payload += tlv('62', tlv('05', '***'))
  }

  payload += '6304'
  payload += crc16(payload)

  return payload
}

export async function gerarQRDataURL(p: PixParams): Promise<string> {
  const code = gerarBRCode(p)
  return QRCode.toDataURL(code, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}
