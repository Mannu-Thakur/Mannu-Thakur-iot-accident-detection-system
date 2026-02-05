/**
 * API Response Helpers
 */

/**
 * Send success response
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
};

/**
 * Send created response
 */
const sendCreated = (res, data = null, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

/**
 * Send error response
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
const sendValidationError = (res, errors, message = 'Validation failed') => {
    return sendError(res, message, 422, errors);
};

/**
 * Send not found response
 */
const sendNotFound = (res, message = 'Resource not found') => {
    return sendError(res, message, 404);
};

/**
 * Send unauthorized response
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendError(res, message, 401);
};

/**
 * Send forbidden response
 */
const sendForbidden = (res, message = 'Forbidden') => {
    return sendError(res, message, 403);
};

/**
 * Send conflict response
 */
const sendConflict = (res, message = 'Conflict', data = null) => {
    const response = {
        success: false,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    return res.status(409).json(response);
};

/**
 * Send paginated response
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
    const response = {
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
            hasPrevPage: pagination.page > 1,
        },
        timestamp: new Date().toISOString(),
    };
    return res.status(200).json(response);
};

module.exports = {
    sendSuccess,
    sendCreated,
    sendError,
    sendValidationError,
    sendNotFound,
    sendUnauthorized,
    sendForbidden,
    sendConflict,
    sendPaginated,
};
