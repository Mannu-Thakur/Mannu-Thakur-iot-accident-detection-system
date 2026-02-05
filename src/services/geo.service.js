/**
 * Geo Service
 * Geospatial utilities for location-based operations
 */
const LocalAuthority = require('../models/LocalAuthority');
const Employee = require('../models/Employee');
const logger = require('../utils/logger');

/**
 * Find nearest local authority to a location
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @param {Number} maxDistanceMeters 
 * @returns {Object|null} Nearest authority or null
 */
const findNearestAuthority = async (longitude, latitude, maxDistanceMeters = 50000) => {
    try {
        // First try to find by jurisdiction (point within polygon)
        const byJurisdiction = await LocalAuthority.findByJurisdiction(longitude, latitude);
        if (byJurisdiction) {
            logger.debug('Found authority by jurisdiction:', byJurisdiction.authorityId);
            return byJurisdiction;
        }

        // Fall back to nearest by distance
        const nearest = await LocalAuthority.findNearestAuthority(longitude, latitude, maxDistanceMeters, 1);
        if (nearest && nearest.length > 0) {
            logger.debug('Found nearest authority:', nearest[0].authorityId);
            return nearest[0];
        }

        logger.warn('No authority found near location:', { longitude, latitude });
        return null;
    } catch (error) {
        logger.error('Error finding nearest authority:', error);
        return null;
    }
};

/**
 * Find multiple nearest authorities with distance
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @param {Number} maxDistanceMeters 
 * @param {Number} limit 
 * @returns {Array} Array of authorities with distance
 */
const findNearestAuthorities = async (longitude, latitude, maxDistanceMeters = 100000, limit = 5) => {
    try {
        const authorities = await LocalAuthority.findNearestWithDistance(
            longitude,
            latitude,
            maxDistanceMeters,
            limit
        );
        return authorities;
    } catch (error) {
        logger.error('Error finding nearest authorities:', error);
        return [];
    }
};

/**
 * Find nearest available employees to a location
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @param {String} authorityId 
 * @param {String} role - Optional role filter
 * @param {Number} limit 
 * @returns {Array} Array of employees
 */
const findNearestAvailableEmployees = async (longitude, latitude, authorityId, role = null, limit = 5) => {
    try {
        const query = {
            authorityId,
            status: 'AVAILABLE',
            isActive: true,
            isDeleted: false,
            lastLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    $maxDistance: 50000, // 50km
                },
            },
        };

        if (role) {
            query.role = role;
        }

        const employees = await Employee.find(query).limit(limit);
        return employees;
    } catch (error) {
        logger.error('Error finding nearest employees:', error);
        return [];
    }
};

/**
 * Calculate distance between two points (Haversine formula)
 * @param {Number} lat1 
 * @param {Number} lon1 
 * @param {Number} lat2 
 * @param {Number} lon2 
 * @returns {Number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Estimate travel time in minutes based on distance
 * @param {Number} distanceMeters 
 * @param {String} mode - 'driving', 'walking'
 * @returns {Number} Estimated minutes
 */
const estimateTravelTime = (distanceMeters, mode = 'driving') => {
    // Average speeds in km/h
    const speeds = {
        driving: 40, // Urban driving with traffic
        emergency: 60, // Emergency vehicle
        walking: 5,
    };

    const speedKmh = speeds[mode] || speeds.driving;
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / speedKmh;

    return Math.ceil(timeHours * 60); // Convert to minutes
};

/**
 * Create GeoJSON Point from lat/lon
 * @param {Number} latitude 
 * @param {Number} longitude 
 * @returns {Object} GeoJSON Point
 */
const createPoint = (latitude, longitude) => {
    return {
        type: 'Point',
        coordinates: [longitude, latitude], // GeoJSON is [lon, lat]
    };
};

/**
 * Parse coordinates from various formats
 * @param {Object|Array} input 
 * @returns {Object} { latitude, longitude }
 */
const parseCoordinates = (input) => {
    if (!input) return null;

    // Array [lon, lat] (GeoJSON format)
    if (Array.isArray(input) && input.length >= 2) {
        return { longitude: input[0], latitude: input[1] };
    }

    // Object with coordinates array
    if (input.coordinates && Array.isArray(input.coordinates)) {
        return { longitude: input.coordinates[0], latitude: input.coordinates[1] };
    }

    // Object with lat/lon or latitude/longitude
    if (input.lat !== undefined && input.lon !== undefined) {
        return { latitude: input.lat, longitude: input.lon };
    }
    if (input.latitude !== undefined && input.longitude !== undefined) {
        return { latitude: input.latitude, longitude: input.longitude };
    }

    return null;
};

/**
 * Build Google Maps URL for a location
 * @param {Number} latitude 
 * @param {Number} longitude 
 * @returns {String}
 */
const buildMapsUrl = (latitude, longitude) => {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
};

module.exports = {
    findNearestAuthority,
    findNearestAuthorities,
    findNearestAvailableEmployees,
    calculateDistance,
    estimateTravelTime,
    createPoint,
    parseCoordinates,
    buildMapsUrl,
};
