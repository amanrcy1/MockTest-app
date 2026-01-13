import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for optimized data fetching with caching and deduplication
 * 
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Array} dependencies - Dependencies array for refetching
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useOptimizedFetch = (fetchFn, dependencies = [], options = {}) => {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    staleTime = 0, // Data is fresh for this duration
    enabled = true, // Whether to fetch automatically
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Generate cache key from dependencies
  const getCacheKey = useCallback(() => {
    return JSON.stringify(dependencies);
  }, [dependencies]);

  // Check if cached data is still valid
  const isCacheValid = useCallback((cacheKey) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    return age < cacheTime;
  }, [cacheTime]);

  // Check if data is still fresh (no need to show loading)
  const isDataFresh = useCallback((cacheKey) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    return age < staleTime;
  }, [staleTime]);

  // Fetch data with caching and deduplication
  const fetchData = useCallback(async (showLoading = true) => {
    const cacheKey = getCacheKey();
    
    // Return cached data if valid and fresh
    if (isCacheValid(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      setData(cached.data);
      setError(null);
      
      // If data is fresh, don't show loading
      if (isDataFresh(cacheKey)) {
        setLoading(false);
        return cached.data;
      }
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchFn(abortControllerRef.current.signal);
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      
      setData(result);
      setError(null);
      lastFetchTimeRef.current = Date.now();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return;
      }
      
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [fetchFn, getCacheKey, isCacheValid, isDataFresh, onSuccess, onError]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refetch function
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Clear cache for this query
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey();
    cacheRef.current.delete(cacheKey);
  }, [getCacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    isFetching: loading,
    isStale: !isDataFresh(getCacheKey()),
  };
};

/**
 * Hook for paginated data fetching
 * 
 * @param {Function} fetchFn - Async function to fetch page data
 * @param {Object} options - Configuration options
 * @returns {Object} - Pagination state and controls
 */
export const usePaginatedFetch = (fetchFn, options = {}) => {
  const {
    initialPage = 1,
    pageSize = 10,
    enabled = true,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, loading, error, refetch } = useOptimizedFetch(
    async (signal) => {
      const result = await fetchFn(page, pageSize, signal);
      return result;
    },
    [page, pageSize],
    { enabled }
  );

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllData(data.items || data);
      } else {
        setAllData(prev => [...prev, ...(data.items || data)]);
      }
      
      setHasMore(data.hasMore !== undefined ? data.hasMore : (data.items || data).length === pageSize);
    }
  }, [data, page, pageSize]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setAllData([]);
    setHasMore(true);
  }, [initialPage]);

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    refetch,
    page,
  };
};

/**
 * Hook for infinite scroll data fetching
 * 
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Object} options - Configuration options
 * @returns {Object} - Infinite scroll state and controls
 */
export const useInfiniteScroll = (fetchFn, options = {}) => {
  const {
    threshold = 0.8, // Trigger when 80% scrolled
    enabled = true,
  } = options;

  const pagination = usePaginatedFetch(fetchFn, { ...options, enabled });
  const observerRef = useRef(null);

  const lastElementRef = useCallback((node) => {
    if (pagination.loading) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasMore) {
        pagination.loadMore();
      }
    }, {
      threshold,
    });

    if (node) {
      observerRef.current.observe(node);
    }
  }, [pagination, threshold]);

  return {
    ...pagination,
    lastElementRef,
  };
};

export default useOptimizedFetch;
