import QRCode from "qrcode";

export interface PixParams {
  chave: string;        // CPF/CNPJ/email/telefone/+55/UUID
  nome: string;         // Merchant Name (campo 59, máx 25)
  cidade: string;       // Merchant City (campo 60, máx 15)
  valor?: number;       // Transaction Amount (campo 54, opcional)
  txid?: string;        // Reference Label (62-05), máx 25 (a-zA-Z0-9)
  infoAdicional?: string; // Pix: campo 26-02 (opcional, livre com limite)
}

const encoder = new TextEncoder();

/** Comprimento em bytes UTF-8 (para TLV). */
function utf8Len(s: string): number {
  return encoder.encode(s).length;
}

/**
 * Monta um campo TLV (ID + LEN + VALUE).
 * LEN é sempre 2 dígitos decimais e representa o tamanho do VALUE.
 */
function tlv(id: string, value: string): string {
  if (!/^\d{2}$/.test(id)) {
    throw new Error(`ID inválido (esperado 2 dígitos): "${id}"`);
  }
  const len = utf8Len(value);
  if (len > 99) {
    throw new Error(`Campo ${id} excede 99 bytes (len=${len}). Reduza o conteúdo.`);
  }
  return `${id}${String(len).padStart(2, "0")}${value}`;
}

/** Monta um template TLV cujo value é a concatenação de TLVs internos. */
function template(id: string, children: string[]): string {
  return tlv(id, children.join(""));
}

/**
 * Remove acentos e caracteres problemáticos, deixa em CAIXA ALTA,
 * colapsa espaços e corta no tamanho máximo.
 */
function sanitizeMerchantText(input: string, maxLen: number): string {
  const noAccents = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove diacríticos
  
  const cleaned = noAccents
    .toUpperCase()
    .replace(/[^A-Z0-9 @&.,\-\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  
  if (!cleaned) {
    throw new Error("Texto ficou vazio após sanitização (nome/cidade).");
  }
  return cleaned;
}

/**
 * Normaliza chave Pix conforme exemplos do Manual do Pix:
 * - Email: string com @ (mantém, normaliza para lower-case)
 * - CPF: 11 dígitos
 * - CNPJ: 14 caracteres (numérico ou alfanumérico)
 * - Telefone: +55... (aceita também 55... e converte para +55...)
 * - Aleatória: UUID com hífens
 */
function normalizePixKey(raw: string): string {
  const s = raw.trim();
  if (!s) throw new Error("Chave Pix vazia.");
  
  // Email
  if (s.includes("@")) return s.toLowerCase();
  
  // UUID (chave aleatória)
  const lower = s.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lower)) {
    return lower;
  }
  
  // Telefone: aceita +55..., ou 55... sem "+"
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    const phone = s.replace(/[^\d+]/g, "");
    if (!/^\+\d{8,15}$/.test(phone)) {
      throw new Error(`Telefone Pix inválido (esperado +55...): "${raw}"`);
    }
    return phone;
  }
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 15) {
    return `+${digits}`;
  }
  
  // CPF/CNPJ (remove pontuação e mantém alfanumérico)
  const alnum = s.replace(/[^0-9A-Za-z]/g, "");
  if (/^\d{11}$/.test(alnum)) return alnum; // CPF
  if (/^[0-9A-Za-z]{14}$/.test(alnum)) return alnum.toUpperCase(); // CNPJ
  
  // Fallback: se tem tamanho aceitável para o campo "chave" (até 77)
  if (alnum.length >= 1 && alnum.length <= 77) return alnum;
  
  throw new Error(`Formato de chave Pix não reconhecido: "${raw}"`);
}

/**
 * Normaliza txid para BR Code (62-05).
 * - Permitidos: a-z A-Z 0-9
 * - Máx: 25
 * - Se ausente/vazio: "***" (conforme orientação do manual)
 */
function normalizeTxid(txid?: string): string {
  if (!txid) return "***";
  const cleaned = txid.replace(/[^0-9A-Za-z]/g, "").slice(0, 25);
  return cleaned.length ? cleaned : "***";
}

/** Formata valor do campo 54 (Transaction Amount) com 2 casas e "." */
function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("valor deve ser um número > 0 quando informado.");
  }
  const rounded = Math.round(amount * 100) / 100;
  const s = rounded.toFixed(2); // "1.00"
  if (s.length > 13) throw new Error("valor muito grande para o campo 54 (max 13 chars).");
  return s;
}

/**
 * CRC16 (CRC-16/CCITT-FALSE): polinômio 0x1021, init 0xFFFF.
 * Retorna 4 hex uppercase.
 */
function crc16ccitt(payload: string): string {
  const bytes = encoder.encode(payload);
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= (b << 8);
    for (let i = 0; i < 8; i++) {
      const msb = crc & 0x8000;
      crc = (crc << 1) & 0xffff;
      if (msb) crc ^= 0x1021;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o BR Code Pix estático ("copia e cola") compatível com bancos.
 */
export function gerarBRCode(p: PixParams): string {
  const pixKey = normalizePixKey(p.chave);
  const merchantName = sanitizeMerchantText(p.nome, 25);
  const merchantCity = sanitizeMerchantText(p.cidade, 15);
  
  // Campo Pix "infoAdicional" (26-02) é opcional.
  // Se usar, mantenha curto — existe limite e ele disputa espaço com a chave.
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
  if (p.valor !== undefined) {
    // só inclui se >0; para "valor em aberto", não inclua o campo 54
    if (p.valor > 0) fields.push(tlv("54", formatAmount(p.valor)));
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
