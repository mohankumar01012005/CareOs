const mongoose = require("mongoose");

/**
 * CareOS Application Roles Overview:
 * In CareOS, user identity is decoupled from care circle roles.
 * A single user identity can belong to multiple Care Circles with different circle-specific roles:
 * 1. Main Caretaker (Circle creator/admin)
 * 2. Sub Caretaker (Co-admin/secondary caregiver)
 * 3. Family Member (Relative/viewer/contributor)
 * 4. Care Receiver (Patient/elder - may or may not have a login account)
 * 5. Paid Doctor (Clinical provider)
 * 6. Paid Caretaker (Shift nurse/attendant)
 *
 * This User model represents the base identity/authentication record.
 * Care Circle memberships, roles, and granular permissions are managed in circle membership schemas.
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // Prevents accidental leak in queries unless explicitly selected
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
    },
    lastLoginAt: {
      type: Date,
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
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("User", userSchema);
