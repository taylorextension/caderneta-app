import QRCode from "qrcode";

interface PixParams {
  chave: string;        // Chave Pix (CPF sem pontos, CNPJ, email, telefone com +55)
  nome: string;         // Nome do recebedor (máx 25 chars)
  cidade: string;       // Cidade do recebedor (máx 15 chars)
  valor?: number;       // Valor opcional
  txid?: string;        // Identificador da transação (opcional, default: "***")
  infoAdicional?: string; // Informação adicional (opcional, máx 72 chars)
}

// Remove acentos e caracteres especiais para o padrão EMV
function sanitizeMerchantText(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toUpperCase()
    .substring(0, maxLen);
}

// Normaliza chave Pix (remove espaços, garante formato correto)
function normalizePixKey(key: string): string {
  return key.trim();
}

// Normaliza TXID (alfanumérico, máx 25 chars)
function normalizeTxid(txid?: string): string {
  if (!txid) return "***";
  return txid.replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";
}

// Formata valor com 2 casas decimais
function formatAmount(valor: number): string {
  return valor.toFixed(2);
}

// TLV: Tag + Length + Value
function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

// Template: Tag + Length + (concatenação de valores TLV)
function template(tag: string, children: string[]): string {
  const value = children.join("");
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

// CRC16-CCITT com polinômio 0x1021 e inicial 0xFFFF
function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o BR Code Pix (payload EMV) válido conforme especificação do Banco Central.
 */
export function gerarBRCode(p: PixParams): string {
  // Sanitiza dados do recebedor
  const merchantName = sanitizeMerchantText(p.nome, 25);
  const merchantCity = sanitizeMerchantText(p.cidade, 15);
  const pixKey = normalizePixKey(p.chave);
  
  // Info adicional opcional (máx 72 chars)
  const infoAdicional = p.infoAdicional 
    ? sanitizeMerchantText(p.infoAdicional, 72) 
    : undefined;

  // 00: Payload Format Indicator = "01"
  const fields: string[] = [tlv("00", "01")];

  // 26: Merchant Account Information (Pix)
  // - 00: GUI = br.gov.bcb.pix
  // - 01: chave
  // - 02: infoAdicional (opcional)
  const maiChildren = [
    tlv("00", "br.gov.bcb.pix"),
    tlv("01", pixKey),
  ];
  if (infoAdicional) maiChildren.push(tlv("02", infoAdicional));
  fields.push(template("26", maiChildren));

  // 52: Merchant Category Code (0000)
  fields.push(tlv("52", "0000"));

  // 53: Transaction Currency (986 = BRL)
  fields.push(tlv("53", "986"));

  // 54: Transaction Amount (opcional)
  if (p.valor !== undefined && p.valor > 0) {
    fields.push(tlv("54", formatAmount(p.valor)));
  }

  // 58: Country Code = BR
  fields.push(tlv("58", "BR"));

  // 59: Merchant Name
  fields.push(tlv("59", merchantName));

  // 60: Merchant City
  fields.push(tlv("60", merchantCity));

  // 62: Additional Data Field Template — mandatório no BR Code
  // 05: txid / Reference Label — mandatório; use "***" se não tiver txid real
  const txid = normalizeTxid(p.txid);
  fields.push(template("62", [tlv("05", txid)]));

  // 63: CRC16 — calculado incluindo "6304" (id+len) antes do valor
  const payloadSemCRC = fields.join("") + "6304";
  const crc = crc16ccitt(payloadSemCRC);
  
  return payloadSemCRC + crc;
}

/**
 * Gera QR Code (data URL) a partir do BR Code Pix.
 */
export async function gerarQRDataURL(p: PixParams): Promise<string> {
  const brCode = gerarBRCode(p);
  console.log("BRCode gerado:", brCode);
  
  return QRCode.toDataURL(brCode, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/**
 * Valida se o BRCode está correto
 */
export function validarBRCode(brcode: string): boolean {
  try {
    // Verifica se começa com 000201
    if (!brcode.startsWith("000201")) {
      console.error("BRCode inválido: não começa com 000201");
      return false;
    }
    
    // Verifica se tem o CRC16 no final (6304 + 4 hex chars)
    if (!brcode.includes("6304") || brcode.length < 10) {
      console.error("BRCode inválido: CRC16 não encontrado");
      return false;
    }
    
    // Verifica se tem campo 26 (Merchant Account Information)
    if (!brcode.includes("26")) {
      console.error("BRCode inválido: campo 26 não encontrado");
      return false;
    }
    
    // Verifica se tem campo 62 (Additional Data Field)
    if (!brcode.includes("62")) {
      console.error("BRCode inválido: campo 62 não encontrado");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao validar BRCode:", error);
    return false;
  }
}
