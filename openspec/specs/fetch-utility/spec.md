# fetch-utility Specification

## Purpose
TBD - created by archiving change automate-modpack-updates. Update Purpose after archive.
## Requirements
### Requirement: The system MUST provide centralized fetch with retry logic

The system SHALL provide a centralized utility function for making HTTP requests with automatic retry and rate limit handling.

#### Scenario: Successful request on first attempt

**Given** a valid URL to fetch
**When** the fetch utility is called
**Then** it should return the response immediately without retries

#### Scenario: Retry on network error

**Given** a URL that fails with a network error on the first two attempts
**And** succeeds on the third attempt
**When** the fetch utility is called with max_retries >= 2
**Then** it should retry with exponential backoff
**And** eventually return the successful response

#### Scenario: Retry on rate limit (429)

**Given** a URL that returns HTTP 429 (Too Many Requests)
**When** the fetch utility is called
**Then** it should retry with exponential backoff
**And** log a rate limit message

#### Scenario: Exhaust retries and fail

**Given** a URL that consistently fails
**When** the fetch utility is called with max_retries = 3
**Then** it should attempt 4 times total (initial + 3 retries)
**And** throw an error with the last error encountered

### Requirement: The fetch utility MUST allow configurable retry behavior

The fetch utility SHALL allow configuration of retry count and initial delay.

#### Scenario: Custom retry count

**Given** max_retries is set to 10
**When** the fetch fails repeatedly
**Then** the utility should attempt up to 11 times total (initial + 10 retries)

#### Scenario: Custom initial delay

**Given** initial_delay_ms is set to 2000
**When** the first retry is needed
**Then** the delay should be 2000ms
**And** subsequent retries should use exponential backoff (4000ms, 8000ms, etc.)

### Requirement: The fetch utility MUST be extracted from existing code

The fetch utility SHALL be extracted from `write_mod_list.ts` without changing its behavior.

#### Scenario: Update write_mod_list.ts to use new utility

**Given** the fetch utility is extracted to a separate file
**When** `write_mod_list.ts` is updated
**Then** it should import `fetch_with_retry` from the new location
**And** all existing calls should work without modification

#### Scenario: Maintain backward compatibility

**Given** existing code using the fetch function in `write_mod_list.ts`
**When** the function is extracted
**Then** all tests should continue to pass
**And** behavior should remain identical

