const {
  VITAL_TYPES,
  VITAL_ALERT_SEVERITIES,
  DEFAULT_CLINICAL_BASELINES,
} = require("../constants/roles");

/**
 * Evaluates a vital measurement against clinical baseline thresholds.
 *
 * @param {string} vitalType - One of ALL_VITAL_TYPES
 * @param {object} measurements - Specific measurements payload
 * @param {object} customBaseline - Optional ClinicalBaseline document or plain object
 * @returns {object} { isAbnormal: boolean, alertSeverity: string, abnormalReasons: string[] }
 */
function evaluateVitalDeviation(vitalType, measurements = {}, customBaseline = null) {
  const baseline = customBaseline || DEFAULT_CLINICAL_BASELINES;
  const critical = baseline.criticalOverrides || DEFAULT_CLINICAL_BASELINES.criticalOverrides;

  const reasons = [];
  let isCritical = false;
  let isWarning = false;

  switch (vitalType) {
    case VITAL_TYPES.BLOOD_PRESSURE: {
      const { systolic, diastolic, pulse } = measurements;

      if (typeof systolic === "number") {
        if (systolic >= (critical.bpSystolicCriticalHigh ?? 180)) {
          isCritical = true;
          reasons.push("CRITICAL_HIGH_SYSTOLIC_BP");
        } else if (systolic <= (critical.bpSystolicCriticalLow ?? 80)) {
          isCritical = true;
          reasons.push("CRITICAL_LOW_SYSTOLIC_BP");
        } else if (systolic > (baseline.bpSystolicMax ?? 140)) {
          isWarning = true;
          reasons.push("HIGH_SYSTOLIC_BP");
        } else if (systolic < (baseline.bpSystolicMin ?? 90)) {
          isWarning = true;
          reasons.push("LOW_SYSTOLIC_BP");
        }
      }

      if (typeof diastolic === "number") {
        if (diastolic >= (critical.bpDiastolicCriticalHigh ?? 110)) {
          isCritical = true;
          reasons.push("CRITICAL_HIGH_DIASTOLIC_BP");
        } else if (diastolic <= (critical.bpDiastolicCriticalLow ?? 50)) {
          isCritical = true;
          reasons.push("CRITICAL_LOW_DIASTOLIC_BP");
        } else if (diastolic > (baseline.bpDiastolicMax ?? 90)) {
          isWarning = true;
          reasons.push("HIGH_DIASTOLIC_BP");
        } else if (diastolic < (baseline.bpDiastolicMin ?? 60)) {
          isWarning = true;
          reasons.push("LOW_DIASTOLIC_BP");
        }
      }

      if (typeof pulse === "number") {
        if (pulse > (baseline.heartRateMax ?? 100)) {
          isWarning = true;
          reasons.push("HIGH_PULSE");
        } else if (pulse < (baseline.heartRateMin ?? 50)) {
          isWarning = true;
          reasons.push("LOW_PULSE");
        }
      }
      break;
    }

    case VITAL_TYPES.BLOOD_SUGAR: {
      const { sugarLevel, mealContext } = measurements;

      if (typeof sugarLevel === "number") {
        if (sugarLevel >= (critical.bloodSugarCriticalHigh ?? 300)) {
          isCritical = true;
          reasons.push("CRITICAL_HYPERGLYCEMIA");
        } else if (sugarLevel <= (critical.bloodSugarCriticalLow ?? 55)) {
          isCritical = true;
          reasons.push("CRITICAL_HYPOGLYCEMIA");
        } else if (mealContext === "FASTING" || mealContext === "BEFORE_MEAL") {
          if (sugarLevel > (baseline.bloodSugarFastingMax ?? 130)) {
            isWarning = true;
            reasons.push("HIGH_FASTING_SUGAR");
          } else if (sugarLevel < (baseline.bloodSugarFastingMin ?? 70)) {
            isWarning = true;
            reasons.push("LOW_FASTING_SUGAR");
          }
        } else {
          if (sugarLevel > (baseline.bloodSugarPostPrandialMax ?? 180)) {
            isWarning = true;
            reasons.push("HIGH_POST_PRANDIAL_SUGAR");
          } else if (sugarLevel < (baseline.bloodSugarPostPrandialMin ?? 80)) {
            isWarning = true;
            reasons.push("LOW_POST_PRANDIAL_SUGAR");
          }
        }
      }
      break;
    }

    case VITAL_TYPES.HEART_RATE: {
      const { bpm } = measurements;

      if (typeof bpm === "number") {
        if (bpm >= (critical.heartRateCriticalHigh ?? 130)) {
          isCritical = true;
          reasons.push("CRITICAL_TACHYCARDIA");
        } else if (bpm <= (critical.heartRateCriticalLow ?? 40)) {
          isCritical = true;
          reasons.push("CRITICAL_BRADYCARDIA");
        } else if (bpm > (baseline.heartRateMax ?? 100)) {
          isWarning = true;
          reasons.push("TACHYCARDIA_HIGH_HEART_RATE");
        } else if (bpm < (baseline.heartRateMin ?? 50)) {
          isWarning = true;
          reasons.push("BRADYCARDIA_LOW_HEART_RATE");
        }
      }
      break;
    }

    case VITAL_TYPES.OXYGEN_SATURATION: {
      const { spO2 } = measurements;

      if (typeof spO2 === "number") {
        if (spO2 <= (critical.spO2CriticalLow ?? 90)) {
          isCritical = true;
          reasons.push("CRITICAL_LOW_SPO2");
        } else if (spO2 < (baseline.spO2Min ?? 94)) {
          isWarning = true;
          reasons.push("LOW_SPO2");
        }
      }
      break;
    }

    case VITAL_TYPES.TEMPERATURE: {
      const { temperature, temperatureUnit } = measurements;

      if (typeof temperature === "number") {
        const tempF =
          temperatureUnit === "C" ? (temperature * 9) / 5 + 32 : temperature;

        if (tempF >= (critical.temperatureCriticalHigh ?? 102.5)) {
          isCritical = true;
          reasons.push("CRITICAL_HIGH_FEVER");
        } else if (tempF <= (critical.temperatureCriticalLow ?? 95.0)) {
          isCritical = true;
          reasons.push("CRITICAL_HYPOTHERMIA");
        } else if (tempF > (baseline.temperatureMax ?? 99.5)) {
          isWarning = true;
          reasons.push("FEVER_ELEVATED_TEMPERATURE");
        } else if (tempF < (baseline.temperatureMin ?? 97.0)) {
          isWarning = true;
          reasons.push("LOW_BODY_TEMPERATURE");
        }
      }
      break;
    }

    case VITAL_TYPES.RESPIRATORY_RATE: {
      const { respiratoryRate } = measurements;

      if (typeof respiratoryRate === "number") {
        if (respiratoryRate > (baseline.respiratoryRateMax ?? 20)) {
          isWarning = true;
          reasons.push("TACHYPNEA_HIGH_RESPIRATORY_RATE");
        } else if (respiratoryRate < (baseline.respiratoryRateMin ?? 12)) {
          isWarning = true;
          reasons.push("BRADYPNEA_LOW_RESPIRATORY_RATE");
        }
      }
      break;
    }

    default:
      break;
  }

  let alertSeverity = VITAL_ALERT_SEVERITIES.NORMAL;
  if (isCritical) {
    alertSeverity = VITAL_ALERT_SEVERITIES.CRITICAL;
  } else if (isWarning) {
    alertSeverity = VITAL_ALERT_SEVERITIES.WARNING;
  }

  return {
    isAbnormal: reasons.length > 0,
    alertSeverity,
    abnormalReasons: reasons,
  };
}

module.exports = {
  evaluateVitalDeviation,
};
