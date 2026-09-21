const mongoose = require("mongoose");
const { DEFAULT_CLINICAL_BASELINES } = require("../constants/roles");

/**
 * ClinicalBaseline Model
 *
 * Defines customized normal reference ranges and critical alert cutoff limits
 * for a specific Care Recipient within a Care Circle.
 */
const clinicalBaselineSchema = new mongoose.Schema(
  {
    careCircle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCircle",
      required: [true, "Care Circle reference is required"],
      index: true,
    },
    careRecipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareRecipient",
      required: [true, "Care Recipient reference is required"],
      index: true,
    },
    configuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Configuring user reference is required"],
    },

    // Blood Pressure thresholds (mmHg)
    bpSystolicMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bpSystolicMin,
    },
    bpSystolicMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bpSystolicMax,
    },
    bpDiastolicMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bpDiastolicMin,
    },
    bpDiastolicMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bpDiastolicMax,
    },

    // Heart Rate thresholds (bpm)
    heartRateMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.heartRateMin,
    },
    heartRateMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.heartRateMax,
    },

    // Blood Sugar thresholds (mg/dL)
    bloodSugarFastingMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bloodSugarFastingMin,
    },
    bloodSugarFastingMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bloodSugarFastingMax,
    },
    bloodSugarPostPrandialMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bloodSugarPostPrandialMin,
    },
    bloodSugarPostPrandialMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.bloodSugarPostPrandialMax,
    },

    // Oxygen Saturation (%)
    spO2Min: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.spO2Min,
    },

    // Temperature (°F)
    temperatureMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.temperatureMin,
    },
    temperatureMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.temperatureMax,
    },

    // Respiratory Rate (breaths/min)
    respiratoryRateMin: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.respiratoryRateMin,
    },
    respiratoryRateMax: {
      type: Number,
      default: DEFAULT_CLINICAL_BASELINES.respiratoryRateMax,
    },

    // Critical Red-Line Overrides
    criticalOverrides: {
      bpSystolicCriticalHigh: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bpSystolicCriticalHigh,
      },
      bpSystolicCriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bpSystolicCriticalLow,
      },
      bpDiastolicCriticalHigh: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bpDiastolicCriticalHigh,
      },
      bpDiastolicCriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bpDiastolicCriticalLow,
      },
      spO2CriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.spO2CriticalLow,
      },
      heartRateCriticalHigh: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.heartRateCriticalHigh,
      },
      heartRateCriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.heartRateCriticalLow,
      },
      bloodSugarCriticalHigh: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bloodSugarCriticalHigh,
      },
      bloodSugarCriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.bloodSugarCriticalLow,
      },
      temperatureCriticalHigh: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.temperatureCriticalHigh,
      },
      temperatureCriticalLow: {
        type: Number,
        default: DEFAULT_CLINICAL_BASELINES.criticalOverrides.temperatureCriticalLow,
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Exactly one clinical baseline per careRecipient in a careCircle
clinicalBaselineSchema.index({ careCircle: 1, careRecipient: 1 }, { unique: true });

module.exports = mongoose.model("ClinicalBaseline", clinicalBaselineSchema);
