import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function parseContractData(rawJson) {
  // Sacamos el Overall Score del "Executive Summary"
  const overallScore = rawJson["Executive Summary"]?.["Overall Score"] || 0;

  // Extraemos puntajes de cada categoría
  const termScore = rawJson["Detailed Category Scoring"]?.["Term & Renewal"]?.Score ?? 0;
  const paymentScore = rawJson["Detailed Category Scoring"]?.["Payment & Financial Terms"]?.Score ?? 0;
  const slaScore = rawJson["Detailed Category Scoring"]?.["Service Level Agreements"]?.Score ?? 0;
  const riskScore = rawJson["Detailed Category Scoring"]?.["Risk Allocation"]?.Score ?? 0;
  const operationalScore = rawJson["Detailed Category Scoring"]?.["Operational Terms"]?.Score ?? 0;
  const securityScore = rawJson["Detailed Category Scoring"]?.["Security & Compliance"]?.Score ?? 0;
  const adminScore = rawJson["Detailed Category Scoring"]?.["Contract Administration"]?.Score ?? 0;

  // Extraemos “riesgos” y “recomendaciones”
  const highRisks = rawJson["Risk Assessment"]?.["High-Priority Concerns"] ?? [];
  const mediumRisks = rawJson["Risk Assessment"]?.["Medium-Priority Issues"] ?? [];
  const lowRisks = rawJson["Risk Assessment"]?.["Low-Priority Items"] ?? [];
  const mustHave = rawJson["Improvement Recommendations"]?.["Must-Have Changes"] ?? [];
  const niceToHave = rawJson["Improvement Recommendations"]?.["Nice-to-Have Improvements"] ?? [];
  const optionalRecs = rawJson["Improvement Recommendations"]?.["Strategic Considerations"] ?? [];

  // Devuelve el objeto con la forma que TU componente espera
  return {
    // "metadata" quizás no está en el JSON, así que pon lo que necesites
    metadata: {
      contractId: "Unknown-ID",
      vendor: "Unknown Vendor", // o podrías derivar esto de algún lugar
      client: "Unknown Client",
      analysisDate: "N/A"
    },
    scores: {
      overall: overallScore,
      categories: {
        term: { score: termScore },
        payment: { score: paymentScore },
        sla: { score: slaScore },
        risk: { score: riskScore },
        operational: { score: operationalScore },
        security: { score: securityScore },
        administration: { score: adminScore }
      }
    },
    analysis: {
      risks: {
        high: highRisks,
        medium: mediumRisks,
        low: lowRisks
      },
      recommendations: {
        critical: mustHave,
        important: niceToHave,
        optional: optionalRecs
      }
    }
  };
}