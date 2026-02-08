/**
 * Formatting Utilities
 */

/**
 * Format date to readable string
 */
export function formatDate(date, options = {}) {
    if (!date) return '-';
    const d = new Date(date);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };
    return d.toLocaleDateString('en-IN', defaultOptions);
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('en-IN');
}

/**
 * Format phone number
 */
export function formatPhone(phone) {
    if (!phone) return '-';
    return phone.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');
}

/**
 * Get initials from name
 */
export function getInitials(name, maxLength = 2) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, maxLength);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Format severity level
 */
export function formatSeverity(level) {
    const levels = {
        1: 'Low',
        2: 'Minor',
        3: 'Moderate',
        4: 'High',
        5: 'Critical'
    };
    return levels[level] || 'Unknown';
}

/**
 * Get severity color class
 */
export function getSeverityColor(level) {
    if (level <= 2) return 'success';
    if (level === 3) return 'warning';
    return 'danger';
}

/**
 * Format status to display string
 */
export function formatStatus(status) {
    if (!status) return '-';
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}
