import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalCount,
  pageSize,
  hasMore,
  loading,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="pagination">
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
      >
        Previous
      </button>
      <span className="page-info">
        Page {currentPage} of {totalPages} ({totalCount} total)
      </span>
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasMore || loading}
      >
        Next
      </button>
    </div>
  );
};
