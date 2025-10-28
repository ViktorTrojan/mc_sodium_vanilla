/**
 * Performs an HTTP fetch with exponential backoff retry logic.
 *
 * Automatically retries on network errors and HTTP 429 (rate limit) responses.
 * Uses exponential backoff to increase delay between retries.
 *
 * @param url - The URL to fetch
 * @param max_retries - Maximum number of retry attempts (default: 5)
 * @param initial_delay_ms - Initial delay in milliseconds before first retry (default: 1000)
 * @returns Promise resolving to the fetch Response
 * @throws Error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const response = await fetch_with_retry('https://api.example.com/data', 3, 500)
 * const data = await response.json()
 * ```
 */
export async function fetch_with_retry(url: string, max_retries = 5, initial_delay_ms = 1000): Promise<Response> {
  let last_error: Error | null = null

  for (let attempt = 0; attempt <= max_retries; attempt++) {
    try {
      const response = await fetch(url)

      // If we get a 429 (Too Many Requests), retry with exponential backoff
      if (response.status === 429) {
        if (attempt < max_retries) {
          const delay = initial_delay_ms * 2 ** attempt
          console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${max_retries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      return response
    } catch (error) {
      last_error = error as Error
      if (attempt < max_retries) {
        const delay = initial_delay_ms * 2 ** attempt
        console.log(`Fetch error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${max_retries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw last_error || new Error("Max retries exceeded")
}
