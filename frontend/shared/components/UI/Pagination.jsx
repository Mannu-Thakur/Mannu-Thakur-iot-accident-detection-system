
import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages = [];
    // Simple pagination logic: show all pages if <= 7, otherwise show with ellipsis
    // For now, let's keep it simple: show surrounding pages

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="pagination">
            <button
                className="btn btn-sm btn-secondary"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                &larr; Prev
            </button>
            <div className="pagination-numbers">
                {startPage > 1 && (
                    <>
                        <button className="btn btn-sm btn-ghost" onClick={() => onPageChange(1)}>1</button>
                        {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {pages.map(page => (
                    <button
                        key={page}
                        className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                        <button className="btn btn-sm btn-ghost" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                    </>
                )}
            </div>
            <button
                className="btn btn-sm btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Next &rarr;
            </button>
        </div>
    );
};

export default Pagination;
