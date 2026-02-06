/**
 * User Model
 * For authentication (Google OAuth and local users)
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const UserSchema = new mongoose.Schema({
    // Basic info
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    name: {
        type: String,
        trim: true,
        maxlength: 150,
    },
    password: {
        type: String,
        select: false, // Don't return by default
        minlength: 8,
    },

    // OAuth
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    authProvider: {
        type: String,
        enum: ['LOCAL', 'GOOGLE'],
        default: 'LOCAL',
    },

    // Roles
    roles: {
        type: [String],
        default: ['ROLE_OWNER'],
        enum: ['ROLE_OWNER', 'ROLE_RTO', 'ROLE_LOCAL_AUTH', 'ROLE_STATE_AUTH', 'ROLE_EMPLOYEE', 'ROLE_ADMIN', 'ROLE_RTO_STAFF'],
    },

    // Role-specific IDs
    ownerId: {
        type: String,
        index: true,
        sparse: true,
    },
    rtoId: {
        type: String,
        index: true,
        sparse: true,
    },
    authorityId: {
        type: String,
        index: true,
        sparse: true,
    },
    employeeId: {
        type: String,
        index: true,
        sparse: true,
    },
    stateId: {
        type: String,
        index: true,
        sparse: true,
    },

    // Profile
    avatar: {
        type: String,
    },
    phone: {
        type: String,
    },

    // Security
    refreshToken: {
        type: String,
        select: false,
    },
    lastLogin: {
        type: Date,
    },
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: {
        type: Date,
    },

    // 2FA (future)
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    twoFactorSecret: {
        type: String,
        select: false,
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        select: false,
    },
    passwordResetToken: {
        type: String,
        select: false,
    },
    passwordResetExpires: {
        type: Date,
        select: false,
    },

    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
UserSchema.index({ roles: 1, isActive: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

// Instance methods
UserSchema.methods.comparePassword = async function (candidatePassword) {
    const user = await mongoose.model('User').findById(this._id).select('+password');
    if (!user || !user.password) return false;
    return bcrypt.compare(candidatePassword, user.password);
};

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            userId: this._id.toString(),
            email: this.email,
            roles: this.roles,
            ownerId: this.ownerId,
            rtoId: this.rtoId,
            authorityId: this.authorityId,
            employeeId: this.employeeId,
            stateId: this.stateId,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { userId: this._id.toString() },
        config.jwt.secret,
        { expiresIn: '30d' }
    );
};

UserSchema.methods.hasRole = function (role) {
    return this.roles.includes(role);
};

UserSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

UserSchema.methods.incLoginAttempts = async function () {
    // Reset if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }

    return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
    });
};

// Static methods
UserSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

UserSchema.statics.findByGoogleId = function (googleId) {
    return this.findOne({ googleId, isDeleted: false });
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
