// CLARA — Prompts de Gemini centralizados
// Todos piden respuesta SOLO en JSON valido con schema esperado

// ─── Modulo 1: Clasificacion de email ──────────────────────────────────────

export const PROMPT_CLASIFICACION_EMAIL = `Analiza este email y determina si contiene una factura de proveedor adjunta.

Responde UNICAMENTE con este JSON:
{
  "es_factura": true/false,
  "confianza": 0-100,
  "razon": "explicacion breve"
}

Criterios:
- Facturas: documentos con NIF/CIF, lineas de producto, importes, IVA
- NO son facturas: confirmaciones de pedido, albaranes solos, publicidad, newsletters
- Si hay adjunto PDF/imagen con formato de factura => es_factura: true
- Si solo es texto sin adjunto de factura => es_factura: false

No anadas texto antes ni despues del JSON.`;

// ─── Modulo 2: OCR Extraccion ──────────────────────────────────────────────

export const PROMPT_OCR_SYSTEM = `Eres un sistema OCR especializado en facturas de proveedores de hosteleria en Espana. Extrae datos con precision maxima. Responde SOLO en JSON valido.`;

export const PROMPT_OCR_EXTRACCION = `Extrae todos los datos de esta factura espanola en el siguiente formato JSON exacto:

{
  "proveedor_nombre": "Nombre del proveedor",
  "proveedor_nif": "NIF/CIF (formato: B12345678, 12345678A, X1234567A)",
  "numero_factura": "Numero de factura",
  "fecha_factura": "DD/MM/YYYY",
  "lineas": [
    {
      "descripcion": "Nombre del producto",
      "cantidad": 10.000,
      "unidad": "kg",
      "precio_unitario": 5.50,
      "total_linea": 55.00,
      "iva_tipo": 10,
      "confianza": 95
    }
  ],
  "subtotal": 100.00,
  "iva_total": 10.00,
  "total": 110.00,
  "confianza_global": 90,
  "campos_faltantes": []
}

Reglas:
- Importes en euros con 2 decimales
- Fecha exactamente en formato DD/MM/YYYY como aparece en la factura
- NIF/CIF completo con letra, tal como aparece
- Unidades validas: kg, ud, l, caja, pack, docena, manojo, bandeja, bolsa, saco, lata, bote, garrafa
- IVA hosteleria: 4% (superreducido), 10% (reducido alimentos), 21% (general)
- Si no puedes leer un campo con certeza, ponlo en campos_faltantes
- confianza por linea: 0-100 segun legibilidad
- confianza_global: media ponderada de todos los campos

Ejemplos de NIFs validos:
- B36985214 (empresa gallega)
- A28001234 (sociedad anonima Madrid)
- 32456789B (autonomo)

No anadas texto antes ni despues del JSON.`;

// ─── Modulo 3: Analisis de discrepancia ────────────────────────────────────

export const PROMPT_ANALISIS_DISCREPANCIA = `Analiza esta discrepancia entre una factura y un albaran de proveedor.

Datos:
{factura}

Responde UNICAMENTE con este JSON:
{
  "resumen": "descripcion clara de la discrepancia",
  "impacto_economico": 0.00,
  "recomendacion": "accion sugerida"
}

No anadas texto antes ni despues del JSON.`;

// ─── Modulo 4: Redaccion de mensaje a proveedor ───────────────────────────

export const PROMPT_MENSAJE_PROVEEDOR = `Redacta un mensaje profesional en espanol para enviar al proveedor sobre una discrepancia encontrada en su factura.

Datos de la discrepancia:
{discrepancia}

Responde UNICAMENTE con este JSON:
{
  "asunto": "Asunto del mensaje (maximo 80 caracteres)",
  "cuerpo": "Texto completo del mensaje"
}

Requisitos del mensaje:
- Tono: directo, profesional, respetuoso — nunca agresivo
- Incluir siempre: numero de factura, fecha, descripcion del error
- Incluir valores esperados vs recibidos con importes exactos
- Cerrar pidiendo revision y aclaracion
- Firmar como "Departamento de Administracion"
- Maximo 200 palabras

No anadas texto antes ni despues del JSON.`;
