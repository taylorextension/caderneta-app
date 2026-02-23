/**
 * Fetch with automatic retry and exponential backoff.
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: 5)
 * @returns The fetch Response
 */
export async function fetchWithRetry(
    url: string,
    options?: RequestInit,
    maxRetries = 5
): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, options)

            // If response is OK or is a client error (4xx), don't retry
            if (res.ok || (res.status >= 400 && res.status < 500)) {
                return res
            }

            // Server error (5xx) - retry
            lastError = new Error(`HTTP ${res.status}`)
        } catch (err) {
            // Network error - retry
            lastError = err instanceof Error ? err : new Error(String(err))
        }

        // Wait with exponential backoff before retrying
        if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
            await new Promise((resolve) => setTimeout(resolve, delay))
        }
    }

    throw lastError || new Error('fetchWithRetry: all retries failed')
}
