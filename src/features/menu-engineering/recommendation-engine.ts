import type { MenuDishAnalysis, Recommendation } from "./types"

/**
 * Generates actionable recommendations based on menu engineering analysis + margin/hour.
 * Each recommendation is a concrete action with estimated impact.
 */
export function generateRecommendations(dishes: MenuDishAnalysis[]): Recommendation[] {
  const recommendations: Recommendation[] = []
  const dishesWithMPH = dishes.filter(d => d.margin_per_hour !== undefined)
  const avgMPH = dishesWithMPH.length > 0
    ? dishesWithMPH.reduce((s, d) => s + (d.margin_per_hour ?? 0), 0) / dishesWithMPH.length
    : 0

  for (const d of dishes) {
    const margin = d.contribution_margin
    const marginPct = d.contribution_margin_pct
    const mph = d.margin_per_hour
    const timePerServing = d.time_per_serving_min

    // 1. PERRO con bajo margen/hora → retirar o rediseñar
    if (d.quadrant === "perro" && mph !== undefined && mph < avgMPH * 0.5) {
      recommendations.push({
        dish: d.name,
        type: "remove",
        action: `Retira "${d.name}" del menú o rediseña completamente`,
        impact: `Margen/hora ${mph.toFixed(0)}€/h (media carta: ${avgMPH.toFixed(0)}€/h). Libera tiempo de cocina para platos más rentables.`,
        severity: "high",
      })
      continue
    }

    // 2. PERRO con margen/hora decente → promover mejor
    if (d.quadrant === "perro" && mph !== undefined && mph >= avgMPH * 0.8) {
      recommendations.push({
        dish: d.name,
        type: "promote",
        action: `Mueve "${d.name}" a posición destacada en carta (zona superior derecha)`,
        impact: `Margen/hora ${mph.toFixed(0)}€/h es competitivo. El problema es visibilidad, no rentabilidad.`,
        severity: "medium",
      })
    }

    // 3. ENIGMA con buen margen pero bajo volumen → subir visibilidad
    if (d.quadrant === "enigma") {
      recommendations.push({
        dish: d.name,
        type: "promote",
        action: `Potencia "${d.name}": pon en pizarra, destaca en carta, ofrece como sugerencia del chef`,
        impact: `Margen bruto ${margin.toFixed(0)}€ (${marginPct.toFixed(0)}%). Si duplicas ventas: +${(margin * d.units_sold).toFixed(0)}€/mes extra.`,
        severity: "medium",
      })
    }

    // 4. VACA LECHERA con food cost alto → subir precio o reducir coste
    if (d.quadrant === "vaca" && marginPct < 60) {
      const suggestedIncrease = Math.ceil(margin * 0.1 * 2) / 2 // round to 0.50
      recommendations.push({
        dish: d.name,
        type: "price_up",
        action: `Sube "${d.name}" +${suggestedIncrease.toFixed(2)}€ (de ${d.selling_price}€ a ${(d.selling_price + suggestedIncrease).toFixed(2)}€)`,
        impact: `${d.units_sold} uds/mes × ${suggestedIncrease.toFixed(2)}€ = +${(d.units_sold * suggestedIncrease).toFixed(0)}€/mes. Es popular — soporta el ajuste.`,
        severity: "medium",
      })
    }

    // 5. Plato con mucho tiempo de ejecución → optimizar mise en place
    if (timePerServing !== undefined && timePerServing > 20 && d.units_sold > 50) {
      recommendations.push({
        dish: d.name,
        type: "batch_optimize",
        action: `Prepara mise en place de "${d.name}" en batch los ${d.units_sold > 100 ? "miércoles y viernes" : "jueves"} para servicio de fin de semana`,
        impact: `${timePerServing.toFixed(0)} min/ración actual. Con batch podrías bajar a ${Math.max(3, timePerServing * 0.4).toFixed(0)} min → margen/hora de ${mph?.toFixed(0)}€/h a ${(margin * 60 / Math.max(3, timePerServing * 0.4)).toFixed(0)}€/h.`,
        severity: "low",
      })
    }

    // 6. Plato con margen bruto alto pero margen/hora bajo → señalar
    if (margin > 15 && mph !== undefined && mph < avgMPH * 0.7) {
      recommendations.push({
        dish: d.name,
        type: "reduce_cost",
        action: `"${d.name}" parece rentable (${margin.toFixed(0)}€ margen) pero ocupa ${timePerServing?.toFixed(0)} min de cocina`,
        impact: `Margen/hora: ${mph.toFixed(0)}€/h vs media ${avgMPH.toFixed(0)}€/h. Reduce gramaje 10g ingrediente principal o simplifica elaboración.`,
        severity: "medium",
      })
    }

    // 7. ESTRELLA → mantener pero verificar que no suba coste
    if (d.quadrant === "estrella" && marginPct < 65) {
      recommendations.push({
        dish: d.name,
        type: "reduce_cost",
        action: `Vigila coste de "${d.name}" — food cost ${(100 - marginPct).toFixed(0)}% (objetivo <35%)`,
        impact: `Es tu estrella (${d.units_sold} uds). Si el coste sube 1€: -${d.units_sold}€/mes.`,
        severity: "low",
      })
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
